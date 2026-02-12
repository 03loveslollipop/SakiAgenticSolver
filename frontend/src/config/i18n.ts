import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import enTranslations from '../locales/en.json';
import esTranslations from '../locales/es.json';
import jaTranslations from '../locales/ja.json';

export const resources = {
  en: { translation: enTranslations },
  ja: { translation: jaTranslations },
  es: { translation: esTranslations },
} as const;

export type Locale = 'en' | 'ja' | 'es';

export const supportedLocales: Locale[] = ['en', 'ja', 'es'];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ja: '\u65e5\u672c\u8a9e',
  es: 'Espa\u00f1ol',
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
