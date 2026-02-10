import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Session } from '../types';
import apiClient from '../services/api';
import Terminal from './Terminal';
import SSHInfo from './SSHInfo';
import AgentMdEditor from './AgentMdEditor';
import FileViewer from './FileViewer';
import WriteupUploader from './WriteupUploader';
import './SessionDetail.css';

type TabType =
  | 'terminal'
  | 'agent-md'
  | 'base-prompt'
  | 'tools-md'
  | 'changelog'
  | 'discoveries'
  | 'writeup'
  | 'ssh-info';

const SessionDetail = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('terminal');

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  const loadSession = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getSession(sessionId);
      setSession(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionId) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this session? This will terminate the VM and cannot be undone.'
    );

    if (!confirmed) return;

    try {
      await apiClient.deleteSession(sessionId);
      navigate('/dashboard');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete session');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'running':
        return 'status-badge status-running';
      case 'creating':
        return 'status-badge status-creating';
      case 'stopped':
        return 'status-badge status-stopped';
      case 'error':
        return 'status-badge status-error';
      default:
        return 'status-badge';
    }
  };

  if (loading) {
    return (
      <div className="session-detail">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="session-detail">
        <div className="error-container">
          <h2>Error Loading Session</h2>
          <p className="error-message">{error || 'Session not found'}</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="session-detail">
      {/* Session Header */}
      <div className="session-header">
        <div className="session-header-left">
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary btn-small">
            ← Back
          </button>
          <div className="session-title">
            <h2>Session {session.id.substring(0, 8)}</h2>
            <span className={getStatusBadgeClass(session.status)}>{session.status}</span>
          </div>
        </div>
        <button onClick={handleDeleteSession} className="btn btn-danger">
          Delete Session
        </button>
      </div>

      {/* Session Info */}
      <div className="session-info-bar">
        <div className="info-item">
          <span className="label">VM Size:</span>
          <span className="value">{session.vmSize}</span>
        </div>
        <div className="info-item">
          <span className="label">Agent:</span>
          <span className="value">
            {session.agentType} ({session.agentModel})
          </span>
        </div>
        <div className="info-item">
          <span className="label">Created:</span>
          <span className="value">{formatDate(session.createdAt)}</span>
        </div>
        {session.vmIp && (
          <div className="info-item">
            <span className="label">IP:</span>
            <span className="value">{session.vmIp}</span>
          </div>
        )}
      </div>

      {session.errorMessage && (
        <div className="session-error-banner">
          <strong>Error:</strong> {session.errorMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'terminal' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('terminal')}
        >
          Terminal
        </button>
        <button
          className={`tab ${activeTab === 'agent-md' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('agent-md')}
        >
          AGENT.md
        </button>
        <button
          className={`tab ${activeTab === 'base-prompt' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('base-prompt')}
        >
          BASE_PROMPT.md
        </button>
        <button
          className={`tab ${activeTab === 'tools-md' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('tools-md')}
        >
          TOOLS.md
        </button>
        <button
          className={`tab ${activeTab === 'changelog' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('changelog')}
        >
          Changelog
        </button>
        <button
          className={`tab ${activeTab === 'discoveries' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('discoveries')}
        >
          Discoveries
        </button>
        <button
          className={`tab ${activeTab === 'writeup' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('writeup')}
        >
          Writeup
        </button>
        <button
          className={`tab ${activeTab === 'ssh-info' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('ssh-info')}
        >
          SSH Info
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'terminal' && <Terminal sessionId={session.id} />}
        {activeTab === 'agent-md' && <AgentMdEditor sessionId={session.id} />}
        {activeTab === 'base-prompt' && (
          <FileViewer
            sessionId={session.id}
            fileType="base-prompt"
            title="BASE_PROMPT.md (Read-Only)"
            description="This file contains immutable system instructions for the agent."
          />
        )}
        {activeTab === 'tools-md' && (
          <FileViewer
            sessionId={session.id}
            fileType="tools-md"
            title="TOOLS.md (Read-Only)"
            description="Documentation of all installed tools and their versions."
          />
        )}
        {activeTab === 'changelog' && (
          <FileViewer
            sessionId={session.id}
            fileType="changelog"
            title="Changelog"
            description="Timestamped log of all commands and actions performed by the agent."
            autoRefresh
          />
        )}
        {activeTab === 'discoveries' && (
          <FileViewer
            sessionId={session.id}
            fileType="discoveries"
            title="Discoveries"
            description="Insights, findings, and analysis discovered during the challenge."
            autoRefresh
          />
        )}
        {activeTab === 'writeup' && <WriteupUploader sessionId={session.id} />}
        {activeTab === 'ssh-info' && <SSHInfo sessionId={session.id} />}
      </div>
    </div>
  );
};

export default SessionDetail;
