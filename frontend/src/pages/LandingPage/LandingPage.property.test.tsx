// LandingPage.property.test.tsx - Property-based tests for LandingPage
import React from 'react';
import { render, screen } from '../../test-utils/render-with-providers';
import fc from 'fast-check';
import { LandingPage } from './LandingPage';
import { runPropertyTest } from '../../test-utils/test-config';

describe('LandingPage Properties', () => {
  runPropertyTest(
    3,
    'CTA Buttons Are Enabled',
    fc.record({
      cta: fc.constantFrom<'login' | 'features'>('login', 'features'),
    }),
    ({ cta }) => {
      // jsdom doesn't implement this; LandingPage uses it for the Features CTA.
      if (!HTMLElement.prototype.scrollIntoView) {
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
          value: jest.fn(),
          configurable: true,
          writable: true,
        });
      }

      const scrollSpy = jest.spyOn(HTMLElement.prototype, 'scrollIntoView');

      render(<LandingPage />);

      if (cta === 'login') {
        const loginButtons = screen.getAllByRole('button', { name: /login/i });
        const button = loginButtons[0];
        expect(button).toBeTruthy();
        expect(button).not.toBeDisabled();
        button.click();
      } else {
        const button = screen.getByRole('button', { name: /^features$/i });
        expect(button).not.toBeDisabled();
        button.click();
        expect(scrollSpy).toHaveBeenCalled();
      }

      scrollSpy.mockRestore();
    }
  );
});
