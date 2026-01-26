import api from './api';

export interface ScriptureBook {
    id: number;
    code: string;
    name_en: string;
    name_ru: string;
    description_en: string;
    description_ru: string;
    created_at: string;
    updated_at: string;
}

export interface ScriptureVerse {
    id: number;
    book_code: string;
    canto: number;
    chapter: number;
    verse: string;
    language: string;
    devanagari: string;
    transliteration: string;
    synonyms: string;
    translation: string;
    purport: string;
    source_url: string;
    verse_reference: string;
    created_at: string;
    updated_at: string;
}

export interface ChapterInfo {
    canto: number;
    chapter: number;
}

class LibraryService {
    async getBooks(): Promise<ScriptureBook[]> {
        try {
            const response = await api.get('/library/books');
            return response.data;
        } catch (error) {
            console.error('Error fetching books:', error);
            throw error;
        }
    }

    async getBookDetails(idOrCode: string | number): Promise<ScriptureBook> {
        try {
            const response = await api.get(`/library/books/${idOrCode}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching book ${idOrCode}:`, error);
            throw error;
        }
    }

    async getChapters(bookCode: string): Promise<ChapterInfo[]> {
        try {
            const response = await api.get(`/library/books/${bookCode}/chapters`);
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

            const response = await api.get('/library/verses', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching verses:', error);
            throw error;
        }
    }

    async search(query: string): Promise<ScriptureVerse[]> {
        try {
            const response = await api.get('/library/search', {
                params: { q: query }
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
            const response = await api.get(`/library/books/${bookCode}/export`, { params });
            return response.data;
        } catch (error) {
            console.error(`Error exporting book ${bookCode}:`, error);
            throw error;
        }
    }
}

export const libraryService = new LibraryService();
