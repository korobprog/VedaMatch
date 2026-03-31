export type LilaMode = 'duel' | 'sabha' | 'survival';
export type LilaDifficulty = 'tamas' | 'rajas' | 'sattva';
export type LilaCategory = 'shastra_vidya' | 'itihasa_gyan' | 'bhakti_ras' | 'sanskrit_challenge';
export type LilaRank = 'seeker' | 'student' | 'pandit' | 'rishi' | 'maharishi';
export type LilaSiddhiId = 'drishti' | 'mantra_shield' | 'vimana' | 'maya';
export type LilaLocation = 'vrindavan' | 'dwarka' | 'ayodhya' | 'kurukshetra';
export type LilaQuestionType = 'single_choice' | 'image_choice' | 'ordering';
export type LilaMatchStatus = 'lobby' | 'active' | 'finished' | 'abandoned' | string;
export type LilaQueueStatus = 'waiting' | 'ready' | 'matched' | 'left' | 'expired' | 'cancelled' | string;
export type LilaPassStatus = 'locked' | 'active' | 'expired' | string;

export interface LilaModeConfig {
    id: LilaMode;
    location: LilaLocation;
    waitSeconds: number;
    teamSize: number;
    maxPlayers: number;
    rounds: number;
    consultSeconds: number;
    rewardBonus: number;
}

export interface LilaProfileSnapshot {
    rank: LilaRank;
    title: string;
    experience: number;
    level: number;
    avatarStyle: string;
    locationSlug: string;
    streakDays: number;
    winCount: number;
    loseCount: number;
    nextRankProgress: number;
}

export interface LilaQuestSummary {
    code: string;
    title: string;
    description: string;
    mode?: LilaMode;
    rewardBonus: number;
    rewardReal: number;
    isDaily: boolean;
    status: string;
}

export interface LilaStoreItem {
    code: string;
    type: string;
    name: string;
    description: string;
    bonusPrice: number;
    realPrice: number;
    canUseBonus: boolean;
    canUseReal: boolean;
    isFeatured: boolean;
    sortOrder: number;
    status: string;
}

export interface LilaStoreSection {
    id: string;
    title: string;
    items: LilaStoreItem[];
}

export interface LilaPassReward {
    code: string;
    title: string;
    track: 'free' | 'premium';
}

export interface LilaPassSeason {
    code: string;
    name: string;
    description: string;
    status: LilaPassStatus;
    startsAt: string;
    endsAt: string;
    premiumPriceReal: number;
    dailyBonus: Record<string, unknown>;
    premiumReward: Record<string, unknown>;
}

export interface LilaSubscription {
    packageCode: string;
    status: string;
    startsAt: string;
    endsAt: string;
    autoRenew: boolean;
    priceReal: number;
}

export interface LilaLeaderboardEntry {
    userId: number;
    score: number;
    rank: LilaRank;
    wins: number;
    losses: number;
    updatedAt: string;
}

export interface LilaQueueEntry {
    id?: number;
    userId: number;
    mode: LilaMode;
    status: LilaQueueStatus;
    matchId?: number | null;
    teamKey?: string;
    location?: string;
    rank?: LilaRank;
    ratingAtJoin?: number;
    joinedAt?: string;
    readyAt?: string | null;
    leftAt?: string | null;
    metadata?: Record<string, unknown>;
    matchCode?: string;
}

export interface LilaMatchRecord {
    id?: number;
    code: string;
    mode: LilaMode;
    status: LilaMatchStatus;
    lobbyStartedAt?: string | null;
    startedAt?: string | null;
    finishedAt?: string | null;
    winnerUserId?: number | null;
    winningTeamKey?: string;
    reconnectCount?: number;
    roundCount?: number;
    currentRound?: number;
    abandonedReason?: string;
}

export interface LilaRoundSnapshot {
    id?: number;
    number: number;
    status: string;
    questionId?: number | null;
    promptSnapshot?: string;
    optionsSnapshot?: string;
    correctAnswer?: string;
    state?: Record<string, unknown>;
    startedAt?: string | null;
    endsAt?: string | null;
    resolvedAt?: string | null;
    durationMs?: number;
    bonusWindowMs?: number;
}

export interface LilaQuestionView {
    id: number;
    slug: string;
    type: LilaQuestionType;
    category: LilaCategory | string;
    difficulty: LilaDifficulty;
    prompt: string;
    options: string[];
    explanation: string;
    assetUrl: string;
    assetKind: string;
    allowedModes: LilaMode[];
}

export interface LilaMatchScoreEntry {
    userId: number;
    score: number;
    isReady: boolean;
    isEliminated: boolean;
}

export interface LilaMatchSnapshot {
    match: LilaMatchRecord;
    rounds: LilaRoundSnapshot[];
    players: number[];
    queueEntries: LilaQueueEntry[];
    locale: string;
    currentRound: LilaRoundSnapshot | null;
    currentQuestion: LilaQuestionView | null;
    readyUserIds: number[];
    scoreboard: LilaMatchScoreEntry[];
    eliminatedUserIds: number[];
    answeredUserIds: number[];
}

export interface LilaBootstrap {
    locations: LilaLocation[];
    modes: LilaModeConfig[];
    profile: LilaProfileSnapshot | null;
    quests: LilaQuestSummary[];
    siddhis: LilaSiddhiId[];
    queueDepth: Record<string, number>;
    activeSeason: LilaPassSeason | null;
    storeItems: LilaStoreItem[];
    leaderboard: LilaLeaderboardEntry[];
    subscription: LilaSubscription | null;
    bonusBalance: number;
    realBalance: number;
    openMatches: LilaMatchRecord[];
    openQueue: LilaQueueEntry[];
    availableQuestions: LilaQuestionView[];
    metrics: Record<string, unknown>;
}

export interface LilaJoinQueueResponse {
    queueEntry: LilaQueueEntry;
    match: LilaMatchRecord | null;
}

export interface LilaReadyLobbyResponse {
    match: LilaMatchRecord;
}

export interface LilaAnswerSubmissionResponse {
    answer: {
        id?: number;
        matchId?: number;
        roundId?: number;
        userId?: number;
        selectedOption?: string;
        ordering?: string[];
        answerText?: string;
        isCorrect?: boolean;
        responseMs?: number;
        scoreDelta?: number;
        karmaTransfer?: number;
        submittedAt?: string;
    };
}

export interface LilaPurchaseResult {
    purchase: {
        id?: number;
        userId?: number;
        itemId?: number;
        quantity?: number;
        currency?: 'bonus' | 'real' | string;
        priceBonus?: number;
        priceReal?: number;
        dharmaPercent?: number;
        dharmaAmount?: number;
        status?: string;
        paymentRef?: string;
        fulfilledAt?: string | null;
    };
}

export interface LilaSubscriptionResult {
    subscription: LilaSubscription;
}

export interface LilaPassProgress {
    seasonId?: number;
    userId?: number;
    currentPoints?: number;
    currentLevel?: number;
    claimedLevels?: number[];
    premiumUnlockedAt?: string | null;
    lastClaimedAt?: string | null;
    status?: LilaPassStatus;
}

export interface LilaGuruLink {
    mentorUserId: number;
    studentUserId: number;
    sharePercent: number;
    status: string;
}

export interface LilaBalanceSummary {
    bonus: number;
    real: number;
}
