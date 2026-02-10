// API client service for backend communication
import axios, { AxiosInstance, AxiosError } from 'axios';
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

// Configure base URL based on environment
// If VITE_DEV is true, use localhost, otherwise use production URL
const isDev = import.meta.env.VITE_DEV === 'true';
const BASE_URL = isDev 
  ? 'http://localhost:8000' 
  : (import.meta.env.VITE_API_BASE_URL || 'https://api.saki.02labs.me');

console.log(`API Client initialized in ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'} mode`);
console.log(`API Base URL: ${BASE_URL}`);

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          // Server responded with error status
          const message = (error.response.data as any)?.detail || error.message;
          throw new Error(message);
        } else if (error.request) {
          // Request made but no response
          throw new Error('No response from server. Please check your connection.');
        } else {
          // Error setting up request
          throw new Error(error.message);
        }
      }
    );
  }

  // Session endpoints
  async createSession(request: VMCreationRequest): Promise<Session> {
    const response = await this.client.post<Session>('/api/sessions', request);
    return response.data;
  }

  async getSessions(): Promise<Session[]> {
    const response = await this.client.get<Session[]>('/api/sessions');
    return response.data;
  }

  async getSession(sessionId: string): Promise<Session> {
    const response = await this.client.get<Session>(`/api/sessions/${sessionId}`);
    return response.data;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.delete(`/api/sessions/${sessionId}`);
  }

  // SSH endpoints
  async getSSHInfo(sessionId: string): Promise<SSHConnectionInfo> {
    const response = await this.client.get<SSHConnectionInfo>(
      `/api/sessions/${sessionId}/ssh`
    );
    return response.data;
  }

  async downloadSSHKey(sessionId: string): Promise<Blob> {
    const response = await this.client.get(`/api/sessions/${sessionId}/ssh-key`, {
      responseType: 'blob',
    });
    return response.data;
  }

  // File content endpoints
  async getAgentMd(sessionId: string): Promise<string> {
    const response = await this.client.get<{ content: string }>(
      `/api/sessions/${sessionId}/agent-md`
    );
    return response.data.content;
  }

  async updateAgentMd(sessionId: string, content: string): Promise<void> {
    await this.client.put(`/api/sessions/${sessionId}/agent-md`, { content });
  }

  async getBasePrompt(sessionId: string): Promise<string> {
    const response = await this.client.get<{ content: string }>(
      `/api/sessions/${sessionId}/base-prompt`
    );
    return response.data.content;
  }

  async getToolsMd(sessionId: string): Promise<string> {
    const response = await this.client.get<{ content: string }>(
      `/api/sessions/${sessionId}/tools-md`
    );
    return response.data.content;
  }

  async getChangelog(sessionId: string): Promise<string> {
    const response = await this.client.get<{ content: string }>(
      `/api/sessions/${sessionId}/changelog`
    );
    return response.data.content;
  }

  async getDiscoveries(sessionId: string): Promise<string> {
    const response = await this.client.get<{ content: string }>(
      `/api/sessions/${sessionId}/discoveries`
    );
    return response.data.content;
  }

  // Writeup endpoints
  async uploadWriteup(
    sessionId: string,
    content: string,
    category?: string,
    technologies?: string[]
  ): Promise<{ id: string; message: string }> {
    const response = await this.client.post<{ id: string; message: string }>(
      `/api/sessions/${sessionId}/writeup`,
      { content, category, technologies }
    );
    return response.data;
  }

  async getWriteups(skip: number = 0, limit: number = 20, category?: string): Promise<Writeup[]> {
    const params: any = { skip, limit };
    if (category) {
      params.category = category;
    }
    const response = await this.client.get<Writeup[]>('/api/writeups', { params });
    return response.data;
  }

  async getWriteup(sessionId: string): Promise<Writeup> {
    const response = await this.client.get<Writeup>(`/api/writeups/${sessionId}`);
    return response.data;
  }

  async searchWriteups(params: WriteupSearchParams): Promise<Writeup[]> {
    const response = await this.client.get<Writeup[]>('/api/writeups/search', {
      params,
    });
    return response.data;
  }

  // WebSocket URL for terminal
  getTerminalWebSocketURL(sessionId: string): string {
    const wsProtocol = BASE_URL.startsWith('https') ? 'wss' : 'ws';
    const wsBaseURL = BASE_URL.replace(/^https?/, wsProtocol);
    return `${wsBaseURL}/api/sessions/${sessionId}/terminal`;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  // Authentication endpoints
  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/api/auth/login', request);
    return response.data;
  }

  async loginWith2FA(request: TwoFAVerifyRequest): Promise<TokenResponse> {
    const response = await this.client.post<TokenResponse>('/api/auth/login/2fa', request);
    return response.data;
  }

  async setup2FAVerify(request: TwoFASetupVerifyRequest): Promise<TokenResponse> {
    const response = await this.client.post<TokenResponse>('/api/auth/setup-2fa/verify', request);
    return response.data;
  }

  async refreshToken(request: RefreshTokenRequest): Promise<TokenResponse> {
    const response = await this.client.post<TokenResponse>('/api/auth/refresh', request);
    return response.data;
  }

  async logout(): Promise<void> {
    await this.client.post('/api/auth/logout');
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/api/auth/me');
    return response.data;
  }

  // User management endpoints (admin only)
  async createUser(request: { email: string; role: UserRole }): Promise<{ user: any; message: string }> {
    const response = await this.client.post<{ user: any; message: string }>('/api/users', request);
    return response.data;
  }

  async getUsers(): Promise<{ users: any[]; total: number }> {
    const response = await this.client.get<{ users: any[]; total: number }>('/api/users');
    return response.data;
  }

  async getUser(userId: string): Promise<any> {
    const response = await this.client.get<any>(`/api/users/${userId}`);
    return response.data;
  }

  async updateUser(userId: string, updates: { role?: UserRole; is_active?: boolean }): Promise<any> {
    const response = await this.client.put<any>(`/api/users/${userId}`, updates);
    return response.data;
  }

  async disableUser(userId: string): Promise<{ message: string }> {
    const response = await this.client.delete<{ message: string }>(`/api/users/${userId}`);
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new APIClient();
export default apiClient;
