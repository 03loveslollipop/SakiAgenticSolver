// API client service for backend communication
import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  Session,
  SessionDeploymentStatus,
  SSHConnectionInfo,
  TokenResponse,
  TwoFASetupVerifyRequest,
  TwoFAVerifyRequest,
  User,
  UserRole,
  VMCreationRequest,
  Writeup,
  WriteupSearchParams,
} from '../types';

// Always use production API for all frontend environments.
const BASE_URL = 'https://api.saki.02labs.me';

console.log('API Client initialized in PRODUCTION mode');
console.log(`API Base URL: ${BASE_URL}`);

interface RawSession {
  id: string;
  name?: string;
  vm_size?: Session['vmSize'];
  agent_type?: Session['agentType'];
  agent_model?: string;
  setup_mode?: Session['setupMode'];
  challenge_urls?: string[];
  instructions?: string;
  created_at?: string;
  status?: Session['status'];
  vm_ip?: string;
  ssh_username?: string;
  ssh_port?: number;
  resource_group?: string;
  error_message?: string;
  task_id?: string;
  deployment_progress?: number;
  current_step?: string;
  estimated_completion?: string;
  estimated_remaining_time?: string;
  last_status_update?: string;
}

interface RawAsyncSessionCreateResponse {
  task_id: string;
  session_id: string;
  status: string;
  estimated_completion_time?: string;
  status_url?: string;
}

interface RawSessionStatus {
  session_id: string;
  task_id?: string;
  status?: string;
  progress?: number;
  current_step?: string;
  vm_ip?: string;
  estimated_completion?: string;
  estimated_remaining_time?: string;
  error_details?: {
    message?: string;
  } | null;
  last_updated?: string;
}

interface RawWriteup {
  id?: string;
  session_id: string;
  challenge_urls?: string[];
  challenge_type?: Writeup['category'];
  content?: string;
  content_preview?: string;
  completion_timestamp?: string;
  agent_type?: Writeup['agentType'];
  agent_model?: string;
  technologies?: string[];
}

interface RawWriteupListResponse {
  writeups?: RawWriteup[];
}

interface RawTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: Partial<User> & {
    user_id?: string;
  };
}

class APIClient {
  private client: AxiosInstance;
  private refreshTokenPromise: Promise<string | null> | null = null;
  private readonly tokenRefreshSkewSeconds = 30;

  private decodeJwtPayload(token: string): { exp?: number } | null {
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length < 2) {
        return null;
      }

      const normalizedPayload = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = normalizedPayload.padEnd(
        normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
        '='
      );
      const decodeBase64 = globalThis.atob;
      if (typeof decodeBase64 !== 'function') {
        return null;
      }

      const decodedPayload = decodeBase64(paddedPayload);
      const parsedPayload = JSON.parse(decodedPayload) as { exp?: number };
      return parsedPayload;
    } catch {
      return null;
    }
  }

  private isTokenCloseToExpiry(token: string): boolean {
    const payload = this.decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== 'number') {
      return false;
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    return nowInSeconds >= payload.exp - this.tokenRefreshSkewSeconds;
  }

  private async performTokenRefresh(): Promise<string | null> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await this.client.post<RawTokenResponse>('/api/auth/refresh', {
        refresh_token: refreshToken,
      });
      const tokenResponse = this.mapTokenResponse(response.data);

      localStorage.setItem('access_token', tokenResponse.access_token);
      localStorage.setItem('refresh_token', tokenResponse.refresh_token);
      localStorage.setItem('user', JSON.stringify(tokenResponse.user));

      return tokenResponse.access_token;
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      return null;
    }
  }

  private async ensureValidAccessToken(forceRefresh = false): Promise<string | null> {
    const currentAccessToken = localStorage.getItem('access_token');
    if (!currentAccessToken) {
      return null;
    }

    const shouldRefresh = forceRefresh || this.isTokenCloseToExpiry(currentAccessToken);
    if (!shouldRefresh) {
      return currentAccessToken;
    }

    if (!this.refreshTokenPromise) {
      this.refreshTokenPromise = this.performTokenRefresh().finally(() => {
        this.refreshTokenPromise = null;
      });
    }

    const refreshedAccessToken = await this.refreshTokenPromise;
    return refreshedAccessToken || localStorage.getItem('access_token');
  }

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.client.interceptors.request.use(
      async (config) => {
        const isRefreshRequest = typeof config.url === 'string' && config.url.includes('/api/auth/refresh');
        const token = isRefreshRequest
          ? localStorage.getItem('access_token')
          : await this.ensureValidAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const statusCode = error.response?.status;
        const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
        const requestUrl = typeof originalRequest?.url === 'string' ? originalRequest.url : '';
        const isRefreshRequest = requestUrl.includes('/api/auth/refresh');

        if (statusCode === 401 && originalRequest && !isRefreshRequest && !originalRequest._retry) {
          originalRequest._retry = true;
          const refreshedToken = await this.ensureValidAccessToken(true);

          if (refreshedToken) {
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${refreshedToken}`;
            return this.client.request(originalRequest);
          }
        }

        if (error.response) {
          const message = (error.response.data as any)?.detail || error.message;
          throw new Error(message);
        }

        if (error.request) {
          throw new Error('No response from server. Please check your connection.');
        }

        throw new Error(error.message);
      }
    );
  }

  private normalizeSessionStatus(status?: string): Session['status'] {
    if (status === 'queued') {
      return 'creating';
    }
    if (status === 'creating' || status === 'running' || status === 'stopped' || status === 'error') {
      return status;
    }
    return 'creating';
  }

  private mapSession(raw: RawSession): Session {
    return {
      id: raw.id,
      name: raw.name,
      vmSize: raw.vm_size || 'small',
      agentType: raw.agent_type || 'codex',
      agentModel: raw.agent_model || '',
      setupMode: raw.setup_mode || 'manual',
      challengeUrls: raw.challenge_urls || [],
      instructions: raw.instructions || '',
      createdAt: raw.created_at || new Date().toISOString(),
      status: this.normalizeSessionStatus(raw.status),
      vmIp: raw.vm_ip,
      sshUsername: raw.ssh_username || 'ctfuser',
      sshPort: raw.ssh_port ?? 22,
      resourceGroup: raw.resource_group || '',
      errorMessage: raw.error_message,
      taskId: raw.task_id,
      deploymentProgress: raw.deployment_progress,
      currentStep: raw.current_step,
      estimatedCompletion: raw.estimated_completion,
      estimatedRemainingTime: raw.estimated_remaining_time,
      lastStatusUpdate: raw.last_status_update,
    };
  }

  private mapSessionStatus(raw: RawSessionStatus): SessionDeploymentStatus {
    return {
      sessionId: raw.session_id,
      taskId: raw.task_id,
      status: this.normalizeSessionStatus(raw.status),
      progress: raw.progress ?? 0,
      currentStep: raw.current_step,
      vmIp: raw.vm_ip,
      estimatedCompletion: raw.estimated_completion,
      estimatedRemainingTime: raw.estimated_remaining_time,
      errorMessage: raw.error_details?.message,
      lastUpdated: raw.last_updated,
    };
  }

  private mapWriteup(raw: RawWriteup): Writeup {
    return {
      id: raw.id,
      sessionId: raw.session_id,
      challengeUrls: raw.challenge_urls || [],
      category: raw.challenge_type,
      technologies: raw.technologies || [],
      content: raw.content || raw.content_preview || '',
      completionTimestamp: raw.completion_timestamp || new Date().toISOString(),
      agentType: raw.agent_type || 'codex',
      agentModel: raw.agent_model || '',
    };
  }

  private mapTokenResponse(raw: RawTokenResponse): TokenResponse {
    return {
      access_token: raw.access_token,
      refresh_token: raw.refresh_token,
      token_type: raw.token_type,
      user: {
        id: raw.user.id || raw.user.user_id || '',
        email: raw.user.email || '',
        role: raw.user.role || 'user',
        is_2fa_enabled: raw.user.is_2fa_enabled ?? false,
        locale: raw.user.locale || 'en',
      },
    };
  }

  // Session endpoints
  async createSession(request: VMCreationRequest): Promise<Session> {
    const payload = {
      challenge_urls: request.challengeUrls,
      instructions: request.instructions,
      agent_type: request.agentType,
      agent_model: request.agentModel,
      vm_size: request.vmSize,
      setup_mode: request.setupMode || 'manual',
      deploy_agent: request.deployAgent ?? true,
    };
    const response = await this.client.post<RawAsyncSessionCreateResponse | RawSession>(
      '/api/sessions/async',
      payload
    );

    if ('session_id' in response.data) {
      return {
        id: response.data.session_id,
        vmSize: request.vmSize,
        agentType: request.agentType,
        agentModel: request.agentModel,
        setupMode: request.setupMode || 'manual',
        challengeUrls: request.challengeUrls,
        instructions: request.instructions,
        createdAt: new Date().toISOString(),
        status: this.normalizeSessionStatus(response.data.status),
        sshUsername: 'ctfuser',
        sshPort: 22,
        resourceGroup: '',
        taskId: response.data.task_id,
        deploymentProgress: 0,
        currentStep: 'queued',
        estimatedCompletion: response.data.estimated_completion_time,
      };
    }

    return this.mapSession(response.data);
  }

  async getSessions(): Promise<Session[]> {
    const response = await this.client.get<{ sessions?: RawSession[] } | RawSession[]>('/api/sessions');
    const rawSessions = Array.isArray(response.data) ? response.data : response.data.sessions || [];
    return rawSessions.map((session) => this.mapSession(session));
  }

  async getSession(sessionId: string): Promise<Session> {
    const response = await this.client.get<RawSession>(`/api/sessions/${sessionId}`);
    return this.mapSession(response.data);
  }

  async getSessionStatus(sessionId: string): Promise<SessionDeploymentStatus> {
    const response = await this.client.get<RawSessionStatus>(`/api/sessions/${sessionId}/status`);
    return this.mapSessionStatus(response.data);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.delete(`/api/sessions/${sessionId}`);
  }

  // SSH endpoints
  async getSSHInfo(sessionId: string): Promise<SSHConnectionInfo> {
    const response = await this.client.get<SSHConnectionInfo>(`/api/sessions/${sessionId}/ssh`);
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
    const response = await this.client.get<{ content: string }>(`/api/sessions/${sessionId}/agent-md`);
    return response.data.content;
  }

  async updateAgentMd(sessionId: string, content: string): Promise<void> {
    await this.client.put(`/api/sessions/${sessionId}/agent-md`, { content });
  }

  async getBasePrompt(sessionId: string): Promise<string> {
    const response = await this.client.get<{ content: string }>(`/api/sessions/${sessionId}/base-prompt`);
    return response.data.content;
  }

  async getToolsMd(sessionId: string): Promise<string> {
    const response = await this.client.get<{ content: string }>(`/api/sessions/${sessionId}/tools-md`);
    return response.data.content;
  }

  async getChangelog(sessionId: string): Promise<string> {
    const response = await this.client.get<{ content: string }>(`/api/sessions/${sessionId}/changelog`);
    return response.data.content;
  }

  async getDiscoveries(sessionId: string): Promise<string> {
    const response = await this.client.get<{ content: string }>(`/api/sessions/${sessionId}/discoveries`);
    return response.data.content;
  }

  // Writeup endpoints
  async uploadWriteup(
    sessionId: string,
    content: string,
    category?: string,
    _technologies?: string[]
  ): Promise<{ id: string; message: string }> {
    const response = await this.client.post<{ writeup_id?: string; id?: string; message?: string }>(
      `/api/sessions/${sessionId}/writeup`,
      {
        content,
        challenge_type: category,
      }
    );

    return {
      id: response.data.writeup_id || response.data.id || sessionId,
      message: response.data.message || 'Writeup uploaded successfully',
    };
  }

  async getWriteups(skip: number = 0, limit: number = 20, category?: string): Promise<Writeup[]> {
    const params: Record<string, any> = { skip, limit };
    if (category) {
      params.challenge_type = category;
    }

    const response = await this.client.get<RawWriteupListResponse | RawWriteup[]>('/api/writeups', { params });
    const rawWriteups = Array.isArray(response.data) ? response.data : response.data.writeups || [];
    return rawWriteups.map((writeup) => this.mapWriteup(writeup));
  }

  async getWriteup(sessionId: string): Promise<Writeup> {
    const response = await this.client.get<RawWriteup>(`/api/writeups/${sessionId}`);
    return this.mapWriteup(response.data);
  }

  async searchWriteups(params: WriteupSearchParams): Promise<Writeup[]> {
    const queryParams: Record<string, any> = {};
    if (params.query) {
      queryParams.q = params.query;
    }
    if (params.category) {
      queryParams.challenge_type = params.category;
    }

    if (!queryParams.q && !queryParams.challenge_type) {
      return [];
    }

    const response = await this.client.get<RawWriteupListResponse | RawWriteup[]>('/api/writeups/search', {
      params: queryParams,
    });
    const rawWriteups = Array.isArray(response.data) ? response.data : response.data.writeups || [];
    return rawWriteups.map((writeup) => this.mapWriteup(writeup));
  }

  // WebSocket URL for terminal
  private buildTerminalWebSocketURL(sessionId: string, token?: string | null): string {
    const wsProtocol = BASE_URL.startsWith('https') ? 'wss' : 'ws';
    const wsBaseURL = BASE_URL.replace(/^https?/, wsProtocol);
    if (!token) {
      return `${wsBaseURL}/api/sessions/${sessionId}/terminal`;
    }
    return `${wsBaseURL}/api/sessions/${sessionId}/terminal?token=${encodeURIComponent(token)}`;
  }

  getTerminalWebSocketURL(sessionId: string): string {
    return this.buildTerminalWebSocketURL(sessionId, localStorage.getItem('access_token'));
  }

  async getTerminalWebSocketURLWithFreshToken(sessionId: string): Promise<string> {
    const token = await this.ensureValidAccessToken();
    return this.buildTerminalWebSocketURL(sessionId, token);
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
    const response = await this.client.post<RawTokenResponse>('/api/auth/login/2fa', request);
    return this.mapTokenResponse(response.data);
  }

  async setup2FAVerify(request: TwoFASetupVerifyRequest): Promise<TokenResponse> {
    const response = await this.client.post<RawTokenResponse>('/api/auth/setup-2fa/verify', request);
    return this.mapTokenResponse(response.data);
  }

  async refreshToken(request: RefreshTokenRequest): Promise<TokenResponse> {
    const response = await this.client.post<RawTokenResponse>('/api/auth/refresh', request);
    return this.mapTokenResponse(response.data);
  }

  async logout(): Promise<void> {
    await this.client.post('/api/auth/logout');
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<Partial<User> & { user_id?: string }>('/api/auth/me');
    const raw = response.data;

    return {
      id: raw.id || raw.user_id || '',
      email: raw.email || '',
      role: raw.role || 'user',
      is_2fa_enabled: raw.is_2fa_enabled ?? false,
      locale: raw.locale || 'en',
    };
  }

  // User management endpoints (admin only)
  async createUser(request: { email: string; role: UserRole; locale?: 'en' | 'ja' | 'es' }): Promise<{ user: any; message: string }> {
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

  async updateUser(userId: string, updates: { role?: UserRole; is_active?: boolean; locale?: 'en' | 'ja' | 'es' }): Promise<any> {
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
