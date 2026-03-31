import { getLilaPreferredStoreCurrency, getLilaStoreSpendOptions } from '../../services/lilaGameService';
import type { LilaBalanceSummary, LilaStoreItem } from '../../types/lila';

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
