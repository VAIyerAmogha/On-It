'use client';

import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

export default function Skeleton({
  className = '',
  variant = 'rect',
  ...props
}: SkeletonProps) {
  const baseClass = 'shimmer';
  
  const variants = {
    text: 'h-4 w-full rounded',
    rect: 'w-full rounded-md',
    circle: 'rounded-full shrink-0'
  };

  return (
    <div
      className={`${baseClass} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
