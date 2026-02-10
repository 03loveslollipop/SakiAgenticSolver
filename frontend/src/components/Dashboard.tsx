import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session } from '../types';
import apiClient from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getSessions();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleSessionClick = (sessionId: string) => {
    navigate(`/sessions/${sessionId}`);
  };

  const handleCreateNew = () => {
    navigate('/create');
  };

  const handleViewWriteups = () => {
    navigate('/writeups');
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
      <div className="dashboard">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading sessions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="error-container">
          <h2>Error Loading Sessions</h2>
          <p className="error-message">{error}</p>
          <button onClick={loadSessions} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>VM Sessions</h2>
        <div className="dashboard-actions">
          <button onClick={handleViewWriteups} className="btn btn-secondary">
            View Writeups
          </button>
          <button onClick={handleCreateNew} className="btn btn-primary">
            Create New VM
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state">
          <p>No sessions found. Create your first VM to get started!</p>
          <button onClick={handleCreateNew} className="btn btn-primary">
            Create New VM
          </button>
        </div>
      ) : (
        <div className="sessions-grid">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="session-card"
              onClick={() => handleSessionClick(session.id)}
            >
              <div className="session-card-header">
                <h3>Session {session.id.substring(0, 8)}</h3>
                <span className={getStatusBadgeClass(session.status)}>
                  {session.status}
                </span>
              </div>
              <div className="session-card-body">
                <div className="session-info-row">
                  <span className="label">VM Size:</span>
                  <span className="value">{session.vmSize}</span>
                </div>
                <div className="session-info-row">
                  <span className="label">Agent:</span>
                  <span className="value">
                    {session.agentType} ({session.agentModel})
                  </span>
                </div>
                <div className="session-info-row">
                  <span className="label">Created:</span>
                  <span className="value">{formatDate(session.createdAt)}</span>
                </div>
                {session.vmIp && (
                  <div className="session-info-row">
                    <span className="label">IP:</span>
                    <span className="value">{session.vmIp}</span>
                  </div>
                )}
                {session.errorMessage && (
                  <div className="session-error">
                    <span className="error-label">Error:</span>
                    <span className="error-text">{session.errorMessage}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
