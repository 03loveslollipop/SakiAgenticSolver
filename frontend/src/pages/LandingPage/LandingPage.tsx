// LandingPage.tsx - 8-bit styled landing page
import React, { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '../../components/Navigation';
import { Button } from '../../components/Button';
import { Container } from '../../components/Container';
import { Loading } from '../../components/Loading';
import { useResponsive } from '../../hooks/useResponsive';

// Lazy load PixelArt and HeroPixelAnimation components
const PixelArt = lazy(() => import('../../components/PixelArt').then(module => ({ default: module.PixelArt })));
const HeroPixelAnimation = lazy(() => import('../../components/PixelArt').then(module => ({ default: module.HeroPixelAnimation })));

const navigationItems = [
  { id: 'explore', label: 'Explore', path: '/explore', variant: 'normal' as const },
  { id: 'login', label: 'Login', path: '/login', variant: 'primary' as const },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  return (
    <div 
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #5C3947 0%, #DB6495 50%, #DBC70F 100%)',
      }}
    >
      <Navigation items={navigationItems} />
      
      {/* Hero Section */}
      <main className="container mx-auto px-md py-xl">
        <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} items-center justify-between gap-xl`}>
          {/* Hero Content */}
          <div className={`${isMobile ? 'w-full text-center' : 'w-1/2'} space-y-lg`}>
            <h1 className="font-pixel text-2xl text-white leading-relaxed">
              CTF Automation Platform
            </h1>
            <p className="font-pixel text-base text-white leading-relaxed">
              Launch virtual machines, solve challenges, and master cybersecurity skills
            </p>
            
            <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-md ${isMobile ? 'items-stretch' : 'items-center'}`}>
              <Button 
                variant="primary" 
                onClick={() => navigate('/dashboard')}
                fullWidth={isMobile}
              >
                Get Started
              </Button>
              <Button 
                variant="normal" 
                onClick={() => navigate('/explore')}
                fullWidth={isMobile}
              >
                Explore
              </Button>
            </div>
          </div>
          
          {/* Hero Image/Graphic with Interactive Animation */}
          <div className={`${isMobile ? 'w-full' : 'w-1/2'} flex justify-center relative`}>
            <Container variant="dark" padding="lg" className="relative overflow-hidden">
              <div className="w-64 h-64 relative">
                <Suspense fallback={<Loading size="lg" text="Loading animation..." />}>
                  <HeroPixelAnimation 
                    particleCount={200}
                    repulsionRadius={80}
                    repulsionForce={0.6}
                    returnSpeed={0.04}
                  />
                </Suspense>
                {/* Fallback static pixel art for mobile or if animation fails */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Suspense fallback={<Loading size="md" />}>
                    <PixelArt width={200} height={200} variant="hero" />
                  </Suspense>
                </div>
              </div>
            </Container>
          </div>
        </div>
        
        {/* Features Section */}
        <div className="mt-2xl">
          <h2 className="font-pixel text-xl text-white text-center mb-xl">
            Features
          </h2>
          
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-lg`}>
            <Container variant="light" padding="lg">
              <h3 className="font-pixel text-lg text-neutral-darkPurple mb-md">
                🖥️ VM Management
              </h3>
              <p className="font-pixel text-sm text-neutral-darkPurple leading-relaxed">
                Launch and manage virtual machines with ease
              </p>
            </Container>
            
            <Container variant="light" padding="lg">
              <h3 className="font-pixel text-lg text-neutral-darkPurple mb-md">
                🔒 Security
              </h3>
              <p className="font-pixel text-sm text-neutral-darkPurple leading-relaxed">
                Practice cybersecurity in a safe environment
              </p>
            </Container>
            
            <Container variant="light" padding="lg">
              <h3 className="font-pixel text-lg text-neutral-darkPurple mb-md">
                📊 Progress Tracking
              </h3>
              <p className="font-pixel text-sm text-neutral-darkPurple leading-relaxed">
                Monitor your learning journey and achievements
              </p>
            </Container>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t-4 border-neutral-teal bg-neutral-darkPurple py-lg mt-2xl">
        <div className="container mx-auto px-md text-center">
          <p className="font-pixel text-sm text-white">
            © 2024 CTF Automation Platform
          </p>
        </div>
      </footer>
    </div>
  );
};
