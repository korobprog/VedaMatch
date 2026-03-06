import apiClient from '../lib/apiClient';
import type {
    ConnectApplyRequest,
    ConnectCommunityDetailResponse,
    ConnectFeedFilters,
    ConnectFeedResponse,
    ConnectMatchProfile,
    ConnectOpportunityCreateRequest,
    ConnectOpportunityDetailResponse,
} from '../types/connect';

export const connectService = {
    async getFeed(filters: ConnectFeedFilters = {}): Promise<ConnectFeedResponse> {
        const response = await apiClient.get('/connect/feed', { params: filters });
        return response.data;
    },

    async getProfile(): Promise<ConnectMatchProfile | null> {
        const response = await apiClient.get('/connect/profile');
        return response.data?.profile || null;
    },

    async saveProfile(payload: ConnectMatchProfile): Promise<ConnectMatchProfile> {
        const response = await apiClient.put('/connect/profile', payload);
        return response.data.profile;
    },

    async getOpportunity(opportunityId: number): Promise<ConnectOpportunityDetailResponse> {
        const response = await apiClient.get(`/connect/opportunities/${opportunityId}`);
        return response.data;
    },

    async getCommunity(communityId: number): Promise<ConnectCommunityDetailResponse> {
        const response = await apiClient.get(`/connect/communities/${communityId}`);
        return response.data;
    },

    async createOpportunity(payload: ConnectOpportunityCreateRequest) {
        const response = await apiClient.post('/connect/opportunities', payload);
        return response.data;
    },

    async apply(opportunityId: number, payload: ConnectApplyRequest) {
        const response = await apiClient.post(`/connect/opportunities/${opportunityId}/apply`, payload);
        return response.data;
    },
};
