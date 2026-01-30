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
    canto_title?: string;
    chapter_title?: string;
}

// Re-export from offlineBookService for convenience
export type { SavedBookInfo } from '../services/offlineBookService';

