import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../Input/Input';
import { Button } from '../Button/Button';
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

  const requiredPhrase = 'delete agent infrastructure';
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
      setError((err as Error)?.message || 'Failed to delete infrastructure');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dimmed-backdrop">
      <div className="delete-modal">
        <div className="delete-header">
          <h2>{t('vm.delete.modalTitle') || 'Delete Infrastructure'}</h2>
          <button aria-label="Close" onClick={onClose} className="close-button">✕</button>
        </div>

        <div className="delete-warning">
          <p>⚠️ {t('vm.delete.warning') || 'This action will permanently destroy the infrastructure for this session.'}</p>
        </div>

        <div className="session-info">
          <p><strong>Session:</strong> {sessionName}</p>
          <p><strong>ID:</strong> {sessionId}</p>
        </div>

        <div className="confirmation-inputs">
          <Input
            label={t('vm.delete.sessionIdLabel') || 'Session ID'}
            placeholder={t('vm.delete.sessionIdPlaceholder') || 'Enter session ID to confirm'}
            value={enteredSessionId}
            onChange={(e) => setEnteredSessionId(e.target.value)}
            error={enteredSessionId && !isSessionIdValid ? 'Session ID does not match' : undefined}
          />

          <Input
            label={t('vm.delete.confirmPhraseLabel') || 'Confirmation Phrase'}
            placeholder={t('vm.delete.confirmPhrasePlaceholder') || 'Type "delete agent infrastructure"'}
            value={enteredPhrase}
            onChange={(e) => setEnteredPhrase(e.target.value)}
            error={enteredPhrase && !isPhraseValid ? 'Confirmation phrase does not match' : undefined}
          />
        </div>

        {error && (
          <div className="delete-error">
            <p>{error}</p>
          </div>
        )}

        <div className="delete-actions">
          <Button variant="normal" onClick={onClose} disabled={isDeleting}>Cancel</Button>
          <Button variant="error" onClick={handleConfirm} disabled={!canDelete}>{isDeleting ? (t('vm.delete.deleting') || 'Deleting...') : (t('vm.delete.submit') || 'Delete')}</Button>
        </div>
      </div>
    </div>
  );
};

export default DeleteInfrastructureModal;
