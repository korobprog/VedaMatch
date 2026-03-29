import { API_PATH } from '../config/api.config';
import apiClient from '../lib/apiClient';
import { getGodModeQueryParams } from './godModeService';

class DatingService {
    normalizeCsvList(value: unknown): string[] {
        if (Array.isArray(value)) {
            return value.map((item) => String(item).trim()).filter(Boolean);
        }
        if (typeof value === 'string') {
            return value.split(',').map((item) => item.trim()).filter(Boolean);
        }
        return [];
    }

    async getStats(city?: string) {
        const godModeParams = await getGodModeQueryParams();
        const response = await apiClient.get('/dating/stats', {
            params: { city, ...godModeParams },
        });
        return response.data;
    }

    async getCities() {
        const response = await apiClient.get('/dating/cities');
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
        const godModeParams = await getGodModeQueryParams();
        const response = await apiClient.get('/dating/candidates', {
            params: { ...(params || {}), ...godModeParams },
        });
        return response.data;
    }

    async checkCompatibility(userId: number, candidateId: number) {
        const response = await apiClient.post(`/dating/compatibility/${userId}/${candidateId}`, {});
        return response.data;
    }

    async addToFavorites(data: any) {
        const response = await apiClient.post('/dating/favorites', data);
        return response.data;
    }

    async getFavorites(userId: number) {
        const response = await apiClient.get('/dating/favorites', {
            params: { userId },
        });
        return response.data;
    }

    async removeFavorite(id: number) {
        const response = await apiClient.delete(`/dating/favorites/${id}`);
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
        const response = await apiClient.get(`/dating/profile/${id}`);
        return response.data;
    }

    async updateProfile(id: number, data: any) {
        const response = await apiClient.put(`/dating/profile/${id}`, data);
        return response.data;
    }

    async submitProfile(id: number) {
        const response = await apiClient.post(`/dating/profile/${id}/submit`, {});
        return response.data;
    }

    async getPublicationStatus(id: number) {
        const response = await apiClient.get(`/dating/profile/${id}/publication-status`);
        return response.data;
    }

    async getApprovals(id: number) {
        const response = await apiClient.get(`/dating/profile/${id}/approvals`);
        return response.data;
    }

    async getIncomingApprovalRequests(params?: { status?: 'pending' | 'approved' | 'rejected'; countOnly?: boolean }) {
        const response = await apiClient.get('/dating/approval-requests', {
            params,
        });
        return response.data;
    }

    async requestApprovals(id: number, approverIds?: number[]) {
        const response = await apiClient.post(`/dating/profile/${id}/approvals/request`, { approverIds: approverIds || [] });
        return response.data;
    }

    async respondApproval(id: number, approvalId: number, status: 'approved' | 'rejected', note = '') {
        const response = await apiClient.post(`/dating/profile/${id}/approvals/${approvalId}/respond`, { status, note });
        return response.data;
    }

    async getUsers() {
        const response = await apiClient.get('/contacts');
        return response.data;
    }

    async getFriends() {
        const response = await apiClient.get('/friends');
        return response.data;
    }

    async addFriend(userId: number, friendId: number) {
        const response = await apiClient.post('/friends/add', { userId, friendId });
        return response.data;
    }

    async getPhotos(userId: number) {
        const response = await apiClient.get(`/media/${userId}`);
        return response.data;
    }

    async uploadPhoto(userId: number, formData: FormData) {
        const response = await apiClient.post(`/media/upload/${userId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }

    async setProfilePhoto(id: number) {
        const response = await apiClient.post(`/media/${id}/set-profile`, {});
        return response.data;
    }

    async deletePhoto(id: number) {
        const response = await apiClient.delete(`/media/${id}`);
        return response.data;
    }

    getMediaUrl(url: string) {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        // API_PATH is usually http://.../api.
        const baseUrl = API_PATH.replace(/\/api\/?$/, '');
        return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    // Get count of people who added this profile to favorites (likes)
    async getLikesCount(userId: number): Promise<{ count: number }> {
        const response = await apiClient.get(`/dating/likes/${userId}`);
        return response.data;
    }

    // Check if current user has favorited a candidate
    async checkIsFavorited(userId: number, candidateId: number): Promise<{ isFavorited: boolean }> {
        const response = await apiClient.get('/dating/is-favorited', {
            params: { userId, candidateId },
        });
        return response.data;
    }

    // Get users who liked (added to favorites) the current user
    async getWhoLikedMe(userId: number) {
        const response = await apiClient.get('/dating/liked-me', {
            params: { userId },
        });
        return response.data;
    }

    async getNotifications() {
        const response = await apiClient.get('/dating/notifications');
        return response.data;
    }

    async getPosts(userId?: number) {
        const response = await apiClient.get('/dating/posts', {
            params: userId ? { userId } : undefined,
        });
        return response.data;
    }

    async createPost(data: { body: string; mediaUrl?: string }) {
        const response = await apiClient.post('/dating/posts', data);
        return response.data;
    }

    async updatePost(id: number, data: { body: string; mediaUrl?: string }) {
        const response = await apiClient.patch(`/dating/posts/${id}`, data);
        return response.data;
    }

    async deletePost(id: number) {
        const response = await apiClient.delete(`/dating/posts/${id}`);
        return response.data;
    }

    async getMeetingInvites() {
        const response = await apiClient.get('/dating/meeting-invites');
        return response.data;
    }

    async createMeetingInvite(data: { inviteeId: number; placeType: string; message: string }) {
        const response = await apiClient.post('/dating/meeting-invites', data);
        return response.data;
    }

    async respondMeetingInvite(id: number, status: 'accepted' | 'rejected') {
        const response = await apiClient.post(`/dating/meeting-invites/${id}/respond`, { status });
        return response.data;
    }

    // Generate shareable URL for a profile
    getShareUrl(userId: number): string {
        // Using a placeholder domain - should be configured based on production domain
        return `https://vedic.ai/profile/${userId}`;
    }
}

export const datingService = new DatingService();
