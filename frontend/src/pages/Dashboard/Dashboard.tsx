import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppShell, Button, Container, Loading } from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/api';
import { Session } from '../../types';
import AgentSessionList from '../../components/AgentSessionList/AgentSessionList';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadSessions = useCallback(async (showSpinner: boolean = true) => {
    if (showSpinner) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      setError(null);
      const data = await apiClient.getSessions();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToLoadSessions'));
    } finally {
      if (showSpinner) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, [t]);

  useEffect(() => {
    loadSessions(true);
  }, [loadSessions]);

  const stats = useMemo(() => {
    const total = sessions.length;
    const running = sessions.filter((session) => session.status === 'running').length;
    const failed = sessions.filter((session) => session.status === 'error').length;
    return { total, running, failed };
  }, [sessions]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

  const handleDelete = async (sessionId: string) => {
    await apiClient.deleteSession(sessionId);
    await loadSessions(false);
  };

  const formatDate = useCallback((value?: string) => {
    if (!value) {
      return t('common.unknownTime');
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return t('common.unknownTime');
    }

    return parsed.toLocaleString();
  }, [t]);

  const getStatusLabel = useCallback((status: Session['status']) => {
    return t(`common.status.${status}`);
  }, [t]);

  const headerActions = (
    <>
      <Button type="button" variant="normal" onClick={() => navigate('/vms/create')}>
        {t('nav.createVm')}
      </Button>
      <Button type="button" variant="success" onClick={() => loadSessions(false)} disabled={refreshing}>
        {refreshing ? t('common.refreshing') : t('common.refresh')}
      </Button>
      <Button type="button" variant="error" onClick={handleLogout}>
        {t('common.logout')}
      </Button>
    </>
  );

  return (
    <AppShell
      title={t('nav.dashboard')}
      subtitle={t('dashboard.subtitle', { email: user?.email || t('common.unknownUser') })}
      headerActions={headerActions}
    >
      {loading ? (
        <Container variant="light" padding="lg">
          <div className="flex justify-center py-md">
            <Loading size="lg" text={t('dashboard.loadingSessions')} />
          </div>
        </Container>
      ) : (
        <>
          {error && (
            <Container variant="light" padding="lg" className="mb-lg border-accent-pink">
              <p className="font-pixel text-sm text-accent-pink mb-sm">{error}</p>
              <Button type="button" variant="primary" onClick={() => loadSessions(true)}>
                {t('common.retry')}
              </Button>
            </Container>
          )}

          <div className="grid grid-cols-1 tablet:grid-cols-3 gap-lg mb-lg">
            <Container variant="light" padding="md">
              <p className="font-pixel text-xs text-neutral-teal mb-xs">{t('dashboard.stats.totalSessions')}</p>
              <p className="font-pixel text-2xl text-neutral-darkPurple">{stats.total}</p>
            </Container>
            <Container variant="light" padding="md">
              <p className="font-pixel text-xs text-neutral-teal mb-xs">{t('dashboard.stats.running')}</p>
              <p className="font-pixel text-2xl text-neutral-darkPurple">{stats.running}</p>
            </Container>
            <Container variant="light" padding="md">
              <p className="font-pixel text-xs text-neutral-teal mb-xs">{t('dashboard.stats.errors')}</p>
              <p className="font-pixel text-2xl text-neutral-darkPurple">{stats.failed}</p>
            </Container>
          </div>

          <Container variant="light" padding="lg" className="mb-lg">
            <h2 className="font-pixel text-lg text-neutral-darkPurple mb-md">{t('dashboard.sections.recentSessions')}</h2>
            {sessions.length === 0 ? (
              <p className="font-pixel text-sm text-neutral-teal">{t('dashboard.empty.noSessions')}</p>
            ) : (
              <div className="space-y-sm">
                {sessions.slice(0, 3).map((session) => (
                  <div key={session.id} className="border-b-2 border-neutral-olive pb-sm">
                    <p className="font-pixel text-sm text-neutral-darkPurple">
                      {session.name || session.id} ({getStatusLabel(session.status)})
                    </p>
                    <p className="font-pixel text-xs text-neutral-teal mt-xs">
                      {formatDate(session.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Container>

          <Container variant="light" padding="lg" className="mb-lg">
            <h2 className="font-pixel text-lg text-neutral-darkPurple mb-md">{t('dashboard.sections.sessions')}</h2>
            <AgentSessionList
              sessions={sessions}
              onConnect={(sessionId) => navigate(`/sessions/${sessionId}`)}
              onDelete={handleDelete}
            />
          </Container>

          <Container variant="light" padding="lg">
            <h2 className="font-pixel text-lg text-neutral-darkPurple mb-md">{t('dashboard.sections.quickActions')}</h2>
            <div className="flex flex-col tablet:flex-row gap-md">
              <Button type="button" variant="primary" onClick={() => navigate('/vms/create')} fullWidth>
                {t('dashboard.actions.createNewVm')}
              </Button>
              <Button type="button" variant="normal" onClick={() => navigate('/writeups')} fullWidth>
                {t('dashboard.actions.browseWriteups')}
              </Button>
              <Button type="button" variant="success" onClick={() => navigate('/settings')} fullWidth>
                {t('dashboard.actions.openSettings')}
              </Button>
            </div>
          </Container>
        </>
      )}
    </AppShell>
  );
};
