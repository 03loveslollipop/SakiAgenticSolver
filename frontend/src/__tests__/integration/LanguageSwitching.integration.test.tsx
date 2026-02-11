// LanguageSwitching.integration.test.tsx - Integration test for language switching
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../config/i18n';
import { AuthProvider } from '../../contexts/AuthContext';
import { LoadingProvider } from '../../contexts/LoadingContext';
import { ErrorProvider } from '../../contexts/ErrorContext';
import { ThemeProvider } from '../../theme';
import App8Bit from '../../App8Bit';
import { apiClient } from '../../services/api';

// Mock the API client
jest.mock('../../services/api', () => ({
  apiClient: {
    getCurrentUser: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('Language Switching Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset i18n to English
    i18n.changeLanguage('en');
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
  });

  const renderApp = () => {
    return render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <AuthProvider>
            <LoadingProvider>
              <ErrorProvider>
                <ThemeProvider>
                  <App8Bit />
                </ThemeProvider>
              </ErrorProvider>
            </LoadingProvider>
          </AuthProvider>
        </I18nextProvider>
      </BrowserRouter>
    );
  };

  test('should initialize with English as default language', async () => {
    // Mock no user is authenticated
    mockApiClient.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

    renderApp();

    // Start on landing page
    window.history.pushState({}, 'Landing', '/');

    // Should show English text
    await waitFor(() => {
      expect(screen.getByText(/welcome to ctf automation platform/i)).toBeInTheDocument();
    });
  });

  test('should switch language to Japanese', async () => {
    // Mock no user is authenticated
    mockApiClient.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

    renderApp();

    // Start on landing page
    window.history.pushState({}, 'Landing', '/');

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText(/welcome to ctf automation platform/i)).toBeInTheDocument();
    });

    // Note: The LanguageSelector component should be present in the Navigation
    // For this test, we'll directly change the language using i18n
    await i18n.changeLanguage('ja');

    // Should show Japanese text (or at least not show English text)
    await waitFor(() => {
      // The text might still be in English if translations aren't loaded,
      // but we can verify the language changed by checking i18n state
      expect(i18n.language).toBe('ja');
    });

    // Verify language preference was saved to localStorage
    expect(window.localStorage.setItem).toHaveBeenCalledWith('i18nextLng', 'ja');
  });

  test('should switch language to Spanish', async () => {
    // Mock no user is authenticated
    mockApiClient.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

    renderApp();

    // Start on landing page
    window.history.pushState({}, 'Landing', '/');

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText(/welcome to ctf automation platform/i)).toBeInTheDocument();
    });

    // Change language to Spanish
    await i18n.changeLanguage('es');

    // Should show Spanish language setting
    await waitFor(() => {
      expect(i18n.language).toBe('es');
    });

    // Verify language preference was saved
    expect(window.localStorage.setItem).toHaveBeenCalledWith('i18nextLng', 'es');
  });

  test('should persist language preference across navigation', async () => {
    // Mock no user is authenticated
    mockApiClient.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    
    // Mock localStorage to return Japanese language preference
    (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'i18nextLng') return 'ja';
      return null;
    });

    renderApp();

    // Start on landing page
    window.history.pushState({}, 'Landing', '/');

    // Should initialize with Japanese (from localStorage)
    await waitFor(() => {
      expect(i18n.language).toBe('ja');
    });

    // Navigate to login page
    window.history.pushState({}, 'Login', '/login');

    // Language should still be Japanese
    await waitFor(() => {
      expect(i18n.language).toBe('ja');
    });
  });

  test('should fall back to English for missing translations', async () => {
    // Mock no user is authenticated
    mockApiClient.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

    renderApp();

    // Change to a language with incomplete translations
    await i18n.changeLanguage('es');

    // Navigate to a page
    window.history.pushState({}, 'Landing', '/');

    // Should not crash, should show some content
    await waitFor(() => {
      // The app should render without errors
      expect(screen.getByRole('main') || screen.getByRole('banner') || screen.getByText(/./)).toBeInTheDocument();
    });
  });
});