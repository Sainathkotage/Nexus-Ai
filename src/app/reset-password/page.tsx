'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);

  // Check URL parameters and recovery session on mount
  useEffect(() => {
    const initRecoverySession = async () => {
      const urlError = searchParams ? searchParams.get('error') : null;
      if (urlError) {
        if (urlError === 'expired_or_invalid_link') {
          setAuthError('Your password reset link has expired or is invalid. Please request a new one.');
        } else {
          setAuthError('Authentication error. Please request a new password reset link.');
        }
        setIsCheckingAuth(false);
        return;
      }

      const code = searchParams ? searchParams.get('code') : null;
      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.warn('Code exchange failed:', error);
            setAuthError('This password reset link has expired or has already been used.');
            setIsCheckingAuth(false);
            return;
          }
          if (data.session) {
            setHasValidSession(true);
            setIsCheckingAuth(false);
            return;
          }
        } catch (err: any) {
          console.warn('Error during code exchange:', err);
          setAuthError('Failed to verify reset token. Please try again.');
          setIsCheckingAuth(false);
          return;
        }
      }

      // Check if session exists in browser or via hash token
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasValidSession(true);
        } else {
          // Listen for PASSWORD_RECOVERY event if token is in the hash fragment
          const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
              setHasValidSession(true);
              setAuthError(null);
            }
          });

          // Give hash processing a brief moment before concluding no session
          setTimeout(async () => {
            const { data: { session: secondCheck } } = await supabase.auth.getSession();
            if (secondCheck) {
              setHasValidSession(true);
            } else if (!hasValidSession) {
              // If no code and no session, the link may be missing or accessed directly
              setHasValidSession(true); // Allow form submission attempt which Supabase will validate
            }
            setIsCheckingAuth(false);
          }, 800);

          return () => {
            authListener.subscription.unsubscribe();
          };
        }
      } catch (e) {
        console.warn('Session check failed:', e);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    initRecoverySession();
  }, [searchParams]);

  // Password strength calculation
  const hasMinLength = password.length >= 6;
  const hasNumberOrSpecial = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasMinLength) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    setAuthError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password
      });

      if (error) throw error;

      setSuccess(true);
      toast.success('Password updated successfully!');
    } catch (err: any) {
      console.error('Password update error:', err);
      const msg = err?.message || 'Failed to update password. Your reset link may have expired.';
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      <div className="mesh-backdrop" />
      <div className="w-full max-w-[460px] glass p-6 md:p-8 shadow-2xl relative z-10 flex flex-col gap-6 rounded-2xl transition-all duration-300">
        
        {/* Logo and Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <a href={process.env.NEXT_PUBLIC_MARKETING_URL || 'https://aixentrix.com'}>
            <img src="/logo.png" className="w-12 h-12 object-contain cursor-pointer hover:opacity-85 transition-opacity" alt="Nexus AI Logo" />
          </a>
          <h1 className="text-2xl font-bold tracking-tight text-[#37352f] dark:text-[#e3e3e2]">
            {success ? 'Password Reset Complete' : 'Set New Password'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {success 
              ? 'Your password has been successfully updated.' 
              : 'Create a strong, secure new password for your Nexus AI account.'}
          </p>
        </div>

        {/* Content Views */}
        {isCheckingAuth ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Verifying recovery credentials...</p>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center text-center gap-4 p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-bold text-base text-foreground">You are all set!</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your new password is now active. You can proceed directly into your workspace.
              </p>
            </div>
            <Button
              onClick={() => router.push('/')}
              className="w-full mt-2 cursor-pointer"
            >
              Go to Workspace
            </Button>
          </div>
        ) : authError && !hasValidSession ? (
          <div className="flex flex-col items-center text-center gap-4 p-5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm text-foreground">Reset Link Invalid</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {authError}
              </p>
            </div>
            <div className="flex gap-2 w-full mt-1">
              <Button
                variant="outline"
                onClick={() => router.push('/?auth=signin')}
                className="flex-1 text-xs cursor-pointer"
              >
                Sign In
              </Button>
              <Button
                onClick={() => router.push('/?auth=forgot')}
                className="flex-1 text-xs cursor-pointer"
              >
                Request New Link
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {authError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {/* New Password Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">New Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border/40 bg-black/[0.03] dark:bg-white/[0.05] pl-9 pr-10 py-2 text-sm transition-all duration-150 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:text-muted-foreground/60"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1 hover:bg-muted dark:hover:bg-muted/10 rounded text-muted-foreground transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Confirm New Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border/40 bg-black/[0.03] dark:bg-white/[0.05] pl-9 pr-10 py-2 text-sm transition-all duration-150 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:text-muted-foreground/60"
                  required
                />
              </div>
            </div>

            {/* Password Validation Hints */}
            <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-border/40 bg-black/[0.02] dark:bg-white/[0.02] text-[11px]">
              <span className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Password Requirements:</span>
              <div className="grid grid-cols-2 gap-1 mt-0.5">
                <span className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground/70'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                  6+ characters
                </span>
                <span className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground/70'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${passwordsMatch ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                  Passwords match
                </span>
                <span className={`flex items-center gap-1.5 ${hasNumberOrSpecial ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground/70'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${hasNumberOrSpecial ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                  Number or symbol
                </span>
                <span className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground/70'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${hasUpper ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                  Uppercase letter
                </span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !hasMinLength || (confirmPassword.length > 0 && !passwordsMatch)}
              className="w-full mt-1 cursor-pointer"
            >
              {loading ? 'Updating Password...' : 'Save New Password'}
            </Button>

            <button
              type="button"
              onClick={() => router.push('/?auth=signin')}
              className="text-xs text-center text-muted-foreground hover:text-foreground font-medium py-1 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </button>
          </form>
        )}

        <p className="text-[10px] text-center text-muted-foreground/90 leading-relaxed">
          Need help? Contact your workspace administrator or support.
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
