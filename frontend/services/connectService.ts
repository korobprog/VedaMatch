import apiClient from '../lib/apiClient';
import type {
    ConnectApplyRequest,
    ConnectApplication,
    ConnectCommunityDetailResponse,
    ConnectFeedFilters,
    ConnectFeedResponse,
    ConnectFeedbackCreateRequest,
    ConnectMatchProfile,
    ConnectModerationApplication,
    ConnectModerationOpportunity,
    ConnectModerationRequest,
    ConnectApplicationStatusUpdateRequest,
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

    async apply(opportunityId: number, payload: ConnectApplyRequest): Promise<ConnectApplication> {
        const response = await apiClient.post(`/connect/opportunities/${opportunityId}/apply`, payload);
        return response.data;
    },

    async submitFeedback(opportunityId: number, payload: ConnectFeedbackCreateRequest) {
        const response = await apiClient.post(`/connect/opportunities/${opportunityId}/feedback`, payload);
        return response.data;
    },

    async getModerationQueue(status: 'moderation' | 'active' | 'paused' = 'moderation'): Promise<ConnectModerationOpportunity[]> {
        const response = await apiClient.get('/admin/connect/opportunities', { params: { status } });
        return Array.isArray(response.data?.opportunities) ? response.data.opportunities : [];
    },

    async approveOpportunity(opportunityId: number, payload: ConnectModerationRequest = {}) {
        const response = await apiClient.post(`/admin/connect/opportunities/${opportunityId}/approve`, payload);
        return response.data;
    },

    async rejectOpportunity(opportunityId: number, payload: ConnectModerationRequest = {}) {
        const response = await apiClient.post(`/admin/connect/opportunities/${opportunityId}/reject`, payload);
        return response.data;
    },

    async getApplications(opportunityId: number, status?: string): Promise<ConnectModerationApplication[]> {
        const response = await apiClient.get(`/connect/opportunities/${opportunityId}/applications`, {
            params: status ? { status } : undefined,
        });
        return Array.isArray(response.data?.applications) ? response.data.applications : [];
    },

    async updateApplicationStatus(applicationId: number, payload: ConnectApplicationStatusUpdateRequest): Promise<ConnectModerationApplication> {
        const response = await apiClient.post(`/connect/applications/${applicationId}/status`, payload);
        return response.data;
    },
};
