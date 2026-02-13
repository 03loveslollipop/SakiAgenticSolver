import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell, Button, Container, Loading } from '../components';
import apiClient from '../services/api';
import { Session } from '../types';
import AgentMdEditor from './AgentMdEditor';
import FileViewer from './FileViewer';
import SSHInfo from './SSHInfo';
import Terminal from './Terminal';
import WriteupUploader from './WriteupUploader';

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
  const [terminalMountKey, setTerminalMountKey] = useState(0);
  const previousStatusRef = useRef<Session['status'] | null>(null);

  const loadSession = useCallback(async () => {
    if (!sessionId) {
      return;
    }

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
  }, [sessionId, t]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    loadSession();
  }, [sessionId, loadSession]);

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
      } catch (pollError) {
        console.error('Failed to poll deployment status:', pollError);
      }
    };

    void pollStatus();
    const intervalId = window.setInterval(() => {
      void pollStatus();
    }, 5000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [sessionId, session?.status]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const previousStatus = previousStatusRef.current;
    if (session.status === 'running' && previousStatus && previousStatus !== 'running') {
      setActiveTab('terminal');
      setTerminalMountKey((current) => current + 1);
    }

    previousStatusRef.current = session.status;
  }, [session?.status]);

  const handleDeleteSession = async () => {
    if (!sessionId) {
      return;
    }

    const confirmed = window.confirm(t('sessionDetail.deleteConfirm'));
    if (!confirmed) {
      return;
    }

    try {
      await apiClient.deleteSession(sessionId);
      navigate('/dashboard');
    } catch (deleteError) {
      alert(deleteError instanceof Error ? deleteError.message : t('errors.failedToDeleteSession'));
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) {
      return t('common.unknownTime');
    }

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return t('common.unknownTime');
    }

    return date.toLocaleString();
  };

  const getStatusBadgeClass = (status: Session['status']) => {
    switch (status) {
      case 'running':
        return 'bg-accent-cyan text-white border-neutral-teal';
      case 'creating':
        return 'bg-primary-yellow text-neutral-darkPurple border-neutral-olive';
      case 'stopped':
        return 'bg-neutral-olive text-white border-neutral-teal';
      case 'error':
        return 'bg-accent-pink text-white border-neutral-darkPurple';
      default:
        return 'bg-neutral-olive text-white border-neutral-teal';
    }
  };

  const tabs = useMemo<Array<{ id: TabType; label: string }>>(
    () => [
      { id: 'terminal', label: t('sessionDetail.tabs.terminal') },
      { id: 'agent-md', label: t('sessionDetail.tabs.agentMd') },
      { id: 'base-prompt', label: t('sessionDetail.tabs.basePrompt') },
      { id: 'tools-md', label: t('sessionDetail.tabs.toolsMd') },
      { id: 'changelog', label: t('sessionDetail.tabs.changelog') },
      { id: 'discoveries', label: t('sessionDetail.tabs.discoveries') },
      { id: 'writeup', label: t('sessionDetail.tabs.writeup') },
      { id: 'ssh-info', label: t('sessionDetail.tabs.sshInfo') },
    ],
    [t]
  );

  const deploymentProgress = Math.max(0, Math.min(100, session?.deploymentProgress ?? 0));
  const title = t('sessionDetail.title', {
    id: session?.id?.substring(0, 8) || sessionId?.substring(0, 8) || '----',
  });
  const subtitle = session
    ? `${t(`common.status.${session.status}`)}${session.currentStep ? ` - ${session.currentStep}` : ''}`
    : t('sessionDetail.loading');

  const headerActions = (
    <>
      <Button type="button" variant="normal" onClick={() => navigate('/dashboard')}>
        {t('sessionDetail.backToDashboard')}
      </Button>
      <Button type="button" variant="success" onClick={loadSession} disabled={loading}>
        {t('common.refresh')}
      </Button>
      <Button type="button" variant="error" onClick={handleDeleteSession} disabled={!session}>
        {t('sessionDetail.deleteSession')}
      </Button>
    </>
  );

  if (loading) {
    return (
      <AppShell title={title} subtitle={subtitle} headerActions={headerActions}>
        <Container variant="light" padding="lg">
          <div className="flex justify-center py-lg">
            <Loading size="lg" text={t('sessionDetail.loading')} />
          </div>
        </Container>
      </AppShell>
    );
  }

  if (error || !session) {
    return (
      <AppShell title={title} subtitle={subtitle} headerActions={headerActions}>
        <Container variant="light" padding="lg" className="border-accent-pink">
          <h2 className="font-pixel text-lg text-neutral-darkPurple mb-sm">{t('sessionDetail.errorTitle')}</h2>
          <p className="font-pixel text-sm text-accent-pink mb-md">{error || t('sessionDetail.notFound')}</p>
          <Button type="button" variant="primary" onClick={() => navigate('/dashboard')}>
            {t('sessionDetail.backToDashboard')}
          </Button>
        </Container>
      </AppShell>
    );
  }

  const terminalReady = session.status === 'running';

  return (
    <AppShell title={title} subtitle={subtitle} headerActions={headerActions}>
      <Container variant="light" padding="md" className="mb-lg">
        <div className="flex flex-col tablet:flex-row tablet:items-center tablet:justify-between gap-md">
          <div className="flex items-center gap-sm">
            <span
              className={`inline-flex border-4 border-solid px-sm py-xs font-pixel text-xs uppercase ${getStatusBadgeClass(session.status)}`}
            >
              {t(`common.status.${session.status}`)}
            </span>
            {session.lastStatusUpdate && (
              <span className="font-pixel text-xs text-neutral-teal">
                Last update: {formatDate(session.lastStatusUpdate)}
              </span>
            )}
          </div>
          <p className="font-pixel text-xs text-neutral-olive">{session.id}</p>
        </div>
      </Container>

      <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4 gap-md mb-lg">
        <Container variant="light" padding="md">
          <p className="font-pixel text-xs text-neutral-teal mb-xs">{t('sessionDetail.info.vmSize')}</p>
          <p className="font-pixel text-sm text-neutral-darkPurple">{session.vmSize}</p>
        </Container>
        <Container variant="light" padding="md">
          <p className="font-pixel text-xs text-neutral-teal mb-xs">{t('sessionDetail.info.agent')}</p>
          <p className="font-pixel text-sm text-neutral-darkPurple">
            {session.agentType} ({session.agentModel})
          </p>
        </Container>
        <Container variant="light" padding="md">
          <p className="font-pixel text-xs text-neutral-teal mb-xs">{t('sessionDetail.info.created')}</p>
          <p className="font-pixel text-sm text-neutral-darkPurple">{formatDate(session.createdAt)}</p>
        </Container>
        <Container variant="light" padding="md">
          <p className="font-pixel text-xs text-neutral-teal mb-xs">{t('sessionDetail.info.ip')}</p>
          <p className="font-pixel text-sm text-neutral-darkPurple">{session.vmIp || t('common.unknown')}</p>
        </Container>
      </div>

      {session.errorMessage && (
        <Container variant="light" padding="md" className="mb-lg border-accent-pink">
          <p className="font-pixel text-sm text-accent-pink">
            <strong>{t('common.error')}:</strong> {session.errorMessage}
          </p>
        </Container>
      )}

      {session.status === 'creating' && (
        <Container variant="light" padding="md" className="mb-lg">
          <div className="flex items-center justify-between gap-sm mb-sm">
            <strong className="font-pixel text-sm text-neutral-darkPurple">Deployment in progress</strong>
            <span className="font-pixel text-xs text-neutral-teal">{deploymentProgress}%</span>
          </div>
          <div className="h-3 w-full border-2 border-solid border-neutral-teal bg-neutral-olive">
            <div
              className="h-full bg-accent-cyan transition-all duration-300"
              style={{ width: `${deploymentProgress}%` }}
            />
          </div>
          {session.currentStep && <p className="font-pixel text-xs text-neutral-teal mt-sm">Step: {session.currentStep}</p>}
          {session.estimatedRemainingTime && (
            <p className="font-pixel text-xs text-neutral-teal mt-xs">
              Estimated remaining: {session.estimatedRemainingTime}
            </p>
          )}
        </Container>
      )}

      <Container variant="light" padding="md" className="mb-md">
        <div className="flex gap-xs overflow-x-auto pb-xs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-4 border-solid px-sm py-xs font-pixel text-xs transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-yellow border-accent-cyan text-neutral-darkPurple'
                  : 'bg-neutral-olive border-neutral-teal text-white hover:bg-neutral-teal'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Container>

      <Container variant="light" padding="md">
        {activeTab === 'terminal' && !terminalReady && (
          <div className="border-4 border-solid border-neutral-teal bg-neutral-darkPurple p-md text-white">
            <p className="font-pixel text-sm mb-xs">
              Terminal will connect automatically once deployment is successful.
            </p>
            <p className="font-pixel text-xs text-accent-cyan">
              Current status: {t(`common.status.${session.status}`)}
            </p>
            {session.currentStep && <p className="font-pixel text-xs text-accent-cyan mt-xs">Step: {session.currentStep}</p>}
          </div>
        )}
        {activeTab === 'terminal' && terminalReady && (
          <Terminal key={`${session.id}-${terminalMountKey}`} sessionId={session.id} />
        )}
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
      </Container>
    </AppShell>
  );
};

export default SessionDetail;
