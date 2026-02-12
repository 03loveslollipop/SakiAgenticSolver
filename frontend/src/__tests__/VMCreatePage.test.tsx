import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { VMCreatePage } from '../pages/VMCreatePage';
import apiClient from '../services/api';

// Mock the useNavigate hook
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock the useResponsive hook to keep sidebar visible
jest.mock('../hooks/useResponsive', () => ({
  useResponsive: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    breakpoint: 'desktop',
  }),
}));

jest.mock('../services/api', () => ({
  __esModule: true,
  ...(function () {
    const client = { createSession: jest.fn() };
    return { apiClient: client, default: client };
  })(),
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('VMCreatePage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockApiClient.createSession.mockReset();
  });

  it('renders the VM creation form with the app shell', () => {
    const { container } = render(
      <BrowserRouter>
        <VMCreatePage />
      </BrowserRouter>
    );

    // App shell should render the sidebar on desktop
    expect(container.querySelector('aside')).toBeInTheDocument();

    // Page title and key sections
    expect(screen.getByRole('heading', { level: 1, name: /create virtual machine/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /challenge urls/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /challenge instructions/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /agent configuration/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /infrastructure size/i })).toBeInTheDocument();

    // Form controls
    expect(screen.getByLabelText(/challenge url 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/instructions/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/agent type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/agent model/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/vm size/i)).toBeInTheDocument();

    // Actions
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create vm/i })).toBeInTheDocument();
  });

  it('validates required fields and shows an error message', async () => {
    const { container } = render(
      <BrowserRouter>
        <VMCreatePage />
      </BrowserRouter>
    );

    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();

    fireEvent.submit(form!);

    expect(await screen.findByText(/at least one challenge url is required/i)).toBeInTheDocument();
    expect(mockApiClient.createSession).not.toHaveBeenCalled();
  });

  it('submits valid data and navigates to the created session', async () => {
    mockApiClient.createSession.mockResolvedValue({ id: 'session-123' } as any);

    const { container } = render(
      <BrowserRouter>
        <VMCreatePage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/challenge url 1/i), {
      target: { value: 'https://example.com/challenge.bin' },
    });
    fireEvent.change(screen.getByLabelText(/instructions/i), {
      target: { value: 'Solve the challenge and write a report.' },
    });
    fireEvent.change(screen.getByLabelText(/agent model/i), {
      target: { value: 'gpt-4' },
    });

    const form = container.querySelector('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockApiClient.createSession).toHaveBeenCalledWith({
        challengeUrls: ['https://example.com/challenge.bin'],
        instructions: 'Solve the challenge and write a report.',
        agentType: 'codex',
        agentModel: 'gpt-4',
        vmSize: 'small',
        setupMode: 'manual',
        deployAgent: true,
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/sessions/session-123');
    });
  });

  it('cancels and returns to dashboard', () => {
    render(
      <BrowserRouter>
        <VMCreatePage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
});
