// Button.property.test.tsx - Property-based tests for Button component
import React from 'react';
import { render } from '../../test-utils/render-with-providers';
import fc from 'fast-check';
import { Button, ButtonVariant } from './Button';
import { runPropertyTest } from '../../test-utils/test-config';

describe('Button Component Properties', () => {
  runPropertyTest(
    2,
    'Component Styling Consistency',
    fc.record({
      variant: fc.constantFrom<ButtonVariant>('normal', 'primary', 'success', 'warning', 'error'),
      text: fc.string({ minLength: 1, maxLength: 50 }),
    }),
    ({ variant, text }) => {
      const { container } = render(<Button variant={variant}>{text}</Button>);
      const button = container.querySelector('button');
      
      // Verify 8-bit styling is applied
      expect(button).toHaveClass('font-pixel');
      expect(button).toHaveClass('border-4');
      expect(button).toHaveClass('border-solid');
      
      // Verify button contains the text
      expect(button?.textContent).toBe(text);
      
      // Verify variant-specific classes are applied
      const hasVariantClass = 
        (variant === 'normal' && button?.classList.contains('bg-neutral-olive')) ||
        (variant === 'primary' && button?.classList.contains('bg-primary-yellow')) ||
        (variant === 'success' && button?.classList.contains('bg-accent-cyan')) ||
        (variant === 'warning' && button?.classList.contains('bg-primary-yellow')) ||
        (variant === 'error' && button?.classList.contains('bg-accent-pink'));
      
      expect(hasVariantClass).toBe(true);
    }
  );
});
