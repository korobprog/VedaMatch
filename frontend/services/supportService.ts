import { AxiosError } from 'axios';
import apiClient from '../lib/apiClient';
import i18n from '../i18n';
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
    slaTextHi?: string;
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
    reportType?: 'user' | 'content';
    reportedUserId?: number;
    reportedContentType?: 'chat_message' | 'ad' | 'profile' | 'other';
    reportedContentId?: string;
    reportReasonCode?: string;
    targetPreacherId?: number;
    attachmentUrl?: string;
    attachmentMimeType?: string;
    clientRequestId?: string;
    devicePlatform?: string;
    deviceOs?: string;
    deviceOsVersion?: string;
    deviceModel?: string;
    appVersion?: string;
    appBuild?: string;
    userAgent?: string;
}

export interface AddSupportMessagePayload {
    message?: string;
    attachmentUrl?: string;
    attachmentMimeType?: string;
    devicePlatform?: string;
    deviceOs?: string;
    deviceOsVersion?: string;
    deviceModel?: string;
    appVersion?: string;
    appBuild?: string;
    userAgent?: string;
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

export type SupportUpdateEvent = {
    conversationId?: number;
    source?: 'push' | 'local';
};

type SupportUpdateListener = (event: SupportUpdateEvent) => void;

const supportUpdateListeners = new Set<SupportUpdateListener>();

export const emitSupportUpdate = (event: SupportUpdateEvent = {}) => {
    supportUpdateListeners.forEach((listener) => {
        try {
            listener(event);
        } catch (error) {
            console.warn('[supportService] support update listener failed', error);
        }
    });
};

export const subscribeSupportUpdates = (listener: SupportUpdateListener) => {
    supportUpdateListeners.add(listener);
    return () => {
        supportUpdateListeners.delete(listener);
    };
};

const getSupportFallback = (
    key:
        | 'requestFailed'
        | 'loadConfig'
        | 'uploadAttachment'
        | 'createTicket'
        | 'fetchTickets'
        | 'fetchMessages'
        | 'postMessage'
        | 'markRead'
        | 'fetchUnread'
        | 'fetchQuestions'
        | 'updateVote'
): string => {
    const language = String(i18n.language || '').trim().toLowerCase();
    const copy = language.startsWith('ru')
        ? {
            requestFailed: 'Запрос не выполнен',
            loadConfig: 'Не удалось загрузить настройки поддержки',
            uploadAttachment: 'Не удалось загрузить вложение',
            createTicket: 'Не удалось создать тикет',
            fetchTickets: 'Не удалось загрузить тикеты',
            fetchMessages: 'Не удалось загрузить сообщения тикета',
            postMessage: 'Не удалось отправить сообщение',
            markRead: 'Не удалось отметить тикет как прочитанный',
            fetchUnread: 'Не удалось загрузить число непрочитанных тикетов',
            fetchQuestions: 'Не удалось загрузить вопросы проповеднику',
            updateVote: 'Не удалось обновить голос',
        }
        : language.startsWith('hi')
            ? {
                requestFailed: 'अनुरोध पूरा नहीं हो सका',
                loadConfig: 'सपोर्ट कॉन्फ़िगरेशन लोड नहीं हो सकी',
                uploadAttachment: 'अटैचमेंट अपलोड नहीं हो सका',
                createTicket: 'टिकट बनाना संभव नहीं हुआ',
                fetchTickets: 'टिकट लोड नहीं हो सके',
                fetchMessages: 'टिकट संदेश लोड नहीं हो सके',
                postMessage: 'संदेश भेजा नहीं जा सका',
                markRead: 'टिकट को पढ़ा हुआ चिन्हित नहीं किया जा सका',
                fetchUnread: 'अपठित टिकटों की संख्या लोड नहीं हो सकी',
                fetchQuestions: 'प्रचारक के प्रश्न लोड नहीं हो सके',
                updateVote: 'वोट अपडेट नहीं हो सका',
            }
            : {
                requestFailed: 'Request failed',
                loadConfig: 'Failed to load support config',
                uploadAttachment: 'Failed to upload attachment',
                createTicket: 'Failed to create support ticket',
                fetchTickets: 'Failed to fetch support tickets',
                fetchMessages: 'Failed to fetch support ticket messages',
                postMessage: 'Failed to post support message',
                markRead: 'Failed to mark support ticket as read',
                fetchUnread: 'Failed to fetch unread support count',
                fetchQuestions: 'Failed to fetch preacher questions',
                updateVote: 'Failed to update vote',
            };
    return copy[key];
};

const extractErrorMessage = (error: unknown, fallback = getSupportFallback('requestFailed')): string => {
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
            throw new Error(extractErrorMessage(error, getSupportFallback('loadConfig')));
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
            throw new Error(extractErrorMessage(error, getSupportFallback('uploadAttachment')));
        }
    },

    async createTicket(payload: CreateSupportTicketPayload): Promise<{ conversation: SupportConversation; idempotent?: boolean }> {
        try {
            const response = await apiClient.post('/support/tickets', payload);
            return response.data;
        } catch (error) {
            throw new Error(extractErrorMessage(error, getSupportFallback('createTicket')));
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
            throw new Error(extractErrorMessage(error, getSupportFallback('fetchTickets')));
        }
    },

    async getTicketMessages(conversationId: number): Promise<{ ticket: SupportConversation; messages: SupportMessage[]; unreadCount: number }> {
        await ensureRequiredAuth();
        try {
            const response = await apiClient.get(`/support/tickets/${conversationId}/messages`);
            return response.data;
        } catch (error) {
            throw new Error(extractErrorMessage(error, getSupportFallback('fetchMessages')));
        }
    },

    async postTicketMessage(conversationId: number, payload: AddSupportMessagePayload): Promise<{ ticket: SupportConversation }> {
        await ensureRequiredAuth();
        try {
            const response = await apiClient.post(`/support/tickets/${conversationId}/messages`, payload);
            return response.data;
        } catch (error) {
            throw new Error(extractErrorMessage(error, getSupportFallback('postMessage')));
        }
    },

    async markTicketRead(conversationId: number): Promise<void> {
        await ensureRequiredAuth();
        try {
            await apiClient.post(`/support/tickets/${conversationId}/read`, {});
        } catch (error) {
            throw new Error(extractErrorMessage(error, getSupportFallback('markRead')));
        }
    },

    async getUnreadCount(): Promise<{ unreadCount: number }> {
        await ensureRequiredAuth();
        try {
            const response = await apiClient.get('/support/unread-count');
            return response.data;
        } catch (error) {
            throw new Error(extractErrorMessage(error, getSupportFallback('fetchUnread')));
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
            throw new Error(extractErrorMessage(error, getSupportFallback('fetchQuestions')));
        }
    },

    async votePreacherQuestion(ticketId: number, value?: boolean): Promise<{ ticketId: number; voted: boolean; votes: number }> {
        await ensureRequiredAuth();
        try {
            const payload = typeof value === 'boolean' ? { value } : {};
            const response = await apiClient.post(`/support/tickets/${ticketId}/vote`, payload);
            return response.data;
        } catch (error) {
            throw new Error(extractErrorMessage(error, getSupportFallback('updateVote')));
        }
    },
};
