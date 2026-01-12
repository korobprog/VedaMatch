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
        await fetch(`${API_PATH}/heartbeat`, { // Route is /heartbeat in main.go
            method: 'POST',
            headers
        });
    },

    updatePushToken: async (pushToken: string) => {
        const headers = await getAuthHeaders();
        await fetch(`${API_PATH}/update-push-token`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ pushToken }),
        });
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
    }
};
