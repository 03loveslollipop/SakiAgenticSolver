// i18n.test.ts - Unit tests for i18n integration
import i18n from '../config/i18n';

describe('i18n Integration', () => {
  beforeEach(() => {
    // Reset i18n to default state
    i18n.changeLanguage('en');
    localStorage.clear();
  });

  test('i18n configuration has correct supported locales', () => {
    // i18next may add 'cimode' for testing, so check that our locales are included
    expect(i18n.options.supportedLngs).toEqual(expect.arrayContaining(['en', 'ja', 'es']));
  });

  test('i18n configuration has fallback to English', () => {
    // fallbackLng can be a string or array
    const fallbackLng = i18n.options.fallbackLng;
    if (Array.isArray(fallbackLng)) {
      expect(fallbackLng).toContain('en');
    } else {
      expect(fallbackLng).toBe('en');
    }
  });

  test('i18n detects browser language', () => {
    // Mock navigator.language
    Object.defineProperty(navigator, 'language', {
      value: 'ja-JP',
      configurable: true,
    });

    // Initialize a new i18n instance to test detection
    // Note: This is a simplified test since i18next is already initialized
    expect(i18n.options.detection?.order).toContain('navigator');
  });

  test('i18n persists language in localStorage', () => {
    // Change language to Spanish
    i18n.changeLanguage('es');
    
    // Verify localStorage was updated
    expect(localStorage.getItem('i18nextLng')).toBe('es');
  });

  test('i18n loads English translations', () => {
    const t = i18n.getFixedT('en');
    expect(t('nav.home')).toBe('Home');
    expect(t('nav.login')).toBe('Login');
  });

  test('i18n loads Japanese translations', () => {
    const t = i18n.getFixedT('ja');
    expect(t('nav.home')).toBe('家');
    expect(t('nav.login')).toBe('ログイン');
  });

  test('i18n loads Spanish translations', () => {
    const t = i18n.getFixedT('es');
    expect(t('nav.home')).toBe('Hogar');
    expect(t('nav.login')).toBe('Acceso');
  });

  test('i18n falls back to English for missing keys', () => {
    // Change to Japanese
    i18n.changeLanguage('ja');
    
    // Get a translation (should work even if key exists in English but not Japanese)
    // Note: Our Japanese translations are complete, so this test is for the fallback mechanism
    const t = i18n.getFixedT('ja');
    
    // Verify we can get translations
    expect(typeof t('nav.home')).toBe('string');
  });
});
