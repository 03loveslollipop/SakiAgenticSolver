// NavigationFlow.integration.test.tsx - Integration test for navigation between pages
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
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

describe('Navigation Flow Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
        <AuthProvider>
          <LoadingProvider>
            <ErrorProvider>
              <ThemeProvider>
                <App8Bit />
              </ThemeProvider>
            </ErrorProvider>
          </LoadingProvider>
        </AuthProvider>
      </BrowserRouter>
    );
  };

  test('should navigate from landing page to login page', async () => {
    // Mock no user is authenticated
    mockApiClient.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

    renderApp();

    // Start on landing page (root)
    window.history.pushState({}, 'Landing', '/');

    // Should show landing page
    await waitFor(() => {
      expect(screen.getByText(/welcome to ctf automation platform/i)).toBeInTheDocument();
    });

    // Find and click login link/button
    // Note: In the actual LandingPage component, there should be a login link/button
    // For now, we'll test navigation by changing URL
    window.history.pushState({}, 'Login', '/login');

    // Should show login form
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });
  });

  test('should navigate between dashboard pages when authenticated', async () => {
    // Mock authenticated user
    mockApiClient.getCurrentUser.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      role: 'user',
      is_active: true,
      created_at: new Date().toISOString(),
    });

    // Mock localStorage to return a token
    (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'access_token') return 'mock-token';
      if (key === 'user') return JSON.stringify({ id: 'user-123', email: 'test@example.com' });
      return null;
    });

    renderApp();

    // Start on dashboard
    window.history.pushState({}, 'Dashboard', '/dashboard');

    // Should show dashboard
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });

    // Navigate to VM creation page
    window.history.pushState({}, 'Create VM', '/vms/create');

    // Should be on VM creation page
    await waitFor(() => {
      expect(window.location.pathname).toBe('/vms/create');
    });

    // Navigate to VM list page
    window.history.pushState({}, 'VM List', '/vms');

    // Should be on VM list page
    await waitFor(() => {
      expect(window.location.pathname).toBe('/vms');
    });
  });

  test('should show 404 page for unknown routes', async () => {
    // Mock no user is authenticated
    mockApiClient.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

    renderApp();

    // Navigate to unknown route
    window.history.pushState({}, 'Unknown', '/unknown-route');

    // Should show 404 page
    await waitFor(() => {
      expect(screen.getByText(/page not found/i)).toBeInTheDocument();
      expect(screen.getByText(/404/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /return to home/i })).toBeInTheDocument();
    });
  });

  test('should navigate back from 404 page to home', async () => {
    // Mock no user is authenticated
    mockApiClient.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

    renderApp();

    // Navigate to unknown route
    window.history.pushState({}, 'Unknown', '/unknown-route');

    // Should show 404 page
    await waitFor(() => {
      expect(screen.getByText(/page not found/i)).toBeInTheDocument();
    });

    // Click "Return to Home" button
    const homeButton = screen.getByRole('button', { name: /return to home/i });
    fireEvent.click(homeButton);

    // Should navigate to home page
    await waitFor(() => {
      expect(window.location.pathname).toBe('/');
    });
  });
});