import axios from 'axios';
import { API_PATH } from '../config/api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types for Map Service
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

export interface BoundingBox {
    latMin: number;
    latMax: number;
    lngMin: number;
    lngMax: number;
}

export interface MapMarkersRequest extends BoundingBox {
    categories?: MarkerType[];
    limit?: number;
    userLat?: number;
    userLng?: number;
}

export interface MapMarkersResponse {
    markers: MapMarker[];
    total: number;
    truncatedUsers?: number;
    truncatedShops?: number;
    truncatedAds?: number;
}

export interface MapSummaryResponse {
    clusters: MapCluster[];
    total: number;
}

export interface RouteRequest {
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    mode?: 'walk' | 'drive' | 'bicycle';
}

export interface TileConfig {
    tileUrl: string;
    maxZoom: number;
    tileSize: number;
    retina: boolean;
    attribution: string;
}

export interface MarkerConfig {
    markers: {
        user: { icon: string; color: string };
        shop: { icon: string; color: string };
        ad: { icon: string; color: string };
        cafe: { icon: string; color: string };
    };
    cluster: {
        minSize: number;
        maxSize: number;
        colors: {
            small: string;
            medium: string;
            large: string;
        };
    };
}

class MapService {
    private async getHeaders() {
        let token = await AsyncStorage.getItem('token');
        if (!token || token === 'undefined' || token === 'null') {
            token = await AsyncStorage.getItem('userToken');
        }

        const authHeader = (token && token !== 'undefined' && token !== 'null')
            ? `Bearer ${token}`
            : '';

        return {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Get markers for the visible map region
     */
    async getMarkers(request: MapMarkersRequest): Promise<MapMarkersResponse> {
        try {
            const headers = await this.getHeaders();
            const params: Record<string, string | number> = {
                lat_min: request.latMin,
                lat_max: request.latMax,
                lng_min: request.lngMin,
                lng_max: request.lngMax,
            };

            if (request.categories && request.categories.length > 0) {
                params.categories = request.categories.join(',');
            }
            if (request.limit) {
                params.limit = request.limit;
            }
            if (request.userLat !== undefined) {
                params.user_lat = request.userLat;
            }
            if (request.userLng !== undefined) {
                params.user_lng = request.userLng;
            }

            const response = await axios.get(`${API_PATH}/map/markers`, { params, headers });
            return response.data;
        } catch (error) {
            console.error('Error fetching map markers:', error);
            throw error;
        }
    }

    /**
     * Get cluster summary by cities for zoomed-out view
     */
    async getSummary(): Promise<MapSummaryResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/map/summary`, { headers });
            return response.data;
        } catch (error) {
            console.error('Error fetching map summary:', error);
            throw error;
        }
    }

    /**
     * Get tile configuration (URL template, zoom levels, etc.)
     */
    async getTileConfig(): Promise<TileConfig> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/map/config`, { headers });
            return response.data;
        } catch (error) {
            console.error('Error fetching tile config:', error);
            throw error;
        }
    }

    /**
     * Get route between two points via Geoapify
     */
    async getRoute(request: RouteRequest): Promise<any> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(`${API_PATH}/map/route`, request, { headers });
            return response.data;
        } catch (error) {
            console.error('Error fetching route:', error);
            throw error;
        }
    }

    /**
     * Autocomplete location search
     */
    async autocomplete(text: string, lat?: number, lng?: number, limit = 5): Promise<any> {
        try {
            const headers = await this.getHeaders();
            const params: Record<string, string | number> = { text };
            if (lat !== undefined) params.lat = lat;
            if (lng !== undefined) params.lng = lng;
            params.limit = limit;

            const response = await axios.get(`${API_PATH}/map/autocomplete`, { params, headers });
            return response.data;
        } catch (error) {
            console.error('Error in autocomplete:', error);
            throw error;
        }
    }

    /**
     * Calculate bounding box from region
     */
    regionToBoundingBox(region: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    }): BoundingBox {
        return {
            latMin: region.latitude - region.latitudeDelta / 2,
            latMax: region.latitude + region.latitudeDelta / 2,
            lngMin: region.longitude - region.longitudeDelta / 2,
            lngMax: region.longitude + region.longitudeDelta / 2,
        };
    }

    /**
     * Get marker icon based on type
     */
    getMarkerIcon(type: MarkerType): string {
        const icons: Record<MarkerType, string> = {
            user: 'account',
            shop: 'store',
            ad: 'tag',
            cafe: 'coffee',
        };
        return icons[type] || 'map-marker';
    }

    /**
     * Get marker color based on type
     */
    getMarkerColor(type: MarkerType): string {
        const colors: Record<MarkerType, string> = {
            user: '#7C3AED', // Purple
            shop: '#059669', // Green
            ad: '#DC2626', // Red
            cafe: '#EA580C', // Orange
        };
        return colors[type] || '#6B7280';
    }

    /**
     * Format distance for display
     */
    formatDistance(distanceKm: number): string {
        if (distanceKm < 1) {
            return `${Math.round(distanceKm * 1000)} м`;
        }
        return `${distanceKm.toFixed(1)} км`;
    }

    /**
     * Check if zoom level requires clustering
     */
    shouldShowClusters(latitudeDelta: number): boolean {
        // Show clusters when zoomed out (delta > 5 degrees ~ country level)
        return latitudeDelta > 5;
    }
}

export const mapService = new MapService();
