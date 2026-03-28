import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, ActivityIndicator, Platform, StatusBar, AppState, Modal, TextInput } from 'react-native';
import { RTCView, MediaStream, RTCPIPView, startIOSPIP, stopIOSPIP } from 'react-native-webrtc';
import { webRTCService } from '../../services/webRTCService';
import { useNavigation, useRoute } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { PhoneOff, Mic, MicOff, Camera, Video, VideoOff, Phone, User, Minimize2 } from 'lucide-react-native';
import InCallManager from 'react-native-incall-manager';
import { useSettings } from '../../context/SettingsContext';
import { BlurView } from '@react-native-community/blur';
import { callHistoryService, CallHistoryType } from '../../services/callHistoryService';
import { callPiPService } from '../../services/callPiPService';
import { callFeedbackService, CallFeedbackReason } from '../../services/callFeedbackService';
import { useTranslation } from 'react-i18next';
import { contactService, type UserContact } from '../../services/contactService';
import { resolveUserCallDisplayName } from '../../utils/userDisplay';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';

const { width, height } = Dimensions.get('window');
const FEEDBACK_MIN_DURATION_SEC = 10;
const QUICK_DONATION_AMOUNTS = [20, 50, 100];
const FEEDBACK_REASON_IDS: CallFeedbackReason[] = [
    'audio_quality',
    'video_quality',
    'connection_stability',
    'latency',
    'echo',
];

type CallStatusKey =
    | 'incoming'
    | 'calling'
    | 'connecting'
    | 'connectingVideo'
    | 'cameraUnavailable'
    | 'noMediaAccess'
    | 'cameraEnableFailed'
    | 'cameraSwitchFailed'
    | 'pipAvailableAfterVideo'
    | 'pipUnavailable'
    | 'connectedTrack'
    | 'connectedAv'
    | 'failed'
    | 'ending'
    | 'ended';

type CallStatusState = {
    key: CallStatusKey;
    values?: Record<string, string | number>;
};

export const CallScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { t } = useTranslation();
    const { vTheme } = useSettings();
    // @ts-ignore
    const { targetId, isIncoming, callerName, autoAccept, callUUID, presentedByCallKeep } = route.params || {};
    const autoAcceptTriggeredRef = useRef(false);
    const usesNativeIncomingUi = Platform.OS === 'ios' && Boolean(presentedByCallKeep);
    const incomingRingtoneActiveRef = useRef(false);
    const outgoingRingbackActiveRef = useRef(false);
    const pipTransitionRef = useRef(false);
    const pipViewRef = useRef<any>(null);
    const callConnectedAtRef = useRef<number | null>(null);
    const endingRef = useRef(false);
    const feedbackShownRef = useRef(false);
    const navigationHandledRef = useRef(false);
    const callSessionIdRef = useRef<string>(
        typeof callUUID === 'string' && callUUID.trim()
            ? callUUID.trim()
            : `call-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    );

    const [hasAccepted, setHasAccepted] = useState(!isIncoming || (Boolean(autoAccept) && usesNativeIncomingUi));
    const callStartedAtRef = useRef<number | null>(null);
    const callLoggedRef = useRef(false);
    const hasAcceptedRef = useRef(hasAccepted);
    const [localStreamVersion, setLocalStreamVersion] = useState(0);
    const [remoteStreamVersion, setRemoteStreamVersion] = useState(0);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [participantProfile, setParticipantProfile] = useState<UserContact | null>(null);
    const [statusState, setStatusState] = useState<CallStatusState>({
        key: isIncoming
            ? ((Boolean(autoAccept) && usesNativeIncomingUi) ? 'connecting' : 'incoming')
            : 'calling',
    });
    const [, setIceState] = useState<string>('new');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [localVideoAvailable, setLocalVideoAvailable] = useState(false);
    const [remoteVideoAvailable, setRemoteVideoAvailable] = useState(false);
    const [isPiPSupported, setIsPiPSupported] = useState(false);
    const [feedbackVisible, setFeedbackVisible] = useState(false);
    const [feedbackStep, setFeedbackStep] = useState<'rating' | 'donation'>('rating');
    const [feedbackRating, setFeedbackRating] = useState(0);
    const [feedbackReasons, setFeedbackReasons] = useState<CallFeedbackReason[]>([]);
    const [feedbackComment, setFeedbackComment] = useState('');
    const [feedbackBusy, setFeedbackBusy] = useState(false);
    const [donationBusy, setDonationBusy] = useState(false);
    const [selectedDonationAmount, setSelectedDonationAmount] = useState<number | null>(null);
    const [customDonationAmount, setCustomDonationAmount] = useState('');
    const [feedbackError, setFeedbackError] = useState('');
    const remoteVideoAvailableRef = useRef(false);
    const serviceSyncSignatureRef = useRef('');

    const hasVideoTrack = (stream: MediaStream | null) => Boolean(stream && stream.getVideoTracks().length > 0);
    const bumpLocalRenderer = React.useCallback(() => {
        setLocalStreamVersion((value) => value + 1);
    }, []);
    const bumpRemoteRenderer = React.useCallback(() => {
        setRemoteStreamVersion((value) => value + 1);
    }, []);
    const setStatusKey = React.useCallback((key: CallStatusKey, values?: Record<string, string | number>) => {
        setStatusState({ key, values });
    }, []);
    const status = React.useMemo(
        () => t(`calls.status.${statusState.key}`, statusState.values),
        [statusState, t],
    );
    const fallbackUserLabel = React.useMemo(() => (
        t('contacts.userFallback', {
            id: targetId,
            defaultValue: typeof targetId === 'number' ? `User #${targetId}` : 'User',
        }).replace(/\s*#\d+$/, '').trim() || 'User'
    ), [t, targetId]);
    const resolvedCallerName = React.useMemo(() => {
        if (participantProfile) {
            const profileName = resolveUserCallDisplayName(participantProfile, { fallbackLabel: fallbackUserLabel });
            if (profileName) {
                return profileName;
            }
        }

        const routeCallerName = String(callerName || '').trim();
        return routeCallerName || t('calls.unknownCaller');
    }, [callerName, fallbackUserLabel, participantProfile, t]);
    const feedbackReasonOptions = React.useMemo(
        () => FEEDBACK_REASON_IDS.map((id) => ({
            id,
            label: t(`calls.feedback.reasons.${id}`),
        })),
        [t],
    );
    const startIncomingRingtone = () => {
        if (incomingRingtoneActiveRef.current) {
            return;
        }
        try {
            InCallManager.startRingtone('_DEFAULT_', [0, 1000, 800], 'default', 0);
            incomingRingtoneActiveRef.current = true;
        } catch (error) {
            console.warn('[CallScreen] Failed to start incoming ringtone', error);
        }
    };
    const stopIncomingRingtone = () => {
        if (!incomingRingtoneActiveRef.current) {
            return;
        }
        try {
            InCallManager.stopRingtone();
        } catch (error) {
            console.warn('[CallScreen] Failed to stop incoming ringtone', error);
        } finally {
            incomingRingtoneActiveRef.current = false;
        }
    };
    const startOutgoingRingback = () => {
        if (outgoingRingbackActiveRef.current) {
            return;
        }
        try {
            InCallManager.startRingback('_DEFAULT_');
            outgoingRingbackActiveRef.current = true;
        } catch (error) {
            console.warn('[CallScreen] Failed to start outgoing ringback', error);
        }
    };
    const stopOutgoingRingback = () => {
        if (!outgoingRingbackActiveRef.current) {
            return;
        }
        try {
            InCallManager.stopRingback();
        } catch (error) {
            console.warn('[CallScreen] Failed to stop outgoing ringback', error);
        } finally {
            outgoingRingbackActiveRef.current = false;
        }
    };

    const getConnectedDurationSec = React.useCallback(() => {
        if (!callConnectedAtRef.current) {
            return 0;
        }
        return Math.max(0, Math.round((Date.now() - callConnectedAtRef.current) / 1000));
    }, []);

    const shouldPromptFeedback = React.useCallback(() => {
        if (!hasAcceptedRef.current) {
            return false;
        }
        return getConnectedDurationSec() >= FEEDBACK_MIN_DURATION_SEC;
    }, [getConnectedDurationSec]);

    useEffect(() => {
        const numericTargetId = typeof targetId === 'number' && Number.isFinite(targetId) ? targetId : null;
        if (!numericTargetId) {
            setParticipantProfile(null);
            return;
        }

        let cancelled = false;
        void (async () => {
            const contact = await contactService.getUserById(numericTargetId);
            if (!cancelled) {
                setParticipantProfile(contact);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [targetId]);

    useEffect(() => {
        if (!isIncoming || hasAccepted || usesNativeIncomingUi) {
            stopIncomingRingtone();
            return;
        }

        startIncomingRingtone();

        return () => {
            stopIncomingRingtone();
        };
    }, [hasAccepted, isIncoming, usesNativeIncomingUi]);

    useEffect(() => {
        const callSessionId = callSessionIdRef.current;
        webRTCService.setCallDiagnosticsContext({
            callSessionId,
            peerUserId: typeof targetId === 'number' && Number.isFinite(targetId) ? targetId : undefined,
            direction: isIncoming ? 'incoming' : 'outgoing',
        });

        return () => {
            webRTCService.clearCallDiagnosticsContext(callSessionId);
        };
    }, [isIncoming, targetId]);

    useEffect(() => {
        if (isIncoming || !hasAccepted || remoteStream) {
            stopOutgoingRingback();
            return;
        }

        startOutgoingRingback();

        return () => {
            stopOutgoingRingback();
        };
    }, [hasAccepted, isIncoming, remoteStream]);

    // Initial setup - only start camera preview, don't connect yet if incoming
    useEffect(() => {
        if (!isIncoming) {
            return;
        }

        let mounted = true;
        const startPreview = async () => {
            try {
                let stream = webRTCService.localStream;
                if (!stream) {
                    stream = await webRTCService.startLocalStream(true);
                }
                if (mounted) {
                    setLocalStream(stream);
                    const streamHasVideo = hasVideoTrack(stream);
                    setIsVideoEnabled(streamHasVideo);
                    setLocalVideoAvailable(streamHasVideo);
                    if (!streamHasVideo) {
                        setStatusKey('cameraUnavailable');
                    }
                    const tracks = stream.getTracks().map((track) => track.kind[0].toUpperCase()).join('/');
                    console.log(`Local stream ready: ${tracks}`);
                }
            } catch (e) {
                console.error("Camera preview failed", e);
                if (mounted) {
                    setIsVideoEnabled(false);
                    setLocalVideoAvailable(false);
                    setStatusKey('noMediaAccess');
                }
            }
        };
        startPreview();
        return () => { mounted = false; };
    }, [isIncoming, setStatusKey]);

    // Connection logic - only runs when call is accepted/outgoing
    useEffect(() => {
        if (!hasAccepted) return;

        let mounted = true;
        let unsubscribeRemoteStream = () => {};
        let unsubscribeIceState = () => {};
        if (!callStartedAtRef.current) {
            callStartedAtRef.current = Date.now();
        }

        const connect = async () => {
            try {
                // ENSURE local stream is ready BEFORE starting call
                let currentLocalStream = webRTCService.localStream;
                if (!currentLocalStream) {
                    console.log('Local stream not ready, starting now...');
                    currentLocalStream = await webRTCService.startLocalStream(true);
                    if (mounted) setLocalStream(currentLocalStream);
                }
                if (mounted) {
                    const streamHasVideo = hasVideoTrack(currentLocalStream);
                    setIsVideoEnabled(streamHasVideo);
                    setLocalVideoAvailable(streamHasVideo);
                }

                // Setup Callbacks
                unsubscribeRemoteStream = webRTCService.setOnRemoteStream((rStream) => {
                    const tracks = rStream.getTracks();
                    const audioTracks = rStream.getAudioTracks().length;
                    const videoTracks = rStream.getVideoTracks().length;
                    const streamHasVideo = videoTracks > 0;
                    console.warn(`[UI] Received remote stream: ${rStream.id}, audio=${audioTracks}, video=${videoTracks}, total=${tracks.length}`);
                    if (!callConnectedAtRef.current) {
                        callConnectedAtRef.current = Date.now();
                    }
                    stopOutgoingRingback();
                    if (mounted) {
                        setRemoteStream(rStream);
                        setRemoteVideoAvailable(streamHasVideo);
                        bumpRemoteRenderer();
                        const trackInfo = tracks.map((track) => track.kind[0].toUpperCase()).join('/');
                        setStatusKey(streamHasVideo ? 'connectedTrack' : 'connectingVideo', streamHasVideo ? { trackInfo } : undefined);
                    }
                });

                unsubscribeIceState = webRTCService.setOnIceStateChange((state) => {
                    if (mounted) {
                        setIceState(state);
                    }

                    const normalizedState = String(state).trim().toLowerCase().split(' ')[0];
                    if (normalizedState === 'connected' || normalizedState === 'completed') {
                        if (!callConnectedAtRef.current) {
                            callConnectedAtRef.current = Date.now();
                        }
                        stopOutgoingRingback();
                        if (mounted && !remoteVideoAvailableRef.current) {
                            setStatusKey('connectingVideo');
                        }
                    }
                });

                // Keep screen on
                InCallManager.setKeepScreenOn(true);

                if (!isIncoming && targetId) {
                    // OUTGOING: Start call
                    setStatusKey('calling');
                    await webRTCService.startCall(targetId);
                    startOutgoingRingback();
                }
                // Note: Incoming call logic is now handled in handleAnswer via acceptCall()

            } catch (err) {
                console.error("Failed to start/setup call", err);
                stopOutgoingRingback();
                if (mounted) {
                    setStatusKey('failed');
                }
            }
        };

        connect();

        return () => {
            mounted = false;
            unsubscribeRemoteStream();
            unsubscribeIceState();
        };
    }, [bumpRemoteRenderer, hasAccepted, isIncoming, setStatusKey, targetId]);

    useEffect(() => {
        hasAcceptedRef.current = hasAccepted;
    }, [hasAccepted]);

    useEffect(() => {
        remoteVideoAvailableRef.current = remoteVideoAvailable;
    }, [remoteVideoAvailable]);

    useEffect(() => {
        if (!hasAccepted) {
            serviceSyncSignatureRef.current = '';
            return;
        }

        let cancelled = false;

        const syncFromService = () => {
            if (cancelled) {
                return;
            }

            const liveRemoteStream = webRTCService.remoteStream;
            const liveTracks = liveRemoteStream?.getTracks() ?? [];
            const audioTracks = liveRemoteStream?.getAudioTracks().length ?? 0;
            const videoTracks = liveRemoteStream?.getVideoTracks().length ?? 0;
            const normalizedIceState = String(webRTCService.peerConnection?.iceConnectionState || '').trim().toLowerCase();
            const signature = `${liveRemoteStream?.id || 'none'}|${audioTracks}|${videoTracks}|${normalizedIceState}`;

            if (signature === serviceSyncSignatureRef.current) {
                return;
            }
            serviceSyncSignatureRef.current = signature;

            if (liveRemoteStream && liveTracks.length > 0) {
                const streamHasVideo = videoTracks > 0;
                const trackInfo = liveTracks.map((track) => track.kind[0].toUpperCase()).join('/');
                console.warn(
                    `[UI] Synced remote stream from service: ${liveRemoteStream.id}, audio=${audioTracks}, video=${videoTracks}, ice=${normalizedIceState || 'unknown'}`,
                );

                if (!callConnectedAtRef.current) {
                    callConnectedAtRef.current = Date.now();
                }
                stopOutgoingRingback();
                setRemoteStream((prev) => (prev === liveRemoteStream ? prev : liveRemoteStream));
                setRemoteVideoAvailable(streamHasVideo);
                bumpRemoteRenderer();
                setStatusKey(streamHasVideo ? 'connectedTrack' : 'connectingVideo', streamHasVideo ? { trackInfo } : undefined);
                return;
            }

            if ((normalizedIceState === 'connected' || normalizedIceState === 'completed') && !remoteVideoAvailableRef.current) {
                if (!callConnectedAtRef.current) {
                    callConnectedAtRef.current = Date.now();
                }
                stopOutgoingRingback();
                setStatusKey('connectingVideo');
            }
        };

        syncFromService();
        const intervalId = setInterval(syncFromService, 400);

        return () => {
            cancelled = true;
            clearInterval(intervalId);
            serviceSyncSignatureRef.current = '';
        };
    }, [bumpRemoteRenderer, hasAccepted, setStatusKey]);

    useEffect(() => {
        let mounted = true;
        void (async () => {
            const supported = await callPiPService.isSupported();
            if (mounted) {
                setIsPiPSupported(supported);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (Platform.OS !== 'android') {
            return;
        }

        const activeCallForPiP = Boolean(hasAccepted);
        callPiPService.setCallActive(activeCallForPiP);

        return () => {
            callPiPService.setCallActive(false);
        };
    }, [hasAccepted]);

    useEffect(() => {
        if (Platform.OS !== 'android' || !isPiPSupported || !hasAccepted) {
            return;
        }

        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                pipTransitionRef.current = false;
                return;
            }

            if (pipTransitionRef.current) {
                return;
            }
            pipTransitionRef.current = true;
            if (state === 'inactive' || state === 'background') {
                void callPiPService.enterPiP();
            }
        });

        return () => {
            pipTransitionRef.current = false;
            subscription.remove();
        };
    }, [hasAccepted, isPiPSupported]);

    useEffect(() => {
        if (!remoteStream || remoteVideoAvailable) {
            return;
        }

        let attempts = 0;
        const intervalId = setInterval(() => {
            attempts += 1;
            const streamHasVideo = hasVideoTrack(remoteStream);
            if (streamHasVideo) {
                setRemoteVideoAvailable(true);
                bumpRemoteRenderer();
                setStatusKey('connectedAv');
                clearInterval(intervalId);
                return;
            }

            if (attempts >= 10) {
                clearInterval(intervalId);
            }
        }, 400);

        return () => {
            clearInterval(intervalId);
        };
    }, [bumpRemoteRenderer, remoteStream, remoteVideoAvailable, setStatusKey]);


    // Cleanup on unmount (end call)
    const persistCallHistory = React.useCallback(async () => {
        if (callLoggedRef.current) {
            return;
        }
        callLoggedRef.current = true;

        const resolvedType: CallHistoryType = isIncoming
            ? (hasAcceptedRef.current ? 'incoming' : 'missed')
            : 'outgoing';

        const resolvedName = resolvedCallerName || (targetId ? `${fallbackUserLabel} #${targetId}` : t('calls.unknownCaller'));
        const durationStart = callConnectedAtRef.current || callStartedAtRef.current;
        const durationSec = durationStart
            ? Math.max(0, Math.round((Date.now() - durationStart) / 1000))
            : 0;

        await callHistoryService.addEntry({
            userId: typeof targetId === 'number' && Number.isFinite(targetId) ? targetId : undefined,
            name: resolvedName,
            type: resolvedType,
            durationSec,
        });
    }, [fallbackUserLabel, isIncoming, resolvedCallerName, t, targetId]);

    const resetFeedbackState = React.useCallback(() => {
        setFeedbackStep('rating');
        setFeedbackRating(0);
        setFeedbackReasons([]);
        setFeedbackComment('');
        setSelectedDonationAmount(null);
        setCustomDonationAmount('');
        setFeedbackError('');
    }, []);

    const stopCallUi = React.useCallback(() => {
        stopIncomingRingtone();
        stopOutgoingRingback();
        callPiPService.setCallActive(false);
        void callPiPService.stopPiP();
        if (Platform.OS === 'ios') {
            try {
                stopIOSPIP(pipViewRef);
            } catch {
                // no-op
            }
        }
    }, []);

    const persistCallHistorySafely = React.useCallback(() => {
        void persistCallHistory().catch((error) => {
            console.warn('[CallScreen] Failed to persist call history', error);
        });
    }, [persistCallHistory]);

    const closeScreen = React.useCallback(() => {
        if (navigationHandledRef.current) {
            return;
        }
        navigationHandledRef.current = true;
        webRTCService.setOnCallEnded(null);
        if (navigation.canGoBack()) {
            navigation.goBack();
        }
    }, [navigation]);

    const openFeedbackFlow = React.useCallback(() => {
        if (feedbackShownRef.current) {
            closeScreen();
            return;
        }
        feedbackShownRef.current = true;
        resetFeedbackState();
        setFeedbackVisible(true);
    }, [closeScreen, resetFeedbackState]);

    const handleCallEnded = React.useCallback((reason: 'local' | 'remote' | 'system') => {
        endingRef.current = true;
        stopCallUi();
        setLocalStream(null);
        setRemoteStream(null);
        setLocalVideoAvailable(false);
        setRemoteVideoAvailable(false);
        setIsVideoEnabled(false);
        setIsMuted(false);
        setStatusKey('ended');
        persistCallHistorySafely();

        if (reason !== 'system' && shouldPromptFeedback()) {
            openFeedbackFlow();
            return;
        }

        closeScreen();
    }, [closeScreen, openFeedbackFlow, persistCallHistorySafely, setStatusKey, shouldPromptFeedback, stopCallUi]);

    const submitFeedback = React.useCallback(async () => {
        if (feedbackRating < 1 || feedbackRating > 5 || feedbackBusy) {
            return;
        }

        setFeedbackBusy(true);
        setFeedbackError('');
        const startedAt = callConnectedAtRef.current ? new Date(callConnectedAtRef.current) : null;
        const endedAt = new Date();

        try {
            const netInfo = await NetInfo.fetch().catch(() => null);
            await callFeedbackService.submitFeedback({
                callSessionId: callSessionIdRef.current,
                peerUserId: typeof targetId === 'number' && Number.isFinite(targetId) ? targetId : undefined,
                direction: isIncoming ? 'incoming' : 'outgoing',
                startedAt: startedAt ? startedAt.toISOString() : undefined,
                endedAt: endedAt.toISOString(),
                durationSec: getConnectedDurationSec(),
                rating: feedbackRating,
                reasons: feedbackReasons,
                comment: feedbackComment.trim() || undefined,
                platform: Platform.OS,
                networkType: String(netInfo?.type || 'unknown'),
                appVersion: DeviceInfo.getVersion(),
                deviceModel: DeviceInfo.getModel(),
            });
        } catch (error) {
            console.warn('[CallScreen] submitFeedback failed', error);
            setFeedbackError(t('calls.feedback.submitError'));
        } finally {
            setFeedbackBusy(false);
            setFeedbackStep('donation');
        }
    }, [feedbackBusy, feedbackComment, feedbackRating, feedbackReasons, getConnectedDurationSec, isIncoming, t, targetId]);

    const completeFeedbackFlow = React.useCallback(() => {
        setFeedbackVisible(false);
        resetFeedbackState();
        closeScreen();
    }, [closeScreen, resetFeedbackState]);

    const submitDonation = React.useCallback(async () => {
        if (donationBusy) {
            return;
        }
        const customParsed = Number.parseInt(customDonationAmount.trim(), 10);
        const amount = selectedDonationAmount ?? (Number.isFinite(customParsed) ? customParsed : 0);
        if (!Number.isFinite(amount) || amount <= 0) {
            setFeedbackError(t('calls.feedback.invalidAmount'));
            return;
        }

        setDonationBusy(true);
        setFeedbackError('');
        try {
            await callFeedbackService.sendSupportTransfer({
                callSessionId: callSessionIdRef.current,
                amount,
            });
            completeFeedbackFlow();
        } catch (error) {
            console.warn('[CallScreen] submitDonation failed', error);
            setFeedbackError(t('calls.feedback.transferError'));
        } finally {
            setDonationBusy(false);
        }
    }, [completeFeedbackFlow, customDonationAmount, donationBusy, selectedDonationAmount, t]);

    const skipDonation = React.useCallback(() => {
        completeFeedbackFlow();
    }, [completeFeedbackFlow]);

    useEffect(() => {
        webRTCService.setOnCallEnded(handleCallEnded);
        return () => {
            webRTCService.setOnCallEnded(null);
            if (navigationHandledRef.current) {
                return;
            }
            stopCallUi();
            persistCallHistorySafely();
            // Only end call logic if we leave screen
            // But we might want to keep call in background? For now, kill it.
            webRTCService.endCall('system');
        };
    }, [handleCallEnded, persistCallHistorySafely, stopCallUi]);


    const handleAnswer = async () => {
        try {
            stopIncomingRingtone();
            // Ensure local stream is ready before accepting
            let stream = webRTCService.localStream;
            if (!stream) {
                stream = await webRTCService.startLocalStream(true);
                setLocalStream(stream);
            }
            setIsVideoEnabled(hasVideoTrack(stream));
            setLocalVideoAvailable(hasVideoTrack(stream));

            setHasAccepted(true);
            setStatusKey('connecting');
            await webRTCService.acceptCall();
        } catch (error) {
            console.error('Failed to accept incoming call', error);
            setIsVideoEnabled(false);
            setLocalVideoAvailable(false);
            setStatusKey('cameraEnableFailed');
        }
    };

    useEffect(() => {
        if (!isIncoming || !autoAccept || hasAccepted || autoAcceptTriggeredRef.current) {
            return;
        }
        autoAcceptTriggeredRef.current = true;
        void (async () => {
            try {
                let stream = webRTCService.localStream;
                if (!stream) {
                    stream = await webRTCService.startLocalStream(true);
                    setLocalStream(stream);
                }
                setIsVideoEnabled(hasVideoTrack(stream));
                setLocalVideoAvailable(hasVideoTrack(stream));

                setHasAccepted(true);
                setStatusKey('connecting');
                await webRTCService.acceptCall();
            } catch (error) {
                console.error('Failed to auto-accept incoming call', error);
                setIsVideoEnabled(false);
                setLocalVideoAvailable(false);
                setStatusKey('cameraEnableFailed');
            }
        })();
    }, [autoAccept, hasAccepted, isIncoming, setStatusKey]);

    const handleHangup = () => {
        if (endingRef.current) {
            return;
        }
        endingRef.current = true;
        setStatusKey('ending');
        webRTCService.sendHangup();
    };

    const handleEnterPiP = async () => {
        if (Platform.OS === 'ios') {
            if (!pipViewRef.current) {
                setStatusKey('pipAvailableAfterVideo');
                return;
            }
            try {
                startIOSPIP(pipViewRef);
            } catch (error) {
                console.warn('[CallScreen] Failed to start iOS PiP', error);
                setStatusKey('pipUnavailable');
            }
            return;
        }

        const entered = await callPiPService.enterPiP(9, 16);
        if (!entered) {
            setStatusKey('pipUnavailable');
        }
    };

    const toggleMute = () => {
        const stream = webRTCService.localStream;
        if (stream) {
            stream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        const stream = webRTCService.localStream;
        if (stream) {
            const videoTracks = stream.getVideoTracks();
            if (!videoTracks.length) {
                setIsVideoEnabled(false);
                setLocalVideoAvailable(false);
                setStatusKey('cameraUnavailable');
                return;
            }
            videoTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            const nextEnabled = !isVideoEnabled;
            setIsVideoEnabled(nextEnabled);
            setLocalVideoAvailable(nextEnabled);
        }
    };

    const switchCamera = async () => {
        const result = await webRTCService.switchCamera();
        if (!result.success) {
            if (result.reason === 'no_video_track' || result.reason === 'no_local_stream') {
                setStatusKey('cameraUnavailable');
            } else {
                setStatusKey('cameraSwitchFailed');
            }
            return;
        }

        const nextStream = result.stream || webRTCService.localStream;
        if (nextStream) {
            const streamHasVideo = hasVideoTrack(nextStream);
            setLocalStream(nextStream);
            setLocalVideoAvailable(streamHasVideo);
            setIsVideoEnabled(streamHasVideo);
        }
        // Force local preview refresh for devices where track-level switch does not repaint immediately.
        bumpLocalRenderer();
    };

    const toggleFeedbackReason = (reason: CallFeedbackReason) => {
        setFeedbackReasons((prev) => (
            prev.includes(reason)
                ? prev.filter((item) => item !== reason)
                : [...prev, reason]
        ));
    };

    const renderBackground = () => {
        if (hasAccepted && remoteStream) {
            // If remote stream is active, the video is the background.
            // We can return null or a dark overlay if needed.
            return <View style={styles.backgroundOverlay} />;
        }

        return (
            <LinearGradient
                colors={['#101A2A', '#02050C']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
        );
    };

    // --- RENDER INCOMING CALL SCREEN ---
    if (isIncoming && !hasAccepted) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
                {renderBackground()}

                <View style={styles.callerContainer}>
                    <View style={styles.avatarLarge}>
                        <User size={60} color="#fff" />
                    </View>
                    <Text style={styles.callerName}>{resolvedCallerName}</Text>
                    <Text style={styles.statusText}>{status}</Text>
                </View>

                <View style={[styles.incomingControls, styles.incomingControlsElevated]}>
                    <TouchableOpacity onPress={handleHangup} style={[styles.actionBtn, styles.declineBtn]}>
                        <PhoneOff color="white" size={32} />
                        <Text style={styles.btnLabel}>{t('calls.actions.decline')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleAnswer} style={[styles.actionBtn, styles.acceptBtn]}>
                        <Phone color="white" size={32} />
                        <Text style={styles.btnLabel}>{t('calls.actions.accept')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // --- RENDER ACTIVE CALL SCREEN ---
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            {renderBackground()}

            {remoteStream ? (
                Platform.OS === 'ios' ? (
                    <RTCPIPView
                        ref={pipViewRef}
                        key={`remote-ios-pip-${remoteStream.id}-${remoteStreamVersion}`}
                        streamURL={remoteVideoAvailable ? remoteStream.toURL() : undefined}
                        style={styles.remoteVideo}
                        objectFit="cover"
                        zOrder={0}
                        mirror={false}
                        iosPIP={{
                            enabled: true,
                            preferredSize: { width: 9, height: 16 },
                            startAutomatically: true,
                            stopAutomatically: true,
                            fallbackView: (
                                <View style={styles.remotePlaceholder}>
                                    <View style={styles.avatarLarge}>
                                        <User size={60} color="#fff" />
                                    </View>
                                    <Text style={styles.callerName}>{resolvedCallerName}</Text>
                                    <Text style={styles.statusText}>{status}</Text>
                                    <ActivityIndicator size="large" color={vTheme.colors.primary} style={styles.activitySpacing} />
                                </View>
                            ) as any,
                        }}
                    />
                ) : remoteVideoAvailable ? (
                    <RTCView
                        key={`remote-${remoteStream.id}-${remoteStreamVersion}`}
                        streamURL={remoteStream.toURL()}
                        style={styles.remoteVideo}
                        objectFit="cover"
                        zOrder={0}
                        mirror={false}
                    />
                ) : (
                    <View style={styles.remotePlaceholder}>
                        <View style={styles.avatarLarge}>
                            <User size={60} color="#fff" />
                        </View>
                        <Text style={styles.callerName}>{resolvedCallerName}</Text>
                        <Text style={styles.statusText}>{status}</Text>
                        <ActivityIndicator size="large" color={vTheme.colors.primary} style={styles.activitySpacing} />
                    </View>
                )
            ) : (
                <View style={styles.remotePlaceholder}>
                    <View style={styles.avatarLarge}>
                        <User size={60} color="#fff" />
                    </View>
                    <Text style={styles.callerName}>{resolvedCallerName}</Text>
                    <Text style={styles.statusText}>{status}</Text>
                    <ActivityIndicator size="large" color={vTheme.colors.primary} style={styles.activitySpacing} />
                </View>
            )}

            {localStream && localVideoAvailable && (
                <View style={styles.localVideoContainer}>
                    <RTCView
                        key={`${localStream.toURL()}-${localStreamVersion}`}
                        streamURL={localStream.toURL()}
                        style={styles.localVideo}
                        objectFit="cover"
                        zOrder={1}
                        mirror={true}
                    />
                </View>
            )}

            <View style={styles.controlsWrapper}>
                <View style={styles.controlsInner}>
                    <BlurView
                        style={StyleSheet.absoluteFill}
                        blurType="dark"
                        blurAmount={20}
                        reducedTransparencyFallbackColor="rgba(8,12,22,0.85)"
                    />
                    <View style={styles.controlsContent}>
                        <TouchableOpacity onPress={toggleMute} style={[styles.controlBtn, isMuted && styles.controlBtnActive]}>
                            {isMuted ? <MicOff color={"white"} size={22} /> : <Mic color="#fff" size={22} />}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={toggleVideo} style={[styles.controlBtn, !isVideoEnabled && styles.controlBtnActive]}>
                            {!isVideoEnabled ? <VideoOff color={"white"} size={22} /> : <Video color="#fff" size={22} />}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => { void switchCamera(); }} style={styles.controlBtn}>
                            <Camera color="#fff" size={22} />
                        </TouchableOpacity>

                        {isPiPSupported && hasAccepted && (
                            <TouchableOpacity onPress={() => { void handleEnterPiP(); }} style={styles.controlBtn}>
                                <Minimize2 color="#fff" size={22} />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity onPress={handleHangup} style={[styles.controlBtn, styles.hangupBtn]}>
                            <PhoneOff color="white" size={28} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <Modal
                visible={feedbackVisible}
                transparent
                animationType="fade"
                onRequestClose={skipDonation}
            >
                <View style={styles.feedbackBackdrop}>
                    <View style={styles.feedbackCard}>
                        <Text style={styles.feedbackTitle}>
                            {feedbackStep === 'rating' ? t('calls.feedback.ratingTitle') : t('calls.feedback.donationTitle')}
                        </Text>
                        <Text style={styles.feedbackSubtitle}>
                            {feedbackStep === 'rating'
                                ? t('calls.feedback.ratingSubtitle')
                                : t('calls.feedback.donationSubtitle')}
                        </Text>

                        {feedbackStep === 'rating' ? (
                            <>
                                <View style={styles.ratingRow}>
                                    {[1, 2, 3, 4, 5].map((value) => (
                                        <TouchableOpacity
                                            key={`rating-${value}`}
                                            style={[
                                                styles.ratingDot,
                                                feedbackRating >= value && styles.ratingDotActive,
                                            ]}
                                            onPress={() => setFeedbackRating(value)}
                                        >
                                            <Text style={styles.ratingDotText}>★</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View style={styles.reasonWrap}>
                                    {feedbackReasonOptions.map((reason) => {
                                        const active = feedbackReasons.includes(reason.id);
                                        return (
                                            <TouchableOpacity
                                                key={reason.id}
                                                style={[styles.reasonChip, active && styles.reasonChipActive]}
                                                onPress={() => toggleFeedbackReason(reason.id)}
                                            >
                                                <Text style={[styles.reasonChipText, active && styles.reasonChipTextActive]}>
                                                    {reason.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <TextInput
                                    style={styles.feedbackInput}
                                    placeholder={t('calls.feedback.commentPlaceholder')}
                                    placeholderTextColor="rgba(255,255,255,0.45)"
                                    value={feedbackComment}
                                    onChangeText={setFeedbackComment}
                                    multiline
                                    maxLength={500}
                                />

                                <View style={styles.feedbackActions}>
                                    <TouchableOpacity style={styles.feedbackSecondaryBtn} onPress={completeFeedbackFlow} disabled={feedbackBusy}>
                                        <Text style={styles.feedbackSecondaryBtnText}>{t('calls.actions.skip')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.feedbackPrimaryBtn, (feedbackRating < 1 || feedbackBusy) && styles.feedbackBtnDisabled]}
                                        onPress={() => { void submitFeedback(); }}
                                        disabled={feedbackRating < 1 || feedbackBusy}
                                    >
                                        <Text style={styles.feedbackPrimaryBtnText}>
                                            {feedbackBusy ? t('calls.actions.submitting') : t('calls.actions.next')}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        ) : (
                            <>
                                <View style={styles.donationRow}>
                                    {QUICK_DONATION_AMOUNTS.map((amount) => {
                                        const active = selectedDonationAmount === amount;
                                        return (
                                            <TouchableOpacity
                                                key={`donation-${amount}`}
                                                style={[styles.donationBtn, active && styles.donationBtnActive]}
                                                onPress={() => {
                                                    setSelectedDonationAmount(amount);
                                                    setCustomDonationAmount('');
                                                }}
                                            >
                                                <Text style={[styles.donationBtnText, active && styles.donationBtnTextActive]}>{amount}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <TextInput
                                    style={styles.feedbackInput}
                                    placeholder={t('calls.feedback.customAmountPlaceholder')}
                                    placeholderTextColor="rgba(255,255,255,0.45)"
                                    value={customDonationAmount}
                                    onChangeText={(value) => {
                                        setCustomDonationAmount(value.replace(/[^\d]/g, ''));
                                        setSelectedDonationAmount(null);
                                    }}
                                    keyboardType="number-pad"
                                />

                                <View style={styles.feedbackActions}>
                                    <TouchableOpacity style={styles.feedbackSecondaryBtn} onPress={skipDonation} disabled={donationBusy}>
                                        <Text style={styles.feedbackSecondaryBtnText}>{t('calls.actions.skip')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.feedbackPrimaryBtn, donationBusy && styles.feedbackBtnDisabled]}
                                        onPress={() => { void submitDonation(); }}
                                        disabled={donationBusy}
                                    >
                                        <Text style={styles.feedbackPrimaryBtnText}>
                                            {donationBusy ? t('calls.actions.transferring') : t('calls.actions.support')}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        {!!feedbackError && <Text style={styles.feedbackErrorText}>{feedbackError}</Text>}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backgroundOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.52)',
    },
    remoteVideo: {
        width: width,
        height: height,
        backgroundColor: 'black',
    },
    remotePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activitySpacing: {
        marginTop: 20,
    },
    callerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 100,
    },
    statusText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 16,
        marginTop: 8,
        fontFamily: 'Nunito',
    },
    callerName: {
        color: '#fff',
        fontSize: 34, // Slightly larger
        fontWeight: 'bold',
        marginTop: 20,
        fontFamily: 'Cinzel-Bold',
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    avatarLarge: {
        width: 140, // Larger avatar
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        // Shadow for depth
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    localVideoContainer: {
        position: 'absolute',
        top: 60,
        right: 20,
        width: 110, // Slightly wider
        height: 160,
        borderRadius: 20, // Softer corners
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.4)', // Glassy border
        elevation: 10,
        backgroundColor: '#000',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowOpacity: 0.35,
        shadowRadius: 6.27,
    },
    localVideo: {
        flex: 1,
        opacity: 1,
    },

    // Controls styling
    controlsWrapper: {
        position: 'absolute',
        bottom: 50, // Moved up slightly
        left: 20,
        right: 20,
        height: 85, // Slightly taller
        borderRadius: 45,
        // No overflow hidden here, so shadow works
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.4, // Darker shadow
                shadowRadius: 20,
            },
            android: {
                elevation: 15,
            }
        })
    },
    controlsInner: {
        flex: 1,
        borderRadius: 45,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)', // Glass edge
    },
    controlsContent: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        backgroundColor: 'rgba(9,14,24,0.64)',
    },
    controlBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(22,32,47,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlBtnActive: {
        backgroundColor: '#FF453A', // System Red for active/muted states
    },
    hangupBtn: {
        backgroundColor: '#FF3B30',
        width: 56,
        height: 56,
        borderRadius: 28,
        transform: [{ scale: 1.1 }]
    },

    // Incoming call controls
    incomingControls: {
        position: 'absolute',
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'flex-end',
        paddingHorizontal: 30,
    },
    incomingControlsElevated: {
        bottom: 80,
    },
    actionBtn: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptBtn: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#34C759', // Green
        marginBottom: 8,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#34C759',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 10,
            }
        })
    },
    declineBtn: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FF3B30', // Red
        marginBottom: 8,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#FF3B30',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 10,
            }
        })
    },
    btnLabel: {
        color: '#fff',
        marginTop: 8,
        fontSize: 14,
        fontWeight: '600',
        position: 'absolute',
        bottom: -24,
        width: 100,
        textAlign: 'center'
    },
    feedbackBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    feedbackCard: {
        backgroundColor: '#0F172A',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        padding: 16,
    },
    feedbackTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    feedbackSubtitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        marginTop: 6,
        marginBottom: 12,
    },
    ratingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    ratingDot: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ratingDotActive: {
        backgroundColor: '#F59E0B',
    },
    ratingDotText: {
        color: '#fff',
        fontSize: 20,
    },
    reasonWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    reasonChip: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    reasonChipActive: {
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245,158,11,0.18)',
    },
    reasonChipText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
    },
    reasonChipTextActive: {
        color: '#FDE68A',
    },
    feedbackInput: {
        minHeight: 44,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        color: '#fff',
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 12,
    },
    feedbackActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    feedbackSecondaryBtn: {
        flex: 1,
        height: 42,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    feedbackSecondaryBtnText: {
        color: '#E2E8F0',
        fontWeight: '600',
    },
    feedbackPrimaryBtn: {
        flex: 1,
        height: 42,
        borderRadius: 10,
        backgroundColor: '#F59E0B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    feedbackPrimaryBtnText: {
        color: '#111827',
        fontWeight: '700',
    },
    feedbackBtnDisabled: {
        opacity: 0.5,
    },
    donationRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    donationBtn: {
        flex: 1,
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    donationBtnActive: {
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245,158,11,0.18)',
    },
    donationBtnText: {
        color: '#E2E8F0',
        fontWeight: '600',
    },
    donationBtnTextActive: {
        color: '#FDE68A',
    },
    feedbackErrorText: {
        marginTop: 10,
        color: '#FCA5A5',
        fontSize: 12,
    },
    debugText: {
        color: '#ffeb3b',
        fontSize: 12,
        marginTop: 5,
    }
});
