'use client';

import { useEffect } from 'react';

export function HealthPing() {
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    fetch(`${url}/health`).catch(() => {
      // Ignore errors, this is just a wake-up ping
    });
  }, []);
  
  return null;
}
