'use client';

import React from 'react';

export type BadgeStatus = 'PENDING' | 'TRIGGERED' | 'INVOICED' | 'PAID' | 'OVERDUE' | 'SENT';

interface BadgeProps {
  status: BadgeStatus | string;
  className?: string;
}

export default function Badge({ status, className = '' }: BadgeProps) {
  const normalizedStatus = status.toUpperCase().replace(' ', '_');

  const styles: Record<string, string> = {
    PENDING: 'bg-[#F5F5F4] text-status-pending',
    TRIGGERED: 'bg-warning-subtle text-warning',
    INVOICED: 'bg-info-subtle text-status-invoiced',
    PAID: 'bg-success-subtle text-status-paid',
    OVERDUE: 'bg-danger-subtle text-status-overdue',
    SENT: 'bg-info-subtle text-status-invoiced'
  };

  const currentStyle = styles[normalizedStatus] || 'bg-bg-elevated text-text-secondary';

  return (
    <span
      className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${currentStyle} shrink-0 select-none ${className}`}
    >
      {normalizedStatus.replace('_', ' ')}
    </span>
  );
}
