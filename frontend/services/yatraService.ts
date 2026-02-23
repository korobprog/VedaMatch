import apiClient from '../lib/apiClient';
import { API_PATH } from '../config/api.config';
import {
    Yatra, YatraFilters, YatraCreateData, YatraJoinData,
    YatraListResponse, MyYatrasResponse, YatraParticipant,
    Shelter, ShelterFilters, ShelterCreateData, ShelterListResponse,
    ShelterReview, ShelterReviewCreateData,
    YatraReview, YatraReviewCreateData, YatraPublishData
} from '../types/yatra';
import { yatraCacheService } from './yatraCacheService';
import { getGodModeQueryParams } from './godModeService';

class YatraService {
    getImageUrl(path: string | null | undefined): string {
        if (!path) {
            return 'https://via.placeholder.com/400x200?text=No+Image';
        }

        if (path.startsWith('http')) {
            return path;
        }

        // Remove /api from the end of API_PATH to get the base URL
        const baseUrl = API_PATH.replace(/\/api\/?$/, '');
        const separator = path.startsWith('/') ? '' : '/';
        const finalUrl = `${baseUrl}${separator}${path}${__DEV__ ? `?t=${Date.now()}` : ''}`;
        return finalUrl;
    }
    // ==================== YATRA ENDPOINTS ====================

    async getYatras(filters?: YatraFilters): Promise<YatraListResponse> {
        try {
            const godModeParams = await getGodModeQueryParams();
            const response = await apiClient.get(`/yatra`, { params: { ...(filters || {}), ...godModeParams } });
            const data = response.data;
            const result = {
                yatras: (data.yatras || []).map(this.normalizeYatra),
                total: data.total ?? 0,
                page: data.page ?? 1,
            };
            // Cache the result for offline use
            if (!filters || Object.keys(filters).length === 0) {
                await yatraCacheService.cacheYatrasList(result);
            }
            return result;
        } catch (error) {
            console.error('Error fetching yatras:', error);
            // Try to return cached data on network error
            const cached = await yatraCacheService.getCachedYatrasList();
            if (cached) {
                return cached;
            }
            throw error;
        }
    }

    async getYatra(id: number): Promise<Yatra> {
        try {
            const response = await apiClient.get(`/yatra/${id}`);
            const yatra = this.normalizeYatra(response.data);
            // Cache the detail for offline use
            await yatraCacheService.cacheYatraDetail(id, yatra);
            return yatra;
        } catch (error) {
            console.error(`Error fetching yatra ${id}:`, error);
            // Try to return cached data on network error
            const cached = await yatraCacheService.getCachedYatraDetail(id);
            if (cached) {
                return cached;
            }
            throw error;
        }
    }

    async getMyYatras(): Promise<MyYatrasResponse> {
        try {
            const response = await apiClient.get(`/yatra/my`);
            return {
                organized: (response.data.organized || []).map(this.normalizeYatra),
                participating: (response.data.participating || []).map(this.normalizeYatra),
            };
        } catch (error) {
            console.error('Error fetching my yatras:', error);
            throw error;
        }
    }

    async createYatra(data: YatraCreateData): Promise<Yatra> {
        try {
            const response = await apiClient.post(`/yatra`, data);
            return this.normalizeYatra(response.data);
        } catch (error) {
            console.error('Error creating yatra:', error);
            throw error;
        }
    }

    async updateYatra(id: number, data: Partial<YatraCreateData>): Promise<Yatra> {
        try {
            const response = await apiClient.put(`/yatra/${id}`, data);
            return this.normalizeYatra(response.data);
        } catch (error) {
            console.error(`Error updating yatra ${id}:`, error);
            throw error;
        }
    }

    async deleteYatra(id: number): Promise<void> {
        try {
            await apiClient.delete(`/yatra/${id}`);
        } catch (error) {
            console.error(`Error deleting yatra ${id}:`, error);
            throw error;
        }
    }

    async publishYatra(id: number, data?: YatraPublishData): Promise<void> {
        try {
            await apiClient.post(`/yatra/${id}/publish`, data || {});
        } catch (error) {
            console.error(`Error publishing yatra ${id}:`, error);
            throw error;
        }
    }

    async stopYatra(id: number): Promise<void> {
        try {
            await apiClient.post(`/yatra/${id}/stop`, {});
        } catch (error) {
            console.error(`Error stopping yatra ${id}:`, error);
            throw error;
        }
    }

    // ==================== PARTICIPANT ENDPOINTS ====================

    async joinYatra(yatraId: number, data?: YatraJoinData): Promise<YatraParticipant> {
        try {
            const response = await apiClient.post(`/yatra/${yatraId}/join`, data || {});
            return response.data;
        } catch (error) {
            console.error(`Error joining yatra ${yatraId}:`, error);
            throw error;
        }
    }

    async getMyParticipation(yatraId: number): Promise<YatraParticipant | null> {
        try {
            const response = await apiClient.get(`/yatra/${yatraId}/my-participation`);
            return response.data || null;
        } catch (error) {
            // No participation is not an error
            return null;
        }
    }

    async getPendingParticipants(yatraId: number): Promise<YatraParticipant[]> {
        try {
            const response = await apiClient.get(`/yatra/${yatraId}/participants/pending`);
            return response.data || [];
        } catch (error) {
            console.error(`Error fetching pending participants for yatra ${yatraId}:`, error);
            throw error;
        }
    }

    async approveParticipant(yatraId: number, participantId: number): Promise<void> {
        try {
            await apiClient.post(`/yatra/${yatraId}/participants/${participantId}/approve`, {});
        } catch (error) {
            console.error(`Error approving participant ${participantId}:`, error);
            throw error;
        }
    }

    async rejectParticipant(yatraId: number, participantId: number): Promise<void> {
        try {
            await apiClient.post(`/yatra/${yatraId}/participants/${participantId}/reject`, {});
        } catch (error) {
            console.error(`Error rejecting participant ${participantId}:`, error);
            throw error;
        }
    }

    async removeParticipant(yatraId: number, participantId: number): Promise<void> {
        try {
            await apiClient.delete(`/yatra/${yatraId}/participants/${participantId}`);
        } catch (error) {
            console.error(`Error removing participant ${participantId}:`, error);
            throw error;
        }
    }

    // ==================== YATRA REVIEW ENDPOINTS ====================

    async getYatraReviews(yatraId: number, page = 1, limit = 10): Promise<{ reviews: YatraReview[], total: number, averageRating: number }> {
        try {
            const response = await apiClient.get(`/yatra/${yatraId}/reviews`, {
                params: { page, limit }
            });
            return {
                reviews: response.data.reviews || [],
                total: response.data.total ?? 0,
                averageRating: response.data.averageRating ?? 0,
            };
        } catch (error) {
            console.error(`Error fetching reviews for yatra ${yatraId}:`, error);
            throw error;
        }
    }

    async createYatraReview(yatraId: number, data: YatraReviewCreateData): Promise<YatraReview> {
        try {
            const response = await apiClient.post(`/yatra/${yatraId}/reviews`, data);
            return response.data;
        } catch (error) {
            console.error(`Error creating review for yatra ${yatraId}:`, error);
            throw error;
        }
    }

    async getOrganizerStats(userId: number): Promise<{
        organizedCount: number;
        averageRating: number;
        totalParticipants: number;
        recommendations: number;
    }> {
        try {
            const response = await apiClient.get(`/yatra/organizer/${userId}/stats`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching organizer stats for user ${userId}:`, error);
            return {
                organizedCount: 0,
                averageRating: 0,
                totalParticipants: 0,
                recommendations: 0,
            };
        }
    }

    // ==================== SHELTER ENDPOINTS ====================

    async getShelters(filters?: ShelterFilters): Promise<ShelterListResponse> {
        try {
            const params: any = { ...filters };
            if (filters?.nearLat) params.near_lat = filters.nearLat;
            if (filters?.nearLng) params.near_lng = filters.nearLng;
            if (filters?.radiusKm) params.radius_km = filters.radiusKm;
            if (filters?.minRating) params.min_rating = filters.minRating;
            if (filters?.sevaOnly) params.seva_only = 'true';
            const godModeParams = await getGodModeQueryParams();
            Object.assign(params, godModeParams);

            const response = await apiClient.get(`/shelter`, { params });
            const data = response.data;
            const result = {
                shelters: (data.shelters || []).map(this.normalizeShelter),
                total: data.total ?? 0,
                page: data.page ?? 1,
            };
            // Cache the result for offline use
            if (!filters || Object.keys(filters).length === 0) {
                await yatraCacheService.cacheSheltersList(result);
            }
            return result;
        } catch (error) {
            console.error('Error fetching shelters:', error);
            // Try to return cached data on network error
            const cached = await yatraCacheService.getCachedSheltersList();
            if (cached) {
                return cached;
            }
            throw error;
        }
    }

    async getShelter(id: number): Promise<Shelter> {
        try {
            const response = await apiClient.get(`/shelter/${id}`);
            const shelter = this.normalizeShelter(response.data);
            // Cache the detail for offline use
            await yatraCacheService.cacheShelterDetail(id, shelter);
            return shelter;
        } catch (error) {
            console.error(`Error fetching shelter ${id}:`, error);
            // Try to return cached data on network error
            const cached = await yatraCacheService.getCachedShelterDetail(id);
            if (cached) {
                return cached;
            }
            throw error;
        }
    }

    async getMyShelters(): Promise<Shelter[]> {
        try {
            const response = await apiClient.get(`/shelter/my`);
            return (response.data || []).map(this.normalizeShelter);
        } catch (error) {
            console.error('Error fetching my shelters:', error);
            throw error;
        }
    }

    async createShelter(data: ShelterCreateData): Promise<Shelter> {
        try {
            const response = await apiClient.post(`/shelter`, data);
            return this.normalizeShelter(response.data);
        } catch (error) {
            console.error('Error creating shelter:', error);
            throw error;
        }
    }

    async updateShelter(id: number, data: Partial<ShelterCreateData>): Promise<Shelter> {
        try {
            const response = await apiClient.put(`/shelter/${id}`, data);
            return this.normalizeShelter(response.data);
        } catch (error) {
            console.error(`Error updating shelter ${id}:`, error);
            throw error;
        }
    }

    async deleteShelter(id: number): Promise<void> {
        try {
            await apiClient.delete(`/shelter/${id}`);
        } catch (error) {
            console.error(`Error deleting shelter ${id}:`, error);
            throw error;
        }
    }

    // ==================== REVIEW ENDPOINTS ====================

    async getShelterReviews(shelterId: number, page = 1, limit = 10): Promise<{ reviews: ShelterReview[], total: number }> {
        try {
            const response = await apiClient.get(`/shelter/${shelterId}/reviews`, {
                params: { page, limit }
            });
            return {
                reviews: response.data.reviews || [],
                total: response.data.total ?? 0,
            };
        } catch (error) {
            console.error(`Error fetching reviews for shelter ${shelterId}:`, error);
            throw error;
        }
    }

    async createReview(shelterId: number, data: ShelterReviewCreateData): Promise<ShelterReview> {
        try {
            const response = await apiClient.post(`/shelter/${shelterId}/reviews`, data);
            return response.data;
        } catch (error) {
            console.error(`Error creating review for shelter ${shelterId}:`, error);
            throw error;
        }
    }

    async deleteReview(shelterId: number, reviewId: number): Promise<void> {
        try {
            await apiClient.delete(`/shelter/${shelterId}/reviews/${reviewId}`);
        } catch (error) {
            console.error(`Error deleting review ${reviewId}:`, error);
            throw error;
        }
    }

    // ==================== UPLOAD ENDPOINTS ====================

    async uploadPhoto(asset: any, type: 'yatra' | 'shelter' = 'yatra'): Promise<string> {
        try {
            const formData = new FormData();
            formData.append('photo', {
                uri: asset.uri,
                type: asset.type || 'image/jpeg',
                name: asset.fileName || 'photo.jpg',
            } as any);

            const response = await apiClient.post(`/${type}/upload?type=${type}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data.url;
        } catch (error) {
            console.error(`Error uploading ${type} photo:`, error);
            throw error;
        }
    }

    // ==================== HELPERS ====================

    private normalizeYatra = (yatra: any): Yatra => {
        if (!yatra) return yatra;
        return {
            ...yatra,
            id: yatra.id ?? yatra.ID ?? 0,
            participantCount: yatra.participantCount ?? 0,
            viewsCount: yatra.viewsCount ?? 0,
            billingState: yatra.billingState ?? 'active',
            billingPaused: !!yatra.billingPaused,
            billingPauseReason: yatra.billingPauseReason ?? 'none',
            dailyFeeLkm: typeof yatra.dailyFeeLkm === 'number' ? yatra.dailyFeeLkm : 0,
        };
    }

    private normalizeShelter = (shelter: any): Shelter => {
        if (!shelter) return shelter;
        return {
            ...shelter,
            id: shelter.id ?? shelter.ID ?? 0,
            rating: shelter.rating ?? 0,
            reviewsCount: shelter.reviewsCount ?? 0,
            viewsCount: shelter.viewsCount ?? 0,
        };
    }

    // ==================== UTILITY METHODS ====================

    parseRoutePoints(routePointsJson: string | undefined): Array<{ name: string; lat: number; lng: number; order: number; description?: string }> {
        if (!routePointsJson) return [];
        try {
            return JSON.parse(routePointsJson);
        } catch {
            return [];
        }
    }

    parseAmenities(amenitiesJson: string | undefined): string[] {
        if (!amenitiesJson) return [];
        try {
            return JSON.parse(amenitiesJson);
        } catch {
            return [];
        }
    }

    parsePhotos(photosJson: string | undefined): string[] {
        if (!photosJson) return [];
        try {
            return JSON.parse(photosJson);
        } catch {
            return [];
        }
    }

    formatDateRange(startDate: string, endDate: string): string {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };

        if (start.getFullYear() === end.getFullYear()) {
            if (start.getMonth() === end.getMonth()) {
                return `${start.getDate()}-${end.toLocaleDateString('ru-RU', options)}`;
            }
            return `${start.toLocaleDateString('ru-RU', options)} - ${end.toLocaleDateString('ru-RU', options)}`;
        }
        return `${start.toLocaleDateString('ru-RU', { ...options, year: 'numeric' })} - ${end.toLocaleDateString('ru-RU', { ...options, year: 'numeric' })}`;
    }

    getDaysUntilStart(startDate: string): number {
        const now = new Date();
        const start = new Date(startDate);
        const diffTime = start.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    getTripDuration(startDate: string, endDate: string): number {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = end.getTime() - start.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
}

export const yatraService = new YatraService();
