import { API_PATH } from '../config/api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const getAuthToken = async () => {
    return await AsyncStorage.getItem('token');
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
    await fetch(`${API_PATH}/update-push-token`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ pushToken }),
    });
};

export const contactService = {
    getAuthToken,
    getContacts: async (): Promise<UserContact[]> => {
        const headers = await getAuthHeaders();
        console.log('[ContactService] Fetching contacts using headers:', JSON.stringify(headers));
        const response = await fetch(`${API_PATH}/contacts`, { headers });
        if (response.status === 401) {
            console.error('[ContactService] Unauthorized: Session expired or invalid token');
            // We could trigger a logout here if we had access to context, 
            // but for now we just throw a clearer error.
            throw new Error('UNAUTHORIZED');
        }
        if (!response.ok) throw new Error(`Failed to fetch contacts: ${response.status}`);
        return response.json();
    },

    getFriends: async (userId: number): Promise<UserContact[]> => {
        const headers = await getAuthHeaders();
        // The endpoint /friends uses the user ID from the token, so we don't need userId in the path.
        const response = await fetch(`${API_PATH}/friends`, { headers });
        if (!response.ok) throw new Error('Failed to fetch friends');
        return response.json();
    },

    addFriend: async (userId: number, friendId: number) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_PATH}/friends/add`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ userId, friendId }),
        });
        if (!response.ok) throw new Error('Failed to add friend');
        return response.json();
    },

    removeFriend: async (userId: number, friendId: number) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_PATH}/friends/remove`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ userId, friendId }),
        });
        if (!response.ok) throw new Error('Failed to remove friend');
    },

    uploadAvatar: async (userId: number, formData: FormData) => {
        const headers = await getAuthHeaders(false);
        const response = await fetch(`${API_PATH}/upload-avatar`, { // Route is /upload-avatar in main.go, not /upload-avatar/:userId
            method: 'POST',
            headers,
            body: formData,
        });
        if (!response.ok) throw new Error('Failed to upload avatar');
        return response.json();
    },

    sendHeartbeat: async (userId: number) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_PATH}/heartbeat`, {
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
        const response = await fetch(`${API_PATH}/push-tokens/register`, {
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
        const response = await fetch(`${API_PATH}/push-tokens/unregister`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            throw new Error('Failed to unregister push token');
        }
        return response.json();
    },

    getBlockedUsers: async (userId: number): Promise<UserContact[]> => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_PATH}/blocks`, { headers });
        if (!response.ok) throw new Error('Failed to fetch blocked users');
        return response.json();
    },

    blockUser: async (userId: number, blockedId: number) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_PATH}/blocks/add`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ userId, blockedId }),
        });
        if (!response.ok) throw new Error('Failed to block user');
        return response.json();
    },

    unblockUser: async (userId: number, blockedId: number) => {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_PATH}/blocks/remove`, {
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
            const response = await fetch(`${API_PATH}/users/${userId}`, { headers });
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
