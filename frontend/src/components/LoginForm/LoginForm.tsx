// LoginForm.tsx - 8-bit styled login form component
import React, { useState } from 'react';
import { Button } from '../Button';
import { Input } from '../Input';
import { Loading } from '../Loading';

export interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>;
  isLoading?: boolean;
  initialEmail?: string;
  initialRememberMe?: boolean;
}

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  isLoading = false,
  initialEmail = '',
  initialRememberMe = false,
}) => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: initialEmail,
    password: '',
    rememberMe: initialRememberMe,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [submitError, setSubmitError] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name as keyof LoginFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    
    // Clear submit error when user makes any change
    if (submitError) {
      setSubmitError('');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof LoginFormData, string>> = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      setSubmitError(
        error instanceof Error 
          ? error.message 
          : 'Login failed. Please try again.'
      );
      // Re-throw the error so tests can catch it
      throw error;
    }
  };

  const handleForgotPassword = () => {
    // This would typically navigate to a password reset page
    // For now, we'll just show an alert
    alert('Password reset functionality would be implemented here');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-md">
      {submitError && (
        <div className="p-sm border-4 border-accent-pink bg-white">
          <p className="font-pixel text-xs text-accent-pink" role="alert">
            {submitError}
          </p>
        </div>
      )}

      <Input
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleInputChange}
        error={errors.email}
        placeholder="your.email@example.com"
        required
        disabled={isLoading}
        autoComplete="email"
      />

      <Input
        label="Password"
        name="password"
        type="password"
        value={formData.password}
        onChange={handleInputChange}
        error={errors.password}
        placeholder="Enter your password"
        required
        disabled={isLoading}
        autoComplete="current-password"
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-xs cursor-pointer">
          <input
            type="checkbox"
            name="rememberMe"
            checked={formData.rememberMe}
            onChange={handleInputChange}
            disabled={isLoading}
            className="w-4 h-4 cursor-pointer"
            aria-label="Remember me"
          />
          <span className="font-pixel text-xs text-neutral-darkPurple">
            Remember me
          </span>
        </label>
        <button
          type="button"
          onClick={handleForgotPassword}
          className="font-pixel text-xs text-accent-cyan hover:text-accent-pink disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
          aria-label="Forgot password"
        >
          Forgot password?
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-md">
          <Loading size="md" text="Signing in..." />
        </div>
      ) : (
        <Button 
          type="submit" 
          variant="primary" 
          fullWidth
          aria-label="Sign in"
        >
          Sign In
        </Button>
      )}
    </form>
  );
};