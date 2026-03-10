export type EkadashiOrganization = {
    id: 'iskcon' | 'sri_chaitanya_math' | 'pure_bhakti' | 'default_vaishnava' | string;
    name: string;
    description: string;
    source: string;
    sourceUrl: string;
};

export type EkadashiProviderDecision = {
    mode: 'live' | 'fallback' | string;
    source: string;
    reason?: string;
};

export type EkadashiDay = {
    eventId: string;
    date: string;
    organizationId: string;
    organizationName: string;
    organizationScope?: string;
    personSlug?: string;
    observanceType?: 'appearance' | 'disappearance' | string;
    timezone: string;
    city: string;
    country: string;
    eventType: 'ekadashi' | 'mahadvadashi' | 'appearance' | 'disappearance' | string;
    priority: number;
    markerStyleKey?: string;
    isEkadashi: boolean;
    isMahadvadashi: boolean;
    fastStartAt: string | null;
    fastEndAt: string | null;
    paranaStartAt: string | null;
    paranaEndAt: string | null;
    title: string;
    subtitle: string;
    notes: string;
    displayTitle: string;
    displaySubtitle: string;
    observanceNotes: string;
    source: string;
    sourceUrl: string;
    providerDecision?: EkadashiProviderDecision | null;
};

export type EkadashiCalendarResponse = {
    month: string;
    organization: EkadashiOrganization;
    timezone: string;
    city: string;
    country: string;
    days: EkadashiDay[];
    events: EkadashiDay[];
    accuracy: 'timezone_only' | 'city_plus_timezone' | string;
    generatedFrom: string;
    providerDecision: EkadashiProviderDecision;
};

export type EkadashiPushPreference = {
    userId: number;
    enabled: boolean;
    fastStartReminder: boolean;
    paranaReminder: boolean;
    organizationId: string;
    city: string;
    country: string;
    timezone: string;
    useQuietHours: boolean;
    quietStartHour: number;
    quietEndHour: number;
};
