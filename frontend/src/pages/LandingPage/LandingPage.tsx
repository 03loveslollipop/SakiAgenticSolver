// LandingPage.tsx - 8-bit styled landing page
import React, { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navigation } from '../../components/Navigation';
import { Button } from '../../components/Button';
import { Container } from '../../components/Container';
import { Loading } from '../../components/Loading';
import { useResponsive } from '../../hooks/useResponsive';

// Lazy load PixelArt and HeroPixelAnimation components
const PixelArt = lazy(() => import('../../components/PixelArt').then((module) => ({ default: module.PixelArt })));
const HeroPixelAnimation = lazy(() => import('../../components/PixelArt').then((module) => ({ default: module.HeroPixelAnimation })));

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { t } = useTranslation();

  const navigationItems = [
    { id: 'explore', label: t('nav.explore'), path: '/explore', variant: 'normal' as const },
    { id: 'login', label: t('nav.login'), path: '/login', variant: 'primary' as const },
  ];

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #5C3947 0%, #DB6495 50%, #DBC70F 100%)',
      }}
    >
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <Suspense fallback={null}>
          <HeroPixelAnimation
            className="opacity-75"
            particleCount={isMobile ? 120 : 260}
            repulsionRadius={isMobile ? 95 : 140}
            repulsionForce={0.7}
            returnSpeed={0.035}
            trackPointerOnWindow={true}
          />
        </Suspense>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Navigation items={navigationItems} />

        <main className="container mx-auto flex w-full flex-1 flex-col px-md py-xl">
          <section className={`flex ${isMobile ? 'flex-col' : 'flex-row'} items-center justify-between gap-xl`}>
            <div className={`${isMobile ? 'w-full text-center' : 'w-1/2'} max-w-2xl space-y-lg`}>
              <h1 className="font-pixel text-2xl text-white leading-relaxed">
                {t('landing.hero.title')}
              </h1>
              <p className="font-pixel text-base text-white leading-relaxed">
                {t('landing.hero.subtitle')}
              </p>

              <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-md ${isMobile ? 'items-stretch' : 'items-center'}`}>
                <Button
                  variant="primary"
                  onClick={() => navigate('/dashboard')}
                  fullWidth={isMobile}
                >
                  {t('landing.hero.ctaJoin')}
                </Button>
                <Button
                  variant="normal"
                  onClick={() => navigate('/explore')}
                  fullWidth={isMobile}
                >
                  {t('landing.hero.ctaExplore')}
                </Button>
              </div>
            </div>

            <div className={`${isMobile ? 'w-full' : 'w-1/2'} flex justify-center`}>
              <Container variant="dark" padding="lg" className="w-full max-w-[420px]">
                <div className="flex aspect-square w-full items-center justify-center">
                  <Suspense fallback={<Loading size="lg" text="Loading artwork..." />}>
                    <PixelArt width={isMobile ? 180 : 260} height={isMobile ? 180 : 260} variant="hero" />
                  </Suspense>
                </div>
              </Container>
            </div>
          </section>

          <section className="mt-2xl">
            <h2 className="mb-xl text-center font-pixel text-xl text-white">
              Features
            </h2>

            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-lg`}>
              <Container variant="light" padding="lg" className="h-full">
                <h3 className="mb-md font-pixel text-lg text-neutral-darkPurple">
                  🖥️ VM Management
                </h3>
                <p className="font-pixel text-sm leading-relaxed text-neutral-darkPurple">
                  Launch and manage virtual machines with ease.
                </p>
              </Container>

              <Container variant="light" padding="lg" className="h-full">
                <h3 className="mb-md font-pixel text-lg text-neutral-darkPurple">
                  🔒 Security
                </h3>
                <p className="font-pixel text-sm leading-relaxed text-neutral-darkPurple">
                  Practice cybersecurity in a safe environment.
                </p>
              </Container>

              <Container variant="light" padding="lg" className="h-full">
                <h3 className="mb-md font-pixel text-lg text-neutral-darkPurple">
                  📊 Progress Tracking
                </h3>
                <p className="font-pixel text-sm leading-relaxed text-neutral-darkPurple">
                  Monitor your learning journey and achievements.
                </p>
              </Container>
            </div>
          </section>
        </main>

        <footer className="border-t-4 border-neutral-teal bg-neutral-darkPurple py-lg">
          <div className="container mx-auto px-md text-center">
            <p className="font-pixel text-sm text-white">
              © 2024 CTF Automation Platform
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};
