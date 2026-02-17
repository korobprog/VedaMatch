import { CharityDonation, CharityEvidence, CharityOrganization, CharityProject, DonateRequest, DonateResponse } from '../types/charity';
import { API_PATH } from '../config/api.config';
import { getGodModeQueryParams } from './godModeService';
import { authorizedFetch } from './authSessionService';

class CharityService {
    private async get(endpoint: string, token?: string) {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const godModeParams = await getGodModeQueryParams();
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = godModeParams.math ? `${API_PATH}${endpoint}${separator}math=${encodeURIComponent(godModeParams.math)}` : `${API_PATH}${endpoint}`;

        const response = await authorizedFetch(url, {
            method: "GET",
            headers
        }, {
            skipAuth: Boolean(token),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    }

    private async post(endpoint: string, token: string | undefined, body: any) {
        const response = await authorizedFetch(`${API_PATH}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(body),
        }, {
            skipAuth: Boolean(token),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
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
