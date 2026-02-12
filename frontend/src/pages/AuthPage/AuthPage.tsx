// AuthPage.tsx - Authentication page with 8-bit styling
// Note: Only login is supported - user creation is admin-managed
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Container } from '../../components/Container';
import { LoginForm, LoginFormData } from '../../components/LoginForm';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Loading } from '../../components/Loading';
import { useResponsive } from '../../hooks/useResponsive';
import { useAuth } from '../../contexts/AuthContext';

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
            Enter the 6-digit code from your authenticator app.
          </p>
          <Input
            label="Authentication Code"
            name="totpCode"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="000000"
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
              {isLoading ? <Loading size="sm" text="Verifying..." /> : 'Verify'}
            </Button>
          </div>
        </form>
      );
    }

    return (
      <form onSubmit={handle2FASetupSubmit} className="space-y-md">
        <div className="space-y-sm">
          <p className="font-pixel text-xs text-neutral-darkPurple">
            Scan this QR code in your authenticator app, then enter the generated code.
          </p>
          {qrCodeUrl && (
            <div className="p-sm border-4 border-neutral-olive bg-white flex justify-center">
              <img src={qrCodeUrl} alt="2FA QR code" className="max-w-full h-auto" loading="lazy" />
            </div>
          )}
          {secret && (
            <p className="font-pixel text-xs text-neutral-darkPurple break-all">
              Manual code: <code>{secret}</code>
            </p>
          )}
        </div>
        <Input
          label="Authentication Code"
          name="totpCodeSetup"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
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
            {isLoading ? <Loading size="sm" text="Verifying..." /> : 'Complete setup'}
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
        {/* Welcome Section */}
        {!isMobile && (
          <div className="w-1/2 flex items-center justify-center">
            <Container variant="dark" padding="lg">
              <h1 className="font-pixel text-xl text-white mb-lg leading-relaxed">
                {t('auth.login.title')}
              </h1>
              <p className="font-pixel text-sm text-white leading-relaxed">
                Sign in to access your virtual machines and continue your cybersecurity journey
              </p>
              <div className="mt-lg p-sm border-4 border-accent-cyan bg-white">
                <p className="font-pixel text-xs text-neutral-darkPurple">
                  <strong>Note:</strong> User accounts are created by administrators. 
                  If you need access, please contact your administrator.
                </p>
              </div>
            </Container>
          </div>
        )}

        {/* Form Section */}
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
                  <strong>Note:</strong> User accounts are created by administrators. 
                  If you need access, please contact your administrator.
                </p>
              </div>
            )}
          </Container>
        </div>
      </div>
    </div>
  );
};
