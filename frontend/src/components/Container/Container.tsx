// Container.tsx - 8-bit styled container component with variants
import React from 'react';

export type ContainerVariant = 'light' | 'dark';

export interface ContainerProps {
  variant?: ContainerVariant;
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export const Container: React.FC<ContainerProps> = ({
  variant = 'light',
  children,
  className = '',
  padding = 'md',
}) => {
  const baseClasses = 'border-4 border-solid';
  
  const variantClasses = {
    light: 'bg-white border-neutral-olive',
    dark: 'bg-neutral-darkPurple border-neutral-teal text-white',
  };
  
  const paddingClasses = {
    sm: 'p-sm',
    md: 'p-md',
    lg: 'p-lg',
  };
  
  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
};
