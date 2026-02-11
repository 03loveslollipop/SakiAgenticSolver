# Extended Component Designs

## Setup Mode Selector Component

```typescript
// SetupModeSelector.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Container } from './Container';

export type SetupMode = 'gemini' | 'manual';

export interface SetupModeSelectorProps {
  value: SetupMode;
  onChange: (mode: SetupMode) => void;
}

export const SetupModeSelector: React.FC<SetupModeSelectorProps> = ({
  value,
  onChange,
}) => {
  const { t } = useTranslation();

  const modes: Array<{ id: SetupMode; icon: string }> = [
    { id: 'gemini', icon: '🤖' },
    { id: 'manual', icon: '🔧' },
  ];

  return (
    <div className="space-y-md">
      <label className="font-pixel text-sm text-neutral-darkPurple">
        {t('vm.create.setupMode')}
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            className={`
              p-md border-4 border-solid transition-all
              ${
                value === mode.id
                  ? 'border-accent-cyan bg-accent-cyan bg-opacity-10'
                  : 'border-neutral-teal bg-white hover:border-accent-cyan'
              }
            `}
          >
            <div className="flex flex-col items-center gap-sm text-center">
              <span className="text-4xl">{mode.icon}</span>
              <span className="font-pixel text-sm text-neutral-darkPurple">
                {t(`vm.create.setupMode${mode.id.charAt(0).toUpperCase() + mode.id.slice(1)}`)}
              </span>
              <span className="font-pixel text-xs text-neutral-teal">
                {t(`vm.create.setupMode${mode.id.charAt(0).toUpperCase() + mode.id.slice(1)}Desc`)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
```

## Delete Infrastructure Modal Component

```typescript
// DeleteInfrastructureModal.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Container } from './Container';
import { Input } from './Input';
import { Button } from './Button';

export interface DeleteInfrastructureModalProps {
  isOpen: boolean;
  sessionId: string;
  sessionName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteInfrastructureModal: React.FC<DeleteInfrastructureModalProps> = ({
  isOpen,
  sessionId,
  sessionName,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [enteredSessionId, setEnteredSessionId] = useState('');
  const [enteredPhrase, setEnteredPhrase] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiredPhrase = t('vm.delete.confirmPhraseRequired');
  const isSessionIdValid = enteredSessionId === sessionId;
  const isPhraseValid = enteredPhrase === requiredPhrase;
  const canDelete = isSessionIdValid && isPhraseValid && !isDeleting;

  useEffect(() => {
    if (!isOpen) {
      setEnteredSessionId('');
      setEnteredPhrase('');
      setError(null);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!canDelete) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(t('vm.delete.error'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-darkPurple bg-opacity-80"
        onClick={onClose}
      />

      {/* Modal */}
      <Container
        variant="light"
        padding="lg"
        className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-lg">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-pixel text-lg text-neutral-darkPurple">
              {t('vm.delete.modalTitle')}
            </h2>
            <button
              onClick={onClose}
              className="font-pixel text-sm text-neutral-teal hover:text-accent-pink"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Warning */}
          <div className="p-md border-4 border-accent-pink bg-accent-pink bg-opacity-10">
            <p className="font-pixel text-sm text-accent-pink">
              ⚠️ {t('vm.delete.warning')}
            </p>
          </div>

          {/* Session Info */}
          <div className="space-y-sm">
            <p className="font-pixel text-sm text-neutral-darkPurple">
              <strong>Session:</strong> {sessionName}
            </p>
            <p className="font-pixel text-xs text-neutral-teal">
              <strong>ID:</strong> {sessionId}
            </p>
          </div>

          {/* Confirmation Inputs */}
          <div className="space-y-md">
            <Input
              label={t('vm.delete.sessionIdLabel')}
              placeholder={t('vm.delete.sessionIdPlaceholder')}
              value={enteredSessionId}
              onChange={(e) => setEnteredSessionId(e.target.value)}
              error={
                enteredSessionId && !isSessionIdValid
                  ? 'Session ID does not match'
                  : undefined
              }
            />

            <Input
              label={t('vm.delete.confirmPhraseLabel')}
              placeholder={t('vm.delete.confirmPhrasePlaceholder')}
              value={enteredPhrase}
              onChange={(e) => setEnteredPhrase(e.target.value)}
              error={
                enteredPhrase && !isPhraseValid
                  ? 'Confirmation phrase does not match'
                  : undefined
              }
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-md border-4 border-accent-pink bg-accent-pink bg-opacity-10">
              <p className="font-pixel text-sm text-accent-pink">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-md justify-end">
            <Button variant="normal" onClick={onClose} disabled={isDeleting}>
              {t('vm.delete.cancel')}
            </Button>
            <Button
              variant="error"
              onClick={handleConfirm}
              disabled={!canDelete}
            >
              {isDeleting
                ? t('vm.delete.deleting')
                : t('vm.delete.submit')}
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
};
```

## Agent Session List Component

```typescript
// AgentSessionList.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Container } from './Container';
import { Button } from './Button';
import { DeleteInfrastructureModal } from './DeleteInfrastructureModal';

export interface AgentSession {
  id: string;
  name: string;
  setupMode: 'gemini' | 'manual';
  status: 'running' | 'stopped' | 'provisioning';
  createdAt: Date;
  ipAddress?: string;
}

export interface AgentSessionListProps {
  sessions: AgentSession[];
  onDelete: (sessionId: string) => Promise<void>;
  onConnect: (sessionId: string) => void;
}

export const AgentSessionList: React.FC<AgentSessionListProps> = ({
  sessions,
  onDelete,
  onConnect,
}) => {
  const { t } = useTranslation();
  const [deleteModalSession, setDeleteModalSession] = useState<AgentSession | null>(null);

  const getSetupModeLabel = (mode: 'gemini' | 'manual') => {
    return mode === 'gemini'
      ? t('vm.create.setupModeGemini')
      : t('vm.create.setupModeManual');
  };

  const getStatusColor = (status: AgentSession['status']) => {
    switch (status) {
      case 'running':
        return 'text-accent-cyan';
      case 'stopped':
        return 'text-neutral-teal';
      case 'provisioning':
        return 'text-primary-yellow';
      default:
        return 'text-neutral-darkPurple';
    }
  };

  if (sessions.length === 0) {
    return (
      <Container variant="light" padding="lg" className="text-center">
        <p className="font-pixel text-sm text-neutral-teal">
          {t('vm.list.noSessions')}
        </p>
      </Container>
    );
  }

  return (
    <>
      <div className="space-y-md">
        {sessions.map((session) => (
          <Container key={session.id} variant="light" padding="md">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-md">
              {/* Session Info */}
              <div className="flex-1 space-y-xs">
                <h3 className="font-pixel text-base text-neutral-darkPurple">
                  {session.name}
                </h3>
                <div className="flex flex-wrap gap-md font-pixel text-xs text-neutral-teal">
                  <span>
                    <strong>{t('vm.list.setupMode')}:</strong>{' '}
                    {getSetupModeLabel(session.setupMode)}
                  </span>
                  <span className={getStatusColor(session.status)}>
                    <strong>{t('vm.list.status')}:</strong> {session.status}
                  </span>
                  {session.ipAddress && (
                    <span>
                      <strong>IP:</strong> {session.ipAddress}
                    </span>
                  )}
                </div>
                <p className="font-pixel text-xs text-neutral-teal">
                  <strong>ID:</strong> {session.id}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-sm">
                <Button
                  variant="primary"
                  onClick={() => onConnect(session.id)}
                  disabled={session.status !== 'running'}
                >
                  Connect
                </Button>
                <Button
                  variant="error"
                  onClick={() => setDeleteModalSession(session)}
                >
                  {t('vm.delete.button')}
                </Button>
              </div>
            </div>
          </Container>
        ))}
      </div>

      {/* Delete Modal */}
      {deleteModalSession && (
        <DeleteInfrastructureModal
          isOpen={!!deleteModalSession}
          sessionId={deleteModalSession.id}
          sessionName={deleteModalSession.name}
          onClose={() => setDeleteModalSession(null)}
          onConfirm={() => onDelete(deleteModalSession.id)}
        />
      )}
    </>
  );
};
```
