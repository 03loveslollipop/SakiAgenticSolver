// ErrorBoundary.test.tsx - Unit tests for ErrorBoundary component
import React from 'react';
import { render, screen } from '../../test-utils/render-with-providers';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './ErrorBoundary';

const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary Component', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  describe('Normal Operation', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('does not show error UI when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );
      
      expect(screen.queryByText('Oops! Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('catches errors from child components', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    });

    it('displays error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('displays default message when error has no message', () => {
      const ThrowErrorNoMessage: React.FC = () => {
        throw new Error();
      };
      
      render(
        <ErrorBoundary>
          <ThrowErrorNoMessage />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
    });
  });

  describe('8-bit Styling', () => {
    it('applies dark container variant', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      const errorContainer = container.querySelector('.bg-neutral-darkPurple');
      expect(errorContainer).toBeInTheDocument();
    });

    it('applies pixel font to error message', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      const heading = screen.getByText('Oops! Something went wrong');
      expect(heading).toHaveClass('font-pixel');
    });

    it('applies pink color to error heading', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      const heading = screen.getByText('Oops! Something went wrong');
      expect(heading).toHaveClass('text-accent-pink');
    });
  });

  describe('Try Again Button', () => {
    it('renders try again button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('resets error state when try again is clicked', async () => {
      let shouldThrow = true;
      
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      
      // Change the component to not throw
      shouldThrow = false;
      
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await userEvent.click(tryAgainButton);
      
      // Re-render with non-throwing component
      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      const customFallback = <div>Custom error UI</div>;
      
      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
      expect(screen.queryByText('Oops! Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('Error Logging', () => {
    it('logs error to console', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
