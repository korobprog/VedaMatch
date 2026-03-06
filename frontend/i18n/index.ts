import i18n from 'i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LanguageDetectorAsyncModule } from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './locales/ru';
import en from './locales/en';
import hi from './locales/hi';

const LANGUAGE_STORAGE_KEY = 'app_language';
const SUPPORTED_LANGUAGES = ['ru', 'en', 'hi'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const normalizeLanguageCode = (language: string | null | undefined): SupportedLanguage | null => {
    if (!language) {
        return null;
    }

    const loweredLanguage = language.toLowerCase();
    const exactMatch = SUPPORTED_LANGUAGES.find((supportedLanguage) => supportedLanguage === loweredLanguage);
    if (exactMatch) {
        return exactMatch;
    }

    const baseLanguage = loweredLanguage.split('-')[0];
    const baseMatch = SUPPORTED_LANGUAGES.find((supportedLanguage) => supportedLanguage === baseLanguage);
    return baseMatch ?? null;
};

const resources = {
    ru: { translation: ru },
    en: { translation: en },
    hi: { translation: hi },
};

const languageDetector: LanguageDetectorAsyncModule = {
    type: 'languageDetector',
    async: true,
    init: () => {},
    detect: async () => {
        try {
            const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
            const normalizedSavedLanguage = normalizeLanguageCode(savedLanguage);
            if (normalizedSavedLanguage) {
                return normalizedSavedLanguage;
            }
        } catch (error) {
            console.warn('Failed to read saved app language:', error);
        }

        const deviceLocale = Intl.DateTimeFormat().resolvedOptions().locale;
        return normalizeLanguageCode(deviceLocale) ?? 'ru';
    },
    cacheUserLanguage: async (language) => {
        const normalizedLanguage = normalizeLanguageCode(language);
        if (!normalizedLanguage) {
            return;
        }

        try {
            await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLanguage);
        } catch (error) {
            console.warn('Failed to cache app language:', error);
        }
    },
};

i18n
    .use(languageDetector)
    .use(initReactI18next)
    .init({
        resources,
        supportedLngs: [...SUPPORTED_LANGUAGES],
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
