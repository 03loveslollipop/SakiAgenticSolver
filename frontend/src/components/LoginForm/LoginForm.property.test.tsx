// LoginForm.property.test.tsx - Property-based tests for LoginForm component
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { LoginForm } from './LoginForm';

describe('LoginForm Property Tests', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  /**
   * Property 1: Form Validation Consistency
   * Validates: Requirements 5.4, 5.8
   * 
   * For any invalid email input, the form should display an error
   * and prevent submission.
   */
  it('should reject invalid email formats with appropriate error messages', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length > 0),
        fc.string().filter(s => s.length >= 6),
        (invalidEmail, validPassword) => {
          // Render component
          const { unmount } = render(<LoginForm onSubmit={mockOnSubmit} />);
          
          // Fill form with invalid email and valid password
          const emailInput = screen.getByLabelText(/email/i);
          const passwordInput = screen.getByLabelText(/password/i);
          const submitButton = screen.getByRole('button', { name: /sign in/i });
          
          fireEvent.change(emailInput, { target: { value: invalidEmail } });
          fireEvent.change(passwordInput, { target: { value: validPassword } });
          fireEvent.click(submitButton);
          
          // Should show email validation error
          const errorElement = screen.queryByText(/please enter a valid email address|email is required/i);
          const hasError = errorElement !== null;
          
          // Should not call onSubmit
          const wasSubmitted = mockOnSubmit.mock.calls.length > 0;
          
          unmount();
          
          return hasError && !wasSubmitted;
        }
      ),
      { verbose: true }
    );
  });

  /**
   * Property 2: Password Length Validation
   * Validates: Requirements 5.4, 5.8
   * 
   * For any password shorter than 6 characters, the form should display an error
   * and prevent submission.
   */
  it('should reject passwords shorter than 6 characters', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s.length > 0 && s.length < 6),
        fc.string().filter(s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)),
        (shortPassword, validEmail) => {
          // Render component
          const { unmount } = render(<LoginForm onSubmit={mockOnSubmit} />);
          
          // Fill form with valid email and short password
          const emailInput = screen.getByLabelText(/email/i);
          const passwordInput = screen.getByLabelText(/password/i);
          const submitButton = screen.getByRole('button', { name: /sign in/i });
          
          fireEvent.change(emailInput, { target: { value: validEmail } });
          fireEvent.change(passwordInput, { target: { value: shortPassword } });
          fireEvent.click(submitButton);
          
          // Should show password validation error
          const errorElement = screen.queryByText(/password must be at least 6 characters|password is required/i);
          const hasError = errorElement !== null;
          
          // Should not call onSubmit
          const wasSubmitted = mockOnSubmit.mock.calls.length > 0;
          
          unmount();
          
          return hasError && !wasSubmitted;
        }
      ),
      { verbose: true }
    );
  });

  /**
   * Property 3: Loading State Interaction Prevention
   * Validates: Requirements 10.3
   * 
   * When isLoading is true, all form inputs and buttons should be disabled.
   */
  it('should disable all interactive elements during loading state', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        fc.boolean(),
        (email, password, rememberMe) => {
          // Render component with loading state
          const { unmount } = render(<LoginForm onSubmit={mockOnSubmit} isLoading={true} />);
          
          // Check that all interactive elements are disabled
          const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
          const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
          const rememberMeCheckbox = screen.getByLabelText(/remember me/i) as HTMLInputElement;
          const forgotPasswordButton = screen.getByRole('button', { name: /forgot password/i });
          
          const allDisabled = 
            emailInput.disabled &&
            passwordInput.disabled &&
            rememberMeCheckbox.disabled &&
            forgotPasswordButton.hasAttribute('disabled');
          
          // Check that submit button is replaced with loading indicator
          const submitButton = screen.queryByRole('button', { name: /sign in/i });
          const loadingIndicator = screen.queryByText(/signing in/i);
          
          const showsLoading = submitButton === null && loadingIndicator !== null;
          
          unmount();
          
          return allDisabled && showsLoading;
        }
      ),
      { verbose: true }
    );
  });

  /**
   * Property 4: Form Submission with Valid Data
   * Validates: Requirements 5.4, 5.7
   * 
   * For any valid email and password (≥6 chars), the form should submit successfully.
   */
  it('should submit form with valid email and password', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter(s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)),
        fc.string().filter(s => s.length >= 6),
        fc.boolean(),
        async (validEmail, validPassword, rememberMe) => {
          // Setup mock to resolve successfully
          mockOnSubmit.mockResolvedValueOnce(undefined);
          
          // Render component
          const { unmount } = render(<LoginForm onSubmit={mockOnSubmit} />);
          
          // Fill form with valid data
          const emailInput = screen.getByLabelText(/email/i);
          const passwordInput = screen.getByLabelText(/password/i);
          const rememberMeCheckbox = screen.getByLabelText(/remember me/i);
          const submitButton = screen.getByRole('button', { name: /sign in/i });
          
          fireEvent.change(emailInput, { target: { value: validEmail } });
          fireEvent.change(passwordInput, { target: { value: validPassword } });
          
          if (rememberMe) {
            fireEvent.click(rememberMeCheckbox);
          }
          
          // Submit form
          fireEvent.click(submitButton);
          
          // Wait for submission
          await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalledWith({
              email: validEmail,
              password: validPassword,
              rememberMe,
            });
          });
          
          const wasSubmitted = mockOnSubmit.mock.calls.length === 1;
          const submittedWithCorrectData = wasSubmitted && 
            mockOnSubmit.mock.calls[0][0].email === validEmail &&
            mockOnSubmit.mock.calls[0][0].password === validPassword &&
            mockOnSubmit.mock.calls[0][0].rememberMe === rememberMe;
          
          unmount();
          
          return submittedWithCorrectData;
        }
      ),
      { verbose: true }
    );
  });

  /**
   * Property 5: Error State Clearing
   * Validates: Requirements 5.8
   * 
   * When user corrects an invalid field, the error message should be cleared.
   */
  it('should clear field errors when user starts typing in that field', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length > 0),
        fc.string().filter(s => s.length >= 6),
        fc.string().filter(s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)),
        (invalidEmail, validPassword, correctedEmail) => {
          // Render component
          const { unmount } = render(<LoginForm onSubmit={mockOnSubmit} />);
          
          const emailInput = screen.getByLabelText(/email/i);
          const passwordInput = screen.getByLabelText(/password/i);
          const submitButton = screen.getByRole('button', { name: /sign in/i });
          
          // Trigger email validation error
          fireEvent.change(emailInput, { target: { value: invalidEmail } });
          fireEvent.change(passwordInput, { target: { value: validPassword } });
          fireEvent.click(submitButton);
          
          // Should show error
          const hasErrorBefore = screen.queryByText(/please enter a valid email address/i) !== null;
          
          // Start typing correction
          fireEvent.change(emailInput, { target: { value: correctedEmail } });
          
          // Error should be cleared
          const hasErrorAfter = screen.queryByText(/please enter a valid email address/i) !== null;
          
          unmount();
          
          return hasErrorBefore && !hasErrorAfter;
        }
      ),
      { verbose: true }
    );
  });

  /**
   * Property 6: Remember Me Checkbox State
   * Validates: Requirements 5.5
   * 
   * The remember me checkbox should correctly track its checked state.
   */
  it('should correctly track remember me checkbox state', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (initialState, shouldToggle) => {
          // Render component with initial state
          const { unmount } = render(
            <LoginForm 
              onSubmit={mockOnSubmit} 
              initialRememberMe={initialState}
            />
          );
          
          const rememberMeCheckbox = screen.getByLabelText(/remember me/i) as HTMLInputElement;
          
          // Check initial state
          const initialStateCorrect = rememberMeCheckbox.checked === initialState;
          
          if (shouldToggle) {
            // Toggle checkbox
            fireEvent.click(rememberMeCheckbox);
            const toggledStateCorrect = rememberMeCheckbox.checked === !initialState;
            unmount();
            return initialStateCorrect && toggledStateCorrect;
          }
          
          unmount();
          return initialStateCorrect;
        }
      ),
      { verbose: true }
    );
  });
});