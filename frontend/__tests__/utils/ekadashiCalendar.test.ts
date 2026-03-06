import { findEkadashiDayForCell, getCalendarGridDays, getEkadashiProviderNoticeKey, isDevoteeRole } from '../../utils/ekadashiCalendar';

describe('ekadashiCalendar utils', () => {
    it('builds calendar grid for monday-first layout', () => {
        const days = getCalendarGridDays(new Date(2026, 2, 1));
        expect(days[0]).toBe(null);
        expect(days).toContain(31);
    });

    it('finds ekadashi day by month cell', () => {
        const result = findEkadashiDayForCell([
            {
                date: '2026-03-14',
                organizationId: 'iskcon',
                organizationName: 'ISKCON',
                timezone: 'Asia/Vladivostok',
                city: 'Vladivostok',
                country: 'Russia',
                eventType: 'ekadashi',
                isEkadashi: true,
                isMahadvadashi: false,
                fastStartAt: null,
                fastEndAt: null,
                paranaStartAt: null,
                paranaEndAt: null,
                displayTitle: 'Ekadashi',
                displaySubtitle: 'ISKCON observance',
                observanceNotes: '',
                source: 'fallback',
                sourceUrl: '',
            },
        ], new Date(2026, 2, 1), 14);
        expect(result?.organizationId).toBe('iskcon');
    });

    it('gates ekadashi mode to devotee role', () => {
        expect(isDevoteeRole('devotee')).toBe(true);
        expect(isDevoteeRole('user')).toBe(false);
    });

    it('maps provider fallback reasons to localized notice keys', () => {
        expect(getEkadashiProviderNoticeKey({
            mode: 'fallback',
            source: 'fallback_aggregator',
            reason: 'city_required_for_iskcon_live_provider',
        })).toBe('portal.ekadashiCalendar.providerNotices.cityRequiredForLive');
        expect(getEkadashiProviderNoticeKey({
            mode: 'fallback',
            source: 'fallback_aggregator',
            reason: 'iskcon_live_fetch_failed: timeout',
        })).toBe('portal.ekadashiCalendar.providerNotices.liveUnavailable');
    });
});
