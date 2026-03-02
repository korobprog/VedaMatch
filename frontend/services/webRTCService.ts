import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    MediaStream,
    mediaDevices,
} from 'react-native-webrtc';
import { PermissionsAndroid, Platform, type Permission } from 'react-native';
import { WebSocketService } from './websocketService';
import InCallManager from 'react-native-incall-manager';
import { getAccessToken } from './authSessionService';
import apiClient from '../lib/apiClient';

let configuration: any = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.sipnet.ru:3478' },
        { urls: 'stun:stun.chathelp.ru:3478' },
        { urls: 'stun:stun.comtube.ru:3478' },
        { urls: 'stun:stun.mipt.ru:3478' },
        { urls: 'stun:global.stun.twilio.com:3478' },
    ],
};

class WebRTCService {
    peerConnection: RTCPeerConnection | null = null;
    localStream: MediaStream | null = null;
    private localStreamPromise: Promise<MediaStream> | null = null;
    private isFrontCamera: boolean = true;
    wsService: WebSocketService | null = null;
    onRemoteStream: ((stream: MediaStream) => void) | null = null;
    targetId: number | null = null;
    signalingRoomId: number | null = null;
    signalingMode: 'p2p' | 'room' = 'p2p';
    isInitiator: boolean = false;
    private remoteCandidates: RTCIceCandidate[] = [];
    private pendingOffer: any = null; // Store offer until user accepts

    public debugLocalCandidates: number = 0;
    public debugRemoteCandidates: number = 0;

    setWebSocketService(ws: WebSocketService) {
        this.wsService = ws;
    }

    remoteStream: MediaStream | null = null;

    setOnRemoteStream(callback: (stream: MediaStream) => void) {
        this.onRemoteStream = callback;
        // If stream already exists, trigger callback immediately
        if (this.remoteStream) {
            callback(this.remoteStream);
        }
    }

    onIceStateChange: ((state: string) => void) | null = null;
    setOnIceStateChange(callback: (state: string) => void) {
        this.onIceStateChange = callback;
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
            throw new Error(`Missing media permissions: ${deniedPermissions.join(', ')}`);
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
            throw lastError ?? new Error('Failed to initialize local media stream');
        }

        if (isVideo && stream.getVideoTracks().length === 0) {
            stream.getTracks().forEach(track => track.stop());
            throw new Error('Camera track is unavailable');
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
                return;
            }

            console.log('Fetching TURN credentials from: /turn-credentials');
            const response = await apiClient.get<{ iceServers?: any[] }>('/turn-credentials');

            if (response.data?.iceServers && Array.isArray(response.data.iceServers)) {
                console.warn(`[WebRTC] Fetched ${response.data.iceServers.length} ICE Servers from API`);
                configuration = { iceServers: response.data.iceServers };
            }
        } catch (error: any) {
            console.warn('[WebRTC] Error fetching TURN credentials, using defaults:', error.message);
            // Safe fallback: STUN-only configuration when TURN credentials API is unavailable.
            configuration = {
                iceServers: [
                    { urls: 'stun:stun.sipnet.ru:3478' },
                    { urls: 'stun:stun.chathelp.ru:3478' },
                    { urls: 'stun:stun.comtube.ru:3478' },
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
                ]
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
                if (this.onIceStateChange) {
                    this.onIceStateChange(`${state} (L:${this.debugLocalCandidates} R:${this.debugRemoteCandidates})`);
                }

                if (this.wsService && this.targetId) {
                    if (this.signalingMode === 'room') {
                        this.wsService.send({
                            type: 'room_candidate',
                            roomId: this.signalingRoomId || 0,
                            targetId: this.targetId,
                            payload: event.candidate,
                        });
                    } else {
                        this.wsService.send({
                            type: 'candidate',
                            targetId: this.targetId,
                            payload: event.candidate,
                        });
                    }
                }
            }
        };

        (this.peerConnection as any).oniceconnectionstatechange = () => {
            const state = this.peerConnection?.iceConnectionState || 'unknown';
            console.log('ICE Connection State:', state);
            if (this.onIceStateChange) {
                this.onIceStateChange(`${state} (L:${this.debugLocalCandidates} R:${this.debugRemoteCandidates})`);
            }
        };

        (this.peerConnection as any).ontrack = (event: any) => {
            const kind = event.track.kind;
            const streamId = event.streams?.[0]?.id;
            console.warn(`[WebRTC] Received remote track: ${kind} from stream: ${streamId}`);

            if (!this.remoteStream) {
                if (event.streams && event.streams[0]) {
                    this.remoteStream = event.streams[0];
                } else {
                    this.remoteStream = new MediaStream();
                    this.remoteStream.addTrack(event.track);
                }
            } else {
                // Already have a stream, just ensure track is in it
                const existingTracks = this.remoteStream.getTracks();
                if (!existingTracks.find(t => t.id === event.track.id)) {
                    this.remoteStream.addTrack(event.track);
                }
            }

            if (this.onRemoteStream && this.remoteStream) {
                this.onRemoteStream(this.remoteStream);
            }
        };

        // Add legacy onaddstream just in case
        (this.peerConnection as any).onaddstream = (event: any) => {
            console.log('Received remote stream (legacy onaddstream)', event.stream.id);
            this.remoteStream = event.stream;
            if (this.onRemoteStream && this.remoteStream) {
                this.onRemoteStream(this.remoteStream);
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
        this.signalingMode = 'p2p';
        this.signalingRoomId = null;
        this.targetId = targetId;
        this.isInitiator = true;

        InCallManager.start({ media: 'video' });
        InCallManager.setForceSpeakerphoneOn(true);

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

        if (this.wsService) {
            this.wsService.send({
                type: 'offer',
                targetId: this.targetId,
                payload: offer,
            });
        }
    }

    async startRoomCall(targetId: number, roomId: number) {
        await this.fetchTurnCredentials();
        this.signalingMode = 'room';
        this.signalingRoomId = roomId;
        this.targetId = targetId;
        this.isInitiator = true;

        InCallManager.start({ media: 'video' });
        InCallManager.setForceSpeakerphoneOn(true);

        this.createPeerConnection();

        const offer = await (this.peerConnection as any).createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });
        await this.peerConnection!.setLocalDescription(offer);

        if (this.wsService) {
            this.wsService.send({
                type: 'room_offer',
                roomId,
                targetId: this.targetId,
                payload: offer,
            });
        }
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
            return;
        }

        console.log('Accepting call...');
        await this.fetchTurnCredentials();

        InCallManager.start({ media: 'video' });
        InCallManager.setForceSpeakerphoneOn(true);

        this.createPeerConnection(); // Will use existing localStream which UI should have started

        try {
            await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(this.pendingOffer.payload));
            this.pendingOffer = null; // Clear used offer

            await this.processBufferedCandidates(); // Flush candidates received while waiting

            const answer = await (this.peerConnection as any).createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await this.peerConnection!.setLocalDescription(answer);

            if (this.wsService && this.targetId) {
                if (this.signalingMode === 'room') {
                    this.wsService.send({
                        type: 'room_answer',
                        roomId: this.signalingRoomId || 0,
                        targetId: this.targetId,
                        payload: answer,
                    });
                } else {
                    this.wsService.send({
                        type: 'answer',
                        targetId: this.targetId,
                        payload: answer,
                    });
                }
            }
        } catch (e) {
            console.error('Error accepting call:', e);
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
        if (this.onIceStateChange) {
            const state = this.peerConnection?.iceConnectionState || 'active';
            this.onIceStateChange(`${state} (L:${this.debugLocalCandidates} R:${this.debugRemoteCandidates})`);
        }
        console.warn(`[WebRTC] Processing remote candidate #${this.debugRemoteCandidates}: ${message.payload?.candidate?.substring(0, 30)}...`);
        const candidate = new RTCIceCandidate(message.payload);

        if (this.peerConnection && this.peerConnection.remoteDescription) {
            try {
                await this.peerConnection.addIceCandidate(candidate);
                console.warn('[WebRTC] ICE candidate added successfully');
            } catch (e) {
                console.error('[WebRTC] Error adding ICE candidate:', e);
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
                this.endCall();
                break;
        }
    }

    endCall() {
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
        this.targetId = null;
        this.signalingRoomId = null;
        this.signalingMode = 'p2p';
        this.onIceStateChange = null;
        // Notify server/other user if needed via hangup message
    }

    sendHangup() {
        if (this.wsService && this.targetId) {
            if (this.signalingMode === 'room') {
                this.wsService.send({
                    type: 'room_hangup',
                    roomId: this.signalingRoomId || 0,
                    targetId: this.targetId,
                    payload: {},
                });
            } else {
                this.wsService.send({
                    type: 'hangup',
                    targetId: this.targetId,
                    payload: {},
                });
            }
        }
        this.endCall();
    }
}

export const webRTCService = new WebRTCService();
