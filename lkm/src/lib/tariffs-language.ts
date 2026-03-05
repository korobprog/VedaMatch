import { DEFAULT_LANGUAGE, type Language, normalizeLanguage } from '@/lib/tariffs-i18n';

const STORAGE_KEY = 'lkm_tariffs_language';

export function resolveHostDefaultLanguage(hostname: string): Language {
  const host = hostname.trim().toLowerCase();
  if (host.endsWith('.ru')) {
    return 'ru';
  }
  return 'en';
}

export function getLanguageFromSearch(search: string): Language | null {
  const params = new URLSearchParams(search);
  return normalizeLanguage(params.get('lang'));
}

export function getStoredTariffsLanguage(): Language | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY));
}

export function saveTariffsLanguage(language: Language): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, language);
}

export function resolveTariffsLanguage(): Language {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE;
  }

  const fromQuery = getLanguageFromSearch(window.location.search);
  if (fromQuery) {
    saveTariffsLanguage(fromQuery);
    return fromQuery;
  }

  const fromStorage = getStoredTariffsLanguage();
  if (fromStorage) {
    return fromStorage;
  }

  const fromHost = resolveHostDefaultLanguage(window.location.hostname);
  saveTariffsLanguage(fromHost);
  return fromHost;
}
