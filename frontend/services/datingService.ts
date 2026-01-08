import axios from 'axios';
import { API_PATH } from '../config/api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';

class DatingService {
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

    async getStats(city?: string) {
        const headers = await this.getHeaders();
        const response = await axios.get(`${API_PATH}/dating/stats`, {
            params: { city },
            headers
        });
        return response.data;
    }

    async getCities() {
        const headers = await this.getHeaders();
        const response = await axios.get(`${API_PATH}/dating/cities`, { headers });
        return response.data;
    }

    async getCandidates(params: any) {
        const headers = await this.getHeaders();
        const response = await axios.get(`${API_PATH}/dating/candidates`, {
            params,
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
}

export const datingService = new DatingService();
