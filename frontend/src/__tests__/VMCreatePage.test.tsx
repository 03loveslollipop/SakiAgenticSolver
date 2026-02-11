import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { VMCreatePage } from '../pages/VMCreatePage';

// Mock the useNavigate hook
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock the useResponsive hook
jest.mock('../hooks/useResponsive', () => ({
  useResponsive: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    breakpoint: 'desktop',
  }),
}));

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'vm.create.setupModeGemini': 'Gemini CLI',
        'vm.create.setupModeGeminiDesc': 'Pre-configured with Gemini CLI for AI-powered development',
        'vm.create.setupModeManual': 'Manual',
        'vm.create.setupModeManualDesc': 'Basic tools and SSH access - configure your own environment',
      };
      return translations[key] || key;
    },
  }),
}));

describe('VMCreatePage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders the VM creation form with all sections', () => {
    render(
      <BrowserRouter>
        <VMCreatePage />
      </BrowserRouter>
    );

    // Check page title
    expect(screen.getByText('Create Virtual Machine')).toBeInTheDocument();

    // Check section headers
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Resources')).toBeInTheDocument();
    expect(screen.getByText('Network Configuration')).toBeInTheDocument();
    expect(screen.getByText('Setup Mode')).toBeInTheDocument();
    expect(screen.getByText('Advanced Options')).toBeInTheDocument();

    // Check form fields
    expect(screen.getByLabelText(/VM Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Operating System/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CPU Cores/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/RAM \(GB\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Storage \(GB\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Network Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/SSH Public Key/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tags/i)).toBeInTheDocument();

    // Check setup mode options
    expect(screen.getByText('Gemini CLI')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();

    // Check buttons
    expect(screen.getByText('← Back')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Create VM')).toBeInTheDocument();
  });

  it('validates form inputs and shows error messages', async () => {
    const { container } = render(
      <BrowserRouter>
        <VMCreatePage />
      </BrowserRouter>
    );

    // Get the form element
    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();
    
    // Try to submit empty form
    fireEvent.submit(form!);

    // Should show error for empty VM name
    await waitFor(() => {
      expect(screen.getByText(/VM name is required/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    // Clear the error by entering valid data
    fireEvent.change(screen.getByLabelText(/VM Name/i), {
      target: { value: 'ab' },
    });
    
    // Submit again - should show different error
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText(/VM name must be between 3 and 50 characters/i)).toBeInTheDocument();
    }, { timeout: 2000 });

    // Clear and test CPU validation
    fireEvent.change(screen.getByLabelText(/VM Name/i), {
      target: { value: 'Test VM' },
    });
    const cpuInput = screen.getByLabelText(/CPU Cores/i);
    fireEvent.change(cpuInput, {
      target: { value: '0' },
    });
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText(/CPU cores must be between 1 and 8/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('allows switching between setup modes', () => {
    render(
      <BrowserRouter>
        <VMCreatePage />
      </BrowserRouter>
    );

    // Gemini CLI should be selected by default
    const geminiButton = screen.getByText('Gemini CLI').closest('button');
    const manualButton = screen.getByText('Manual').closest('button');
    
    expect(geminiButton).toHaveClass('selected');
    expect(manualButton).not.toHaveClass('selected');

    // Click Manual mode
    fireEvent.click(manualButton!);
    
    expect(manualButton).toHaveClass('selected');
    expect(geminiButton).not.toHaveClass('selected');

    // Click back to Gemini CLI
    fireEvent.click(geminiButton!);
    
    expect(geminiButton).toHaveClass('selected');
    expect(manualButton).not.toHaveClass('selected');
  });

  it('handles form submission with valid data', async () => {
    render(
      <BrowserRouter>
        <VMCreatePage />
      </BrowserRouter>
    );

    // Fill in valid form data
    fireEvent.change(screen.getByLabelText(/VM Name/i), {
      target: { value: 'My Test VM' },
    });
    fireEvent.change(screen.getByLabelText(/Operating System/i), {
      target: { value: 'kali' },
    });
    fireEvent.change(screen.getByLabelText(/CPU Cores/i), {
      target: { value: '4' },
    });
    fireEvent.change(screen.getByLabelText(/RAM \(GB\)/i), {
      target: { value: '8' },
    });
    fireEvent.change(screen.getByLabelText(/Storage \(GB\)/i), {
      target: { value: '100' },
    });

    // Select Manual mode
    const manualButton = screen.getByText('Manual').closest('button');
    fireEvent.click(manualButton!);

    // Submit form
    fireEvent.click(screen.getByText('Create VM'));

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Creating VM...')).toBeInTheDocument();
    });

    // After loading completes, should navigate to dashboard
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    }, { timeout: 3000 });
  });

  it('cancels form and navigates back', () => {
    render(
      <BrowserRouter>
        <VMCreatePage />
      </BrowserRouter>
    );

    // Click back button
    fireEvent.click(screen.getByText('← Back'));
    expect(mockNavigate).toHaveBeenCalledWith(-1);

    // Click cancel button
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('disables form inputs during loading', async () => {
    render(
      <BrowserRouter>
        <VMCreatePage />
      </BrowserRouter>
    );

    // Fill form and submit
    fireEvent.change(screen.getByLabelText(/VM Name/i), {
      target: { value: 'Test VM' },
    });
    fireEvent.click(screen.getByText('Create VM'));

    // Check that inputs are disabled during loading
    await waitFor(() => {
      expect(screen.getByLabelText(/VM Name/i)).toBeDisabled();
      expect(screen.getByLabelText(/Operating System/i)).toBeDisabled();
      expect(screen.getByLabelText(/CPU Cores/i)).toBeDisabled();
      expect(screen.getByLabelText(/RAM \(GB\)/i)).toBeDisabled();
      expect(screen.getByLabelText(/Storage \(GB\)/i)).toBeDisabled();
    });
  });
});