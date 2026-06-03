import React, { useState } from 'react';
import { X, Mail, Link as LinkIcon, Check, Copy, UserPlus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface InviteTeammateModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function InviteTeammateModal({ projectId, onClose, onSuccess }: InviteTeammateModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [message, setMessage] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [mode, setMode] = useState<'email' | 'link'>('email');
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Email address is required.');
      return;
    }

    try {
      setSending(true);
      const response = await fetch(`/api/projects/${projectId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, message })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation.');
      }

      toast.success(data.message || 'Invitation sent successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong.');
    } finally {
      setSending(false);
    }
  };

  const handleGenerateLink = async () => {
    try {
      setGenerating(true);
      const response = await fetch(`/api/projects/${projectId}/invitations/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, expiresIn: '7d' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate invite link.');
      }

      const generatedUrl = `${window.location.origin}/invite/${data.token}`;
      setInviteLink(generatedUrl);
      toast.success('Project invitation link generated!');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Invitation link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      {/* Modal Container Card */}
      <div className="bg-[#0f0f11] border border-zinc-800/80 text-zinc-100 rounded-2xl w-full max-w-md shadow-2xl relative flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Glow Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {/* Modal Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-zinc-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-none">Invite Teammates</h2>
              <p className="text-[10px] text-zinc-400 mt-1 leading-none">Collaborate on this project</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-zinc-800 hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Toggle Switch */}
        <div className="px-6 pt-4">
          <div className="flex p-1 bg-[#18181b] border border-zinc-800/80 rounded-lg w-full">
            <button 
              type="button"
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${mode === 'email' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
              onClick={() => setMode('email')}
            >
              <Mail className="w-3.5 h-3.5" />
              Send Email Invite
            </button>
            <button 
              type="button"
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${mode === 'link' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
              onClick={() => setMode('link')}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              Create Invite Link
            </button>
          </div>
        </div>

        {/* Modal Form Content */}
        <div className="p-6">
          {mode === 'email' ? (
            <form onSubmit={handleSendInvite} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  placeholder="teammate@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#18181b] border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-zinc-200"
                  required
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Project Role</label>
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-[#18181b] border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-zinc-200 cursor-pointer"
                >
                  <option value="viewer">Viewer - View only</option>
                  <option value="member">Member - View and edit</option>
                  <option value="admin">Admin - Full administrative access</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Personal Message (Optional)</label>
                <textarea
                  placeholder="Add a friendly welcome note..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full bg-[#18181b] border border-zinc-800 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-zinc-200 resize-none"
                />
              </div>

              <Button 
                type="submit" 
                disabled={sending}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg py-2 text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Sending Invitation...
                  </>
                ) : (
                  'Send Invitation'
                )}
              </Button>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Select Invite Link Role</label>
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-[#18181b] border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-zinc-200 cursor-pointer"
                >
                  <option value="viewer">Viewer - Can join as viewer</option>
                  <option value="member">Member - Can join as editor</option>
                  <option value="admin">Admin - Can join as admin</option>
                </select>
              </div>

              <Button 
                onClick={handleGenerateLink} 
                disabled={generating}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg py-2 text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Generating Link...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Invite Link
                  </>
                )}
              </Button>

              {inviteLink && (
                <div className="flex flex-col gap-1.5 mt-2 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Invite URL</label>
                  <div className="flex items-center gap-2 bg-[#18181b] border border-zinc-800 rounded-lg p-2">
                    <input 
                      type="text" 
                      value={inviteLink} 
                      readOnly 
                      className="flex-1 bg-transparent border-none outline-none text-[11px] text-zinc-300 select-all truncate px-1"
                    />
                    <button 
                      onClick={handleCopyLink}
                      className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all shrink-0 cursor-pointer"
                      title="Copy URL"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[9px] text-zinc-500 italic mt-0.5">This invitation link will expire in 7 days.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
