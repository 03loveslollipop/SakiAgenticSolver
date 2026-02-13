import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../services/api';
import { Session } from '../types';
import AgentMdEditor from './AgentMdEditor';
import FileViewer from './FileViewer';
import SSHInfo from './SSHInfo';
import Terminal from './Terminal';
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
  const { t } = useTranslation();
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

  useEffect(() => {
    if (!sessionId || !session || session.status !== 'creating') {
      return undefined;
    }

    let isCancelled = false;

    const pollStatus = async () => {
      try {
        const deploymentStatus = await apiClient.getSessionStatus(sessionId);
        if (isCancelled) {
          return;
        }

        setSession((previous) => {
          if (!previous) {
            return previous;
          }

          return {
            ...previous,
            status: deploymentStatus.status,
            taskId: deploymentStatus.taskId || previous.taskId,
            vmIp: deploymentStatus.vmIp || previous.vmIp,
            deploymentProgress: deploymentStatus.progress,
            currentStep: deploymentStatus.currentStep || previous.currentStep,
            estimatedCompletion: deploymentStatus.estimatedCompletion || previous.estimatedCompletion,
            estimatedRemainingTime:
              deploymentStatus.estimatedRemainingTime || previous.estimatedRemainingTime,
            errorMessage: deploymentStatus.errorMessage || previous.errorMessage,
            lastStatusUpdate: deploymentStatus.lastUpdated || previous.lastStatusUpdate,
          };
        });
      } catch (err) {
        console.error('Failed to poll deployment status:', err);
      }
    };

    pollStatus();
    const intervalId = window.setInterval(pollStatus, 5000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [sessionId, session?.status]);

  const loadSession = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getSession(sessionId);
      setSession(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToLoadSession'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionId) return;

    const confirmed = window.confirm(t('sessionDetail.deleteConfirm'));
    if (!confirmed) return;

    try {
      await apiClient.deleteSession(sessionId);
      navigate('/dashboard');
    } catch (err) {
      alert(err instanceof Error ? err.message : t('errors.failedToDeleteSession'));
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
          <div className="spinner" />
          <p>{t('sessionDetail.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="session-detail">
        <div className="error-container">
          <h2>{t('sessionDetail.errorTitle')}</h2>
          <p className="error-message">{error || t('sessionDetail.notFound')}</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
            {t('sessionDetail.backToDashboard')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="session-detail">
      <div className="session-header">
        <div className="session-header-left">
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary btn-small">
            {t('sessionDetail.back')}
          </button>
          <div className="session-title">
            <h2>{t('sessionDetail.title', { id: session.id.substring(0, 8) })}</h2>
            <span className={getStatusBadgeClass(session.status)}>{t(`common.status.${session.status}`)}</span>
          </div>
        </div>
        <button onClick={handleDeleteSession} className="btn btn-danger">
          {t('sessionDetail.deleteSession')}
        </button>
      </div>

      <div className="session-info-bar">
        <div className="info-item">
          <span className="label">{t('sessionDetail.info.vmSize')}</span>
          <span className="value">{session.vmSize}</span>
        </div>
        <div className="info-item">
          <span className="label">{t('sessionDetail.info.agent')}</span>
          <span className="value">
            {session.agentType} ({session.agentModel})
          </span>
        </div>
        <div className="info-item">
          <span className="label">{t('sessionDetail.info.created')}</span>
          <span className="value">{formatDate(session.createdAt)}</span>
        </div>
        {session.vmIp && (
          <div className="info-item">
            <span className="label">{t('sessionDetail.info.ip')}</span>
            <span className="value">{session.vmIp}</span>
          </div>
        )}
      </div>

      {session.errorMessage && (
        <div className="session-error-banner">
          <strong>{t('common.error')}:</strong> {session.errorMessage}
        </div>
      )}

      {session.status === 'creating' && (
        <div className="session-progress-banner">
          <div className="session-progress-header">
            <strong>Deployment in progress</strong>
            <span>{Math.max(0, Math.min(100, session.deploymentProgress ?? 0))}%</span>
          </div>
          <div className="session-progress-track">
            <div
              className="session-progress-fill"
              style={{ width: `${Math.max(0, Math.min(100, session.deploymentProgress ?? 0))}%` }}
            />
          </div>
          {session.currentStep && <p className="session-progress-step">Step: {session.currentStep}</p>}
          {session.estimatedRemainingTime && (
            <p className="session-progress-eta">Estimated remaining: {session.estimatedRemainingTime}</p>
          )}
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'terminal' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('terminal')}
        >
          {t('sessionDetail.tabs.terminal')}
        </button>
        <button
          className={`tab ${activeTab === 'agent-md' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('agent-md')}
        >
          {t('sessionDetail.tabs.agentMd')}
        </button>
        <button
          className={`tab ${activeTab === 'base-prompt' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('base-prompt')}
        >
          {t('sessionDetail.tabs.basePrompt')}
        </button>
        <button
          className={`tab ${activeTab === 'tools-md' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('tools-md')}
        >
          {t('sessionDetail.tabs.toolsMd')}
        </button>
        <button
          className={`tab ${activeTab === 'changelog' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('changelog')}
        >
          {t('sessionDetail.tabs.changelog')}
        </button>
        <button
          className={`tab ${activeTab === 'discoveries' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('discoveries')}
        >
          {t('sessionDetail.tabs.discoveries')}
        </button>
        <button
          className={`tab ${activeTab === 'writeup' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('writeup')}
        >
          {t('sessionDetail.tabs.writeup')}
        </button>
        <button
          className={`tab ${activeTab === 'ssh-info' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('ssh-info')}
        >
          {t('sessionDetail.tabs.sshInfo')}
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'terminal' && <Terminal sessionId={session.id} />}
        {activeTab === 'agent-md' && <AgentMdEditor sessionId={session.id} />}
        {activeTab === 'base-prompt' && (
          <FileViewer
            sessionId={session.id}
            fileType="base-prompt"
            title={t('sessionDetail.files.basePromptTitle')}
            description={t('sessionDetail.files.basePromptDescription')}
          />
        )}
        {activeTab === 'tools-md' && (
          <FileViewer
            sessionId={session.id}
            fileType="tools-md"
            title={t('sessionDetail.files.toolsTitle')}
            description={t('sessionDetail.files.toolsDescription')}
          />
        )}
        {activeTab === 'changelog' && (
          <FileViewer
            sessionId={session.id}
            fileType="changelog"
            title={t('sessionDetail.files.changelogTitle')}
            description={t('sessionDetail.files.changelogDescription')}
            autoRefresh
          />
        )}
        {activeTab === 'discoveries' && (
          <FileViewer
            sessionId={session.id}
            fileType="discoveries"
            title={t('sessionDetail.files.discoveriesTitle')}
            description={t('sessionDetail.files.discoveriesDescription')}
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
