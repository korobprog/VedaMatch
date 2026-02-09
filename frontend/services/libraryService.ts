import axios from 'axios';
import { API_PATH } from '../config/api.config';
import { ScriptureBook, ScriptureVerse, ChapterInfo } from '../types/library';
import { getGodModeQueryParams } from './godModeService';

class LibraryService {
    // Public endpoints, usually no auth header required, but we can send if needed
    // Assuming library is public.

    async getBooks(): Promise<ScriptureBook[]> {
        try {
            const godModeParams = await getGodModeQueryParams();
            const response = await axios.get(`${API_PATH}/library/books`, { params: godModeParams });
            return response.data;
        } catch (error) {
            console.error('Error fetching books:', error);
            throw error;
        }
    }

    async getBookDetails(idOrCode: string | number): Promise<ScriptureBook> {
        try {
            const response = await axios.get(`${API_PATH}/library/books/${idOrCode}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching book ${idOrCode}:`, error);
            throw error;
        }
    }

    async getChapters(bookCode: string): Promise<ChapterInfo[]> {
        try {
            const response = await axios.get(`${API_PATH}/library/books/${bookCode}/chapters`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching chapters for ${bookCode}:`, error);
            throw error;
        }
    }

    async getVerses(bookCode: string, chapter: number, canto?: number, language?: string): Promise<ScriptureVerse[]> {
        try {
            const params: any = { bookCode, chapter };
            if (canto !== undefined) params.canto = canto;
            if (language) params.language = language;
            Object.assign(params, await getGodModeQueryParams());

            const response = await axios.get(`${API_PATH}/library/verses`, { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching verses:', error);
            throw error;
        }
    }

    async search(query: string): Promise<ScriptureVerse[]> {
        try {
            const godModeParams = await getGodModeQueryParams();
            const response = await axios.get(`${API_PATH}/library/search`, {
                params: { q: query, ...godModeParams }
            });
            return response.data;
        } catch (error) {
            console.error('Error searching library:', error);
            throw error;
        }
    }

    async exportBook(bookCode: string, language?: string): Promise<ScriptureVerse[]> {
        try {
            const params: any = {};
            if (language) params.language = language;
            const response = await axios.get(`${API_PATH}/library/books/${bookCode}/export`, { params });
            return response.data;
        } catch (error) {
            console.error(`Error exporting book ${bookCode}:`, error);
            throw error;
        }
    }
}

export const libraryService = new LibraryService();
