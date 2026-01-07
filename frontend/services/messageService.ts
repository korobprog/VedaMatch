import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

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
    async sendMessage(senderId: number, recipientId: number, content: string, type: 'text' | 'image' = 'text'): Promise<P2PMessage> {
        const url = `${API_BASE_URL}/api/messages`;
        console.log(`[messageService] Sending message to: ${url}`, { senderId, recipientId, content });
        try {
            const response = await axios.post(url, {
                senderId,
                recipientId,
                content,
                type,
            });
            return response.data;
        } catch (error: any) {
            console.error(`[messageService] Send failed to ${url}`, error.response?.status, error.response?.data);
            throw error;
        }
    },

    async getMessages(userId: number, recipientId: number): Promise<P2PMessage[]> {
        const url = `${API_BASE_URL}/api/messages/${userId}/${recipientId}`;
        console.log(`[messageService] Fetching messages from: ${url}`);
        try {
            const response = await axios.get(url);
            return response.data;
        } catch (error: any) {
            console.error(`[messageService] Fetch failed from ${url}`, error.response?.status);
            throw error;
        }
    },
};
