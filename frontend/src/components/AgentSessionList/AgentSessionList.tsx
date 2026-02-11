import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Session, SessionStatus } from '../../types';
import { Container } from '../Container/Container';
import { Button } from '../Button/Button';
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
    if (mode === 'gemini') return t('vm.create.setupModeGemini') || 'Gemini CLI';
    return t('vm.create.setupModeManual') || 'Manual';
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

  const getStatusText = (status: SessionStatus) => {
    switch (status) {
      case 'running':
        return t('common.status.running') || 'Running';
      case 'stopped':
        return t('common.status.stopped') || 'Stopped';
      case 'creating':
        return t('common.status.creating') || 'Creating';
      case 'error':
        return t('common.status.error') || 'Error';
      default:
        return status;
    }
  };

  if (sessions.length === 0) {
    return (
      <Container variant="light" padding="lg" className="text-center" role="status" aria-live="polite">
        <p className="font-pixel text-sm text-neutral-teal">{t('vm.list.noSessions') || 'No active sessions'}</p>
      </Container>
    );
  }

  return (
    <div className="agent-session-list" role="list" aria-label="Agent sessions list">
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
              aria-label={`Session: ${session.name || session.id}`}
            >
              {session.name || session.id}
            </div>
            <div className="session-meta" aria-label="Session details">
              <span>
                <strong>{t('vm.list.setupMode') || 'Setup Mode'}:</strong> 
                <span aria-label={`Setup mode: ${getSetupModeLabel(session.setupMode)}`}>
                  {getSetupModeLabel(session.setupMode)}
                </span>
              </span>
              <span className={getStatusColor(session.status)}>
                <strong>{t('vm.list.status') || 'Status'}:</strong> 
                <span aria-label={`Status: ${getStatusText(session.status)}`}>
                  {getStatusText(session.status)}
                </span>
              </span>
              {session.vmIp && (
                <span>
                  <strong>IP:</strong> 
                  <span aria-label={`IP address: ${session.vmIp}`}>
                    {session.vmIp}
                  </span>
                </span>
              )}
              <span className="session-id">
                <strong>ID:</strong> 
                <span aria-label={`Session ID: ${session.id}`}>
                  {session.id}
                </span>
              </span>
            </div>
          </div>

          <div className="session-actions">
            <Button 
              variant="primary" 
              onClick={() => onConnect(session.id)} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onConnect(session.id);
                }
              }}
              disabled={session.status !== 'running'}
              aria-label={`Connect to session ${session.name || session.id}`}
              tabIndex={0}
            >
              {t('common.connect') || 'Connect'}
            </Button>
            <Button 
              variant="error" 
              onClick={() => setDeleteModalSession(session)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setDeleteModalSession(session);
                }
              }}
              aria-label={`Delete infrastructure for session ${session.name || session.id}`}
              tabIndex={0}
            >
              {t('vm.delete.button') || 'Delete Infrastructure'}
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
