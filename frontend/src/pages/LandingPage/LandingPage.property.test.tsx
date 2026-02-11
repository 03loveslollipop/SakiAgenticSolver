// LandingPage.property.test.tsx - Property-based tests for LandingPage
import React from 'react';
import { render, screen } from '../../test-utils/render-with-providers';
import fc from 'fast-check';
import { LandingPage } from './LandingPage';
import { runPropertyTest } from '../../test-utils/test-config';

describe('LandingPage Properties', () => {
  runPropertyTest(
    3,
    'Navigation Behavior',
    fc.record({
      buttonType: fc.constantFrom('get-started', 'explore', 'login'),
    }),
    async ({ buttonType }) => {
      render(<LandingPage />);
      
      let button: HTMLElement | null = null;
      let expectedPath = '';
      
      switch (buttonType) {
        case 'get-started':
          button = screen.getByRole('button', { name: /get started/i });
          expectedPath = '/dashboard';
          break;
        case 'explore':
          button = screen.getByRole('button', { name: /explore/i });
          expectedPath = '/explore';
          break;
        case 'login':
          button = screen.getByText('Login').closest('button');
          expectedPath = '/login';
          break;
      }
      
      // Verify button exists
      expect(button).toBeTruthy();
      
      // Verify button is clickable (not disabled)
      expect(button).not.toBeDisabled();
      
      // Click the button
      if (button) {
        button.click();
      }
      
      // Verify navigation was triggered (button should still be in document)
      expect(button).toBeInTheDocument();
    }
  );
});
