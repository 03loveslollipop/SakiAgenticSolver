// Loading.tsx - 8-bit styled loading component with animation
import React from 'react';

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  text = 'Loading...',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };
  
  return (
    <div className="flex flex-col items-center justify-center gap-md">
      <div className={`${sizeClasses[size]} relative`}>
        {/* 8-bit style loading animation using CSS */}
        <div className="absolute inset-0 border-4 border-primary-yellow border-t-transparent animate-spin-pixel" />
      </div>
      {text && (
        <span className="font-pixel text-sm text-neutral-teal">
          {text}
        </span>
      )}
    </div>
  );
};
