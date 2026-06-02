'use client';

import React, { useState, useEffect } from 'react';
import { useWorkspace } from '@/lib/store';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Building2, KeyRound, LogOut, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';

export function NoWorkspaceScreen() {
  const { createWorkspace, joinWorkspaceByCode, logout, user } = useWorkspace();
  const searchParams = useSearchParams();
  const inviteCodeParam = searchParams.get('inviteCode');

  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [loading, setLoading] = useState(false);
  
  // Create state
  const [teamName, setTeamName] = useState('');

  // Join state
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    if (inviteCodeParam) {
      const finalCode = inviteCodeParam.trim().toUpperCase();
      setInviteCode(finalCode);
      setActiveTab('join');

      // Auto-join the workspace using the invite code
      const autoJoin = async () => {
        setLoading(true);
        const toastId = toast.loading('Joining team workspace...', { duration: Infinity });
        try {
          const result = await joinWorkspaceByCode(finalCode);
          if (result.ok) {
            toast.success(result.message, { id: toastId });
          } else {
            toast.error(result.message, { id: toastId });
          }
        } catch (err) {
          toast.error('An error occurred while joining the team.', { id: toastId });
        } finally {
          setLoading(false);
        }
      };
      autoJoin();
    }
  }, [inviteCodeParam, joinWorkspaceByCode]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      toast.error('Team name cannot be empty');
      return;
    }
    setLoading(true);
    try {
      const success = await createWorkspace(teamName.trim());
      if (success) {
        toast.success(`Welcome to your new team: ${teamName.trim()}!`);
      }
    } catch (err) {
      toast.error('Failed to create team workspace');
    } finally {
      setLoading(false);
    }
  };

  const extractAndCleanCode = (input: string) => {
    let cleaned = input.trim();
    if (!cleaned) return '';

    if (cleaned.includes('/invite/')) {
      const parts = cleaned.split('/invite/');
      cleaned = parts[parts.length - 1].split('?')[0].split('#')[0];
    } else if (cleaned.includes('inviteCode=')) {
      const parts = cleaned.split('inviteCode=');
      cleaned = parts[parts.length - 1].split('&')[0].split('#')[0];
    } else if (cleaned.includes('/') && (cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.split('/').length > 1)) {
      const parts = cleaned.split('/');
      cleaned = parts[parts.length - 1].split('?')[0].split('#')[0];
    }
    return cleaned.toUpperCase();
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCode = extractAndCleanCode(inviteCode);
    if (!finalCode) {
      toast.error('Invite code cannot be empty');
      return;
    }
    setInviteCode(finalCode);
    setLoading(true);
    try {
      const result = await joinWorkspaceByCode(finalCode);
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('An error occurred while joining the team.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f7f6f3] dark:bg-[#121212] p-4 relative overflow-hidden transition-colors duration-300">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-500/10 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-[100px]" />

      <div className="w-full max-w-[460px] bg-white dark:bg-[#1c1c1c] border border-[#e9e9e7] dark:border-[#2d2d2d] rounded-2xl p-6 md:p-8 shadow-notion relative z-10 flex flex-col gap-6 transition-all duration-300">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <img src="/logo.png" className="w-12 h-12 object-contain" alt="Nexus AI Logo" />
          <h1 className="text-xl font-bold tracking-tight text-[#37352f] dark:text-[#e3e3e2]">
            Setup Your Team Workspace
          </h1>
          <p className="text-xs text-muted-foreground max-w-[340px]">
            Hello, {user?.name || 'there'}. To get started, you can either create a new team workspace or join an existing one using an invite code.
          </p>
        </div>

        {/* Tabs Switcher */}
        <div className="flex bg-[#f1f1ef] dark:bg-[#252525] rounded-lg p-1 w-full border border-border/40">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'create'
                ? 'bg-white dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e3e3e2] shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Create a Team
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'join'
                ? 'bg-white dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e3e3e2] shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Join a Team
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'create' ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Team Name
              </label>
              <div className="relative flex items-center">
                <Building2 className="absolute left-3 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Acme Corporation or Dev Team"
                  className="w-full bg-[#fcfcfb] dark:bg-[#252525] border border-border/80 dark:border-border/20 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 dark:focus:ring-primary/20"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 shadow-sm transition-all text-xs font-bold"
            >
              {loading ? 'Creating Team...' : 'Create Team Workspace'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Workspace / Team Invite Code
              </label>
              <div className="relative flex items-center">
                <KeyRound className="absolute left-3 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.includes('/') || val.includes('?') || val.includes('localhost') || val.includes('http')) {
                      setInviteCode(extractAndCleanCode(val));
                    } else {
                      setInviteCode(val.toUpperCase());
                    }
                  }}
                  placeholder="e.g. ABCDEFGH"
                  className="w-full bg-[#fcfcfb] dark:bg-[#252525] border border-border/80 dark:border-border/20 rounded-lg pl-9 pr-4 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/40 dark:focus:ring-primary/20"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 shadow-sm transition-all text-xs font-bold"
            >
              {loading ? 'Validating Code...' : 'Join Team Workspace'}
            </Button>
          </form>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-border/60 pt-4 mt-1">
          <span className="text-[10px] text-muted-foreground">
            Logged in as: <span className="font-semibold">{user?.email}</span>
          </span>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1 text-[10px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 px-2 py-1 rounded transition-colors font-medium"
          >
            <LogOut className="w-3 h-3" />
            Sign Out
          </button>
        </div>

      </div>
    </div>
  );
}
