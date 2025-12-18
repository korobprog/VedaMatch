import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './locales/ru';
import en from './locales/en';

const resources = {
    ru: { translation: ru },
    en: { translation: en },
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'ru', // Default language
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
