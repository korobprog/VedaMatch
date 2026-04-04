import {
    applyLilaRealtimeEvent,
    createInitialLilaRealtimeState,
    isLilaRealtimeEventForMatch,
} from '../../services/lilaRealtimeSession';
import type { LilaMatchSnapshot, LilaRealtimeEvent } from '../../types/lila';

const buildSnapshot = (overrides: Partial<LilaMatchSnapshot> = {}): LilaMatchSnapshot => ({
    match: {
        code: 'match-1',
        mode: 'duel',
        status: 'active',
    },
    rounds: [],
    players: [7, 8],
    queueEntries: [],
    locale: 'ru',
    currentRound: null,
    currentQuestion: null,
    readyUserIds: [],
    scoreboard: [],
    eliminatedUserIds: [],
    answeredUserIds: [],
    phase: 'question_open',
    stateVersion: 3,
    serverTime: '2026-04-04T00:00:00Z',
    resolution: null,
    ...overrides,
});

describe('isLilaRealtimeEventForMatch', () => {
    it('matches event by match code', () => {
        expect(isLilaRealtimeEventForMatch({ type: 'game_round_started', matchCode: 'match-1' }, 'match-1')).toBe(true);
        expect(isLilaRealtimeEventForMatch({ type: 'game_round_started', matchCode: 'match-2' }, 'match-1')).toBe(false);
    });
});

describe('applyLilaRealtimeEvent', () => {
    it('replaces snapshot when payload carries a newer authoritative snapshot', () => {
        const current = createInitialLilaRealtimeState(buildSnapshot());
        const incomingSnapshot = buildSnapshot({
            phase: 'round_resolved',
            stateVersion: 4,
        });
        const event: LilaRealtimeEvent = {
            type: 'game_round_resolved',
            matchCode: 'match-1',
            stateVersion: 4,
            payload: {
                snapshot: incomingSnapshot,
            },
        };

        const next = applyLilaRealtimeEvent(current, event);
        expect(next.snapshot?.stateVersion).toBe(4);
        expect(next.snapshot?.phase).toBe('round_resolved');
        expect(next.connectionState).toBe('live');
        expect(next.requiresRecovery).toBe(false);
    });

    it('marks recovery when there is a version gap without a snapshot', () => {
        const current = createInitialLilaRealtimeState(buildSnapshot());
        const event: LilaRealtimeEvent = {
            type: 'game_answer_accepted',
            matchCode: 'match-1',
            stateVersion: 9,
            payload: {
                answeredUserId: 7,
            },
        };

        const next = applyLilaRealtimeEvent(current, event);
        expect(next.requiresRecovery).toBe(true);
        expect(next.connectionState).toBe('reconnecting');
    });

    it('applies lightweight incremental updates when version is contiguous', () => {
        const current = createInitialLilaRealtimeState(buildSnapshot({
            readyUserIds: [7],
            answeredUserIds: [],
        }));
        const event: LilaRealtimeEvent = {
            type: 'game_answer_accepted',
            matchCode: 'match-1',
            stateVersion: 4,
            serverTime: '2026-04-04T00:00:02Z',
            payload: {
                answeredUserId: 8,
            },
        };

        const next = applyLilaRealtimeEvent(current, event);
        expect(next.snapshot?.answeredUserIds).toEqual([8]);
        expect(next.snapshot?.phase).toBe('answer_locked');
        expect(next.snapshot?.stateVersion).toBe(4);
    });

    it('ignores stale events', () => {
        const current = createInitialLilaRealtimeState(buildSnapshot({
            stateVersion: 5,
        }));
        const event: LilaRealtimeEvent = {
            type: 'game_answer_accepted',
            matchCode: 'match-1',
            stateVersion: 4,
            payload: {
                answeredUserId: 8,
            },
        };

        const next = applyLilaRealtimeEvent(current, event);
        expect(next.snapshot?.stateVersion).toBe(5);
        expect(next.snapshot?.answeredUserIds).toEqual([]);
    });
});
