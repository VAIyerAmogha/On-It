'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export default function Button({
  children,
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  // Styles based on tokens
  const baseStyle = 'inline-flex items-center justify-center font-medium rounded-md transition-all duration-base ease-standard focus:outline-none select-none disabled:opacity-40 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-gradient-accent text-bg-base hover:bg-none hover:bg-accent-hover active:scale-[0.98]',
    secondary: 'bg-transparent text-text-primary border border-border-default hover:bg-bg-elevated hover:border-border-strong active:scale-[0.98]',
    ghost: 'bg-transparent text-text-secondary border-none hover:bg-bg-elevated hover:text-text-primary active:scale-[0.98]',
    danger: 'bg-danger-subtle text-danger border border-danger hover:bg-[#FECACA] active:scale-[0.98]'
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5'
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span className="opacity-0 w-0 overflow-hidden pointer-events-none select-none">{children}</span>
          <span className="text-xs">Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
