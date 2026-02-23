import apiClient from '../lib/apiClient';
import { getGodModeQueryParams } from './godModeService';

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
    status?: 'online' | 'offline' | 'unknown';
    lastCheckedAt?: string;
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

export interface Playlist {
    ID: number;
    userId: number;
    name: string;
    description?: string;
    isPublic: boolean;
}

export interface PlaylistItem {
    ID: number;
    playlistId: number;
    mediaTrackId: number;
    sortOrder: number;
    track?: MediaTrack;
}

export interface PlaylistListResponse {
    playlists: Playlist[];
    total: number;
    page: number;
    totalPages: number;
}

export interface PlaylistDetailResponse {
    playlist: Playlist;
    items: PlaylistItem[];
}

class MultimediaService {
    async getCategories(type?: string): Promise<MediaCategory[]> {
        const response = await apiClient.get('/multimedia/categories', {
            params: type ? { type } : undefined,
        });
        return response.data;
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
        const godModeParams = await getGodModeQueryParams();
        if (godModeParams.math) params.append('math', godModeParams.math);

        const response = await apiClient.get('/multimedia/tracks', {
            params: Object.fromEntries(params.entries()),
        });
        return response.data;
    }

    async getTrack(id: number): Promise<MediaTrack> {
        const response = await apiClient.get(`/multimedia/tracks/${id}`);
        return response.data;
    }

    async getRadioStations(madh?: string): Promise<RadioStation[]> {
        const params = new URLSearchParams();
        if (madh) params.append('madh', madh);
        const godModeParams = await getGodModeQueryParams();
        if (godModeParams.math) params.append('math', godModeParams.math);
        if (__DEV__) {
            params.append('_t', String(Date.now()));
        }

        const response = await apiClient.get('/multimedia/radio', {
            params: Object.fromEntries(params.entries()),
        });
        return response.data;
    }

    async getRadioStation(id: number): Promise<RadioStation> {
        const response = await apiClient.get(`/multimedia/radio/${id}`);
        return response.data;
    }

    async getTVChannels(madh?: string): Promise<TVChannel[]> {
        const params = new URLSearchParams();
        if (madh) params.append('madh', madh);
        const godModeParams = await getGodModeQueryParams();
        if (godModeParams.math) params.append('math', godModeParams.math);
        const response = await apiClient.get('/multimedia/tv', {
            params: Object.fromEntries(params.entries()),
        });
        return response.data;
    }

    async getTVChannel(id: number): Promise<TVChannel> {
        const response = await apiClient.get(`/multimedia/tv/${id}`);
        return response.data;
    }

    // Series methods
    async getSeries(): Promise<{ series: any[] }> {
        const response = await apiClient.get('/multimedia/series');
        return response.data;
    }

    async getSeriesDetails(id: number): Promise<any> {
        const response = await apiClient.get(`/multimedia/series/${id}`);
        return response.data;
    }

    async getFavorites(page = 1, limit = 20): Promise<{ tracks: MediaTrack[]; total: number }> {
        const response = await apiClient.get('/multimedia/favorites', { params: { page, limit } });
        return response.data;
    }

    async addToFavorites(trackId: number): Promise<void> {
        await apiClient.post(`/multimedia/tracks/${trackId}/favorite`);
    }

    async removeFromFavorites(trackId: number): Promise<void> {
        await apiClient.delete(`/multimedia/tracks/${trackId}/favorite`);
    }

    async suggestContent(data: { title: string; description?: string; url?: string; mediaType: 'audio' | 'video' }): Promise<void> {
        await apiClient.post('/multimedia/suggest', data);
    }

    async getPlaylists(page = 1, limit = 20): Promise<PlaylistListResponse> {
        const response = await apiClient.get('/multimedia/playlists', { params: { page, limit } });
        return response.data;
    }

    async createPlaylist(payload: { name: string; description?: string; isPublic?: boolean }): Promise<Playlist> {
        const response = await apiClient.post('/multimedia/playlists', payload);
        return response.data;
    }

    async getPlaylistDetails(playlistId: number): Promise<PlaylistDetailResponse> {
        const response = await apiClient.get(`/multimedia/playlists/${playlistId}`);
        return response.data;
    }

    async addTrackToPlaylist(playlistId: number, trackId: number): Promise<void> {
        await apiClient.post(`/multimedia/playlists/${playlistId}/items`, { trackId });
    }

    async removeTrackFromPlaylist(playlistId: number, trackId: number): Promise<void> {
        await apiClient.delete(`/multimedia/playlists/${playlistId}/items/${trackId}`);
    }

    formatDuration(seconds: number): string {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

export const multimediaService = new MultimediaService();
