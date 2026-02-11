import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation resources
import enTranslations from '../locales/en.json';
import jaTranslations from '../locales/ja.json';
import esTranslations from '../locales/es.json';

export const resources = {
  en: { translation: enTranslations },
  ja: { translation: jaTranslations },
  es: { translation: esTranslations },
} as const;

export type Locale = 'en' | 'ja' | 'es';

export const supportedLocales: Locale[] = ['en', 'ja', 'es'];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ja: '日本語',
  es: 'Español',
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: supportedLocales,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;