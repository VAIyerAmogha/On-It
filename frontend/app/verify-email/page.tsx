'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { apiFetch, resendVerificationEmail } from '../../lib/api';
import Button from '../../components/Button';
import { Input } from '../../components/Input';
import { Card, CardBody } from '../../components/Card';
import { useToast } from '../../context/ToastContext';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { showToast } = useToast();
  
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
        if (isMounted) {
          setStatus('success');
          showToast('Email verified successfully', 'success');
        }
      })
      .catch(() => {
        if (isMounted) {
          setStatus('error');
          showToast('Verification link expired or invalid', 'error');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token, showToast]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setResendStatus('loading');
    try {
      await resendVerificationEmail(email);
      setResendStatus('sent');
      showToast('Verification email sent', 'success');
      setTimeout(() => setResendStatus('idle'), 5000);
    } catch (err) {
      setResendStatus('sent');
      setTimeout(() => setResendStatus('idle'), 5000);
    }
  };

  if (status === 'loading') {
    return (
      <Card variant="glass" className="w-full max-w-md mx-auto">
        <CardBody className="flex flex-col items-center justify-center p-8 min-h-[300px]">
          <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
          <h1 className="text-xl font-medium text-text-primary">Verifying your email...</h1>
        </CardBody>
      </Card>
    );
  }

  if (status === 'success') {
    return (
      <Card variant="glass" className="w-full max-w-md mx-auto">
        <CardBody className="flex flex-col items-center p-8">
          <div className="w-16 h-16 bg-success/15 border border-success/30 rounded-full flex items-center justify-center mb-6 text-success">
            <CheckCircle2 className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-center text-text-primary mb-2">Email Verified</h1>
          <p className="text-text-secondary text-sm text-center mb-8">
            Your email address has been successfully verified. You can now sign in to your account.
          </p>
          <Link href="/auth/login" className="w-full">
            <Button variant="primary" className="w-full">
              Go to Login
            </Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  // Error state
  return (
    <Card variant="glass" className="w-full max-w-md mx-auto">
      <CardBody className="flex flex-col items-center p-8">
        <div className="w-16 h-16 bg-danger/15 border border-danger/30 rounded-full flex items-center justify-center mb-6 text-danger">
          <XCircle className="w-8 h-8" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-bold text-center text-text-primary mb-2">Link Expired or Invalid</h1>
        <p className="text-text-secondary text-sm text-center mb-6">
          This verification link is no longer valid. Enter your email below to receive a new one.
        </p>

        <form onSubmit={handleResend} className="w-full space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
          <Button
            type="submit"
            variant="secondary"
            isLoading={resendStatus === 'loading'}
            className="w-full"
          >
            {resendStatus === 'sent' ? 'Verification email sent!' : 'Resend verification email'}
          </Button>
        </form>
        
        <div className="mt-8 text-center">
          <Link href="/auth/login" className="text-sm font-semibold text-accent hover:underline">
            Back to Login
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <Card variant="glass" className="w-full max-w-md mx-auto">
          <CardBody className="flex flex-col items-center justify-center p-8 min-h-[300px]">
            <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
          </CardBody>
        </Card>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
