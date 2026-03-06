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

const { width, height } = Dimensions.get('window');
const FEEDBACK_MIN_DURATION_SEC = 10;
const QUICK_DONATION_AMOUNTS = [20, 50, 100];
const FEEDBACK_REASONS: { id: CallFeedbackReason; label: string }[] = [
    { id: 'audio_quality', label: 'Audio issues' },
    { id: 'video_quality', label: 'Video issues' },
    { id: 'connection_stability', label: 'Connection drops' },
    { id: 'latency', label: 'Latency' },
    { id: 'echo', label: 'Echo/noise' },
];

export const CallScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { vTheme } = useSettings();
    // @ts-ignore
    const { targetId, isIncoming, callerName, autoAccept, callUUID } = route.params || {};
    const autoAcceptTriggeredRef = useRef(false);
    const incomingRingtoneActiveRef = useRef(false);
    const outgoingRingbackActiveRef = useRef(false);
    const pipTransitionRef = useRef(false);
    const pipViewRef = useRef<any>(null);
    const callConnectedAtRef = useRef<number | null>(null);
    const endingRef = useRef(false);
    const feedbackShownRef = useRef(false);
    const callSessionIdRef = useRef<string>(
        typeof callUUID === 'string' && callUUID.trim()
            ? callUUID.trim()
            : `call-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    );

    const [hasAccepted, setHasAccepted] = useState(!isIncoming); // If outgoing, auto-accepted. If incoming, wait.
    const callStartedAtRef = useRef<number | null>(null);
    const callLoggedRef = useRef(false);
    const hasAcceptedRef = useRef(hasAccepted);
    const [streamVersion, setStreamVersion] = useState(0);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [status, setStatus] = useState<string>(isIncoming ? 'Incoming call...' : 'Calling...');
    const [iceState, setIceState] = useState<string>('new');
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

    const hasVideoTrack = (stream: MediaStream | null) => Boolean(stream && stream.getVideoTracks().length > 0);
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
        if (!isIncoming || hasAccepted) {
            stopIncomingRingtone();
            return;
        }

        startIncomingRingtone();

        return () => {
            stopIncomingRingtone();
        };
    }, [hasAccepted, isIncoming]);

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
                        setStatus('Camera unavailable');
                    }
                    const tracks = stream.getTracks().map(t => t.kind[0].toUpperCase()).join('/');
                    console.log(`Local stream ready: ${tracks}`);
                }
            } catch (e) {
                console.error("Camera preview failed", e);
                if (mounted) {
                    setIsVideoEnabled(false);
                    setLocalVideoAvailable(false);
                    setStatus('No access to camera/microphone');
                }
            }
        };
        startPreview();
        return () => { mounted = false; };
    }, [isIncoming]);

    // Connection logic - only runs when call is accepted/outgoing
    useEffect(() => {
        if (!hasAccepted) return;

        let mounted = true;
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
                webRTCService.setOnRemoteStream((rStream) => {
                    const tracks = rStream.getTracks();
                    const streamHasVideo = hasVideoTrack(rStream);
                    console.warn(`[UI] Received remote stream: ${rStream.id}, url: ${rStream.toURL().substring(0, 30)}... Tracks: ${tracks.length}`);
                    if (!callConnectedAtRef.current) {
                        callConnectedAtRef.current = Date.now();
                    }
                    stopOutgoingRingback();
                    if (mounted) {
                        setRemoteStream(rStream);
                        setRemoteVideoAvailable(streamHasVideo);
                        setStreamVersion(v => v + 1);
                        const trackInfo = tracks.map(t => t.kind[0].toUpperCase()).join('/');
                        setStatus(streamHasVideo ? `Connected (${trackInfo})` : 'Connecting video...');
                    }
                });

                webRTCService.setOnIceStateChange((state) => {
                    if (mounted) setIceState(state);
                });

                // Keep screen on
                InCallManager.setKeepScreenOn(true);

                if (!isIncoming && targetId) {
                    // OUTGOING: Start call
                    setStatus('Calling...');
                    await webRTCService.startCall(targetId);
                    startOutgoingRingback();
                }
                // Note: Incoming call logic is now handled in handleAnswer via acceptCall()

            } catch (err) {
                console.error("Failed to start/setup call", err);
                stopOutgoingRingback();
                if (mounted) setStatus('Failed');
            }
        };

        connect();

        return () => {
            mounted = false;
        };
    }, [hasAccepted, targetId, isIncoming]);

    useEffect(() => {
        hasAcceptedRef.current = hasAccepted;
    }, [hasAccepted]);

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
                setStreamVersion(v => v + 1);
                setStatus(prev => (prev.startsWith('Connected') ? prev : 'Connected (A/V)'));
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
    }, [remoteStream, remoteVideoAvailable]);


    // Cleanup on unmount (end call)
    const persistCallHistory = React.useCallback(async () => {
        if (callLoggedRef.current) {
            return;
        }
        callLoggedRef.current = true;

        const resolvedType: CallHistoryType = isIncoming
            ? (hasAcceptedRef.current ? 'incoming' : 'missed')
            : 'outgoing';

        const resolvedName = String(callerName || '').trim() || (targetId ? `User ${targetId}` : 'Unknown');
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
    }, [callerName, isIncoming, targetId]);

    const resetFeedbackState = React.useCallback(() => {
        setFeedbackStep('rating');
        setFeedbackRating(0);
        setFeedbackReasons([]);
        setFeedbackComment('');
        setSelectedDonationAmount(null);
        setCustomDonationAmount('');
        setFeedbackError('');
    }, []);

    const finalizeClose = React.useCallback((navigateBack: boolean) => {
        if (endingRef.current) {
            if (navigateBack) {
                navigation.goBack();
            }
            return;
        }
        endingRef.current = true;

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
        void persistCallHistory().catch((error) => {
            console.warn('[CallScreen] Failed to persist call history', error);
        });
        webRTCService.sendHangup();
        webRTCService.endCall();

        if (navigateBack) {
            navigation.goBack();
        }
    }, [navigation, persistCallHistory]);

    const openFeedbackFlow = React.useCallback(() => {
        if (feedbackShownRef.current) {
            finalizeClose(true);
            return;
        }
        feedbackShownRef.current = true;
        resetFeedbackState();
        setFeedbackVisible(true);
    }, [finalizeClose, resetFeedbackState]);

    const submitFeedback = React.useCallback(async () => {
        if (feedbackRating < 1 || feedbackRating > 5 || feedbackBusy) {
            return;
        }

        setFeedbackBusy(true);
        setFeedbackError('');
        const startedAt = callConnectedAtRef.current ? new Date(callConnectedAtRef.current) : null;
        const endedAt = new Date();

        try {
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
            });
        } catch (error) {
            console.warn('[CallScreen] submitFeedback failed', error);
            setFeedbackError('Failed to submit the rating. You can continue.');
        } finally {
            setFeedbackBusy(false);
            setFeedbackStep('donation');
        }
    }, [feedbackBusy, feedbackComment, feedbackRating, feedbackReasons, getConnectedDurationSec, isIncoming, targetId]);

    const completeFeedbackFlow = React.useCallback(() => {
        setFeedbackVisible(false);
        resetFeedbackState();
        finalizeClose(true);
    }, [finalizeClose, resetFeedbackState]);

    const submitDonation = React.useCallback(async () => {
        if (donationBusy) {
            return;
        }
        const customParsed = Number.parseInt(customDonationAmount.trim(), 10);
        const amount = selectedDonationAmount ?? (Number.isFinite(customParsed) ? customParsed : 0);
        if (!Number.isFinite(amount) || amount <= 0) {
            setFeedbackError('Enter a valid amount.');
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
            setFeedbackError('Transfer was not completed. You can skip it.');
        } finally {
            setDonationBusy(false);
        }
    }, [completeFeedbackFlow, customDonationAmount, donationBusy, selectedDonationAmount]);

    const skipDonation = React.useCallback(() => {
        completeFeedbackFlow();
    }, [completeFeedbackFlow]);

    useEffect(() => {
        return () => {
            if (endingRef.current) {
                return;
            }
            stopIncomingRingtone();
            stopOutgoingRingback();
            void callPiPService.stopPiP();
            if (Platform.OS === 'ios') {
                try {
                    stopIOSPIP(pipViewRef);
                } catch {
                    // no-op
                }
            }
            void persistCallHistory().catch((error) => {
                console.warn('[CallScreen] Failed to persist call history', error);
            });
            // Only end call logic if we leave screen
            // But we might want to keep call in background? For now, kill it.
            webRTCService.endCall();
        };
    }, [persistCallHistory]);


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
            setStatus('Connecting...');
            await webRTCService.acceptCall();
        } catch (error) {
            console.error('Failed to accept incoming call', error);
            setIsVideoEnabled(false);
            setLocalVideoAvailable(false);
            setStatus('Failed to enable the camera');
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
                setStatus('Connecting...');
                await webRTCService.acceptCall();
            } catch (error) {
                console.error('Failed to auto-accept incoming call', error);
                setIsVideoEnabled(false);
                setLocalVideoAvailable(false);
                setStatus('Failed to enable the camera');
            }
        })();
    }, [autoAccept, hasAccepted, isIncoming]);

    const handleHangup = () => {
        const promptFeedback = shouldPromptFeedback();
        finalizeClose(!promptFeedback);
        if (promptFeedback) {
            openFeedbackFlow();
        }
    };

    const handleEnterPiP = async () => {
        if (Platform.OS === 'ios') {
            if (!pipViewRef.current) {
                setStatus('PiP will be available after video connects');
                return;
            }
            try {
                startIOSPIP(pipViewRef);
            } catch (error) {
                console.warn('[CallScreen] Failed to start iOS PiP', error);
                setStatus('PiP unavailable');
            }
            return;
        }

        const entered = await callPiPService.enterPiP(9, 16);
        if (!entered) {
            setStatus('PiP unavailable');
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
                setStatus('Camera unavailable');
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
                setStatus('Camera unavailable');
            } else {
                setStatus('Failed to switch the camera');
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
        setStreamVersion(v => v + 1);
    };

    const toggleFeedbackReason = (reason: CallFeedbackReason) => {
        setFeedbackReasons((prev) => (
            prev.includes(reason)
                ? prev.filter((item) => item !== reason)
                : [...prev, reason]
        ));
    };

    const Background = () => {
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
                <Background />

                <View style={styles.callerContainer}>
                    <View style={styles.avatarLarge}>
                        <User size={60} color="#fff" />
                    </View>
                    <Text style={styles.callerName}>{callerName || 'Unknown Caller'}</Text>
                    <Text style={styles.statusText}>{status}</Text>
                </View>

                <View style={[styles.incomingControls, { bottom: 80 }]}>
                    <TouchableOpacity onPress={handleHangup} style={[styles.actionBtn, styles.declineBtn]}>
                        <PhoneOff color="white" size={32} />
                        <Text style={styles.btnLabel}>Decline</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleAnswer} style={[styles.actionBtn, styles.acceptBtn]}>
                        <Phone color="white" size={32} />
                        <Text style={styles.btnLabel}>Accept</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // --- RENDER ACTIVE CALL SCREEN ---
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <Background />

            {remoteStream ? (
                Platform.OS === 'ios' ? (
                    <RTCPIPView
                        ref={pipViewRef}
                        key={`remote-ios-pip-${remoteStream.id}-${streamVersion}`}
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
                                    <Text style={styles.callerName}>{callerName || 'User ' + targetId}</Text>
                                    <Text style={styles.statusText}>{status}</Text>
                                    <ActivityIndicator size="large" color={vTheme.colors.primary} style={{ marginTop: 20 }} />
                                </View>
                            ) as any,
                        }}
                    />
                ) : remoteVideoAvailable ? (
                    <RTCView
                        key={`remote-${remoteStream.id}-${streamVersion}`}
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
                        <Text style={styles.callerName}>{callerName || 'User ' + targetId}</Text>
                        <Text style={styles.statusText}>{status}</Text>
                        <ActivityIndicator size="large" color={vTheme.colors.primary} style={{ marginTop: 20 }} />
                    </View>
                )
            ) : (
                <View style={styles.remotePlaceholder}>
                    <View style={styles.avatarLarge}>
                        <User size={60} color="#fff" />
                    </View>
                    <Text style={styles.callerName}>{callerName || 'User ' + targetId}</Text>
                    <Text style={styles.statusText}>{status}</Text>
                    <ActivityIndicator size="large" color={vTheme.colors.primary} style={{ marginTop: 20 }} />
                </View>
            )}

            {localStream && localVideoAvailable && (
                <View style={styles.localVideoContainer}>
                    <RTCView
                        key={`${localStream.toURL()}-${streamVersion}`}
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
                            {feedbackStep === 'rating' ? 'Rate call quality' : 'Support call quality'}
                        </Text>
                        <Text style={styles.feedbackSubtitle}>
                            {feedbackStep === 'rating'
                                ? 'Help improve calls after the conversation ends.'
                                : 'Quick transfer only from regular LKM to the VedaMatch account.'}
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
                                    {FEEDBACK_REASONS.map((reason) => {
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
                                    placeholder="Comment (optional)"
                                    placeholderTextColor="rgba(255,255,255,0.45)"
                                    value={feedbackComment}
                                    onChangeText={setFeedbackComment}
                                    multiline
                                    maxLength={500}
                                />

                                <View style={styles.feedbackActions}>
                                    <TouchableOpacity style={styles.feedbackSecondaryBtn} onPress={completeFeedbackFlow} disabled={feedbackBusy}>
                                        <Text style={styles.feedbackSecondaryBtnText}>Skip</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.feedbackPrimaryBtn, (feedbackRating < 1 || feedbackBusy) && styles.feedbackBtnDisabled]}
                                        onPress={() => { void submitFeedback(); }}
                                        disabled={feedbackRating < 1 || feedbackBusy}
                                    >
                                        <Text style={styles.feedbackPrimaryBtnText}>{feedbackBusy ? 'Submitting...' : 'Next'}</Text>
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
                                    placeholder="Custom LKM amount"
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
                                        <Text style={styles.feedbackSecondaryBtnText}>Skip</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.feedbackPrimaryBtn, donationBusy && styles.feedbackBtnDisabled]}
                                        onPress={() => { void submitDonation(); }}
                                        disabled={donationBusy}
                                    >
                                        <Text style={styles.feedbackPrimaryBtnText}>{donationBusy ? 'Transferring...' : 'Support'}</Text>
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
