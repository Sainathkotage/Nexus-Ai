'use client';

import React, { useState } from 'react';
import { useWorkspace } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Sparkles, Mail, Lock, User, Tag, Briefcase, Eye, EyeOff, Check } from 'lucide-react';
import { toast } from 'sonner';

export function LoginScreen() {
  const { login, register, roles } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [tag, setTag] = useState('');
  const [role, setRole] = useState('Member');

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

  const handleDemoSignIn = async () => {
    setLoading(true);
    try {
      const success = await login('sarah@nexus.ai', 'password');
      if (success) {
        toast.success('Signed in as Sarah Chen (Demo Account)');
      } else {
        toast.error('Demo login failed');
      }
    } catch (err) {
      toast.error('Demo login error');
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
                  placeholder="sarah@nexus.ai or sarah"
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
                    placeholder="Sarah"
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
                  placeholder="sarah@nexus.ai"
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
                    {(roles || []).map((r) => (
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

        {/* Divider */}
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-border/60" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Or</span>
          <div className="flex-1 h-px bg-border/60" />
        </div>

        {/* Demo Account Button */}
        <button
          onClick={handleDemoSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-[#a8a8a5] hover:border-[#37352f] dark:border-[#555] dark:hover:border-[#eee] hover:bg-[#37352f]/5 dark:hover:bg-white/5 py-2.5 rounded-lg text-xs font-semibold text-foreground/80 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          Quick Sign In (Demo Mode as Sarah Chen)
        </button>

        {/* Helper Note */}
        <div className="bg-[#f7f6f3] dark:bg-[#252525] p-3 rounded-lg border border-border/40 text-center flex flex-col gap-1">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
            <Check className="w-3 h-3 text-emerald-500" /> Database & Offline Support
          </span>
          <p className="text-[10px] text-muted-foreground/90">
            Nexus AI automatically syncs with Supabase if configured. Otherwise, your data is saved locally on your device.
          </p>
        </div>
      </div>
    </div>
  );
}
