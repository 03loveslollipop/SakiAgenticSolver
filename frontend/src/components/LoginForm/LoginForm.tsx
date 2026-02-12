// LoginForm.tsx - 8-bit styled login form component
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [formData, setFormData] = useState<LoginFormData>({
    email: initialEmail,
    password: '',
    rememberMe: initialRememberMe,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [submitError, setSubmitError] = useState<string>('');

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name as keyof LoginFormData]) {
      setErrors((previous) => ({ ...previous, [name]: undefined }));
    }

    if (submitError) {
      setSubmitError('');
    }
  };

  const validateForm = (): boolean => {
    const nextErrors: Partial<Record<keyof LoginFormData, string>> = {};

    if (!formData.email.trim()) {
      nextErrors.email = t('errors.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = t('errors.invalidEmail');
    }

    if (!formData.password) {
      nextErrors.password = t('errors.passwordRequired');
    } else if (formData.password.length < 6) {
      nextErrors.password = t('errors.passwordMinLength');
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError('');

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('errors.loginFailed'));
    }
  };

  const handleForgotPassword = () => {
    alert(t('auth.login.forgotPasswordInfo'));
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-md">
      {submitError && (
        <div className="p-sm border-4 border-accent-pink bg-white">
          <p className="font-pixel text-xs text-accent-pink" role="alert">
            {submitError}
          </p>
        </div>
      )}

      <Input
        label={t('auth.login.email')}
        name="email"
        type="email"
        value={formData.email}
        onChange={handleInputChange}
        error={errors.email}
        placeholder={t('auth.login.emailPlaceholder')}
        required
        disabled={isLoading}
        autoComplete="email"
      />

      <Input
        label={t('auth.login.password')}
        name="password"
        type="password"
        value={formData.password}
        onChange={handleInputChange}
        error={errors.password}
        placeholder={t('auth.login.passwordPlaceholder')}
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
            aria-label={t('auth.login.rememberMe')}
          />
          <span className="font-pixel text-xs text-neutral-darkPurple">
            {t('auth.login.rememberMe')}
          </span>
        </label>
        <button
          type="button"
          onClick={handleForgotPassword}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleForgotPassword();
            }
          }}
          className="font-pixel text-xs text-accent-cyan hover:text-accent-pink disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:ring-offset-2"
          disabled={isLoading}
          aria-label={t('auth.login.forgotPassword')}
          tabIndex={0}
        >
          {t('auth.login.forgotPassword')}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-md">
          <Loading size="md" text={t('auth.login.signingIn')} />
        </div>
      ) : (
        <Button
          type="submit"
          variant="primary"
          fullWidth
          aria-label={t('auth.login.submit')}
        >
          {t('auth.login.submit')}
        </Button>
      )}
    </form>
  );
};
