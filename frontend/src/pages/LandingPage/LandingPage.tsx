// LandingPage.tsx - 8-bit styled landing page
import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { gsap } from 'gsap';
import { Navigation } from '../../components/Navigation';
import { Button } from '../../components/Button';
import { Container } from '../../components/Container';
import { useResponsive } from '../../hooks/useResponsive';

const HeroPixelAnimation = lazy(() => import('../../components/PixelArt').then((module) => ({ default: module.HeroPixelAnimation })));

const HERO_TYPED_FALLBACK = 'Automate AI Agents pipelines and environments for security usecases';
const LATIN_BRAND = 'SAKI';
const JP_BRAND = '\u54b2\u5e0c';

type ActiveLine = 'brand' | 'none';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { t } = useTranslation();
  const isTestEnv =
    (globalThis as any).process?.env?.NODE_ENV === 'test' ||
    typeof (globalThis as any).jest !== 'undefined' ||
    (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent));
  const localizedBrand = t('common.brandName', { defaultValue: 'Saki' }).trim();
  const heroBrandText = localizedBrand === JP_BRAND ? JP_BRAND : LATIN_BRAND;
  const brandSequence = useMemo(
    () => (heroBrandText === JP_BRAND ? [JP_BRAND, LATIN_BRAND] : [LATIN_BRAND, JP_BRAND]),
    [heroBrandText]
  );
  const heroTypedText = t('landing.newHero.message', { defaultValue: HERO_TYPED_FALLBACK });
  const ctaLogin = t('landing.newHero.ctaLogin', { defaultValue: 'Login' });
  const ctaFeatures = t('landing.newHero.ctaFeatures', { defaultValue: 'Features' });
  const featuresTitle = t('landing.newHero.features.title', { defaultValue: 'Features' });
  const currentYear = new Date().getFullYear();
  const footerText = t('landing.newHero.footer.copyright', {
    year: currentYear,
    defaultValue: `(c) ${currentYear} CTF Automation Platform`,
  });
  const featureCards = [
    {
      title: t('landing.newHero.features.vm.title', { defaultValue: 'VM Management' }),
      description: t('landing.newHero.features.vm.description', { defaultValue: 'Launch and manage virtual machines with ease.' }),
    },
    {
      title: t('landing.newHero.features.security.title', { defaultValue: 'Security' }),
      description: t('landing.newHero.features.security.description', { defaultValue: 'Practice cybersecurity in a safe environment.' }),
    },
    {
      title: t('landing.newHero.features.progress.title', { defaultValue: 'Progress Tracking' }),
      description: t('landing.newHero.features.progress.description', { defaultValue: 'Monitor your learning journey and achievements.' }),
    },
  ];

  const featuresSectionRef = useRef<HTMLElement | null>(null);
  const cursorRef = useRef<HTMLSpanElement | null>(null);
  const brandTextRef = useRef<HTMLSpanElement | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);

  const [brandText, setBrandText] = useState('');
  const [typedText, setTypedText] = useState('');
  const [activeLine, setActiveLine] = useState<ActiveLine>('brand');

  useEffect(() => {
    setBrandText('');
    setTypedText(heroTypedText);
    setActiveLine('brand');

    if (brandTextRef.current) {
      gsap.set(brandTextRef.current, { x: 0, autoAlpha: 1 });
    }

    if (actionsRef.current) {
      gsap.set(actionsRef.current, { autoAlpha: 0, y: 12 });
    }

    if (isTestEnv) {
      setTypedText(heroTypedText);
      setBrandText(brandSequence[0]);
      setActiveLine('none');
      if (actionsRef.current) {
        gsap.set(actionsRef.current, { autoAlpha: 1, y: 0 });
      }
      return undefined;
    }

    const typeState = {
      brandIndex: 0,
    };

    const timeline = gsap.timeline();
    let brandCycleTimeline: gsap.core.Timeline | null = null;
    let activeBrandIndex = 0;

    timeline
      .to(typeState, {
        brandIndex: brandSequence[0].length,
        duration: brandSequence[0].length * 0.24,
        ease: 'none',
        snap: { brandIndex: 1 },
        onUpdate: () => {
          setBrandText(brandSequence[0].slice(0, Math.round(typeState.brandIndex)));
        },
      })
      .add(() => {
        setActiveLine('none');
      }, '+=0.1');

    if (actionsRef.current) {
      timeline.to(actionsRef.current, {
        autoAlpha: 1,
        y: 0,
        duration: 0.45,
        ease: 'power2.out',
      }, '+=0.1');
    }

    timeline.add(() => {
      if (!brandTextRef.current || brandSequence.length < 2) {
        return;
      }

      brandCycleTimeline = gsap.timeline({
        repeat: -1,
        repeatDelay: 1.4,
      });

      brandCycleTimeline
        .to(brandTextRef.current, {
          x: 32,
          autoAlpha: 0,
          duration: 0.36,
          ease: 'power2.in',
        })
        .add(() => {
          activeBrandIndex = (activeBrandIndex + 1) % brandSequence.length;
          setBrandText(brandSequence[activeBrandIndex]);
          if (brandTextRef.current) {
            gsap.set(brandTextRef.current, { x: -32, autoAlpha: 0 });
          }
        })
        .to(brandTextRef.current, {
          x: 0,
          autoAlpha: 1,
          duration: 0.36,
          ease: 'power2.out',
        });
    }, '+=0.2');

    return () => {
      timeline.kill();
      if (brandCycleTimeline) {
        brandCycleTimeline.kill();
      }
    };
  }, [heroTypedText, brandSequence, isTestEnv]);

  useEffect(() => {
    if (activeLine !== 'brand' || !cursorRef.current) {
      return;
    }

    const cursorBlinkTween = gsap.to(cursorRef.current, {
      opacity: 0,
      duration: 0.58,
      ease: 'none',
      repeat: -1,
      yoyo: true,
    });

    return () => {
      cursorBlinkTween.kill();
    };
  }, [activeLine]);

  const navigationItems = [
    { id: 'login', label: t('nav.login'), path: '/login', variant: 'primary' as const },
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
              particleCount={isMobile ? 100 : 300}
              repulsionRadius={isMobile ? 150 : 300}
              repulsionForce={0.6}
              returnSpeed={0.001}
              enablePointerInteraction={!isMobile}
              trackPointerOnWindow={!isMobile}
            />
          </Suspense>
        </div>

        <div className="relative z-10 flex h-full flex-col">
          <Navigation items={navigationItems} />

          <div className="container mx-auto flex flex-1 items-center justify-center px-md py-2xl">
            <div className="w-full max-w-10xl text-center">
              <h1 className="mb-lg font-pixel leading-none tracking-[0.08em] text-primary-yellow text-2xl tablet:text-[96px]">
                <span ref={brandTextRef} className="inline-block">{brandText}</span>
                {activeLine === 'brand' && (
                  <span ref={cursorRef} className="ml-xs inline-block text-accent-cyan">|</span>
                )}
              </h1>

              <h2 className="mx-auto max-w-8xl font-pixel text-lg leading-relaxed text-white tablet:text-[32px]">
                {typedText}
              </h2>

              <div
                ref={actionsRef}
                className={`mt-xl flex ${isMobile ? 'flex-col' : 'flex-row'} items-center justify-center gap-md`}
              >
                <Button
                  variant="primary"
                  onClick={() => navigate('/login')}
                  fullWidth={isMobile}
                >
                  {ctaLogin}
                </Button>
                <Button
                  variant="normal"
                  onClick={handleScrollToFeatures}
                  fullWidth={isMobile}
                >
                  {ctaFeatures}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="relative z-20 min-h-screen bg-white">
        <section ref={featuresSectionRef} id="features" className="border-t-4 border-neutral-teal py-2xl">
          <div className="container mx-auto px-md">
            <h2 className="mb-xl text-center font-pixel text-xl text-neutral-darkPurple">{featuresTitle}</h2>

            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-lg`}>
              {featureCards.map((feature) => (
                <Container key={feature.title} variant="light" padding="lg" className="h-full">
                  <h3 className="mb-md font-pixel text-lg text-neutral-darkPurple">{feature.title}</h3>
                  <p className="font-pixel text-sm leading-relaxed text-neutral-darkPurple">
                    {feature.description}
                  </p>
                </Container>
              ))}
            </div>

            <footer className="mt-2xl border-t-4 border-neutral-teal py-lg">
              <div className="text-center">
                <p className="font-pixel text-sm text-neutral-darkPurple">{footerText}</p>
              </div>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
};
