'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LeftSidebar } from './left-sidebar';
import { RightSidebar } from './right-sidebar';
import { TopBar } from './top-bar';
import { CommandPalette } from './command-palette';
import { useWorkspace } from '@/lib/store';
import { LoginScreen } from './login-screen';
import { GuestAutoJoin } from './guest-auto-join';
import { NoWorkspaceScreen } from './no-workspace-screen';
import { VerifyEmailScreen } from './verify-email-screen';
import { AppShellSkeleton, LoginScreenSkeleton } from './app-shell-skeleton';
import { CustomContextMenu } from './context-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Mail, Copy, ExternalLink, AlertTriangle } from 'lucide-react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { user, emailRedirect, setEmailRedirect, isAppLoading, workspace } = useWorkspace();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const inviteCodeParam = searchParams ? searchParams.get('inviteCode') : null;
  const [guestMode, setGuestMode] = useState(true);

  useEffect(() => {
    if (inviteCodeParam) {
      setGuestMode(true);
    }
  }, [inviteCodeParam]);

  const isLandingPage = pathname === '/landing';
  const isAuthCallbackOrInvite = pathname.startsWith('/auth') || pathname.startsWith('/invite');

  // Synchronous query check directly during render to prevent layout lag or hydration flashes
  const hasAuthParam = searchParams ? !!searchParams.get('auth') : false;
  const hasInviteParam = searchParams ? !!searchParams.get('inviteCode') : false;

  useEffect(() => {
    if (!isAppLoading) {
      const inviteCode = searchParams ? searchParams.get('inviteCode') : null;
      const inviteQuery = inviteCode ? `inviteCode=${inviteCode}` : '';

      if (!user && !isLandingPage && !hasAuthParam && !hasInviteParam && !isAuthCallbackOrInvite) {
        const query = inviteQuery ? `?${inviteQuery}` : '';
        router.push(`/landing${query}`);
      } else if (user && isLandingPage) {
        const query = inviteQuery ? `?${inviteQuery}` : '';
        router.push(`/${query}`);
      }
    }
  }, [user, isAppLoading, isLandingPage, hasAuthParam, hasInviteParam, isAuthCallbackOrInvite, router, searchParams]);

  useEffect(() => {
    if (isLandingPage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLandingPage]);

  if (isLandingPage) {
    return <div className="min-h-screen w-full overflow-x-hidden">{children}</div>;
  }

  if (isAppLoading) {
    if (!user) {
      return <LoginScreenSkeleton />;
    }
    return <AppShellSkeleton />;
  }

  const handleGmailWeb = () => {
    if (!emailRedirect) return;
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailRedirect.to)}&su=${encodeURIComponent(emailRedirect.subject)}&body=${encodeURIComponent(emailRedirect.body)}`;
    window.open(url, '_blank');
    setEmailRedirect(null);
  };

  const handleOutlookWeb = () => {
    if (!emailRedirect) return;
    const url = `https://outlook.live.com/default.aspx?rru=compose&to=${encodeURIComponent(emailRedirect.to)}&subject=${encodeURIComponent(emailRedirect.subject)}&body=${encodeURIComponent(emailRedirect.body)}`;
    window.open(url, '_blank');
    setEmailRedirect(null);
  };

  const handleMailto = () => {
    if (!emailRedirect) return;
    const url = `mailto:${encodeURIComponent(emailRedirect.to)}?subject=${encodeURIComponent(emailRedirect.subject)}&body=${encodeURIComponent(emailRedirect.body)}`;
    window.location.href = url;
    setEmailRedirect(null);
  };

  const handleCopyToClipboard = () => {
    if (!emailRedirect) return;
    navigator.clipboard.writeText(`To: ${emailRedirect.to}\nSubject: ${emailRedirect.subject}\n\n${emailRedirect.body}`);
    toast.success('Email details copied to clipboard!');
    setEmailRedirect(null);
  };

  if (!user) {
    if (hasInviteParam && guestMode && inviteCodeParam) {
      return <GuestAutoJoin code={inviteCodeParam} onCancel={() => setGuestMode(false)} />;
    }
    if (hasAuthParam || hasInviteParam || isAuthCallbackOrInvite) {
      return <LoginScreen />;
    }
    return <LoginScreenSkeleton />;
  }

  if (!user.emailVerified) {
    return <VerifyEmailScreen />;
  }

  if (!workspace) {
    return <NoWorkspaceScreen />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground selection:bg-primary/10">
      <LeftSidebar onOpenSearch={() => setCommandPaletteOpen(true)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopBar />
        <main className="flex-1 overflow-auto relative z-0 flex flex-col">
          {children}
        </main>
      </div>
      <RightSidebar />
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <CustomContextMenu />

      {/* Global Email Client Redirection Dialog */}
      <Dialog open={!!emailRedirect} onOpenChange={(open) => !open && setEmailRedirect(null)}>
        <DialogContent className="sm:max-w-md bg-background border border-border shadow-lg rounded-xl text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              SMTP Server Unconfigured
            </DialogTitle>
            <DialogDescription className="text-xs">
              Outbound mail APIs are not currently set up. Select your preferred webmail client or action to dispatch the draft:
            </DialogDescription>
          </DialogHeader>

          {emailRedirect && (
            <div className="flex flex-col gap-3 py-2">
              <div className="p-3 bg-muted/40 border border-border rounded-lg flex flex-col gap-1 text-[11px] text-muted-foreground select-all">
                <span className="truncate"><strong>To:</strong> {emailRedirect.to}</span>
                <span className="truncate"><strong>Subject:</strong> {emailRedirect.subject}</span>
              </div>

              <div className="flex flex-col gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleGmailWeb}
                  className="flex items-center justify-between p-2.5 border border-border hover:border-primary/20 hover:bg-muted/30 rounded-lg text-left font-medium transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📧</span>
                    <div className="flex flex-col">
                      <span className="text-xs text-foreground font-semibold">Compose in Gmail Web</span>
                      <span className="text-[10px] text-muted-foreground">Opens Gmail compose panel in a new tab</span>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </button>

                <button
                  type="button"
                  onClick={handleOutlookWeb}
                  className="flex items-center justify-between p-2.5 border border-border hover:border-primary/20 hover:bg-muted/30 rounded-lg text-left font-medium transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">Ⓜ️</span>
                    <div className="flex flex-col">
                      <span className="text-xs text-foreground font-semibold">Compose in Outlook Web</span>
                      <span className="text-[10px] text-muted-foreground">Opens Outlook compose tab prefilled</span>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </button>

                <button
                  type="button"
                  onClick={handleMailto}
                  className="flex items-center justify-between p-2.5 border border-border hover:border-primary/20 hover:bg-muted/30 rounded-lg text-left font-medium transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💻</span>
                    <div className="flex flex-col">
                      <span className="text-xs text-foreground font-semibold">Native Desktop Client</span>
                      <span className="text-[10px] text-muted-foreground">Triggers client-side mailto protocol</span>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </button>

                <button
                  type="button"
                  onClick={handleCopyToClipboard}
                  className="flex items-center justify-between p-2.5 border border-border hover:border-primary/20 hover:bg-muted/30 rounded-lg text-left font-medium transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <div className="flex flex-col">
                      <span className="text-xs text-foreground font-semibold">Copy to Clipboard</span>
                      <span className="text-[10px] text-muted-foreground">Copies headers and body details directly</span>
                    </div>
                  </div>
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setEmailRedirect(null)} className="w-full text-xs">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
