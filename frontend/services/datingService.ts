import axios from 'axios';
import { API_PATH } from '../config/api.config';
import { getGodModeQueryParams } from './godModeService';
import { getAccessToken } from './authSessionService';

class DatingService {
    private async getHeaders() {
        const token = await getAccessToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        return headers;
    }

    async getStats(city?: string) {
        const headers = await this.getHeaders();
        const godModeParams = await getGodModeQueryParams();
        const response = await axios.get(`${API_PATH}/dating/stats`, {
            params: { city, ...godModeParams },
            headers
        });
        return response.data;
    }

    async getCities() {
        const headers = await this.getHeaders();
        const response = await axios.get(`${API_PATH}/dating/cities`, { headers });
        return response.data;
    }

    async getCandidates(params: {
        userId: number;
        mode?: 'family' | 'business' | 'friendship' | 'seva';
        isNew?: boolean;
        city?: string;
        minAge?: string;
        maxAge?: string;
        madh?: string;
        yogaStyle?: string;
        guna?: string;
        identity?: string;
        skills?: string;
        industry?: string;
    }) {
        const headers = await this.getHeaders();
        const godModeParams = await getGodModeQueryParams();
        const response = await axios.get(`${API_PATH}/dating/candidates`, {
            params: { ...(params || {}), ...godModeParams },
            headers
        });
        return response.data;
    }

    async checkCompatibility(userId: number, candidateId: number) {
        const headers = await this.getHeaders();
        const response = await axios.post(`${API_PATH}/dating/compatibility/${userId}/${candidateId}`, {}, { headers });
        return response.data;
    }

    async addToFavorites(data: any) {
        const headers = await this.getHeaders();
        const response = await axios.post(`${API_PATH}/dating/favorites`, data, { headers });
        return response.data;
    }

    async getFavorites(userId: number) {
        const headers = await this.getHeaders();
        const response = await axios.get(`${API_PATH}/dating/favorites`, {
            params: { userId },
            headers
        });
        return response.data;
    }

    async removeFavorite(id: number) {
        const headers = await this.getHeaders();
        const response = await axios.delete(`${API_PATH}/dating/favorites/${id}`, { headers });
        return response.data;
    }

    async removeFavoriteByCandidate(userId: number, candidateId: number) {
        const favorites = await this.getFavorites(userId);
        if (!Array.isArray(favorites)) {
            return null;
        }

        const target = favorites.find((favorite: any) => {
            const rawCandidateId = favorite?.candidateId ?? favorite?.candidate_id ?? favorite?.CandidateID;
            return Number(rawCandidateId) === candidateId;
        });

        if (!target) {
            return null;
        }

        const favoriteId = Number(target?.id ?? target?.ID);
        if (!favoriteId) {
            return null;
        }

        return this.removeFavorite(favoriteId);
    }

    async getProfile(id: number) {
        const headers = await this.getHeaders();
        const response = await axios.get(`${API_PATH}/dating/profile/${id}`, { headers });
        return response.data;
    }

    async updateProfile(id: number, data: any) {
        const headers = await this.getHeaders();
        const response = await axios.put(`${API_PATH}/dating/profile/${id}`, data, { headers });
        return response.data;
    }

    async getUsers() {
        const headers = await this.getHeaders();
        const response = await axios.get(`${API_PATH}/contacts`, { headers });
        return response.data;
    }

    async getFriends() {
        const headers = await this.getHeaders();
        const response = await axios.get(`${API_PATH}/friends`, { headers });
        return response.data;
    }

    async addFriend(userId: number, friendId: number) {
        const headers = await this.getHeaders();
        const response = await axios.post(`${API_PATH}/friends/add`, { userId, friendId }, { headers });
        return response.data;
    }

    async getPhotos(userId: number) {
        const headers = await this.getHeaders();
        const response = await axios.get(`${API_PATH}/media/${userId}`, { headers });
        return response.data;
    }

    async uploadPhoto(userId: number, formData: FormData) {
        const headers = await this.getHeaders();
        const response = await axios.post(`${API_PATH}/media/upload/${userId}`, formData, {
            headers: {
                ...headers,
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    }

    async setProfilePhoto(id: number) {
        const headers = await this.getHeaders();
        const response = await axios.post(`${API_PATH}/media/${id}/set-profile`, {}, { headers });
        return response.data;
    }

    async deletePhoto(id: number) {
        const headers = await this.getHeaders();
        const response = await axios.delete(`${API_PATH}/media/${id}`, { headers });
        return response.data;
    }

    getMediaUrl(url: string) {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        // API_PATH is usually http://.../api
        // We want the base URL http://...
        const baseUrl = API_PATH.replace(/\/api\/?$/, '');
        return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    // Get count of people who added this profile to favorites (likes)
    async getLikesCount(userId: number): Promise<{ count: number }> {
        const headers = await this.getHeaders();
        const response = await axios.get(`${API_PATH}/dating/likes/${userId}`, { headers });
        return response.data;
    }

    // Check if current user has favorited a candidate
    async checkIsFavorited(userId: number, candidateId: number): Promise<{ isFavorited: boolean }> {
        const headers = await this.getHeaders();
        const response = await axios.get(`${API_PATH}/dating/is-favorited`, {
            params: { userId, candidateId },
            headers
        });
        return response.data;
    }

    // Get users who liked (added to favorites) the current user
    async getWhoLikedMe(userId: number) {
        const headers = await this.getHeaders();
        const response = await axios.get(`${API_PATH}/dating/liked-me`, {
            params: { userId },
            headers
        });
        return response.data;
    }

    // Generate shareable URL for a profile
    getShareUrl(userId: number): string {
        // Using a placeholder domain - should be configured based on production domain
        return `https://vedic.ai/profile/${userId}`;
    }
}

export const datingService = new DatingService();
