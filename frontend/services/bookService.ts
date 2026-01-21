import { API_PATH } from '../config/api.config';

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
        const response = await fetch(`${API_PATH}/library/books`);
        if (!response.ok) throw new Error('Failed to fetch books');
        return response.json();
    },

    getChapters: async (bookCode: string): Promise<Chapter[]> => {
        const response = await fetch(`${API_PATH}/library/books/${bookCode}/chapters`);
        if (!response.ok) throw new Error('Failed to fetch chapters');
        return response.json();
    },

    getVerses: async (bookCode: string, chapter: number, canto?: number, language: string = 'ru'): Promise<Verse[]> => {
        let url = `${API_PATH}/library/verses?bookCode=${bookCode}&chapter=${chapter}`;
        if (canto) url += `&canto=${canto}`;
        if (language) url += `&language=${language}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch verses');
        return response.json();
    }
};
