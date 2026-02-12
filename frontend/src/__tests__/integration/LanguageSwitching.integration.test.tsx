// LanguageSwitching.integration.test.tsx - Integration test for language switching
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import App8Bit from '../../App8Bit';
import i18n from '../../config/i18n';

jest.mock('../../services/api', () => ({
  apiClient: {
    getCurrentUser: jest.fn().mockRejectedValue(new Error('Not authenticated')),
  },
  default: {
    getCurrentUser: jest.fn().mockRejectedValue(new Error('Not authenticated')),
  },
}));

describe('Language Switching Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    i18n.changeLanguage('en');
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
    window.history.pushState({}, 'Landing', '/');
  });

  const renderApp = () =>
    render(
      <I18nextProvider i18n={i18n}>
        <App8Bit />
      </I18nextProvider>
    );

  test('shows language selector on landing page', async () => {
    renderApp();
    await waitFor(() => {
      expect(
        screen.getByRole('combobox', { name: /select language|common\.selectLanguage/i })
      ).toBeInTheDocument();
    });
  });

  test('switches language to Japanese and persists preference', async () => {
    renderApp();
    await i18n.changeLanguage('ja');

    await waitFor(() => {
      expect(i18n.language).toBe('ja');
    });
    expect(window.localStorage.setItem).toHaveBeenCalledWith('i18nextLng', 'ja');
  });

  test('switches language to Spanish and persists preference', async () => {
    renderApp();
    await i18n.changeLanguage('es');

    await waitFor(() => {
      expect(i18n.language).toBe('es');
    });
    expect(window.localStorage.setItem).toHaveBeenCalledWith('i18nextLng', 'es');
  });
});
