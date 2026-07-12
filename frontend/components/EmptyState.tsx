'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import Button from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 md:p-12 bg-bg-surface border border-border-subtle rounded-lg shadow-card ${className}`}>
      <div className="w-16 h-16 bg-accent-subtle rounded-full flex items-center justify-center mb-6 text-accent">
        <Icon className="w-8 h-8 shrink-0" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-semibold text-text-primary tracking-tight mb-2">
        {title}
      </h3>
      <p className="text-sm text-text-secondary max-w-sm mb-8 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
