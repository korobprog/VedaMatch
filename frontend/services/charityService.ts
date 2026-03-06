import { CharityDonation, CharityEvidence, CharityOrganization, CharityProject, DonateRequest, DonateResponse } from '../types/charity';
import apiClient from '../lib/apiClient';
import { getGodModeQueryParams } from './godModeService';

const decodeQueryPart = (value: string): string => decodeURIComponent(value.replace(/\+/g, ' '));

const parseQueryString = (rawQuery: string): Record<string, string> => {
    const params: Record<string, string> = {};
    if (!rawQuery) {
        return params;
    }

    for (const part of rawQuery.split('&')) {
        if (!part) continue;
        const [rawKey, rawValue = ''] = part.split('=');
        if (!rawKey) continue;
        params[decodeQueryPart(rawKey)] = decodeQueryPart(rawValue);
    }

    return params;
};

class CharityService {
    private async get(endpoint: string, token?: string) {
        const godModeParams = await getGodModeQueryParams();
        const [path, rawQuery = ''] = endpoint.split('?');
        const params = parseQueryString(rawQuery);
        if (godModeParams.math) {
            params.math = godModeParams.math;
        }

        const response = await apiClient.get(path, {
            params,
            headers: token
                ? { Authorization: `Bearer ${token}` }
                : undefined,
        });
        return response.data;
    }

    private async post(endpoint: string, token: string | undefined, body: any) {
        try {
            const response = await apiClient.post(endpoint, body, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            return response.data;
        } catch (error: any) {
            const errorData = error?.response?.data || {};
            throw new Error(errorData.error || `HTTP error! status: ${error?.response?.status ?? 'unknown'}`);
        }
    }

    // --- Organizations ---
    async getOrganizations(token?: string): Promise<CharityOrganization[]> {
        return this.get('/charity/organizations', token);
    }

    async createOrganization(token: string, data: Partial<CharityOrganization>): Promise<CharityOrganization> {
        return this.post('/charity/organizations', token, data);
    }

    // --- Projects ---
    async getProjects(token?: string): Promise<CharityProject[]> {
        const result = await this.get('/charity/projects', token);
        return result.projects || [];
    }

    async getProjectById(projectId: number, token?: string): Promise<CharityProject | null> {
        try {
            return await this.get(`/charity/projects/${projectId}`, token);
        } catch {
            return null;
        }
    }

    async createProject(token: string, data: Partial<CharityProject>): Promise<CharityProject> {
        return this.post('/charity/projects', token, data);
    }

    // --- Donation ---
    async donate(token: string | undefined, req: DonateRequest): Promise<DonateResponse> {
        return this.post('/charity/donate', token, req);
    }

    async getMyDonations(token?: string, status?: string): Promise<CharityDonation[]> {
        const endpoint = status ? `/charity/my-donations?status=${status}` : '/charity/my-donations';
        const result = await this.get(endpoint, token);
        return result.donations || [];
    }

    async refundDonation(token: string | undefined, donationId: number): Promise<void> {
        return this.post(`/charity/refund/${donationId}`, token, {});
    }

    // --- Evidence (Reports) ---
    async getProjectEvidence(projectId: number): Promise<CharityEvidence[]> {
        const result = await this.get(`/charity/evidence/${projectId}`);
        return result.evidence || [];
    }

    async uploadEvidence(token: string | undefined, data: {
        projectId: number;
        type: string;
        title?: string;
        description?: string;
        mediaUrl: string;
        thumbnailUrl?: string;
    }): Promise<CharityEvidence> {
        return this.post('/charity/evidence', token, data);
    }

    // --- Karma Feed ---
    async getKarmaFeed(projectId?: number, limit: number = 20): Promise<KarmaFeedItem[]> {
        let endpoint = `/charity/karma-feed?limit=${limit}`;
        if (projectId) {
            endpoint += `&projectId=${projectId}`;
        }
        const result = await this.get(endpoint);
        return result.feed || [];
    }
}

export interface KarmaFeedItem {
    id: number;
    donorName: string;
    donorAvatar?: string;
    projectTitle: string;
    amount: number;
    message?: string;
    createdAt: string;
}

export const charityService = new CharityService();
