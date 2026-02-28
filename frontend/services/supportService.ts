import { AxiosError } from 'axios';
import apiClient from '../lib/apiClient';
import { getAccessToken } from './authSessionService';

export type SupportConversationStatus = 'open' | 'resolved';
export type SupportConversationChannel = 'telegram' | 'in_app';

export interface SupportConfig {
    appEntryEnabled: boolean;
    appEntryRolloutPercent: number;
    appEntryEligible: boolean;
    telegramBotUrl: string;
    channelUrl: string;
    slaTextRu: string;
    slaTextEn: string;
    languages: string[];
    channels: {
        telegram: boolean;
        inAppTicket: boolean;
    };
}

export interface SupportConversation {
    ID: number;
    CreatedAt: string;
    UpdatedAt: string;
    channel: SupportConversationChannel;
    status: SupportConversationStatus;
    ticketNumber?: string;
    subject?: string;
    requesterName?: string;
    requesterContact?: string;
    entryPoint?: string;
    lastMessageAt?: string;
    lastMessagePreview?: string;
    firstResponseAt?: string;
    resolvedAt?: string;
    unreadCount?: number;
}

export interface SupportMessage {
    ID: number;
    CreatedAt: string;
    direction: 'inbound' | 'outbound';
    source: 'user' | 'bot' | 'operator';
    type: 'text' | 'image';
    text?: string;
    caption?: string;
    mediaUrl?: string;
    mimeType?: string;
    isReadByUser?: boolean;
    sentAt?: string;
}

export interface CreateSupportTicketPayload {
    subject?: string;
    message?: string;
    contact?: string;
    name?: string;
    entryPoint?: string;
    targetPreacherId?: number;
    attachmentUrl?: string;
    attachmentMimeType?: string;
    clientRequestId?: string;
}

export interface AddSupportMessagePayload {
    message?: string;
    attachmentUrl?: string;
    attachmentMimeType?: string;
}

export interface SupportPreacherQuestion {
    id: number;
    ticketNumber?: string;
    subject: string;
    excerpt: string;
    createdAt: string;
    voteCount: number;
    myVote: boolean;
}

const extractErrorMessage = (error: unknown, fallback = 'Request failed'): string => {
    const axiosError = error as AxiosError<any>;
    const payload = axiosError?.response?.data;

    if (typeof payload === 'string' && payload.trim()) {
        return payload;
    }
    if (payload && typeof payload === 'object') {
        const message = payload.error || payload.message;
        if (message && typeof message === 'string') {
            return message;
        }
    }
    if (axiosError?.message) {
        return axiosError.message;
    }
    return fallback;
};

const ensureRequiredAuth = async (): Promise<void> => {
    const token = await getAccessToken();
    if (!token || token === 'undefined' || token === 'null') {
        throw new Error('UNAUTHORIZED');
    }
};

const randomRequestId = () => `support_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const supportService = {
    randomRequestId,

    async getConfig(): Promise<SupportConfig> {
        try {
            const response = await apiClient.get<SupportConfig>('/support/config');
            return response.data;
        } catch (error) {
            throw new Error(extractErrorMessage(error, 'Failed to load support config'));
        }
    },

    async uploadAttachment(file: { uri: string; type?: string; fileName?: string }): Promise<{ url: string; size: number; contentType: string }> {
        const form = new FormData();
        form.append('file', {
            uri: file.uri,
            type: file.type || 'image/jpeg',
            name: file.fileName || `support_${Date.now()}.jpg`,
        } as any);

        try {
            const response = await apiClient.post('/support/uploads', form, {
                headers: { Accept: 'application/json' },
            });
            return response.data;
        } catch (error) {
            throw new Error(extractErrorMessage(error, 'Failed to upload attachment'));
        }
    },

    async createTicket(payload: CreateSupportTicketPayload): Promise<{ conversation: SupportConversation; idempotent?: boolean }> {
        try {
            const response = await apiClient.post('/support/tickets', payload);
            return response.data;
        } catch (error) {
            throw new Error(extractErrorMessage(error, 'Failed to create support ticket'));
        }
    },

    async listMyTickets(page: number = 1, limit: number = 20): Promise<{ tickets: SupportConversation[]; total: number; page: number; limit: number }> {
        await ensureRequiredAuth();
        try {
            const response = await apiClient.get('/support/tickets', {
                params: { page, limit },
            });
            return response.data;
        } catch (error) {
            throw new Error(extractErrorMessage(error, 'Failed to fetch support tickets'));
        }
    },

    async getTicketMessages(conversationId: number): Promise<{ ticket: SupportConversation; messages: SupportMessage[]; unreadCount: number }> {
        await ensureRequiredAuth();
        try {
            const response = await apiClient.get(`/support/tickets/${conversationId}/messages`);
            return response.data;
        } catch (error) {
            throw new Error(extractErrorMessage(error, 'Failed to fetch support ticket messages'));
        }
    },

    async postTicketMessage(conversationId: number, payload: AddSupportMessagePayload): Promise<{ ticket: SupportConversation }> {
        await ensureRequiredAuth();
        try {
            const response = await apiClient.post(`/support/tickets/${conversationId}/messages`, payload);
            return response.data;
        } catch (error) {
            throw new Error(extractErrorMessage(error, 'Failed to post support message'));
        }
    },

    async markTicketRead(conversationId: number): Promise<void> {
        await ensureRequiredAuth();
        try {
            await apiClient.post(`/support/tickets/${conversationId}/read`, {});
        } catch (error) {
            throw new Error(extractErrorMessage(error, 'Failed to mark support ticket as read'));
        }
    },

    async getUnreadCount(): Promise<{ unreadCount: number }> {
        await ensureRequiredAuth();
        try {
            const response = await apiClient.get('/support/unread-count');
            return response.data;
        } catch (error) {
            throw new Error(extractErrorMessage(error, 'Failed to fetch unread support count'));
        }
    },

    async getPreacherQuestions(preacherId: number, page: number = 1, limit: number = 20): Promise<{ questions: SupportPreacherQuestion[]; total: number; page: number; limit: number }> {
        await ensureRequiredAuth();
        try {
            const response = await apiClient.get(`/support/preachers/${preacherId}/questions`, {
                params: { page, limit },
            });
            return response.data;
        } catch (error) {
            throw new Error(extractErrorMessage(error, 'Failed to fetch preacher questions'));
        }
    },

    async votePreacherQuestion(ticketId: number, value?: boolean): Promise<{ ticketId: number; voted: boolean; votes: number }> {
        await ensureRequiredAuth();
        try {
            const payload = typeof value === 'boolean' ? { value } : {};
            const response = await apiClient.post(`/support/tickets/${ticketId}/vote`, payload);
            return response.data;
        } catch (error) {
            throw new Error(extractErrorMessage(error, 'Failed to update vote'));
        }
    },
};
