import { WS_PATH } from '../config/api.config';
import { getAccessToken, refreshAuthTokens } from './authSessionService';

type AuthRecoverHandler = () => Promise<boolean> | boolean;

export class WebSocketService {
    private socket: WebSocket | null = null;
    private userId: number;
    private onMessageCallback: (message: any) => void;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 0; // 0 = unlimited reconnect attempts.
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private isDisposed = false;
    private isAuthRecoveryInProgress = false;
    private authRecoveryTriggered = false;

    private onAuthError?: AuthRecoverHandler;

    constructor(userId: number, onMessage: (message: any) => void, onAuthError?: AuthRecoverHandler) {
        this.userId = userId;
        this.onMessageCallback = onMessage;
        this.onAuthError = onAuthError;
    }

    private clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private async resolveSocketToken(): Promise<string | null> {
        const accessToken = await getAccessToken();
        if (accessToken && accessToken !== 'undefined' && accessToken !== 'null') {
            return accessToken;
        }

        const refreshed = await refreshAuthTokens();
        if (!refreshed?.accessToken) {
            return null;
        }
        return refreshed.accessToken;
    }

    async connect() {
        if (this.isDisposed || this.isAuthRecoveryInProgress) {
            return;
        }

        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            return;
        }

        this.clearReconnectTimer();

        const token = await this.resolveSocketToken();
        if (!token) {
            console.warn('[WebSocket] No valid token found, cannot connect');
            await this.handleAuthFailure('missing_token');
            return;
        }

        const url = `${WS_PATH}/ws/${this.userId}?token=${token}`;
        console.log('[WebSocket] Connecting to bridge...');

        this.socket = new WebSocket(url);
        let opened = false;

        this.socket.onopen = () => {
            console.log('[WebSocket] Connection established');
            opened = true;
            this.reconnectAttempts = 0;
            this.authRecoveryTriggered = false;
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
            this.socket = null;

            if (this.isDisposed) {
                return;
            }

            console.log(`[WebSocket] Closed: ${event.reason || 'No reason'}`);
            if (this.isAuthRecoveryInProgress || this.authRecoveryTriggered) {
                return;
            }

            const reason = String(event.reason || '').toLowerCase();
            const looksUnauthorized = event.code === 1008 || event.code === 4401 || reason.includes('401') || reason.includes('unauthorized');
            if (looksUnauthorized || (!opened && reason.includes('token'))) {
                void this.handleAuthFailure('ws_close_auth');
                return;
            }

            this.reconnect();
        };

        this.socket.onerror = (error: any) => {
            const errorMsg = String(error?.message || '');
            console.warn('[WebSocket] Connection error:', errorMsg);

            const normalized = errorMsg.toLowerCase();
            if (normalized.includes('401') || normalized.includes('unauthorized')) {
                console.error('[WebSocket] AUTH_FAILURE: Token expired or invalid');
                void this.handleAuthFailure('ws_error_auth');
            }
        };
    }

    private reconnect() {
        if (this.isDisposed || this.isAuthRecoveryInProgress) {
            return;
        }
        this.clearReconnectTimer();

        if (this.maxReconnectAttempts === 0 || this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const cappedAttempt = Math.min(this.reconnectAttempts, 6);
            const backoffMs = Math.min(Math.pow(2, cappedAttempt) * 1000, 30000);
            const jitterMs = Math.floor(Math.random() * 700);
            const timeout = backoffMs + jitterMs;
            console.log(`[WebSocket] Reconnecting in ${timeout}ms...`);
            this.reconnectTimer = setTimeout(() => {
                this.reconnectTimer = null;
                void this.connect();
            }, timeout);
        } else {
            console.warn('[WebSocket] Max reconnect attempts reached');
        }
    }

    private async handleAuthFailure(source: string) {
        if (this.isDisposed || this.isAuthRecoveryInProgress) {
            return;
        }

        this.authRecoveryTriggered = true;
        this.isAuthRecoveryInProgress = true;
        this.clearReconnectTimer();

        if (this.socket) {
            this.socket.onclose = null;
            this.socket.close();
            this.socket = null;
        }

        try {
            if (!this.onAuthError) {
                return;
            }

            const recovered = await this.onAuthError();
            if (recovered && !this.isDisposed) {
                console.log(`[WebSocket] Auth recovered (${source}), reconnecting...`);
                this.reconnectAttempts = 0;
                this.authRecoveryTriggered = false;
                await this.connect();
            }
        } catch (error) {
            console.warn('[WebSocket] Auth recovery failed:', error);
        } finally {
            this.isAuthRecoveryInProgress = false;
        }
    }

    disconnect() {
        this.isDisposed = true;
        this.clearReconnectTimer();

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
