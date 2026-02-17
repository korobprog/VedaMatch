import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    MediaStream,
    mediaDevices,
} from 'react-native-webrtc';
import { WebSocketService } from './websocketService';
import { API_PATH } from '../config/api.config';
import InCallManager from 'react-native-incall-manager';
import { authorizedAxiosRequest, getAccessToken } from './authSessionService';

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
    wsService: WebSocketService | null = null;
    onRemoteStream: ((stream: MediaStream) => void) | null = null;
    targetId: number | null = null;
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

    async startLocalStream(isVideo: boolean = true) {
        const isFront = true;
        // Basic device enumeration logic...
        const devices = await mediaDevices.enumerateDevices() as any[];
        let videoSourceId;
        for (const source of devices) {
            if (source.kind === "videoinput" && source.facing === (isFront ? "user" : "environment")) {
                videoSourceId = source.deviceId;
            }
        }

        const stream = await mediaDevices.getUserMedia({
            audio: true,
            video: isVideo ? {
                facingMode: (isFront ? "user" : "environment"),
                deviceId: videoSourceId,
                frameRate: 30,
            } : false,
        });

        console.log('Local stream obtained. Audio tracks:', stream.getAudioTracks().length, 'Video tracks:', stream.getVideoTracks().length);
        this.localStream = stream;
        return stream;
    }

    async fetchTurnCredentials() {
        try {
            const token = await getAccessToken();
            if (!token) {
                console.log('No auth token, using fallback STUN');
                return;
            }

            console.log('Fetching TURN credentials from:', `${API_PATH}/turn-credentials`);
            const response = await authorizedAxiosRequest<{ iceServers?: any[] }>({
                url: `${API_PATH}/turn-credentials`,
                method: 'GET',
            });

            if (response.data?.iceServers && Array.isArray(response.data.iceServers)) {
                console.warn(`[WebRTC] Fetched ${response.data.iceServers.length} ICE Servers from API`);
                configuration = { iceServers: response.data.iceServers };
            }
        } catch (error: any) {
            console.warn('[WebRTC] Error fetching TURN credentials, using defaults:', error.message);
            // Ensure we have a diverse set of STUN servers and a fallback TURN
            configuration = {
                iceServers: [
                    { urls: 'stun:stun.sipnet.ru:3478' },
                    { urls: 'stun:stun.chathelp.ru:3478' },
                    { urls: 'stun:stun.comtube.ru:3478' },
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
                    // Force our own TURN as a last resort fallback if API fails
                    {
                        urls: 'turn:45.150.9.229:3478',
                        username: 'admin',
                        credential: 'krishna1284radha'
                    }
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
                    this.wsService.send({
                        type: 'candidate',
                        targetId: this.targetId,
                        payload: event.candidate,
                    });
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

    async processOffer(message: any) {
        console.log('Received OFFER, storing as pending...');
        this.pendingOffer = message;
        this.targetId = message.senderId;
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
                this.wsService.send({
                    type: 'answer',
                    targetId: this.targetId,
                    payload: answer,
                });
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
                await this.processOffer(message);
                break;
            case 'answer':
                await this.processAnswer(message);
                break;
            case 'candidate':
                await this.processCandidate(message);
                break;
            case 'hangup':
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
        InCallManager.stop();
        this.remoteStream = null;
        this.targetId = null;
        this.onIceStateChange = null;
        // Notify server/other user if needed via hangup message
    }

    sendHangup() {
        if (this.wsService && this.targetId) {
            this.wsService.send({
                type: 'hangup',
                targetId: this.targetId,
                payload: {},
            });
        }
        this.endCall();
    }
}

export const webRTCService = new WebRTCService();
