import { API_PATH } from '../config/api.config';
import { authorizedFetch, getAccessToken } from './authSessionService';

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
    attachmentUrl?: string;
    attachmentMimeType?: string;
    clientRequestId?: string;
}

export interface AddSupportMessagePayload {
    message?: string;
    attachmentUrl?: string;
    attachmentMimeType?: string;
}

const getToken = async (): Promise<string> => {
    const token = await getAccessToken();
    if (!token || token === 'undefined' || token === 'null') {
        return '';
    }
    return token;
};

const buildHeaders = async (authMode: 'optional' | 'required', contentTypeJson: boolean = true): Promise<Record<string, string>> => {
    const token = await getToken();
    const headers: Record<string, string> = {};
    if (contentTypeJson) {
        headers['Content-Type'] = 'application/json';
    }
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    if (authMode === 'required' && !headers.Authorization) {
        throw new Error('UNAUTHORIZED');
    }
    return headers;
};

const parseJsonSafe = async (response: Response): Promise<any> => {
    try {
        return await response.json();
    } catch {
        return null;
    }
};

const requestJson = async (url: string, init: RequestInit = {}): Promise<any> => {
    const response = await authorizedFetch(url, init);
    const payload = await parseJsonSafe(response);
    if (!response.ok) {
        const message = payload?.error || payload?.message || `Request failed: ${response.status}`;
        throw new Error(message);
    }
    return payload;
};

const randomRequestId = () => `support_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const supportService = {
    randomRequestId,

    async getConfig(): Promise<SupportConfig> {
        const headers = await buildHeaders('optional', false);
        return requestJson(`${API_PATH}/support/config`, {
            method: 'GET',
            headers,
        });
    },

    async uploadAttachment(file: { uri: string; type?: string; fileName?: string }): Promise<{ url: string; size: number; contentType: string }> {
        const headers = await buildHeaders('optional', false);
        const form = new FormData();
        form.append('file', {
            uri: file.uri,
            type: file.type || 'image/jpeg',
            name: file.fileName || `support_${Date.now()}.jpg`,
        } as any);

        return requestJson(`${API_PATH}/support/uploads`, {
            method: 'POST',
            headers,
            body: form,
        });
    },

    async createTicket(payload: CreateSupportTicketPayload): Promise<{ conversation: SupportConversation; idempotent?: boolean }> {
        const headers = await buildHeaders('optional', true);
        return requestJson(`${API_PATH}/support/tickets`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
    },

    async listMyTickets(page: number = 1, limit: number = 20): Promise<{ tickets: SupportConversation[]; total: number; page: number; limit: number }> {
        const headers = await buildHeaders('required', false);
        return requestJson(`${API_PATH}/support/tickets?page=${page}&limit=${limit}`, {
            method: 'GET',
            headers,
        });
    },

    async getTicketMessages(conversationId: number): Promise<{ ticket: SupportConversation; messages: SupportMessage[]; unreadCount: number }> {
        const headers = await buildHeaders('required', false);
        return requestJson(`${API_PATH}/support/tickets/${conversationId}/messages`, {
            method: 'GET',
            headers,
        });
    },

    async postTicketMessage(conversationId: number, payload: AddSupportMessagePayload): Promise<{ ticket: SupportConversation }> {
        const headers = await buildHeaders('required', true);
        return requestJson(`${API_PATH}/support/tickets/${conversationId}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
    },

    async markTicketRead(conversationId: number): Promise<void> {
        const headers = await buildHeaders('required', false);
        await requestJson(`${API_PATH}/support/tickets/${conversationId}/read`, {
            method: 'POST',
            headers,
        });
    },

    async getUnreadCount(): Promise<{ unreadCount: number }> {
        const headers = await buildHeaders('required', false);
        return requestJson(`${API_PATH}/support/unread-count`, {
            method: 'GET',
            headers,
        });
    },
};
