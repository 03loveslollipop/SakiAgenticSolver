// LandingPage.tsx - 8-bit styled landing page
import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navigation } from '../../components/Navigation';
import { Button } from '../../components/Button';
import { Container } from '../../components/Container';
import { useResponsive } from '../../hooks/useResponsive';

const HeroPixelAnimation = lazy(() => import('../../components/PixelArt').then((module) => ({ default: module.HeroPixelAnimation })));

const HERO_TYPED_TEXT = 'Automate AI Agents pipelines and environments for security usecases';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { t } = useTranslation();
  const featuresSectionRef = useRef<HTMLElement | null>(null);
  const [typedText, setTypedText] = useState('');

  useEffect(() => {
    let charIndex = 0;
    setTypedText('');

    const intervalId = window.setInterval(() => {
      charIndex += 1;
      setTypedText(HERO_TYPED_TEXT.slice(0, charIndex));

      if (charIndex >= HERO_TYPED_TEXT.length) {
        window.clearInterval(intervalId);
      }
    }, 38);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const navigationItems = [
    { id: 'login', label: t('nav.login') || 'Login', path: '/login', variant: 'primary' as const },
  ];

  const handleScrollToFeatures = () => {
    featuresSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="relative min-h-screen bg-white">
      <section
        className="sticky top-0 z-0 h-screen overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #5C3947 0%, #DB6495 50%, #DBC70F 100%)',
        }}
      >
        <div className="absolute inset-0" aria-hidden="true">
          <Suspense fallback={null}>
            <HeroPixelAnimation
              className="opacity-80"
              particleCount={isMobile ? 120 : 260}
              repulsionRadius={isMobile ? 95 : 140}
              repulsionForce={0.7}
              returnSpeed={0.035}
              trackPointerOnWindow={true}
            />
          </Suspense>
        </div>

        <div className="relative z-10 flex h-full flex-col">
          <Navigation items={navigationItems} />

          <div className="container mx-auto flex flex-1 items-center justify-center px-md py-2xl">
            <div className="w-full max-w-5xl text-center">
              <div className="mb-lg inline-block border-4 border-accent-cyan bg-neutral-darkPurple px-lg py-sm shadow-pixel">
                <span className="font-pixel text-base text-primary-yellow">SAKI</span>
              </div>

              <h1 className="mx-auto max-w-4xl font-pixel text-xl leading-relaxed text-white tablet:text-2xl">
                {typedText}
                <span className="inline-block animate-pulse text-accent-cyan">_</span>
              </h1>

              <div className={`mt-xl flex ${isMobile ? 'flex-col' : 'flex-row'} items-center justify-center gap-md`}>
                <Button
                  variant="primary"
                  onClick={() => navigate('/login')}
                  fullWidth={isMobile}
                >
                  Login
                </Button>
                <Button
                  variant="normal"
                  onClick={handleScrollToFeatures}
                  fullWidth={isMobile}
                >
                  Features
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="relative z-20 min-h-screen bg-white">
        <section ref={featuresSectionRef} id="features" className="border-t-4 border-neutral-teal py-2xl">
          <div className="container mx-auto px-md">
            <h2 className="mb-xl text-center font-pixel text-xl text-neutral-darkPurple">Features</h2>

            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-lg`}>
              <Container variant="light" padding="lg" className="h-full">
                <h3 className="mb-md font-pixel text-lg text-neutral-darkPurple">VM Management</h3>
                <p className="font-pixel text-sm leading-relaxed text-neutral-darkPurple">
                  Launch and manage virtual machines with ease.
                </p>
              </Container>

              <Container variant="light" padding="lg" className="h-full">
                <h3 className="mb-md font-pixel text-lg text-neutral-darkPurple">Security</h3>
                <p className="font-pixel text-sm leading-relaxed text-neutral-darkPurple">
                  Practice cybersecurity in a safe environment.
                </p>
              </Container>

              <Container variant="light" padding="lg" className="h-full">
                <h3 className="mb-md font-pixel text-lg text-neutral-darkPurple">Progress Tracking</h3>
                <p className="font-pixel text-sm leading-relaxed text-neutral-darkPurple">
                  Monitor your learning journey and achievements.
                </p>
              </Container>
            </div>

            <footer className="mt-2xl border-t-4 border-neutral-teal py-lg">
              <div className="text-center">
                <p className="font-pixel text-sm text-neutral-darkPurple">(c) © All rights reserved. 2026 - 02Labs - This is just a demo project for educational purposes, not intended for production use. Provided "as is" without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and non-infringement. In no event shall the authors or copyright holders be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.</p>
              </div>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
};
