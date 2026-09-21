'use client';

import React, { useState } from 'react';
import { isAdminLevelRole, useWorkspace } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Mail, Lock, User, Tag, Briefcase, Eye, EyeOff, Building2, ArrowLeft, MailCheck, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { signInWithEnterpriseSso } from '@/lib/enterprise/sso';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function LoginScreen() {
  const { login, register, resetPassword, roles } = useWorkspace();
  const signupRoles = (roles || []).filter((r) => !isAdminLevelRole(r));
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'forgot'>(() => {
    const authType = searchParams ? searchParams.get('auth') : null;
    if (authType === 'signup') return 'signup';
    if (authType === 'forgot' || authType === 'reset') return 'forgot';
    return 'signin';
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [tag, setTag] = useState('');
  const [role, setRole] = useState('Member');
  const [ssoDomain, setSsoDomain] = useState('');

  // Forgot password state
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [sentToEmail, setSentToEmail] = useState('');
  const [resetError, setResetError] = useState('');

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Email or username is required');
      setResetError('Please enter your email or username');
      return;
    }
    setLoading(true);
    setResetError('');
    try {
      const result = await resetPassword(email.trim());
      if (result.success) {
        setSentToEmail(result.email || email.trim());
        setResetEmailSent(true);
        toast.success('Password reset link sent! Check your inbox.');
      } else {
        setResetError(result.error || 'Failed to send reset link');
        toast.error(result.error || 'Failed to send reset link');
      }
    } catch (err: any) {
      setResetError(err?.message || 'An error occurred');
      toast.error(err?.message || 'An error occurred');
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
      const result = await register(email, username, finalTag, role, password);
      if (result.success) {
        if (result.needsVerification) {
          toast.success(`Verification email sent! Please check your email to confirm.`);
        } else {
          toast.success(`Registered successfully as ${username}#${finalTag}!`);
        }
      } else {
        toast.error(result.error || 'Registration failed');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Registration failed');
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      <div className="mesh-backdrop" />
      <div className="w-full max-w-[460px] glass p-6 md:p-8 shadow-2xl relative z-10 flex flex-col gap-6 rounded-2xl transition-all duration-300">
        
        {/* Logo and Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <a href={process.env.NEXT_PUBLIC_MARKETING_URL || 'https://aixentrix.com'}>
            <img src="/logo.png" className="w-12 h-12 object-contain cursor-pointer hover:opacity-85 transition-opacity" alt="Nexus AI Logo" />
          </a>
          <h1 className="text-2xl font-bold tracking-tight text-[#37352f] dark:text-[#e3e3e2]">Welcome to Nexus AI</h1>
          <p className="text-xs text-muted-foreground">Collaborate on tasks, documents, emails, and chat in one place.</p>
        </div>

        {searchParams?.get('inviteCode') && (
          <div className="w-full p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs text-center font-medium">
            Workspace invite detected: {activeTab === 'signup' ? 'Create an account' : 'Sign in'} to join your team.
          </div>
        )}

        {/* Tab Switcher / Navigation */}
        {activeTab === 'forgot' ? (
          <div className="flex items-center gap-2.5 px-1 py-0.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setResetEmailSent(false);
                setResetError('');
              }}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Back to Sign In"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 text-left">
              <span className="text-xs font-bold text-foreground">Forgot Password</span>
              <p className="text-[10px] text-muted-foreground">Request a password recovery link</p>
            </div>
          </div>
        ) : (
          <div className="flex bg-black/5 dark:bg-white/10 rounded-full p-1 w-full border border-black/5 dark:border-white/5">
            <button
              onClick={() => {
                setActiveTab('signin');
                setEmail('');
                setPassword('');
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all ${
                activeTab === 'signin'
                  ? 'bg-white dark:bg-white/10 text-primary shadow-sm'
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
              className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-all ${
                activeTab === 'signup'
                  ? 'bg-white dark:bg-white/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Tabs Content */}
        {activeTab === 'forgot' ? (
          <div className="flex flex-col gap-4">
            {resetEmailSent ? (
              <div className="flex flex-col items-center text-center gap-3 p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <div className="w-11 h-11 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <MailCheck className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-sm text-foreground">Check your email</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    We sent a password reset link to <strong className="text-foreground">{sentToEmail}</strong>.
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground/80 leading-normal">
                  Click the link in your email to choose a new password. If you don't see it within a minute, check your spam folder.
                </p>
                <div className="flex gap-2 w-full mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setResetEmailSent(false)}
                    className="flex-1 text-xs cursor-pointer h-8"
                  >
                    Try Another Email
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setActiveTab('signin');
                      setResetEmailSent(false);
                    }}
                    className="flex-1 text-xs cursor-pointer h-8"
                  >
                    Back to Sign In
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email or Username</label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setResetError('');
                      }}
                      placeholder="you@company.com or username"
                      className="w-full rounded-lg border border-border/40 bg-black/[0.03] dark:bg-white/[0.05] pl-9 pr-4 py-2 text-sm transition-all duration-150 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:text-muted-foreground/60"
                      autoFocus
                    />
                  </div>
                </div>

                {resetError && (
                  <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg text-center font-medium">
                    {resetError}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1 cursor-pointer"
                >
                  {loading ? 'Sending reset link...' : 'Send Reset Link'}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signin');
                    setResetError('');
                  }}
                  className="text-xs text-center text-muted-foreground hover:text-foreground font-medium py-1 transition-colors cursor-pointer"
                >
                  Cancel and return to sign in
                </button>
              </form>
            )}
          </div>
        ) : activeTab === 'signin' ? (
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
                  className="w-full rounded-lg border border-border/40 bg-black/[0.03] dark:bg-white/[0.05] pl-9 pr-4 py-2 text-sm transition-all duration-150 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('forgot');
                    setResetEmailSent(false);
                    setResetError('');
                  }}
                  className="text-[11px] text-primary hover:underline font-semibold cursor-pointer transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border/40 bg-black/[0.03] dark:bg-white/[0.05] pl-9 pr-10 py-2 text-sm transition-all duration-150 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:text-muted-foreground/60"
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
              className="w-full mt-2 cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>

            <div className="flex items-center my-1 text-center">
              <div className="flex-1 h-px bg-border/60"></div>
              <span className="px-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Or</span>
              <div className="flex-1 h-px bg-border/60"></div>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  const redirectTo = typeof window !== 'undefined'
                    ? `${window.location.origin}/auth/callback`
                    : undefined;
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: { redirectTo }
                  });
                  if (error) throw error;
                } catch (err: any) {
                  toast.error(err.message || 'Google OAuth failed');
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full text-xs font-bold border-border/80 hover:bg-muted/30 flex items-center justify-center gap-2 cursor-pointer h-9"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.67-.35-1.37-.35-2.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Sign In with Google</span>
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
        <div className="flex flex-col gap-2 p-3 rounded-xl border border-border/40 bg-black/[0.02] dark:bg-white/[0.03]">
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
              className="flex-1 rounded-lg border border-border/40 bg-black/[0.03] dark:bg-white/[0.05] px-3 py-2 text-xs transition-all duration-150 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 placeholder:text-muted-foreground/60"
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
