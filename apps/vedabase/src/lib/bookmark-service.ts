// Bookmarks are stored server-side (shared DB) so they follow the user across
// devices and services. A localStorage cache keeps them readable offline and is
// also used as a fallback for logged-out users.
import { apiFetch, getBrowserSession, resolveApiBaseUrlForHostname } from "@vedamatch/api-client";

export interface Bookmark {
  id?: number;
  book_code: string;
  canto: number;
  chapter: number;
  verse: string;
  language: string;
  book_name: string;
  note?: string;
  created_at?: string;
}

const CACHE_KEY = "vedabase_bookmarks_cache";

function baseUrl(): string {
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return resolveApiBaseUrlForHostname(host);
}

function accessToken(): string | null {
  return getBrowserSession()?.accessToken ?? null;
}

function readCache(): Bookmark[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Bookmark[]) : [];
  } catch {
    return [];
  }
}

function writeCache(bookmarks: Bookmark[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(bookmarks));
}

function sameVerse(a: Bookmark, b: Bookmark): boolean {
  return (
    a.book_code === b.book_code &&
    a.canto === b.canto &&
    a.chapter === b.chapter &&
    a.verse === b.verse
  );
}

export const bookmarkService = {
  /** Returns server bookmarks (refreshing the local cache); falls back to cache offline/logged-out. */
  async list(): Promise<Bookmark[]> {
    const token = accessToken();
    if (!token) {
      return readCache();
    }
    try {
      const bookmarks = await apiFetch<Bookmark[]>(baseUrl(), "/vedabase/bookmarks", {}, token);
      writeCache(bookmarks || []);
      return bookmarks || [];
    } catch {
      return readCache();
    }
  },

  /** Cheap synchronous read of the cached bookmarks (no network). */
  cached(): Bookmark[] {
    return readCache();
  },

  isBookmarked(bookmark: Bookmark): boolean {
    return readCache().some((b) => sameVerse(b, bookmark));
  },

  async add(bookmark: Bookmark): Promise<Bookmark[]> {
    const token = accessToken();
    if (token) {
      try {
        await apiFetch<Bookmark>(baseUrl(), "/vedabase/bookmarks", {
          method: "POST",
          body: JSON.stringify(bookmark),
        }, token);
        return this.list();
      } catch {
        // fall through to local cache
      }
    }
    const next = readCache();
    if (!next.some((b) => sameVerse(b, bookmark))) {
      next.unshift(bookmark);
      writeCache(next);
    }
    return next;
  },

  async remove(bookmark: Bookmark): Promise<Bookmark[]> {
    const token = accessToken();
    if (token && bookmark.id) {
      try {
        await apiFetch(baseUrl(), `/vedabase/bookmarks/${bookmark.id}`, { method: "DELETE" }, token);
        return this.list();
      } catch {
        // fall through to local cache
      }
    }
    const next = readCache().filter((b) => !sameVerse(b, bookmark));
    writeCache(next);
    return next;
  },
};
