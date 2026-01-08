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
