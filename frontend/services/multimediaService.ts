import { API_PATH } from '../config/api.config';
import { getAuthHeaders } from './contactService';

export interface MediaTrack {
    ID: number;
    title: string;
    artist: string;
    album?: string;
    description?: string;
    duration: number;
    mediaType: 'audio' | 'video';
    url: string;
    thumbnailUrl?: string;
    categoryId?: number;
    madh?: string;
    yogaStyle?: string;
    language?: string;
    viewCount: number;
    likeCount: number;
    isFeatured: boolean;
    isActive: boolean;
}

export interface RadioStation {
    ID: number;
    name: string;
    description?: string;
    streamUrl: string;
    logoUrl?: string;
    madh?: string;
    isLive: boolean;
    viewerCount: number;
    status: 'online' | 'offline' | 'unknown';
    lastCheckedAt?: string;
}

export interface TVChannel {
    ID: number;
    name: string;
    description?: string;
    streamUrl: string;
    logoUrl?: string;
    streamType: 'youtube' | 'vimeo' | 'rtmp';
    isLive: boolean;
    viewerCount: number;
}

export interface MediaCategory {
    ID: number;
    name: string;
    slug: string;
    type: string;
    description?: string;
    iconUrl?: string;
}

export interface TrackFilter {
    type?: 'audio' | 'video';
    categoryId?: number;
    madh?: string;
    yogaStyle?: string;
    language?: string;
    search?: string;
    featured?: boolean;
    page?: number;
    limit?: number;
}

export interface TrackListResponse {
    tracks: MediaTrack[];
    total: number;
    page: number;
    totalPages: number;
}

class MultimediaService {
    private baseUrl = API_PATH;

    async getCategories(type?: string): Promise<MediaCategory[]> {
        const params = type ? `?type=${type}` : '';
        const response = await fetch(`${this.baseUrl}/multimedia/categories${params}`);
        if (!response.ok) throw new Error('Failed to fetch categories');
        return response.json();
    }

    async getTracks(filter: TrackFilter = {}): Promise<TrackListResponse> {
        const params = new URLSearchParams();
        if (filter.type) params.append('type', filter.type);
        if (filter.categoryId) params.append('categoryId', String(filter.categoryId));
        if (filter.madh) params.append('madh', filter.madh);
        if (filter.yogaStyle) params.append('yogaStyle', filter.yogaStyle);
        if (filter.language) params.append('language', filter.language);
        if (filter.search) params.append('search', filter.search);
        if (filter.featured) params.append('featured', 'true');
        if (filter.page) params.append('page', String(filter.page));
        if (filter.limit) params.append('limit', String(filter.limit));

        const response = await fetch(`${this.baseUrl}/multimedia/tracks?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch tracks');
        return response.json();
    }

    async getTrack(id: number): Promise<MediaTrack> {
        const response = await fetch(`${this.baseUrl}/multimedia/tracks/${id}`);
        if (!response.ok) throw new Error('Failed to fetch track');
        return response.json();
    }

    async getRadioStations(madh?: string): Promise<RadioStation[]> {
        const params = new URLSearchParams();
        if (madh) params.append('madh', madh);
        params.append('_t', String(Date.now())); // Cache busting

        const response = await fetch(`${this.baseUrl}/multimedia/radio?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch radio stations');
        return response.json();
    }

    async getRadioStation(id: number): Promise<RadioStation> {
        const response = await fetch(`${this.baseUrl}/multimedia/radio/${id}`);
        if (!response.ok) throw new Error('Failed to fetch radio station');
        return response.json();
    }

    async getTVChannels(madh?: string): Promise<TVChannel[]> {
        const params = madh ? `?madh=${madh}` : '';
        const response = await fetch(`${this.baseUrl}/multimedia/tv${params}`);
        if (!response.ok) throw new Error('Failed to fetch TV channels');
        return response.json();
    }

    async getTVChannel(id: number): Promise<TVChannel> {
        const response = await fetch(`${this.baseUrl}/multimedia/tv/${id}`);
        if (!response.ok) throw new Error('Failed to fetch TV channel');
        return response.json();
    }

    // Series methods
    async getSeries(): Promise<{ series: any[] }> {
        const response = await fetch(`${this.baseUrl}/multimedia/series`);
        if (!response.ok) throw new Error('Failed to fetch series');
        return response.json();
    }

    async getSeriesDetails(id: number): Promise<any> {
        const response = await fetch(`${this.baseUrl}/multimedia/series/${id}`);
        if (!response.ok) throw new Error('Failed to fetch series details');
        return response.json();
    }

    async getFavorites(page = 1, limit = 20): Promise<{ tracks: MediaTrack[]; total: number }> {
        const headers = await getAuthHeaders();
        const response = await fetch(
            `${this.baseUrl}/multimedia/favorites?page=${page}&limit=${limit}`,
            { headers }
        );
        if (!response.ok) throw new Error('Failed to fetch favorites');
        return response.json();
    }

    async addToFavorites(trackId: number): Promise<void> {
        const headers = await getAuthHeaders();
        const response = await fetch(`${this.baseUrl}/multimedia/tracks/${trackId}/favorite`, {
            method: 'POST',
            headers,
        });
        if (!response.ok) throw new Error('Failed to add to favorites');
    }

    async removeFromFavorites(trackId: number): Promise<void> {
        const headers = await getAuthHeaders();
        const response = await fetch(`${this.baseUrl}/multimedia/tracks/${trackId}/favorite`, {
            method: 'DELETE',
            headers,
        });
        if (!response.ok) throw new Error('Failed to remove from favorites');
    }

    async suggestContent(data: { title: string; description?: string; url?: string; mediaType: 'audio' | 'video' }): Promise<void> {
        const headers = await getAuthHeaders();
        const response = await fetch(`${this.baseUrl}/multimedia/suggest`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to submit suggestion');
    }

    formatDuration(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

export const multimediaService = new MultimediaService();
