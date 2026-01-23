export interface Bookmark {
    bookCode: string;
    chapter: number;
    verse: string;
    bookName: string;
    language: string;
    addedAt: string;
}

const STORAGE_KEY = 'v_bookmarks';

class BookmarkService {
    getBookmarks(): Bookmark[] {
        if (typeof window === 'undefined') return [];
        const saved = localStorage.getItem(STORAGE_KEY);
        try {
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Failed to parse bookmarks', e);
            return [];
        }
    }

    isBookmarked(bookCode: string, chapter: number, verse: string): boolean {
        const bookmarks = this.getBookmarks();
        return bookmarks.some(b => b.bookCode === bookCode && b.chapter === chapter && b.verse === verse);
    }

    addBookmark(bookmark: Bookmark): void {
        const bookmarks = this.getBookmarks();
        if (!this.isBookmarked(bookmark.bookCode, bookmark.chapter, bookmark.verse)) {
            bookmarks.push(bookmark);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
        }
    }

    removeBookmark(bookCode: string, chapter: number, verse: string): void {
        const bookmarks = this.getBookmarks();
        const filtered = bookmarks.filter(b => !(b.bookCode === bookCode && b.chapter === chapter && b.verse === verse));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }

    toggleBookmark(bookmark: Bookmark): boolean {
        if (this.isBookmarked(bookmark.bookCode, bookmark.chapter, bookmark.verse)) {
            this.removeBookmark(bookmark.bookCode, bookmark.chapter, bookmark.verse);
            return false;
        } else {
            this.addBookmark(bookmark);
            return true;
        }
    }
}

export const bookmarkService = new BookmarkService();
