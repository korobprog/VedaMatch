import React from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { getLilaMatch, parseLilaRealtimeEvent } from '../services/lilaGameService';
import {
    applyLilaRealtimeEvent,
    createInitialLilaRealtimeState,
    isLilaRealtimeEventForMatch,
} from '../services/lilaRealtimeSession';
import type { LilaMatchSnapshot, LilaRealtimeConnectionState } from '../types/lila';

type UseLilaMatchSessionResult = {
    snapshot: LilaMatchSnapshot | null;
    connectionState: LilaRealtimeConnectionState;
    recoverSnapshot: () => Promise<void>;
    setInitialSnapshot: (snapshot: LilaMatchSnapshot | null) => void;
};

export const useLilaMatchSession = (matchCode?: string, locale?: string): UseLilaMatchSessionResult => {
    const { addListener } = useWebSocket();
    const [state, setState] = React.useState(() => createInitialLilaRealtimeState());

    const recoverSnapshot = React.useCallback(async () => {
        if (!matchCode) {
            return;
        }
        setState((current) => ({
            ...current,
            connectionState: current.snapshot ? 'reconnecting' : 'connecting',
            requiresRecovery: false,
        }));
        try {
            const snapshot = await getLilaMatch(matchCode, locale);
            setState({
                snapshot,
                connectionState: 'live',
                requiresRecovery: false,
                lastEventType: 'http_recovery',
            });
        } catch {
            setState((current) => ({
                ...current,
                connectionState: 'fallback_polling',
                requiresRecovery: true,
            }));
        }
    }, [locale, matchCode]);

    React.useEffect(() => {
        if (!matchCode) {
            return undefined;
        }
        const unsubscribe = addListener((rawMessage: unknown) => {
            const event = parseLilaRealtimeEvent(rawMessage);
            if (!isLilaRealtimeEventForMatch(event, matchCode)) {
                return;
            }
            setState((current) => applyLilaRealtimeEvent(current, event));
        });
        return unsubscribe;
    }, [addListener, matchCode]);

    React.useEffect(() => {
        if (!state.requiresRecovery) {
            return undefined;
        }
        recoverSnapshot().catch(() => undefined);
        return undefined;
    }, [recoverSnapshot, state.requiresRecovery]);

    const setInitialSnapshot = React.useCallback((snapshot: LilaMatchSnapshot | null) => {
        setState(createInitialLilaRealtimeState(snapshot));
    }, []);

    return {
        snapshot: state.snapshot,
        connectionState: state.connectionState,
        recoverSnapshot,
        setInitialSnapshot,
    };
};
