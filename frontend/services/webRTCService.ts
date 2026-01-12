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

    setWebSocketService(ws: WebSocketService) {
        this.wsService = ws;
    }

    setOnRemoteStream(callback: (stream: MediaStream) => void) {
        this.onRemoteStream = callback;
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
            if (!token) return;

            const response = await axios.get(`${API_PATH}/turn-credentials`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data && response.data.iceServers) {
                configuration = { iceServers: response.data.iceServers };
            }
        } catch (error) {
            console.log('Using default STUN servers');
        }
    }

    createPeerConnection() {
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        this.remoteCandidates = []; // Reset buffer

        this.peerConnection = new RTCPeerConnection(configuration);

        (this.peerConnection as any).onicecandidate = (event: any) => {
            if (event.candidate && this.wsService && this.targetId) {
                this.wsService.send({
                    type: 'candidate',
                    targetId: this.targetId,
                    payload: event.candidate,
                });
            }
        };

        (this.peerConnection as any).ontrack = (event: any) => {
            // Depending on version, streams might be in event.streams
            // react-native-webrtc sending one stream per track usually
            if (event.streams && event.streams.length > 0) {
                if (this.onRemoteStream) {
                    this.onRemoteStream(event.streams[0]);
                }
            }
        };

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection?.addTrack(track, this.localStream!);
            });
        }
    }

    async startCall(targetId: number) {
        await this.fetchTurnCredentials(); // Get TURN config first
        this.targetId = targetId;
        this.isInitiator = true;
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
        await this.fetchTurnCredentials(); // Get TURN config first
        this.targetId = message.senderId;
        this.isInitiator = false;
        this.createPeerConnection();

        await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(message.payload));
        this.processBufferedCandidates(); // Flush candidates
        const answer = await this.peerConnection!.createAnswer();
        await this.peerConnection!.setLocalDescription(answer);

        if (this.wsService) {
            this.wsService.send({
                type: 'answer',
                targetId: this.targetId,
                payload: answer,
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
        const candidate = new RTCIceCandidate(message.payload);
        if (this.peerConnection && this.peerConnection.remoteDescription) {
            await this.peerConnection.addIceCandidate(candidate);
        } else {
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
        this.targetId = null;
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
