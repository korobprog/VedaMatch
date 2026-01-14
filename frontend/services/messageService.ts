import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';
import { getAuthHeaders } from './contactService';

export interface P2PMessage {
    id?: number;
    ID?: number;
    createdAt?: string;
    CreatedAt?: string;
    senderId: number;
    recipientId: number;
    content: string;
    type: 'text' | 'image' | 'audio' | 'video' | 'file';
    fileName?: string;
    fileSize?: number;
    duration?: number;
}

export const messageService = {
    async sendMessage(senderId: number, recipientId: number, content: string, type: 'text' | 'image' | 'audio' | 'video' | 'file' = 'text'): Promise<P2PMessage> {
        const url = `${API_BASE_URL}/api/messages`;
        const headers = await getAuthHeaders();
        console.log(`[messageService] Sending message to: ${url}`);
        try {
            const response = await axios.post(url, {
                senderId,
                recipientId,
                content,
                type,
            }, { headers });
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 401) {
                console.error('[messageService] Unauthorized: Session expired or invalid token');
                throw new Error('UNAUTHORIZED');
            }
            console.error(`[messageService] Send failed to ${url}`, error.response?.status, error.response?.data);
            throw error;
        }
    },

    async getMessages(userId: number, recipientId: number): Promise<P2PMessage[]> {
        const url = `${API_BASE_URL}/api/messages/${userId}/${recipientId}`;
        const headers = await getAuthHeaders();
        console.log(`[messageService] Fetching messages from: ${url}`);
        try {
            const response = await axios.get(url, { headers });
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 401) {
                console.error('[messageService] Unauthorized: Session expired or invalid token');
                throw new Error('UNAUTHORIZED');
            }
            console.error(`[messageService] Fetch failed from ${url}`, error.response?.status);
            throw error;
        }
    },

    async deleteMessage(messageId: number): Promise<void> {
        const url = `${API_BASE_URL}/api/messages/${messageId}`;
        const headers = await getAuthHeaders();
        try {
            await axios.delete(url, { headers });
        } catch (error: any) {
            // Don't log 404 as error, as it's handled gracefully (message already gone)
            if (error.response?.status !== 404) {
                console.error('[messageService] Delete failed', error.response?.status);
            }
            throw error;
        }
    },
};
