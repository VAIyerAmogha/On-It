'use client';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in-up w-full flex-1 flex flex-col">
      {children}
    </div>
  );
}
