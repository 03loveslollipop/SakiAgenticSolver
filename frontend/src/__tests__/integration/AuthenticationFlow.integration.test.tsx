// AuthenticationFlow.integration.test.tsx - Integration test for authentication flow
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App8Bit from '../../App8Bit';
import { apiClient } from '../../services/api';

jest.mock('../../services/api', () => ({
  __esModule: true,
  ...(function () {
    const client = {
      login: jest.fn(),
      loginWith2FA: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      getCurrentUser: jest.fn(),
      getSessions: jest.fn(),
    };

    return { apiClient: client, default: client };
  })(),
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('Authentication Flow Integration Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();

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

  const renderApp = () => render(<App8Bit />);

  test('should redirect authenticated users from login to dashboard', async () => {
    mockApiClient.getCurrentUser.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      role: 'user',
      is_2fa_enabled: true,
      locale: 'en',
    } as any);
    mockApiClient.getSessions.mockResolvedValue([]);

    (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'access_token') return 'mock-token';
      if (key === 'user') return JSON.stringify({ id: 'user-123', email: 'test@example.com' });
      return null;
    });

    window.history.pushState({}, 'Login', '/login');
    renderApp();

    expect(await screen.findByRole('heading', { level: 1, name: /dashboard/i }, { timeout: 5000 })).toBeInTheDocument();
  });

  test('should show login form for unauthenticated users', async () => {
    mockApiClient.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

    window.history.pushState({}, 'Login', '/login');
    renderApp();

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  test('should handle login + 2FA verification and persist tokens', async () => {
    const user = userEvent.setup();

    mockApiClient.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    mockApiClient.login.mockResolvedValue({
      requires_2fa_setup: false,
      message: 'OK',
    } as any);
    mockApiClient.loginWith2FA.mockResolvedValue({
      access_token: 'new-token',
      refresh_token: 'refresh-token',
      token_type: 'bearer',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
        is_2fa_enabled: true,
        locale: 'en',
      },
    } as any);
    mockApiClient.getSessions.mockResolvedValue([]);

    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

    window.history.pushState({}, 'Login', '/login');
    renderApp();

    const emailInput = await screen.findByLabelText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const signInButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(signInButton);

    // 2FA step should appear
    expect(await screen.findByLabelText(/authentication code/i)).toBeInTheDocument();

    const codeInput = screen.getByLabelText(/authentication code/i);
    const verifyButton = screen.getByRole('button', { name: /verify/i });

    await user.type(codeInput, '123456');
    await user.click(verifyButton);

    await waitFor(() => {
      expect(mockApiClient.loginWith2FA).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        totp_code: '123456',
      });
    });

    expect(window.localStorage.setItem).toHaveBeenCalledWith('access_token', 'new-token');
    expect(window.localStorage.setItem).toHaveBeenCalledWith('refresh_token', 'refresh-token');
    expect(window.localStorage.setItem).toHaveBeenCalledWith('user', expect.stringContaining('test@example.com'));

    // Should end up on dashboard
    expect(await screen.findByRole('heading', { level: 1, name: /dashboard/i }, { timeout: 5000 })).toBeInTheDocument();
  }, 15_000);

  test('should handle logout and return to login', async () => {
    const user = userEvent.setup();

    mockApiClient.getCurrentUser.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      role: 'user',
      is_2fa_enabled: true,
      locale: 'en',
    } as any);
    mockApiClient.getSessions.mockResolvedValue([]);
    mockApiClient.logout.mockResolvedValue(undefined);

    (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'access_token') return 'mock-token';
      if (key === 'user') return JSON.stringify({ id: 'user-123', email: 'test@example.com' });
      return null;
    });

    window.history.pushState({}, 'Dashboard', '/dashboard');
    renderApp();

    expect(await screen.findByRole('heading', { level: 1, name: /dashboard/i }, { timeout: 5000 })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /logout/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/login');
    });

    expect(window.localStorage.removeItem).toHaveBeenCalledWith('access_token');
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('user');
  });
});
