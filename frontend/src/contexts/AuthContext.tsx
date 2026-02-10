// Authentication context for managing user authentication state
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../services/api';
import {
  User,
  LoginResponse,
  AuthContextType,
} from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('access_token');
      const storedRefreshToken = localStorage.getItem('refresh_token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          // Verify token is still valid by fetching current user
          const currentUser = await apiClient.getCurrentUser();
          setAccessToken(storedToken);
          setUser(currentUser);
        } catch (error) {
          // Token is invalid, try to refresh
          if (storedRefreshToken) {
            try {
              const response = await apiClient.refreshToken({ refresh_token: storedRefreshToken });
              localStorage.setItem('access_token', response.access_token);
              localStorage.setItem('user', JSON.stringify(response.user));
              setAccessToken(response.access_token);
              setUser(response.user);
            } catch (refreshError) {
              // Refresh failed, clear storage
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('user');
            }
          } else {
            // No refresh token, clear storage
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.login({ email, password });
    return response;
  };

  const loginWith2FA = async (email: string, password: string, totpCode: string): Promise<void> => {
    const response = await apiClient.loginWith2FA({ email, password, totp_code: totpCode });
    
    // Store tokens and user info
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    setAccessToken(response.access_token);
    setUser(response.user);
  };

  const setup2FA = async (email: string, totpCode: string): Promise<void> => {
    const response = await apiClient.setup2FAVerify({ email, totp_code: totpCode });
    
    // Store tokens and user info
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    setAccessToken(response.access_token);
    setUser(response.user);
  };

  const logout = async (): Promise<void> => {
    try {
      await apiClient.logout();
    } catch (error) {
      // Ignore logout errors, clear local state anyway
      console.error('Logout error:', error);
    }
    
    // Clear tokens and user info
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    
    setAccessToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    accessToken,
    login,
    loginWith2FA,
    setup2FA,
    logout,
    isAuthenticated: !!user && !!accessToken,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
