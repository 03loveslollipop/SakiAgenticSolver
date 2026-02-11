// AuthPage.tsx - Authentication page with 8-bit styling
import React, { useState } from 'react';
import { Container } from '../../components/Container';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Loading } from '../../components/Loading';
import { LoginForm, LoginFormData } from '../../components/LoginForm';
import { useResponsive } from '../../hooks/useResponsive';

type AuthMode = 'login' | 'signup';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const { isMobile } = useResponsive();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    rememberMe: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

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
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      // Handle authentication logic here
    }, 2000);
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
                Welcome to CTF Platform
              </h1>
              <p className="font-pixel text-sm text-white leading-relaxed">
                {mode === 'login' 
                  ? 'Sign in to access your virtual machines and continue your cybersecurity journey'
                  : 'Create an account to start your cybersecurity learning adventure'
                }
              </p>
            </Container>
          </div>
        )}

        {/* Form Section */}
        <div className={`${isMobile ? 'w-full' : 'w-1/2'}`}>
          <Container variant="light" padding="lg">
            <h2 className="font-pixel text-lg text-neutral-darkPurple mb-lg text-center">
              {mode === 'login' ? 'Login' : 'Sign Up'}
            </h2>

            {error && (
              <div className="mb-md p-sm border-4 border-accent-pink bg-white">
                <p className="font-pixel text-xs text-accent-pink">{error}</p>
              </div>
            )}

            {mode === 'login' ? (
              <LoginForm
                onSubmit={handleLoginSubmit}
                isLoading={isLoading}
                initialEmail={formData.email}
                initialRememberMe={formData.rememberMe}
              />
            ) : (
              <form onSubmit={handleSignupSubmit} className="space-y-md">
                <Input
                  label="Name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />

                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />

                <Input
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />

                <Input
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />

                {isLoading ? (
                  <div className="flex justify-center py-md">
                    <Loading size="md" text="Creating account..." />
                  </div>
                ) : (
                  <Button type="submit" variant="primary" fullWidth>
                    Sign Up
                  </Button>
                )}
              </form>
            )}

            <div className="mt-lg text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="font-pixel text-xs text-neutral-darkPurple hover:text-accent-cyan"
                disabled={isLoading}
              >
                {mode === 'login' 
                  ? "Don't have an account? Sign up" 
                  : 'Already have an account? Login'
                }
              </button>
            </div>
          </Container>
        </div>
      </div>
    </div>
  );
};
