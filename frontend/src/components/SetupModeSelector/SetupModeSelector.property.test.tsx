// SetupModeSelector.property.test.tsx - Property-based tests for SetupModeSelector component
import React from 'react';
import { render, fireEvent } from '../../test-utils/render-with-providers';
import fc from 'fast-check';
import { SetupModeSelector, SetupMode } from './SetupModeSelector';
import { runPropertyTest } from '../../test-utils/test-config';

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

describe('SetupModeSelector Component Properties', () => {
  runPropertyTest(
    25,
    'Setup Mode Selection',
    fc.constantFrom<SetupMode>('gemini', 'manual'),
    (mode) => {
      let selectedMode: SetupMode = mode;
      const handleChange = (newMode: SetupMode) => {
        selectedMode = newMode;
      };

      const { container } = render(
        <SetupModeSelector value={mode} onChange={handleChange} />
      );

      const buttons = container.querySelectorAll('.mode-button');
      expect(buttons).toHaveLength(2);

      // Find the button for the current mode
      const currentButton = Array.from(buttons).find(button => 
        button.textContent?.includes(mode === 'gemini' ? 'Gemini CLI' : 'Manual')
      );
      
      expect(currentButton).toBeDefined();
      
      // Verify the current button has selected class
      expect(currentButton).toHaveClass('selected');
      expect(currentButton).toHaveAttribute('aria-pressed', 'true');
      
      // Find the other button
      const otherButton = Array.from(buttons).find(button => button !== currentButton);
      expect(otherButton).not.toHaveClass('selected');
      expect(otherButton).toHaveAttribute('aria-pressed', 'false');
      
      // Click the other button
      fireEvent.click(otherButton!);
      
      // Verify onChange was called with the other mode
      const expectedOtherMode = mode === 'gemini' ? 'manual' : 'gemini';
      expect(selectedMode).toBe(expectedOtherMode);
    }
  );

  // Additional property: Selection persistence
  runPropertyTest(
    25.1,
    'Setup Mode Selection Persistence',
    fc.record({
      mode: fc.constantFrom<SetupMode>('gemini', 'manual'),
    }),
    ({ mode }) => {
      let selectedMode: SetupMode = mode;
      const handleChange = (newMode: SetupMode) => {
        selectedMode = newMode;
      };

      const { container, rerender } = render(
        <SetupModeSelector value={mode} onChange={handleChange} />
      );

      // Verify initial selection
      const buttons = container.querySelectorAll('.mode-button');
      const selectedButton = Array.from(buttons).find(button => 
        button.textContent?.includes(mode === 'gemini' ? 'Gemini CLI' : 'Manual')
      );
      
      expect(selectedButton).toHaveClass('selected');
      expect(selectedButton).toHaveAttribute('aria-pressed', 'true');
      
      // Re-render with same mode (simulating persistence)
      rerender(<SetupModeSelector value={mode} onChange={handleChange} />);
      
      // Verify selection persists
      const buttonsAfterRerender = container.querySelectorAll('.mode-button');
      const selectedButtonAfterRerender = Array.from(buttonsAfterRerender).find(button => 
        button.textContent?.includes(mode === 'gemini' ? 'Gemini CLI' : 'Manual')
      );
      
      expect(selectedButtonAfterRerender).toHaveClass('selected');
      expect(selectedButtonAfterRerender).toHaveAttribute('aria-pressed', 'true');
    }
  );

  // Additional property: Mode descriptions
  runPropertyTest(
    25.2,
    'Setup Mode Descriptions',
    fc.constantFrom<SetupMode>('gemini', 'manual'),
    (mode) => {
      const { container } = render(
        <SetupModeSelector value={mode} onChange={() => {}} />
      );

      const buttons = container.querySelectorAll('.mode-button');
      expect(buttons).toHaveLength(2);
      
      // Verify both buttons have descriptions
      buttons.forEach(button => {
        const description = button.querySelector('.mode-desc');
        expect(description).toBeInTheDocument();
        expect(description?.textContent?.length).toBeGreaterThan(0);
      });
      
      // Verify Gemini CLI description
      const geminiButton = Array.from(buttons).find(button => 
        button.textContent?.includes('Gemini CLI')
      );
      const geminiDesc = geminiButton?.querySelector('.mode-desc');
      expect(geminiDesc?.textContent).toContain('Pre-configured with Gemini CLI');
      
      // Verify Manual description
      const manualButton = Array.from(buttons).find(button => 
        button.textContent?.includes('Manual')
      );
      const manualDesc = manualButton?.querySelector('.mode-desc');
      expect(manualDesc?.textContent).toContain('Basic tools and SSH access');
    }
  );
});