import { API_PATH } from '../config/api.config';
import { authorizedAxiosRequest } from './authSessionService';

export interface P2PMessage {
    id?: number;
    ID?: number;
    createdAt?: string;
    CreatedAt?: string;
    senderId: number;
    recipientId?: number;
    roomId?: number;
    senderName?: string;
    content: string;
    type: 'text' | 'image' | 'audio' | 'video' | 'file';
    fileName?: string;
    fileSize?: number;
    duration?: number;
}

export interface PaginatedMessagesResponse {
    items: P2PMessage[];
    hasMore: boolean;
    nextBeforeId?: number | null;
}

export const messageService = {
    async sendMessage(senderId: number, recipientId: number, content: string, type: 'text' | 'image' | 'audio' | 'video' | 'file' = 'text'): Promise<P2PMessage> {
        const response = await authorizedAxiosRequest<P2PMessage>({
            url: `${API_PATH}/messages`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: {
                senderId,
                recipientId,
                content,
                type,
            },
        });
        return response.data;
    },

    async getMessagesHistory(peerUserId: number, limit = 30, beforeId?: number): Promise<PaginatedMessagesResponse> {
        const params = new URLSearchParams({
            peerUserId: String(peerUserId),
            limit: String(limit),
        });
        if (beforeId && beforeId > 0) {
            params.set('beforeId', String(beforeId));
        }

        const response = await authorizedAxiosRequest<PaginatedMessagesResponse>({
            url: `${API_PATH}/messages/history?${params.toString()}`,
            method: 'GET',
        });

        const data = response.data || { items: [], hasMore: false };
        return {
            items: Array.isArray(data.items) ? data.items : [],
            hasMore: Boolean(data.hasMore),
            nextBeforeId: data.nextBeforeId ?? null,
        };
    },

    async getMessages(userId: number, recipientId: number): Promise<P2PMessage[]> {
        const history = await this.getMessagesHistory(recipientId, 100);
        return history.items;
    },

    async getRoomMessagesHistory(roomId: number, limit = 30, beforeId?: number): Promise<PaginatedMessagesResponse> {
        const params = new URLSearchParams({
            roomId: String(roomId),
            limit: String(limit),
        });
        if (beforeId && beforeId > 0) {
            params.set('beforeId', String(beforeId));
        }

        const response = await authorizedAxiosRequest<PaginatedMessagesResponse>({
            url: `${API_PATH}/messages/history?${params.toString()}`,
            method: 'GET',
        });

        const data = response.data || { items: [], hasMore: false };
        return {
            items: Array.isArray(data.items) ? data.items : [],
            hasMore: Boolean(data.hasMore),
            nextBeforeId: data.nextBeforeId ?? null,
        };
    },

    async deleteMessage(messageId: number): Promise<void> {
        await authorizedAxiosRequest({
            url: `${API_PATH}/messages/${messageId}`,
            method: 'DELETE',
        });
    },
};
