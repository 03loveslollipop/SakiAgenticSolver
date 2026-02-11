// useTheme.ts - Hook for accessing theme values
import { useContext } from 'react';
import { ThemeContext } from './ThemeProvider';
import { Theme } from './theme';

export const useTheme = (): Theme => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
