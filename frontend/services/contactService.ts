import { API_PATH } from '../config/api.config';
import { authorizedFetch, getAccessToken } from './authSessionService';

export interface UserContact {
    ID: number;
    karmicName: string;
    spiritualName: string;
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

const getAuthToken = async () => {
    return await getAccessToken();
};

export const getAuthHeaders = async (isJson = true) => {
    const token = await getAuthToken();
    const headers: any = {
        'Authorization': (token && token !== 'undefined' && token !== 'null') ? `Bearer ${token}` : ''
    };
    if (isJson) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
};

const legacyUpdatePushToken = async (pushToken: string) => {
    const headers = await getAuthHeaders();
    await authorizedFetch(`${API_PATH}/update-push-token`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ pushToken }),
    });
};

export const contactService = {
    getAuthToken,
    getContacts: async (): Promise<UserContact[]> => {
        const headers = await getAuthHeaders();
        const response = await authorizedFetch(`${API_PATH}/contacts`, { headers });
        if (response.status === 401) {
            console.error('[ContactService] Unauthorized: Session expired or invalid token');
            // We could trigger a logout here if we had access to context, 
            // but for now we just throw a clearer error.
            throw new Error('UNAUTHORIZED');
        }
        if (!response.ok) throw new Error(`Failed to fetch contacts: ${response.status}`);
        return response.json();
    },
    getContactsPage: async (query: ContactsQuery = {}): Promise<PaginatedContactsResponse> => {
        const headers = await getAuthHeaders();
        const params = new URLSearchParams();
        if (query.limit && query.limit > 0) {
            params.append('limit', String(query.limit));
        }
        if (query.cursor && query.cursor > 0) {
            params.append('cursor', String(query.cursor));
        }
        if (query.tab) {
            params.append('tab', query.tab);
        }
        if (query.q && query.q.trim()) {
            params.append('q', query.q.trim());
        }
        if (query.city && query.city.trim()) {
            params.append('city', query.city.trim());
        }
        if (query.cities && query.cities.length > 0) {
            params.append('cities', query.cities.join(','));
        }

        const qs = params.toString();
        const url = qs ? `${API_PATH}/contacts?${qs}` : `${API_PATH}/contacts`;
        const response = await authorizedFetch(url, { headers });
        if (response.status === 401) {
            throw new Error('UNAUTHORIZED');
        }
        if (!response.ok) {
            throw new Error(`Failed to fetch contacts page: ${response.status}`);
        }

        const data = await response.json();
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
    },

    getFriends: async (_userId: number): Promise<UserContact[]> => {
        const headers = await getAuthHeaders();
        // The endpoint /friends uses the user ID from the token, so we don't need userId in the path.
        const response = await authorizedFetch(`${API_PATH}/friends`, { headers });
        if (!response.ok) throw new Error('Failed to fetch friends');
        return response.json();
    },

    addFriend: async (userId: number, friendId: number) => {
        const headers = await getAuthHeaders();
        const response = await authorizedFetch(`${API_PATH}/friends/add`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ userId, friendId }),
        });
        if (!response.ok) throw new Error('Failed to add friend');
        return response.json();
    },

    removeFriend: async (userId: number, friendId: number) => {
        const headers = await getAuthHeaders();
        const response = await authorizedFetch(`${API_PATH}/friends/remove`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ userId, friendId }),
        });
        if (!response.ok) throw new Error('Failed to remove friend');
    },

    uploadAvatar: async (_userId: number, formData: FormData) => {
        const headers = await getAuthHeaders(false);
        const response = await authorizedFetch(`${API_PATH}/upload-avatar`, { // Route is /upload-avatar in main.go, not /upload-avatar/:userId
            method: 'POST',
            headers,
            body: formData,
        });
        if (!response.ok) throw new Error('Failed to upload avatar');
        return response.json();
    },

    sendHeartbeat: async (_userId: number) => {
        const headers = await getAuthHeaders();
        const response = await authorizedFetch(`${API_PATH}/heartbeat`, {
            method: 'POST',
            headers
        });
        if (response.status === 401) {
            throw new Error('UNAUTHORIZED');
        }
    },

    updatePushToken: async (pushToken: string) => {
        await legacyUpdatePushToken(pushToken);
    },

    registerPushToken: async (payload: PushTokenRegisterPayload) => {
        const headers = await getAuthHeaders();
        const response = await authorizedFetch(`${API_PATH}/push-tokens/register`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            return response.json();
        }

        // Fallback for older backends.
        await legacyUpdatePushToken(payload.token);
        return { ok: true, fallback: true };
    },

    unregisterPushToken: async (payload: { token?: string; deviceId?: string }) => {
        const headers = await getAuthHeaders();
        const response = await authorizedFetch(`${API_PATH}/push-tokens/unregister`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            throw new Error('Failed to unregister push token');
        }
        return response.json();
    },

    getBlockedUsers: async (_userId: number): Promise<UserContact[]> => {
        const headers = await getAuthHeaders();
        const response = await authorizedFetch(`${API_PATH}/blocks`, { headers });
        if (!response.ok) throw new Error('Failed to fetch blocked users');
        return response.json();
    },

    blockUser: async (userId: number, blockedId: number) => {
        const headers = await getAuthHeaders();
        const response = await authorizedFetch(`${API_PATH}/blocks/add`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ userId, blockedId }),
        });
        if (!response.ok) throw new Error('Failed to block user');
        return response.json();
    },

    unblockUser: async (userId: number, blockedId: number) => {
        const headers = await getAuthHeaders();
        const response = await authorizedFetch(`${API_PATH}/blocks/remove`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ userId, blockedId }),
        });
        if (!response.ok) throw new Error('Failed to unblock user');
    },

    // Get a user profile by ID (for viewing profiles from map, etc.)
    getUserById: async (userId: number): Promise<UserContact | null> => {
        try {
            const headers = await getAuthHeaders();
            const response = await authorizedFetch(`${API_PATH}/users/${userId}`, { headers });
            if (!response.ok) {
                console.error(`Failed to fetch user ${userId}: ${response.status}`);
                return null;
            }
            return response.json();
        } catch (error) {
            console.error('Error fetching user by ID:', error);
            return null;
        }
    }
};
