// GlobalLoadingIndicator.tsx - Shows loading indicator when any API call is in progress
import React from 'react';
import { useLoading } from '../contexts/LoadingContext';
import { Loading } from './Loading/Loading';

const GlobalLoadingIndicator: React.FC = () => {
  const { getLoadingCount } = useLoading();
  const isLoading = getLoadingCount() > 0;

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative">
        <div className="absolute -inset-2 bg-accent-pink opacity-20 rounded-full animate-ping"></div>
        <div className="relative bg-neutral-darkPurple border-4 border-accent-cyan rounded-full p-2">
          <Loading size="sm" text="" />
        </div>
        <div className="absolute -top-2 -right-2 bg-accent-cyan text-white font-pixel text-xs rounded-full w-6 h-6 flex items-center justify-center border-2 border-white">
          {getLoadingCount()}
        </div>
      </div>
    </div>
  );
};

export default GlobalLoadingIndicator;