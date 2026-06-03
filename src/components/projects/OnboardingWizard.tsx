import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { User, LogIn, Sparkles, Shield, Mail, Key, Image as ImageIcon, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InviteData {
  id: string;
  email: string | null;
  role: string;
  project: {
    id: string;
    name: string;
  };
  invited_by: {
    name: string;
    email: string;
  };
}

interface OnboardingWizardProps {
  inviteToken: string;
}

export function OnboardingWizard({ inviteToken }: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [userData, setUserData] = useState({
    fullName: '',
    username: '',
    avatar: null as File | null,
    password: ''
  });

  const fetchInviteDetails = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/invitations/${token}`);
      const data = await response.json();
      if (response.ok && data.ok) {
        setInviteData(data.invitation);
      } else {
        toast.error(data.error || 'Failed to validate invitation token.');
      }
    } catch (err) {
      console.error('Error validation invitation:', err);
      toast.error('Connection error while validating invitation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (inviteToken) {
      fetchInviteDetails(inviteToken);
    }
  }, [inviteToken]);

  const handleComplete = async () => {
    if (!userData.fullName.trim() || !userData.username.trim() || !userData.password) {
      toast.error('All profile fields are required.');
      return;
    }

    try {
      setCompleting(true);

      const formData = new FormData();
      formData.append('fullName', userData.fullName);
      formData.append('username', userData.username);
      formData.append('password', userData.password);
      if (userData.avatar) {
        formData.append('avatar', userData.avatar);
      }

      const response = await fetch(`/api/invitations/${inviteToken}/accept`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete account setup.');
      }

      toast.success('Account created and invitation accepted successfully!');
      
      // Force page reload redirecting to homepage which auto-signs the user in
      window.location.href = `/?auth=signin&email=${inviteData?.email || ''}`;
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during onboarding.');
    } finally {
      setCompleting(false);
    }
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-xs text-zinc-400 font-medium">Validating project access token...</p>
      </div>
    );
  }

  if (!inviteData) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-2">Invalid invitation link</p>
        <p className="text-zinc-500 text-sm">Please verify the invite link is correct or ask your administrator for a new invite link.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 select-none animate-in fade-in duration-200">
      {/* Progress bar indicator */}
      <div className="flex items-center justify-center gap-1.5 w-full bg-[#18181b] border border-zinc-800/80 p-2 rounded-xl mb-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center flex-1 last:flex-initial">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${step >= s ? 'bg-emerald-500 border-emerald-500 text-black shadow-sm shadow-emerald-500/10' : 'bg-transparent border-zinc-800 text-zinc-500'}`}>
              {s}
            </div>
            {s < 3 && (
              <div className={`flex-1 h-[2px] mx-2 rounded-full transition-all ${step > s ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Welcome Screen */}
      {step === 1 && (
        <div className="flex flex-col items-center text-center gap-4 py-2 animate-in fade-in slide-in-from-right-3 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Sparkles size={28} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Welcome to {inviteData.project.name}!</h2>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              You have been invited by <span className="text-white font-semibold">{inviteData.invited_by.name}</span> to collaborate.
            </p>
          </div>

          <div className="w-full bg-zinc-950/40 border border-zinc-800/60 rounded-xl p-4 flex flex-col gap-3 text-left">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-500 font-semibold">Target Email:</span>
              <span className="text-zinc-300 font-semibold">{inviteData.email || 'Invite Link Access'}</span>
            </div>
            <div className="h-px bg-zinc-800/40" />
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-500 font-semibold">Project Role:</span>
              <span className="text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/5 px-2 py-0.5 border border-emerald-500/10 rounded-full text-[9px]">{inviteData.role}</span>
            </div>
          </div>

          <Button 
            onClick={() => setStep(2)}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-semibold rounded-lg text-xs transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5 hover:scale-[1.01] cursor-pointer"
          >
            Get Started
            <ArrowRight size={14} />
          </Button>
        </div>
      )}

      {/* Step 2: Create Account Setup */}
      {step === 2 && (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-3 duration-200">
          <div className="text-center mb-1">
            <h2 className="text-lg font-extrabold text-white tracking-tight">Create your account</h2>
            <p className="text-[11px] text-zinc-400 mt-1">Provide your profile details to join the team</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={userData.fullName}
                onChange={(e) => setUserData({...userData, fullName: e.target.value})}
                className="w-full bg-[#18181b] border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all text-zinc-200"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="e.g. johndoe"
                value={userData.username}
                onChange={(e) => setUserData({...userData, username: e.target.value.toLowerCase().replace(/\s+/g, '')})}
                className="w-full bg-[#18181b] border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all text-zinc-200"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Secure Password</label>
            <div className="relative">
              <Key className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={userData.password}
                onChange={(e) => setUserData({...userData, password: e.target.value})}
                className="w-full bg-[#18181b] border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all text-zinc-200"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <Button 
              variant="ghost" 
              onClick={() => setStep(1)}
              className="flex-1 border border-zinc-800 text-zinc-300 hover:text-white py-2 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Back
            </Button>
            <Button 
              onClick={() => {
                if (!userData.fullName.trim() || !userData.username.trim() || !userData.password) {
                  toast.error('All profile fields are required.');
                  return;
                }
                setStep(3);
              }}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              Continue
              <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Profile Picture Upload */}
      {step === 3 && (
        <div className="flex flex-col items-center gap-4 py-2 animate-in fade-in slide-in-from-right-3 duration-200">
          <div className="text-center mb-1">
            <h2 className="text-lg font-extrabold text-white tracking-tight">Add a profile picture</h2>
            <p className="text-[11px] text-zinc-400 mt-1">Upload a photo to represent yourself in the team</p>
          </div>

          <AvatarUpload onUpload={(file) => setUserData({...userData, avatar: file})} />

          <div className="flex gap-3 w-full mt-4">
            <Button 
              variant="ghost" 
              onClick={() => setStep(2)}
              className="flex-1 border border-zinc-800 text-zinc-300 hover:text-white py-2 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Back
            </Button>
            <Button 
              onClick={handleComplete}
              disabled={completing}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-black py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {completing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Complete Setup'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface AvatarUploadProps {
  onUpload: (file: File) => void;
}

function AvatarUpload({ onUpload }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="w-24 h-24 rounded-full border-2 border-dashed border-zinc-700 hover:border-emerald-500 bg-zinc-900/40 hover:bg-zinc-800/40 flex items-center justify-center cursor-pointer overflow-hidden transition-all relative group"
      >
        {preview ? (
          <img src={preview} className="w-full h-full object-cover" alt="Avatar preview" />
        ) : (
          <div className="text-center p-2 flex flex-col items-center">
            <ImageIcon className="w-6 h-6 text-zinc-500 group-hover:text-zinc-300 mb-1" />
            <span className="text-[9px] text-zinc-500 group-hover:text-zinc-300 font-semibold uppercase tracking-wide">Upload Photo</span>
          </div>
        )}
      </div>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
    </div>
  );
}
