// Input.tsx - 8-bit styled input component with validation
import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const inputClasses = `
    w-full px-sm py-sm
    font-pixel text-sm
    border-4 border-solid
    ${error ? 'border-accent-pink' : 'border-neutral-teal'}
    bg-white
    focus:outline-none focus:border-accent-cyan
    disabled:opacity-50 disabled:cursor-not-allowed
  `.trim().replace(/\s+/g, ' ');
  
  return (
    <div className={`flex flex-col gap-xs ${className}`}>
      {label && (
        <label htmlFor={inputId} className="font-pixel text-sm text-neutral-darkPurple">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={inputClasses}
        {...props}
      />
      {error && (
        <span className="font-pixel text-xs text-accent-pink" role="alert">
          {error}
        </span>
      )}
      {helperText && !error && (
        <span className="font-pixel text-xs text-neutral-teal">
          {helperText}
        </span>
      )}
    </div>
  );
};
