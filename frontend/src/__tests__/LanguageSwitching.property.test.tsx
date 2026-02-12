// LanguageSwitching.property.test.tsx - Property-based tests for language switching
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import fc from 'fast-check';
import i18next, { i18n as I18nInstance } from 'i18next';
import { runPropertyTest } from '../test-utils/test-config';
import { I18nextProvider } from 'react-i18next';
import { LanguageSelector } from '../components/LanguageSelector/LanguageSelector';
import { initReactI18next } from 'react-i18next';

import enTranslations from '../locales/en.json';
import esTranslations from '../locales/es.json';
import jaTranslations from '../locales/ja.json';

let testI18n: I18nInstance;

describe('Language Switching Properties', () => {
  beforeAll(async () => {
    testI18n = i18next.createInstance();
    await testI18n
      .use(initReactI18next)
      .init({
        resources: {
          en: { translation: enTranslations },
          ja: { translation: jaTranslations },
          es: { translation: esTranslations },
        },
        fallbackLng: 'en',
        supportedLngs: ['en', 'ja', 'es'],
        interpolation: { escapeValue: false },
        // Keep tests synchronous and avoid Suspense in `useTranslation()`.
        react: { useSuspense: false },
        initImmediate: false,
      });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Property 24: Language Switching
  // Validates: Requirements 14.3, 14.4, 14.5
  runPropertyTest(
    24,
    'Language Switching - Language Selector Component',
    fc.record({
      initialLocale: fc.constantFrom('en', 'ja', 'es'),
      targetLocale: fc.constantFrom('en', 'ja', 'es'),
    }),
    async ({ initialLocale, targetLocale }) => {
      await testI18n.changeLanguage(initialLocale);
      const changeLanguageSpy = jest
        .spyOn(testI18n, 'changeLanguage')
        .mockImplementation(async () => testI18n.t.bind(testI18n) as any);

      render(
        <I18nextProvider i18n={testI18n}>
          <LanguageSelector />
        </I18nextProvider>
      );

      // Get the select element
      const select = screen.getByRole('combobox');
      
      // Verify initial value matches initial locale
      expect(select).toHaveValue(initialLocale);
      
      // Simulate language change
      fireEvent.change(select, { target: { value: targetLocale } });
      
      // Verify changeLanguage was called with target locale
      expect(changeLanguageSpy).toHaveBeenCalledWith(targetLocale);
      changeLanguageSpy.mockRestore();
      
      return true;
    }
  );
});
