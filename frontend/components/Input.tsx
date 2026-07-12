'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  isMono?: boolean;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  rows?: number;
}

export function Input({
  label,
  error,
  isMono = false,
  className = '',
  id,
  type = 'text',
  ...props
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={`w-full bg-white border ${
          error ? 'border-danger' : 'border-border-default'
        } rounded-md px-4 py-2.5 text-text-primary placeholder:text-text-muted transition-all duration-base ease-standard focus:outline-none focus:border-border-accent focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)] disabled:opacity-40 disabled:cursor-not-allowed ${
          isMono ? 'font-mono' : 'font-sans'
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs font-normal text-danger mt-1">{error}</span>}
    </div>
  );
}

export function Textarea({
  label,
  error,
  rows = 4,
  className = '',
  id,
  ...props
}: TextareaProps) {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        className={`w-full bg-white border ${
          error ? 'border-danger' : 'border-border-default'
        } rounded-md px-4 py-2.5 text-text-primary placeholder:text-text-muted transition-all duration-base ease-standard focus:outline-none focus:border-border-accent focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)] disabled:opacity-40 disabled:cursor-not-allowed font-sans ${className}`}
        {...props}
      />
      {error && <span className="text-xs font-normal text-danger mt-1">{error}</span>}
    </div>
  );
}
