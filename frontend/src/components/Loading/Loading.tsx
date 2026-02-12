// Loading.tsx - 8-bit styled loading component with animation
import React from 'react';
import { useTranslation } from 'react-i18next';

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  'aria-label'?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  text,
  'aria-label': ariaLabel,
}) => {
  const { t } = useTranslation();
  const resolvedText = text ?? t('common.loading');
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };
  
  return (
    <div 
      className="flex flex-col items-center justify-center gap-md" 
      role="status"
      aria-live="polite"
      aria-label={ariaLabel || resolvedText}
    >
      <div className={`${sizeClasses[size]} relative`} aria-hidden="true">
        {/* 8-bit style loading animation using CSS */}
        <div className="absolute inset-0 border-4 border-primary-yellow border-t-transparent animate-spin-pixel" />
      </div>
      {resolvedText && (
        <span className="font-pixel text-sm text-neutral-teal">
          {resolvedText}
        </span>
      )}
    </div>
  );
};
