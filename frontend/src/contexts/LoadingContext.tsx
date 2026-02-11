// LoadingContext.tsx - Context for managing loading states across the application
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface LoadingState {
  [key: string]: boolean;
}

interface LoadingContextType {
  isLoading: (key: string) => boolean;
  startLoading: (key: string) => void;
  stopLoading: (key: string) => void;
  withLoading: <T>(key: string, asyncFn: () => Promise<T>, minDuration?: number) => Promise<T>;
  getLoadingCount: () => number;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});
  const [loadingCount, setLoadingCount] = useState(0);

  const isLoading = useCallback((key: string): boolean => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const startLoading = useCallback((key: string) => {
    setLoadingStates(prev => {
      const newState = { ...prev, [key]: true };
      setLoadingCount(Object.values(newState).filter(Boolean).length);
      return newState;
    });
  }, []);

  const stopLoading = useCallback((key: string) => {
    setLoadingStates(prev => {
      const newState = { ...prev, [key]: false };
      setLoadingCount(Object.values(newState).filter(Boolean).length);
      return newState;
    });
  }, []);

  const withLoading = useCallback(async <T,>(
    key: string,
    asyncFn: () => Promise<T>,
    minDuration: number = 300
  ): Promise<T> => {
    const startTime = Date.now();
    startLoading(key);
    
    try {
      const result = await asyncFn();
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, minDuration - elapsed);
      
      // Ensure loading indicator shows for at least minDuration
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      return result;
    } finally {
      stopLoading(key);
    }
  }, [startLoading, stopLoading]);

  const getLoadingCount = useCallback(() => {
    return loadingCount;
  }, [loadingCount]);

  const value: LoadingContextType = {
    isLoading,
    startLoading,
    stopLoading,
    withLoading,
    getLoadingCount,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};