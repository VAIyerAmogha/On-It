'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Upload, Settings, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Upload', href: '/contracts/upload', icon: Upload },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-[240px] h-screen fixed left-0 top-0 bg-gradient-dark border-r border-border-dark z-20 flex flex-col justify-between">
      {/* Top Brand Header */}
      <div>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-accent tracking-tight select-none">
            On-It
          </h1>
        </div>
        
        {/* Navigation Items */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-base ease-standard ${
                  isActive
                    ? 'text-accent border-l-2 border-accent bg-[rgba(245,158,11,0.08)]'
                    : 'text-text-inverse-secondary hover:bg-brand-mid hover:text-text-inverse border-l-2 border-transparent'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile and Settings Section */}
      <div className="border-t border-border-dark p-4 bg-transparent">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
              <User className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-text-inverse truncate">
                {user?.name || 'User'}
              </span>
              <span className="text-[10px] text-text-inverse-secondary truncate">
                {user?.email || ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border-dark pt-2.5">
          <ThemeToggle className="text-text-inverse-secondary hover:bg-brand-mid hover:text-text-inverse" />
          <button
            onClick={logout}
            className="p-2 text-text-inverse-secondary hover:text-danger rounded-full transition-colors hover:bg-brand-mid cursor-pointer"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  );
}
