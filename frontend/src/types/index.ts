// TypeScript interfaces matching backend models

export type VMSize = 'small' | 'medium' | 'large';
export type AgentType = 'codex' | 'copilot';
export type SessionStatus = 'creating' | 'running' | 'stopped' | 'error';
export type WriteupCategory = 'pwn' | 'crypto' | 'reversing' | 'web' | 'forensics' | 'misc';

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
