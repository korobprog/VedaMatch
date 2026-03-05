import apiClient from '../lib/apiClient';
import type { AxiosError } from 'axios';

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
    type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'document' | 'video_circle' | 'contact_card';
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    duration?: number;
    mapData?: Record<string, unknown> | null;
}

export interface PaginatedMessagesResponse {
    items: P2PMessage[];
    hasMore: boolean;
    nextBeforeId?: number | null;
}

export interface CursorPaginatedMessagesResponse {
    items: P2PMessage[];
    hasMore: boolean;
    nextCursor?: number | null;
}

export interface MessageMediaPresignRequest {
    recipientId?: number;
    roomId?: number;
    type: 'video_circle';
    fileName: string;
    mimeType: string;
    fileSize: number;
    durationSec: number;
}

export interface MessageMediaPresignResponse {
    uploadUrl: string;
    finalUrl: string;
    objectKey: string;
    expiresInSec: number;
    requiredHeaders?: Record<string, string>;
}

export interface MessageMediaFinalizeRequest {
    recipientId?: number;
    roomId?: number;
    type: 'video_circle';
    content: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    duration: number;
    thumbnail?: string;
    mapData?: Record<string, unknown>;
}

export interface MessageSearchParams {
    peerUserId?: number;
    roomId?: number;
    q: string;
    cursor?: number;
    limit?: number;
    includeTranscripts?: boolean;
}

export interface MessageMediaIndexParams {
    peerUserId?: number;
    roomId?: number;
    cursor?: number;
    limit?: number;
    types?: Array<'image' | 'audio' | 'document' | 'video_circle'>;
}

export interface ChatPreference {
    id?: number;
    userId: number;
    peerUserId: number;
    muted: boolean;
    pinned: boolean;
    pinnedAt?: string | null;
}

export interface ShareContactRequest {
    recipientId?: number;
    roomId?: number;
    targetUserId: number;
}

export interface MessageTranscriptionResponse {
    messageId: number;
    transcript: {
        status: string;
        text: string;
        model: string;
        language?: string;
        updatedAt?: string;
    };
    billing?: MessageTranscriptionBilling;
}

export interface MessageTranscriptionBilling {
    audioMinutes: number;
    freeMinutesUsed: number;
    paidMinutes: number;
    chargedLkm: number;
    pricePerMinuteLkm: number;
    tariffType: 'free' | 'standard' | 'long_audio';
    weeklyQuotaTotal: number;
    weeklyQuotaRemaining: number;
}

export interface MessageTranscriptionQuoteResponse {
    messageId: number;
    billing: MessageTranscriptionBilling;
}

export const messageService = {
    async sendMessage(
        senderId: number,
        recipientId: number,
        content: string,
        type: 'text' | 'image' | 'audio' | 'video' | 'file' | 'document' | 'video_circle' | 'contact_card' = 'text',
    ): Promise<P2PMessage> {
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

    async presignMedia(request: MessageMediaPresignRequest): Promise<MessageMediaPresignResponse> {
        const response = await apiClient.post<MessageMediaPresignResponse>('/messages/media/presign', request);
        return response.data;
    },

    async finalizeMedia(request: MessageMediaFinalizeRequest): Promise<P2PMessage> {
        const response = await apiClient.post<P2PMessage>('/messages/media/finalize', request);
        return response.data;
    },

    async getMediaIndex(params: MessageMediaIndexParams): Promise<CursorPaginatedMessagesResponse> {
        const response = await apiClient.get<CursorPaginatedMessagesResponse>('/messages/media-index', {
            params: {
                ...params,
                types: params.types?.join(','),
            },
        });
        const data = response.data || { items: [], hasMore: false };
        return {
            items: Array.isArray(data.items) ? data.items : [],
            hasMore: Boolean(data.hasMore),
            nextCursor: data.nextCursor ?? null,
        };
    },

    async searchMessages(params: MessageSearchParams): Promise<CursorPaginatedMessagesResponse> {
        const response = await apiClient.get<CursorPaginatedMessagesResponse>('/messages/search', {
            params,
        });
        const data = response.data || { items: [], hasMore: false };
        return {
            items: Array.isArray(data.items) ? data.items : [],
            hasMore: Boolean(data.hasMore),
            nextCursor: data.nextCursor ?? null,
        };
    },

    async updateChatPreference(peerUserId: number, payload: { muted?: boolean; pinned?: boolean }): Promise<ChatPreference> {
        const response = await apiClient.put<ChatPreference>(`/messages/preferences/${peerUserId}`, payload);
        return response.data;
    },

    async shareContact(payload: ShareContactRequest): Promise<P2PMessage> {
        const response = await apiClient.post<P2PMessage>('/messages/share-contact', payload);
        return response.data;
    },

    async transcribeMessage(messageId: number, language?: string): Promise<MessageTranscriptionResponse> {
        const payload = {
            ...(language ? { language } : {}),
        };
        try {
            const response = await apiClient.post<MessageTranscriptionResponse>(`/messages/${messageId}/transcribe`, payload);
            return response.data;
        } catch (error) {
            const status = (error as AxiosError)?.response?.status;
            if (status === 404 || status === 405) {
                const fallback = await apiClient.post<MessageTranscriptionResponse>(`/messages/transcribe/${messageId}`, payload);
                return fallback.data;
            }
            throw error;
        }
    },

    async getTranscribeQuote(messageId: number): Promise<MessageTranscriptionQuoteResponse> {
        try {
            const response = await apiClient.get<MessageTranscriptionQuoteResponse>(`/messages/${messageId}/transcribe/quote`);
            return response.data;
        } catch (error) {
            const status = (error as AxiosError)?.response?.status;
            if (status === 404 || status === 405) {
                return {
                    messageId,
                    billing: {
                        audioMinutes: 1,
                        freeMinutesUsed: 0,
                        paidMinutes: 0,
                        chargedLkm: 0,
                        pricePerMinuteLkm: 0,
                        tariffType: 'free',
                        weeklyQuotaTotal: 0,
                        weeklyQuotaRemaining: 0,
                    },
                };
            }
            throw error;
        }
    },
};
