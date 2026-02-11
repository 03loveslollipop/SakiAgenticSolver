// AuthPage.tsx - Authentication page with 8-bit styling
// Note: Only login is supported - user creation is admin-managed
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Container } from '../../components/Container';
import { LoginForm, LoginFormData } from '../../components/LoginForm';
import { useResponsive } from '../../hooks/useResponsive';

export const AuthPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const { isMobile } = useResponsive();
  const { t } = useTranslation();

  const handleLoginSubmit = async (loginData: LoginFormData) => {
    setError('');
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Handle authentication logic here
      console.log('Login data:', loginData);
      // In a real app, you would call your authentication API here
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.authFailed'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-md"
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

            {error && (
              <div className="mb-md p-sm border-4 border-accent-pink bg-white">
                <p className="font-pixel text-xs text-accent-pink">{error}</p>
              </div>
            )}

            <LoginForm
              onSubmit={handleLoginSubmit}
              isLoading={isLoading}
            />

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