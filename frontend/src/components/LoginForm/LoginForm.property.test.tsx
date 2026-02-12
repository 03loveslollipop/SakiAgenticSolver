// LoginForm.property.test.tsx - Property-based tests for LoginForm component
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import { runPropertyTest } from '../../test-utils/test-config';
import { LoginForm } from './LoginForm';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

describe('LoginForm Property Tests', () => {
  runPropertyTest(
    30,
    'Invalid Email Formats Are Rejected',
    fc.record({
      invalidEmail: fc
        .string({ minLength: 1, maxLength: 50 })
        .filter((value) => !emailRegex.test(value)),
      validPassword: fc.string({ minLength: 6, maxLength: 40 }),
    }),
    async ({ invalidEmail, validPassword }) => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);

      render(<LoginForm onSubmit={onSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      const form = submitButton.closest('form');
      expect(form).toBeTruthy();

      fireEvent.change(emailInput, { target: { value: invalidEmail } });
      fireEvent.change(passwordInput, { target: { value: validPassword } });
      fireEvent.submit(form!);

      expect(
        await screen.findByText(/email is required|invalid email address/i)
      ).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    }
  );

  runPropertyTest(
    31,
    'Short Passwords Are Rejected',
    fc.record({
      validEmail: fc.emailAddress(),
      shortPassword: fc.string({ minLength: 1, maxLength: 5 }),
    }),
    async ({ validEmail, shortPassword }) => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);

      render(<LoginForm onSubmit={onSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      const form = submitButton.closest('form');
      expect(form).toBeTruthy();

      fireEvent.change(emailInput, { target: { value: validEmail } });
      fireEvent.change(passwordInput, { target: { value: shortPassword } });
      fireEvent.submit(form!);

      expect(
        await screen.findByText(/password is required|password must be at least 6 characters/i)
      ).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    }
  );

  runPropertyTest(
    32,
    'Loading State Disables Interaction',
    fc.constant(null),
    () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);

      render(<LoginForm onSubmit={onSubmit} isLoading />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      const passwordInput = screen.getByPlaceholderText(/enter your password/i) as HTMLInputElement;
      const rememberMeCheckbox = screen.getByLabelText(/remember me/i) as HTMLInputElement;
      const forgotPasswordButton = screen.getByRole('button', { name: /forgot password/i });

      expect(emailInput.disabled).toBe(true);
      expect(passwordInput.disabled).toBe(true);
      expect(rememberMeCheckbox.disabled).toBe(true);
      expect(forgotPasswordButton).toBeDisabled();

      expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    }
  );

  runPropertyTest(
    33,
    'Valid Data Submits Successfully',
    fc.record({
      validEmail: fc.emailAddress(),
      validPassword: fc.string({ minLength: 6, maxLength: 40 }),
      rememberMe: fc.boolean(),
    }),
    async ({ validEmail, validPassword, rememberMe }) => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);

      render(<LoginForm onSubmit={onSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const rememberMeCheckbox = screen.getByLabelText(/remember me/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      const form = submitButton.closest('form');
      expect(form).toBeTruthy();

      fireEvent.change(emailInput, { target: { value: validEmail } });
      fireEvent.change(passwordInput, { target: { value: validPassword } });

      if (rememberMe) {
        fireEvent.click(rememberMeCheckbox);
      }

      fireEvent.submit(form!);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          email: validEmail,
          password: validPassword,
          rememberMe,
        });
      });
    }
  );

  runPropertyTest(
    34,
    'Field Error Clears On Change',
    fc.record({
      invalidEmail: fc
        .string({ minLength: 1, maxLength: 50 })
        .filter((value) => value.trim().length > 0 && !emailRegex.test(value)),
      validPassword: fc.string({ minLength: 6, maxLength: 40 }),
      correctedEmail: fc.emailAddress(),
    }),
    async ({ invalidEmail, validPassword, correctedEmail }) => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);

      render(<LoginForm onSubmit={onSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      const form = submitButton.closest('form');
      expect(form).toBeTruthy();

      fireEvent.change(emailInput, { target: { value: invalidEmail } });
      fireEvent.change(passwordInput, { target: { value: validPassword } });
      fireEvent.submit(form!);

      expect(await screen.findByText(/invalid email address/i)).toBeInTheDocument();

      fireEvent.change(emailInput, { target: { value: correctedEmail } });

      await waitFor(() => {
        expect(screen.queryByText(/invalid email address/i)).not.toBeInTheDocument();
      });
    }
  );

  runPropertyTest(
    35,
    'Remember Me Checkbox Tracks State',
    fc.record({
      initialState: fc.boolean(),
      shouldToggle: fc.boolean(),
    }),
    ({ initialState, shouldToggle }) => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      render(<LoginForm onSubmit={onSubmit} initialRememberMe={initialState} />);

      const rememberMeCheckbox = screen.getByLabelText(/remember me/i) as HTMLInputElement;
      expect(rememberMeCheckbox.checked).toBe(initialState);

      if (shouldToggle) {
        fireEvent.click(rememberMeCheckbox);
        expect(rememberMeCheckbox.checked).toBe(!initialState);
      }
    }
  );
});
