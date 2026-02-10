// Login component with 2FA support
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

type LoginStep = 'credentials' | '2fa' | '2fa-setup';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginWith2FA, setup2FA } = useAuth();

  const [step, setStep] = useState<LoginStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await login(email, password);

      if (response.requires_2fa_setup) {
        // First-time login, need to set up 2FA
        setQrCodeUrl(response.qr_code_url || '');
        setSecret(response.secret || '');
        setStep('2fa-setup');
      } else {
        // User has 2FA enabled, prompt for code
        setStep('2fa');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await loginWith2FA(email, password, totpCode);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '2FA verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FASetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await setup2FA(email, totpCode);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '2FA setup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('credentials');
    setTotpCode('');
    setError('');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Saki</h1>
          <p className="login-subtitle">Agentic CTF Solver Orchestration</p>
        </div>

        {error && (
          <div className="login-error">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="your.email@example.com"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                disabled={isLoading}
              />
            </div>

            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {step === '2fa' && (
          <form onSubmit={handle2FASubmit} className="login-form">
            <div className="form-info">
              <p>Enter the 6-digit code from your authenticator app</p>
            </div>

            <div className="form-group">
              <label htmlFor="totp">Authentication Code</label>
              <input
                type="text"
                id="totp"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                placeholder="000000"
                maxLength={6}
                pattern="\d{6}"
                autoComplete="one-time-code"
                disabled={isLoading}
                className="totp-input"
              />
            </div>

            <div className="form-actions">
              <button type="button" onClick={handleBack} className="back-button" disabled={isLoading}>
                Back
              </button>
              <button type="submit" className="login-button" disabled={isLoading || totpCode.length !== 6}>
                {isLoading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </form>
        )}

        {step === '2fa-setup' && (
          <form onSubmit={handle2FASetupSubmit} className="login-form">
            <div className="form-info">
              <h3>Set Up Two-Factor Authentication</h3>
              <p>Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
            </div>

            {qrCodeUrl && (
              <div className="qr-code-container">
                <img src={qrCodeUrl} alt="2FA QR Code" className="qr-code" />
              </div>
            )}

            {secret && (
              <div className="secret-container">
                <p className="secret-label">Or enter this code manually:</p>
                <code className="secret-code">{secret}</code>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="totp-setup">Enter the 6-digit code from your app</label>
              <input
                type="text"
                id="totp-setup"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                placeholder="000000"
                maxLength={6}
                pattern="\d{6}"
                autoComplete="one-time-code"
                disabled={isLoading}
                className="totp-input"
              />
            </div>

            <div className="form-actions">
              <button type="button" onClick={handleBack} className="back-button" disabled={isLoading}>
                Back
              </button>
              <button type="submit" className="login-button" disabled={isLoading || totpCode.length !== 6}>
                {isLoading ? 'Verifying...' : 'Complete Setup'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
