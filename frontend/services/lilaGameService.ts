import apiClient from '../lib/apiClient';
import type {
    LilaBalanceSummary,
    LilaBootstrap,
    LilaCurrency,
    LilaGiftHistoryEntry,
    LilaInventoryItem,
    LilaJoinQueueResponse,
    LilaLeaderboardEntry,
    LilaLocation,
    LilaMatchRecord,
    LilaMatchScoreEntry,
    LilaMatchSnapshot,
    LilaMode,
    LilaModeConfig,
    LilaPassProgress,
    LilaPassSeason,
    LilaProfileSnapshot,
    LilaPurchaseHistoryEntry,
    LilaPurchaseResult,
    LilaQuestionView,
    LilaQuestSummary,
    LilaQueueEntry,
    LilaReadyLobbyResponse,
    LilaRoundSnapshot,
    LilaSiddhiId,
    LilaStoreItem,
    LilaStoreSpendOption,
    LilaStoreSection,
    LilaSubscription,
    LilaSubscriptionResult,
} from '../types/lila';

type LilaLocale = 'ru' | 'en' | 'hi';
type LilaApiMode = 'dharma_duel' | 'sabha' | 'survival_in_samsara';

type LocalizedStringFields = {
    titleRu?: string;
    titleEn?: string;
    titleHi?: string;
    nameRu?: string;
    nameEn?: string;
    nameHi?: string;
    descriptionRu?: string;
    descriptionEn?: string;
    descriptionHi?: string;
};

type LilaProfileApi = {
    userId?: number;
    rank?: string;
    title?: string;
    experience?: number;
    level?: number;
    avatarStyle?: string;
    locationSlug?: string;
    streakDays?: number;
    winCount?: number;
    loseCount?: number;
};

type LilaQuestApi = LocalizedStringFields & {
    code: string;
    mode?: string;
    rewardBonus?: number;
    rewardReal?: number;
    isDaily?: boolean;
    status?: string;
};

type LilaStoreItemApi = LocalizedStringFields & {
    code: string;
    type?: string;
    priceBonus?: number;
    priceReal?: number;
    canUseBonus?: boolean;
    canUseReal?: boolean;
    isFeatured?: boolean;
    sortOrder?: number;
    status?: string;
    metaJson?: string;
};

type LilaPassSeasonApi = LocalizedStringFields & {
    code: string;
    status?: string;
    startsAt?: string;
    endsAt?: string;
    premiumPriceReal?: number;
    dailyBonusJson?: string;
    premiumRewardJson?: string;
};

type LilaSubscriptionApi = {
    packageCode?: string;
    status?: string;
    startsAt?: string;
    endsAt?: string;
    autoRenew?: boolean;
    priceReal?: number;
};

type LilaPassProgressApi = {
    seasonId?: number;
    userId?: number;
    currentPoints?: number;
    currentLevel?: number;
    claimedLevels?: number[];
    premiumUnlockedAt?: string | null;
    lastClaimedAt?: string | null;
    status?: string;
    expiresAt?: string | null;
};

type LilaInventoryItemApi = {
    code?: string;
    type?: string;
    name?: string;
    description?: string;
    state?: string;
    source?: string;
    ownedAt?: string | null;
    expiresAt?: string | null;
    isEquipped?: boolean;
};

type LilaPurchaseHistoryApi = {
    purchaseId?: number;
    itemCode?: string;
    itemType?: string;
    itemName?: string;
    currency?: string;
    priceBonus?: number;
    priceReal?: number;
    status?: string;
    state?: string;
    purchasedAt?: string;
    fulfilledAt?: string | null;
    expiresAt?: string | null;
};

type LilaGiftHistoryApi = {
    giftId?: number;
    itemCode?: string;
    itemName?: string;
    direction?: string;
    status?: string;
    message?: string;
    currency?: string;
    bonusAmount?: number;
    realAmount?: number;
    counterpartyUserId?: number;
    sentAt?: string;
    deliveredAt?: string | null;
};

type LilaQuestionApi = {
    id: number;
    slug: string;
    type: string;
    category: string;
    difficulty: string;
    prompt: string;
    options?: string[];
    explanation?: string;
    assetUrl?: string;
    assetKind?: string;
    allowedModes?: string[];
};

type LilaQueueEntryApi = {
    id?: number;
    userId?: number;
    mode?: string;
    status?: string;
    matchId?: number | null;
    teamKey?: string;
    location?: string;
    rank?: string;
    ratingAtJoin?: number;
    joinedAt?: string;
    readyAt?: string | null;
    leftAt?: string | null;
    metadataJson?: string;
};

type LilaMatchApi = {
    id?: number;
    code: string;
    mode?: string;
    status?: string;
    lobbyStartedAt?: string | null;
    startedAt?: string | null;
    finishedAt?: string | null;
    winnerUserId?: number | null;
    winningTeamKey?: string;
    reconnectCount?: number;
    roundCount?: number;
    currentRound?: number;
    abandonedReason?: string;
};

type LilaRoundApi = {
    id?: number;
    number?: number;
    status?: string;
    questionId?: number | null;
    promptSnapshotJson?: string;
    optionsSnapshotJson?: string;
    correctAnswerJson?: string;
    stateJson?: string;
    startedAt?: string | null;
    endsAt?: string | null;
    resolvedAt?: string | null;
    durationMs?: number;
    bonusWindowMs?: number;
};

type LilaMatchSnapshotApi = {
    match: LilaMatchApi;
    rounds?: LilaRoundApi[];
    players?: number[];
    queueEntries?: LilaQueueEntryApi[];
    locale?: string;
    currentRound?: LilaRoundApi | null;
    currentQuestion?: LilaQuestionApi | null;
    readyUserIds?: number[];
    scoreboard?: LilaMatchScoreEntry[];
    eliminatedUserIds?: number[];
    answeredUserIds?: number[];
};

type LilaBootstrapApi = {
    profile?: LilaProfileApi | null;
    queueDepth?: Record<string, number>;
    modePlayerCounts?: Record<string, number>;
    activeSeason?: LilaPassSeasonApi | null;
    passProgress?: LilaPassProgressApi | null;
    storeItems?: LilaStoreItemApi[];
    ownedItems?: LilaInventoryItemApi[];
    purchaseHistory?: LilaPurchaseHistoryApi[];
    giftHistory?: LilaGiftHistoryApi[];
    quests?: LilaQuestApi[];
    leaderboard?: LilaLeaderboardEntry[];
    subscription?: LilaSubscriptionApi | null;
    bonusBalance?: number;
    realBalance?: number;
    openMatches?: LilaMatchApi[];
    openQueue?: LilaQueueEntryApi[];
    availableQuestions?: LilaQuestionApi[];
    metrics?: Record<string, unknown>;
};

type LilaStoreApiResponse = {
    views?: LilaQuestionApi[];
    items?: LilaStoreItemApi[];
};

const DEFAULT_LOCATIONS: LilaLocation[] = ['vrindavan', 'dwarka', 'ayodhya', 'kurukshetra'];
const DEFAULT_SIDDHIS: LilaSiddhiId[] = ['drishti', 'mantra_shield', 'vimana', 'maya'];
const ACTIVE_QUEUE_STATUSES = new Set<LilaQueueEntry['status']>(['waiting', 'ready', 'matched']);

const MODE_CONFIGS: Record<LilaMode, LilaModeConfig> = {
    duel: {
        id: 'duel',
        location: 'kurukshetra',
        waitSeconds: 14,
        teamSize: 1,
        maxPlayers: 2,
        rounds: 3,
        consultSeconds: 0,
        rewardBonus: 10,
    },
    sabha: {
        id: 'sabha',
        location: 'ayodhya',
        waitSeconds: 22,
        teamSize: 2,
        maxPlayers: 4,
        rounds: 3,
        consultSeconds: 10,
        rewardBonus: 18,
    },
    survival: {
        id: 'survival',
        location: 'vrindavan',
        waitSeconds: 28,
        teamSize: 1,
        maxPlayers: 10,
        rounds: 10,
        consultSeconds: 0,
        rewardBonus: 25,
    },
};

const MODE_ORDER: LilaMode[] = ['duel', 'sabha', 'survival'];
const MODE_TO_API: Record<LilaMode, LilaApiMode> = {
    duel: 'dharma_duel',
    sabha: 'sabha',
    survival: 'survival_in_samsara',
};

const API_TO_MODE: Record<string, LilaMode> = {
    dharma_duel: 'duel',
    duel: 'duel',
    sabha: 'sabha',
    survival_in_samsara: 'survival',
    survival: 'survival',
};

const normalizeLocale = (locale?: string): LilaLocale => {
    const value = String(locale || '').trim().toLowerCase();
    if (value === 'en' || value === 'hi') {
        return value;
    }
    return 'ru';
};

const localizeText = (
    value: LocalizedStringFields,
    locale: LilaLocale,
    key: 'title' | 'name' | 'description',
): string => {
    const suffix = locale === 'en' ? 'En' : locale === 'hi' ? 'Hi' : 'Ru';
    const fallback = suffix === 'Ru' ? ['En', 'Hi'] : suffix === 'En' ? ['Ru', 'Hi'] : ['En', 'Ru'];
    const targetKey = `${key}${suffix}` as keyof LocalizedStringFields;
    const direct = value[targetKey];
    if (typeof direct === 'string' && direct.trim()) {
        return direct.trim();
    }
    for (const fallbackSuffix of fallback) {
        const fallbackKey = `${key}${fallbackSuffix}` as keyof LocalizedStringFields;
        const next = value[fallbackKey];
        if (typeof next === 'string' && next.trim()) {
            return next.trim();
        }
    }
    return '';
};

const parseRecord = (raw?: string): Record<string, unknown> => {
    if (!raw) {
        return {};
    }
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const normalizeRank = (rank?: string): LilaProfileSnapshot['rank'] => {
    switch (rank) {
    case 'student':
    case 'pandit':
    case 'rishi':
    case 'maharishi':
        return rank;
    default:
        return 'seeker';
    }
};

const toFrontendMode = (mode?: string): LilaMode => API_TO_MODE[mode || ''] || 'duel';

const toApiMode = (mode: LilaMode): LilaApiMode => MODE_TO_API[mode];

const toNextRankProgress = (experience?: number): number => {
    const value = Math.max(0, Number(experience || 0));
    return (value % 100) / 100;
};

const toStoreSectionId = (item: LilaStoreItem): LilaStoreSection['id'] => {
    const code = item.code.toLowerCase();
    if (item.type === 'gift') {
        return 'gifts';
    }
    if (item.type === 'cosmetic') {
        return 'cosmetics';
    }
    if (item.type === 'siddhi') {
        return 'siddhis';
    }
    if (code.includes('dharma')) {
        return 'dharmaFund';
    }
    return 'events';
};

const mapProfile = (profile?: LilaProfileApi | null): LilaProfileSnapshot | null => {
    if (!profile) {
        return null;
    }
    const fallbackLocation = MODE_CONFIGS.duel.location;
    return {
        rank: normalizeRank(profile.rank),
        title: String(profile.title || '').trim(),
        experience: Number(profile.experience || 0),
        level: Math.max(1, Number(profile.level || 1)),
        avatarStyle: String(profile.avatarStyle || 'sage'),
        locationSlug: String(profile.locationSlug || fallbackLocation),
        streakDays: Number(profile.streakDays || 0),
        winCount: Number(profile.winCount || 0),
        loseCount: Number(profile.loseCount || 0),
        nextRankProgress: toNextRankProgress(profile.experience),
    };
};

const mapQuest = (quest: LilaQuestApi, locale: LilaLocale): LilaQuestSummary => ({
    code: quest.code,
    title: localizeText(quest, locale, 'title'),
    description: localizeText(quest, locale, 'description'),
    mode: quest.mode ? toFrontendMode(quest.mode) : undefined,
    rewardBonus: Number(quest.rewardBonus || 0),
    rewardReal: Number(quest.rewardReal || 0),
    isDaily: Boolean(quest.isDaily),
    status: String(quest.status || 'draft'),
});

const mapStoreItem = (item: LilaStoreItemApi, locale: LilaLocale, localizedFallback?: LilaQuestionApi): LilaStoreItem => ({
    code: item.code,
    type: String(item.type || 'cosmetic'),
    name: localizedFallback?.prompt || localizeText(item, locale, 'name') || item.code,
    description: localizedFallback?.explanation || localizeText(item, locale, 'description'),
    bonusPrice: Number(item.priceBonus || 0),
    realPrice: Number(item.priceReal || 0),
    canUseBonus: Boolean(item.canUseBonus),
    canUseReal: Boolean(item.canUseReal),
    isFeatured: Boolean(item.isFeatured),
    sortOrder: Number(item.sortOrder || 0),
    status: String(item.status || 'draft'),
});

const mapPassSeason = (season?: LilaPassSeasonApi | null, locale?: LilaLocale): LilaPassSeason | null => {
    if (!season) {
        return null;
    }
    const resolvedLocale = normalizeLocale(locale);
    return {
        code: season.code,
        name: localizeText(season, resolvedLocale, 'name') || season.code,
        description: localizeText(season, resolvedLocale, 'description'),
        status: String(season.status || 'locked'),
        startsAt: String(season.startsAt || ''),
        endsAt: String(season.endsAt || ''),
        premiumPriceReal: Number(season.premiumPriceReal || 0),
        dailyBonus: parseRecord(season.dailyBonusJson),
        premiumReward: parseRecord(season.premiumRewardJson),
    };
};

const mapSubscription = (subscription?: LilaSubscriptionApi | null): LilaSubscription | null => {
    if (!subscription) {
        return null;
    }
    return {
        packageCode: String(subscription.packageCode || ''),
        status: String(subscription.status || 'inactive'),
        startsAt: String(subscription.startsAt || ''),
        endsAt: String(subscription.endsAt || ''),
        autoRenew: Boolean(subscription.autoRenew),
        priceReal: Number(subscription.priceReal || 0),
    };
};

const mapPassProgress = (progress?: LilaPassProgressApi | null): LilaPassProgress | null => {
    if (!progress) {
        return null;
    }
    return {
        seasonId: Number(progress.seasonId || 0),
        userId: Number(progress.userId || 0),
        currentPoints: Number(progress.currentPoints || 0),
        currentLevel: Number(progress.currentLevel || 1),
        claimedLevels: Array.isArray(progress.claimedLevels) ? progress.claimedLevels.map((value) => Number(value || 0)) : [],
        premiumUnlockedAt: progress.premiumUnlockedAt ?? null,
        lastClaimedAt: progress.lastClaimedAt ?? null,
        status: progress.status,
        expiresAt: progress.expiresAt ?? null,
    };
};

const mapInventoryItem = (item: LilaInventoryItemApi): LilaInventoryItem => ({
    code: String(item.code || ''),
    type: String(item.type || 'cosmetic'),
    name: String(item.name || ''),
    description: String(item.description || ''),
    state: String(item.state || 'owned'),
    source: String(item.source || 'store_purchase'),
    ownedAt: item.ownedAt ?? null,
    expiresAt: item.expiresAt ?? null,
    isEquipped: Boolean(item.isEquipped),
});

const mapPurchaseHistoryEntry = (entry: LilaPurchaseHistoryApi): LilaPurchaseHistoryEntry => ({
    purchaseId: Number(entry.purchaseId || 0),
    itemCode: String(entry.itemCode || ''),
    itemType: String(entry.itemType || 'cosmetic'),
    itemName: String(entry.itemName || entry.itemCode || ''),
    currency: String(entry.currency || 'real') as LilaCurrency,
    priceBonus: Number(entry.priceBonus || 0),
    priceReal: Number(entry.priceReal || 0),
    status: String(entry.status || 'paid'),
    state: String(entry.state || entry.status || 'paid'),
    purchasedAt: String(entry.purchasedAt || ''),
    fulfilledAt: entry.fulfilledAt ?? null,
    expiresAt: entry.expiresAt ?? null,
});

const mapGiftHistoryEntry = (entry: LilaGiftHistoryApi): LilaGiftHistoryEntry => ({
    giftId: Number(entry.giftId || 0),
    itemCode: String(entry.itemCode || ''),
    itemName: String(entry.itemName || entry.itemCode || ''),
    direction: String(entry.direction || 'incoming'),
    status: String(entry.status || 'sent'),
    message: String(entry.message || ''),
    currency: String(entry.currency || 'bonus') as LilaCurrency,
    bonusAmount: Number(entry.bonusAmount || 0),
    realAmount: Number(entry.realAmount || 0),
    counterpartyUserId: Number(entry.counterpartyUserId || 0),
    sentAt: String(entry.sentAt || ''),
    deliveredAt: entry.deliveredAt ?? null,
});

const mapQuestion = (question: LilaQuestionApi): LilaQuestionView => ({
    id: Number(question.id),
    slug: question.slug,
    type: question.type as LilaQuestionView['type'],
    category: question.category,
    difficulty: question.difficulty as LilaQuestionView['difficulty'],
    prompt: String(question.prompt || ''),
    options: Array.isArray(question.options) ? question.options.map((option) => String(option)) : [],
    explanation: String(question.explanation || ''),
    assetUrl: String(question.assetUrl || ''),
    assetKind: String(question.assetKind || ''),
    allowedModes: Array.isArray(question.allowedModes) ? question.allowedModes.map((mode) => toFrontendMode(String(mode))) : [],
});

const mapQueueEntry = (entry: LilaQueueEntryApi): LilaQueueEntry => ({
    id: entry.id,
    userId: Number(entry.userId || 0),
    mode: toFrontendMode(entry.mode),
    status: String(entry.status || 'waiting'),
    matchId: entry.matchId ?? null,
    teamKey: entry.teamKey,
    location: entry.location,
    rank: normalizeRank(entry.rank),
    ratingAtJoin: Number(entry.ratingAtJoin || 0),
    joinedAt: entry.joinedAt,
    readyAt: entry.readyAt ?? null,
    leftAt: entry.leftAt ?? null,
    metadata: parseRecord(entry.metadataJson),
});

const mapMatch = (match: LilaMatchApi): LilaMatchRecord => ({
    id: match.id,
    code: match.code,
    mode: toFrontendMode(match.mode),
    status: String(match.status || 'lobby'),
    lobbyStartedAt: match.lobbyStartedAt ?? null,
    startedAt: match.startedAt ?? null,
    finishedAt: match.finishedAt ?? null,
    winnerUserId: match.winnerUserId ?? null,
    winningTeamKey: match.winningTeamKey,
    reconnectCount: Number(match.reconnectCount || 0),
    roundCount: Number(match.roundCount || 0),
    currentRound: Number(match.currentRound || 0),
    abandonedReason: match.abandonedReason,
});

const mapRound = (round?: LilaRoundApi | null): LilaRoundSnapshot | null => {
    if (!round) {
        return null;
    }
    return {
        id: round.id,
        number: Number(round.number || 0),
        status: String(round.status || 'pending'),
        questionId: round.questionId ?? null,
        promptSnapshot: round.promptSnapshotJson,
        optionsSnapshot: round.optionsSnapshotJson,
        correctAnswer: round.correctAnswerJson,
        state: parseRecord(round.stateJson),
        startedAt: round.startedAt ?? null,
        endsAt: round.endsAt ?? null,
        resolvedAt: round.resolvedAt ?? null,
        durationMs: Number(round.durationMs || 0),
        bonusWindowMs: Number(round.bonusWindowMs || 0),
    };
};

const mapMatchSnapshot = (snapshot: LilaMatchSnapshotApi): LilaMatchSnapshot => ({
    match: mapMatch(snapshot.match),
    rounds: Array.isArray(snapshot.rounds)
        ? snapshot.rounds
            .map((round) => mapRound(round))
            .filter((round): round is LilaRoundSnapshot => round !== null)
        : [],
    players: Array.isArray(snapshot.players) ? snapshot.players.map((playerId) => Number(playerId)) : [],
    queueEntries: Array.isArray(snapshot.queueEntries) ? snapshot.queueEntries.map(mapQueueEntry) : [],
    locale: String(snapshot.locale || 'ru'),
    currentRound: mapRound(snapshot.currentRound),
    currentQuestion: snapshot.currentQuestion ? mapQuestion(snapshot.currentQuestion) : null,
    readyUserIds: Array.isArray(snapshot.readyUserIds) ? snapshot.readyUserIds.map((userId) => Number(userId)) : [],
    scoreboard: Array.isArray(snapshot.scoreboard) ? snapshot.scoreboard.map((entry) => ({
        userId: Number(entry.userId),
        score: Number(entry.score || 0),
        isReady: Boolean(entry.isReady),
        isEliminated: Boolean(entry.isEliminated),
    })) : [],
    eliminatedUserIds: Array.isArray(snapshot.eliminatedUserIds) ? snapshot.eliminatedUserIds.map((userId) => Number(userId)) : [],
    answeredUserIds: Array.isArray(snapshot.answeredUserIds) ? snapshot.answeredUserIds.map((userId) => Number(userId)) : [],
});

const mapQueueDepth = (depth?: Record<string, number>): Record<string, number> => {
    const mapped: Record<string, number> = {
        duel: 0,
        sabha: 0,
        survival: 0,
    };
    Object.entries(depth || {}).forEach(([key, value]) => {
        mapped[toFrontendMode(key)] = Number(value || 0);
    });
    return mapped;
};

const mapLeaderboard = (entries?: LilaLeaderboardEntry[]): LilaLeaderboardEntry[] => (
    Array.isArray(entries)
        ? entries.map((entry) => ({
            userId: Number(entry.userId),
            score: Number(entry.score || 0),
            rank: normalizeRank(entry.rank),
            wins: Number(entry.wins || 0),
            losses: Number(entry.losses || 0),
            updatedAt: entry.updatedAt,
        }))
        : []
);

const buildStoreSections = (items: LilaStoreItem[]): LilaStoreSection[] => {
    const sections: Record<LilaStoreSection['id'], LilaStoreItem[]> = {
        cosmetics: [],
        siddhis: [],
        events: [],
        gifts: [],
        dharmaFund: [],
    };
    items.forEach((item) => {
        sections[toStoreSectionId(item)].push(item);
    });
    return Object.entries(sections)
        .map(([id, sectionItems]) => ({
            id: id as LilaStoreSection['id'],
            title: id,
            items: sectionItems.sort((left, right) => {
                if (left.sortOrder === right.sortOrder) {
                    return left.name.localeCompare(right.name);
                }
                return left.sortOrder - right.sortOrder;
            }),
        }))
        .filter((section) => section.items.length > 0);
};

const createDedupKey = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const getLilaModeConfig = (mode: LilaMode): LilaModeConfig => MODE_CONFIGS[mode] || MODE_CONFIGS.duel;

export const getLilaModeConfigs = (): LilaModeConfig[] => MODE_ORDER.map((mode) => MODE_CONFIGS[mode]);

export const getLilaSiddhis = (): LilaSiddhiId[] => [...DEFAULT_SIDDHIS];

export const getLilaStoreSections = (items: LilaStoreItem[]): LilaStoreSection[] => buildStoreSections(items);

export const getLilaModePlayerCount = (
    bootstrap: Pick<LilaBootstrap, 'modePlayerCounts' | 'queueDepth'> | null | undefined,
    mode: LilaMode,
): number => Number(bootstrap?.modePlayerCounts?.[mode] ?? bootstrap?.queueDepth?.[mode] ?? 0);

export const isLilaActiveQueueStatus = (status?: string | null): boolean =>
    ACTIVE_QUEUE_STATUSES.has((status || '').trim() as LilaQueueEntry['status']);

export const getLilaPreferredStoreCurrency = (item: LilaStoreItem): LilaCurrency | null => {
    const hasBonusPrice = item.canUseBonus && item.bonusPrice > 0;
    const hasRealPrice = item.canUseReal && item.realPrice > 0;

    if (hasBonusPrice) {
        return 'bonus';
    }
    if (hasRealPrice) {
        return 'real';
    }
    return null;
};

export const getLilaStoreSpendOptions = (
    item: LilaStoreItem,
    balance: LilaBalanceSummary,
): LilaStoreSpendOption[] => {
    const options: LilaStoreSpendOption[] = [];

    if (item.canUseBonus && item.bonusPrice > 0) {
        options.push({
            currency: 'bonus',
            amount: item.bonusPrice,
            affordable: balance.bonus >= item.bonusPrice,
        });
    }

    if (item.canUseReal && item.realPrice > 0) {
        options.push({
            currency: 'real',
            amount: item.realPrice,
            affordable: balance.real >= item.realPrice,
        });
    }

    return options;
};

export const getLilaBootstrap = async (localeInput?: string): Promise<LilaBootstrap> => {
    const locale = normalizeLocale(localeInput);
    const { data } = await apiClient.get<LilaBootstrapApi>('/games/lila/bootstrap', {
        params: { locale },
    });

    const storeItems = Array.isArray(data.storeItems)
        ? data.storeItems.map((item) => mapStoreItem(item, locale))
        : [];

    return {
        locations: [...DEFAULT_LOCATIONS],
        modes: getLilaModeConfigs(),
        profile: mapProfile(data.profile),
        quests: Array.isArray(data.quests) ? data.quests.map((quest) => mapQuest(quest, locale)) : [],
        siddhis: getLilaSiddhis(),
        queueDepth: mapQueueDepth(data.queueDepth),
        modePlayerCounts: mapQueueDepth(data.modePlayerCounts),
        activeSeason: mapPassSeason(data.activeSeason, locale),
        passProgress: mapPassProgress(data.passProgress),
        storeItems,
        ownedItems: Array.isArray(data.ownedItems) ? data.ownedItems.map(mapInventoryItem) : [],
        purchaseHistory: Array.isArray(data.purchaseHistory) ? data.purchaseHistory.map(mapPurchaseHistoryEntry) : [],
        giftHistory: Array.isArray(data.giftHistory) ? data.giftHistory.map(mapGiftHistoryEntry) : [],
        leaderboard: mapLeaderboard(data.leaderboard),
        subscription: mapSubscription(data.subscription),
        bonusBalance: Number(data.bonusBalance || 0),
        realBalance: Number(data.realBalance || 0),
        openMatches: Array.isArray(data.openMatches) ? data.openMatches.map(mapMatch) : [],
        openQueue: Array.isArray(data.openQueue) ? data.openQueue.map(mapQueueEntry) : [],
        availableQuestions: Array.isArray(data.availableQuestions) ? data.availableQuestions.map(mapQuestion) : [],
        metrics: data.metrics || {},
    };
};

export const getLilaStoreItems = async (localeInput?: string): Promise<LilaStoreItem[]> => {
    const locale = normalizeLocale(localeInput);
    const { data } = await apiClient.get<LilaStoreApiResponse>('/games/lila/store', {
        params: { locale },
    });
    const localizedViews = new Map((data.views || []).map((view) => [view.slug, view]));
    return Array.isArray(data.items)
        ? data.items.map((item) => mapStoreItem(item, locale, localizedViews.get(item.code)))
        : [];
};

export const joinLilaQueue = async (mode: LilaMode, location?: string): Promise<LilaJoinQueueResponse> => {
    const { data } = await apiClient.post<LilaJoinQueueResponse>('/games/lila/queue/join', {
        mode: toApiMode(mode),
        location: location || MODE_CONFIGS[mode].location,
    });

    return {
        queueEntry: mapQueueEntry(data.queueEntry as unknown as LilaQueueEntryApi),
        match: data.match ? mapMatch(data.match as unknown as LilaMatchApi) : null,
    } as LilaJoinQueueResponse;
};

export const leaveLilaQueue = async (mode: LilaMode): Promise<void> => {
    await apiClient.post('/games/lila/queue/leave', null, {
        params: { mode: toApiMode(mode) },
    });
};

export const readyLilaLobby = async (matchCode: string): Promise<LilaReadyLobbyResponse> => {
    const { data } = await apiClient.post<LilaReadyLobbyResponse>(`/games/lila/lobby/${matchCode}/ready`);
    return {
        match: mapMatch(data.match as unknown as LilaMatchApi),
    };
};

export const getLilaMatch = async (matchCode: string, localeInput?: string): Promise<LilaMatchSnapshot> => {
    const locale = normalizeLocale(localeInput);
    const { data } = await apiClient.get<LilaMatchSnapshotApi>(`/games/lila/matches/${matchCode}`, {
        params: { locale },
    });
    return mapMatchSnapshot(data);
};

export const submitLilaAnswer = async (
    matchCode: string,
    roundNumber: number,
    selectedOption: string,
): Promise<void> => {
    await apiClient.post(`/games/lila/matches/${matchCode}/answer`, {
        matchCode,
        roundNumber,
        selectedOption,
    });
};

export const useLilaSiddhi = async (
    matchCode: string,
    roundNumber: number,
    type: LilaSiddhiId,
    payload?: Record<string, unknown>,
): Promise<void> => {
    await apiClient.post(`/games/lila/matches/${matchCode}/siddhi`, {
        matchCode,
        roundNumber,
        type,
        payload: payload || {},
    });
};

export const purchaseLilaStoreItem = async (
    itemCode: string,
    currency: LilaCurrency,
): Promise<LilaPurchaseResult> => {
    const { data } = await apiClient.post<LilaPurchaseResult>('/games/lila/store/purchase', {
        itemCode,
        currency,
        quantity: 1,
        dedupKey: createDedupKey(`lila-purchase-${itemCode}`),
    });
    return data;
};

export const sendLilaGift = async (
    toUserId: number,
    itemCode: string,
    currency: LilaCurrency,
    message?: string,
): Promise<void> => {
    await apiClient.post('/games/lila/store/gift', {
        toUserId,
        itemCode,
        currency,
        quantity: 1,
        message: message || '',
    });
};

export const claimLilaPassReward = async (
    seasonCode: string,
    points: number,
    premium: boolean,
): Promise<LilaPassProgress> => {
    const { data } = await apiClient.post<{ progress: LilaPassProgressApi }>('/games/lila/pass/claim', {
        seasonCode,
        points,
        premium,
    });
    return mapPassProgress(data.progress) || {};
};

export const activateLilaSubscription = async (packageCode: string): Promise<LilaSubscriptionResult> => {
    const { data } = await apiClient.post<LilaSubscriptionResult>('/games/lila/subscription', {
        packageCode,
        autoRenew: true,
        dedupKey: createDedupKey(`lila-subscription-${packageCode}`),
    });
    return {
        subscription: mapSubscription(data.subscription as unknown as LilaSubscriptionApi) as LilaSubscription,
    };
};

export const getLilaBalance = async (): Promise<LilaBalanceSummary> => {
    const { data } = await apiClient.get<LilaBalanceSummary>('/games/lila/balance');
    return {
        bonus: Number(data.bonus || 0),
        real: Number(data.real || 0),
    };
};
