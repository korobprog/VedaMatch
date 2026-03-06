import type { EkadashiDay, EkadashiOrganization, EkadashiProviderDecision } from '../types/ekadashi';

export const EKADASHI_DEFAULT_ORGANIZATION_ID = 'iskcon';

export const EKADASHI_FALLBACK_ORGANIZATIONS: EkadashiOrganization[] = [
    { id: 'iskcon', name: 'ISKCON', description: 'ISKCON observance profile', source: 'fallback_aggregator', sourceUrl: 'https://vaishnavacalendar.org' },
    { id: 'sri_chaitanya_math', name: 'Sri Chaitanya Math', description: 'Sri Chaitanya Math observance profile', source: 'fallback_aggregator', sourceUrl: 'https://www.gosai.com/calendar/' },
    { id: 'pure_bhakti', name: 'Pure Bhakti', description: 'Pure Bhakti observance profile', source: 'fallback_aggregator', sourceUrl: 'https://www.gosai.com/calendar/' },
    { id: 'default_vaishnava', name: 'Default Vaishnava', description: 'Default vaishnava observance profile', source: 'fallback_aggregator', sourceUrl: 'https://gcal.app' },
];

export const isDevoteeRole = (role?: string | null): boolean => String(role || '').trim().toLowerCase() === 'devotee';

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

export const findEkadashiDayForCell = (
    days: EkadashiDay[],
    monthDate: Date,
    dayNumber: number | null,
): EkadashiDay | null => {
    if (!dayNumber) return null;
    const iso = [
        monthDate.getFullYear(),
        String(monthDate.getMonth() + 1).padStart(2, '0'),
        String(dayNumber).padStart(2, '0'),
    ].join('-');
    return days.find((item) => item.date === iso) || null;
};

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
    if (!providerDecision || providerDecision.mode !== 'fallback') {
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
