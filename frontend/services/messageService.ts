import apiClient from '../lib/apiClient';

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
    mimeType?: string;
    duration?: number;
}

export interface PaginatedMessagesResponse {
    items: P2PMessage[];
    hasMore: boolean;
    nextBeforeId?: number | null;
}

export const messageService = {
    async sendMessage(senderId: number, recipientId: number, content: string, type: 'text' | 'image' | 'audio' | 'video' | 'file' = 'text'): Promise<P2PMessage> {
        const response = await apiClient.post<P2PMessage>('/messages', {
            senderId,
            recipientId,
            content,
            type,
        });
        return response.data;
    },

    async getMessagesHistory(peerUserId: number, limit = 30, beforeId?: number): Promise<PaginatedMessagesResponse> {
        const response = await apiClient.get<PaginatedMessagesResponse>('/messages/history', {
            params: {
                peerUserId,
                limit,
                ...(beforeId && beforeId > 0 ? { beforeId } : {}),
            },
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
        const response = await apiClient.get<PaginatedMessagesResponse>('/messages/history', {
            params: {
                roomId,
                limit,
                ...(beforeId && beforeId > 0 ? { beforeId } : {}),
            },
        });

        const data = response.data || { items: [], hasMore: false };
        return {
            items: Array.isArray(data.items) ? data.items : [],
            hasMore: Boolean(data.hasMore),
            nextBeforeId: data.nextBeforeId ?? null,
        };
    },

    async deleteMessage(messageId: number): Promise<void> {
        await apiClient.delete(`/messages/${messageId}`);
    },
};
