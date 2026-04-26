import apiClient from '../lib/apiClient';
import { getAccessToken } from './authSessionService';

export interface UserContact {
    ID: number;
    karmicName: string;
    spiritualName: string;
    nickname?: string;
    nicknameDisplay?: string;
    email: string;
    avatarUrl: string;
    lastSeen: string;
    identity: string;
    city: string;
    country: string;
    latitude?: number;
    longitude?: number;
    yatra?: string;
    timezone?: string;
}

export interface PushTokenRegisterPayload {
    token: string;
    platform?: 'ios' | 'android' | 'web' | string;
    provider?: 'fcm' | 'expo' | string;
    deviceId?: string;
    appVersion?: string;
}

export interface ContactsQuery {
    limit?: number;
    cursor?: number;
    tab?: 'all' | 'friends' | 'blocked';
    q?: string;
    city?: string;
    cities?: string[];
}

export interface PaginatedContactsResponse {
    items: UserContact[];
    hasMore: boolean;
    nextCursor?: number;
    total: number;
}

const extractStatus = (error: any): number | undefined => {
    return error?.response?.status;
};

const getAuthToken = async () => {
    return await getAccessToken();
};

export const getAuthHeaders = async (isJson = true) => {
    const token = await getAuthToken();
    const headers: any = {};
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    if (isJson) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
};

const legacyUpdatePushToken = async (pushToken: string) => {
    await apiClient.put('/update-push-token', { pushToken });
};

export const contactService = {
    getAuthToken,
    getContacts: async (): Promise<UserContact[]> => {
        try {
            const { data } = await apiClient.get('/contacts');
            if (Array.isArray(data)) {
                return data;
            }
            return Array.isArray(data?.items) ? data.items : [];
        } catch (error: any) {
            if (extractStatus(error) === 401) {
                console.error('[ContactService] Unauthorized: Session expired or invalid token');
                throw new Error('UNAUTHORIZED');
            }
            throw new Error(`Failed to fetch contacts: ${extractStatus(error) ?? 'unknown'}`);
        }
    },

    getContactsPage: async (query: ContactsQuery = {}): Promise<PaginatedContactsResponse> => {
        const params: Record<string, any> = {};
        if (query.limit && query.limit > 0) params.limit = query.limit;
        if (query.cursor && query.cursor > 0) params.cursor = query.cursor;
        if (query.tab) params.tab = query.tab;
        if (query.q && query.q.trim()) params.q = query.q.trim();
        if (query.city && query.city.trim()) params.city = query.city.trim();
        if (query.cities && query.cities.length > 0) params.cities = query.cities.join(',');

        try {
            const { data } = await apiClient.get('/contacts', { params });
            if (Array.isArray(data)) {
                return {
                    items: data,
                    hasMore: false,
                    nextCursor: undefined,
                    total: data.length,
                };
            }
            return {
                items: Array.isArray(data?.items) ? data.items : [],
                hasMore: Boolean(data?.hasMore),
                nextCursor: typeof data?.nextCursor === 'number' ? data.nextCursor : undefined,
                total: typeof data?.total === 'number' ? data.total : 0,
            };
        } catch (error: any) {
            if (extractStatus(error) === 401) {
                throw new Error('UNAUTHORIZED');
            }
            throw new Error(`Failed to fetch contacts page: ${extractStatus(error) ?? 'unknown'}`);
        }
    },

    getFriends: async (_userId: number): Promise<UserContact[]> => {
        const { data } = await apiClient.get('/friends');
        return Array.isArray(data) ? data : [];
    },

    addFriend: async (_userId: number, friendId: number) => {
        const { data } = await apiClient.post('/friends/request', { receiverId: friendId });
        return data;
    },

    removeFriend: async (userId: number, friendId: number) => {
        await apiClient.post('/friends/remove', { userId, friendId });
    },

    uploadAvatar: async (_userId: number, formData: FormData) => {
        const { data } = await apiClient.post('/upload-avatar', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return data;
    },

    sendHeartbeat: async (_userId: number) => {
        try {
            await apiClient.post('/heartbeat');
        } catch (error: any) {
            if (extractStatus(error) === 401) {
                throw new Error('UNAUTHORIZED');
            }
            throw error;
        }
    },

    updatePushToken: async (pushToken: string) => {
        await legacyUpdatePushToken(pushToken);
    },

    registerPushToken: async (payload: PushTokenRegisterPayload) => {
        try {
            const { data } = await apiClient.post('/push-tokens/register', payload);
            return data;
        } catch {
            // Fallback for older backends.
            await legacyUpdatePushToken(payload.token);
            return { ok: true, fallback: true };
        }
    },

    unregisterPushToken: async (payload: { token?: string; deviceId?: string }) => {
        const { data } = await apiClient.post('/push-tokens/unregister', payload);
        return data;
    },

    getBlockedUsers: async (_userId: number): Promise<UserContact[]> => {
        const { data } = await apiClient.get('/blocks');
        return Array.isArray(data) ? data : [];
    },

    blockUser: async (userId: number, blockedId: number) => {
        const { data } = await apiClient.post('/blocks/add', { userId, blockedId });
        return data;
    },

    unblockUser: async (userId: number, blockedId: number) => {
        await apiClient.post('/blocks/remove', { userId, blockedId });
    },

    // Get a user profile by ID (for viewing profiles from map, etc.)
    getUserById: async (userId: number): Promise<UserContact | null> => {
        try {
            const { data } = await apiClient.get(`/users/${userId}`);
            return data || null;
        } catch (error: any) {
            console.error(`Failed to fetch user ${userId}: ${extractStatus(error) ?? 'unknown'}`);
            return null;
        }
    }
};
