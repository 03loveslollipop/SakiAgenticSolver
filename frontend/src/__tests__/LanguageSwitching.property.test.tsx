// LanguageSwitching.property.test.tsx - Property-based tests for language switching
import React from 'react';
import { render, screen } from '@testing-library/react';
import fc from 'fast-check';
import { runPropertyTest } from '../test-utils/test-config';
import { I18nextProvider } from 'react-i18next';
import { LanguageSelector } from '../components/LanguageSelector/LanguageSelector';

// Mock i18n instance for testing
const createMockI18n = (language: string) => ({
  language,
  changeLanguage: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  getFixedT: jest.fn().mockReturnValue(jest.fn()),
  t: jest.fn().mockImplementation((key: string) => key),
  exists: jest.fn().mockReturnValue(true),
  options: {
    supportedLngs: ['en', 'ja', 'es'],
    fallbackLng: 'en',
  },
});

describe('Language Switching Properties', () => {
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
    ({ initialLocale, targetLocale }) => {
      // Mock i18n with initial locale
      const mockI18nInstance = createMockI18n(initialLocale);

      render(
        <I18nextProvider i18n={mockI18nInstance as any}>
          <LanguageSelector />
        </I18nextProvider>
      );

      // Get the select element
      const select = screen.getByRole('combobox', { name: 'Select language' });
      
      // Verify initial value matches initial locale
      expect(select).toHaveValue(initialLocale);
      
      // Simulate language change
      select.value = targetLocale;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Verify changeLanguage was called with target locale
      expect(mockI18nInstance.changeLanguage).toHaveBeenCalledWith(targetLocale);
      
      return true;
    }
  );
});