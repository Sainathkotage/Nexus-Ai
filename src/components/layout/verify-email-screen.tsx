'use client';

import React, { useState } from 'react';
import { useWorkspace } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Mail, LogOut, RefreshCw, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export function VerifyEmailScreen() {
  const { user, logout } = useWorkspace();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleOpenGmail = () => {
    window.open('https://mail.google.com', '_blank');
  };

  const handleResendEmail = async () => {
    if (!user?.email) return;
    setResending(true);
    try {
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: redirectTo
        }
      });

      if (error) throw error;
      toast.success('Verification email resent successfully! Check your inbox.');
    } catch (err: any) {
      console.error('Failed to resend verification:', err);
      toast.error(err.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerification = async () => {
    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        const verified = !!(session.user.email_confirmed_at || session.user.confirmed_at);
        if (verified) {
          toast.success('Account verified! Redirecting to setup workspace...');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          return;
        }
      }
      toast.error('Email not verified yet. Please check your inbox and click the verification link.');
    } catch (err) {
      toast.error('Could not verify email status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f7f6f3] dark:bg-[#121212] p-4 relative overflow-hidden transition-colors duration-300">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-500/10 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-[100px]" />

      <div className="w-full max-w-[460px] bg-white dark:bg-[#1c1c1c] border border-[#e9e9e7] dark:border-[#2d2d2d] rounded-2xl p-6 md:p-8 shadow-notion relative z-10 flex flex-col gap-6 transition-all duration-300">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#37352f] dark:text-[#e3e3e2]">
            Verify Your Email
          </h1>
          <p className="text-xs text-muted-foreground max-w-[340px]">
            We sent a verification link to <span className="font-semibold text-foreground">{user?.email}</span>. Click the link in your email to activate your account.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleOpenGmail}
            className="w-full bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 shadow-sm transition-all text-xs font-bold py-2 flex items-center justify-center gap-1.5"
          >
            <span>Open Gmail Inbox</span>
          </Button>

          <Button
            variant="outline"
            disabled={checking}
            onClick={handleCheckVerification}
            className="w-full text-xs font-bold border-border/80 hover:bg-muted/30 flex items-center justify-center gap-1.5"
          >
            {checking ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            )}
            <span>I have verified my email</span>
          </Button>
        </div>

        <div className="border-t border-border/60 my-1" />

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            disabled={resending}
            onClick={handleResendEmail}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1 text-center self-center disabled:opacity-50"
          >
            <Send className="w-3 h-3" />
            {resending ? 'Sending...' : "Didn't receive email? Resend link"}
          </button>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-border/60 pt-4">
          <span className="text-[10px] text-muted-foreground select-none">
            Nexus AI Setup
          </span>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1 text-[10px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 px-2 py-1 rounded transition-colors font-medium"
          >
            <LogOut className="w-3 h-3" />
            Sign Out / Back to Login
          </button>
        </div>

      </div>
    </div>
  );
}
