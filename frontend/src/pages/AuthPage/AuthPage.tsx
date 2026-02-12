// AuthPage.tsx - Authentication page with 8-bit styling
// Note: Only login is supported - user creation is admin-managed
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Container } from '../../components/Container';
import { Input } from '../../components/Input';
import { Loading } from '../../components/Loading';
import { LoginForm, LoginFormData } from '../../components/LoginForm';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';

type AuthStep = 'credentials' | '2fa' | '2fa-setup';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginWith2FA, setup2FA } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [step, setStep] = useState<AuthStep>('credentials');
  const [totpCode, setTotpCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState(() => localStorage.getItem('remembered_email') || '');
  const [pendingPassword, setPendingPassword] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const { isMobile } = useResponsive();
  const { t } = useTranslation();

  const handleLoginSubmit = async (loginData: LoginFormData) => {
    setError('');
    setIsLoading(true);

    try {
      if (loginData.rememberMe) {
        localStorage.setItem('remembered_email', loginData.email);
      } else {
        localStorage.removeItem('remembered_email');
      }

      setPendingEmail(loginData.email);
      setPendingPassword(loginData.password);

      const response = await login(loginData.email, loginData.password);
      setTotpCode('');

      if (response.requires_2fa_setup) {
        setQrCodeUrl(response.qr_code_url || '');
        setSecret(response.secret || '');
        setStep('2fa-setup');
        return;
      }

      setStep('2fa');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.authFailed'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await loginWith2FA(pendingEmail, pendingPassword, totpCode);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.authFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASetupSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await setup2FA(pendingEmail, totpCode);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.authFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setTotpCode('');
    setQrCodeUrl('');
    setSecret('');
    setError('');
  };

  const renderStep = () => {
    if (step === 'credentials') {
      return (
        <LoginForm
          key={`credentials-${pendingEmail}`}
          onSubmit={handleLoginSubmit}
          isLoading={isLoading}
          initialEmail={pendingEmail}
          initialRememberMe={!!pendingEmail}
        />
      );
    }

    if (step === '2fa') {
      return (
        <form onSubmit={handle2FASubmit} className="space-y-md">
          <p className="font-pixel text-xs text-neutral-darkPurple">
            {t('auth.twoFactor.enterCode')}
          </p>
          <Input
            label={t('auth.twoFactor.codeLabel')}
            name="totpCode"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder={t('auth.twoFactor.codePlaceholder')}
            value={totpCode}
            onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            disabled={isLoading}
            autoComplete="one-time-code"
          />
          <div className="flex gap-sm">
            <Button type="button" variant="normal" onClick={handleBackToCredentials} disabled={isLoading}>
              {t('common.back')}
            </Button>
            <Button type="submit" variant="primary" fullWidth disabled={isLoading || totpCode.length !== 6}>
              {isLoading
                ? <Loading size="sm" text={t('auth.twoFactor.verifying')} />
                : t('auth.twoFactor.verify')}
            </Button>
          </div>
        </form>
      );
    }

    return (
      <form onSubmit={handle2FASetupSubmit} className="space-y-md">
        <div className="space-y-sm">
          <p className="font-pixel text-xs text-neutral-darkPurple">
            {t('auth.twoFactor.setupInstructions')}
          </p>
          {qrCodeUrl && (
            <div className="p-sm border-4 border-neutral-olive bg-white flex justify-center">
              <img
                src={qrCodeUrl}
                alt={t('auth.twoFactor.qrAlt')}
                className="max-w-full h-auto"
                loading="lazy"
              />
            </div>
          )}
          {secret && (
            <p className="font-pixel text-xs text-neutral-darkPurple break-all">
              {t('auth.twoFactor.manualCode')}: <code>{secret}</code>
            </p>
          )}
        </div>
        <Input
          label={t('auth.twoFactor.codeLabel')}
          name="totpCodeSetup"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          placeholder={t('auth.twoFactor.codePlaceholder')}
          value={totpCode}
          onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          required
          disabled={isLoading}
          autoComplete="one-time-code"
        />
        <div className="flex gap-sm">
          <Button type="button" variant="normal" onClick={handleBackToCredentials} disabled={isLoading}>
            {t('common.back')}
          </Button>
          <Button type="submit" variant="primary" fullWidth disabled={isLoading || totpCode.length !== 6}>
            {isLoading
              ? <Loading size="sm" text={t('auth.twoFactor.verifying')} />
              : t('auth.twoFactor.completeSetup')}
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-md py-xl tablet:px-xl"
      style={{
        background: 'linear-gradient(135deg, #5C3947 0%, #DB6495 100%)',
      }}
    >
      <div className={`w-full max-w-6xl flex ${isMobile ? 'flex-col' : 'flex-row'} gap-lg`}>
        {!isMobile && (
          <div className="w-1/2 flex items-center justify-center">
            <Container variant="dark" padding="lg">
              <h1 className="font-pixel text-xl text-white mb-lg leading-relaxed">
                {t('auth.login.title')}
              </h1>
              <p className="font-pixel text-sm text-white leading-relaxed">
                {t('auth.login.welcomeDescription')}
              </p>
              <div className="mt-lg p-sm border-4 border-accent-cyan bg-white">
                <p className="font-pixel text-xs text-neutral-darkPurple">
                  <strong>{t('auth.note.title')}</strong> {t('auth.note.body')}
                </p>
              </div>
            </Container>
          </div>
        )}

        <div className={`${isMobile ? 'w-full' : 'w-1/2'}`}>
          <Container variant="light" padding="lg">
            <h2 className="font-pixel text-lg text-neutral-darkPurple mb-lg text-center">
              {t('auth.login.title')}
            </h2>

            {error && step !== 'credentials' && (
              <div className="mb-md p-sm border-4 border-accent-pink bg-white">
                <p className="font-pixel text-xs text-accent-pink">{error}</p>
              </div>
            )}

            {renderStep()}

            {isMobile && (
              <div className="mt-lg p-sm border-4 border-accent-cyan bg-white">
                <p className="font-pixel text-xs text-neutral-darkPurple">
                  <strong>{t('auth.note.title')}</strong> {t('auth.note.body')}
                </p>
              </div>
            )}
          </Container>
        </div>
      </div>
    </div>
  );
};
