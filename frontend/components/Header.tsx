'use client';

import ThemeToggle from './ThemeToggle';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 fixed top-0 right-0 left-64 bg-bg-base border-b border-border-subtle z-10 flex items-center justify-between px-8 text-text-primary">
      <div></div>
      <div className="flex items-center gap-4">
        <ThemeToggle className="text-text-muted hover:bg-bg-elevated hover:text-text-primary" />
        <div className="flex items-center gap-4 pl-4 border-l border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-text-secondary">
              <User className="w-4 h-4" />
            </div>
            <span className="font-medium text-sm hidden sm:block">
              {user?.name || user?.email || 'User'}
            </span>
          </div>
          <button 
            onClick={logout}
            className="text-text-muted hover:text-danger transition-colors cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
