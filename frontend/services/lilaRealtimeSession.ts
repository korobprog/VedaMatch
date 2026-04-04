import type {
    LilaMatchPhase,
    LilaMatchSnapshot,
    LilaRealtimeConnectionState,
    LilaRealtimeEvent,
} from '../types/lila';

export type LilaRealtimeState = {
    snapshot: LilaMatchSnapshot | null;
    connectionState: LilaRealtimeConnectionState;
    requiresRecovery: boolean;
    lastEventType?: string;
};

const phaseFromEventType = (eventType: string, currentPhase: LilaMatchPhase): LilaMatchPhase => {
    switch (eventType) {
    case 'game_round_started':
        return currentPhase === 'lobby' ? 'round_intro' : 'question_open';
    case 'game_answer_accepted':
        return 'answer_locked';
    case 'game_round_resolved':
        return 'round_resolved';
    case 'game_match_finished':
        return 'match_finished';
    case 'game_match_state_changed':
        return currentPhase;
    default:
        return currentPhase;
    }
};

export const isLilaRealtimeEventForMatch = (event: LilaRealtimeEvent | null | undefined, matchCode?: string | null): boolean => {
    if (!event || !matchCode) {
        return false;
    }
    return String(event.matchCode || '').trim() === String(matchCode || '').trim();
};

export const applyLilaRealtimeEvent = (
    current: LilaRealtimeState,
    event: LilaRealtimeEvent | null,
): LilaRealtimeState => {
    if (!event) {
        return current;
    }

    const incomingVersion = Number(event.stateVersion || 0);
    const currentVersion = Number(current.snapshot?.stateVersion || 0);
    const nextSnapshot = event.payload?.snapshot || null;

    if (incomingVersion > 0 && currentVersion > 0 && incomingVersion < currentVersion) {
        return {
            ...current,
            lastEventType: event.type,
        };
    }

    if (nextSnapshot) {
        return {
            snapshot: incomingVersion >= currentVersion ? nextSnapshot : current.snapshot,
            connectionState: 'live',
            requiresRecovery: false,
            lastEventType: event.type,
        };
    }

    if (!current.snapshot) {
        return {
            ...current,
            connectionState: 'reconnecting',
            requiresRecovery: true,
            lastEventType: event.type,
        };
    }

    if (incomingVersion > 0 && currentVersion > 0 && incomingVersion > currentVersion + 1) {
        return {
            ...current,
            connectionState: 'reconnecting',
            requiresRecovery: true,
            lastEventType: event.type,
        };
    }

    const answeredUserId = Number(event.payload?.answeredUserId || 0);
    const readyUserId = Number(event.payload?.readyUserId || 0);
    const winnerUserId = Number(event.payload?.winnerUserId || 0);
    const currentAnswered = current.snapshot.answeredUserIds || [];
    const currentReady = current.snapshot.readyUserIds || [];

    return {
        snapshot: {
            ...current.snapshot,
            phase: phaseFromEventType(event.type, current.snapshot.phase),
            stateVersion: incomingVersion || current.snapshot.stateVersion,
            serverTime: event.serverTime || current.snapshot.serverTime,
            answeredUserIds: answeredUserId && !currentAnswered.includes(answeredUserId)
                ? [...currentAnswered, answeredUserId]
                : currentAnswered,
            readyUserIds: readyUserId && !currentReady.includes(readyUserId)
                ? [...currentReady, readyUserId]
                : currentReady,
            match: winnerUserId
                ? {
                    ...current.snapshot.match,
                    winnerUserId,
                    status: event.type === 'game_match_finished' ? 'finished' : current.snapshot.match.status,
                }
                : {
                    ...current.snapshot.match,
                    status: event.type === 'game_match_finished' ? 'finished' : current.snapshot.match.status,
                },
        },
        connectionState: 'live',
        requiresRecovery: false,
        lastEventType: event.type,
    };
};

export const createInitialLilaRealtimeState = (snapshot: LilaMatchSnapshot | null = null): LilaRealtimeState => ({
    snapshot,
    connectionState: snapshot ? 'live' : 'idle',
    requiresRecovery: false,
});
