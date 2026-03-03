export type AdType = 'looking' | 'offering' | 'my';

export type AdCategory =
    | 'work'
    | 'real_estate'
    | 'spiritual'
    | 'education'
    | 'goods'
    | 'food'
    | 'transport'
    | 'events'
    | 'services'
    | 'charity'
    | 'yoga_wellness'
    | 'ayurveda'
    | 'housing'
    | 'furniture';

export type AdStatus = 'pending' | 'active' | 'rejected' | 'archived';

export interface AdPhoto {
    ID: number;
    adId: number;
    photoUrl: string;
    position: number;
}

export interface AdAuthor {
    id: number;
    spiritualName: string;
    karmicName: string;
    avatarUrl: string;
    city: string;
    memberSince?: string;
    adsCount?: number;
    isVerified?: boolean;
}

export interface FestivalPreacher {
    channelId: number;
    ownerId: number;
    name: string;
    avatarUrl?: string;
}

export interface FestivalItem {
    id: string; // ad:<id> or sadhu:<serviceId>:<occurrenceTs>
    source: 'ad' | 'sadhu_service';
    startAt: string;
    endAt?: string;
    timezone: string;
    title: string;
    description?: string;
    city?: string;
    venueName?: string;
    venueAddress?: string;
    organizerName?: string;
    adId?: number;
    serviceId?: number;
    channelId?: number;
    preachers: FestivalPreacher[];
    photoUrl?: string;
}

export interface FestivalCalendarDay {
    date: string; // YYYY-MM-DD
    count: number;
}

export interface FestivalCalendarResponse {
    month: string; // YYYY-MM
    days: FestivalCalendarDay[];
}

export interface FestivalListResponse {
    items: FestivalItem[];
    total: number;
    page: number;
    totalPages: number;
}

export interface Ad {
    ID: number;
    userId: number;
    adType: AdType;
    category: AdCategory;
    title: string;
    description: string;
    price?: number;
    currency: string;
    isNegotiable: boolean;
    isFree: boolean;
    city: string;
    district?: string;
    photos: AdPhoto[];
    showProfile: boolean;
    phone?: string;
    email?: string;
    status: AdStatus;
    viewsCount: number;
    favoritesCount: number;
    isFavorite?: boolean; // Added on frontend
    author?: AdAuthor;    // Added on frontend
    festivalStartAt?: string;
    festivalEndAt?: string;
    festivalTimezone?: string;
    organizerName?: string;
    organizerContact?: string;
    venueName?: string;
    venueAddress?: string;
    venueLat?: number;
    venueLng?: number;
    preacherChannelIds?: number[];
    linkedServiceIds?: number[];
    resolvedPreachers?: FestivalPreacher[];
    CreatedAt: string;
    expiresAt: string;
}

export interface AdFormData {
    adType: AdType;
    category: AdCategory;
    title: string;
    description: string;
    price?: number;
    currency?: string;
    isNegotiable?: boolean;
    isFree?: boolean;
    city: string;
    district?: string;
    photos?: string[]; // URLs
    showProfile: boolean;
    phone?: string;
    email?: string;
    festivalStartAt?: string;
    festivalEndAt?: string;
    festivalTimezone?: string;
    organizerName?: string;
    organizerContact?: string;
    venueName?: string;
    venueAddress?: string;
    venueLat?: number;
    venueLng?: number;
    preacherChannelIds?: number[];
    linkedServiceIds?: number[];
}

export interface AdFilters {
    adType?: AdType;
    category?: AdCategory;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    isFree?: boolean;
    userId?: number;
    status?: AdStatus;
    search?: string;
    sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
    page?: number;
    limit?: number;
}

export interface CategoryConfig {
    id: AdCategory;
    emoji: string;
    label: {
        ru: string;
        en: string;
    };
}

export interface FestivalFilters {
    city?: string;
    search?: string;
    preacherChannelId?: number;
    includeSadhu?: boolean;
    myOnly?: boolean;
    page?: number;
    limit?: number;
}
