// NavigationFlow.integration.test.tsx - Integration test for navigation between pages
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App8Bit from '../../App8Bit';
import { apiClient } from '../../services/api';

jest.mock('../../services/api', () => ({
  __esModule: true,
  ...(function () {
    const client = {
      getCurrentUser: jest.fn(),
      getSessions: jest.fn(),
    };

    return { apiClient: client, default: client };
  })(),
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

  const renderApp = () => render(<App8Bit />);

  test('should navigate from landing page to login page', async () => {
    const user = userEvent.setup();

    mockApiClient.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

    window.history.pushState({}, 'Landing', '/');
    renderApp();

    expect(await screen.findByRole('heading', { level: 1, name: /saki/i })).toBeInTheDocument();

    const loginButtons = screen.getAllByRole('button', { name: /login/i });
    await user.click(loginButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    });
  });

  test('should navigate between dashboard and create VM when authenticated', async () => {
    const user = userEvent.setup();

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

    window.history.pushState({}, 'Dashboard', '/dashboard');
    renderApp();

    expect(await screen.findByRole('heading', { level: 1, name: /dashboard/i })).toBeInTheDocument();

    const createVmLink = screen.getByRole('link', { name: /create vm/i });
    await user.click(createVmLink);

    expect(await screen.findByRole('heading', { level: 1, name: /create virtual machine/i })).toBeInTheDocument();

    const dashboardLink = screen.getByRole('link', { name: /^dashboard$/i });
    await user.click(dashboardLink);

    expect(await screen.findByRole('heading', { level: 1, name: /dashboard/i })).toBeInTheDocument();
  });

  test('should show 404 page for unknown routes', async () => {
    mockApiClient.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

    window.history.pushState({}, 'Unknown', '/unknown-route');
    renderApp();

    expect(await screen.findByRole('heading', { level: 2, name: /page not found/i })).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /return to home/i })).toBeInTheDocument();
  });

  test('should navigate back from 404 page to home', async () => {
    const user = userEvent.setup();

    mockApiClient.getCurrentUser.mockRejectedValue(new Error('Not authenticated'));
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);

    window.history.pushState({}, 'Unknown', '/unknown-route');
    renderApp();

    expect(await screen.findByRole('heading', { level: 2, name: /page not found/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /return to home/i }));

    expect(await screen.findByRole('heading', { level: 1, name: /saki/i })).toBeInTheDocument();
  });
});
