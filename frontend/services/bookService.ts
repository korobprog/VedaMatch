import apiClient from '../lib/apiClient';

export interface Book {
    id: number;
    code: string;
    name_en: string;
    name_ru: string;
    description_en: string;
    description_ru: string;
}

export interface Verse {
    id: number;
    book_code: string;
    canto: number;
    chapter: number;
    verse: string;
    text_sanskrit: string; // Mapped from devanagari in backend if needed, or just use devanagari
    devanagari: string;
    translation: string;
    purport: string;
    synonyms: string;
}

export interface Chapter {
    canto: number;
    chapter: number;
}

export const bookService = {
    getBooks: async (): Promise<Book[]> => {
        const response = await apiClient.get('/library/books');
        return response.data;
    },

    getChapters: async (bookCode: string): Promise<Chapter[]> => {
        const response = await apiClient.get(`/library/books/${bookCode}/chapters`);
        return response.data;
    },

    getVerses: async (bookCode: string, chapter: number, canto?: number, language: string = 'ru'): Promise<Verse[]> => {
        const response = await apiClient.get('/library/verses', {
            params: {
                bookCode,
                chapter,
                ...(canto ? { canto } : {}),
                ...(language ? { language } : {}),
            },
        });
        return response.data;
    }
};
