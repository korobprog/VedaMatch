export const DATING_TRADITIONS = [
    'ISKCON',
    'Brahma-Madhva-Gaudiya',
    'Sri Sampradaya (Ramanuja)',
    'Brahma Sampradaya (Madhvacharya)',
    'Rudra Sampradaya (Vishnuswami)',
    'Kumara Sampradaya (Nimbarka)',
    'Шри Чайтанья Сарасват Матх',
    'Международное Общество Чистой Бхакти-йоги',
    'Шри Гопинатх Гаудия',
    'Шри Чайтанья Матх',
    'Other'
];

export const YOGA_STYLES = [
    'Bhakti',
    'Hatha',
    'Jnana',
    'Karma',
    'Ashtanga',
    'Kriya',
    'Other'
];

export const GUNAS = [
    'Sattva (Goodness)',
    'Rajas (Passion)',
    'Tamas (Ignorance)',
    'Transcendental'
];

export const IDENTITY_OPTIONS = [
    'Yogi',
    'In Goodness'
];

export const DATING_INTENTIONS = [
    'family',
    'friendship',
    'business',
    'seva',
] as const;

export type DatingIntention = typeof DATING_INTENTIONS[number];

export const DATING_INTENTION_OPTIONS: Array<{ key: DatingIntention; labelKey: string }> = DATING_INTENTIONS.map((key) => ({
    key,
    labelKey: `dating.intentions.${key}`,
}));

export const normalizeDatingIntentions = (value: unknown): DatingIntention[] => {
    const rawValues = Array.isArray(value)
        ? value
        : typeof value === 'string'
            ? value.split(',')
            : [];

    return rawValues
        .map((item) => String(item).trim())
        .filter((item): item is DatingIntention => DATING_INTENTIONS.includes(item as DatingIntention));
};
