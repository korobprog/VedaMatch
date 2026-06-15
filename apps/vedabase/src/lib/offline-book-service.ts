// IndexedDB-backed offline storage for whole books, so users can read without a
// network connection. Adapted from the admin reader's offlineBookService.
import { libraryService, type ScriptureBook, type ScriptureVerse, type ChapterInfo } from "./library-service";

const DB_NAME = "VedabaseLibraryDB";
const DB_VERSION = 1;
const STORE_BOOKS = "saved_books";
const STORE_DATA = "book_data";

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
  private db: IDBDatabase | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_BOOKS)) {
          db.createObjectStore(STORE_BOOKS, { keyPath: "code" });
        }
        if (!db.objectStoreNames.contains(STORE_DATA)) {
          db.createObjectStore(STORE_DATA, { keyPath: "code" });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  async getSavedBooks(): Promise<SavedBookInfo[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_BOOKS, "readonly");
      const store = transaction.objectStore(STORE_BOOKS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async isBookSaved(bookCode: string): Promise<boolean> {
    const saved = await this.getSavedBooks();
    return saved.some((book) => book.code === bookCode);
  }

  async saveBookOffline(
    book: ScriptureBook,
    languages: string[] = ["ru", "en"],
    onProgress?: (progress: number, status: string) => void,
  ): Promise<boolean> {
    try {
      onProgress?.(5, "Загрузка структуры...");
      const chapters = await libraryService.getChapters(book.code);
      if (!chapters || chapters.length === 0) {
        onProgress?.(100, "Книга не содержит глав");
        return false;
      }

      const bookData: OfflineBookData = { book, chapters, verses: {} };
      let totalVerses = 0;

      for (let i = 0; i < languages.length; i++) {
        const lang = languages[i];
        onProgress?.(10 + i * 40, `Загрузка данных (${lang.toUpperCase()})...`);

        const allVerses = await libraryService.exportBook(book.code, lang);
        bookData.verses[lang] = bookData.verses[lang] || {};
        allVerses.forEach((verse) => {
          const key = `${verse.canto || 0}-${verse.chapter}`;
          if (!bookData.verses[lang][key]) {
            bookData.verses[lang][key] = [];
          }
          bookData.verses[lang][key].push(verse);
        });
        totalVerses += allVerses.length;
      }

      onProgress?.(92, "Сохранение данных...");
      const db = await this.getDB();
      const estimatedBytes = totalVerses * 1000;

      const bookInfo: SavedBookInfo = {
        code: book.code,
        name_ru: book.name_ru,
        name_en: book.name_en,
        description_ru: book.description_ru,
        description_en: book.description_en,
        savedAt: new Date().toISOString(),
        sizeBytes: estimatedBytes,
        chaptersCount: chapters.length,
        versesCount: totalVerses,
      };

      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_BOOKS, STORE_DATA], "readwrite");
        transaction.objectStore(STORE_BOOKS).put(bookInfo);
        transaction.objectStore(STORE_DATA).put({ code: book.code, data: bookData });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });

      onProgress?.(100, "Готово!");
      return true;
    } catch (error) {
      console.error("Error saving book:", error);
      onProgress?.(0, "Ошибка сохранения");
      return false;
    }
  }

  async removeBook(bookCode: string): Promise<boolean> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_BOOKS, STORE_DATA], "readwrite");
      transaction.objectStore(STORE_BOOKS).delete(bookCode);
      transaction.objectStore(STORE_DATA).delete(bookCode);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getBookData(bookCode: string): Promise<OfflineBookData | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_DATA, "readonly");
      const store = transaction.objectStore(STORE_DATA);
      const request = store.get(bookCode);
      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getOfflineVerses(bookCode: string, chapter: number, canto = 0, language = "ru"): Promise<ScriptureVerse[]> {
    const bookData = await this.getBookData(bookCode);
    if (bookData && bookData.verses[language]) {
      const key = `${canto}-${chapter}`;
      return bookData.verses[language][key] || [];
    }
    return [];
  }

  async getOfflineChapters(bookCode: string): Promise<ChapterInfo[]> {
    const bookData = await this.getBookData(bookCode);
    return bookData?.chapters || [];
  }
}

export const offlineBookService = new OfflineBookService();

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
