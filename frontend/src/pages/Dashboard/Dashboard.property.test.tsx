// Dashboard.property.test.tsx - Property-based tests for Dashboard
import React from 'react';
import { render } from '../../test-utils/render-with-providers';
import fc from 'fast-check';
import { Dashboard } from './Dashboard';
import { runPropertyTest } from '../../test-utils/test-config';

jest.mock('../../services/api', () => ({
  apiClient: {
    getCurrentUser: jest.fn().mockRejectedValue(new Error('Not authenticated')),
    getSessions: jest.fn().mockResolvedValue([]),
    deleteSession: jest.fn().mockResolvedValue(undefined),
  },
  default: {
    getCurrentUser: jest.fn().mockRejectedValue(new Error('Not authenticated')),
    getSessions: jest.fn().mockResolvedValue([]),
    deleteSession: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Dashboard Properties', () => {
  runPropertyTest(
    11,
    'Sidebar Responsive Behavior',
    fc.integer({ min: 320, max: 2560 }),
    (width) => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
      });
      
      window.dispatchEvent(new Event('resize'));
      
      const { container } = render(<Dashboard />);
      
      const isMobile = width < 768;
      const isDesktop = width >= 768;
      
      if (isDesktop) {
        // On desktop, sidebar should be visible as full vertical navigation
        const sidebar = container.querySelector('aside');
        expect(sidebar).toBeTruthy();
        expect(sidebar).toHaveClass('h-screen');
        
        // Mobile hamburger menu should not be visible
        const hamburger = container.querySelector('[aria-label="Open navigation menu"]');
        expect(hamburger).toBeFalsy();
      } else {
        // On mobile, sidebar should be hidden by default
        const sidebar = container.querySelector('aside');
        expect(sidebar).toBeFalsy();
        
        // Mobile hamburger menu should be visible
        const hamburger = container.querySelector('[aria-label="Open navigation menu"]');
        expect(hamburger).toBeTruthy();
      }
      
      // All navigation items should be accessible in both states
      // (either in sidebar or in mobile menu when opened)
      const dashboardText = container.textContent;
      expect(dashboardText).toContain('Dashboard');
    }
  );
});
