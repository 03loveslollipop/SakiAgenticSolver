// API client service for backend communication
import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  Session,
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

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

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

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
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
      status: raw.status || 'creating',
      vmIp: raw.vm_ip,
      sshUsername: raw.ssh_username || 'ctfuser',
      sshPort: raw.ssh_port ?? 22,
      resourceGroup: raw.resource_group || '',
      errorMessage: raw.error_message,
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
    const response = await this.client.post<RawSession>('/api/sessions', payload);
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
