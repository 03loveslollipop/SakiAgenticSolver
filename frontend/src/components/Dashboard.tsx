import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session } from '../types';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import AgentSessionList from './AgentSessionList/AgentSessionList';
import './Dashboard.css';

const Dashboard = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    const hasPendingDeployments = sessions.some((session) => session.status === 'creating');
    if (!hasPendingDeployments) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      loadSessions();
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [sessions]);

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

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/login');
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

  const handleManageUsers = () => {
    navigate('/users');
  };

  // const formatDate = (dateString: string) => {
  //   const date = new Date(dateString);
  //   return date.toLocaleString();
  // };

  // const getStatusBadgeClass = (status: string) => {
  //   switch (status) {
  //     case 'running':
  //       return 'status-badge status-running';
  //     case 'creating':
  //       return 'status-badge status-creating';
  //     case 'stopped':
  //       return 'status-badge status-stopped';
  //     case 'error':
  //       return 'status-badge status-error';
  //     default:
  //       return 'status-badge';
  //   }
  // };

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
      <div className="dashboard-top-bar">
        <div className="app-header">
          <h1>Saki - CTF Automation Platform</h1>
        </div>
        <div className="user-info">
          <span className="user-email">{user?.email}</span>
          {user?.role === 'admin' && <span className="user-badge">Admin</span>}
          <button onClick={handleLogout} className="btn btn-logout">
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-header">
        <h2>VM Sessions</h2>
        <div className="dashboard-actions">
          {user?.role === 'admin' && (
            <button onClick={handleManageUsers} className="btn btn-secondary">
              Manage Users
            </button>
          )}
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
          {/* Use AgentSessionList for consistent session UI */}
          <AgentSessionList
            sessions={sessions}
            onConnect={(id) => handleSessionClick(id)}
            onDelete={async (id) => {
              try {
                setLoading(true);
                await apiClient.deleteSession(id);
                await loadSessions();
              } catch (err) {
                console.error('Failed to delete session:', err);
                setError(err instanceof Error ? err.message : 'Failed to delete session');
              } finally {
                setLoading(false);
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
