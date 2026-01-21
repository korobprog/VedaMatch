// Map-related types

export type MarkerType = 'user' | 'shop' | 'ad' | 'cafe';

export interface MapMarker {
    id: number;
    type: MarkerType;
    title: string;
    subtitle?: string;
    latitude: number;
    longitude: number;
    avatarUrl?: string;
    category?: string;
    rating?: number;
    distance?: number;
    data?: Record<string, any>;
}

export interface MapCluster {
    city: string;
    latitude: number;
    longitude: number;
    userCount: number;
    shopCount: number;
    adCount: number;
    cafeCount: number;
    totalCount: number;
}

export interface MapRegion {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
}

export interface BoundingBox {
    latMin: number;
    latMax: number;
    lngMin: number;
    lngMax: number;
}

export interface RoutePoint {
    latitude: number;
    longitude: number;
}

export interface RouteInfo {
    distance: number; // meters
    duration: number; // seconds
    geometry: RoutePoint[];
}

export interface MapFilters {
    showUsers: boolean;
    showShops: boolean;
    showAds: boolean;
    showCafes?: boolean;
}

export interface MarkerDetailData {
    // User-specific
    yatra?: string;
    datingEnabled?: boolean;

    // Shop-specific
    description?: string;
    productsCount?: number;
    reviewsCount?: number;

    // Ad-specific
    adType?: 'looking' | 'offering';
    price?: number;
    currency?: string;
    isFree?: boolean;
}

export interface TileConfig {
    tileUrl: string;
    maxZoom: number;
    tileSize: number;
    retina: boolean;
    attribution: string;
}

// Navigation params for map screen
export interface MapScreenParams {
    focusMarker?: {
        id: number;
        type: MarkerType;
        latitude: number;
        longitude: number;
    };
    filters?: MapFilters;
    searchQuery?: string;
}

// Bottom sheet content types
export type BottomSheetContent =
    | { type: 'marker'; marker: MapMarker }
    | { type: 'route'; route: RouteInfo; destination: MapMarker }
    | { type: 'search'; results: any[] }
    | null;
