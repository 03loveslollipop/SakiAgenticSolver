// KeyboardNavigation.property.test.tsx - Property-based tests for keyboard navigation accessibility
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { runPropertyTest } from '../../test-utils/test-config';

// Import components to test
import { Button } from '../../components/Button/Button';
import { Input } from '../../components/Input/Input';
import { Sidebar } from '../../components/Sidebar/Sidebar';
import { Navigation } from '../../components/Navigation/Navigation';
import { SetupModeSelector } from '../../components/SetupModeSelector/SetupModeSelector';

describe('Accessibility - Keyboard Navigation Properties', () => {
  // Property 16: Accessibility - Keyboard Navigation
  // Validates: Requirements 11.2
  runPropertyTest(
    16,
    'Accessibility - Keyboard Navigation - Button Component',
    fc.record({
      text: fc.string({ minLength: 1, maxLength: 20 }),
      disabled: fc.boolean(),
    }),
    async ({ text, disabled }) => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(
        <Button 
          onClick={handleClick} 
          disabled={disabled}
          aria-label={`Test button ${text}`}
        >
          {text}
        </Button>
      );
      
      const button = screen.getByRole('button', { name: `Test button ${text}` });
      
      // Button should be focusable (buttons are naturally focusable)
      // Check that it's not explicitly unfocusable
      expect(button).not.toHaveAttribute('tabindex', '-1');
      
      // Button should have focus styles
      expect(button).toHaveClass('focus:outline-none');
      expect(button).toHaveClass('focus:ring-2');
      expect(button).toHaveClass('focus:ring-accent-cyan');
      
      // Focus the button
      button.focus();
      expect(button).toHaveFocus();
      
      // Test Enter key if not disabled
      if (!disabled) {
        await user.keyboard('{Enter}');
        expect(handleClick).toHaveBeenCalledTimes(1);
        
        // Reset and test Space key
        handleClick.mockClear();
        await user.keyboard(' ');
        expect(handleClick).toHaveBeenCalledTimes(1);
      }
    }
  );

  runPropertyTest(
    16.1,
    'Accessibility - Keyboard Navigation - Input Component',
    fc.record({
      label: fc.string({ minLength: 1, maxLength: 20 }),
      value: fc.string({ maxLength: 50 }),
      disabled: fc.boolean(),
    }),
    async ({ label, value, disabled }) => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      
      render(
        <Input
          label={label}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          aria-label={`Input for ${label}`}
        />
      );
      
      const input = screen.getByLabelText(label);
      
      // Input should be focusable (inputs are naturally focusable)
      // Check that it's not explicitly unfocusable
      expect(input).not.toHaveAttribute('tabindex', '-1');
      
      // Input should have focus styles
      expect(input).toHaveClass('focus:outline-none');
      expect(input).toHaveClass('focus:border-accent-cyan');
      expect(input).toHaveClass('focus:ring-2');
      expect(input).toHaveClass('focus:ring-accent-cyan');
      
      // Focus the input
      await user.tab();
      expect(input).toHaveFocus();
      
      // Test typing if not disabled
      if (!disabled) {
        const testText = 'Test input';
        await user.keyboard(testText);
        expect(handleChange).toHaveBeenCalled();
      }
    }
  );

  runPropertyTest(
    16.2,
    'Accessibility - Keyboard Navigation - Interactive Elements Have Tabindex',
    fc.record({
      elementType: fc.constantFrom<'button' | 'input' | 'select' | 'textarea'>('button', 'input', 'select', 'textarea'),
      disabled: fc.boolean(),
    }),
    ({ elementType, disabled }) => {
      // This property test validates that all interactive elements
      // have appropriate tabindex attributes
      
      let element;
      switch (elementType) {
        case 'button':
          element = <Button disabled={disabled}>Test Button</Button>;
          break;
        case 'input':
          element = <Input label="Test Input" disabled={disabled} />;
          break;
        case 'select':
          element = (
            <select disabled={disabled} aria-label="Test select">
              <option value="1">Option 1</option>
              <option value="2">Option 2</option>
            </select>
          );
          break;
        case 'textarea':
          element = <textarea disabled={disabled} aria-label="Test textarea" />;
          break;
      }
      
      const { container } = render(element);
      const interactiveElement = container.querySelector(elementType);
      
      // Interactive elements should be focusable unless disabled
      if (disabled) {
        expect(interactiveElement).toBeDisabled();
        // Disabled elements should not be focusable
        expect(interactiveElement).toHaveAttribute('tabindex', '-1');
      } else {
        expect(interactiveElement).not.toBeDisabled();
        // Should not be explicitly unfocusable
        expect(interactiveElement).not.toHaveAttribute('tabindex', '-1');
        // Can have tabindex 0 or be naturally focusable (no tabindex)
        const tabIndex = interactiveElement?.getAttribute('tabindex');
        if (tabIndex !== null && tabIndex !== '') {
          expect(tabIndex).toBe('0');
        }
      }
      
      // All interactive elements should have focus indicators
      const hasFocusClass = 
        interactiveElement?.classList.contains('focus:outline-none') ||
        interactiveElement?.classList.contains('focus:ring-2') ||
        interactiveElement?.classList.contains('focus:border-accent-cyan');
      
      expect(hasFocusClass).toBe(true);
    }
  );

  runPropertyTest(
    16.3,
    'Accessibility - Keyboard Navigation - Logical Tab Order',
    fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 2, maxLength: 5 }),
    (buttonLabels) => {
      // This property test validates that tab order follows logical reading order
      // by rendering multiple interactive elements and checking their DOM order
      
      const { container } = render(
        <div>
          {buttonLabels.map((label, index) => (
            <Button key={index} aria-label={`Button ${label}`}>
              {label}
            </Button>
          ))}
        </div>
      );
      
      const buttons = container.querySelectorAll('button');
      
      // Verify all buttons are rendered
      expect(buttons.length).toBe(buttonLabels.length);
      
      // Verify buttons are in the correct order
      buttons.forEach((button, index) => {
        expect(button.textContent).toBe(buttonLabels[index]);
      });
      
      // Verify all buttons have proper accessibility attributes
      buttons.forEach(button => {
        // Buttons are naturally focusable, should not be explicitly unfocusable
        expect(button).not.toHaveAttribute('tabindex', '-1');
        expect(button).toHaveClass('focus:outline-none');
      });
    }
  );
});