// ErrorContext.tsx - Context for managing global error states
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ErrorToast } from '../components/ErrorToast/ErrorToast';

interface ErrorState {
  id: string;
  message: string;
  dismissible: boolean;
  autoHideDuration?: number;
}

interface ErrorContextType {
  errors: ErrorState[];
  showError: (message: string, options?: { dismissible?: boolean; autoHideDuration?: number }) => void;
  dismissError: (id: string) => void;
  dismissAllErrors: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
  maxErrors?: number;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ 
  children, 
  maxErrors = 3 
}) => {
  const [errors, setErrors] = useState<ErrorState[]>([]);

  const showError = useCallback((
    message: string, 
    options?: { dismissible?: boolean; autoHideDuration?: number }
  ) => {
    const id = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newError: ErrorState = {
      id,
      message,
      dismissible: options?.dismissible ?? true,
      autoHideDuration: options?.autoHideDuration,
    };

    setErrors(prev => {
      const newErrors = [newError, ...prev];
      // Limit the number of displayed errors
      if (newErrors.length > maxErrors) {
        return newErrors.slice(0, maxErrors);
      }
      return newErrors;
    });
  }, [maxErrors]);

  const dismissError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const dismissAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const value: ErrorContextType = {
    errors,
    showError,
    dismissError,
    dismissAllErrors,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
      {/* Render error toasts */}
      {errors.map(error => (
        <ErrorToast
          key={error.id}
          message={error.message}
          dismissible={error.dismissible}
          onDismiss={() => dismissError(error.id)}
          autoHideDuration={error.autoHideDuration}
        />
      ))}
    </ErrorContext.Provider>
  );
};

export const useError = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};