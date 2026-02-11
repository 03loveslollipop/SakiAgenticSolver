// apiWithLoading.ts - Enhanced API client with automatic loading state management
import { apiClient } from './api';
import { useLoading } from '../contexts/LoadingContext';
import { useError } from '../contexts/ErrorContext';
import {
  Session,
  VMCreationRequest,
  SSHConnectionInfo,
  Writeup,
  WriteupSearchParams,
  LoginRequest,
  LoginResponse,
  TwoFAVerifyRequest,
  TwoFASetupVerifyRequest,
  TokenResponse,
  RefreshTokenRequest,
  User,
  UserRole,
} from '../types';

// Hook to get API client with loading state management
export const useApiWithLoading = () => {
  const { withLoading } = useLoading();

  return {
    // Session endpoints
    createSession: (request: VMCreationRequest): Promise<Session> => 
      withLoading('createSession', () => apiClient.createSession(request)),
    
    getSessions: (): Promise<Session[]> => 
      withLoading('getSessions', () => apiClient.getSessions()),
    
    getSession: (sessionId: string): Promise<Session> => 
      withLoading(`getSession:${sessionId}`, () => apiClient.getSession(sessionId)),
    
    deleteSession: (sessionId: string): Promise<void> => 
      withLoading(`deleteSession:${sessionId}`, () => apiClient.deleteSession(sessionId)),

    // SSH endpoints
    getSSHInfo: (sessionId: string): Promise<SSHConnectionInfo> => 
      withLoading(`getSSHInfo:${sessionId}`, () => apiClient.getSSHInfo(sessionId)),
    
    downloadSSHKey: (sessionId: string): Promise<Blob> => 
      withLoading(`downloadSSHKey:${sessionId}`, () => apiClient.downloadSSHKey(sessionId)),

    // File content endpoints
    getAgentMd: (sessionId: string): Promise<string> => 
      withLoading(`getAgentMd:${sessionId}`, () => apiClient.getAgentMd(sessionId)),
    
    updateAgentMd: (sessionId: string, content: string): Promise<void> => 
      withLoading(`updateAgentMd:${sessionId}`, () => apiClient.updateAgentMd(sessionId, content)),
    
    getBasePrompt: (sessionId: string): Promise<string> => 
      withLoading(`getBasePrompt:${sessionId}`, () => apiClient.getBasePrompt(sessionId)),
    
    getToolsMd: (sessionId: string): Promise<string> => 
      withLoading(`getToolsMd:${sessionId}`, () => apiClient.getToolsMd(sessionId)),
    
    getChangelog: (sessionId: string): Promise<string> => 
      withLoading(`getChangelog:${sessionId}`, () => apiClient.getChangelog(sessionId)),
    
    getDiscoveries: (sessionId: string): Promise<string> => 
      withLoading(`getDiscoveries:${sessionId}`, () => apiClient.getDiscoveries(sessionId)),

    // Writeup endpoints
    uploadWriteup: (
      sessionId: string,
      content: string,
      category?: string,
      technologies?: string[]
    ): Promise<{ id: string; message: string }> => 
      withLoading(`uploadWriteup:${sessionId}`, () => apiClient.uploadWriteup(sessionId, content, category, technologies)),
    
    getWriteups: (skip: number = 0, limit: number = 20, category?: string): Promise<Writeup[]> => 
      withLoading('getWriteups', () => apiClient.getWriteups(skip, limit, category)),
    
    getWriteup: (sessionId: string): Promise<Writeup> => 
      withLoading(`getWriteup:${sessionId}`, () => apiClient.getWriteup(sessionId)),
    
    searchWriteups: (params: WriteupSearchParams): Promise<Writeup[]> => 
      withLoading('searchWriteups', () => apiClient.searchWriteups(params)),

    // WebSocket URL for terminal
    getTerminalWebSocketURL: (sessionId: string): string => 
      apiClient.getTerminalWebSocketURL(sessionId),

    // Health check
    healthCheck: (): Promise<boolean> => 
      withLoading('healthCheck', () => apiClient.healthCheck()),

    // Authentication endpoints
    login: (request: LoginRequest): Promise<LoginResponse> => 
      withLoading('login', () => apiClient.login(request)),
    
    loginWith2FA: (request: TwoFAVerifyRequest): Promise<TokenResponse> => 
      withLoading('loginWith2FA', () => apiClient.loginWith2FA(request)),
    
    setup2FAVerify: (request: TwoFASetupVerifyRequest): Promise<TokenResponse> => 
      withLoading('setup2FAVerify', () => apiClient.setup2FAVerify(request)),
    
    refreshToken: (request: RefreshTokenRequest): Promise<TokenResponse> => 
      withLoading('refreshToken', () => apiClient.refreshToken(request)),
    
    logout: (): Promise<void> => 
      withLoading('logout', () => apiClient.logout()),
    
    getCurrentUser: (): Promise<User> => 
      withLoading('getCurrentUser', () => apiClient.getCurrentUser()),

    // User management endpoints (admin only)
    createUser: (request: { email: string; role: UserRole }): Promise<{ user: any; message: string }> => 
      withLoading('createUser', () => apiClient.createUser(request)),
    
    getUsers: (): Promise<{ users: any[]; total: number }> => 
      withLoading('getUsers', () => apiClient.getUsers()),
    
    getUser: (userId: string): Promise<any> => 
      withLoading(`getUser:${userId}`, () => apiClient.getUser(userId)),
    
    updateUser: (userId: string, updates: { role?: UserRole; is_active?: boolean }): Promise<any> => 
      withLoading(`updateUser:${userId}`, () => apiClient.updateUser(userId, updates)),
    
    disableUser: (userId: string): Promise<{ message: string }> => 
      withLoading(`disableUser:${userId}`, () => apiClient.disableUser(userId)),
  };
};

// Hook to get API client with loading state and error handling
export const useApiWithLoadingAndError = () => {
  const { withLoading } = useLoading();
  const { showError } = useError();

  const handleApiCall = async <T,>(
    key: string,
    apiCall: () => Promise<T>,
    errorMessage?: string
  ): Promise<T> => {
    try {
      return await withLoading(key, apiCall);
    } catch (error) {
      const message = errorMessage || (error instanceof Error ? error.message : 'An unexpected error occurred');
      showError(message, { autoHideDuration: 5000 });
      throw error;
    }
  };

  return {
    // Session endpoints
    createSession: (request: VMCreationRequest): Promise<Session> => 
      handleApiCall('createSession', () => apiClient.createSession(request), 'Failed to create session'),
    
    getSessions: (): Promise<Session[]> => 
      handleApiCall('getSessions', () => apiClient.getSessions(), 'Failed to load sessions'),
    
    getSession: (sessionId: string): Promise<Session> => 
      handleApiCall(`getSession:${sessionId}`, () => apiClient.getSession(sessionId), 'Failed to load session'),
    
    deleteSession: (sessionId: string): Promise<void> => 
      handleApiCall(`deleteSession:${sessionId}`, () => apiClient.deleteSession(sessionId), 'Failed to delete session'),

    // SSH endpoints
    getSSHInfo: (sessionId: string): Promise<SSHConnectionInfo> => 
      handleApiCall(`getSSHInfo:${sessionId}`, () => apiClient.getSSHInfo(sessionId), 'Failed to load SSH info'),
    
    downloadSSHKey: (sessionId: string): Promise<Blob> => 
      handleApiCall(`downloadSSHKey:${sessionId}`, () => apiClient.downloadSSHKey(sessionId), 'Failed to download SSH key'),

    // File content endpoints
    getAgentMd: (sessionId: string): Promise<string> => 
      handleApiCall(`getAgentMd:${sessionId}`, () => apiClient.getAgentMd(sessionId), 'Failed to load agent documentation'),
    
    updateAgentMd: (sessionId: string, content: string): Promise<void> => 
      handleApiCall(`updateAgentMd:${sessionId}`, () => apiClient.updateAgentMd(sessionId, content), 'Failed to update agent documentation'),
    
    getBasePrompt: (sessionId: string): Promise<string> => 
      handleApiCall(`getBasePrompt:${sessionId}`, () => apiClient.getBasePrompt(sessionId), 'Failed to load base prompt'),
    
    getToolsMd: (sessionId: string): Promise<string> => 
      handleApiCall(`getToolsMd:${sessionId}`, () => apiClient.getToolsMd(sessionId), 'Failed to load tools documentation'),
    
    getChangelog: (sessionId: string): Promise<string> => 
      handleApiCall(`getChangelog:${sessionId}`, () => apiClient.getChangelog(sessionId), 'Failed to load changelog'),
    
    getDiscoveries: (sessionId: string): Promise<string> => 
      handleApiCall(`getDiscoveries:${sessionId}`, () => apiClient.getDiscoveries(sessionId), 'Failed to load discoveries'),

    // Writeup endpoints
    uploadWriteup: (
      sessionId: string,
      content: string,
      category?: string,
      technologies?: string[]
    ): Promise<{ id: string; message: string }> => 
      handleApiCall(`uploadWriteup:${sessionId}`, () => apiClient.uploadWriteup(sessionId, content, category, technologies), 'Failed to upload writeup'),
    
    getWriteups: (skip: number = 0, limit: number = 20, category?: string): Promise<Writeup[]> => 
      handleApiCall('getWriteups', () => apiClient.getWriteups(skip, limit, category), 'Failed to load writeups'),
    
    getWriteup: (sessionId: string): Promise<Writeup> => 
      handleApiCall(`getWriteup:${sessionId}`, () => apiClient.getWriteup(sessionId), 'Failed to load writeup'),
    
    searchWriteups: (params: WriteupSearchParams): Promise<Writeup[]> => 
      handleApiCall('searchWriteups', () => apiClient.searchWriteups(params), 'Failed to search writeups'),

    // WebSocket URL for terminal
    getTerminalWebSocketURL: (sessionId: string): string => 
      apiClient.getTerminalWebSocketURL(sessionId),

    // Health check
    healthCheck: (): Promise<boolean> => 
      handleApiCall('healthCheck', () => apiClient.healthCheck(), 'Health check failed'),

    // Authentication endpoints
    login: (request: LoginRequest): Promise<LoginResponse> => 
      handleApiCall('login', () => apiClient.login(request), 'Login failed'),
    
    loginWith2FA: (request: TwoFAVerifyRequest): Promise<TokenResponse> => 
      handleApiCall('loginWith2FA', () => apiClient.loginWith2FA(request), '2FA verification failed'),
    
    setup2FAVerify: (request: TwoFASetupVerifyRequest): Promise<TokenResponse> => 
      handleApiCall('setup2FAVerify', () => apiClient.setup2FAVerify(request), '2FA setup failed'),
    
    refreshToken: (request: RefreshTokenRequest): Promise<TokenResponse> => 
      handleApiCall('refreshToken', () => apiClient.refreshToken(request), 'Token refresh failed'),
    
    logout: (): Promise<void> => 
      handleApiCall('logout', () => apiClient.logout(), 'Logout failed'),
    
    getCurrentUser: (): Promise<User> => 
      handleApiCall('getCurrentUser', () => apiClient.getCurrentUser(), 'Failed to load user info'),

    // User management endpoints (admin only)
    createUser: (request: { email: string; role: UserRole }): Promise<{ user: any; message: string }> => 
      handleApiCall('createUser', () => apiClient.createUser(request), 'Failed to create user'),
    
    getUsers: (): Promise<{ users: any[]; total: number }> => 
      handleApiCall('getUsers', () => apiClient.getUsers(), 'Failed to load users'),
    
    getUser: (userId: string): Promise<any> => 
      handleApiCall(`getUser:${userId}`, () => apiClient.getUser(userId), 'Failed to load user'),
    
    updateUser: (userId: string, updates: { role?: UserRole; is_active?: boolean }): Promise<any> => 
      handleApiCall(`updateUser:${userId}`, () => apiClient.updateUser(userId, updates), 'Failed to update user'),
    
    disableUser: (userId: string): Promise<{ message: string }> => 
      handleApiCall(`disableUser:${userId}`, () => apiClient.disableUser(userId), 'Failed to disable user'),
  };
};