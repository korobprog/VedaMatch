import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    MediaStream,
    mediaDevices,
} from 'react-native-webrtc';
import { WebSocketService } from './websocketService';
import { API_PATH } from '../config/api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import InCallManager from 'react-native-incall-manager';

let configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
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
                width: { min: 500 },
                height: { min: 300 },
                frameRate: { min: 30 },
                facingMode: (isFront ? "user" : "environment"),
                deviceId: videoSourceId,
            } : false,
        });

        this.localStream = stream;
        return stream;
    }

    async fetchTurnCredentials() {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.log('No auth token, using fallback STUN');
                return;
            }

            console.log('Fetching TURN credentials from:', `${API_PATH}/turn-credentials`);
            const response = await axios.get(`${API_PATH}/turn-credentials`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data && response.data.iceServers) {
                console.log('Successfully fetched ICE Servers:', response.data.iceServers.length);
                configuration = { iceServers: response.data.iceServers };
            }
        } catch (error: any) {
            console.warn('Error fetching TURN credentials, using defaults:', error.message);
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
            console.log('Received remote track:', event.track.kind, 'Stream ID:', event.streams?.[0]?.id);

            // If the event already provides a stream, use it as it's more reliable
            if (event.streams && event.streams[0]) {
                this.remoteStream = event.streams[0];
            } else if (this.remoteStream && event.track) {
                // Otherwise add to our manual stream
                this.remoteStream.addTrack(event.track);
            }

            // Trigger callback with the latest stream object
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
            console.log('Adding local tracks to PeerConnection');
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

        const offer = await this.peerConnection!.createOffer();
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

            const answer = await this.peerConnection!.createAnswer();
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
        console.log('Processing remote candidate', this.debugRemoteCandidates);
        const candidate = new RTCIceCandidate(message.payload);
        if (this.onIceStateChange) {
            const state = this.peerConnection?.iceConnectionState || 'active';
            this.onIceStateChange(`${state} (L:${this.debugLocalCandidates} R:${this.debugRemoteCandidates})`);
        }

        if (this.peerConnection && this.peerConnection.remoteDescription) {
            try {
                await this.peerConnection.addIceCandidate(candidate);
                console.log('ICE candidate added successfully');
            } catch (e) {
                console.error('Error adding ICE candidate:', e);
            }
        } else {
            console.log('Buffering ICE candidate (no remote description yet)');
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
