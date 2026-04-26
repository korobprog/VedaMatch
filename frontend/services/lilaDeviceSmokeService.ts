import type {
    LilaAnswerSubmissionResponse,
    LilaMatchRecord,
    LilaMatchScoreEntry,
    LilaMatchSnapshot,
    LilaMode,
    LilaQuestionView,
    LilaQueueEntry,
    LilaReadyLobbyResponse,
    LilaRoundResolution,
    LilaRoundSnapshot,
} from '../types/lila';

type SmokeStage = 'lobby' | 'active' | 'finished';

type SmokeMatchState = {
    code: string;
    locale: string;
    mode: LilaMode;
    stage: SmokeStage;
    stateVersion: number;
    userId: number;
};

const DEVICE_SMOKE_PREFIX = 'dev-smoke-';
const smokeMatches = new Map<string, SmokeMatchState>();

const makeTimestamp = (offsetMs = 0): string => new Date(Date.now() + offsetMs).toISOString();

const buildPlayers = (mode: LilaMode, userId: number): number[] => {
    if (mode === 'sabha') {
        return [userId, userId + 1, userId + 2, userId + 3];
    }
    if (mode === 'survival') {
        return [userId, userId + 1, userId + 2, userId + 3, userId + 4, userId + 5];
    }
    return [userId, userId + 1];
};

const buildQueueEntries = (mode: LilaMode, players: number[], stage: SmokeStage, code: string): LilaQueueEntry[] => (
    players.map((playerId, index) => ({
        id: index + 1,
        userId: playerId,
        mode,
        status: stage === 'lobby' ? (playerId === players[0] ? 'ready' : 'matched') : 'ready',
        teamKey: mode === 'sabha' ? `team_${index % 2 + 1}` : undefined,
        location: mode === 'survival' ? 'kurukshetra' : mode === 'sabha' ? 'ayodhya' : 'vrindavan',
        joinedAt: makeTimestamp(-120000),
        readyAt: stage === 'lobby' && playerId !== players[0] ? null : makeTimestamp(-60000),
        matchCode: code,
    }))
);

const buildScoreboard = (mode: LilaMode, players: number[], userId: number, stage: SmokeStage): LilaMatchScoreEntry[] => {
    if (mode === 'sabha') {
        return players.map((playerId, index) => ({
            userId: playerId,
            score: stage === 'finished' ? (index % 2 === 0 ? 24 - index : 17 - index) : index % 2 === 0 ? 8 : 6,
            isReady: true,
            isEliminated: false,
            scoreDelta: stage === 'finished' ? (index % 2 === 0 ? 8 : -2) : 0,
            streak: playerId === userId ? 2 : 1,
            teamKey: `team_${index % 2 + 1}`,
        }));
    }
    if (mode === 'survival') {
        return players.map((playerId, index) => ({
            userId: playerId,
            score: stage === 'finished' ? Math.max(0, 30 - index * 3) : Math.max(0, 10 - index),
            isReady: true,
            isEliminated: stage === 'finished' ? index > 2 : index > 4,
            scoreDelta: stage === 'finished' ? Math.max(0, 6 - index) : 0,
            streak: playerId === userId ? 3 : 1,
        }));
    }
    return players.map((playerId, index) => ({
        userId: playerId,
        score: stage === 'finished' ? (playerId === userId ? 18 : 11) : index === 0 ? 6 : 5,
        isReady: true,
        isEliminated: false,
        scoreDelta: stage === 'finished' ? (playerId === userId ? 7 : -4) : 0,
        streak: playerId === userId ? 2 : 0,
    }));
};

const buildQuestion = (mode: LilaMode): LilaQuestionView => {
    if (mode === 'survival') {
        return {
            id: 9003,
            slug: 'dev-smoke-ordering',
            type: 'ordering',
            category: 'itihasa_gyan',
            difficulty: 'rajas',
            prompt: 'Расставьте этапы матча в правильном порядке.',
            options: ['Лобби', 'Вопрос', 'Отсечка', 'Награды'],
            explanation: 'Сначала лобби, затем открывается вопрос, потом срабатывает отсечка и после этого выдаются награды.',
            assetUrl: '',
            assetKind: '',
            allowedModes: ['survival'],
        };
    }
    return {
        id: mode === 'sabha' ? 9002 : 9001,
        slug: mode === 'sabha' ? 'dev-smoke-sabha' : 'dev-smoke-duel',
        type: mode === 'sabha' ? 'image_choice' : 'single_choice',
        category: 'bhakti_ras',
        difficulty: 'sattva',
        prompt: mode === 'sabha'
            ? 'Какой формат лучше всего описывает совместное решение в сабхе?'
            : 'Что должно происходить сразу после авторитетного resolve раунда?',
        options: mode === 'sabha'
            ? ['Общий вклад команды', 'Случайный итог', 'Только личный таймер', 'Пустой экран']
            : ['Показ правильного ответа', 'Новый loading без результата', 'Сброс матча', 'Выход в меню'],
        explanation: mode === 'sabha'
            ? 'Сабха должна показывать вклад команды, а не только личный ответ.'
            : 'После resolve игрок должен увидеть правильный ответ, score delta и обновленный счет.',
        assetUrl: '',
        assetKind: '',
        allowedModes: mode === 'sabha' ? ['sabha'] : ['duel'],
    };
};

const buildRound = (stage: SmokeStage, mode: LilaMode): LilaRoundSnapshot => {
    const startedAt = makeTimestamp(-10000);
    const endsAt = makeTimestamp(15000);
    return {
        id: mode === 'sabha' ? 4202 : mode === 'survival' ? 4203 : 4201,
        number: 1,
        status: stage === 'finished' ? 'resolved' : stage === 'active' ? 'open' : 'pending',
        questionId: stage === 'lobby' ? null : mode === 'sabha' ? 9002 : mode === 'survival' ? 9003 : 9001,
        startedAt,
        introEndsAt: makeTimestamp(4000),
        endsAt,
        resolvedAt: stage === 'finished' ? makeTimestamp(-2000) : null,
        revealEndsAt: stage === 'finished' ? makeTimestamp(12000) : null,
        durationMs: 20000,
        bonusWindowMs: 4000,
        lockInAt: makeTimestamp(12000),
    };
};

const buildResolution = (mode: LilaMode): LilaRoundResolution => ({
    correctAnswer: mode === 'survival'
        ? 'Лобби -> Вопрос -> Отсечка -> Награды'
        : mode === 'sabha'
            ? 'Общий вклад команды'
            : 'Показ правильного ответа',
    scoreDelta: mode === 'sabha' ? 8 : 7,
    roundOutcome: 'correct',
    momentumDelta: mode === 'survival' ? 3 : 2,
    tempoBonus: mode === 'duel' ? 2 : 1,
    streak: mode === 'survival' ? 3 : 2,
});

const buildMatchRecord = (state: SmokeMatchState, players: number[]): LilaMatchRecord => ({
    code: state.code,
    mode: state.mode,
    status: state.stage === 'lobby' ? 'lobby' : state.stage === 'active' ? 'active' : 'finished',
    lobbyStartedAt: makeTimestamp(-60000),
    startedAt: state.stage === 'lobby' ? null : makeTimestamp(-25000),
    finishedAt: state.stage === 'finished' ? makeTimestamp(-1000) : null,
    winnerUserId: state.stage === 'finished' ? state.userId : null,
    winningTeamKey: state.stage === 'finished' && state.mode === 'sabha' ? 'team_1' : undefined,
    roundCount: state.mode === 'survival' ? 6 : 3,
    currentRound: 1,
});

const buildSnapshot = (state: SmokeMatchState): LilaMatchSnapshot => {
    const players = buildPlayers(state.mode, state.userId);
    const currentRound = buildRound(state.stage, state.mode);
    return {
        match: buildMatchRecord(state, players),
        rounds: [currentRound],
        players,
        queueEntries: buildQueueEntries(state.mode, players, state.stage, state.code),
        locale: state.locale,
        currentRound,
        currentQuestion: state.stage === 'lobby' ? null : buildQuestion(state.mode),
        readyUserIds: state.stage === 'lobby' ? [state.userId] : players,
        scoreboard: buildScoreboard(state.mode, players, state.userId, state.stage),
        eliminatedUserIds: state.mode === 'survival' && state.stage === 'finished' ? players.slice(3) : [],
        answeredUserIds: state.stage === 'finished' ? [state.userId] : [],
        phase: state.stage === 'lobby' ? 'lobby' : state.stage === 'active' ? 'question_open' : 'match_finished',
        stateVersion: state.stateVersion,
        serverTime: makeTimestamp(),
        phaseStartedAt: makeTimestamp(-5000),
        nextPhaseAt: state.stage === 'finished' ? makeTimestamp(12000) : makeTimestamp(15000),
        resolution: state.stage === 'finished' ? buildResolution(state.mode) : null,
    };
};

export const isLilaDeviceSmokeMatch = (matchCode?: string | null): boolean => (
    typeof matchCode === 'string' && matchCode.startsWith(DEVICE_SMOKE_PREFIX)
);

export const createLilaDeviceSmokeMatch = (mode: LilaMode, locale: string, userId?: number | null): string => {
    const code = `${DEVICE_SMOKE_PREFIX}${mode}-${Date.now()}`;
    smokeMatches.set(code, {
        code,
        locale,
        mode,
        stage: 'lobby',
        stateVersion: 1,
        userId: Number(userId || 0) || 1,
    });
    return code;
};

export const getLilaDeviceSmokeSnapshot = (matchCode: string, locale: string): LilaMatchSnapshot | null => {
    const state = smokeMatches.get(matchCode);
    if (!state) {
        return null;
    }
    if (state.locale !== locale) {
        state.locale = locale;
    }
    return buildSnapshot(state);
};

export const advanceLilaDeviceSmokeLobby = (matchCode: string): LilaReadyLobbyResponse | null => {
    const state = smokeMatches.get(matchCode);
    if (!state) {
        return null;
    }
    state.stage = 'active';
    state.stateVersion += 1;
    return {
        match: buildSnapshot(state).match,
    };
};

export const completeLilaDeviceSmokeRound = (matchCode: string): LilaAnswerSubmissionResponse | null => {
    const state = smokeMatches.get(matchCode);
    if (!state) {
        return null;
    }
    state.stage = 'finished';
    state.stateVersion += 1;
    return {
        answer: {
            userId: state.userId,
            isCorrect: true,
            scoreDelta: state.mode === 'sabha' ? 8 : 7,
            submittedAt: makeTimestamp(),
        },
    };
};

export const useLilaDeviceSmokeSiddhi = (matchCode: string): boolean => smokeMatches.has(matchCode);
