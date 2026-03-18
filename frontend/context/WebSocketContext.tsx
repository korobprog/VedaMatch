import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useUser } from './UserContext';
import { WebSocketService } from '../services/websocketService';
import { webRTCService } from '../services/webRTCService';
import { refreshAuthTokens } from '../services/authSessionService';

interface WebSocketContextType {
    addListener: (listener: (msg: any) => void) => () => void;
    sendTypingIndicator: (recipientId: number, isTyping: boolean) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout } = useUser();
    const wsServiceRef = useRef<WebSocketService | null>(null);
    const listenersRef = useRef<Set<(msg: any) => void>>(new Set());
    const logoutRef = useRef(logout);
    const isInitializingRef = useRef(false);

    useEffect(() => {
        logoutRef.current = logout;
    }, [logout]);

    useEffect(() => {
        let effectService: WebSocketService | null = null;

        if (user?.ID) {
            if (isInitializingRef.current) {
                return;
            }
            isInitializingRef.current = true;

            if (wsServiceRef.current) {
                wsServiceRef.current.disconnect();
                wsServiceRef.current = null;
            }

            const wsService = new WebSocketService(
                user.ID,
                (msg) => {
                    if (['offer', 'answer', 'candidate', 'hangup', 'room_offer', 'room_answer', 'room_candidate', 'room_hangup'].includes(msg.type)) {
                        webRTCService.handleSignalingMessage(msg);
                    }
                    listenersRef.current.forEach(listener => listener(msg));
                },
                async () => {
                    const refreshed = await refreshAuthTokens();
                    if (refreshed?.accessToken) {
                        console.log('[WebSocketContext] WS auth recovered via refresh');
                        return true;
                    }

                    console.warn('[WebSocketContext] Auth refresh failed, logging out...');
                    await logoutRef.current();
                    return false;
                }
            );
            effectService = wsService;
            wsServiceRef.current = wsService;
            void wsService.connect();
            webRTCService.setWebSocketService(wsService);
            isInitializingRef.current = false;
        } else if (wsServiceRef.current) {
            wsServiceRef.current.disconnect();
            wsServiceRef.current = null;
        }

        return () => {
            isInitializingRef.current = false;
            if (effectService) {
                effectService.disconnect();
                if (wsServiceRef.current === effectService) {
                    wsServiceRef.current = null;
                }
            }
        };
    }, [user?.ID]);

    const addListener = useCallback((listener: (msg: any) => void) => {
        listenersRef.current.add(listener);
        return () => {
            listenersRef.current.delete(listener);
        };
    }, []);

    const sendTypingIndicator = useCallback((recipientId: number, isTyping: boolean) => {
        if (wsServiceRef.current) {
            wsServiceRef.current.sendTypingIndicator(recipientId, isTyping);
        }
    }, []);

    const contextValue = useMemo(
        () => ({ addListener, sendTypingIndicator }),
        [addListener, sendTypingIndicator],
    );

    return (
        <WebSocketContext.Provider value={contextValue}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};
