// ErrorToast.tsx - Dismissible error toast component with 8-bit styling
import React, { useEffect } from 'react';
import { Container } from '../Container';

export interface ErrorToastProps {
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  autoHideDuration?: number;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({
  message,
  dismissible = true,
  onDismiss,
  autoHideDuration,
}) => {
  useEffect(() => {
    if (autoHideDuration && onDismiss) {
      const timer = setTimeout(onDismiss, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [autoHideDuration, onDismiss]);
  
  return (
    <Container
      variant="dark"
      padding="md"
      className="fixed bottom-4 right-4 max-w-md border-accent-pink flex items-center justify-between gap-md z-50"
    >
      <span className="font-pixel text-sm text-accent-pink">
        {message}
      </span>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className="font-pixel text-sm text-white hover:text-accent-pink transition-colors"
          aria-label="Dismiss error"
        >
          ✕
        </button>
      )}
    </Container>
  );
};
