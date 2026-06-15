import type { Language } from "@vedamatch/domain-types";

// Lightweight bilingual helper. Russian for the .ru audience, English otherwise.
export function t(language: Language, ru: string, en: string): string {
  return language === "ru" ? ru : en;
}

// Content language for the library API: vedabase.ru content is Russian.
// The .com surface can still browse the same shared data in English where available.
export function contentLanguage(language: Language): string {
  return language === "ru" ? "ru" : "en";
}
