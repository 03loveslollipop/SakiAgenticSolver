import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const modalRef = useRef<HTMLDivElement>(null);
  // const firstInputRef = useRef<HTMLInputElement>(null);

  const requiredPhrase = 'delete agent infrastructure';
  const isSessionIdValid = enteredSessionId === sessionId;
  const isPhraseValid = enteredPhrase === requiredPhrase;
  const canDelete = isSessionIdValid && isPhraseValid && !isDeleting;

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEnteredSessionId('');
      setEnteredPhrase('');
      setError(null);
      setIsDeleting(false);
    }
  }, [isOpen]);

  // Handle Escape key to close modal
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      onClose();
    }
    
    // Handle Enter key on delete button when enabled
    if (e.key === 'Enter' && isOpen && canDelete && !isDeleting) {
      e.preventDefault();
      handleConfirm();
    }
  }, [isOpen, onClose, canDelete, isDeleting]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleConfirm = async () => {
    if (!canDelete) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError((err as Error)?.message || t('vm.delete.error') || 'Failed to delete infrastructure');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSessionIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEnteredSessionId(e.target.value);
    if (error) setError(null);
  };

  const handlePhraseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEnteredPhrase(e.target.value);
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
          <h2 id="delete-modal-title">
            {t('vm.delete.modalTitle') || 'Delete Agent Infrastructure'}
          </h2>
          <button 
            aria-label={t('common.close') || 'Close modal'}
            onClick={onClose}
            className="close-button"
            disabled={isDeleting}
            tabIndex={0}
          >
            ✕
          </button>
        </div>

        <div 
          className="delete-warning" 
          id="delete-modal-description"
          role="alert"
          aria-live="assertive"
        >
          <p>⚠️ {t('vm.delete.warning') || 'This action will permanently destroy all cloud resources associated with this session.'}</p>
        </div>

        <div className="session-info" aria-label="Session information">
          <p>
            <strong>{t('vm.delete.sessionLabel') || 'Session'}:</strong> 
            <span aria-label={`Session name: ${sessionName}`}> {sessionName}</span>
          </p>
          <p>
            <strong>{t('vm.delete.sessionIdLabel') || 'Session ID'}:</strong> 
            <span aria-label={`Session ID: ${sessionId}`}> {sessionId}</span>
          </p>
        </div>

        <div className="confirmation-inputs">
          <Input
            label={t('vm.delete.sessionIdLabel') || 'Enter Session ID to confirm'}
            placeholder={t('vm.delete.sessionIdPlaceholder') || 'Type session ID here'}
            value={enteredSessionId}
            onChange={handleSessionIdChange}
            error={enteredSessionId && !isSessionIdValid ? t('errors.sessionIdMismatch') || 'Session ID does not match' : undefined}
            aria-describedby="session-id-instruction"
            disabled={isDeleting}
            aria-invalid={enteredSessionId ? !isSessionIdValid : undefined}
          />
          <div id="session-id-instruction" className="sr-only">
            {t('vm.delete.sessionIdInstruction') || 'Enter the exact session ID shown above to confirm deletion'}
          </div>

          <Input
            label={t('vm.delete.confirmPhraseLabel') || 'Type the confirmation phrase'}
            placeholder={t('vm.delete.confirmPhrasePlaceholder') || 'delete agent infrastructure'}
            value={enteredPhrase}
            onChange={handlePhraseChange}
            error={enteredPhrase && !isPhraseValid ? t('errors.confirmPhraseMismatch') || 'Confirmation phrase does not match' : undefined}
            aria-describedby="confirm-phrase-instruction"
            disabled={isDeleting}
            aria-invalid={enteredPhrase ? !isPhraseValid : undefined}
          />
          <div id="confirm-phrase-instruction" className="sr-only">
            {t('vm.delete.confirmPhraseInstruction') || 'Type the exact phrase "delete agent infrastructure" to confirm deletion'}
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
            aria-label={t('common.cancel') || 'Cancel deletion'}
            tabIndex={0}
          >
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button 
            variant="error" 
            onClick={handleConfirm} 
            disabled={!canDelete}
            aria-label={t('vm.delete.submit') || 'Delete infrastructure'}
            tabIndex={0}
            aria-describedby={canDelete ? 'delete-enabled-description' : 'delete-disabled-description'}
          >
            {isDeleting 
              ? (t('vm.delete.deleting') || 'Deleting...') 
              : (t('vm.delete.submit') || 'Delete Infrastructure')
            }
          </Button>
          <div id="delete-enabled-description" className="sr-only">
            {t('vm.delete.enabledDescription') || 'Delete button is enabled. Press Enter to delete or Tab to cancel.'}
          </div>
          <div id="delete-disabled-description" className="sr-only">
            {t('vm.delete.disabledDescription') || 'Delete button is disabled. Both confirmation fields must be correctly filled.'}
          </div>
        </div>
      </div>
    </div>
  );
};

// Add CSS for screen reader only class
const style = document.createElement('style');
style.textContent = '.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }';
document.head.appendChild(style);

export default DeleteInfrastructureModal;
