'use client';

import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import { Loader2, Mail } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { resendVerificationEmail } from '../../../lib/api';

export default function RegisterPage() {
  const { register, googleLogin } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await register(email, password, name);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setResendStatus('loading');
    try {
      await resendVerificationEmail(email);
      setResendStatus('sent');
      setTimeout(() => setResendStatus('idle'), 5000);
    } catch (err) {
      setResendStatus('sent');
      setTimeout(() => setResendStatus('idle'), 5000);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      if (credentialResponse.credential) {
        await googleLogin(credentialResponse.credential);
      }
    } catch (err: any) {
      setError(err.message || 'Google sign in failed');
    }
  };

  if (isSuccess) {
    return (
      <div className="glass-surface p-8 rounded-2xl w-full max-w-md mx-auto flex flex-col items-center">
        <div className="w-16 h-16 bg-accent-500/10 rounded-full flex items-center justify-center mb-6">
          <Mail className="w-8 h-8 text-accent-500" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">Check your inbox</h1>
        <p className="text-gray-500 text-center mb-8">
          We've sent a verification link to <strong>{email}</strong>. Please click the link to verify your account.
        </p>

        <button
          onClick={handleResend}
          disabled={resendStatus !== 'idle'}
          className="text-sm font-medium text-accent-600 dark:text-accent-400 hover:underline transition-colors disabled:no-underline disabled:opacity-70"
        >
          {resendStatus === 'loading' ? 'Sending...' : resendStatus === 'sent' ? 'Verification email sent!' : 'Resend verification email'}
        </button>

        <div className="mt-8">
          <Link href="/auth/login" className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-2.5 px-6 rounded-lg transition-colors">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-surface p-8 rounded-2xl w-full max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-2">Create Account</h1>
      <p className="text-gray-500 text-center mb-8">Join On-It to manage contracts</p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-accent-500 transition-colors"
            placeholder="Jane Doe"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-accent-500 transition-colors"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-accent-500 transition-colors"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-accent-500 hover:bg-accent-600 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 mt-4"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign Up'}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-center space-x-4">
        <div className="h-px bg-gray-300 dark:bg-gray-700 w-full" />
        <span className="text-gray-500 text-sm whitespace-nowrap">or continue with</span>
        <div className="h-px bg-gray-300 dark:bg-gray-700 w-full" />
      </div>

      <div className="mt-6 flex justify-center">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError('Google sign in failed. Please try again.')}
          theme="outline"
          size="large"
          text="continue_with"
        />
      </div>

      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-accent-600 dark:text-accent-400 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
