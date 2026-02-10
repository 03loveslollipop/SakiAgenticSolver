// TypeScript interfaces matching backend models

export type VMSize = 'small' | 'medium' | 'large';
export type AgentType = 'codex' | 'copilot';
export type SessionStatus = 'creating' | 'running' | 'stopped' | 'error';
export type WriteupCategory = 'pwn' | 'crypto' | 'reversing' | 'web' | 'forensics' | 'misc';
export type UserRole = 'admin' | 'user';

export interface Session {
  id: string;
  vmSize: VMSize;
  agentType: AgentType;
  agentModel: string;
  challengeUrls: string[];
  instructions: string;
  createdAt: string;
  status: SessionStatus;
  vmIp?: string;
  sshUsername: string;
  sshPort: number;
  resourceGroup: string;
  errorMessage?: string;
}

export interface VMCreationRequest {
  challengeUrls: string[];
  instructions: string;
  agentType: AgentType;
  agentModel: string;
  vmSize: VMSize;
}

export interface SSHConnectionInfo {
  hostname: string;
  port: number;
  username: string;
}

export interface Writeup {
  id?: string;
  sessionId: string;
  challengeUrls: string[];
  category?: WriteupCategory;
  technologies: string[];
  content: string;
  completionTimestamp: string;
  agentType: AgentType;
  agentModel: string;
}

export interface WriteupSearchParams {
  query?: string;
  category?: WriteupCategory;
  technologies?: string[];
  skip?: number;
  limit?: number;
}

// Authentication types
export interface User {
  id: string;
  email: string;
  role: UserRole;
  is_2fa_enabled: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  requires_2fa_setup: boolean;
  message: string;
  qr_code_url?: string;
  secret?: string;
}

export interface TwoFAVerifyRequest {
  email: string;
  password: string;
  totp_code: string;
}

export interface TwoFASetupVerifyRequest {
  email: string;
  totp_code: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<LoginResponse>;
  loginWith2FA: (email: string, password: string, totpCode: string) => Promise<void>;
  setup2FA: (email: string, totpCode: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}
