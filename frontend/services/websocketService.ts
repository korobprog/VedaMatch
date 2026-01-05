import { WS_PATH } from '../config/api.config';

export class WebSocketService {
    private socket: WebSocket | null = null;
    private userId: number;
    private onMessageCallback: (message: any) => void;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    constructor(userId: number, onMessage: (message: any) => void) {
        this.userId = userId;
        this.onMessageCallback = onMessage;
    }

    connect() {
        if (this.socket) {
            this.socket.close();
        }

        const url = `${WS_PATH}/ws/${this.userId}`;
        console.log(`[WebSocket] Connecting to ${url}`);

        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
            console.log('[WebSocket] Connected');
            this.reconnectAttempts = 0;
        };

        this.socket.onmessage = (event) => {
            try {
                if (event.data === 'undefined') {
                    console.warn('[WebSocket] Received "undefined" string as message, ignoring.');
                    return;
                }
                const message = JSON.parse(event.data);
                this.onMessageCallback(message);
            } catch (error) {
                console.error('[WebSocket] Error parsing message:', error);
                console.log('Raw message data:', event.data);
            }
        };

        this.socket.onclose = (event) => {
            console.log(`[WebSocket] Disconnected: ${event.reason}`);
            this.reconnect();
        };

        this.socket.onerror = (error) => {
            console.error('[WebSocket] Error', error);
        };
    }

    private reconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const timeout = Math.pow(2, this.reconnectAttempts) * 1000;
            console.log(`[WebSocket] Reconnecting in ${timeout}ms...`);
            setTimeout(() => this.connect(), timeout);
        } else {
            console.error('[WebSocket] Max reconnect attempts reached');
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
            this.socket.send(JSON.stringify(message));
        }
    }
}
