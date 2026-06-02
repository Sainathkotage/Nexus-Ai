'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useWorkspace } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { LogIn, CheckCircle2, Clock, XCircle, AlertCircle, UserPlus, ArrowRight } from 'lucide-react';

interface WorkspaceDetails {
  id: string;
  name: string;
  slug: string;
}

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  const { user, joinWorkspaceByCode } = useWorkspace();

  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceDetails | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    if (!code) return;

    const fetchInviteDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/invites/details?code=${code}`);
        const data = await res.json();

        if (!res.ok || !data.ok) {
          setErrorMsg(data.error || 'Invalid or unrecognized invite code.');
          setLoading(false);
          return;
        }

        setWorkspace(data.workspace);

        // If signed in, check their membership status
        if (user) {
          // Check membership
          const { data: member } = await supabase
            .from('workspace_members')
            .select('status')
            .eq('workspace_id', data.workspace.id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (member && member.status === 'active') {
            setIsMember(true);
            setLoading(false);
            return;
          }
        }
      } catch (err: any) {
        console.error('Error fetching invite details:', err);
        setErrorMsg('Failed to load invite information.');
      } finally {
        setLoading(false);
      }
    };

    fetchInviteDetails();
  }, [code, user]);

  const handleJoinWorkspace = async () => {
    if (!workspace) return;
    try {
      setRequesting(true);
      const res = await joinWorkspaceByCode(code);
      if (res.ok) {
        toast.success(res.message);
        setIsMember(true);
        router.push('/');
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
    } finally {
      setRequesting(false);
    }
  };

  const handleGoToDashboard = () => {
    router.push('/');
  };

  const handleSignIn = () => {
    // Redirect to login page and preserve the invite code
    router.push(`/?auth=signin&inviteCode=${code}`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#09090b] text-[#fafafa] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          <p className="text-sm text-zinc-400 font-medium">Verifying invitation details...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#09090b] via-[#121217] to-[#09090b] text-[#fafafa] flex items-center justify-center p-6 text-zinc-100 selection:bg-emerald-500/30">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full filter blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Glow accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />

        {errorMsg ? (
          <div className="w-full py-4 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-6">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-200 mb-2">Invitation Error</h2>
            <p className="text-zinc-400 text-sm mb-6">{errorMsg}</p>
            <button
              onClick={handleGoToDashboard}
              className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg text-sm font-semibold transition-all"
            >
              Go to Homepage
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
              <UserPlus size={32} />
            </div>

            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest bg-emerald-500/5 border border-emerald-500/10 rounded-full px-3 py-1 mb-4">
              Workspace Invite
            </span>

            <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2">
              Join {workspace?.name}
            </h2>
            <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
              You have been invited to collaborate. Request access below to join the team workspace.
            </p>

            {/* Content states based on auth and membership */}
            {!user ? (
              <div className="w-full space-y-4">
                <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-xl p-4 text-left text-xs text-zinc-400 mb-2">
                  <span className="font-semibold text-zinc-300 block mb-1">Sign-in Required</span>
                  You must be authenticated to request to join workspace. Sign up or log in to continue.
                </div>
                <button
                  onClick={handleSignIn}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-semibold rounded-lg text-sm transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 hover:scale-[1.01]"
                >
                  <LogIn size={18} />
                  Sign In to Join Workspace
                </button>
              </div>
            ) : isMember ? (
              <div className="w-full space-y-4">
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-emerald-400 flex items-center gap-3 text-left text-sm mb-2">
                  <CheckCircle2 className="shrink-0 text-emerald-400" size={20} />
                  <div>
                    <span className="font-semibold block text-white text-xs">Already a Member</span>
                    You are already registered as a member of this workspace.
                  </div>
                </div>
                <button
                  onClick={handleGoToDashboard}
                  className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                >
                  Go to Workspace Dashboard
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleJoinWorkspace}
                disabled={requesting}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-emerald-500/50 disabled:to-teal-500/50 text-black font-semibold rounded-lg text-sm transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 hover:scale-[1.01]"
              >
                {requesting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                    Joining Workspace...
                  </>
                ) : (
                  'Join Workspace'
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
