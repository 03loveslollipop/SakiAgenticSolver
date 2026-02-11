// ErrorToast.property.test.tsx - Property-based tests for ErrorToast component
import React from 'react';
import { render } from '../../test-utils/render-with-providers';
import fc from 'fast-check';
import { ErrorToast } from './ErrorToast';
import { runPropertyTest } from '../../test-utils/test-config';

describe('ErrorToast Component Properties', () => {
  runPropertyTest(
    8,
    'Error Message Display',
    fc.record({
      message: fc.string({ minLength: 1, maxLength: 100 }),
      errorType: fc.constantFrom('authentication', 'network', 'validation', 'vm-creation'),
    }),
    ({ message, errorType }) => {
      const { container } = render(<ErrorToast message={message} />);
      
      // Verify error message is displayed
      const messageElement = container.querySelector('.text-accent-pink');
      expect(messageElement).toBeTruthy();
      expect(messageElement?.textContent).toBe(message);
      
      // Verify Error variant styling is applied
      const toast = container.querySelector('.border-accent-pink');
      expect(toast).toBeTruthy();
      
      // Verify dark background (error styling)
      const darkContainer = container.querySelector('.bg-neutral-darkPurple');
      expect(darkContainer).toBeTruthy();
      
      // Verify pixel font is applied
      expect(messageElement).toHaveClass('font-pixel');
    }
  );
});


describe('ErrorToast Dismissible Properties', () => {
  runPropertyTest(
    10,
    'Dismissible Error Handling',
    fc.record({
      message: fc.string({ minLength: 1, maxLength: 100 }),
      dismissible: fc.boolean(),
    }),
    async ({ message, dismissible }) => {
      const onDismiss = jest.fn();
      const { container, unmount } = render(
        <ErrorToast message={message} dismissible={dismissible} onDismiss={onDismiss} />
      );
      
      const closeButton = container.querySelector('[aria-label="Dismiss error"]');
      
      if (dismissible) {
        // When dismissible, close button should be present
        expect(closeButton).toBeTruthy();
        
        // Clicking close button should call onDismiss
        if (closeButton) {
          closeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          expect(onDismiss).toHaveBeenCalledTimes(1);
        }
      } else {
        // When not dismissible, close button should not be present
        expect(closeButton).toBeFalsy();
      }
      
      unmount();
    }
  );
});
