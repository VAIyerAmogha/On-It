'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !token && !pathname.startsWith('/auth')) {
      router.push('/auth/login');
    }
  }, [token, isLoading, pathname, router]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // If not authenticated and trying to access protected route, render nothing while redirecting
  if (!token && !pathname.startsWith('/auth')) {
    return null;
  }

  return <>{children}</>;
}
