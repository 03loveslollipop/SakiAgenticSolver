// ErrorToast.tsx - Dismissible error toast component with 8-bit styling
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  useEffect(() => {
    if (autoHideDuration && onDismiss) {
      const timer = setTimeout(onDismiss, autoHideDuration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoHideDuration, onDismiss]);

  return (
    <Container
      variant="dark"
      padding="md"
      className="fixed bottom-4 right-4 max-w-md border-accent-pink flex items-center justify-between gap-md z-50"
      role="alert"
      aria-live="assertive"
      aria-label={t('errors.toast.ariaLabel')}
    >
      <span className="font-pixel text-sm text-accent-pink">
        {message}
      </span>
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onDismiss();
            }
          }}
          className="font-pixel text-sm text-white hover:text-accent-pink transition-colors focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:ring-offset-2"
          aria-label={t('errors.toast.dismiss')}
          tabIndex={0}
        >
          X
        </button>
      )}
    </Container>
  );
};
