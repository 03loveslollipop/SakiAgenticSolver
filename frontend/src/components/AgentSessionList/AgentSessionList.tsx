import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Session, SessionStatus } from '../../types';
import { Button } from '../Button/Button';
import { Container } from '../Container/Container';
import DeleteInfrastructureModal from '../DeleteInfrastructureModal/DeleteInfrastructureModal';
import './AgentSessionList.css';

export interface AgentSessionListProps {
  sessions: Session[];
  onDelete: (sessionId: string) => Promise<void>;
  onConnect: (sessionId: string) => void;
}

export const AgentSessionList: React.FC<AgentSessionListProps> = ({
  sessions,
  onDelete,
  onConnect,
}) => {
  const { t } = useTranslation();
  const [deleteModalSession, setDeleteModalSession] = useState<Session | null>(null);

  const getSetupModeLabel = (mode?: 'gemini' | 'manual') => {
    if (mode === 'gemini') return t('vm.create.setupModeGemini');
    return t('vm.create.setupModeManual');
  };

  const getStatusColor = (status: SessionStatus) => {
    switch (status) {
      case 'running':
        return 'status-running';
      case 'stopped':
        return 'status-stopped';
      case 'creating':
        return 'status-creating';
      case 'error':
        return 'status-error';
      default:
        return '';
    }
  };

  const getStatusText = (status: SessionStatus) => t(`common.status.${status}`);

  if (sessions.length === 0) {
    return (
      <Container variant="light" padding="lg" className="text-center" role="status" aria-live="polite">
        <p className="font-pixel text-sm text-neutral-teal">{t('vm.list.noSessions')}</p>
      </Container>
    );
  }

  return (
    <div className="agent-session-list" role="list" aria-label={t('vm.list.ariaLabel')}>
      {sessions.map((session) => (
        <Container
          key={session.id}
          variant="light"
          padding="md"
          className="session-row"
          role="listitem"
          aria-labelledby={`session-title-${session.id}`}
        >
          <div className="session-main">
            <div
              id={`session-title-${session.id}`}
              className="session-title"
              aria-label={t('vm.list.sessionAria', { name: session.name || session.id })}
            >
              {session.name || session.id}
            </div>
            <div className="session-meta" aria-label={t('vm.list.sessionDetailsAria')}>
              <span>
                <strong>{t('vm.list.setupMode')}:</strong>{' '}
                <span aria-label={t('vm.list.setupModeAria', { mode: getSetupModeLabel(session.setupMode) })}>
                  {getSetupModeLabel(session.setupMode)}
                </span>
              </span>
              <span className={getStatusColor(session.status)}>
                <strong>{t('vm.list.status')}:</strong>{' '}
                <span aria-label={t('vm.list.statusAria', { status: getStatusText(session.status) })}>
                  {getStatusText(session.status)}
                </span>
              </span>
              {session.vmIp && (
                <span>
                  <strong>{t('common.ip')}:</strong>{' '}
                  <span aria-label={t('vm.list.ipAria', { ip: session.vmIp })}>{session.vmIp}</span>
                </span>
              )}
              <span className="session-id">
                <strong>{t('common.id')}:</strong>{' '}
                <span aria-label={t('vm.list.sessionIdAria', { id: session.id })}>{session.id}</span>
              </span>
            </div>
          </div>

          <div className="session-actions">
            <Button
              variant="primary"
              onClick={() => onConnect(session.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onConnect(session.id);
                }
              }}
              disabled={session.status !== 'running'}
              aria-label={t('vm.list.connectAria', { name: session.name || session.id })}
              tabIndex={0}
            >
              {t('common.connect')}
            </Button>
            <Button
              variant="error"
              onClick={() => setDeleteModalSession(session)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setDeleteModalSession(session);
                }
              }}
              aria-label={t('vm.list.deleteAria', { name: session.name || session.id })}
              tabIndex={0}
            >
              {t('vm.delete.button')}
            </Button>
          </div>
        </Container>
      ))}

      {deleteModalSession && (
        <DeleteInfrastructureModal
          isOpen={!!deleteModalSession}
          sessionId={deleteModalSession.id}
          sessionName={deleteModalSession.name || deleteModalSession.id}
          onClose={() => setDeleteModalSession(null)}
          onConfirm={() => onDelete(deleteModalSession.id)}
        />
      )}
    </div>
  );
};

export default AgentSessionList;
