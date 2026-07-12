'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-dismiss after 4s
    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  }, [dismissToast]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-success shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-danger shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning shrink-0" />,
    info: <Info className="w-5 h-5 text-info shrink-0" />
  };

  const borderColors = {
    success: 'border-success/30',
    error: 'border-danger/30',
    warning: 'border-warning/30',
    info: 'border-info/30'
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Floating Bottom-Right Toast Stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 bg-bg-surface border ${
              borderColors[toast.type]
            } rounded-lg shadow-elevated animate-in slide-in-from-right-5 duration-base ease-spring`}
          >
            {icons[toast.type]}
            <span className="text-sm font-medium text-text-primary flex-1">
              {toast.message}
            </span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 -mr-1 -mt-1 text-text-secondary hover:text-text-primary rounded-full transition-colors hover:bg-bg-elevated cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
