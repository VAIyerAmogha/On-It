'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  Upload,
  Settings,
  User,
  LogOut,
  FileText,
  Plus,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import ThemeToggle from './ThemeToggle';

interface Contract {
  _id: string;
  title?: string | null;
  project_name: string | null;
  client_name: string | null;
}

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout, token } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);
  const [isContractsOpen, setIsContractsOpen] = useState(false);

  // Fetch contracts dynamically for the dropdown
  useEffect(() => {
    if (!token) return;

    const fetchContracts = async () => {
      setIsLoadingContracts(true);
      try {
        const data = await apiFetch('/api/contracts');
        setContracts(data);
      } catch (error) {
        console.error('Navbar failed to fetch contracts:', error);
      } finally {
        setIsLoadingContracts(false);
      }
    };

    fetchContracts();
  }, [token]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const isDashboardActive = pathname === '/dashboard';
  const isUploadActive = pathname === '/contracts/upload';
  const isSettingsActive = pathname === '/settings';
  const isContractsActive = pathname.startsWith('/contracts') && !isUploadActive;

  if (pathname === '/') {
    return (
      <nav className="h-16 fixed top-0 left-0 right-0 z-30 bg-transparent backdrop-blur-sm px-4 sm:px-8 flex items-center justify-between text-text-primary">
        {/* Brand & Left Section */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <img src="/Logo_cropped.png" alt="On-It Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold text-accent tracking-tight hover:opacity-90 transition-opacity">
              On-It
            </span>
          </Link>
        </div>

        {/* Right Section */}
        <div>
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center font-medium rounded-md transition-all duration-base ease-standard focus:outline-none select-none text-xs px-3 py-1.5 gap-1.5 bg-gradient-accent text-bg-base hover:bg-none hover:bg-accent-hover active:scale-[0.98]"
          >
            Get Started
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="h-16 fixed top-0 left-0 right-0 z-30 bg-bg-surface/85 backdrop-blur-md border-b border-border-subtle px-4 sm:px-8 flex items-center justify-between text-text-primary">
      {/* Brand & Left Section */}
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src="/Logo_cropped.png" alt="On-It Logo" className="w-8 h-8 object-contain" />
          <span className="text-xl font-bold text-accent tracking-tight hover:opacity-90 transition-opacity">
            On-It
          </span>
        </Link>

        {/* Desktop Nav Items */}
        <div className="hidden md:flex items-center gap-1">
          {/* Dashboard Link */}
          <Link
            href="/dashboard"
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isDashboardActive
                ? 'text-accent font-semibold bg-accent/5'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50'
              }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          {/* Contracts Dropdown */}
          <DropdownMenu.Root open={isContractsOpen} onOpenChange={setIsContractsOpen}>
            <DropdownMenu.Trigger asChild>
              <button
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer select-none outline-none ${isContractsActive
                    ? 'text-accent font-semibold bg-accent/5'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50'
                  }`}
              >
                <FileText className="w-4 h-4" />
                <span>Contracts</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 opacity-60 transition-transform duration-base ${isContractsOpen ? 'rotate-180' : ''
                    }`}
                />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="start"
                sideOffset={6}
                className="z-50 min-w-[220px] max-w-[280px] overflow-hidden rounded-md border border-border-default bg-bg-surface p-1 shadow-elevated animate-fade-in-up"
              >
                <Link href="/contracts" className="w-full">
                  <DropdownMenu.Item className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium outline-none transition-colors hover:bg-bg-elevated text-text-primary focus:bg-bg-elevated">
                    <FileText className="w-4 h-4 text-accent" />
                    <span>All Contracts & Timeline</span>
                  </DropdownMenu.Item>
                </Link>

                <Link href="/contracts/upload" className="w-full">
                  <DropdownMenu.Item className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium outline-none transition-colors hover:bg-bg-elevated text-text-primary focus:bg-bg-elevated">
                    <Plus className="w-4 h-4 text-accent" />
                    <span>Upload Contract</span>
                  </DropdownMenu.Item>
                </Link>

                <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-border-subtle" />

                <DropdownMenu.Label className="px-3 py-1.5 text-xs font-semibold text-text-muted">
                  Your Projects
                </DropdownMenu.Label>

                {isLoadingContracts ? (
                  <div className="flex items-center justify-center py-4 text-text-muted">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-xs">Loading projects...</span>
                  </div>
                ) : contracts.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-text-muted">
                    No contracts uploaded yet
                  </div>
                ) : (
                  <div className="max-h-[240px] overflow-y-auto">
                    {contracts.map((contract) => {
                      const title = contract.title || contract.project_name || 'Untitled Project';
                      const isCurrent = pathname === `/contracts/${contract._id}`;
                      return (
                        <Link key={contract._id} href={`/contracts/${contract._id}`} className="w-full">
                          <DropdownMenu.Item
                            className={`relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none transition-colors focus:bg-bg-elevated ${isCurrent
                                ? 'bg-accent/10 text-accent font-semibold'
                                : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                              }`}
                          >
                            <FileText className="w-4 h-4 shrink-0 opacity-70" />
                            <div className="truncate flex flex-col min-w-0">
                              <span className="truncate">{title}</span>
                              <span className="text-[10px] text-text-muted truncate">
                                {contract.client_name || 'Unknown Client'}
                              </span>
                            </div>
                          </DropdownMenu.Item>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* Settings Link */}
          <Link
            href="/settings"
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isSettingsActive
                ? 'text-accent font-semibold bg-accent/5'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50'
              }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>
        </div>
      </div>

      {/* Right Side Section */}
      <div className="flex items-center gap-2 sm:gap-4">

        {/* User Account Dropdown */}
        <div className="hidden md:block pl-2 border-l border-border-subtle">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-2.5 outline-none cursor-pointer group select-none">
                <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:border-accent/40 transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left max-w-[120px]">
                  <span className="text-xs font-semibold text-text-primary truncate">
                    {user?.name || 'User'}
                  </span>
                  <span className="text-[9px] text-text-muted truncate">
                    {user?.email || ''}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-75 transition-opacity" />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-50 min-w-[200px] overflow-hidden rounded-md border border-border-default bg-bg-surface p-1 shadow-elevated animate-fade-in-up"
              >
                <div className="px-3 py-2 text-xs border-b border-border-subtle/50 mb-1">
                  <div className="font-semibold text-text-primary">{user?.name || 'User'}</div>
                  <div className="text-text-muted truncate mt-0.5">{user?.email || ''}</div>
                </div>

                <Link href="/settings" className="w-full">
                  <DropdownMenu.Item className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm text-text-secondary hover:bg-bg-elevated hover:text-text-primary outline-none transition-colors focus:bg-bg-elevated">
                    <Settings className="w-4 h-4 opacity-70" />
                    <span>Settings</span>
                  </DropdownMenu.Item>
                </Link>

                <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-border-subtle" />

                <DropdownMenu.Item
                  onClick={logout}
                  className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm text-danger hover:bg-danger/10 hover:text-danger outline-none transition-colors focus:bg-danger/10 focus:text-danger"
                >
                  <LogOut className="w-4 h-4 opacity-70" />
                  <span>Log out</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-text-muted hover:bg-bg-elevated hover:text-text-primary rounded-md transition-colors cursor-pointer"
          aria-label={isMobileMenuOpen ? 'Close Menu' : 'Open Menu'}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Panel */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 bottom-0 bg-bg-base z-20 border-t border-border-subtle flex flex-col justify-between p-4 animate-fade-in-up">
          <div className="space-y-4">
            <div className="space-y-1">
              <Link
                href="/dashboard"
                className={`flex items-center gap-3 px-4 py-3 rounded-md text-base font-semibold ${isDashboardActive
                    ? 'text-accent bg-accent/5'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                  }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
              </Link>

              <Link
                href="/contracts"
                className={`flex items-center gap-3 px-4 py-3 rounded-md text-base font-semibold ${pathname === '/contracts'
                    ? 'text-accent bg-accent/5'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                  }`}
              >
                <FileText className="w-5 h-5" />
                <span>All Contracts & Timeline</span>
              </Link>

              <Link
                href="/contracts/upload"
                className={`flex items-center gap-3 px-4 py-3 rounded-md text-base font-semibold ${isUploadActive
                    ? 'text-accent bg-accent/5'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                  }`}
              >
                <Upload className="w-5 h-5" />
                <span>Upload Contract</span>
              </Link>

              <Link
                href="/settings"
                className={`flex items-center gap-3 px-4 py-3 rounded-md text-base font-semibold ${isSettingsActive
                    ? 'text-accent bg-accent/5'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                  }`}
              >
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </Link>
            </div>

            {/* Mobile Contracts List */}
            {contracts.length > 0 && (
              <div className="pt-2 border-t border-border-subtle/50">
                <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-muted">
                  Contracts
                </div>
                <div className="max-h-[220px] overflow-y-auto px-2 space-y-1">
                  {contracts.map((contract) => {
                    const title = contract.title || contract.project_name || 'Untitled Project';
                    const isCurrent = pathname === `/contracts/${contract._id}`;
                    return (
                      <Link
                        key={contract._id}
                        href={`/contracts/${contract._id}`}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm truncate ${isCurrent
                            ? 'text-accent font-semibold bg-accent/5'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                          }`}
                      >
                        <FileText className="w-4 h-4 shrink-0 opacity-70" />
                        <span className="truncate">{title}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Footer (User Account & Logout) */}
          <div className="border-t border-border-subtle/50 pt-4 mb-4 space-y-4">
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <User className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-text-primary truncate">
                  {user?.name || 'User'}
                </span>
                <span className="text-xs text-text-muted truncate">
                  {user?.email || ''}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-base font-semibold text-danger hover:bg-danger/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
