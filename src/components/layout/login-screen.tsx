'use client';

import React, { useState, useEffect } from 'react';
import { isAdminLevelRole, useWorkspace } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Mail, Lock, User, Tag, Briefcase, Eye, EyeOff, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { signInWithEnterpriseSso } from '@/lib/enterprise/sso';

export function LoginScreen() {
  const { login, register, roles } = useWorkspace();
  const signupRoles = (roles || []).filter((r) => !isAdminLevelRole(r));
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const authType = params.get('auth');
      if (authType === 'signup') {
        setActiveTab('signup');
      }
    }
  }, []);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [tag, setTag] = useState('');
  const [role, setRole] = useState('Member');
  const [ssoDomain, setSsoDomain] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Email or Username and password are required');
      return;
    }
    setLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        toast.success('Signed in successfully!');
      } else {
        toast.error('Invalid credentials');
      }
    } catch (err) {
      toast.error('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !username.trim() || !password.trim()) {
      toast.error('Email, Username and Password are required');
      return;
    }

    // Validate tag format if provided (should be alphanumeric or digits, up to 5 chars)
    let finalTag = tag.trim().replace('#', '');
    if (finalTag && !/^[a-zA-Z0-9]{3,5}$/.test(finalTag)) {
      toast.error('Tag must be 3-5 alphanumeric characters (e.g. 1337)');
      return;
    }
    if (!finalTag) {
      // Auto-assign random 4 digit number
      finalTag = Math.floor(1000 + Math.random() * 9000).toString();
    }

    setLoading(true);
    try {
      const success = await register(email, username, finalTag, role, password);
      if (success) {
        toast.success(`Registered successfully as ${username}#${finalTag}!`);
      } else {
        toast.error('Registration failed');
      }
    } catch (err) {
      toast.error('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterpriseSso = async () => {
    const domain = ssoDomain.trim().replace(/^@/, '').toLowerCase();
    if (!domain || !domain.includes('.')) {
      toast.error('Enter your company email domain (e.g. acme.com)');
      return;
    }
    setLoading(true);
    try {
      const result = await signInWithEnterpriseSso(
        { provider: 'google_workspace', domain },
        `${window.location.origin}/auth/callback`
      );
      if ('url' in result) {
        window.location.href = result.url;
        return;
      }
      const fallback = `/api/enterprise/sso?domain=${encodeURIComponent(domain)}`;
      window.location.href = fallback;
    } catch {
      window.location.href = `/api/enterprise/sso?domain=${encodeURIComponent(domain)}`;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f7f6f3] dark:bg-[#121212] p-4 relative overflow-hidden transition-colors duration-300">
      {/* Visual Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-500/10 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-orange-500/10 to-pink-500/10 blur-[100px]" />

      <div className="w-full max-w-[460px] bg-white dark:bg-[#1c1c1c] border border-[#e9e9e7] dark:border-[#2d2d2d] rounded-2xl p-6 md:p-8 shadow-notion relative z-10 flex flex-col gap-6 transition-all duration-300">
        
        {/* Logo and Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <img src="/logo.png" className="w-12 h-12 object-contain" alt="Nexus AI Logo" />
          <h1 className="text-2xl font-bold tracking-tight text-[#37352f] dark:text-[#e3e3e2]">Welcome to Nexus AI</h1>
          <p className="text-xs text-muted-foreground">Collaborate on tasks, documents, emails, and chat in one place.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#f1f1ef] dark:bg-[#252525] rounded-lg p-1 w-full border border-border/40">
          <button
            onClick={() => {
              setActiveTab('signin');
              setEmail('');
              setPassword('');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'signin'
                ? 'bg-white dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e3e3e2] shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setActiveTab('signup');
              setEmail('');
              setPassword('');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'signup'
                ? 'bg-white dark:bg-[#2f2f2f] text-[#37352f] dark:text-[#e3e3e2] shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Tabs Content */}
        {activeTab === 'signin' ? (
          <form onSubmit={handleSignIn} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email or Username</label>
              <div className="relative flex items-center">
                <User className="absolute left-3 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com or username"
                  className="w-full bg-[#fcfcfb] dark:bg-[#252525] border border-border/80 dark:border-border/20 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 dark:focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#fcfcfb] dark:bg-[#252525] border border-border/80 dark:border-border/20 rounded-lg pl-9 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 dark:focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1 hover:bg-muted dark:hover:bg-muted/10 rounded text-muted-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 shadow-sm transition-all"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Username</label>
                <div className="relative flex items-center">
                  <User className="absolute left-3 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Alex"
                    className="w-full bg-[#fcfcfb] dark:bg-[#252525] border border-border/80 dark:border-border/20 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  Tag <span className="text-[9px] text-muted-foreground/60">(Name#Tag)</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm text-muted-foreground font-mono">#</span>
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="1337"
                    maxLength={5}
                    className="w-full bg-[#fcfcfb] dark:bg-[#252525] border border-border/80 dark:border-border/20 rounded-lg pl-7 pr-4 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-[#fcfcfb] dark:bg-[#252525] border border-border/80 dark:border-border/20 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Role</label>
                <div className="relative flex items-center">
                  <Briefcase className="absolute left-3 w-4 h-4 text-muted-foreground" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-[#fcfcfb] dark:bg-[#252525] border border-border/80 dark:border-border/20 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                  >
                    {signupRoles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#fcfcfb] dark:bg-[#252525] border border-border/80 dark:border-border/20 rounded-lg pl-9 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1 hover:bg-muted dark:hover:bg-muted/10 rounded text-muted-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 shadow-sm transition-all"
            >
              {loading ? 'Creating Account...' : 'Register Profile'}
            </Button>
          </form>
        )}

        {/* Enterprise SSO */}
        <div className="flex flex-col gap-2 p-3 rounded-lg border border-border/60 bg-[#fcfcfb] dark:bg-[#252525]/80">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            Enterprise SSO (SAML / OIDC)
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={ssoDomain}
              onChange={(e) => setSsoDomain(e.target.value)}
              placeholder="yourcompany.com"
              className="flex-1 bg-background border border-border/80 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => void handleEnterpriseSso()}
              className="shrink-0 text-xs h-9"
            >
              SSO Sign In
            </Button>
          </div>
          <p className="text-[9px] text-muted-foreground leading-relaxed">
            Google Workspace, Microsoft Azure AD, or SAML via Supabase Auth. Your admin must enable SSO for your domain.
          </p>
        </div>

        <p className="text-[10px] text-center text-muted-foreground/90 leading-relaxed">
          Sign in with your account, or register to create a new workspace. Data syncs to Supabase when configured.
        </p>
      </div>
    </div>
  );
}
