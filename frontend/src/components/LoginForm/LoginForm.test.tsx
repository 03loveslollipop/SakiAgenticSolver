// LoginForm.test.tsx - Unit tests for LoginForm component
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders login form with all required elements', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    // Check for form elements
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    // Use getByPlaceholderText for password input to avoid conflict with "Forgot password" button
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    render(<LoginForm onSubmit={mockOnSubmit} isLoading={true} />);

    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
  });

  it('validates email field', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    // Try to submit with empty email
    fireEvent.click(submitButton);
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();

    // Try to submit with invalid email
    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    fireEvent.click(submitButton);
    expect(await screen.findByText(/please enter a valid email address/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates password field', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    const emailInput = screen.getByLabelText(/email/i);
    
    // Enter valid email
    await user.type(emailInput, 'test@example.com');
    
    // Try to submit with empty password
    fireEvent.click(submitButton);
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();

    // Try to submit with short password
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    await user.type(passwordInput, '12345');
    fireEvent.click(submitButton);
    expect(await screen.findByText(/password must be at least 6 characters/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const rememberMeCheckbox = screen.getByLabelText(/remember me/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Fill form with valid data
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(rememberMeCheckbox);

    // Submit form
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      });
    });
  });

  it('clears field error when user starts typing', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    // Trigger email validation error
    fireEvent.click(submitButton);
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();

    // Start typing in email field
    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 't');
    
    // Error should be cleared
    expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
  });

  it('handles forgot password click', async () => {
    const user = userEvent.setup();
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<LoginForm onSubmit={mockOnSubmit} />);

    const forgotPasswordButton = screen.getByRole('button', { name: /forgot password/i });
    await user.click(forgotPasswordButton);

    expect(alertMock).toHaveBeenCalledWith('Password reset functionality would be implemented here');
    
    alertMock.mockRestore();
  });

  it('displays submit error when onSubmit throws', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Login failed: Invalid credentials';
    mockOnSubmit.mockRejectedValueOnce(new Error(errorMessage));

    render(<LoginForm onSubmit={mockOnSubmit} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Fill form with valid data
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    // Submit form
    await user.click(submitButton);

    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
  });

  it('clears submit error when user makes any change', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Login failed';
    mockOnSubmit.mockRejectedValueOnce(new Error(errorMessage));

    render(<LoginForm onSubmit={mockOnSubmit} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Fill form and submit to trigger error
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    // Wait for error to appear
    expect(await screen.findByText(errorMessage)).toBeInTheDocument();

    // Make a change to any field
    await user.type(emailInput, 'x');

    // Error should be cleared
    expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
  });

  it('uses initial values when provided', () => {
    const initialEmail = 'initial@example.com';
    
    render(
      <LoginForm 
        onSubmit={mockOnSubmit} 
        initialEmail={initialEmail}
        initialRememberMe={true}
      />
    );

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const rememberMeCheckbox = screen.getByLabelText(/remember me/i) as HTMLInputElement;

    expect(emailInput.value).toBe(initialEmail);
    expect(rememberMeCheckbox.checked).toBe(true);
  });
});