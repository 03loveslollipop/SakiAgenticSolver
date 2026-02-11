// Input.property.test.tsx - Property-based tests for Input component
import React from 'react';
import { render } from '../../test-utils/render-with-providers';
import fc from 'fast-check';
import { Input } from './Input';
import { runPropertyTest } from '../../test-utils/test-config';

describe('Input Component Properties', () => {
  runPropertyTest(
    9,
    'Form Validation Feedback',
    fc.record({
      label: fc.string({ minLength: 1, maxLength: 30 }),
      error: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
      value: fc.string({ maxLength: 100 }),
    }),
    ({ label, error, value }) => {
      const { container } = render(
        <Input label={label} error={error} value={value} readOnly />
      );
      
      const input = container.querySelector('input');
      const errorElement = container.querySelector('[role="alert"]');
      
      // Verify input exists
      expect(input).toBeTruthy();
      
      // When validation fails (error is present)
      if (error) {
        // Input should be highlighted with Error styling
        expect(input).toHaveClass('border-accent-pink');
        
        // Error message should be displayed
        expect(errorElement).toBeTruthy();
        expect(errorElement?.textContent).toBe(error);
        expect(errorElement).toHaveClass('text-accent-pink');
      } else {
        // When validation passes (no error)
        // Error styling should be removed
        expect(input).not.toHaveClass('border-accent-pink');
        expect(input).toHaveClass('border-neutral-teal');
        
        // No error message should be displayed
        expect(errorElement).toBeFalsy();
      }
    }
  );
});
