'use client';

import ThemeToggle from './ThemeToggle';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 fixed top-0 right-0 left-64 glass-surface border-b z-10 flex items-center justify-between px-8">
      <div></div>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <div className="flex items-center gap-4 pl-4 border-l border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center text-accent-600 dark:text-accent-400">
              <User className="w-4 h-4" />
            </div>
            <span className="font-medium text-sm hidden sm:block">
              {user?.name || user?.email || 'User'}
            </span>
          </div>
          <button 
            onClick={logout}
            className="text-gray-500 hover:text-red-500 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
