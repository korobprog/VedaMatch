import type { EkadashiDay, EkadashiOrganization, EkadashiProviderDecision } from '../types/ekadashi';

export { canAccessVedicCalendarRole } from '../types/portal';

export const EKADASHI_DEFAULT_ORGANIZATION_ID = 'iskcon';

export const EKADASHI_FALLBACK_ORGANIZATIONS: EkadashiOrganization[] = [
    { id: 'iskcon', name: 'ISKCON', description: 'ISKCON observance profile', source: 'fallback_aggregator', sourceUrl: 'https://vaishnavacalendar.org' },
    { id: 'sri_chaitanya_math', name: 'Sri Chaitanya Math', description: 'Sri Chaitanya Math observance profile', source: 'fallback_aggregator', sourceUrl: 'https://www.scsmath.com/events/calendar/index.html' },
    { id: 'pure_bhakti', name: 'Pure Bhakti', description: 'Pure Bhakti observance profile', source: 'fallback_aggregator', sourceUrl: 'https://gosai.com/calendar' },
    { id: 'default_vaishnava', name: 'Default Vaishnava', description: 'Default vaishnava observance profile', source: 'fallback_aggregator', sourceUrl: 'https://gcal.app' },
];

export const getCalendarGridDays = (date: Date): Array<number | null> => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const days: Array<number | null> = [];
    for (let i = 0; i < startDay; i += 1) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i += 1) days.push(i);
    return days;
};

const buildIsoDate = (monthDate: Date, dayNumber: number | null): string | null => {
    if (!dayNumber) return null;
    return [
        monthDate.getFullYear(),
        String(monthDate.getMonth() + 1).padStart(2, '0'),
        String(dayNumber).padStart(2, '0'),
    ].join('-');
};

export const findCalendarEventsForCell = (
    events: EkadashiDay[],
    monthDate: Date,
    dayNumber: number | null,
): EkadashiDay[] => {
    const iso = buildIsoDate(monthDate, dayNumber);
    if (!iso) return [];
    return events
        .filter((item) => item.date === iso)
        .sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return a.title.localeCompare(b.title);
        });
};

export const findEkadashiDayForCell = (
    events: EkadashiDay[],
    monthDate: Date,
    dayNumber: number | null,
): EkadashiDay | null => findCalendarEventsForCell(events, monthDate, dayNumber)[0] || null;

export const resolveOrganizationOption = (organizationId?: string | null): EkadashiOrganization => (
    EKADASHI_FALLBACK_ORGANIZATIONS.find((item) => item.id === organizationId) || EKADASHI_FALLBACK_ORGANIZATIONS[0]
);

export const formatEkadashiDateTime = (value?: string | null, locale = 'en-US'): string | null => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

export const getEkadashiProviderNoticeKey = (providerDecision?: EkadashiProviderDecision | null): string | null => {
    if (!providerDecision) {
        return null;
    }

    if (providerDecision.mode === 'db_imported') {
        return null;
    }

    if (providerDecision.mode === 'db_curated') {
        return 'portal.ekadashiCalendar.providerNotices.dbCurated';
    }

    if (providerDecision.mode === 'db_missing') {
        if (providerDecision.reason === 'location_required') {
            return 'portal.ekadashiCalendar.providerNotices.cityRequiredForImport';
        }
        if (providerDecision.reason === 'import_queued') {
            return 'portal.ekadashiCalendar.providerNotices.importQueued';
        }
        if (providerDecision.reason === 'import_running') {
            return 'portal.ekadashiCalendar.providerNotices.importRunning';
        }
        return 'portal.ekadashiCalendar.providerNotices.dbMissing';
    }

    if (providerDecision.mode !== 'fallback') {
        return null;
    }

    switch (providerDecision.reason) {
        case 'city_required_for_iskcon_live_provider':
            return 'portal.ekadashiCalendar.providerNotices.cityRequiredForLive';
        case 'no_live_source_configured':
            return 'portal.ekadashiCalendar.providerNotices.noLiveSource';
        default:
            if (providerDecision.reason?.includes('_live_fetch_failed')) {
                return 'portal.ekadashiCalendar.providerNotices.liveUnavailable';
            }
            return 'portal.ekadashiCalendar.providerNotices.fallbackActive';
    }
};

export const getEkadashiProviderDetailKey = (providerDecision?: EkadashiProviderDecision | null): string | null => {
    if (!providerDecision) {
        return null;
    }
    if (providerDecision.mode === 'db_imported') {
        return 'portal.ekadashiCalendar.providerNotices.dbImported';
    }
    return getEkadashiProviderNoticeKey(providerDecision);
};

export const getCalendarEventLabelKey = (eventType?: string | null): string => {
    switch (eventType) {
        case 'mahadvadashi':
            return 'portal.ekadashiCalendar.eventTypes.mahadvadashi';
        case 'appearance':
            return 'portal.ekadashiCalendar.eventTypes.appearance';
        case 'disappearance':
            return 'portal.ekadashiCalendar.eventTypes.disappearance';
        case 'ekadashi':
        default:
            return 'portal.ekadashiCalendar.eventTypes.ekadashi';
    }
};

export const getCalendarEventMarkerColor = (event: Pick<EkadashiDay, 'eventType' | 'isMahadvadashi' | 'markerStyleKey'>): string => {
    const marker = event.markerStyleKey || event.eventType;
    switch (marker) {
        case 'mahadvadashi':
            return '#F59E0B';
        case 'appearance':
            return '#2563EB';
        case 'disappearance':
            return '#7C3AED';
        case 'ekadashi':
        default:
            return event.isMahadvadashi ? '#F59E0B' : '#D4AF37';
    }
};

export const getCalendarEventBackgroundColor = (event: Pick<EkadashiDay, 'eventType' | 'isMahadvadashi' | 'markerStyleKey'>): string => {
    const marker = event.markerStyleKey || event.eventType;
    switch (marker) {
        case 'mahadvadashi':
            return 'rgba(245,158,11,0.22)';
        case 'appearance':
            return 'rgba(37,99,235,0.18)';
        case 'disappearance':
            return 'rgba(124,58,237,0.18)';
        case 'ekadashi':
        default:
            return event.isMahadvadashi ? 'rgba(245,158,11,0.22)' : 'rgba(212,175,55,0.22)';
    }
};
