'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'glass';
  className?: string;
  onClick?: () => void;
}

interface CardHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({
  children,
  variant = 'default',
  className = '',
  onClick,
  ...props
}: CardProps) {
  const baseStyle = 'border transition-all duration-base ease-standard overflow-hidden';
  
  const variants = {
    default: 'bg-gradient-surface border-border-default shadow-card rounded-lg',
    elevated: 'bg-gradient-surface border-border-default shadow-card rounded-lg hover:bg-none hover:bg-bg-elevated hover:border-border-strong hover:shadow-elevated hover:-translate-y-0.5',
    glass: 'glass shadow-card rounded-lg'
  };

  const cursorStyle = onClick ? 'cursor-pointer select-none' : '';

  return (
    <div
      onClick={onClick}
      className={`${baseStyle} ${variants[variant]} ${cursorStyle} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = ''
}: CardHeaderProps) {
  return (
    <div className={`px-6 py-5 border-b border-border-subtle flex items-start justify-between gap-4 ${className}`}>
      <div className="flex-1 min-w-0">
        {typeof title === 'string' ? (
          <h3 className="text-xl font-semibold text-text-primary tracking-tight leading-none">{title}</h3>
        ) : (
          title
        )}
        {subtitle && (
          <p className="text-sm font-medium text-text-secondary mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return <div className={`px-6 py-5 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`px-6 py-4 bg-bg-elevated/40 border-t border-border-subtle flex items-center justify-end gap-3 ${className}`}>
      {children}
    </div>
  );
}
