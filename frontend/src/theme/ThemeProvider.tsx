// ThemeProvider.tsx - React Context Provider for 8-bit Theme
import React, { createContext, ReactNode } from 'react';
import { theme, Theme } from './theme';

export const ThemeContext = createContext<Theme | undefined>(undefined);

export interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};
