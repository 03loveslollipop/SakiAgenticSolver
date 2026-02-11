// Button.tsx - 8-bit styled button component with variants
import React from 'react';

export type ButtonVariant = 'normal' | 'primary' | 'success' | 'warning' | 'error';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'normal',
  fullWidth = false,
  children,
  className = '',
  ...props
}) => {
  const baseClasses = 'font-pixel text-sm px-md py-sm border-4 border-solid transition-all hover:translate-y-[-2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    normal: 'bg-neutral-olive border-neutral-teal text-white hover:bg-neutral-teal',
    primary: 'bg-primary-yellow border-accent-cyan text-neutral-darkPurple hover:bg-accent-cyan hover:text-white',
    success: 'bg-accent-cyan border-neutral-teal text-white hover:bg-neutral-teal',
    warning: 'bg-primary-yellow border-neutral-olive text-neutral-darkPurple hover:bg-neutral-olive hover:text-white',
    error: 'bg-accent-pink border-neutral-darkPurple text-white hover:bg-neutral-darkPurple',
  };
  
  const widthClass = fullWidth ? 'w-full' : '';
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
