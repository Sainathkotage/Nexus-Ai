import React, { useState, useRef } from 'react';
import { 
  X, Mail, Link as LinkIcon, Check, Copy, UserPlus, 
  Sparkles, FileText, Upload, AlertCircle, Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface InviteTeammateModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ParsedInvite {
  email: string;
  role: 'admin' | 'member' | 'viewer';
  message: string;
}

export function InviteTeammateModal({ projectId, onClose, onSuccess }: InviteTeammateModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [message, setMessage] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [mode, setMode] = useState<'email' | 'link' | 'csv'>('email');
  
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Bulk CSV States
  const [parsedInvites, setParsedInvites] = useState<ParsedInvite[]>([]);
  const [bulkSending, setBulkSending] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const messageTemplates = {
    formal: "I would like to cordially invite you to collaborate on our project team on Nexus AI.",
    friendly: "Hey! Excited to work together on this project. Join our workspace here!",
    urgent: "Hi, we need you to join the project team immediately to collaborate on the upcoming milestones."
  };

  const applyTemplate = (type: 'formal' | 'friendly' | 'urgent') => {
    setMessage(messageTemplates[type]);
    toast.success(`Applied ${type} message template!`);
  };

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

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const list: ParsedInvite[] = [];

      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        const cols = line.split(',');
        const emailCol = cols[0]?.trim();
        let roleCol = cols[1]?.trim().toLowerCase() || 'member';
        const msgCol = cols[2]?.trim() || '';

        // Validate basic email format
        if (emailCol && emailCol.includes('@')) {
          if (!['admin', 'member', 'viewer'].includes(roleCol)) {
            roleCol = 'member';
          }
          list.push({
            email: emailCol,
            role: roleCol as any,
            message: msgCol
          });
        }
      }

      if (list.length === 0) {
        toast.error('No valid rows found in CSV. Format should be: email,role,message');
        return;
      }

      setParsedInvites(list);
      toast.success(`Successfully parsed ${list.length} invitations from CSV!`);
    } catch (err) {
      console.error('Error parsing CSV:', err);
      toast.error('Failed to parse CSV file. Ensure it is a valid text format.');
    }
  };

  const handleBulkInviteSubmit = async () => {
    if (parsedInvites.length === 0) return;

    try {
      setBulkSending(true);
      const res = await fetch(`/api/projects/${projectId}/invitations/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitations: parsedInvites })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch bulk invitations.');
      }

      const successCount = data.successes?.length || 0;
      const failureCount = data.failures?.length || 0;

      if (successCount > 0) {
        toast.success(`Dispatched ${successCount} invitations successfully!`);
      }
      
      if (failureCount > 0) {
        toast.error(`${failureCount} rows failed: ${data.failures[0]?.error || 'Duplicates or invalid formats'}`);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete bulk invite action.');
    } finally {
      setBulkSending(false);
    }
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
            className="w-7 h-7 rounded-lg border border-zinc-800 hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-all cursor-pointer animate-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Toggle Switch - 3 Tabs */}
        <div className="px-6 pt-4">
          <div className="flex p-1 bg-[#18181b] border border-zinc-800/80 rounded-lg w-full gap-1">
            <button 
              type="button"
              className={`flex-1 py-1.5 px-1 rounded-md text-[10px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${mode === 'email' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
              onClick={() => setMode('email')}
            >
              <Mail className="w-3.5 h-3.5" />
              Email
            </button>
            <button 
              type="button"
              className={`flex-1 py-1.5 px-1 rounded-md text-[10px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${mode === 'link' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
              onClick={() => setMode('link')}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              Invite Link
            </button>
            <button 
              type="button"
              className={`flex-1 py-1.5 px-1 rounded-md text-[10px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${mode === 'csv' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
              onClick={() => setMode('csv')}
            >
              <FileText className="w-3.5 h-3.5" />
              CSV Bulk
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
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Personal Message (Optional)</label>
                  {/* Custom template selectors */}
                  <div className="flex items-center gap-1.5">
                    <button 
                      type="button" 
                      onClick={() => applyTemplate('formal')}
                      className="text-[8px] font-semibold text-zinc-400 hover:text-white bg-zinc-800 px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      Formal
                    </button>
                    <button 
                      type="button" 
                      onClick={() => applyTemplate('friendly')}
                      className="text-[8px] font-semibold text-zinc-400 hover:text-white bg-zinc-800 px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      Friendly
                    </button>
                    <button 
                      type="button" 
                      onClick={() => applyTemplate('urgent')}
                      className="text-[8px] font-semibold text-red-400 hover:text-red-300 bg-red-950/20 px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      Urgent
                    </button>
                  </div>
                </div>
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
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending Invitation...
                  </>
                ) : (
                  'Send Invitation'
                )}
              </Button>
            </form>
          ) : mode === 'link' ? (
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
                    <Loader2 className="w-4 h-4 animate-spin" />
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
          ) : (
            // Bulk CSV Upload tab
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Upload CSV File</label>
                <div 
                  onClick={() => csvInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-800 hover:border-indigo-500 rounded-xl p-6 text-center cursor-pointer bg-zinc-950/20 hover:bg-zinc-900/10 flex flex-col items-center justify-center gap-2.5 transition-all group"
                >
                  <Upload className="w-7 h-7 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-zinc-300 group-hover:text-white">Click to upload spreadsheet</span>
                    <span className="text-[9px] text-zinc-500 font-mono">Format: email, role, personal_message</span>
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={csvInputRef}
                  onChange={handleCsvUpload}
                  accept=".csv"
                  className="hidden"
                />
              </div>

              {parsedInvites.length > 0 && (
                <div className="flex flex-col gap-2 bg-[#18181b] border border-zinc-800/80 rounded-xl p-3.5 max-h-[140px] overflow-y-auto scrollbar-thin">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Parsed Invites ({parsedInvites.length})</span>
                  <div className="flex flex-col gap-2">
                    {parsedInvites.map((inv, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[10px] text-zinc-300 border-b border-zinc-850/60 pb-1.5 last:border-b-0 last:pb-0">
                        <span className="truncate max-w-[190px]">{inv.email}</span>
                        <span className="text-[8px] font-bold uppercase tracking-wide border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 rounded-full">{inv.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleBulkInviteSubmit}
                disabled={parsedInvites.length === 0 || bulkSending}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg py-2 text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                {bulkSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending Bulk Invites...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    Send {parsedInvites.length} Invitations
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
