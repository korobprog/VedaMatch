import axios from 'axios';
import { API_PATH } from '../config/api.config';
import { Ad, AdFilters, AdFormData, CategoryConfig } from '../types/ads';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AdsService {
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

    async getAds(filters?: AdFilters): Promise<{ ads: Ad[], total: number, page: number, totalPages: number }> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/ads`, {
                params: filters,
                headers
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching ads:', error);
            throw error;
        }
    }

    async getAd(id: number): Promise<Ad> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/ads/${id}`, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error fetching ad ${id}:`, error);
            throw error;
        }
    }

    async createAd(data: AdFormData): Promise<{ id: number, message: string }> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(`${API_PATH}/ads`, data, { headers });
            return response.data;
        } catch (error) {
            console.error('Error creating ad:', error);
            throw error;
        }
    }

    async updateAd(id: number, data: AdFormData): Promise<void> {
        try {
            const headers = await this.getHeaders();
            await axios.put(`${API_PATH}/ads/${id}`, data, { headers });
        } catch (error) {
            console.error(`Error updating ad ${id}:`, error);
            throw error;
        }
    }

    async deleteAd(id: number): Promise<void> {
        try {
            const headers = await this.getHeaders();
            await axios.delete(`${API_PATH}/ads/${id}`, { headers });
        } catch (error) {
            console.error(`Error deleting ad ${id}:`, error);
            throw error;
        }
    }

    async toggleFavorite(id: number): Promise<{ isFavorite: boolean }> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(`${API_PATH}/ads/${id}/favorite`, {}, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error toggling favorite for ad ${id}:`, error);
            throw error;
        }
    }

    async getFavorites(): Promise<Ad[]> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/ads/user/favorites`, { headers });
            return response.data;
        } catch (error) {
            console.error('Error fetching favorites:', error);
            throw error;
        }
    }

    async getMyAds(): Promise<Ad[]> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/ads/user/my`, { headers });
            return response.data;
        } catch (error) {
            console.error('Error fetching my ads:', error);
            throw error;
        }
    }

    async getCategories(): Promise<CategoryConfig[]> {
        try {
            const response = await axios.get(`${API_PATH}/ads/categories`);
            return response.data;
        } catch (error) {
            console.error('Error fetching categories:', error);
            throw error;
        }
    }

    async getCities(): Promise<string[]> {
        try {
            const response = await axios.get(`${API_PATH}/ads/cities`);
            return response.data;
        } catch (error) {
            console.error('Error fetching cities:', error);
            throw error;
        }
    }

    async reportAd(id: number, reason: string, comment?: string): Promise<void> {
        try {
            const headers = await this.getHeaders();
            await axios.post(`${API_PATH}/ads/${id}/report`, { reason, comment }, { headers });
        } catch (error) {
            console.error(`Error reporting ad ${id}:`, error);
            throw error;
        }
    }

    async uploadPhoto(asset: any): Promise<string> {
        try {
            const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
            const formData = new FormData();
            formData.append('photo', {
                uri: asset.uri,
                type: asset.type || 'image/jpeg',
                name: asset.fileName || `photo_${Date.now()}.jpg`
            } as any);

            const response = await axios.post(`${API_PATH}/ads/upload-photo`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data.url;
        } catch (error) {
            console.error('Error uploading ad photo:', error);
            throw error;
        }
    }

    async contactSeller(id: number, method: 'call' | 'message'): Promise<{ roomId?: number, roomName?: string, message: string }> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(`${API_PATH}/ads/${id}/contact`, { method }, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error contacting seller for ad ${id}:`, error);
            throw error;
        }
    }
}

export const adsService = new AdsService();
