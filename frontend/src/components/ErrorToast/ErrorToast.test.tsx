// ErrorToast.test.tsx - Unit tests for ErrorToast component
import React from 'react';
import { render, screen, waitFor } from '../../test-utils/render-with-providers';
import userEvent from '@testing-library/user-event';
import { ErrorToast } from './ErrorToast';

describe('ErrorToast Component', () => {
  describe('Rendering', () => {
    it('renders error message', () => {
      render(<ErrorToast message="Test error message" />);
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('renders dismiss button by default', () => {
      const onDismiss = jest.fn();
      render(<ErrorToast message="Error" onDismiss={onDismiss} />);
      expect(screen.getByLabelText('Dismiss error')).toBeInTheDocument();
    });

    it('renders dismiss button when dismissible is true', () => {
      const onDismiss = jest.fn();
      render(<ErrorToast message="Error" dismissible={true} onDismiss={onDismiss} />);
      expect(screen.getByLabelText('Dismiss error')).toBeInTheDocument();
    });

    it('does not render dismiss button when dismissible is false', () => {
      render(<ErrorToast message="Error" dismissible={false} />);
      expect(screen.queryByLabelText('Dismiss error')).not.toBeInTheDocument();
    });

    it('does not render dismiss button when onDismiss is not provided', () => {
      render(<ErrorToast message="Error" dismissible={true} />);
      expect(screen.queryByLabelText('Dismiss error')).not.toBeInTheDocument();
    });
  });

  describe('8-bit Styling', () => {
    it('applies dark container variant', () => {
      const { container } = render(<ErrorToast message="Error" />);
      const toast = container.querySelector('.bg-neutral-darkPurple');
      expect(toast).toBeInTheDocument();
    });

    it('applies pink border', () => {
      const { container } = render(<ErrorToast message="Error" />);
      const toast = container.querySelector('.border-accent-pink');
      expect(toast).toBeInTheDocument();
    });

    it('applies pixel font to message', () => {
      render(<ErrorToast message="Error" />);
      const message = screen.getByText('Error');
      expect(message).toHaveClass('font-pixel');
    });

    it('applies pink text color to message', () => {
      render(<ErrorToast message="Error" />);
      const message = screen.getByText('Error');
      expect(message).toHaveClass('text-accent-pink');
    });
  });

  describe('Positioning', () => {
    it('applies fixed positioning', () => {
      const { container } = render(<ErrorToast message="Error" />);
      const toast = container.firstChild as HTMLElement;
      expect(toast).toHaveClass('fixed');
    });

    it('positions at bottom-right', () => {
      const { container } = render(<ErrorToast message="Error" />);
      const toast = container.firstChild as HTMLElement;
      expect(toast).toHaveClass('bottom-4');
      expect(toast).toHaveClass('right-4');
    });

    it('applies z-index for layering', () => {
      const { container } = render(<ErrorToast message="Error" />);
      const toast = container.firstChild as HTMLElement;
      expect(toast).toHaveClass('z-50');
    });
  });

  describe('Dismiss Functionality', () => {
    it('calls onDismiss when dismiss button is clicked', async () => {
      const onDismiss = jest.fn();
      render(<ErrorToast message="Error" onDismiss={onDismiss} />);
      
      const dismissButton = screen.getByLabelText('Dismiss error');
      await userEvent.click(dismissButton);
      
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('dismiss button has correct aria-label', () => {
      const onDismiss = jest.fn();
      render(<ErrorToast message="Error" onDismiss={onDismiss} />);
      
      const dismissButton = screen.getByLabelText('Dismiss error');
      expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss error');
    });
  });

  describe('Auto-hide Functionality', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('calls onDismiss after autoHideDuration', () => {
      const onDismiss = jest.fn();
      render(<ErrorToast message="Error" onDismiss={onDismiss} autoHideDuration={3000} />);
      
      expect(onDismiss).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(3000);
      
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not auto-hide when autoHideDuration is not provided', () => {
      const onDismiss = jest.fn();
      render(<ErrorToast message="Error" onDismiss={onDismiss} />);
      
      jest.advanceTimersByTime(10000);
      
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('does not auto-hide when onDismiss is not provided', () => {
      render(<ErrorToast message="Error" autoHideDuration={3000} />);
      
      jest.advanceTimersByTime(3000);
      
      // Should not throw error
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('clears timeout on unmount', () => {
      const onDismiss = jest.fn();
      const { unmount } = render(
        <ErrorToast message="Error" onDismiss={onDismiss} autoHideDuration={3000} />
      );
      
      unmount();
      jest.advanceTimersByTime(3000);
      
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe('Layout', () => {
    it('arranges message and dismiss button horizontally', () => {
      const onDismiss = jest.fn();
      const { container } = render(<ErrorToast message="Error" onDismiss={onDismiss} />);
      
      const toast = container.firstChild as HTMLElement;
      expect(toast).toHaveClass('flex');
      expect(toast).toHaveClass('items-center');
      expect(toast).toHaveClass('justify-between');
    });

    it('applies gap between message and button', () => {
      const onDismiss = jest.fn();
      const { container } = render(<ErrorToast message="Error" onDismiss={onDismiss} />);
      
      const toast = container.firstChild as HTMLElement;
      expect(toast).toHaveClass('gap-md');
    });

    it('applies max-width constraint', () => {
      const { container } = render(<ErrorToast message="Error" />);
      const toast = container.firstChild as HTMLElement;
      expect(toast).toHaveClass('max-w-md');
    });
  });
});
