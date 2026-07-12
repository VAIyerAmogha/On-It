'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { HealthPing } from './HealthPing';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith('/auth');
  const isLandingRoute = pathname === '/';

  if (isLandingRoute) {
    return <>{children}</>;
  }

  if (isAuthRoute) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center p-4 bg-bg-base">
        {children}
      </main>
    );
  }

  return (
    <>
      <HealthPing />
      <Sidebar />
      <main className="flex-1 ml-[240px] p-8 min-h-screen relative z-0 bg-bg-base">
        <div className="max-w-5xl mx-auto w-full animate-fade-in-up">
          {children}
        </div>
      </main>
    </>
  );
}
