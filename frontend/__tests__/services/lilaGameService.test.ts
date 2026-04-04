import apiClient from '../../lib/apiClient';
import {
    getCachedLilaBootstrap,
    getLilaBootstrap,
    getLilaModePlayerCount,
    getLilaPreferredStoreCurrency,
    getLilaStoreSpendOptions,
    invalidateLilaBootstrap,
    isLilaActiveQueueStatus,
    primeLilaBootstrap,
} from '../../services/lilaGameService';
import type { LilaBalanceSummary, LilaBootstrap, LilaStoreItem } from '../../types/lila';

jest.mock('../../lib/apiClient', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
    },
}));

const buildItem = (overrides: Partial<LilaStoreItem> = {}): LilaStoreItem => ({
    code: 'test_item',
    type: 'cosmetic',
    name: 'Test Item',
    description: '',
    bonusPrice: 0,
    realPrice: 0,
    canUseBonus: false,
    canUseReal: false,
    isFeatured: false,
    sortOrder: 0,
    status: 'active',
    ...overrides,
});

describe('getLilaPreferredStoreCurrency', () => {
    it('prefers bonus when bonus price exists', () => {
        expect(getLilaPreferredStoreCurrency(buildItem({
            canUseBonus: true,
            bonusPrice: 50,
            canUseReal: true,
            realPrice: 99,
        }))).toBe('bonus');
    });

    it('falls back to real when bonus is allowed but not priced', () => {
        expect(getLilaPreferredStoreCurrency(buildItem({
            canUseBonus: true,
            bonusPrice: 0,
            canUseReal: true,
            realPrice: 299,
        }))).toBe('real');
    });

    it('returns null when neither payment path is configured', () => {
        expect(getLilaPreferredStoreCurrency(buildItem())).toBeNull();
    });

    it('returns null when flags exist but prices are not configured', () => {
        expect(getLilaPreferredStoreCurrency(buildItem({
            canUseBonus: true,
            canUseReal: true,
            bonusPrice: 0,
            realPrice: 0,
        }))).toBeNull();
    });
});

describe('getLilaStoreSpendOptions', () => {
    const buildBalance = (overrides: Partial<LilaBalanceSummary> = {}): LilaBalanceSummary => ({
        bonus: 0,
        real: 0,
        ...overrides,
    });

    it('marks bonus option as unaffordable and real option as affordable', () => {
        expect(getLilaStoreSpendOptions(
            buildItem({
                canUseBonus: true,
                bonusPrice: 25,
                canUseReal: true,
                realPrice: 99,
            }),
            buildBalance({ bonus: 10, real: 150 }),
        )).toEqual([
            { currency: 'bonus', amount: 25, affordable: false },
            { currency: 'real', amount: 99, affordable: true },
        ]);
    });

    it('omits zero-priced currencies from spend options', () => {
        expect(getLilaStoreSpendOptions(
            buildItem({
                canUseBonus: true,
                bonusPrice: 0,
                canUseReal: true,
                realPrice: 299,
            }),
            buildBalance({ real: 500 }),
        )).toEqual([
            { currency: 'real', amount: 299, affordable: true },
        ]);
    });
});

describe('getLilaModePlayerCount', () => {
    const buildBootstrap = (overrides: Partial<LilaBootstrap> = {}): LilaBootstrap => ({
        locations: [],
        modes: [],
        profile: null,
        quests: [],
        siddhis: [],
        queueDepth: {},
        modePlayerCounts: {},
        activeSeason: null,
        passProgress: null,
        storeItems: [],
        ownedItems: [],
        purchaseHistory: [],
        giftHistory: [],
        leaderboard: [],
        subscription: null,
        bonusBalance: 0,
        realBalance: 0,
        openMatches: [],
        openQueue: [],
        availableQuestions: [],
        metrics: {},
        activeStreak: 0,
        dailyQuestProgress: [],
        weeklyQuestProgress: [],
        recentRewards: [],
        recommendedMode: 'duel',
        tutorialState: {
            completed: false,
            currentStep: 'intro',
            seenIntro: false,
            completedMatches: 0,
        },
        ...overrides,
    });

    it('prefers backend mode player counts when available', () => {
        expect(getLilaModePlayerCount(buildBootstrap({
            queueDepth: { duel: 1 },
            modePlayerCounts: { duel: 2 },
        }), 'duel')).toBe(2);
    });

    it('falls back to queue depth for older payloads', () => {
        expect(getLilaModePlayerCount(buildBootstrap({
            queueDepth: { survival: 4 },
        }), 'survival')).toBe(4);
    });

    describe('bootstrap cache', () => {
        beforeEach(() => {
            invalidateLilaBootstrap();
            jest.clearAllMocks();
        });

        it('stores and returns locale-scoped cached bootstrap payloads', () => {
            const ruBootstrap = buildBootstrap({ activeStreak: 3 });
            const enBootstrap = buildBootstrap({ activeStreak: 5 });

            primeLilaBootstrap('ru', ruBootstrap);
            primeLilaBootstrap('en', enBootstrap);

            expect(getCachedLilaBootstrap('ru')?.activeStreak).toBe(3);
            expect(getCachedLilaBootstrap('en')?.activeStreak).toBe(5);
            expect(getCachedLilaBootstrap('hi')).toBeNull();
        });

        it('clears one locale or the whole cache through invalidation', () => {
            primeLilaBootstrap('ru', buildBootstrap({ activeStreak: 2 }));
            primeLilaBootstrap('en', buildBootstrap({ activeStreak: 4 }));

            invalidateLilaBootstrap('ru');
            expect(getCachedLilaBootstrap('ru')).toBeNull();
            expect(getCachedLilaBootstrap('en')?.activeStreak).toBe(4);

            invalidateLilaBootstrap();
            expect(getCachedLilaBootstrap('en')).toBeNull();
        });

        it('reuses cached bootstrap until force refresh is requested', async () => {
            const mockedGet = apiClient.get as jest.Mock;
            mockedGet.mockResolvedValueOnce({
                data: {
                    queueDepth: {},
                    modePlayerCounts: {},
                    bonusBalance: 0,
                    realBalance: 0,
                    recentRewards: [],
                    dailyQuestProgress: [],
                    weeklyQuestProgress: [],
                    openMatches: [],
                    openQueue: [],
                },
            });

            const first = await getLilaBootstrap('ru', { force: true });
            const second = await getLilaBootstrap('ru');

            expect(second).toBe(first);
            expect(mockedGet).toHaveBeenCalledTimes(1);
        });
    });
});

describe('isLilaActiveQueueStatus', () => {
    it('treats waiting, ready and matched as active', () => {
        expect(isLilaActiveQueueStatus('waiting')).toBe(true);
        expect(isLilaActiveQueueStatus('ready')).toBe(true);
        expect(isLilaActiveQueueStatus('matched')).toBe(true);
    });

    it('treats expired and left as inactive', () => {
        expect(isLilaActiveQueueStatus('expired')).toBe(false);
        expect(isLilaActiveQueueStatus('left')).toBe(false);
    });
});
