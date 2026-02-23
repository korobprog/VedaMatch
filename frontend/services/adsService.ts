import apiClient from '../lib/apiClient';
import { Ad, AdFilters, AdFormData, CategoryConfig } from '../types/ads';
import { getGodModeQueryParams } from './godModeService';

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
            return response.data;
        } catch (error) {
            console.error(`Error fetching ad ${id}:`, error);
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
