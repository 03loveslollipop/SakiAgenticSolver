// Navigation.property.test.tsx - Property-based tests for Navigation component
import React from 'react';
import { render } from '../../test-utils/render-with-providers';
import fc from 'fast-check';
import { Navigation, NavigationItem } from './Navigation';
import { runPropertyTest } from '../../test-utils/test-config';

describe('Navigation Component Properties', () => {
  runPropertyTest(
    14,
    'Logo Placeholder Fallback',
    fc.record({
      hasLogo: fc.boolean(),
      logoText: fc.string({ minLength: 1, maxLength: 20 }),
    }),
    ({ hasLogo, logoText }) => {
      const logo = hasLogo ? <div data-testid="custom-logo">{logoText}</div> : undefined;
      const { container } = render(<Navigation logo={logo} />);
      
      if (hasLogo) {
        // When logo prop is provided, actual logo should be displayed
        const customLogo = container.querySelector('[data-testid="custom-logo"]');
        expect(customLogo).toBeTruthy();
        expect(customLogo?.textContent).toBe(logoText);
        
        // Placeholder should not be displayed
        const placeholderSvg = container.querySelector('svg');
        expect(placeholderSvg).toBeFalsy();
      } else {
        // When no logo prop is provided, placeholder SVG should be displayed
        const placeholderSvg = container.querySelector('svg');
        expect(placeholderSvg).toBeTruthy();
        expect(placeholderSvg?.getAttribute('width')).toBe('40');
        expect(placeholderSvg?.getAttribute('height')).toBe('40');
        
        // Custom logo should not be displayed
        const customLogo = container.querySelector('[data-testid="custom-logo"]');
        expect(customLogo).toBeFalsy();
      }
    }
  );
});


describe('Navigation Back Button Properties', () => {
  runPropertyTest(
    15,
    'Conditional Back Button Display',
    fc.record({
      showBackButton: fc.boolean(),
      path: fc.string({ minLength: 1, maxLength: 30 }).map(s => `/${s}`),
    }),
    ({ showBackButton, path }) => {
      // Set the current route
      window.history.pushState({}, 'Test', path);
      
      const { container } = render(<Navigation showBackButton={showBackButton} />);
      const backButton = container.querySelector('[aria-label="Go back"]');
      
      const isRootPath = path === '/';
      const shouldShowButton = showBackButton && !isRootPath;
      
      if (shouldShowButton) {
        // Back button should be displayed
        expect(backButton).toBeTruthy();
        expect(backButton?.textContent).toContain('←');
      } else {
        // Back button should not be displayed
        expect(backButton).toBeFalsy();
      }
    }
  );
});
