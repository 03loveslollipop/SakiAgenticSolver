// NotFoundPage.tsx - 8-bit styled 404 page
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button/Button';
import { Container } from '../components/Container/Container';

const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();
  const terminalLines = [
    t('notFound.terminal.error'),
    t('notFound.terminal.resourceMissing'),
    t('notFound.terminal.possibleCauses'),
    t('notFound.terminal.causeInvalidUrl'),
    t('notFound.terminal.causeMovedDeleted'),
    t('notFound.terminal.causeTypo'),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-darkPurple via-accent-pink to-primary-yellow flex items-center justify-center p-4">
      <Container variant="dark" padding="lg" className="max-w-2xl text-center">
        <div className="mb-8">
          <h1 className="font-pixel text-6xl text-accent-cyan mb-4">404</h1>
          <h2 className="font-pixel text-2xl text-white mb-6">{t('notFound.title')}</h2>
          <div className="inline-block border-4 border-accent-pink p-4 mb-6 text-left">
            <div className="font-pixel text-sm text-white space-y-2">
              {terminalLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/">
            <Button variant="primary" className="px-8 py-3">
              {t('notFound.actions.home')}
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="normal" className="px-8 py-3">
              {t('notFound.actions.dashboard')}
            </Button>
          </Link>
        </div>

        <div className="mt-8">
          <p className="font-pixel text-sm text-neutral-teal">
            {t('notFound.support')}
          </p>
        </div>
      </Container>
    </div>
  );
};

export default NotFoundPage;
