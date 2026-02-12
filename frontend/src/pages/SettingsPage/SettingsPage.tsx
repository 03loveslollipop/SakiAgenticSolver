import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AppShell, Button, Container, Loading } from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/api';
import { User } from '../../types';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const [account, setAccount] = useState<User | null>(user);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'unhealthy' | 'unknown'>('unknown');
  const [error, setError] = useState<string | null>(null);

  const loadAccount = useCallback(async () => {
    setLoadingAccount(true);
    setError(null);
    try {
      const current = await apiClient.getCurrentUser();
      setAccount(current);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToRefreshAccount'));
    } finally {
      setLoadingAccount(false);
    }
  }, [t]);

  const checkBackendHealth = useCallback(async () => {
    setCheckingHealth(true);
    try {
      const healthy = await apiClient.healthCheck();
      setHealthStatus(healthy ? 'healthy' : 'unhealthy');
    } catch {
      setHealthStatus('unhealthy');
    } finally {
      setCheckingHealth(false);
    }
  }, []);

  useEffect(() => {
    setAccount(user);
  }, [user]);

  useEffect(() => {
    checkBackendHealth();
  }, [checkBackendHealth]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

  const backendStatusText = t(`settings.backend.status.${healthStatus}`);

  const headerActions = (
    <>
      <Button type="button" variant="normal" onClick={loadAccount} disabled={loadingAccount}>
        {loadingAccount ? t('settings.actions.refreshingAccount') : t('settings.actions.refreshAccount')}
      </Button>
      <Button type="button" variant="success" onClick={checkBackendHealth} disabled={checkingHealth}>
        {checkingHealth ? t('settings.actions.checkingBackend') : t('settings.actions.checkBackend')}
      </Button>
      <Button type="button" variant="error" onClick={handleLogout}>
        {t('common.logout')}
      </Button>
    </>
  );

  return (
    <AppShell
      title={t('nav.settings')}
      subtitle={t('settings.subtitle')}
      headerActions={headerActions}
    >
      {error && (
        <Container variant="light" padding="md" className="mb-lg border-accent-pink">
          <p className="font-pixel text-sm text-accent-pink">{error}</p>
        </Container>
      )}

      <Container variant="light" padding="lg" className="mb-lg">
        <h2 className="font-pixel text-lg text-neutral-darkPurple mb-md">{t('settings.sections.account')}</h2>
        {loadingAccount ? (
          <div className="py-sm">
            <Loading size="md" text={t('settings.actions.refreshingAccount')} />
          </div>
        ) : (
          <div className="space-y-sm">
            <p className="font-pixel text-sm text-neutral-darkPurple">
              <strong>{t('settings.labels.email')}</strong> {account?.email || user?.email || t('common.unknown')}
            </p>
            <p className="font-pixel text-sm text-neutral-darkPurple">
              <strong>{t('settings.labels.role')}</strong> {account?.role || user?.role || t('common.unknown')}
            </p>
            <p className="font-pixel text-sm text-neutral-darkPurple">
              <strong>{t('settings.labels.locale')}</strong> {account?.locale || 'en'}
            </p>
            <p className="font-pixel text-sm text-neutral-darkPurple">
              <strong>{t('settings.labels.twoFactorEnabled')}</strong>{' '}
              {(account?.is_2fa_enabled ?? user?.is_2fa_enabled) ? t('common.yes') : t('common.no')}
            </p>
          </div>
        )}
      </Container>

      <Container variant="light" padding="lg" className="mb-lg">
        <h2 className="font-pixel text-lg text-neutral-darkPurple mb-md">{t('settings.sections.backendStatus')}</h2>
        <p className="font-pixel text-sm text-neutral-darkPurple mb-sm">
          <strong>{t('settings.labels.api')}</strong> {backendStatusText}
        </p>
        {checkingHealth && (
          <Loading size="sm" text={t('settings.actions.checkingBackend')} />
        )}
      </Container>

      {user?.role === 'admin' && (
        <Container variant="light" padding="lg">
          <h2 className="font-pixel text-lg text-neutral-darkPurple mb-md">{t('settings.sections.admin')}</h2>
          <Button type="button" variant="primary" onClick={() => navigate('/users')}>
            {t('settings.actions.manageUsers')}
          </Button>
        </Container>
      )}
    </AppShell>
  );
};
