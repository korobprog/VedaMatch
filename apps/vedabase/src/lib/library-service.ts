// Typed client for the shared Go library API (/api/library/*). The api-client
// package exposes generic helpers, but its ScriptureVerse type does not match the
// snake_case JSON the Go backend actually returns, so we declare exact types here.
import { apiFetch, resolveApiBaseUrlForHostname } from "@vedamatch/api-client";

export interface ScriptureBook {
  id: number;
  code: string;
  name_en: string;
  name_ru: string;
  description_en: string;
  description_ru: string;
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
}

export interface ChapterInfo {
  canto: number;
  chapter: number;
  canto_title?: string;
  chapter_title?: string;
}

function baseUrl(): string {
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return resolveApiBaseUrlForHostname(host);
}

export const libraryService = {
  getBooks(): Promise<ScriptureBook[]> {
    return apiFetch<ScriptureBook[]>(baseUrl(), "/library/books");
  },

  getChapters(bookCode: string): Promise<ChapterInfo[]> {
    return apiFetch<ChapterInfo[]>(baseUrl(), `/library/books/${bookCode}/chapters`);
  },

  getVerses(bookCode: string, chapter: number, canto = 0, language = "ru"): Promise<ScriptureVerse[]> {
    const params = new URLSearchParams({
      bookCode,
      chapter: String(chapter),
      canto: String(canto),
      language,
    });
    return apiFetch<ScriptureVerse[]>(baseUrl(), `/library/verses?${params.toString()}`);
  },

  exportBook(bookCode: string, language?: string): Promise<ScriptureVerse[]> {
    const suffix = language ? `?language=${language}` : "";
    return apiFetch<ScriptureVerse[]>(baseUrl(), `/library/books/${bookCode}/export${suffix}`);
  },

  search(query: string): Promise<ScriptureVerse[]> {
    return apiFetch<ScriptureVerse[]>(baseUrl(), `/library/search?q=${encodeURIComponent(query)}`);
  },
};
