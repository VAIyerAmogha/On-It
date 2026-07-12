'use client';

import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { resendVerificationEmail } from '../../../lib/api';
import Button from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Card, CardBody } from '../../../components/Card';
import { useToast } from '../../../context/ToastContext';

export default function LoginPage() {
  const { login, googleLogin } = useAuth();
  const { showToast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    setIsLoading(true);
    try {
      await login(email, password);
      showToast('Logged in successfully', 'success');
    } catch (err: any) {
      if (err.message === 'EMAIL_NOT_VERIFIED') {
        setNeedsVerification(true);
      } else {
        setError(err.message || 'Failed to login');
        showToast(err.message || 'Failed to login', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setResendStatus('loading');
    try {
      await resendVerificationEmail(email);
      setResendStatus('sent');
      showToast('Verification email resent', 'success');
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
        showToast('Logged in with Google', 'success');
      }
    } catch (err: any) {
      setError(err.message || 'Google sign in failed');
      showToast(err.message || 'Google sign in failed', 'error');
    }
  };

  if (needsVerification) {
    return (
      <Card variant="glass" className="w-full max-w-md mx-auto">
        <CardBody className="flex flex-col items-center p-8">
          <div className="w-16 h-16 bg-accent-subtle border border-accent/20 rounded-full flex items-center justify-center mb-6 text-accent">
            <Mail className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-center text-text-primary mb-2">Please verify your email</h1>
          <p className="text-text-secondary text-sm text-center mb-8">
            You need to verify your email address to sign in. We sent a link to <strong className="text-text-primary font-medium">{email}</strong> when you registered.
          </p>

          <Button
            variant="ghost"
            onClick={handleResend}
            disabled={resendStatus !== 'idle'}
            className="mb-8 w-full"
          >
            {resendStatus === 'loading'
              ? 'Sending...'
              : resendStatus === 'sent'
              ? 'Verification email sent!'
              : 'Resend verification email'}
          </Button>

          <Button
            variant="secondary"
            onClick={() => setNeedsVerification(false)}
            className="w-full"
          >
            Back to Login
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="w-full max-w-md mx-auto">
      <CardBody className="p-8">
        <h1 className="text-2xl font-bold text-center text-text-primary mb-1">Welcome Back</h1>
        <p className="text-text-secondary text-sm text-center mb-8">Sign in to your account</p>

        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger p-3.5 rounded-md text-sm mb-6 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="w-full mt-2"
          >
            Sign In
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-4">
          <div className="h-px bg-border-subtle w-full" />
          <span className="text-text-muted text-xs whitespace-nowrap">or continue with</span>
          <div className="h-px bg-border-subtle w-full" />
        </div>

        <div className="mt-6 flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              setError('Google sign in failed. Please try again.');
              showToast('Google sign in failed', 'error');
            }}
            theme="outline"
            size="large"
            text="continue_with"
            shape="rectangular"
          />
        </div>

        <p className="text-center text-xs text-text-secondary mt-8">
          Don't have an account?{' '}
          <Link href="/auth/register" className="text-accent font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
