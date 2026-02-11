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
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText && !error ? `${inputId}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;
  
  const inputClasses = `
    w-full px-sm py-sm
    font-pixel text-sm
    border-4 border-solid
    ${error ? 'border-accent-pink' : 'border-neutral-teal'}
    bg-white
    focus:outline-none focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan focus:ring-offset-2
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
        aria-invalid={!!error}
        aria-describedby={describedBy}
        {...props}
      />
      {error && (
        <span id={errorId} className="font-pixel text-xs text-accent-pink" role="alert">
          {error}
        </span>
      )}
      {helperText && !error && (
        <span id={helperId} className="font-pixel text-xs text-neutral-teal">
          {helperText}
        </span>
      )}
    </div>
  );
};
