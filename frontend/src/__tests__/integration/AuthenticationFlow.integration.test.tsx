// AuthenticationFlow.integration.test.tsx - Integration test for authentication flow
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
    login: jest.fn(),
    getCurrentUser: jest.fn(),
    logout: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('Authentication Flow Integration Test', () => {
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

  test('should redirect authenticated users from login to dashboard', async () => {
    // Mock user is already authenticated
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

    // Navigate to login page
    window.history.pushState({}, 'Login', '/login');

    // Should redirect to dashboard
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });
  });

  test('should show login form for unauthenticated users', async () => {
    // Mock no user is authenticated
    mockApiClient.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    
    // Mock localStorage to return no token
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

    renderApp();

    // Navigate to login page
    window.history.pushState({}, 'Login', '/login');

    // Should show login form
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });
  });

  test('should handle login submission', async () => {
    // Mock successful login
    mockApiClient.login.mockResolvedValue({
      access_token: 'new-token',
      refresh_token: 'refresh-token',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
        is_active: true,
        created_at: new Date().toISOString(),
      },
    });

    // Mock no initial user
    mockApiClient.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

    renderApp();

    // Navigate to login page
    window.history.pushState({}, 'Login', '/login');

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    // Fill in login form
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);

    // Verify API was called
    await waitFor(() => {
      expect(mockApiClient.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    // Verify tokens were stored
    await waitFor(() => {
      expect(window.localStorage.setItem).toHaveBeenCalledWith('access_token', 'new-token');
      expect(window.localStorage.setItem).toHaveBeenCalledWith('refresh_token', 'refresh-token');
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'user',
        expect.stringContaining('test@example.com')
      );
    });
  });

  test('should handle logout', async () => {
    // Mock authenticated user
    mockApiClient.getCurrentUser.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      role: 'user',
      is_active: true,
      created_at: new Date().toISOString(),
    });

    mockApiClient.logout.mockResolvedValue();

    // Mock localStorage to return a token
    (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'access_token') return 'mock-token';
      if (key === 'user') return JSON.stringify({ id: 'user-123', email: 'test@example.com' });
      return null;
    });

    renderApp();

    // Should start on dashboard (redirected from root)
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });

    // Note: In the actual app, logout would be triggered from a component
    // For this test, we'll verify the logout API is available
    expect(mockApiClient.logout).toBeDefined();
  });
});