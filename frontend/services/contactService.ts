import { API_PATH } from '../config/api.config';

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
}

export const contactService = {
    getContacts: async (): Promise<UserContact[]> => {
        const response = await fetch(`${API_PATH}/contacts`);
        if (!response.ok) throw new Error('Failed to fetch contacts');
        return response.json();
    },

    getFriends: async (userId: number): Promise<UserContact[]> => {
        const response = await fetch(`${API_PATH}/friends/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch friends');
        return response.json();
    },

    addFriend: async (userId: number, friendId: number) => {
        const response = await fetch(`${API_PATH}/friends/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, friendId }),
        });
        if (!response.ok) throw new Error('Failed to add friend');
        return response.json();
    },

    removeFriend: async (userId: number, friendId: number) => {
        const response = await fetch(`${API_PATH}/friends/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, friendId }),
        });
        if (!response.ok) throw new Error('Failed to remove friend');
    },

    uploadAvatar: async (userId: number, formData: FormData) => {
        const response = await fetch(`${API_PATH}/upload-avatar/${userId}`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) throw new Error('Failed to upload avatar');
        return response.json();
    },

    sendHeartbeat: async (userId: number) => {
        await fetch(`${API_PATH}/heartbeat/${userId}`, { method: 'POST' });
    },

    getBlockedUsers: async (userId: number): Promise<UserContact[]> => {
        const response = await fetch(`${API_PATH}/blocks/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch blocked users');
        return response.json();
    },

    blockUser: async (userId: number, blockedId: number) => {
        const response = await fetch(`${API_PATH}/blocks/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, blockedId }),
        });
        if (!response.ok) throw new Error('Failed to block user');
        return response.json();
    },

    unblockUser: async (userId: number, blockedId: number) => {
        const response = await fetch(`${API_PATH}/blocks/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, blockedId }),
        });
        if (!response.ok) throw new Error('Failed to unblock user');
    }
};
