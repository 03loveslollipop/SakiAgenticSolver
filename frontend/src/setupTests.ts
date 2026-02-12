import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';
import i18n from './config/i18n';

// Extend Jest matchers with jest-axe
expect.extend(toHaveNoViolations);

// Keep tests deterministic: always start from English.
beforeEach(() => {
  try {
    window.localStorage.setItem('i18nextLng', 'en');
  } catch {
    // noop
  }

  return i18n.changeLanguage('en');
});
