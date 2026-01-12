import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    MediaStream,
    mediaDevices,
} from 'react-native-webrtc';
import { WebSocketService } from './websocketService';

const configuration = {
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

    setWebSocketService(ws: WebSocketService) {
        this.wsService = ws;
    }

    setOnRemoteStream(callback: (stream: MediaStream) => void) {
        this.onRemoteStream = callback;
    }

    async startLocalStream(isVideo: boolean = true) {
        const isFront = true;
        const sourceInfos = await mediaDevices.enumerateDevices();
        let videoSourceId;
        for (const source of sourceInfos) {
            if (source.kind === "videoinput" && source.facing === (isFront ? "user" : "environment")) {
                videoSourceId = source.deviceId;
            }
        }

        const stream = await mediaDevices.getUserMedia({
            audio: true,
            video: isVideo ? {
                mandatory: {
                    minWidth: 500,
                    minHeight: 300,
                    minFrameRate: 30,
                },
                facingMode: (isFront ? "user" : "environment"),
                optional: videoSourceId ? [{ sourceId: videoSourceId }] : [],
            } : false,
        });

        this.localStream = stream;
        return stream;
    }

    createPeerConnection() {
        if (this.peerConnection) {
            this.peerConnection.close();
        }

        this.peerConnection = new RTCPeerConnection(configuration);

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.wsService && this.targetId) {
                this.wsService.send({
                    type: 'candidate',
                    targetId: this.targetId,
                    payload: event.candidate,
                });
            }
        };

        this.peerConnection.ontrack = (event) => {
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
        this.targetId = message.senderId;
        this.isInitiator = false;
        this.createPeerConnection();

        await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(message.payload));
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
        }
    }

    async processCandidate(message: any) {
        if (this.peerConnection && message.payload) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(message.payload));
        }
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
