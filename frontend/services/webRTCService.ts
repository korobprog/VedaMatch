import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    MediaStream,
    mediaDevices,
} from 'react-native-webrtc';
import { PermissionsAndroid, Platform, type Permission } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';
import { WebSocketService } from './websocketService';
import InCallManager from 'react-native-incall-manager';
import { getAccessToken } from './authSessionService';
import apiClient from '../lib/apiClient';
import i18n from '../i18n';
import { callDiagnosticsService } from './callDiagnosticsService';

let configuration: any = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.sipnet.ru:3478' },
        { urls: 'stun:stun.chathelp.ru:3478' },
        { urls: 'stun:stun.comtube.ru:3478' },
        { urls: 'stun:stun.mipt.ru:3478' },
        { urls: 'stun:global.stun.twilio.com:3478' },
    ],
    iceCandidatePoolSize: 10, // Pre-fetch ICE candidates
    // Allow host/srflx/relay candidate selection during live mobile diagnostics.
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle', // Reduce number of ports needed
};

type IceServerConfig = {
    urls: string | string[];
    username?: string;
    credential?: string;
};

type IceConfigSelection = {
    iceServers: IceServerConfig[];
    iceTransportPolicy: 'all' | 'relay';
    networkType: string;
};

type CallDiagnosticsContext = {
    callSessionId: string;
    peerUserId?: number;
    roomId?: number;
    direction?: 'incoming' | 'outgoing' | 'unknown';
};

const getWebRtcCopy = () => {
    const language = String(i18n.language || '').trim().toLowerCase();
    if (language.startsWith('ru')) {
        return {
            missingMediaPermissions: 'Не хватает разрешений на камеру и микрофон',
            localMediaInitFailed: 'Не удалось инициализировать локальный медиапоток',
            cameraTrackUnavailable: 'Видеодорожка камеры недоступна',
        };
    }
    if (language.startsWith('hi')) {
        return {
            missingMediaPermissions: 'कैमरा और माइक्रोफ़ोन की अनुमति नहीं मिली',
            localMediaInitFailed: 'लोकल मीडिया स्ट्रीम प्रारंभ नहीं हो सकी',
            cameraTrackUnavailable: 'कैमरा वीडियो ट्रैक उपलब्ध नहीं है',
        };
    }
    return {
        missingMediaPermissions: 'Missing camera or microphone permissions',
        localMediaInitFailed: 'Failed to initialize local media stream',
        cameraTrackUnavailable: 'Camera track is unavailable',
    };
};

class WebRTCService {
    peerConnection: RTCPeerConnection | null = null;
    localStream: MediaStream | null = null;
    private localStreamPromise: Promise<MediaStream> | null = null;
    private isFrontCamera: boolean = true;
    wsService: WebSocketService | null = null;
    targetId: number | null = null;
    signalingRoomId: number | null = null;
    signalingMode: 'p2p' | 'room' = 'p2p';
    isInitiator: boolean = false;
    private remoteCandidates: RTCIceCandidate[] = [];
    private pendingOffer: any = null; // Store offer until user accepts
    private onCallEnded: ((reason: 'local' | 'remote' | 'system') => void) | null = null;
    private remoteStreamListeners = new Set<(stream: MediaStream) => void>();
    private iceStateListeners = new Set<(state: string) => void>();
    private diagnosticsContext: CallDiagnosticsContext | null = null;
    private diagnosticsReportedKeys = new Set<string>();
    private diagnosticsNetworkType: string = 'unknown';
    private diagnosticsStartedAtMs: number | null = null;
    private lastPeerConnectionState: string = 'unknown';

    public debugLocalCandidates: number = 0;
    public debugRemoteCandidates: number = 0;

    private async ensureSignalingReady(timeoutMs: number = 4500) {
        if (!this.wsService) {
            throw new Error('WebSocket signaling service is not configured');
        }

        const isReady = await this.wsService.waitUntilOpen(timeoutMs);
        if (!isReady) {
            throw new Error('WebSocket signaling socket is not connected');
        }
    }

    private normalizeIceServers(iceServers?: any[]): IceServerConfig[] {
        if (!Array.isArray(iceServers)) {
            return [];
        }

        return iceServers
            .map((server) => {
                if (!server?.urls) {
                    return null;
                }
                return {
                    urls: server.urls,
                    username: server.username,
                    credential: server.credential,
                } as IceServerConfig;
            })
            .filter((server): server is IceServerConfig => Boolean(server));
    }

    private expandTurnUrlsForCellular(server: IceServerConfig): IceServerConfig {
        const rawUrls = Array.isArray(server.urls) ? server.urls : [server.urls];
        const expandedUrls = rawUrls.flatMap((url) => {
            if (!url.startsWith('turn:')) {
                return [url];
            }
            if (url.includes('transport=')) {
                return [url];
            }
            return [`${url}?transport=udp`, `${url}?transport=tcp`];
        });

        return {
            ...server,
            urls: Array.isArray(server.urls) ? expandedUrls : expandedUrls[0] ?? server.urls,
        };
    }

    private pickRelayOnlyServers(iceServers: IceServerConfig[]): IceServerConfig[] {
        const relayServers = iceServers
            .map((server) => this.expandTurnUrlsForCellular(server))
            .filter((server) => {
                const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
                return urls.some((url) => url.startsWith('turn:'));
            });

        return relayServers.length > 0 ? relayServers : iceServers;
    }

    private async selectIceConfig(iceServers?: any[]): Promise<IceConfigSelection> {
        const normalizedServers = this.normalizeIceServers(iceServers);
        const fallbackServers = this.normalizeIceServers(configuration.iceServers);
        const candidateServers = normalizedServers.length > 0 ? normalizedServers : fallbackServers;

        try {
            const netInfo = await NetInfo.fetch();
            const networkType = String(netInfo.type || 'unknown');
            const isCellular = networkType === 'cellular';

            if (isCellular) {
                this.diagnosticsNetworkType = networkType;
                return {
                    iceServers: this.pickRelayOnlyServers(candidateServers),
                    iceTransportPolicy: 'relay',
                    networkType,
                };
            }

            this.diagnosticsNetworkType = networkType;
            return {
                iceServers: candidateServers,
                iceTransportPolicy: 'all',
                networkType,
            };
        } catch (error) {
            console.warn('[WebRTC] NetInfo.fetch failed, falling back to default ICE policy', error);
            this.diagnosticsNetworkType = 'unknown';
            return {
                iceServers: candidateServers,
                iceTransportPolicy: 'all',
                networkType: 'unknown',
            };
        }
    }

    private async sendSignalingMessage(message: Record<string, unknown>, timeoutMs: number = 2500) {
        if (!this.wsService) {
            console.warn('[WebRTC] Cannot send signaling message, ws service is not configured');
            this.reportDiagnosticEvent('signaling_send', {
                result: 'socket_not_configured',
                severity: 'error',
                message: `signaling socket missing for ${String(message.type)}`,
                metadata: { type: String(message.type || 'unknown') },
                dedupeKey: `signaling_send:${String(message.type || 'unknown')}:socket_not_configured`,
            });
            return false;
        }

        const isReady = await this.wsService.waitUntilOpen(timeoutMs);
        if (!isReady) {
            console.warn(`[WebRTC] Dropped signaling message ${String(message.type)}: socket not ready`);
            this.reportDiagnosticEvent('signaling_send', {
                result: 'socket_not_ready',
                severity: 'warning',
                message: `signaling socket not ready for ${String(message.type)}`,
                metadata: { type: String(message.type || 'unknown') },
                dedupeKey: `signaling_send:${String(message.type || 'unknown')}:socket_not_ready`,
            });
            return false;
        }

        this.wsService.send(message);
        return true;
    }

    setWebSocketService(ws: WebSocketService) {
        this.wsService = ws;
    }

    setOnCallEnded(callback: ((reason: 'local' | 'remote' | 'system') => void) | null) {
        this.onCallEnded = callback;
    }

    remoteStream: MediaStream | null = null;

    private emitRemoteStream(stream: MediaStream) {
        this.remoteStreamListeners.forEach((listener) => {
            listener(stream);
        });
    }

    private emitIceStateChange(state: string) {
        this.iceStateListeners.forEach((listener) => {
            listener(state);
        });
    }

    setOnRemoteStream(callback: (stream: MediaStream) => void) {
        this.remoteStreamListeners.add(callback);
        // If remote tracks already arrived before UI subscribed, replay the current stream immediately.
        if (this.remoteStream && this.remoteStream.getTracks().length > 0) {
            callback(this.remoteStream);
        }
        return () => {
            this.remoteStreamListeners.delete(callback);
        };
    }

    setOnIceStateChange(callback: (state: string) => void) {
        this.iceStateListeners.add(callback);
        const state = this.peerConnection?.iceConnectionState;
        if (state) {
            callback(`${state} (L:${this.debugLocalCandidates} R:${this.debugRemoteCandidates})`);
        }
        return () => {
            this.iceStateListeners.delete(callback);
        };
    }

    setCallDiagnosticsContext(context: CallDiagnosticsContext | null) {
        if (!context?.callSessionId?.trim()) {
            this.diagnosticsContext = null;
            this.diagnosticsReportedKeys.clear();
            this.diagnosticsStartedAtMs = null;
            this.diagnosticsNetworkType = 'unknown';
            return;
        }

        this.diagnosticsContext = {
            callSessionId: context.callSessionId.trim(),
            peerUserId: context.peerUserId,
            roomId: context.roomId,
            direction: context.direction || 'unknown',
        };
        this.diagnosticsReportedKeys.clear();
    }

    clearCallDiagnosticsContext(callSessionId?: string) {
        if (callSessionId && this.diagnosticsContext?.callSessionId !== callSessionId.trim()) {
            return;
        }
        this.diagnosticsContext = null;
        this.diagnosticsReportedKeys.clear();
        this.diagnosticsStartedAtMs = null;
        this.diagnosticsNetworkType = 'unknown';
    }

    private buildDiagnosticsStats(durationSec?: number) {
        return {
            durationSec,
            localCandidates: this.debugLocalCandidates,
            remoteCandidates: this.debugRemoteCandidates,
            iceConnectionState: this.peerConnection?.iceConnectionState || 'unknown',
            peerConnectionState: (this.peerConnection as any)?.connectionState || this.lastPeerConnectionState || 'unknown',
        };
    }

    private async reportDiagnosticEvent(
        event: string,
        options: {
            result?: string;
            severity?: 'info' | 'warning' | 'error' | 'critical';
            message?: string;
            metadata?: Record<string, string | number | boolean | null | undefined>;
            durationSec?: number;
            dedupeKey?: string;
        } = {},
    ) {
        if (!this.diagnosticsContext?.callSessionId) {
            return;
        }

        const dedupeKey = options.dedupeKey || `${event}:${options.result || 'reported'}`;
        if (dedupeKey && this.diagnosticsReportedKeys.has(dedupeKey)) {
            return;
        }
        if (dedupeKey) {
            this.diagnosticsReportedKeys.add(dedupeKey);
        }

        try {
            await callDiagnosticsService.submitReport({
                callSessionId: this.diagnosticsContext.callSessionId,
                peerUserId: this.diagnosticsContext.peerUserId,
                roomId: this.diagnosticsContext.roomId,
                direction: this.diagnosticsContext.direction || 'unknown',
                mode: this.signalingMode === 'room' ? 'room' : 'p2p',
                event,
                result: options.result || 'reported',
                severity: options.severity || 'info',
                platform: Platform.OS,
                networkType: this.diagnosticsNetworkType || 'unknown',
                appVersion: DeviceInfo.getVersion(),
                deviceModel: DeviceInfo.getModel(),
                message: options.message,
                stats: this.buildDiagnosticsStats(options.durationSec),
                metadata: options.metadata,
            });
        } catch (error: any) {
            console.warn('[WebRTC] Failed to submit call diagnostics event', event, error?.message || error);
        }
    }

    private beginDiagnosticsTimer() {
        if (!this.diagnosticsStartedAtMs) {
            this.diagnosticsStartedAtMs = Date.now();
        }
    }

    private getDiagnosticsDurationSec() {
        if (!this.diagnosticsStartedAtMs) {
            return 0;
        }
        return Math.max(0, Math.round((Date.now() - this.diagnosticsStartedAtMs) / 1000));
    }

    private rebuildRemoteStreamFromTrackEvent(event: any) {
        const nextStream = this.remoteStream ?? new MediaStream();
        const knownTrackIds = new Set(nextStream.getTracks().map((track: MediaStreamTrack) => track.id));

        const appendTrack = (track: MediaStreamTrack | null | undefined) => {
            if (!track || knownTrackIds.has(track.id)) {
                return;
            }
            nextStream.addTrack(track);
            knownTrackIds.add(track.id);
        };

        if (Array.isArray(event?.streams)) {
            event.streams.forEach((stream: MediaStream) => {
                stream.getTracks().forEach((track: MediaStreamTrack) => {
                    appendTrack(track);
                });
            });
        }

        appendTrack(event?.track);

        this.remoteStream = nextStream;
        console.warn(
            `[WebRTC] Remote stream rebuilt: audio=${nextStream.getAudioTracks().length} video=${nextStream.getVideoTracks().length}`,
        );
        return nextStream;
    }

    private async ensureAndroidMediaPermissions() {
        if (Platform.OS !== 'android') {
            return;
        }

        const requiredPermissions = [
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ];

        const missingPermissions: Permission[] = [];
        for (const permission of requiredPermissions) {
            const granted = await PermissionsAndroid.check(permission);
            if (!granted) {
                missingPermissions.push(permission);
            }
        }

        if (missingPermissions.length === 0) {
            return;
        }

        const requestResult = await PermissionsAndroid.requestMultiple(missingPermissions);
        const deniedPermissions: Permission[] = missingPermissions.filter(
            permission => requestResult[permission] !== PermissionsAndroid.RESULTS.GRANTED
        );

        if (deniedPermissions.length > 0) {
            throw new Error(`${getWebRtcCopy().missingMediaPermissions}: ${deniedPermissions.join(', ')}`);
        }
    }

    private getPreferredVideoSource(devices: Array<{ kind?: string; facing?: string; deviceId?: string }>, isFront: boolean) {
        const preferredFacingValues = isFront ? ['user', 'front'] : ['environment', 'back'];
        const preferred = devices.find(source => {
            if (source.kind !== 'videoinput') {
                return false;
            }
            const facing = String(source.facing || '').toLowerCase();
            return preferredFacingValues.includes(facing);
        });

        if (preferred?.deviceId) {
            return preferred.deviceId;
        }

        return devices.find(source => source.kind === 'videoinput')?.deviceId;
    }

    private async createLocalStreamWithPreferredCamera(isVideo: boolean, isFront: boolean): Promise<MediaStream> {
        await this.ensureAndroidMediaPermissions();

        let videoSourceId: string | undefined;

        // iOS crash workaround:
        // react-native-webrtc@124 can throw a native NSException inside enumerateDevices
        // when one of AV device fields is nil. Avoid enumerateDevices on iOS.
        if (Platform.OS !== 'ios') {
            try {
                const devices = await mediaDevices.enumerateDevices() as Array<{ kind?: string; facing?: string; deviceId?: string }>;
                videoSourceId = this.getPreferredVideoSource(devices, isFront);
            } catch (error) {
                console.warn('[WebRTC] enumerateDevices failed, falling back to facingMode-only constraints', error);
                videoSourceId = undefined;
            }
        }

        const videoConstraintsCandidates = isVideo
            ? [
                {
                    facingMode: isFront ? 'user' : 'environment',
                    ...(videoSourceId ? { deviceId: videoSourceId } : {}),
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 24, max: 30 },
                },
                {
                    facingMode: isFront ? 'user' : 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                },
                true,
            ]
            : [false];

        let stream: MediaStream | null = null;
        let lastError: unknown = null;
        for (const videoConstraints of videoConstraintsCandidates) {
            try {
                stream = await mediaDevices.getUserMedia({
                    audio: true,
                    video: videoConstraints,
                });
                break;
            } catch (error) {
                lastError = error;
                console.warn('[WebRTC] getUserMedia attempt failed, trying fallback constraints', error);
            }
        }

        if (!stream) {
            throw lastError ?? new Error(getWebRtcCopy().localMediaInitFailed);
        }

        if (isVideo && stream.getVideoTracks().length === 0) {
            stream.getTracks().forEach(track => track.stop());
            throw new Error(getWebRtcCopy().cameraTrackUnavailable);
        }

        return stream;
    }

    async startLocalStream(isVideo: boolean = true) {
        if (this.localStream) {
            const hasLiveTrack = this.localStream.getTracks().some(track => track.readyState === 'live');
            if (hasLiveTrack) {
                return this.localStream;
            }
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        if (this.localStreamPromise) {
            return this.localStreamPromise;
        }

        this.localStreamPromise = (async () => {
            const stream = await this.createLocalStreamWithPreferredCamera(isVideo, this.isFrontCamera);
            console.log('Local stream obtained. Audio tracks:', stream.getAudioTracks().length, 'Video tracks:', stream.getVideoTracks().length);
            this.localStream = stream;
            return stream;
        })().finally(() => {
            this.localStreamPromise = null;
        });

        return this.localStreamPromise;
    }

    private async replaceLocalTracksForPeerConnection(nextStream: MediaStream) {
        if (!this.peerConnection) {
            return;
        }

        const senders = (this.peerConnection as any).getSenders?.() as Array<any> | undefined;
        const nextVideoTrack = nextStream.getVideoTracks()[0];
        const nextAudioTrack = nextStream.getAudioTracks()[0];

        let replacedVideo = false;
        let replacedAudio = false;

        if (Array.isArray(senders)) {
            for (const sender of senders) {
                const senderTrack = sender?.track;
                if (!senderTrack || typeof sender.replaceTrack !== 'function') {
                    continue;
                }

                if (senderTrack.kind === 'video' && nextVideoTrack) {
                    await sender.replaceTrack(nextVideoTrack);
                    replacedVideo = true;
                }

                if (senderTrack.kind === 'audio' && nextAudioTrack) {
                    await sender.replaceTrack(nextAudioTrack);
                    replacedAudio = true;
                }
            }
        }

        if (nextVideoTrack && !replacedVideo) {
            this.peerConnection.addTrack(nextVideoTrack, nextStream);
        }

        if (nextAudioTrack && !replacedAudio) {
            this.peerConnection.addTrack(nextAudioTrack, nextStream);
        }
    }

    private async restartLocalStreamWithFacing(isFront: boolean): Promise<MediaStream> {
        const previousStream = this.localStream;
        const nextStream = await this.createLocalStreamWithPreferredCamera(true, isFront);

        await this.replaceLocalTracksForPeerConnection(nextStream);

        this.localStream = nextStream;
        this.isFrontCamera = isFront;

        if (previousStream && previousStream !== nextStream) {
            previousStream.getTracks().forEach(track => track.stop());
        }

        return nextStream;
    }

    async switchCamera(): Promise<{ success: boolean; stream?: MediaStream; reason?: string }> {
        if (this.localStreamPromise) {
            try {
                await this.localStreamPromise;
            } catch {
                // Continue with the best effort below.
            }
        }

        const stream = this.localStream;
        if (!stream) {
            return { success: false, reason: 'no_local_stream' };
        }

        const videoTrack = stream.getVideoTracks()[0] as any;
        if (!videoTrack) {
            return { success: false, reason: 'no_video_track' };
        }

        // On iOS devices track-level _switchCamera can report success but keep the old camera feed.
        // Stream restart is slower but deterministic and updates sender tracks as well.
        if (Platform.OS === 'ios') {
            try {
                const nextStream = await this.restartLocalStreamWithFacing(!this.isFrontCamera);
                return { success: true, stream: nextStream };
            } catch (error) {
                console.warn('[WebRTC] iOS stream-level camera switch failed', error);
                return { success: false, reason: 'switch_failed' };
            }
        }

        const legacySwitchFn = typeof videoTrack._switchCamera === 'function'
            ? videoTrack._switchCamera.bind(videoTrack)
            : typeof videoTrack.switchCamera === 'function'
                ? videoTrack.switchCamera.bind(videoTrack)
                : null;

        if (legacySwitchFn) {
            try {
                legacySwitchFn();
                this.isFrontCamera = !this.isFrontCamera;
                return { success: true, stream };
            } catch (error) {
                console.warn('[WebRTC] track-level camera switch failed, falling back to stream restart', error);
            }
        }

        try {
            const nextStream = await this.restartLocalStreamWithFacing(!this.isFrontCamera);
            return { success: true, stream: nextStream };
        } catch (error) {
            console.warn('[WebRTC] stream-level camera switch failed', error);
            return { success: false, reason: 'switch_failed' };
        }
    }

    async fetchTurnCredentials() {
        try {
            const token = await getAccessToken();
            if (!token) {
                console.log('No auth token, using fallback STUN');
                this.diagnosticsNetworkType = 'unknown';
                this.reportDiagnosticEvent('turn_credentials_fetch', {
                    result: 'missing_auth_token',
                    severity: 'warning',
                    message: 'TURN credentials skipped because auth token is missing',
                    dedupeKey: 'turn_credentials_fetch:missing_auth_token',
                });
                return;
            }

            console.log('Fetching TURN credentials from: /turn-credentials');
            const response = await apiClient.get<{ iceServers?: any[] }>('/turn-credentials');
            const selectedConfig = await this.selectIceConfig(response.data?.iceServers);

            if (response.data?.iceServers && Array.isArray(response.data.iceServers)) {
                console.warn(`[WebRTC] Fetched ${response.data.iceServers.length} ICE Servers from API`);

                configuration = { 
                    iceServers: selectedConfig.iceServers,
                    iceCandidatePoolSize: 10,
                    iceTransportPolicy: selectedConfig.iceTransportPolicy,
                    bundlePolicy: 'max-bundle',
                };
                console.log(
                    `[WebRTC] Updated ICE config from API: network=${selectedConfig.networkType} policy=${selectedConfig.iceTransportPolicy} servers=${JSON.stringify(selectedConfig.iceServers)}`,
                );
                this.reportDiagnosticEvent('turn_credentials_fetch', {
                    result: selectedConfig.iceTransportPolicy === 'relay' ? 'relay_selected' : 'success',
                    severity: 'info',
                    metadata: {
                        ice_transport_policy: selectedConfig.iceTransportPolicy,
                        ice_server_count: selectedConfig.iceServers.length,
                    },
                    dedupeKey: `turn_credentials_fetch:${selectedConfig.iceTransportPolicy}`,
                });
            }
        } catch (error: any) {
            console.warn('[WebRTC] Error fetching TURN credentials, using defaults:', error.message);
            this.diagnosticsNetworkType = 'unknown';
            this.reportDiagnosticEvent('turn_credentials_fetch', {
                result: 'error',
                severity: 'error',
                message: error?.message || 'turn credentials fetch failed',
                dedupeKey: 'turn_credentials_fetch:error',
            });
            // Safe fallback: STUN-only configuration when TURN credentials API is unavailable.
            configuration = {
                iceServers: [
                    { urls: 'stun:stun.sipnet.ru:3478' },
                    { urls: 'stun:stun.chathelp.ru:3478' },
                    { urls: 'stun:stun.comtube.ru:3478' },
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
                ],
                iceCandidatePoolSize: 10,
                iceTransportPolicy: 'all',
                bundlePolicy: 'max-bundle',
            };
        }
    }

    createPeerConnection() {
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        this.remoteCandidates = []; // Reset buffer
        this.debugLocalCandidates = 0;
        this.debugRemoteCandidates = 0;

        // Always initialize a new remote stream for a new connection
        this.remoteStream = new MediaStream();

        console.log('Creating RTCPeerConnection with config:', JSON.stringify(configuration));
        this.peerConnection = new RTCPeerConnection(configuration);

        (this.peerConnection as any).onicecandidate = (event: any) => {
            if (event.candidate) {
                this.debugLocalCandidates++;
                const state = this.peerConnection?.iceConnectionState || 'gathering';
                this.emitIceStateChange(`${state} (L:${this.debugLocalCandidates} R:${this.debugRemoteCandidates})`);

                if (this.wsService && this.targetId) {
                    if (this.signalingMode === 'room') {
                        this.sendSignalingMessage({
                            type: 'room_candidate',
                            roomId: this.signalingRoomId || 0,
                            targetId: this.targetId,
                            payload: event.candidate,
                        }).catch(error => {
                            console.warn('[WebRTC] Failed to send room ICE candidate', error);
                        });
                    } else {
                        this.sendSignalingMessage({
                            type: 'candidate',
                            targetId: this.targetId,
                            payload: event.candidate,
                        }).catch(error => {
                            console.warn('[WebRTC] Failed to send ICE candidate', error);
                        });
                    }
                }
            }
        };

        (this.peerConnection as any).oniceconnectionstatechange = () => {
            const state = this.peerConnection?.iceConnectionState || 'unknown';
            console.log('ICE Connection State:', state);
            this.emitIceStateChange(`${state} (L:${this.debugLocalCandidates} R:${this.debugRemoteCandidates})`);
            const normalizedState = String(state).trim().toLowerCase();
            if (normalizedState === 'connected' || normalizedState === 'completed') {
                this.reportDiagnosticEvent('ice_connection_state', {
                    result: normalizedState,
                    severity: 'info',
                    dedupeKey: `ice_connection_state:${normalizedState}`,
                });
            } else if (normalizedState === 'disconnected' || normalizedState === 'failed') {
                this.reportDiagnosticEvent('ice_connection_state', {
                    result: normalizedState,
                    severity: normalizedState === 'failed' ? 'error' : 'warning',
                    message: `ice connection state changed to ${normalizedState}`,
                    dedupeKey: `ice_connection_state:${normalizedState}`,
                });
            }
        };

        (this.peerConnection as any).onconnectionstatechange = () => {
            const state = (this.peerConnection as any)?.connectionState || 'unknown';
            this.lastPeerConnectionState = String(state).trim().toLowerCase() || 'unknown';
            console.log('Peer Connection State:', this.lastPeerConnectionState);
            if (this.lastPeerConnectionState === 'connected') {
                this.reportDiagnosticEvent('peer_connection_state', {
                    result: 'connected',
                    severity: 'info',
                    dedupeKey: 'peer_connection_state:connected',
                });
            } else if (this.lastPeerConnectionState === 'disconnected' || this.lastPeerConnectionState === 'failed') {
                this.reportDiagnosticEvent('peer_connection_state', {
                    result: this.lastPeerConnectionState,
                    severity: this.lastPeerConnectionState === 'failed' ? 'error' : 'warning',
                    message: `peer connection state changed to ${this.lastPeerConnectionState}`,
                    dedupeKey: `peer_connection_state:${this.lastPeerConnectionState}`,
                });
            }
        };

        (this.peerConnection as any).ontrack = (event: any) => {
            const kind = event.track.kind;
            const streamId = event.streams?.[0]?.id;
            console.warn(`[WebRTC] Received remote track: ${kind} from stream: ${streamId}`);

            const rebuiltStream = this.rebuildRemoteStreamFromTrackEvent(event);
            this.emitRemoteStream(rebuiltStream);
            if (rebuiltStream.getTracks().length > 0) {
                this.reportDiagnosticEvent('call_established', {
                    result: 'remote_media',
                    severity: 'info',
                    metadata: {
                        remote_audio_tracks: rebuiltStream.getAudioTracks().length,
                        remote_video_tracks: rebuiltStream.getVideoTracks().length,
                    },
                    dedupeKey: 'call_established:remote_media',
                });
            }
        };

        // Add legacy onaddstream just in case
        (this.peerConnection as any).onaddstream = (event: any) => {
            console.log('Received remote stream (legacy onaddstream)', event.stream.id);
            this.remoteStream = event.stream;
            if (this.remoteStream) {
                this.emitRemoteStream(this.remoteStream);
            }
        };

        if (this.localStream) {
            console.warn(`[WebRTC] Adding ${this.localStream.getTracks().length} local tracks to PC`);
            const stream = this.localStream;
            stream.getTracks().forEach(track => {
                this.peerConnection?.addTrack(track, stream);
            });
        } else {
            console.warn('No local stream available when creating PeerConnection!');
        }
    }

    async startCall(targetId: number) {
        await this.fetchTurnCredentials(); // Get TURN config first
        await this.ensureSignalingReady();
        this.beginDiagnosticsTimer();
        this.signalingMode = 'p2p';
        this.signalingRoomId = null;
        this.targetId = targetId;
        this.isInitiator = true;

        InCallManager.start({ media: 'video' });
        InCallManager.setForceSpeakerphoneOn(true);

        await this.startLocalStream(true);
        this.createPeerConnection();

        // Extra check: ensure tracks are added
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                console.log(`Adding track to PC: ${track.kind}`);
            });
        }

        const offer = await (this.peerConnection as any).createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });
        await this.peerConnection!.setLocalDescription(offer);

        await this.sendSignalingMessage({
            type: 'offer',
            targetId: this.targetId,
            payload: offer,
        });
    }

    async startRoomCall(targetId: number, roomId: number) {
        await this.fetchTurnCredentials();
        await this.ensureSignalingReady();
        this.beginDiagnosticsTimer();
        this.signalingMode = 'room';
        this.signalingRoomId = roomId;
        this.targetId = targetId;
        this.isInitiator = true;

        InCallManager.start({ media: 'video' });
        InCallManager.setForceSpeakerphoneOn(true);

        await this.startLocalStream(true);
        this.createPeerConnection();

        const offer = await (this.peerConnection as any).createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });
        await this.peerConnection!.setLocalDescription(offer);

        await this.sendSignalingMessage({
            type: 'room_offer',
            roomId,
            targetId: this.targetId,
            payload: offer,
        });
    }

    async processOffer(message: any) {
        console.log('Received OFFER, storing as pending...');
        this.pendingOffer = message;
        this.targetId = message.senderId;
        if (message?.type === 'room_offer' && message?.roomId) {
            this.signalingMode = 'room';
            this.signalingRoomId = Number(message.roomId);
        } else {
            this.signalingMode = 'p2p';
            this.signalingRoomId = null;
        }
        this.isInitiator = false;
        // Don't auto-answer. Wait for acceptCall().
    }

    async acceptCall() {
        if (!this.pendingOffer) {
            console.error('No pending offer to accept');
            this.reportDiagnosticEvent('accept_call', {
                result: 'missing_offer',
                severity: 'error',
                message: 'accept call requested without pending offer',
                dedupeKey: 'accept_call:missing_offer',
            });
            return;
        }

        console.log('Accepting call...');
        await this.fetchTurnCredentials();
        await this.ensureSignalingReady();
        this.beginDiagnosticsTimer();

        InCallManager.start({ media: 'video' });
        InCallManager.setForceSpeakerphoneOn(true);

        await this.startLocalStream(true);
        this.createPeerConnection();

        try {
            await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(this.pendingOffer.payload));
            this.pendingOffer = null; // Clear used offer

            await this.processBufferedCandidates(); // Flush candidates received while waiting

            const answer = await (this.peerConnection as any).createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await this.peerConnection!.setLocalDescription(answer);

            if (this.targetId) {
                if (this.signalingMode === 'room') {
                    await this.sendSignalingMessage({
                        type: 'room_answer',
                        roomId: this.signalingRoomId || 0,
                        targetId: this.targetId,
                        payload: answer,
                    });
                } else {
                    await this.sendSignalingMessage({
                        type: 'answer',
                        targetId: this.targetId,
                        payload: answer,
                    });
                }
            }
        } catch (e) {
            console.error('Error accepting call:', e);
            this.reportDiagnosticEvent('accept_call', {
                result: 'error',
                severity: 'error',
                message: e instanceof Error ? e.message : String(e),
                dedupeKey: 'accept_call:error',
            });
        }
    }

    async processAnswer(message: any) {
        if (this.peerConnection) {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.payload));
            this.processBufferedCandidates(); // Flush candidates
        }
    }

    async processCandidate(message: any) {
        this.debugRemoteCandidates++;
        const state = this.peerConnection?.iceConnectionState || 'active';
        this.emitIceStateChange(`${state} (L:${this.debugLocalCandidates} R:${this.debugRemoteCandidates})`);
        console.warn(`[WebRTC] Processing remote candidate #${this.debugRemoteCandidates}: ${message.payload?.candidate?.substring(0, 30)}...`);
        const candidate = new RTCIceCandidate(message.payload);

        if (this.peerConnection && this.peerConnection.remoteDescription) {
            try {
                await this.peerConnection.addIceCandidate(candidate);
                console.warn('[WebRTC] ICE candidate added successfully');
            } catch (e) {
                console.error('[WebRTC] Error adding ICE candidate:', e);
                this.reportDiagnosticEvent('remote_candidate_add', {
                    result: 'error',
                    severity: 'warning',
                    message: e instanceof Error ? e.message : String(e),
                    dedupeKey: 'remote_candidate_add:error',
                });
            }
        } else {
            console.warn('[WebRTC] Buffering ICE candidate (no remote description yet)');
            this.remoteCandidates.push(candidate);
        }
    }

    async processBufferedCandidates() {
        for (const candidate of this.remoteCandidates) {
            if (this.peerConnection) {
                await this.peerConnection.addIceCandidate(candidate);
            }
        }
        this.remoteCandidates = [];
    }

    async handleSignalingMessage(message: any) {
        switch (message.type) {
            case 'offer':
            case 'room_offer':
                await this.processOffer(message);
                break;
            case 'answer':
            case 'room_answer':
                await this.processAnswer(message);
                break;
            case 'candidate':
            case 'room_candidate':
                await this.processCandidate(message);
                break;
            case 'hangup':
            case 'room_hangup':
                this.endCall('remote');
                break;
        }
    }

    endCall(reason: 'local' | 'remote' | 'system' = 'system') {
        const hadActiveCall = Boolean(
            this.peerConnection
            || this.localStream
            || this.remoteStream
            || this.targetId
            || this.pendingOffer
        );
        const finalDurationSec = this.getDiagnosticsDurationSec();
        if (hadActiveCall) {
            this.reportDiagnosticEvent('call_ended', {
                result: reason,
                severity: reason === 'system' ? 'warning' : 'info',
                durationSec: finalDurationSec,
                metadata: {
                    had_remote_stream: Boolean(this.remoteStream),
                    local_track_count: this.localStream?.getTracks().length ?? 0,
                    remote_track_count: this.remoteStream?.getTracks().length ?? 0,
                },
                dedupeKey: `call_ended:${reason}`,
            });
        }

        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        this.localStreamPromise = null;
        this.isFrontCamera = true;
        InCallManager.stop();
        this.remoteStream = null;
        this.remoteCandidates = [];
        this.pendingOffer = null;
        this.targetId = null;
        this.signalingRoomId = null;
        this.signalingMode = 'p2p';
        this.lastPeerConnectionState = 'unknown';
        this.remoteStreamListeners.clear();
        this.iceStateListeners.clear();
        this.diagnosticsStartedAtMs = null;
        const onCallEnded = this.onCallEnded;
        this.onCallEnded = null;
        if (hadActiveCall && onCallEnded) {
            onCallEnded(reason);
        }
    }

    sendHangup() {
        if (this.wsService && this.targetId) {
            if (this.signalingMode === 'room') {
                this.sendSignalingMessage({
                    type: 'room_hangup',
                    roomId: this.signalingRoomId || 0,
                    targetId: this.targetId,
                    payload: {},
                }).catch(error => {
                    console.warn('[WebRTC] Failed to send room hangup', error);
                });
            } else {
                this.sendSignalingMessage({
                    type: 'hangup',
                    targetId: this.targetId,
                    payload: {},
                }).catch(error => {
                    console.warn('[WebRTC] Failed to send hangup', error);
                });
            }
        }
        this.endCall('local');
    }
}

export const webRTCService = new WebRTCService();
