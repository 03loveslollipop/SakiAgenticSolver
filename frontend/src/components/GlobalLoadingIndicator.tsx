// GlobalLoadingIndicator.tsx - Shows loading indicator when any API call is in progress
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLoading } from '../contexts/LoadingContext';
import { Loading } from './Loading/Loading';

const GlobalLoadingIndicator: React.FC = () => {
  const { t } = useTranslation();
  const { getLoadingCount } = useLoading();
  const loadingCount = getLoadingCount();
  const isLoading = loadingCount > 0;

  if (!isLoading) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-darkPurple/65 backdrop-blur-sm"
      role="alert"
      aria-live="assertive"
      aria-label={t('app.loadingAria')}
    >
      <div className="relative border-4 border-accent-cyan bg-neutral-darkPurple p-lg shadow-pixel-lg">
        <div className="absolute -inset-2 bg-accent-pink/20 animate-pulse" />
        <div className="relative">
          <Loading size="lg" text={t('common.loading')} />
        </div>
        <div className="absolute -top-3 -right-3 flex h-7 w-7 items-center justify-center border-2 border-white bg-accent-cyan font-pixel text-xs text-white">
          {loadingCount}
        </div>
      </div>
    </div>
  );
};

export default GlobalLoadingIndicator;
