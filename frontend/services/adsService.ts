import apiClient from '../lib/apiClient';
import {
    Ad,
    AdFilters,
    AdFormData,
    CategoryConfig,
    FestivalCalendarResponse,
    FestivalFacetsResponse,
    FestivalFeedFilters,
    FestivalFilters,
    FestivalListResponse
} from '../types/ads';
import { getGodModeQueryParams } from './godModeService';

const toDayStart = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
const toDayEnd = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const getPeriodRange = (period: FestivalFeedFilters['period']) => {
    const now = new Date();
    switch (period) {
        case 'today':
            return { from: toDayStart(now), to: toDayEnd(now) };
        case '7d': {
            const from = toDayStart(now);
            const to = new Date(from);
            to.setDate(to.getDate() + 7);
            return { from, to };
        }
        case '30d': {
            const from = toDayStart(now);
            const to = new Date(from);
            to.setDate(to.getDate() + 30);
            return { from, to };
        }
        case 'upcoming':
        default:
            return { from: toDayStart(now), to: null as Date | null };
    }
};

const mapAdToFestivalItem = (ad: Ad) => {
    const startAt = ad.festivalStartAt || ad.CreatedAt;
    const photoUrl = ad.photos?.[0]?.photoUrl;
    return {
        id: `ad:${ad.ID}`,
        source: 'ad' as const,
        startAt,
        endAt: ad.festivalEndAt,
        timezone: ad.festivalTimezone || 'Europe/Moscow',
        title: ad.title,
        description: ad.description,
        city: ad.city,
        venueName: ad.venueName,
        venueAddress: ad.venueAddress,
        venueLat: ad.venueLat,
        venueLng: ad.venueLng,
        organizerName: ad.organizerName || ad.author?.spiritualName || ad.author?.karmicName,
        adId: ad.ID,
        preachers: ad.resolvedPreachers || [],
        photoUrl,
    };
};

class AdsService {
    async getAds(filters?: AdFilters): Promise<{ ads: Ad[], total: number, page: number, totalPages: number }> {
        try {
            const godModeParams = await getGodModeQueryParams();
            const response = await apiClient.get('/ads', {
                params: { ...(filters || {}), ...godModeParams },
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching ads:', error);
            throw error;
        }
    }

    async getAd(id: number): Promise<Ad> {
        try {
            const response = await apiClient.get(`/ads/${id}`);
            return response.data?.ad || response.data;
        } catch (error) {
            console.error(`Error fetching ad ${id}:`, error);
            throw error;
        }
    }

    async getFestivalCalendar(month: string, filters: Omit<FestivalFilters, 'page' | 'limit'> = {}): Promise<FestivalCalendarResponse> {
        try {
            const response = await apiClient.get('/ads/festivals/calendar', {
                params: {
                    month,
                    ...filters,
                },
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async getFestivalsByDate(date: string, filters: FestivalFilters = {}): Promise<FestivalListResponse> {
        try {
            const response = await apiClient.get('/ads/festivals', {
                params: {
                    date,
                    ...filters,
                },
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async getFestivalFeed(filters: FestivalFeedFilters = {}): Promise<FestivalListResponse> {
        try {
            const response = await apiClient.get('/ads/festivals/feed', {
                params: {
                    ...filters,
                },
            });
            return response.data;
        } catch (error: any) {
            if (error?.response?.status === 404) {
                const adsResponse = await this.getAds({
                    category: 'events',
                    status: 'active',
                    search: filters.search,
                    city: filters.city,
                    page: filters.page || 1,
                    limit: Math.max(filters.limit || 20, 20),
                });

                const source = filters.source || 'all';
                const period = filters.period || 'upcoming';
                const { from, to } = getPeriodRange(period);

                const filtered = (adsResponse.ads || [])
                    .map(mapAdToFestivalItem)
                    .filter((item) => {
                        if (source !== 'all' && item.source !== source) {
                            return false;
                        }
                        const start = new Date(item.startAt);
                        if (Number.isNaN(start.getTime())) {
                            return false;
                        }
                        if (start < from) {
                            return false;
                        }
                        if (to && start > to) {
                            return false;
                        }
                        return true;
                    })
                    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

                const page = filters.page || 1;
                const limit = filters.limit || 20;
                const offset = (page - 1) * limit;
                const items = filtered.slice(offset, offset + limit);

                return {
                    items,
                    total: filtered.length,
                    page,
                    totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
                };
            }

            if (error?.response?.status === 400 || error?.response?.status === 422) {
                const today = new Date().toISOString().slice(0, 10);
                const fallbackResponse = await apiClient.get('/ads/festivals', {
                    params: {
                        date: today,
                        city: filters.city,
                        search: filters.search,
                        preacherChannelId: filters.preacherChannelId,
                        includeSadhu: filters.includeSadhu,
                        myOnly: filters.myOnly,
                        page: filters.page,
                        limit: filters.limit,
                    },
                });
                return fallbackResponse.data;
            }
            throw error;
        }
    }

    async getFestivalFacets(filters: Omit<FestivalFeedFilters, 'page' | 'limit' | 'city' | 'myOnly' | 'preacherChannelId'> = {}): Promise<FestivalFacetsResponse> {
        try {
            const response = await apiClient.get('/ads/festivals/facets', {
                params: {
                    ...filters,
                },
            });
            return response.data;
        } catch (error: any) {
            if (error?.response?.status === 404) {
                const citiesResponse = await apiClient.get('/ads/cities');
                const cities = Array.isArray(citiesResponse.data)
                    ? citiesResponse.data.map((value: string) => ({ value, count: 0 }))
                    : [];
                return { cities };
            }
            throw error;
        }
    }

    async createAd(data: AdFormData): Promise<{ id: number, message: string }> {
        try {
            const response = await apiClient.post('/ads', data);
            return response.data;
        } catch (error) {
            console.error('Error creating ad:', error);
            throw error;
        }
    }

    async updateAd(id: number, data: AdFormData): Promise<void> {
        try {
            await apiClient.put(`/ads/${id}`, data);
        } catch (error) {
            console.error(`Error updating ad ${id}:`, error);
            throw error;
        }
    }

    async deleteAd(id: number): Promise<void> {
        try {
            await apiClient.delete(`/ads/${id}`);
        } catch (error) {
            console.error(`Error deleting ad ${id}:`, error);
            throw error;
        }
    }

    async toggleFavorite(id: number): Promise<{ isFavorite: boolean }> {
        try {
            const response = await apiClient.post(`/ads/${id}/favorite`, {});
            return response.data;
        } catch (error) {
            console.error(`Error toggling favorite for ad ${id}:`, error);
            throw error;
        }
    }

    async getFavorites(): Promise<Ad[]> {
        try {
            const response = await apiClient.get('/ads/user/favorites');
            return response.data;
        } catch (error) {
            console.error('Error fetching favorites:', error);
            throw error;
        }
    }

    async getMyAds(): Promise<Ad[]> {
        try {
            const response = await apiClient.get('/ads/user/my');
            return response.data;
        } catch (error) {
            console.error('Error fetching my ads:', error);
            throw error;
        }
    }

    async getCategories(): Promise<CategoryConfig[]> {
        try {
            const response = await apiClient.get('/ads/categories');
            return response.data;
        } catch (error) {
            console.error('Error fetching categories:', error);
            throw error;
        }
    }

    async getCities(): Promise<string[]> {
        try {
            const response = await apiClient.get('/ads/cities');
            return response.data;
        } catch (error) {
            console.error('Error fetching cities:', error);
            throw error;
        }
    }

    async reportAd(id: number, reason: string, comment?: string): Promise<void> {
        try {
            await apiClient.post(`/ads/${id}/report`, { reason, comment });
        } catch (error) {
            console.error(`Error reporting ad ${id}:`, error);
            throw error;
        }
    }

    async uploadPhoto(asset: any): Promise<string> {
        try {
            const formData = new FormData();
            formData.append('photo', {
                uri: asset.uri,
                type: asset.type || 'image/jpeg',
                name: asset.fileName || `photo_${Date.now()}.jpg`,
            } as any);

            const response = await apiClient.post<{ url: string }>('/ads/upload-photo', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data.url;
        } catch (error) {
            console.error('Error uploading ad photo:', error);
            throw error;
        }
    }

    async contactSeller(id: number, method: 'call' | 'message'): Promise<{ roomId?: number, roomName?: string, message: string }> {
        try {
            const response = await apiClient.post(`/ads/${id}/contact`, { method });
            return response.data;
        } catch (error: any) {
            console.error(`Error contacting seller for ad ${id}:`, error);
            if (error.response) {
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
            }
            throw error;
        }
    }
}

export const adsService = new AdsService();
