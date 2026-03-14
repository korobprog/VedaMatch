import apiClient from '../lib/apiClient';
import { getAccessToken } from './authSessionService';

export interface FriendRequest {
    id: number;
    senderId: number;
    senderName: string;
    avatarUrl: string;
    city: string;
    country: string;
    createdAt: string;
}

export interface FriendRequestResponse {
    id: number;
    senderId: number;
    receiverId: number;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
    updatedAt: string;
}

const getAuthHeaders = async () => {
    const token = await getAccessToken();
    const headers: any = {};
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    headers['Content-Type'] = 'application/json';
    return headers;
};

export const friendRequestService = {
    /**
     * Send a friend request to a user
     */
    sendRequest: async (receiverId: number): Promise<FriendRequestResponse> => {
        try {
            const headers = await getAuthHeaders();
            const { data } = await apiClient.post('/friends/request', {
                receiverId,
            }, { headers });
            return data;
        } catch (error: any) {
            console.error('[FriendRequestService] Error sending request:', error);
            throw new Error(error.response?.data?.error || 'Failed to send friend request');
        }
    },

    /**
     * Get incoming friend requests
     */
    getIncomingRequests: async (): Promise<FriendRequest[]> => {
        try {
            const headers = await getAuthHeaders();
            const { data } = await apiClient.get('/friends/requests', { headers });
            if (Array.isArray(data)) {
                return data;
            }
            return [];
        } catch (error: any) {
            console.error('[FriendRequestService] Error fetching requests:', error);
            throw new Error(error.response?.data?.error || 'Failed to fetch friend requests');
        }
    },

    /**
     * Accept a friend request
     */
    acceptRequest: async (requestId: number): Promise<{ message: string }> => {
        try {
            const headers = await getAuthHeaders();
            const { data } = await apiClient.post('/friends/request/accept', {
                requestId,
            }, { headers });
            return data;
        } catch (error: any) {
            console.error('[FriendRequestService] Error accepting request:', error);
            throw new Error(error.response?.data?.error || 'Failed to accept friend request');
        }
    },

    /**
     * Reject a friend request
     */
    rejectRequest: async (requestId: number): Promise<{ message: string }> => {
        try {
            const headers = await getAuthHeaders();
            const { data } = await apiClient.post('/friends/request/reject', {
                requestId,
            }, { headers });
            return data;
        } catch (error: any) {
            console.error('[FriendRequestService] Error rejecting request:', error);
            throw new Error(error.response?.data?.error || 'Failed to reject friend request');
        }
    },

    /**
     * Cancel a sent friend request
     */
    cancelRequest: async (requestId: number): Promise<{ message: string }> => {
        try {
            const headers = await getAuthHeaders();
            const { data } = await apiClient.post('/friends/request/cancel', {
                requestId,
            }, { headers });
            return data;
        } catch (error: any) {
            console.error('[FriendRequestService] Error cancelling request:', error);
            throw new Error(error.response?.data?.error || 'Failed to cancel friend request');
        }
    },
};
