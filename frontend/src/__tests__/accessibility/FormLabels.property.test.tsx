// FormLabels.property.test.tsx - Property-based tests for form labels accessibility
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { runPropertyTest } from '../../test-utils/test-config';

// Import components to test
import { Input } from '../../components/Input/Input';
import { Button } from '../../components/Button/Button';

describe('Accessibility - Form Labels Properties', () => {
  // Property 18: Accessibility - Form Labels
  // Validates: Requirements 11.4
  runPropertyTest(
    18,
    'Accessibility - Form Labels - Input Component Labels',
    fc.record({
      label: fc.string({ minLength: 1, maxLength: 30 }).filter(label => label.trim().length > 0),
      required: fc.boolean(),
      hasError: fc.boolean(),
      hasHelperText: fc.boolean(),
    }),
    ({ label, required, hasError, hasHelperText }) => {
      // Clean up any previous renders
      cleanup();
      
      const error = hasError ? 'This field is required' : undefined;
      const helperText = hasHelperText ? 'Please enter a value' : undefined;
      
      // Create test ID to isolate this render
      const testId = `input-test-${Math.random().toString(36).substr(2, 9)}`;
      
      render(
        <div data-testid={testId}>
          <Input
            label={label}
            required={required}
            error={error}
            helperText={helperText}
          />
        </div>
      );
      
      // Get container to avoid multiple render issues
      const container = screen.getByTestId(testId);
      
      // Input should be associated with label via htmlFor/id
      const input = container.querySelector('input');
      expect(input).toBeInTheDocument();
      
      // Label should exist
      const labelElement = container.querySelector('label');
      expect(labelElement).toBeInTheDocument();
      expect(labelElement?.textContent).toContain(label.trim());
      
      // Label should be associated with input
      const labelFor = labelElement?.getAttribute('for');
      const inputId = input?.getAttribute('id');
      expect(labelFor).toBe(inputId);
      
      // If required, input should have required attribute
      if (required) {
        expect(input).toBeRequired();
      }
      
      // If there's an error, input should have aria-invalid
      if (hasError) {
        expect(input).toHaveAttribute('aria-invalid', 'true');
        
        // Error message should be associated via aria-describedby
        const errorElement = container.querySelector('[role="alert"]');
        expect(errorElement).toBeInTheDocument();
        expect(errorElement?.textContent).toContain(error?.trim());
        const errorId = errorElement?.id;
        if (errorId) {
          expect(input).toHaveAttribute('aria-describedby', expect.stringContaining(errorId));
        }
      }
      
      // If there's helper text, it should be associated via aria-describedby
      if (hasHelperText && !hasError) {
        const helperElement = container.querySelector('[id$="-helper"]');
        expect(helperElement).toBeInTheDocument();
        expect(helperElement?.textContent).toContain(helperText?.trim());
        const helperId = helperElement?.id;
        if (helperId) {
          expect(input).toHaveAttribute('aria-describedby', expect.stringContaining(helperId));
        }
      }
    }
  );

  runPropertyTest(
    18.1,
    'Accessibility - Form Labels - Checkbox and Radio Labels',
    fc.record({
      labelText: fc.string({ minLength: 1, maxLength: 30 }),
      inputType: fc.constantFrom<'checkbox' | 'radio'>('checkbox', 'radio'),
      checked: fc.boolean(),
      disabled: fc.boolean(),
    }),
    ({ labelText, inputType, checked, disabled }) => {
      const inputId = 'test-input';
      
      render(
        <div>
          <input
            type={inputType}
            id={inputId}
            checked={checked}
            disabled={disabled}
            aria-label={`${inputType} for ${labelText}`}
          />
          <label htmlFor={inputId}>
            {labelText}
          </label>
        </div>
      );
      
      // Input should be findable by label
      const input = screen.getByLabelText(labelText);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', inputType);
      
      // Input should have aria-label as additional context
      expect(input).toHaveAttribute('aria-label', `${inputType} for ${labelText}`);
      
      // Label should be associated with input
      const label = screen.getByText(labelText);
      expect(label.tagName).toBe('LABEL');
      expect(label).toHaveAttribute('for', inputId);
      
      // Input should have correct state
      if (checked) {
        expect(input).toBeChecked();
      } else {
        expect(input).not.toBeChecked();
      }
      
      if (disabled) {
        expect(input).toBeDisabled();
      } else {
        expect(input).not.toBeDisabled();
      }
    }
  );

  runPropertyTest(
    18.2,
    'Accessibility - Form Labels - Form Field Groups',
    fc.record({
      groupLabel: fc.string({ minLength: 1, maxLength: 30 }),
      fieldCount: fc.integer({ min: 1, max: 5 }),
      hasLegend: fc.boolean(),
    }),
    ({ groupLabel, fieldCount, hasLegend }) => {
      const groupId = 'field-group';
      
      const { container } = render(
        <fieldset aria-labelledby={hasLegend ? groupId : undefined}>
          {hasLegend && <legend id={groupId}>{groupLabel}</legend>}
          {Array.from({ length: fieldCount }).map((_, index) => (
            <div key={index}>
              <Input
                label={`Field ${index + 1}`}
                aria-label={`${groupLabel} - Field ${index + 1}`}
              />
            </div>
          ))}
        </fieldset>
      );
      
      const fieldset = container.querySelector('fieldset');
      expect(fieldset).toBeInTheDocument();
      
      if (hasLegend) {
        // Fieldset should be labelled by legend
        const legend = container.querySelector('legend');
        expect(legend).toHaveTextContent(groupLabel);
        expect(legend).toHaveAttribute('id', groupId);
        expect(fieldset).toHaveAttribute('aria-labelledby', groupId);
      }
      
      // All inputs should have labels
      const inputs = container.querySelectorAll('input');
      expect(inputs.length).toBe(fieldCount);
      
      inputs.forEach((input, index) => {
        // Input should have aria-label with group context
        expect(input).toHaveAttribute('aria-label', `${groupLabel} - Field ${index + 1}`);
        
        // Input should also have visible label
        const label = container.querySelector(`label[for="${input.id}"]`);
        expect(label).toHaveTextContent(`Field ${index + 1}`);
      });
    }
  );

  runPropertyTest(
    18.3,
    'Accessibility - Form Labels - Button Labels in Forms',
    fc.record({
      buttonText: fc.string({ minLength: 1, maxLength: 20 }),
      buttonType: fc.constantFrom<'submit' | 'button' | 'reset'>('submit', 'button', 'reset'),
      hasAriaLabel: fc.boolean(),
    }),
    ({ buttonText, buttonType, hasAriaLabel }) => {
      const ariaLabel = hasAriaLabel ? `Action: ${buttonText}` : undefined;
      
      render(
        <Button
          type={buttonType}
          aria-label={ariaLabel}
        >
          {buttonText}
        </Button>
      );
      
      const button = screen.getByRole('button');
      
      // Button should have visible text
      expect(button).toHaveTextContent(buttonText);
      
      // Button should have correct type
      expect(button).toHaveAttribute('type', buttonType);
      
      // If aria-label is provided, it should be present
      if (hasAriaLabel) {
        expect(button).toHaveAttribute('aria-label', ariaLabel);
      }
      
      // Button should be focusable (not explicitly unfocusable)
      expect(button).not.toHaveAttribute('tabindex', '-1');
    }
  );

  runPropertyTest(
    18.4,
    'Accessibility - Form Labels - Complex Form Validation',
    fc.record({
      fieldName: fc.string({ minLength: 1, maxLength: 20 }),
      isValid: fc.boolean(),
      validationMessage: fc.string({ minLength: 1, maxLength: 50 }),
    }),
    ({ fieldName, isValid, validationMessage }) => {
      const error = !isValid ? validationMessage : undefined;
      const helperText = isValid ? 'Valid input' : undefined;
      
      render(
        <Input
          label={fieldName}
          error={error}
          helperText={helperText}
          aria-label={`Form field: ${fieldName}`}
          aria-errormessage={error ? `${fieldName}-error` : undefined}
        />
      );
      
      const input = screen.getByLabelText(fieldName);
      
      // Input should have aria-label
      expect(input).toHaveAttribute('aria-label', `Form field: ${fieldName}`);
      
      if (!isValid) {
        // Input should have aria-invalid for errors
        expect(input).toHaveAttribute('aria-invalid', 'true');
        
        // Input should have aria-errormessage pointing to error element
        const errorElement = screen.getByText(validationMessage);
        const errorId = errorElement.id;
        expect(input).toHaveAttribute('aria-errormessage', errorId);
        
        // Error element should have role="alert"
        expect(errorElement).toHaveAttribute('role', 'alert');
      } else {
        // Input should not have aria-invalid when valid
        expect(input).not.toHaveAttribute('aria-invalid');
        
        // Helper text should be associated via aria-describedby
        if (helperText) {
          const helperElement = screen.getByText(helperText);
          const helperId = helperElement.id;
          expect(input).toHaveAttribute('aria-describedby', expect.stringContaining(helperId));
        }
      }
    }
  );

  runPropertyTest(
    18.5,
    'Accessibility - Form Labels - Missing Labels Fallback',
    fc.record({
      hasLabel: fc.boolean(),
      hasAriaLabel: fc.boolean(),
      placeholder: fc.oneof(fc.constant(undefined), fc.string({ minLength: 1, maxLength: 30 })),
    }),
    ({ hasLabel, hasAriaLabel, placeholder }) => {
      const label = hasLabel ? 'Email Address' : undefined;
      const ariaLabel = hasAriaLabel ? 'Enter your email' : undefined;
      
      render(
        <Input
          label={label}
          aria-label={ariaLabel}
          placeholder={placeholder}
        />
      );
      
      const input = screen.getByRole('textbox');
      
      // Input must have at least one form of label
      const hasAnyLabel = hasLabel || hasAriaLabel || placeholder;
      expect(hasAnyLabel).toBe(true);
      
      if (hasLabel) {
        // Input should be findable by visible label
        expect(screen.getByLabelText(label!)).toBe(input);
      }
      
      if (hasAriaLabel) {
        // Input should have aria-label
        expect(input).toHaveAttribute('aria-label', ariaLabel);
      }
      
      if (placeholder) {
        // Input should have placeholder
        expect(input).toHaveAttribute('placeholder', placeholder);
      }
      
      // Input should always be focusable
      expect(input).not.toHaveAttribute('tabindex', '-1');
    }
  );
});