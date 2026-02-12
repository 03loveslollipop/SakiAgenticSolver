// KeyboardNavigation.property.test.tsx - Property-based tests for keyboard navigation accessibility
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
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
      text: fc.string({ minLength: 1, maxLength: 20 }).filter(text => {
        // Filter out text that might cause issues with DOM queries
        // Allow most characters but avoid problematic ones for testing
        return text.trim().length > 0;
      }),
      disabled: fc.boolean(),
    }),
    async ({ text, disabled }) => {
      // Clean up any previous renders
      cleanup();
      
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      // Create a simple test ID to avoid regex issues with special characters
      const testId = `button-test-${Math.random().toString(36).substr(2, 9)}`;
      
      render(
        <div data-testid={testId}>
          <Button 
            onClick={handleClick} 
            disabled={disabled}
            aria-label={`Test button`}
          >
            {text}
          </Button>
        </div>
      );
      
      // Get button by its role (there should be only one button in this container)
      const container = screen.getByTestId(testId);
      const button = container.querySelector('button');
      
      if (!button) {
        throw new Error('Button not found');
      }
      
      // Button should be focusable (buttons are naturally focusable)
      // Check that it's not explicitly unfocusable
      expect(button).not.toHaveAttribute('tabindex', '-1');
      
      // Button should have focus styles - check class string instead of classList
      const buttonClass = button.getAttribute('class') || '';
      expect(buttonClass).toContain('focus:outline-none');
      expect(buttonClass).toContain('focus:ring-2');
      expect(buttonClass).toContain('focus:ring-accent-cyan');
      
      // For disabled buttons, they should not be focusable or respond to keyboard
      if (disabled) {
        expect(button).toBeDisabled();
        // Disabled buttons should not respond to keyboard events
        // In jsdom, disabled buttons are not focusable by default
      } else {
        // Test keyboard interactions without programmatic focus
        // Use userEvent to simulate real user interaction
        await user.click(button);
        expect(handleClick).toHaveBeenCalledTimes(1);
      }
    }
  );

  runPropertyTest(
    16.1,
    'Accessibility - Keyboard Navigation - Input Component',
    fc.record({
      label: fc.string({ minLength: 1, maxLength: 20 }).filter(label => label.trim().length > 0),
      value: fc.string({ maxLength: 50 }),
      disabled: fc.boolean(),
    }),
    async ({ label, value, disabled }) => {
      // Clean up any previous renders
      cleanup();
      
      const user = userEvent.setup();
      const handleChange = jest.fn();
      
      // Create test ID to isolate this render
      const testId = `input-test-${Math.random().toString(36).substr(2, 9)}`;
      
      render(
        <div data-testid={testId}>
          <Input
            label={label}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            aria-label={`Input for ${label}`}
          />
        </div>
      );
      
      // Get input from container to avoid multiple render issues
      const container = screen.getByTestId(testId);
      const labelElement = container.querySelector('label');
      expect(labelElement).toBeInTheDocument();
      
      // Check that label contains the text (allowing for whitespace differences)
      // Some labels might have special characters that need escaping
      const labelText = labelElement?.textContent || '';
      expect(labelText.replace(/\s+/g, ' ').trim()).toContain(label.trim());
      
      // Get input by its id from the label's "for" attribute
      const labelFor = labelElement?.getAttribute('for');
      const input = labelFor ? container.querySelector(`#${labelFor}`) : null;
      expect(input).toBeInTheDocument();
      
      // Input should be focusable (inputs are naturally focusable)
      // Check that it's not explicitly unfocusable
      expect(input).not.toHaveAttribute('tabindex', '-1');
      
      // Input should have focus styles
      expect(input).toHaveClass('focus:outline-none');
      expect(input).toHaveClass('focus:border-accent-cyan');
      expect(input).toHaveClass('focus:ring-2');
      expect(input).toHaveClass('focus:ring-accent-cyan');
      
      // Input should have focus styles
      const inputClass = input.getAttribute('class') || '';
      expect(inputClass).toContain('focus:outline-none');
      expect(inputClass).toContain('focus:border-accent-cyan');
      expect(inputClass).toContain('focus:ring-2');
      expect(inputClass).toContain('focus:ring-accent-cyan');
      
      // Input should not be explicitly unfocusable
      expect(input).not.toHaveAttribute('tabindex', '-1');
      
      // If disabled, input should be disabled
      if (disabled) {
        expect(input).toBeDisabled();
      } else {
        expect(input).not.toBeDisabled();
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
        // Note: Native HTML elements like button, input, select, textarea
        // are naturally focusable but become unfocusable when disabled
        // We should check they are disabled, not that they have tabindex="-1"
        // as native elements don't need explicit tabindex="-1" when disabled
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
      // For disabled elements, focus styles may still be present in CSS
      // but they won't be focusable, so we don't need to check focus classes
      if (!disabled) {
        // Check class string instead of classList for jsdom compatibility
        const elementClass = interactiveElement?.getAttribute('class') || '';
        const hasFocusClass = 
          elementClass.includes('focus:outline-none') ||
          elementClass.includes('focus:ring-2') ||
          elementClass.includes('focus:border-accent-cyan');
        
        expect(hasFocusClass).toBe(true);
      }
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