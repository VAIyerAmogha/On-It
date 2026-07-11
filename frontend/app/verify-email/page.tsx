'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { apiFetch, resendVerificationEmail } from '../../lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [email, setEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent'>('idle');

  const verifyPromise = useRef<Promise<any> | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    let isMounted = true;
    
    if (!verifyPromise.current) {
      verifyPromise.current = apiFetch(`/api/auth/verify-email?token=${token}`);
    }
    
    verifyPromise.current
      .then(() => {
        if (isMounted) setStatus('success');
      })
      .catch(() => {
        if (isMounted) setStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
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

  if (status === 'loading') {
    return (
      <div className="glass-surface p-8 rounded-2xl w-full max-w-md mx-auto flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-accent-500 animate-spin mb-4" />
        <h1 className="text-xl font-medium">Verifying your email...</h1>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="glass-surface p-8 rounded-2xl w-full max-w-md mx-auto flex flex-col items-center">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">Email Verified</h1>
        <p className="text-gray-500 text-center mb-8">
          Your email address has been successfully verified. You can now sign in to your account.
        </p>
        <Link 
          href="/auth/login" 
          className="w-full bg-accent-500 hover:bg-accent-600 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  // Error state
  return (
    <div className="glass-surface p-8 rounded-2xl w-full max-w-md mx-auto flex flex-col items-center">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
        <XCircle className="w-8 h-8 text-red-400" />
      </div>
      <h1 className="text-2xl font-bold text-center mb-2">Link Expired or Invalid</h1>
      <p className="text-gray-500 text-center mb-6">
        This verification link is no longer valid. Enter your email below to receive a new one.
      </p>

      <form onSubmit={handleResend} className="w-full space-y-4">
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
        <button
          type="submit"
          disabled={resendStatus !== 'idle'}
          className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2"
        >
          {resendStatus === 'loading' ? 'Sending...' : resendStatus === 'sent' ? 'Verification email sent!' : 'Resend verification email'}
        </button>
      </form>
      
      <div className="mt-8 text-center">
        <Link href="/auth/login" className="text-sm font-medium text-accent-600 dark:text-accent-400 hover:underline transition-colors">
          Back to Login
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="glass-surface p-8 rounded-2xl w-full max-w-md mx-auto flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-accent-500 animate-spin mb-4" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
