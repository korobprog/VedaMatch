import { canAccessVedicCalendarRole, findCalendarEventsForCell, findEkadashiDayForCell, getCalendarGridDays, getEkadashiProviderDetailKey, getEkadashiProviderNoticeKey } from '../../utils/ekadashiCalendar';

describe('ekadashiCalendar utils', () => {
    it('builds calendar grid for monday-first layout', () => {
        const days = getCalendarGridDays(new Date(2026, 2, 1));
        expect(days[0]).toBe(null);
        expect(days).toContain(31);
    });

    it('finds ekadashi day by month cell', () => {
        const result = findEkadashiDayForCell([
            {
                eventId: 'iskcon:2026-03-14:ekadashi',
                date: '2026-03-14',
                organizationId: 'iskcon',
                organizationName: 'ISKCON',
                organizationScope: 'iskcon',
                timezone: 'Asia/Vladivostok',
                city: 'Vladivostok',
                country: 'Russia',
                eventType: 'ekadashi',
                priority: 2,
                markerStyleKey: 'ekadashi',
                isEkadashi: true,
                isMahadvadashi: false,
                fastStartAt: null,
                fastEndAt: null,
                paranaStartAt: null,
                paranaEndAt: null,
                title: 'Ekadashi',
                subtitle: 'ISKCON observance',
                notes: '',
                displayTitle: 'Ekadashi',
                displaySubtitle: 'ISKCON observance',
                observanceNotes: '',
                source: 'fallback',
                sourceUrl: '',
            },
        ], new Date(2026, 2, 1), 14);
        expect(result?.organizationId).toBe('iskcon');
    });

    it('returns multiple events for a single calendar cell ordered by priority', () => {
        const result = findCalendarEventsForCell([
            {
                eventId: 'iskcon:2026-03-14:bhaktivinoda',
                date: '2026-03-14',
                organizationId: 'iskcon',
                organizationName: 'ISKCON',
                organizationScope: 'iskcon',
                personSlug: 'bhaktivinoda-thakura',
                observanceType: 'appearance',
                timezone: 'Asia/Vladivostok',
                city: 'Vladivostok',
                country: 'Russia',
                eventType: 'appearance',
                priority: 3,
                markerStyleKey: 'appearance',
                isEkadashi: false,
                isMahadvadashi: false,
                fastStartAt: null,
                fastEndAt: null,
                paranaStartAt: null,
                paranaEndAt: null,
                title: 'Appearance of Srila Bhaktivinoda Thakura',
                subtitle: 'ISKCON commemoration',
                notes: '',
                displayTitle: 'Appearance of Srila Bhaktivinoda Thakura',
                displaySubtitle: 'ISKCON commemoration',
                observanceNotes: '',
                source: 'curated_commemorations',
                sourceUrl: '',
            },
            {
                eventId: 'iskcon:2026-03-14:ekadashi',
                date: '2026-03-14',
                organizationId: 'iskcon',
                organizationName: 'ISKCON',
                organizationScope: 'iskcon',
                timezone: 'Asia/Vladivostok',
                city: 'Vladivostok',
                country: 'Russia',
                eventType: 'ekadashi',
                priority: 2,
                markerStyleKey: 'ekadashi',
                isEkadashi: true,
                isMahadvadashi: false,
                fastStartAt: null,
                fastEndAt: null,
                paranaStartAt: null,
                paranaEndAt: null,
                title: 'Ekadashi',
                subtitle: 'ISKCON observance',
                notes: '',
                displayTitle: 'Ekadashi',
                displaySubtitle: 'ISKCON observance',
                observanceNotes: '',
                source: 'fallback',
                sourceUrl: '',
            },
        ], new Date(2026, 2, 1), 14);
        expect(result).toHaveLength(2);
        expect(result[0]?.eventType).toBe('ekadashi');
    });

    it('gates ekadashi mode to devotee, internal admin roles, and pro bypass', () => {
        expect(canAccessVedicCalendarRole('devotee')).toBe(true);
        expect(canAccessVedicCalendarRole('admin')).toBe(true);
        expect(canAccessVedicCalendarRole('superadmin')).toBe(true);
        expect(canAccessVedicCalendarRole('user', { godModeEnabled: true })).toBe(true);
        expect(canAccessVedicCalendarRole('user', { currentPlan: 'pro_monthly' })).toBe(true);
        expect(canAccessVedicCalendarRole('user')).toBe(false);
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

    it('maps db provider modes to localized notice keys', () => {
        expect(getEkadashiProviderNoticeKey({
            mode: 'db_curated',
            source: 'calendar_db',
        })).toBe('portal.ekadashiCalendar.providerNotices.dbCurated');
        expect(getEkadashiProviderNoticeKey({
            mode: 'db_missing',
            source: 'calendar_db',
            reason: 'location_required',
        })).toBe('portal.ekadashiCalendar.providerNotices.cityRequiredForImport');
        expect(getEkadashiProviderNoticeKey({
            mode: 'db_missing',
            source: 'calendar_db',
            reason: 'no_published_data',
        })).toBe('portal.ekadashiCalendar.providerNotices.dbMissing');
        expect(getEkadashiProviderNoticeKey({
            mode: 'db_imported',
            source: 'calendar_db',
        })).toBeNull();
        expect(getEkadashiProviderDetailKey({
            mode: 'db_imported',
            source: 'calendar_db',
        })).toBe('portal.ekadashiCalendar.providerNotices.dbImported');
    });
});
