'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/lib/store';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { UserCheck, ShieldAlert, LogIn, Loader2 } from 'lucide-react';

interface GuestAutoJoinProps {
  code: string;
  onCancel: () => void;
}

export function GuestAutoJoin({ code, onCancel }: GuestAutoJoinProps) {
  const { login } = useWorkspace();
  const [status, setStatus] = useState<'idle' | 'joining' | 'authenticating' | 'error'>('joining');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    const performGuestJoin = async () => {
      try {
        // Step 1: Create guest account and join workspace via API
        if (active) setStatus('joining');
        const joinRes = await fetch('/api/invites/guest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        const joinData = await joinRes.json();

        if (!joinRes.ok || !joinData.ok) {
          throw new Error(joinData.error || 'Failed to auto-join workspace.');
        }

        const { email, password } = joinData;

        // Step 2: Log in with the newly created credentials
        if (active) setStatus('authenticating');
        const loginSuccess = await login(email, password);

        if (!loginSuccess) {
          throw new Error('Failed to log in with guest credentials.');
        }

        toast.success('Successfully joined the team workspace!');
      } catch (err: any) {
        console.error('Guest auto-join error:', err);
        if (active) {
          setStatus('error');
          setErrorMessage(err.message || 'An error occurred while setting up your guest account.');
          toast.error(err.message || 'Auto-join failed.');
        }
      }
    };

    performGuestJoin();

    return () => {
      active = false;
    };
  }, [code, login]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f7f6f3] dark:bg-[#121212] p-4 relative overflow-hidden transition-colors duration-300">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-500/10 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-[100px]" />

      <div className="w-full max-w-[440px] bg-white dark:bg-[#1c1c1c] border border-[#e9e9e7] dark:border-[#2d2d2d] rounded-2xl p-8 shadow-notion relative z-10 flex flex-col items-center text-center gap-6 transition-all duration-300">
        
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <img src="/logo.png" className="w-12 h-12 object-contain" alt="Nexus AI Logo" />
          <h1 className="text-xl font-bold tracking-tight text-[#37352f] dark:text-[#e3e3e2] mt-2">
            Workspace Invitation
          </h1>
          <p className="text-xs text-muted-foreground max-w-[300px]">
            Checking invite code and configuring your connection...
          </p>
        </div>

        {/* Status Area */}
        <div className="w-full py-6 flex flex-col items-center justify-center gap-4 border border-[#e9e9e7]/60 dark:border-[#2d2d2d]/60 bg-[#fcfcfb] dark:bg-[#252525] rounded-xl">
          {status === 'joining' && (
            <>
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-xs text-[#37352f] dark:text-[#e3e3e2] font-semibold animate-pulse">
                Setting up your guest profile...
              </p>
            </>
          )}

          {status === 'authenticating' && (
            <>
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-xs text-[#37352f] dark:text-[#e3e3e2] font-semibold">
                Authenticating session...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="px-4">
                <p className="text-xs text-red-600 dark:text-red-400 font-bold mb-1">
                  Unable to Join
                </p>
                <p className="text-[10px] text-muted-foreground max-w-[280px]">
                  {errorMessage}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="w-full flex flex-col gap-2 mt-2">
          {status === 'error' ? (
            <Button
              onClick={onCancel}
              className="w-full bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 shadow-sm transition-all text-xs font-bold py-2"
            >
              <LogIn className="w-3.5 h-3.5 mr-2" />
              Go to Login Page
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={onCancel}
              className="w-full text-xs text-muted-foreground hover:text-foreground font-semibold py-2"
            >
              Cancel and Sign In
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
