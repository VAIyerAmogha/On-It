'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { HealthPing } from './HealthPing';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith('/auth');

  if (isAuthRoute) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center p-4">
        {children}
      </main>
    );
  }

  return (
    <>
      <HealthPing />
      <Sidebar />
      <Header />
      <main className="flex-1 ml-64 mt-16 p-8 min-h-[calc(100vh-4rem)] relative z-0">
        {children}
      </main>
    </>
  );
}
