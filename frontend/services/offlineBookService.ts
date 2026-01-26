/**
 * Offline Book Service
 * Manages local storage of books for offline reading
 * Uses react-native-fs for large books (to avoid AsyncStorage 6MB limit)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { libraryService } from './libraryService';
import { ScriptureBook, ScriptureVerse, ChapterInfo } from '../types/library';

const SAVED_BOOKS_KEY = 'offline_saved_books';
const BOOKS_DIR = `${RNFS.DocumentDirectoryPath}/offline_books`;

export interface SavedBookInfo {
    code: string;
    name_ru: string;
    name_en: string;
    description_ru?: string;
    description_en?: string;
    savedAt: string;
    sizeBytes: number;
    chaptersCount: number;
    versesCount: number;
}

export interface OfflineBookData {
    book: ScriptureBook;
    chapters: ChapterInfo[];
    verses: { [language: string]: { [chapterKey: string]: ScriptureVerse[] } };
}

class OfflineBookService {
    private initialized = false;

    /**
     * Ensure books directory exists
     */
    private async ensureDirectory(): Promise<void> {
        if (this.initialized) return;

        try {
            const exists = await RNFS.exists(BOOKS_DIR);
            if (!exists) {
                await RNFS.mkdir(BOOKS_DIR);
                console.log('[OfflineBookService] Created books directory:', BOOKS_DIR);
            }
            this.initialized = true;
        } catch (error) {
            console.error('[OfflineBookService] Error creating directory:', error);
        }
    }

    /**
     * Get list of all saved books
     */
    async getSavedBooks(): Promise<SavedBookInfo[]> {
        try {
            const saved = await AsyncStorage.getItem(SAVED_BOOKS_KEY);
            if (saved && saved !== 'undefined' && saved !== 'null') {
                return JSON.parse(saved);
            }
            return [];
        } catch (error) {
            console.error('[OfflineBookService] Error getting saved books:', error);
            return [];
        }
    }

    /**
     * Check if a book is saved offline
     */
    async isBookSaved(bookCode: string): Promise<boolean> {
        const saved = await this.getSavedBooks();
        return saved.some(book => book.code === bookCode);
    }

    /**
     * Get size of saved book in bytes
     */
    async getSavedBookSize(bookCode: string): Promise<number> {
        const saved = await this.getSavedBooks();
        const book = saved.find(b => b.code === bookCode);
        return book?.sizeBytes || 0;
    }

    /**
     * Get file path for book data
     */
    private getBookFilePath(bookCode: string): string {
        return `${BOOKS_DIR}/${bookCode}.json`;
    }

    /**
     * Save a book for offline reading
     * Downloads all chapters and verses in both languages
     */
    async saveBookOffline(
        book: ScriptureBook,
        onProgress?: (progress: number, status: string) => void
    ): Promise<boolean> {
        try {
            await this.ensureDirectory();

            onProgress?.(5, 'Загрузка структуры...');

            // Get chapters
            const chapters = await libraryService.getChapters(book.code);
            if (!chapters || chapters.length === 0) {
                console.warn('[OfflineBookService] No chapters found for book:', book.code);
                onProgress?.(100, 'Книга не содержит глав');
                return false;
            }

            const bookData: OfflineBookData = {
                book,
                chapters,
                verses: {
                    ru: {},
                    en: {}
                }
            };

            let totalVerses = 0;
            const languages = ['ru', 'en'];

            // Download verses for each language using batch export API
            for (let i = 0; i < languages.length; i++) {
                const lang = languages[i] as 'ru' | 'en';
                const displayLang = lang.toUpperCase();
                onProgress?.(10 + (i * 40), `Загрузка данных (${displayLang})...`);

                try {
                    const allVerses = await libraryService.exportBook(book.code, lang);

                    // Distribute verses into bookData
                    allVerses.forEach(verse => {
                        const key = `${verse.canto || 0}-${verse.chapter}`;
                        if (!bookData.verses[lang][key]) {
                            bookData.verses[lang][key] = [];
                        }
                        bookData.verses[lang][key].push(verse);
                    });

                    totalVerses += allVerses.length;
                } catch (e) {
                    console.error(`[OfflineBookService] Error loading batch ${displayLang} for ${book.code}:`, e);
                }
            }

            onProgress?.(92, 'Сохранение на устройство...');

            // Write book data to file system
            const bookDataStr = JSON.stringify(bookData);
            const sizeBytes = bookDataStr.length;

            const filePath = this.getBookFilePath(book.code);
            await RNFS.writeFile(filePath, bookDataStr, 'utf8');

            onProgress?.(97, 'Обновление индекса...');

            // Update saved books list in AsyncStorage
            const savedBooks = await this.getSavedBooks();
            const existingIndex = savedBooks.findIndex(b => b.code === book.code);

            const bookInfo: SavedBookInfo = {
                code: book.code,
                name_ru: book.name_ru,
                name_en: book.name_en,
                description_ru: book.description_ru,
                description_en: book.description_en,
                savedAt: new Date().toISOString(),
                sizeBytes,
                chaptersCount: chapters.length,
                versesCount: totalVerses
            };

            if (existingIndex >= 0) {
                savedBooks[existingIndex] = bookInfo;
            } else {
                savedBooks.push(bookInfo);
            }

            await AsyncStorage.setItem(SAVED_BOOKS_KEY, JSON.stringify(savedBooks));

            onProgress?.(100, 'Готово!');
            console.log(`[OfflineBookService] Saved book ${book.code}: ${chapters.length} chapters, ${totalVerses} verses, ${formatBytes(sizeBytes)}`);

            return true;
        } catch (error) {
            console.error('[OfflineBookService] Error saving book:', error);
            onProgress?.(0, 'Ошибка сохранения');
            return false;
        }
    }

    /**
     * Remove a book from offline storage
     */
    async removeBook(bookCode: string): Promise<boolean> {
        try {
            // Remove book data file
            const filePath = this.getBookFilePath(bookCode);
            const exists = await RNFS.exists(filePath);
            if (exists) {
                await RNFS.unlink(filePath);
            }

            // Update saved books list
            const savedBooks = await this.getSavedBooks();
            const filtered = savedBooks.filter(b => b.code !== bookCode);
            await AsyncStorage.setItem(SAVED_BOOKS_KEY, JSON.stringify(filtered));

            console.log(`[OfflineBookService] Removed book: ${bookCode}`);
            return true;
        } catch (error) {
            console.error('[OfflineBookService] Error removing book:', error);
            return false;
        }
    }

    /**
     * Get offline book data
     */
    async getBookData(bookCode: string): Promise<OfflineBookData | null> {
        try {
            const filePath = this.getBookFilePath(bookCode);
            const exists = await RNFS.exists(filePath);

            if (exists) {
                const data = await RNFS.readFile(filePath, 'utf8');
                return JSON.parse(data);
            }
            return null;
        } catch (error) {
            console.error('[OfflineBookService] Error getting book data:', error);
            return null;
        }
    }

    /**
     * Get verses from offline storage
     */
    async getOfflineVerses(
        bookCode: string,
        chapter: number,
        canto: number = 0,
        language: string = 'ru'
    ): Promise<ScriptureVerse[]> {
        try {
            const bookData = await this.getBookData(bookCode);
            if (bookData && bookData.verses[language]) {
                const key = `${canto}-${chapter}`;
                return bookData.verses[language][key] || [];
            }
            return [];
        } catch (error) {
            console.error('[OfflineBookService] Error getting offline verses:', error);
            return [];
        }
    }

    /**
     * Get chapters from offline storage
     */
    async getOfflineChapters(bookCode: string): Promise<ChapterInfo[]> {
        try {
            const bookData = await this.getBookData(bookCode);
            return bookData?.chapters || [];
        } catch (error) {
            console.error('[OfflineBookService] Error getting offline chapters:', error);
            return [];
        }
    }

    /**
     * Clear all offline data
     */
    async clearAllOfflineData(): Promise<void> {
        try {
            // Remove entire books directory
            const exists = await RNFS.exists(BOOKS_DIR);
            if (exists) {
                await RNFS.unlink(BOOKS_DIR);
            }

            await AsyncStorage.removeItem(SAVED_BOOKS_KEY);
            this.initialized = false;
            console.log('[OfflineBookService] Cleared all offline data');
        } catch (error) {
            console.error('[OfflineBookService] Error clearing offline data:', error);
        }
    }

    /**
     * Get total size of all offline books
     */
    async getTotalOfflineSize(): Promise<number> {
        try {
            const savedBooks = await this.getSavedBooks();
            return savedBooks.reduce((total, book) => total + book.sizeBytes, 0);
        } catch (error) {
            console.error('[OfflineBookService] Error calculating total size:', error);
            return 0;
        }
    }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Б';

    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const offlineBookService = new OfflineBookService();
