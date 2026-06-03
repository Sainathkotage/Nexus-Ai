'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Users, Mail, Clock, Trash2, ArrowLeft, Plus, Shield, User, 
  Copy, Check, ShieldAlert, Sparkles, HelpCircle, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { InviteTeammateModal } from '@/components/projects/InviteTeammateModal';
import { supabase } from '@/lib/supabase';
import { useWorkspace } from '@/lib/store';

interface ProjectMember {
  id: string;
  role: 'admin' | 'member' | 'viewer';
  joined_at: string;
  user_id: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
  };
}

interface PendingInvite {
  id: string;
  email: string | null;
  role: 'admin' | 'member' | 'viewer';
  token: string;
  created_at: string;
  expires_at: string;
}

export default function TeamManagementPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  
  const { user } = useWorkspace();

  const [projectName, setProjectName] = useState<string>('Project Dashboard');
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchProjectData = async () => {
    try {
      // 1. Fetch project name
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .maybeSingle();

      if (project) {
        setProjectName(project.name);
      }

      // 2. Fetch project members
      const membersRes = await fetch(`/api/projects/${projectId}/members`);
      const membersData = await membersRes.json();
      if (membersRes.ok && membersData.ok) {
        setMembers(membersData.members);
      }

      // 3. Fetch pending invites
      const invitesRes = await fetch(`/api/projects/${projectId}/invitations`);
      const invitesData = await invitesRes.json();
      if (invitesRes.ok && invitesData.ok) {
        setPendingInvites(invitesData.invitations);
      }
    } catch (err: any) {
      console.error('Error fetching team management details:', err);
      toast.error('Failed to load team management info.');
    }
  };

  // Initial load
  useEffect(() => {
    if (projectId) {
      setLoading(true);
      fetchProjectData().finally(() => setLoading(false));
    }
  }, [projectId]);

  // Supabase Real-time WebSocket Synchronization
  useEffect(() => {
    if (!projectId) return;

    console.log(`Subscribing to realtime project team updates for ${projectId}...`);
    const channel = supabase
      .channel(`project_team_sync_${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invitations', filter: `project_id=eq.${projectId}` },
        () => {
          console.log('Realtime change detected in invitations table. Syncing...');
          fetchProjectData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_members', filter: `project_id=eq.${projectId}` },
        () => {
          console.log('Realtime change detected in project_members table. Syncing...');
          fetchProjectData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // Determine current logged-in user's role on the project (enforces RBAC)
  const userMemberRecord = members.find(m => m.user_id === user?.id);
  const isAdmin = userMemberRecord?.role === 'admin';

  const handleRevokeInvite = async (inviteId: string) => {
    if (!isAdmin) {
      toast.error('Permission denied: Only administrators can revoke invitations.');
      return;
    }

    try {
      setRevokingId(inviteId);
      const res = await fetch(`/api/invitations/${inviteId}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to revoke invitation.');
      }

      toast.success('Invitation successfully revoked.');
      setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
    } finally {
      setRevokingId(null);
    }
  };

  const copyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    toast.success('Copied invitation link!');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'member':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
      default:
        return 'bg-zinc-500/10 border-zinc-800 text-zinc-400';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#09090b] text-zinc-100 p-8 h-full min-h-screen">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-xs text-zinc-400 font-semibold tracking-wider uppercase">Loading Team Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gradient-to-br from-[#09090b] via-[#121217] to-[#09090b] text-zinc-100 p-6 md:p-8 min-h-screen flex flex-col gap-6 select-none relative">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/5 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 bg-purple-500/5 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Breadcrumbs / Back button */}
      <div className="flex items-center justify-between z-10 shrink-0">
        <button 
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-all cursor-pointer bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/80 px-3 py-1.5 rounded-lg"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </button>
        {isAdmin ? (
          <Button 
            onClick={() => setShowInviteModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 cursor-pointer hover:scale-[1.01]"
          >
            <Plus className="w-4 h-4" />
            Invite Teammates
          </Button>
        ) : (
          <div className="text-[10px] text-zinc-500 font-semibold flex items-center gap-1.5 bg-zinc-900/45 px-3 py-1.5 rounded-lg border border-zinc-800/60">
            <ShieldAlert className="w-3.5 h-3.5 text-zinc-500" />
            Read-only Member Mode
          </div>
        )}
      </div>

      {/* Header Info */}
      <div className="flex flex-col gap-1 border-b border-zinc-800/50 pb-5 z-10 shrink-0">
        <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-zinc-400" />
          {projectName} Team
        </h1>
        <p className="text-xs text-zinc-400">Manage project access controls, active team roles, and pending invitations</p>
      </div>

      {/* Analytics Dashboard Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 z-10 shrink-0 animate-in fade-in duration-200">
        {/* Metric 1 */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Total Invites</span>
            <span className="text-xl font-extrabold text-white">{members.length + pendingInvites.length}</span>
            <span className="text-[9px] text-zinc-500 mt-1 font-semibold">Total teammates requested</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Mail className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Active Members</span>
            <span className="text-xl font-extrabold text-white">{members.length}</span>
            <span className="text-[9px] text-zinc-500 mt-1 font-semibold">Joined & collaborating</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Users className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Pending Invites</span>
            <span className="text-xl font-extrabold text-white">{pendingInvites.length}</span>
            <span className="text-[9px] text-zinc-500 mt-1 font-semibold">Awaiting acceptance</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Clock className="w-4.5 h-4.5" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Acceptance Rate</span>
            <span className="text-xl font-extrabold text-white">
              {members.length === 0 && pendingInvites.length === 0 
                ? '0%' 
                : `${((members.length / (members.length + pendingInvites.length)) * 100).toFixed(0)}%`}
            </span>
            <span className="text-[9px] text-zinc-500 mt-1 font-semibold">Invite-to-member rate</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start z-10">
        
        {/* Active Members Grid Card */}
        <div className="lg:col-span-2 bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-zinc-800/50 pb-3">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              Active Members ({members.length})
            </h2>
          </div>

          <div className="flex flex-col gap-2.5">
            {members.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                No active members found for this project.
              </div>
            ) : (
              members.map(member => (
                <div 
                  key={member.id}
                  className="flex items-center justify-between p-3 border border-zinc-800/40 bg-zinc-950/20 rounded-xl hover:border-zinc-800 transition-all"
                >
                  <div className="flex items-center gap-3">
                    {/* User Avatar */}
                    {member.user.avatar ? (
                      <img 
                        src={member.user.avatar} 
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-zinc-800" 
                        alt="Avatar" 
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400 shrink-0">
                        {getInitials(member.user.name)}
                      </div>
                    )}
                    
                    {/* User Metadata */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-white leading-tight">{member.user.name}</span>
                      <span className="text-[10px] text-zinc-500 leading-none">{member.user.email}</span>
                    </div>
                  </div>

                  {/* Badge & Joined Date */}
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-zinc-500 font-medium hidden md:inline">
                      Joined {new Date(member.joined_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full ${getRoleBadgeStyle(member.role)}`}>
                      {member.role}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Invites Card */}
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-zinc-800/50 pb-3">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-400" />
              Pending Invites ({pendingInvites.length})
            </h2>
          </div>

          <div className="flex flex-col gap-2.5">
            {pendingInvites.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                No pending invitations.
              </div>
            ) : (
              pendingInvites.map(invite => (
                <div 
                  key={invite.id}
                  className="flex flex-col gap-2.5 p-3.5 border border-zinc-800/40 bg-zinc-950/20 rounded-xl"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1 min-w-0">
                      {invite.email ? (
                        <span className="text-xs font-semibold text-white truncate" title={invite.email}>{invite.email}</span>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          General Link Invite
                        </span>
                      )}
                      
                      <span className="text-[8px] text-zinc-500 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Exp. {new Date(invite.expires_at).toLocaleDateString()}
                      </span>
                    </div>

                    <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 border rounded-full shrink-0 ${getRoleBadgeStyle(invite.role)}`}>
                      {invite.role}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/40 mt-1">
                    {/* Copy Link Button if it is a general invite link */}
                    <button 
                      onClick={() => copyInviteLink(invite.token)}
                      className="flex-1 py-1 px-2 border border-zinc-800 hover:bg-zinc-800/40 rounded text-[9px] font-medium text-zinc-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-all"
                    >
                      {copiedToken === invite.token ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy Link
                        </>
                      )}
                    </button>
                    
                    {/* Revoke Button - Admin only */}
                    {isAdmin && (
                      <button 
                        onClick={() => handleRevokeInvite(invite.id)}
                        disabled={revokingId === invite.id}
                        className="py-1 px-2 border border-red-500/10 hover:border-red-500/30 bg-red-500/5 hover:bg-red-500/10 rounded text-[9px] font-semibold text-red-400 hover:text-red-300 flex items-center justify-center gap-1 cursor-pointer transition-all"
                        title="Revoke Invite"
                      >
                        {revokingId === invite.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Invite Teammates Modal */}
      {showInviteModal && (
        <InviteTeammateModal 
          projectId={projectId}
          onClose={() => setShowInviteModal(false)}
          onSuccess={fetchProjectData}
        />
      )}
    </div>
  );
}
