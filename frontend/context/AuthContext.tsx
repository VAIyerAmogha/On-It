'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiFetch } from '../lib/api';

interface User {
  _id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Backend expects JSON payload for login based on LoginRequest model
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData && errorData.detail && typeof errorData.detail === 'object' && errorData.detail.error_code === 'EMAIL_NOT_VERIFIED') {
           throw new Error('EMAIL_NOT_VERIFIED');
        }
        throw new Error(errorData?.detail || 'Invalid credentials');
    }
    const data = await response.json();
    const newToken = data.access_token;
    
    localStorage.setItem('token', newToken);
    setToken(newToken);
    
    try {
      const userData = await apiFetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${newToken}` }
      });
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (e) {
       const fallbackUser = { _id: 'temp', email };
       setUser(fallbackUser); 
       localStorage.setItem('user', JSON.stringify(fallbackUser));
    }

    router.push('/dashboard');
  };

  const googleLogin = async (credential: string) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential })
    });
    
    if (!response.ok) {
        throw new Error('Google sign in failed');
    }
    const data = await response.json();
    const newToken = data.access_token;
    
    localStorage.setItem('token', newToken);
    setToken(newToken);
    
    try {
      const userData = await apiFetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${newToken}` }
      });
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (e) {
       // Proceed anyway if settings fetch fails
    }

    router.push('/dashboard');
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    if (!response.ok) {
       const err = await response.json();
       throw new Error(err.detail || 'Registration failed');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  return (
    <AuthContext.Provider value={{ token, user, login, googleLogin, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
