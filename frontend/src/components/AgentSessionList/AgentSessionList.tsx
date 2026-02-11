import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Session } from '../../types';
import Container from '../Container/Container';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'status-running';
      case 'stopped':
        return 'status-stopped';
      case 'creating':
        return 'status-creating';
      default:
        return '';
    }
  };

  if (sessions.length === 0) {
    return (
      <Container variant="light" padding="lg" className="text-center">
        <p className="font-pixel text-sm text-neutral-teal">{t('vm.list.noSessions') || 'No sessions found'}</p>
      </Container>
    );
  }

  return (
    <div className="agent-session-list">
      {sessions.map((session) => (
        <Container key={session.id} variant="light" padding="md" className="session-row">
          <div className="session-main">
            <div className="session-title">{session.name || session.id}</div>
            <div className="session-meta">
              <span><strong>{t('vm.list.setupMode') || 'Setup Mode'}:</strong> {getSetupModeLabel(session.setupMode)}</span>
              <span className={getStatusColor(session.status)}><strong>{t('vm.list.status') || 'Status'}:</strong> {session.status}</span>
              {session.vmIp && <span><strong>IP:</strong> {session.vmIp}</span>}
              <span className="session-id"><strong>ID:</strong> {session.id}</span>
            </div>
          </div>

          <div className="session-actions">
            <Button variant="primary" onClick={() => onConnect(session.id)} disabled={session.status !== 'running'}>Connect</Button>
            <Button variant="error" onClick={() => setDeleteModalSession(session)}>Delete Infrastructure</Button>
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
