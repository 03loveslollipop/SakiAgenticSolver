// DeleteInfrastructureModal.test.tsx - Unit tests for DeleteInfrastructureModal
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeleteInfrastructureModal } from '../components/DeleteInfrastructureModal/DeleteInfrastructureModal';

// Mock translation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'vm.delete.modalTitle': 'Delete Agent Infrastructure',
        'vm.delete.warning': 'This action will permanently destroy all cloud resources associated with this session.',
        'vm.delete.sessionLabel': 'Session',
        'vm.delete.sessionIdLabel': 'Session ID',
        'vm.delete.confirmPhraseLabel': 'Confirmation Phrase',
        'vm.delete.sessionIdPlaceholder': 'Type session ID here',
        'vm.delete.confirmPhrasePlaceholder': 'delete agent infrastructure',
        'vm.delete.confirmPhraseRequired': 'delete agent infrastructure',
        'vm.delete.submit': 'Delete Infrastructure',
        'vm.delete.deleting': 'Deleting...',
        'common.cancel': 'Cancel',
        'common.close': 'Close',
        'common.warning': 'Warning',
        'errors.sessionIdMismatch': 'Session ID does not match',
        'errors.confirmPhraseMismatch': 'Confirmation phrase does not match',
        'vm.delete.error': 'Failed to delete infrastructure',
      };
      return translations[key] || key;
    },
  }),
}));

describe('DeleteInfrastructureModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to render modal with given props
  const renderModal = (props: Partial<React.ComponentProps<typeof DeleteInfrastructureModal>> = {}) => {
    const defaultProps: React.ComponentProps<typeof DeleteInfrastructureModal> = {
      isOpen: true,
      sessionId: 'test-session-123',
      sessionName: 'Test Session',
      onClose: mockOnClose,
      onConfirm: mockOnConfirm,
      ...props,
    };
    
    return render(<DeleteInfrastructureModal {...defaultProps} />);
  };

  it('should render modal when isOpen is true', () => {
    renderModal();
    
    expect(screen.getByText('Delete Agent Infrastructure')).toBeInTheDocument();
    expect(screen.getByText('Test Session')).toBeInTheDocument();
    expect(screen.getByText('test-session-123')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type session ID here')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('delete agent infrastructure')).toBeInTheDocument();
  });

  it('should not render modal when isOpen is false', () => {
    renderModal({ isOpen: false });
    
    expect(screen.queryByText('Delete Agent Infrastructure')).not.toBeInTheDocument();
  });

  // Test for requirement 16.3: Exact session ID required
  it('should validate session ID input', () => {
    const sessionId = 'test-session-abc-123';
    
    renderModal({ sessionId });
    
    const sessionIdInput = screen.getByPlaceholderText('Type session ID here');
    
    // Enter incorrect session ID
    fireEvent.change(sessionIdInput, { target: { value: 'wrong-session-id' } });
    
    // Should show error message
    expect(screen.getByText('Session ID does not match')).toBeInTheDocument();
    
    // Enter correct session ID
    fireEvent.change(sessionIdInput, { target: { value: sessionId } });
    
    // Error message should disappear
    expect(screen.queryByText('Session ID does not match')).not.toBeInTheDocument();
  });

  // Test for requirement 16.4: Exact confirmation phrase required
  it('should validate confirmation phrase input', () => {
    renderModal();
    
    const phraseInput = screen.getByPlaceholderText('delete agent infrastructure');
    
    // Enter incorrect phrase
    fireEvent.change(phraseInput, { target: { value: 'wrong phrase' } });
    
    // Should show error message
    expect(screen.getByText('Confirmation phrase does not match')).toBeInTheDocument();
    
    // Enter correct phrase
    fireEvent.change(phraseInput, { target: { value: 'delete agent infrastructure' } });
    
    // Error message should disappear
    expect(screen.queryByText('Confirmation phrase does not match')).not.toBeInTheDocument();
  });

  // Test for requirement 16.6: Button disabled on incorrect input
  it('should disable delete button when inputs are incorrect', () => {
    const sessionId = 'session-123';
    
    renderModal({ sessionId });
    
    const deleteButtons = screen.getAllByRole('button', { name: /delete infrastructure/i });
    const deleteButton = deleteButtons[deleteButtons.length - 1];
    const sessionIdInput = screen.getByPlaceholderText('Type session ID here');
    const phraseInput = screen.getByPlaceholderText('delete agent infrastructure');
    
    // Initially disabled
    expect(deleteButton).toBeDisabled();
    
    // Only session ID correct
    fireEvent.change(sessionIdInput, { target: { value: sessionId } });
    expect(deleteButton).toBeDisabled();
    
    // Only phrase correct
    fireEvent.change(sessionIdInput, { target: { value: 'wrong' } });
    fireEvent.change(phraseInput, { target: { value: 'delete agent infrastructure' } });
    expect(deleteButton).toBeDisabled();
    
    // Both incorrect
    fireEvent.change(sessionIdInput, { target: { value: 'wrong' } });
    fireEvent.change(phraseInput, { target: { value: 'wrong' } });
    expect(deleteButton).toBeDisabled();
  });

  // Test for requirement 16.7: Button enabled on correct input
  it('should enable delete button when both inputs are correct', () => {
    const sessionId = 'correct-session-id-456';
    
    renderModal({ sessionId });
    
    const deleteButtons = screen.getAllByRole('button', { name: /delete infrastructure/i });
    const deleteButton = deleteButtons[deleteButtons.length - 1];
    const sessionIdInput = screen.getByPlaceholderText('Type session ID here');
    const phraseInput = screen.getByPlaceholderText('delete agent infrastructure');
    
    // Enter correct values
    fireEvent.change(sessionIdInput, { target: { value: sessionId } });
    fireEvent.change(phraseInput, { target: { value: 'delete agent infrastructure' } });
    
    // Button should be enabled
    expect(deleteButton).not.toBeDisabled();
  });

  // Test for requirement 16.8: Send delete request on confirmation
  it('should call onConfirm when delete button is clicked with correct inputs', async () => {
    const sessionId = 'session-to-delete-789';
    mockOnConfirm.mockResolvedValue(undefined);
    
    renderModal({ sessionId });
    
    const deleteButtons = screen.getAllByRole('button', { name: /delete infrastructure/i });
    const deleteButton = deleteButtons[deleteButtons.length - 1];
    const sessionIdInput = screen.getByPlaceholderText('Type session ID here');
    const phraseInput = screen.getByPlaceholderText('delete agent infrastructure');
    
    // Enter correct values
    fireEvent.change(sessionIdInput, { target: { value: sessionId } });
    fireEvent.change(phraseInput, { target: { value: 'delete agent infrastructure' } });
    
    // Click delete button
    fireEvent.click(deleteButton);
    
    // Should call onConfirm
    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });
  });

  // Test for requirement 16.10: Show loading state during deletion
  it('should show loading state during deletion', async () => {
    const sessionId = 'session-loading-test';
    // Create a promise that doesn't resolve immediately to test loading state
    let resolvePromise: () => void;
    const deletionPromise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    mockOnConfirm.mockReturnValue(deletionPromise);
    
    renderModal({ sessionId });
    
    const deleteButtons = screen.getAllByRole('button', { name: /delete infrastructure/i });
    const deleteButton = deleteButtons[deleteButtons.length - 1];
    const sessionIdInput = screen.getByPlaceholderText('Type session ID here');
    const phraseInput = screen.getByPlaceholderText('delete agent infrastructure');
    
    // Enter correct values
    fireEvent.change(sessionIdInput, { target: { value: sessionId } });
    fireEvent.change(phraseInput, { target: { value: 'delete agent infrastructure' } });
    
    // Click delete button
    fireEvent.click(deleteButton);
    
    // Should show loading state
    expect(screen.getByText('Deleting...')).toBeInTheDocument();
    expect(deleteButton).toBeDisabled();
    
    // Resolve the promise
    resolvePromise!();
    await deletionPromise;
  });

  // Test for requirement 16.11: Display error message on failure
  it('should display error message when deletion fails', async () => {
    const sessionId = 'session-error-test';
    const errorMessage = 'Network error: Failed to connect';
    mockOnConfirm.mockRejectedValue(new Error(errorMessage));
    
    renderModal({ sessionId });
    
    const deleteButtons = screen.getAllByRole('button', { name: /delete infrastructure/i });
    const deleteButton = deleteButtons[deleteButtons.length - 1];
    const sessionIdInput = screen.getByPlaceholderText('Type session ID here');
    const phraseInput = screen.getByPlaceholderText('delete agent infrastructure');
    
    // Enter correct values
    fireEvent.change(sessionIdInput, { target: { value: sessionId } });
    fireEvent.change(phraseInput, { target: { value: 'delete agent infrastructure' } });
    
    // Click delete button
    fireEvent.click(deleteButton);
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
    
    // Button should be re-enabled after error
    expect(deleteButton).not.toBeDisabled();
  });

  it('should close modal when cancel button is clicked', () => {
    renderModal();
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should close modal when close button is clicked', () => {
    renderModal();
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should reset form when modal is reopened', () => {
    const { rerender } = renderModal();
    
    const sessionIdInput = screen.getByPlaceholderText('Type session ID here');
    const phraseInput = screen.getByPlaceholderText('delete agent infrastructure');
    
    // Enter some values
    fireEvent.change(sessionIdInput, { target: { value: 'some-value' } });
    fireEvent.change(phraseInput, { target: { value: 'some-phrase' } });
    
    // Close modal
    rerender(<DeleteInfrastructureModal 
      isOpen={false}
      sessionId="test-session-123"
      sessionName="Test Session"
      onClose={mockOnClose}
      onConfirm={mockOnConfirm}
    />);
    
    // Reopen modal
    rerender(<DeleteInfrastructureModal 
      isOpen={true}
      sessionId="test-session-123"
      sessionName="Test Session"
      onClose={mockOnClose}
      onConfirm={mockOnConfirm}
    />);
    
    // Get fresh references to inputs after reopening
    const newSessionIdInput = screen.getByPlaceholderText('Type session ID here');
    const newPhraseInput = screen.getByPlaceholderText('delete agent infrastructure');
    
    // Inputs should be reset
    expect(newSessionIdInput).toHaveValue('');
    expect(newPhraseInput).toHaveValue('');
  });
});
