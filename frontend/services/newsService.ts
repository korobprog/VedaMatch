import axios from 'axios';
import { API_PATH } from '../config/api.config';
import { getAuthHeaders } from './contactService';
import { getGodModeQueryParams } from './godModeService';

export interface NewsItem {
    id: number;
    sourceId: number;
    sourceName?: string;
    title: string;
    summary: string;
    content: string;
    imageUrl: string;
    tags: string;
    category: string;
    status: string;
    isImportant: boolean;
    publishedAt: string | null;
    viewsCount: number;
    originalUrl?: string;
    createdAt: string;
    updatedAt: string;
}

export interface NewsFilters {
    page?: number;
    limit?: number;
    lang?: string;
    category?: string;
    tags?: string;
    search?: string;
    madh?: string;
    personalized?: boolean;
}

export interface NewsListResponse {
    news: NewsItem[];
    total: number;
    page: number;
    totalPages: number;
}

class NewsService {
    /**
     * Get paginated list of published news
     */
    async getNews(filters?: NewsFilters): Promise<NewsListResponse> {
        try {
            const headers = await getAuthHeaders();
            const godModeParams = await getGodModeQueryParams();
            const response = await axios.get(`${API_PATH}/news`, {
                params: { ...(filters || {}), ...godModeParams },
                headers
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching news:', error);
            throw error;
        }
    }

    /**
     * Get latest news for widgets (limited to small number)
     */
    async getLatestNews(limit: number = 3, lang: string = 'ru'): Promise<NewsItem[]> {
        try {
            const headers = await getAuthHeaders();
            const godModeParams = await getGodModeQueryParams();
            const response = await axios.get(`${API_PATH}/news/latest`, {
                params: { limit, lang, ...godModeParams },
                headers
            });
            return response.data.news || [];
        } catch (error) {
            console.error('Error fetching latest news:', error);
            throw error;
        }
    }

    /**
     * Get a single news item by ID
     */
    async getNewsItem(id: number, lang: string = 'ru'): Promise<NewsItem> {
        try {
            const headers = await getAuthHeaders();
            const response = await axios.get(`${API_PATH}/news/${id}`, {
                params: { lang },
                headers
            });
            return response.data;
        } catch (error) {
            console.error(`Error fetching news item ${id}:`, error);
            throw error;
        }
    }

    /**
     * Get available news categories
     */
    async getCategories(): Promise<string[]> {
        try {
            const headers = await getAuthHeaders();
            const response = await axios.get(`${API_PATH}/news/categories`, { headers });
            return response.data.categories || [];
        } catch (error) {
            console.error('Error fetching news categories:', error);
            throw error;
        }
    }

    // ==================== SUBSCRIPTIONS & FAVORITES ====================

    async subscribe(sourceId: number): Promise<boolean> {
        try {
            const headers = await getAuthHeaders();
            await axios.post(`${API_PATH}/news/sources/${sourceId}/subscribe`, {}, { headers });
            return true;
        } catch (error) {
            console.error('Error subscribing:', error);
            return false;
        }
    }

    async unsubscribe(sourceId: number): Promise<boolean> {
        try {
            const headers = await getAuthHeaders();
            await axios.delete(`${API_PATH}/news/sources/${sourceId}/subscribe`, { headers });
            return true;
        } catch (error) {
            console.error('Error unsubscribing:', error);
            return false;
        }
    }

    async getSubscriptions(): Promise<number[]> {
        try {
            const headers = await getAuthHeaders();
            const response = await axios.get(`${API_PATH}/news/subscriptions`, { headers });
            return response.data.subscriptions || [];
        } catch (error) {
            console.error('Error fetching subscriptions:', error);
            return [];
        }
    }

    async addFavorite(sourceId: number): Promise<boolean> {
        try {
            const headers = await getAuthHeaders();
            await axios.post(`${API_PATH}/news/sources/${sourceId}/favorite`, {}, { headers });
            return true;
        } catch (error) {
            console.error('Error adding favorite:', error);
            return false;
        }
    }

    async removeFavorite(sourceId: number): Promise<boolean> {
        try {
            const headers = await getAuthHeaders();
            await axios.delete(`${API_PATH}/news/sources/${sourceId}/favorite`, { headers });
            return true;
        } catch (error) {
            console.error('Error removing favorite:', error);
            return false;
        }
    }

    async getFavorites(): Promise<number[]> {
        try {
            const headers = await getAuthHeaders();
            const response = await axios.get(`${API_PATH}/news/favorites`, { headers });
            return response.data.favorites || [];
        } catch (error) {
            console.error('Error fetching favorites:', error);
            return [];
        }
    }

    // ==================== HELPERS ====================

    /**
     * Alias for getNewsItem - Get a single news item by ID
     */
    async getNewsById(id: number, lang: string = 'ru'): Promise<NewsItem> {
        return this.getNewsItem(id, lang);
    }

    /**
     * Format date for display
     */
    formatDate(dateString: string | null): string {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    }

    /**
     * Clean text from social media artifacts, redundant links and formatting
     */
    cleanText(text: string | null | undefined): string {
        if (!text) return '';

        let cleaned = text;

        // 1. Remove URLs (http/https)
        cleaned = cleaned.replace(/https?:\/\/\S+/g, '');

        // 2. Remove typical social media "Read more" artifacts
        const artifacts = [
            /Читать далее[:.]?/gi,
            /Подробнее[:.]?/gi,
            /Источник[:.]?/gi,
            /Source[:.]?/gi,
            /Read more[:.]?/gi,
            /📌/g,
            /✅/g,
        ];

        artifacts.forEach(pattern => {
            cleaned = cleaned.replace(pattern, '');
        });

        // 3. Remove multiple newlines and spaces
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        cleaned = cleaned.replace(/[ ]{2,}/g, ' ');

        // 4. Trim spaces at start/end of lines
        cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');

        return cleaned.trim();
    }

    /**
     * Parse tags string into array
     */
    parseTags(tags: string): string[] {
        if (!tags) return [];
        return tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
}

export const newsService = new NewsService();
