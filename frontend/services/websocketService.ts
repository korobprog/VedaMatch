import { WS_PATH } from '../config/api.config';
import { getAccessToken, isOfflineDevAccessToken, refreshAuthTokens } from './authSessionService';
import { reportNetworkFailure } from '../context/networkStatusRuntime';

type AuthRecoverHandler = () => Promise<boolean> | boolean;

let webSocketServiceInstanceSeq = 0;
const activeWebSocketOwners = new Map<number, number>();

export class WebSocketService {
    private socket: WebSocket | null = null;
    private readonly instanceId = ++webSocketServiceInstanceSeq;
    private userId: number;
    private onMessageCallback: (message: any) => void;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 0; // 0 = unlimited reconnect attempts.
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private isDisposed = false;
    private isAuthRecoveryInProgress = false;
    private authRecoveryTriggered = false;
    private connectInFlightPromise: Promise<void> | null = null;
    private reconnectAfterCurrentAttempt = false;
    private lastAuthRecoverAt = 0;
    private reconnectEvents: number[] = [];

    private onAuthError?: AuthRecoverHandler;

    constructor(userId: number, onMessage: (message: any) => void, onAuthError?: AuthRecoverHandler) {
        this.userId = userId;
        this.onMessageCallback = onMessage;
        this.onAuthError = onAuthError;
        this.claimOwnership('constructor');
    }

    private clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private claimOwnership(source: string) {
        const previousOwner = activeWebSocketOwners.get(this.userId);
        activeWebSocketOwners.set(this.userId, this.instanceId);
        console.log(
            `[ws_owner_claimed] user_id=${this.userId} instance=${this.instanceId} previous_instance=${previousOwner ?? 'none'} source=${source}`,
        );
    }

    private hasOwnership() {
        return activeWebSocketOwners.get(this.userId) === this.instanceId;
    }

    private retireIfOwnershipLost(source: string) {
        if (this.hasOwnership()) {
            return false;
        }

        const activeInstance = activeWebSocketOwners.get(this.userId);
        console.log(
            `[ws_owner_skip] user_id=${this.userId} instance=${this.instanceId} active_instance=${activeInstance ?? 'none'} source=${source}`,
        );
        this.isDisposed = true;
        this.clearReconnectTimer();

        if (this.socket) {
            this.socket.onclose = null;
            this.socket.close();
            this.socket = null;
        }

        return true;
    }

    private releaseOwnership(source: string) {
        if (!this.hasOwnership()) {
            return;
        }

        activeWebSocketOwners.delete(this.userId);
        console.log(`[ws_owner_released] user_id=${this.userId} instance=${this.instanceId} source=${source}`);
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

    private scheduleReconnectAfterAuthRecovery(source: string, reason: 'refresh' | 'callback') {
        if (this.retireIfOwnershipLost(`scheduleReconnectAfterAuthRecovery:${source}`)) {
            return;
        }

        this.lastAuthRecoverAt = Date.now();
        this.reconnectAttempts = 0;
        this.authRecoveryTriggered = false;

        if (this.connectInFlightPromise) {
            this.reconnectAfterCurrentAttempt = true;
            console.log(
                `[ws_auth_reconnect_deferred] source=${source} reason=${reason} user_id=${this.userId} instance=${this.instanceId}`,
            );
            console.log('[WebSocket] Auth recovered, reconnect will start after current attempt settles');
            return;
        }

        this.reconnectAfterCurrentAttempt = false;
        console.log(`[ws_auth_reconnect_now] source=${source} reason=${reason} user_id=${this.userId} instance=${this.instanceId}`);
        console.log('[WebSocket] Auth recovered, reconnecting now');

        setTimeout(() => {
            if (this.retireIfOwnershipLost(`authRecoveryReconnect:${source}`)) {
                return;
            }
            if (this.isDisposed || this.isAuthRecoveryInProgress || this.isOpen()) {
                return;
            }
            void this.connect();
        }, 0);
    }

    async connect() {
        if (this.retireIfOwnershipLost('connect')) {
            return;
        }

        if (this.connectInFlightPromise) {
            return this.connectInFlightPromise;
        }

        this.connectInFlightPromise = this.connectInternal();
        try {
            await this.connectInFlightPromise;
        } finally {
            this.connectInFlightPromise = null;
            if (
                this.reconnectAfterCurrentAttempt
                && !this.isDisposed
                && !this.isAuthRecoveryInProgress
                && !this.isOpen()
            ) {
                this.reconnectAfterCurrentAttempt = false;
                console.log(`[ws_auth_reconnect_now] user_id=${this.userId} instance=${this.instanceId}`);
                setTimeout(() => {
                    void this.connect();
                }, 0);
            }
        }
    }

    isOpen() {
        return this.socket?.readyState === WebSocket.OPEN;
    }

    async waitUntilOpen(timeoutMs: number = 4000) {
        const deadline = Date.now() + Math.max(timeoutMs, 250);

        while (!this.isDisposed && Date.now() < deadline) {
            if (this.retireIfOwnershipLost('waitUntilOpen')) {
                return false;
            }

            if (this.isOpen()) {
                return true;
            }

            await this.connect();

            if (this.isOpen()) {
                return true;
            }

            await new Promise(resolve => setTimeout(resolve, 150));
        }

        return this.isOpen();
    }

    private async connectInternal() {
        if (this.retireIfOwnershipLost('connectInternal')) {
            return;
        }

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
        if (isOfflineDevAccessToken(token)) {
            console.log('[WebSocket] Offline DEV token detected, skipping realtime connection');
            this.reconnectAttempts = 0;
            this.clearReconnectTimer();
            return;
        }

        const encodedToken = encodeURIComponent(token);
        const url = `${WS_PATH}/ws/${this.userId}?token=${encodedToken}`;
        console.log(`[ws_connect_attempt] user_id=${this.userId} instance=${this.instanceId} attempt=${this.reconnectAttempts + 1}`);
        console.log('[WebSocket] Connecting to bridge...');

        const socket = new WebSocket(url);
        this.socket = socket;
        let opened = false;

        socket.onopen = () => {
            if (this.socket !== socket) {
                return;
            }
            if (this.retireIfOwnershipLost('socket.onopen')) {
                return;
            }
            console.log(`[WebSocket] Connection established (instance=${this.instanceId})`);
            opened = true;
            this.reconnectAttempts = 0;
            this.authRecoveryTriggered = false;
        };

        socket.onmessage = (event) => {
            if (this.socket !== socket) {
                return;
            }
            if (this.retireIfOwnershipLost('socket.onmessage')) {
                return;
            }
            try {
                if (!event.data) return;

                const dataStr = String(event.data);
                if (dataStr === 'undefined' || dataStr === 'null') return;

                const message = JSON.parse(dataStr);
                if (this.onMessageCallback) {
                    this.onMessageCallback(message);
                }
            } catch {
                // Silently handle parse errors to avoid RedBox
                console.warn('[WebSocket] Ignored non-json message');
            }
        };

        socket.onclose = (event) => {
            if (this.socket !== socket) {
                return;
            }

            this.socket = null;

            if (this.isDisposed) {
                return;
            }

            console.log(
                `[WebSocket] Closed: code=${event.code} reason=${event.reason || 'No reason'} clean=${String(event.wasClean)} opened=${String(opened)} instance=${this.instanceId}`,
            );
            if (this.retireIfOwnershipLost('socket.onclose')) {
                return;
            }
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

        socket.onerror = (error: any) => {
            if (this.socket !== socket) {
                return;
            }
            if (this.retireIfOwnershipLost('socket.onerror')) {
                return;
            }
            const errorMsg = String(error?.message || '');
            console.warn(`[WebSocket] Connection error (instance=${this.instanceId}):`, errorMsg);

            const normalized = errorMsg.toLowerCase();
            if (normalized.includes('401') || normalized.includes('unauthorized')) {
                console.warn('[WebSocket] AUTH_FAILURE: Token expired or invalid');
                void this.handleAuthFailure('ws_error_auth');
                return;
            }

            reportNetworkFailure('ws_reconnect');
        };
    }

    private reconnect() {
        if (this.retireIfOwnershipLost('reconnect')) {
            return;
        }
        if (this.isDisposed || this.isAuthRecoveryInProgress) {
            return;
        }
        this.clearReconnectTimer();

        if (this.maxReconnectAttempts === 0 || this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            reportNetworkFailure('ws_reconnect');
            const cappedAttempt = Math.min(this.reconnectAttempts, 6);
            const backoffMs = Math.min(Math.pow(2, cappedAttempt) * 1000, 30000);
            const jitterMs = Math.floor(Math.random() * 700);
            const recoverCooldownMs = 1500;
            const sinceAuthRecover = Date.now() - this.lastAuthRecoverAt;
            const timeoutFloor = sinceAuthRecover < recoverCooldownMs ? (recoverCooldownMs - sinceAuthRecover) : 0;
            const timeout = Math.max(backoffMs + jitterMs, timeoutFloor);
            console.log(`[ws_reconnect_backoff_ms] value=${timeout} attempt=${this.reconnectAttempts}`);
            this.reconnectEvents.push(Date.now());
            const windowStart = Date.now() - 30000;
            this.reconnectEvents = this.reconnectEvents.filter((ts) => ts >= windowStart);
            if (this.reconnectEvents.length >= 6) {
                console.warn(
                    `[ws_reconnect_storm_detected] user_id=${this.userId} instance=${this.instanceId} count=${this.reconnectEvents.length}`,
                );
            }
            console.log(`[WebSocket] Reconnecting in ${timeout}ms... (instance=${this.instanceId})`);
            this.reconnectTimer = setTimeout(() => {
                this.reconnectTimer = null;
                void this.connect();
            }, timeout);
        } else {
            console.warn('[WebSocket] Max reconnect attempts reached');
        }
    }

    private async handleAuthFailure(source: string) {
        if (this.retireIfOwnershipLost(`handleAuthFailure:${source}`)) {
            return;
        }
        if (this.isDisposed || this.isAuthRecoveryInProgress) {
            return;
        }

        this.authRecoveryTriggered = true;
        this.isAuthRecoveryInProgress = true;
        this.reconnectAfterCurrentAttempt = false;
        this.clearReconnectTimer();

        if (this.socket) {
            this.socket.onclose = null;
            this.socket.close();
            this.socket = null;
        }

        try {
            // Шаг 1: Автоматический refresh токена
            console.log(`[ws_auth_refresh] source=${source} user_id=${this.userId}`);
            const refreshed = await refreshAuthTokens();
            
            if (refreshed?.accessToken) {
                console.log(`[ws_auth_refresh_success] source=${source} user_id=${this.userId}`);
                this.scheduleReconnectAfterAuthRecovery(source, 'refresh');
                return;
            }

            console.warn('[WebSocket] Token refresh failed, no refresh token available');

            // Шаг 2: Если refresh не сработал, пробуем onAuthError callback
            if (!this.onAuthError) {
                return;
            }

            const recovered = await this.onAuthError();
            if (recovered && !this.isDisposed) {
                console.log(`[ws_auth_recover] source=${source} user_id=${this.userId}`);
                this.scheduleReconnectAfterAuthRecovery(source, 'callback');
            }
        } catch (error) {
            console.warn('[WebSocket] Auth recovery failed:', error);
        } finally {
            this.isAuthRecoveryInProgress = false;
        }
    }

    disconnect() {
        this.isDisposed = true;
        this.reconnectAfterCurrentAttempt = false;
        this.clearReconnectTimer();

        if (this.socket) {
            this.socket.onclose = null; // Disable auto-reconnect
            this.socket.close();
            this.socket = null;
        }

        this.releaseOwnership('disconnect');
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
        if (this.retireIfOwnershipLost('send')) {
            return;
        }
        if (this.isOpen() && this.socket) {
            this.socket.send(JSON.stringify(message));
        } else {
            console.warn('[WebSocket] Cannot send, socket not open');
        }
    }
}
