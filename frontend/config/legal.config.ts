import Config from 'react-native-config';

const TERMS_DEFAULT_URL = 'https://vedamatch.ru/terms';
const PRIVACY_DEFAULT_URL = 'https://vedamatch.ru/privacy';
const DELETE_ACCOUNT_DEFAULT_URL = 'https://vedamatch.ru/delete-account';
const TERMS_DEFAULT_URL_EN = 'https://vedamatch.ru/terms?lang=en';
const TERMS_DEFAULT_URL_RU = 'https://vedamatch.ru/terms?lang=ru';
const TERMS_DEFAULT_URL_HI = 'https://vedamatch.ru/terms?lang=hi';
const PRIVACY_DEFAULT_URL_EN = 'https://vedamatch.ru/privacy?lang=en';
const PRIVACY_DEFAULT_URL_RU = 'https://vedamatch.ru/privacy?lang=ru';
const PRIVACY_DEFAULT_URL_HI = 'https://vedamatch.ru/privacy?lang=hi';

const normalizeUrl = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
    return fallback;
  }
  return trimmed;
};

export type LegalLanguage = 'en' | 'ru' | 'hi';
export type LegalDocumentType = 'terms' | 'privacy' | 'account-deletion';

export const SUPPORTED_LEGAL_LANGUAGES: LegalLanguage[] = ['en', 'ru', 'hi'];

export const normalizeLanguageCode = (value: unknown): LegalLanguage => {
  if (typeof value !== 'string' || !value.trim()) {
    return 'en';
  }
  const normalized = value.trim().toLowerCase().split('-')[0];
  if (normalized === 'ru' || normalized === 'hi' || normalized === 'en') {
    return normalized;
  }
  return 'en';
};

export const TERMS_URL = normalizeUrl((Config as any).TERMS_URL, TERMS_DEFAULT_URL);
export const PRIVACY_POLICY_URL = normalizeUrl((Config as any).PRIVACY_POLICY_URL, PRIVACY_DEFAULT_URL);
export const ACCOUNT_DELETION_URL = normalizeUrl((Config as any).ACCOUNT_DELETION_URL, DELETE_ACCOUNT_DEFAULT_URL);

export const TERMS_URL_EN = normalizeUrl((Config as any).TERMS_URL_EN, TERMS_DEFAULT_URL_EN);
export const TERMS_URL_RU = normalizeUrl((Config as any).TERMS_URL_RU, TERMS_DEFAULT_URL_RU);
export const TERMS_URL_HI = normalizeUrl((Config as any).TERMS_URL_HI, TERMS_DEFAULT_URL_HI);
export const PRIVACY_POLICY_URL_EN = normalizeUrl((Config as any).PRIVACY_POLICY_URL_EN, PRIVACY_DEFAULT_URL_EN);
export const PRIVACY_POLICY_URL_RU = normalizeUrl((Config as any).PRIVACY_POLICY_URL_RU, PRIVACY_DEFAULT_URL_RU);
export const PRIVACY_POLICY_URL_HI = normalizeUrl((Config as any).PRIVACY_POLICY_URL_HI, PRIVACY_DEFAULT_URL_HI);

const TERMS_URL_BY_LANGUAGE: Record<LegalLanguage, string> = {
  en: TERMS_URL_EN,
  ru: TERMS_URL_RU,
  hi: TERMS_URL_HI,
};

const PRIVACY_URL_BY_LANGUAGE: Record<LegalLanguage, string> = {
  en: PRIVACY_POLICY_URL_EN,
  ru: PRIVACY_POLICY_URL_RU,
  hi: PRIVACY_POLICY_URL_HI,
};

export const getLegalDocumentUrl = (
  documentType: LegalDocumentType,
  language?: string,
): string => {
  if (documentType === 'account-deletion') {
    return ACCOUNT_DELETION_URL;
  }

  const lang = normalizeLanguageCode(language);
  if (documentType === 'terms') {
    return TERMS_URL_BY_LANGUAGE[lang];
  }
  return PRIVACY_URL_BY_LANGUAGE[lang];
};
