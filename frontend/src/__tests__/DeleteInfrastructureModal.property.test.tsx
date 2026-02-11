// DeleteInfrastructureModal.property.test.tsx - Property-based tests for DeleteInfrastructureModal
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import { DeleteInfrastructureModal } from '../components/DeleteInfrastructureModal/DeleteInfrastructureModal';
import { runPropertyTest } from '../test-utils/test-config';

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
        'vm.delete.submit': 'Delete Infrastructure',
        'vm.delete.deleting': 'Deleting...',
        'common.cancel': 'Cancel',
        'common.close': 'Close',
        'errors.sessionIdMismatch': 'Session ID does not match',
        'errors.confirmPhraseMismatch': 'Confirmation phrase does not match',
        'vm.delete.error': 'Failed to delete infrastructure',
      };
      return translations[key] || key;
    },
  }),
}));

describe('DeleteInfrastructureModal Component Properties', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn().mockResolvedValue(undefined);

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

  runPropertyTest(
    26,
    'Infrastructure Deletion Confirmation',
    fc.record({
      sessionId: fc.string({ minLength: 5, maxLength: 50 }),
      enteredSessionId: fc.string({ minLength: 0, maxLength: 50 }),
      enteredPhrase: fc.string({ minLength: 0, maxLength: 50 }),
    }),
    ({ sessionId, enteredSessionId, enteredPhrase }) => {
      // Render modal with test session ID
      const { unmount } = renderModal({ sessionId });
      
      // Get the delete button - there might be multiple, get the last one (the actual delete button)
      const deleteButtons = screen.getAllByRole('button', { name: /delete infrastructure/i });
      const deleteButton = deleteButtons[deleteButtons.length - 1];
      
      // Get input fields
      const sessionIdInput = screen.getByPlaceholderText(/type session id here/i);
      const phraseInput = screen.getByPlaceholderText(/delete agent infrastructure/i);
      
      // Enter test values
      fireEvent.change(sessionIdInput, { target: { value: enteredSessionId } });
      fireEvent.change(phraseInput, { target: { value: enteredPhrase } });
      
      // Check if delete button is enabled/disabled based on validation
      const isSessionIdValid = enteredSessionId === sessionId;
      const isPhraseValid = enteredPhrase === 'delete agent infrastructure';
      const shouldBeEnabled = isSessionIdValid && isPhraseValid;
      
      // The button should be disabled when inputs are incorrect
      if (!shouldBeEnabled) {
        expect(deleteButton).toBeDisabled();
      } else {
        expect(deleteButton).not.toBeDisabled();
      }
      
      // Cleanup
      unmount();
      
      return true;
    }
  );

  it('Feature: frontend-ui-8bit-redesign, Property 26: Infrastructure Deletion Confirmation - Button enable/disable logic', () => {
    fc.assert(
      fc.property(
        fc.record({
          sessionId: fc.uuid(),
          enteredSessionId: fc.string({ minLength: 0, maxLength: 100 }),
          enteredPhrase: fc.string({ minLength: 0, maxLength: 100 }),
        }),
        ({ sessionId, enteredSessionId, enteredPhrase }) => {
          // Render the modal
          const { unmount } = renderModal({ sessionId });
          
          // Get UI elements - get the last delete button (the actual one)
          const deleteButtons = screen.getAllByRole('button', { name: /delete infrastructure/i });
          const deleteButton = deleteButtons[deleteButtons.length - 1];
          const sessionIdInput = screen.getByPlaceholderText(/type session id here/i);
          const phraseInput = screen.getByPlaceholderText(/delete agent infrastructure/i);
          
          // Enter values
          fireEvent.change(sessionIdInput, { target: { value: enteredSessionId } });
          fireEvent.change(phraseInput, { target: { value: enteredPhrase } });
          
          // Calculate expected state
          const isSessionIdValid = enteredSessionId === sessionId;
          const isPhraseValid = enteredPhrase === 'delete agent infrastructure';
          const shouldButtonBeEnabled = isSessionIdValid && isPhraseValid;
          
          // Verify button state
          if (shouldButtonBeEnabled) {
            expect(deleteButton).not.toBeDisabled();
          } else {
            expect(deleteButton).toBeDisabled();
          }
          
          // Cleanup
          unmount();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Additional test for requirement 16.3: Exact session ID required
  it('should require exact session ID match', () => {
    const sessionId = 'test-session-abc-123';
    
    const { unmount } = renderModal({ sessionId });
    
    const sessionIdInput = screen.getByPlaceholderText(/type session id here/i);
    const deleteButtons = screen.getAllByRole('button', { name: /delete infrastructure/i });
    const deleteButton = deleteButtons[deleteButtons.length - 1];
    
    // Test with incorrect session ID
    fireEvent.change(sessionIdInput, { target: { value: 'wrong-session-id' } });
    expect(deleteButton).toBeDisabled();
    
    // Test with correct session ID but wrong phrase
    fireEvent.change(sessionIdInput, { target: { value: sessionId } });
    expect(deleteButton).toBeDisabled(); // Still disabled because phrase is wrong
    
    // Test with correct session ID and correct phrase
    const phraseInput = screen.getByPlaceholderText(/delete agent infrastructure/i);
    fireEvent.change(phraseInput, { target: { value: 'delete agent infrastructure' } });
    expect(deleteButton).not.toBeDisabled();
    
    unmount();
  });

  // Additional test for requirement 16.4: Exact phrase required
  it('should require exact confirmation phrase', () => {
    const sessionId = 'test-session-xyz-789';
    
    const { unmount } = renderModal({ sessionId });
    
    const sessionIdInput = screen.getByPlaceholderText(/type session id here/i);
    const phraseInput = screen.getByPlaceholderText(/delete agent infrastructure/i);
    const deleteButtons = screen.getAllByRole('button', { name: /delete infrastructure/i });
    const deleteButton = deleteButtons[deleteButtons.length - 1];
    
    // Enter correct session ID
    fireEvent.change(sessionIdInput, { target: { value: sessionId } });
    
    // Test with incorrect phrase variations
    const invalidPhrases = [
      'delete agent',
      'agent infrastructure',
      'delete infrastructure',
      'DELETE AGENT INFRASTRUCTURE', // case sensitive
      'delete agent infrastructure ', // trailing space
      ' delete agent infrastructure', // leading space
    ];
    
    invalidPhrases.forEach(phrase => {
      fireEvent.change(phraseInput, { target: { value: phrase } });
      expect(deleteButton).toBeDisabled();
    });
    
    // Test with exact correct phrase
    fireEvent.change(phraseInput, { target: { value: 'delete agent infrastructure' } });
    expect(deleteButton).not.toBeDisabled();
    
    unmount();
  });

  // Test for requirement 16.6: Button disabled on incorrect input
  it('should disable button when either input is incorrect', () => {
    const sessionId = 'session-123';
    
    const { unmount } = renderModal({ sessionId });
    
    const sessionIdInput = screen.getByPlaceholderText(/type session id here/i);
    const phraseInput = screen.getByPlaceholderText(/delete agent infrastructure/i);
    const deleteButtons = screen.getAllByRole('button', { name: /delete infrastructure/i });
    const deleteButton = deleteButtons[deleteButtons.length - 1];
    
    // Both incorrect
    fireEvent.change(sessionIdInput, { target: { value: 'wrong' } });
    fireEvent.change(phraseInput, { target: { value: 'wrong' } });
    expect(deleteButton).toBeDisabled();
    
    // Session ID correct, phrase incorrect
    fireEvent.change(sessionIdInput, { target: { value: sessionId } });
    fireEvent.change(phraseInput, { target: { value: 'wrong' } });
    expect(deleteButton).toBeDisabled();
    
    // Session ID incorrect, phrase correct
    fireEvent.change(sessionIdInput, { target: { value: 'wrong' } });
    fireEvent.change(phraseInput, { target: { value: 'delete agent infrastructure' } });
    expect(deleteButton).toBeDisabled();
    
    // Both correct
    fireEvent.change(sessionIdInput, { target: { value: sessionId } });
    fireEvent.change(phraseInput, { target: { value: 'delete agent infrastructure' } });
    expect(deleteButton).not.toBeDisabled();
    
    unmount();
  });

  // Test for requirement 16.7: Button enabled on correct input
  it('should enable button when both inputs are correct', async () => {
    const sessionId = 'correct-session-id-456';
    
    const { unmount } = renderModal({ sessionId });
    
    const sessionIdInput = screen.getByPlaceholderText(/type session id here/i);
    const phraseInput = screen.getByPlaceholderText(/delete agent infrastructure/i);
    const deleteButtons = screen.getAllByRole('button', { name: /delete infrastructure/i });
    const deleteButton = deleteButtons[deleteButtons.length - 1];
    
    // Initially disabled
    expect(deleteButton).toBeDisabled();
    
    // Enter correct values
    fireEvent.change(sessionIdInput, { target: { value: sessionId } });
    fireEvent.change(phraseInput, { target: { value: 'delete agent infrastructure' } });
    
    // Button should be enabled
    expect(deleteButton).not.toBeDisabled();
    
    // Test deletion flow
    fireEvent.click(deleteButton);
    
    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });
    
    unmount();
  });
});