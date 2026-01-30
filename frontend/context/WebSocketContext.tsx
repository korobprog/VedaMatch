import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useUser } from './UserContext';
import { WebSocketService } from '../services/websocketService';
import { webRTCService } from '../services/webRTCService';

interface WebSocketContextType {
    addListener: (listener: (msg: any) => void) => () => void;
    sendTypingIndicator: (recipientId: number, isTyping: boolean) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout } = useUser();
    const wsServiceRef = useRef<WebSocketService | null>(null);
    const listenersRef = useRef<Set<(msg: any) => void>>(new Set());

    useEffect(() => {
        if (user?.ID) {
            wsServiceRef.current = new WebSocketService(
                user.ID,
                (msg) => {
                    if (['offer', 'answer', 'candidate', 'hangup'].includes(msg.type)) {
                        webRTCService.handleSignalingMessage(msg);
                    }
                    listenersRef.current.forEach(listener => listener(msg));
                },
                () => {
                    console.error('[WebSocketContext] Auth failure detected, logging out...');
                    logout();
                }
            );
            wsServiceRef.current.connect();
            webRTCService.setWebSocketService(wsServiceRef.current);
        }

        return () => {
            if (wsServiceRef.current) {
                wsServiceRef.current.disconnect();
                wsServiceRef.current = null;
            }
        };
    }, [user?.ID]);

    const addListener = (listener: (msg: any) => void) => {
        listenersRef.current.add(listener);
        return () => {
            listenersRef.current.delete(listener);
        };
    };

    const sendTypingIndicator = (recipientId: number, isTyping: boolean) => {
        if (wsServiceRef.current) {
            wsServiceRef.current.sendTypingIndicator(recipientId, isTyping);
        }
    };

    return (
        <WebSocketContext.Provider value={{ addListener, sendTypingIndicator }}>
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
