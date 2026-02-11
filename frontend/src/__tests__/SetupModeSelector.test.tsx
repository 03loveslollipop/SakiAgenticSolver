import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SetupModeSelector, SetupMode } from '../components';

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

describe('SetupModeSelector', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders both setup mode options', () => {
    render(
      <SetupModeSelector
        value="gemini"
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('Gemini CLI')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
    
    expect(screen.getByText('Pre-configured with Gemini CLI for AI-powered development')).toBeInTheDocument();
    expect(screen.getByText('Basic tools and SSH access - configure your own environment')).toBeInTheDocument();
  });

  it('shows Gemini CLI as selected when value is "gemini"', () => {
    render(
      <SetupModeSelector
        value="gemini"
        onChange={mockOnChange}
      />
    );

    const geminiButton = screen.getByText('Gemini CLI').closest('button');
    const manualButton = screen.getByText('Manual').closest('button');
    
    expect(geminiButton).toHaveClass('selected');
    expect(manualButton).not.toHaveClass('selected');
  });

  it('shows Manual as selected when value is "manual"', () => {
    render(
      <SetupModeSelector
        value="manual"
        onChange={mockOnChange}
      />
    );

    const geminiButton = screen.getByText('Gemini CLI').closest('button');
    const manualButton = screen.getByText('Manual').closest('button');
    
    expect(manualButton).toHaveClass('selected');
    expect(geminiButton).not.toHaveClass('selected');
  });

  it('calls onChange with "manual" when Manual button is clicked', () => {
    render(
      <SetupModeSelector
        value="gemini"
        onChange={mockOnChange}
      />
    );

    const manualButton = screen.getByText('Manual').closest('button');
    fireEvent.click(manualButton!);
    
    expect(mockOnChange).toHaveBeenCalledWith('manual');
  });

  it('calls onChange with "gemini" when Gemini CLI button is clicked', () => {
    render(
      <SetupModeSelector
        value="manual"
        onChange={mockOnChange}
      />
    );

    const geminiButton = screen.getByText('Gemini CLI').closest('button');
    fireEvent.click(geminiButton!);
    
    expect(mockOnChange).toHaveBeenCalledWith('gemini');
  });

  it('has proper ARIA attributes for accessibility', () => {
    render(
      <SetupModeSelector
        value="gemini"
        onChange={mockOnChange}
      />
    );

    const geminiButton = screen.getByText('Gemini CLI').closest('button');
    const manualButton = screen.getByText('Manual').closest('button');
    
    expect(geminiButton).toHaveAttribute('aria-pressed', 'true');
    expect(manualButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('handles keyboard navigation and selection', () => {
    render(
      <SetupModeSelector
        value="gemini"
        onChange={mockOnChange}
      />
    );

    const manualButton = screen.getByText('Manual').closest('button');
    
    // Simulate Enter key press
    fireEvent.keyDown(manualButton!, { key: 'Enter' });
    expect(mockOnChange).toHaveBeenCalledWith('manual');
    
    mockOnChange.mockClear();
    
    // Simulate Space key press
    fireEvent.keyDown(manualButton!, { key: ' ' });
    expect(mockOnChange).toHaveBeenCalledWith('manual');
  });
});