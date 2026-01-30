import { WS_PATH } from '../config/api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class WebSocketService {
    private socket: WebSocket | null = null;
    private userId: number;
    private onMessageCallback: (message: any) => void;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    private onAuthError?: () => void;

    constructor(userId: number, onMessage: (message: any) => void, onAuthError?: () => void) {
        this.userId = userId;
        this.onMessageCallback = onMessage;
        this.onAuthError = onAuthError;
    }

    async connect() {
        if (this.socket) {
            this.socket.close();
        }

        let token = null;
        try {
            token = await AsyncStorage.getItem('token');
            if (token === 'undefined' || token === 'null') {
                token = null;
            }
        } catch (error) {
            console.warn('[WebSocket] Error retrieving token:', error);
        }

        if (!token) {
            console.warn('[WebSocket] No valid token found, skipping connection');
            return;
        }

        const url = `${WS_PATH}/ws/${this.userId}?token=${token}`;
        console.log(`[WebSocket] Connecting to bridge...`);

        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.log('[WebSocket] Connection established');
            this.reconnectAttempts = 0;
        };

        this.socket.onmessage = (event) => {
            try {
                if (!event.data) return;

                const dataStr = String(event.data);
                if (dataStr === 'undefined' || dataStr === 'null') return;

                const message = JSON.parse(dataStr);
                if (this.onMessageCallback) {
                    this.onMessageCallback(message);
                }
            } catch (error) {
                // Silently handle parse errors to avoid RedBox
                console.warn('[WebSocket] Ignored non-json message');
            }
        };

        this.socket.onclose = (event) => {
            console.log(`[WebSocket] Closed: ${event.reason || 'No reason'}`);
            this.reconnect();
        };

        this.socket.onerror = (error: any) => {
            const errorMsg = error?.message || '';
            console.warn('[WebSocket] Connection error:', errorMsg);

            if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
                console.error('[WebSocket] AUTH_FAILURE: Token expired or invalid');
                if (this.onAuthError) {
                    this.onAuthError();
                }
            }
        };
    }

    private reconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const timeout = Math.pow(2, this.reconnectAttempts) * 1000;
            console.log(`[WebSocket] Reconnecting in ${timeout}ms...`);
            setTimeout(() => this.connect(), timeout);
        } else {
            console.warn('[WebSocket] Max reconnect attempts reached');
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.onclose = null; // Disable auto-reconnect
            this.socket.close();
            this.socket = null;
        }
    }

    sendTypingIndicator(recipientId: number, isTyping: boolean) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const message = {
                type: 'typing',
                senderId: this.userId,
                recipientId,
                isTyping
            };
            this.send(message);
        }
    }

    send(message: any) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        } else {
            console.warn('[WebSocket] Cannot send, socket not open');
        }
    }
}
