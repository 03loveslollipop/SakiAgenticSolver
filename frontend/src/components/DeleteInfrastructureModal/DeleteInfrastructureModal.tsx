import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../Button/Button';
import { Input } from '../Input/Input';
import './DeleteInfrastructureModal.css';

export interface DeleteInfrastructureModalProps {
  isOpen: boolean;
  sessionId: string;
  sessionName?: string;
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
  const modalRef = useRef<HTMLDivElement>(null);

  const requiredPhrase = t('vm.delete.confirmPhraseRequired');
  const isSessionIdValid = enteredSessionId === sessionId;
  const isPhraseValid = enteredPhrase === requiredPhrase;
  const canDelete = isSessionIdValid && isPhraseValid && !isDeleting;

  useEffect(() => {
    if (!isOpen) {
      setEnteredSessionId('');
      setEnteredPhrase('');
      setError(null);
      setIsDeleting(false);
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
      setError((err as Error)?.message || t('vm.delete.error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      onClose();
    }

    if (event.key === 'Enter' && isOpen && canDelete && !isDeleting) {
      event.preventDefault();
      handleConfirm();
    }
  }, [isOpen, onClose, canDelete, isDeleting]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleSessionIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEnteredSessionId(event.target.value);
    if (error) setError(null);
  };

  const handlePhraseChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEnteredPhrase(event.target.value);
    if (error) setError(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="dimmed-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      aria-describedby="delete-modal-description"
    >
      <div
        className="delete-modal"
        ref={modalRef}
        role="document"
        tabIndex={-1}
      >
        <div className="delete-header">
          <h2 id="delete-modal-title">{t('vm.delete.modalTitle')}</h2>
          <button
            aria-label={t('common.close')}
            onClick={onClose}
            className="close-button"
            disabled={isDeleting}
            tabIndex={0}
          >
            X
          </button>
        </div>

        <div
          className="delete-warning"
          id="delete-modal-description"
          role="alert"
          aria-live="assertive"
        >
          <p>
            {t('common.warning')}: {t('vm.delete.warning')}
          </p>
        </div>

        <div className="session-info" aria-label={t('vm.delete.sessionInfoAria')}>
          <p>
            <strong>{t('vm.delete.sessionLabel')}:</strong>
            <span aria-label={t('vm.delete.sessionNameAria', { name: sessionName || sessionId })}>
              {' '}
              {sessionName || sessionId}
            </span>
          </p>
          <p>
            <strong>{t('vm.delete.sessionIdTitle')}:</strong>
            <span aria-label={t('vm.delete.sessionIdAria', { id: sessionId })}>
              {' '}
              {sessionId}
            </span>
          </p>
        </div>

        <div className="confirmation-inputs">
          <Input
            label={t('vm.delete.sessionIdLabel')}
            placeholder={t('vm.delete.sessionIdPlaceholder')}
            value={enteredSessionId}
            onChange={handleSessionIdChange}
            error={enteredSessionId && !isSessionIdValid ? t('errors.sessionIdMismatch') : undefined}
            aria-describedby="session-id-instruction"
            disabled={isDeleting}
            aria-invalid={enteredSessionId ? !isSessionIdValid : undefined}
          />
          <div id="session-id-instruction" className="sr-only">
            {t('vm.delete.sessionIdInstruction')}
          </div>

          <Input
            label={t('vm.delete.confirmPhraseLabel')}
            placeholder={t('vm.delete.confirmPhrasePlaceholder')}
            value={enteredPhrase}
            onChange={handlePhraseChange}
            error={enteredPhrase && !isPhraseValid ? t('errors.confirmPhraseMismatch') : undefined}
            aria-describedby="confirm-phrase-instruction"
            disabled={isDeleting}
            aria-invalid={enteredPhrase ? !isPhraseValid : undefined}
          />
          <div id="confirm-phrase-instruction" className="sr-only">
            {t('vm.delete.confirmPhraseInstruction', { phrase: requiredPhrase })}
          </div>
        </div>

        {error && (
          <div
            className="delete-error"
            role="alert"
            aria-live="assertive"
          >
            <p>{error}</p>
          </div>
        )}

        <div className="delete-actions">
          <Button
            variant="normal"
            onClick={onClose}
            disabled={isDeleting}
            aria-label={t('vm.delete.cancelAria')}
            tabIndex={0}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="error"
            onClick={handleConfirm}
            disabled={!canDelete}
            aria-label={t('vm.delete.submit')}
            tabIndex={0}
            aria-describedby={canDelete ? 'delete-enabled-description' : 'delete-disabled-description'}
          >
            {isDeleting ? t('vm.delete.deleting') : t('vm.delete.submit')}
          </Button>
          <div id="delete-enabled-description" className="sr-only">
            {t('vm.delete.enabledDescription')}
          </div>
          <div id="delete-disabled-description" className="sr-only">
            {t('vm.delete.disabledDescription')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteInfrastructureModal;
