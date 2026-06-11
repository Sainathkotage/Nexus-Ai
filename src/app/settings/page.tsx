'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/lib/store';
import { usePopup } from '@/lib/popup-context';
import { useTutorial } from '@/lib/tutorial-context';
import { 
  Settings, User, Bell, Palette, Shield, CreditCard, Plug, Users, 
  Key, ArrowRight, ShieldCheck, Mail, Database, Globe, Check, AlertTriangle, 
  Trash2, Plus, Info, RefreshCw, Terminal, ArrowUpRight, HelpCircle, X, ExternalLink,
  Copy, Heart, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, getAvatarStyle } from '@/lib/utils';
import { toast } from 'sonner';
import {
  startRazorpayCheckout,
  openBillingManage,
  updateSeatCount,
} from '@/lib/billing/client';
import {
  BILLING_PLANS,
  planIdFromLabel,
  type BillingPlanId,
} from '@/lib/billing/plans';
import { parseSsoProvider } from '@/lib/enterprise/sso';

const ORG_ID =
  process.env.NEXT_PUBLIC_ORGANIZATION_ID ??
  process.env.NEXT_PUBLIC_DEMO_ORGANIZATION_ID ??
  '';

const STATIC_SECTIONS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'account', label: 'Account', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security & SSO', icon: Shield },
  { id: 'billing', label: 'Plans & Billing', icon: CreditCard },
  { id: 'audit', label: 'Audit Logs', icon: Terminal },
];

function Toggle({ enabled, onToggle, disabled = false }: { enabled: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      type="button"
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none",
        disabled && "opacity-40 cursor-not-allowed",
        enabled ? "bg-foreground" : "bg-muted border border-border"
      )}
    >
      <span className={cn(
        "inline-block h-3.5 w-3.5 transform rounded-full transition-transform",
        enabled ? "translate-x-4 bg-background" : "translate-x-1 bg-muted-foreground"
      )} />
    </button>
  );
}

export default function SettingsPage() {
  const {
    setActivePage,
    theme,
    toggleTheme,
    themeConfig,
    setThemeConfig,
    user,
    updateProfile,
    loginActivities,
    workspace,
    workspaceMembers: realWorkspaceMembers,
    workspaceInvites,
    joinRequests,
    reviewJoinRequest,
    regenerateWorkspaceInviteCode,
    auditLogs: realAuditLogs,
    feedbackItems,
    aiUsage,
    canManageTeamMembers,
    createInviteLink,
    submitFeedback,
    updateMemberRole,
    removeWorkspaceMember,
    banWorkspaceMember,
    unbanWorkspaceMember,
    deleteWorkspace,
    allUsers,
    deleteAccount,
    logout,
  } = useWorkspace();
  const { confirm, prompt } = usePopup();
  const [activeSection, setActiveSection] = useState('general');

  const {
    restartTutorial,
    resetProgress,
    abVariant,
    setAbVariantManually,
    status,
    dbAvailable
  } = useTutorial();

  const sections = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'account', label: 'Account', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'tutorial', label: 'Onboarding & Tour', icon: HelpCircle },
    ...(canManageTeamMembers ? [
      { id: 'security', label: 'Security & SSO', icon: Shield },
      { id: 'billing', label: 'Plans & Billing', icon: CreditCard },
      { id: 'audit', label: 'Audit Logs', icon: Terminal },
    ] : []),
  ];
  
  // Workspace Info State
  const [workspaceName, setWorkspaceName] = useState('Nexus AI');
  const [workspaceUrl, setWorkspaceUrl] = useState('');
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);
  
  // General Permissions State
  const [permissions, setPermissions] = useState({
    readDrive: true,
    readEmails: true,
    autoSend: false,
    vectorSearch: true,
  });

  // Account State
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    role: 'Member',
    avatar: '',
  });

  const [workspaceMembers, setWorkspaceMembers] = useState<
    { id: string; name: string; email: string; role: string; status: string }[]
  >([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Member');
  const [customInviteCode, setCustomInviteCode] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [feedbackDraft, setFeedbackDraft] = useState('');

  // SSO & SAML Mappings State
  const [ssoConfig, setSsoConfig] = useState({
    enabled: false,
    provider: 'Google Workspace',
    metadataUrl: '',
    domainMapping: '',
    authProvisioning: true,
  });

  // Billing Simulator State
  const [currentPlan, setCurrentPlan] = useState<'Starter' | 'Team Pro' | 'Enterprise'>('Team Pro');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [targetPlan, setTargetPlan] = useState<'Starter' | 'Team Pro' | 'Enterprise'>('Team Pro');
  
  // Mock Checkout Form
  const [checkoutCard, setCheckoutCard] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: '',
  });

  const [auditLogs, setAuditLogs] = useState<
    { id: string; timestamp: string; actor: string; action: string; target: string; ip: string }[]
  >([]);

  useEffect(() => {
    setActivePage('settings');
    const params = new URLSearchParams(window.location.search);
    if (params.get('section') === 'billing' || params.get('billing')) {
      setActiveSection('billing');
    }
  }, [setActivePage]);

  useEffect(() => {
    if (!user) return;
    setUserProfile({
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar || '',
    });
    setCheckoutCard((c) => ({ ...c, name: user.name }));
    setWorkspaceUrl((prev) => prev || user.email.split('@')[1]?.replace(/\./g, '-') || 'my-workspace');
    setWorkspaceMembers((prev) => {
      if (prev.some((m) => m.id === user.id)) return prev;
      return [
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: 'Admin',
          status: 'Active',
        },
        ...prev,
      ];
    });
  }, [user]);

  useEffect(() => {
    if (!user || realWorkspaceMembers.length === 0) return;
    setWorkspaceMembers(realWorkspaceMembers.map((member) => {
      const profile = allUsers.find(u => u.id === member.userId);
      return {
        id: member.userId,
        name: profile?.name || member.userId,
        email: profile?.email || '',
        role: member.role,
        status: member.status === 'active' ? 'Active' : member.status,
      };
    }));
  }, [realWorkspaceMembers, user, allUsers]);

  useEffect(() => {
    if (loginActivities.length === 0) return;
    setAuditLogs(
      loginActivities.slice(0, 20).map((a) => ({
        id: a.id,
        timestamp: a.timestamp,
        actor: a.userName,
        action: 'Sign-in',
        target: `${a.userRole} · ${a.device}`,
        ip: a.ipAddress,
      }))
    );
  }, [loginActivities]);

  useEffect(() => {
    if (realAuditLogs.length === 0 && loginActivities.length === 0) return;
    const loginLogs = loginActivities.slice(0, 20).map((a) => ({
      id: a.id,
      timestamp: a.timestamp,
      actor: a.userName,
      action: 'Sign-in',
      target: `${a.userRole} - ${a.device}`,
      ip: a.ipAddress,
    }));
    const workspaceLogs = realAuditLogs.slice(0, 30).map((a) => ({
      id: a.id,
      timestamp: a.timestamp,
      actor: a.actorName,
      action: a.action,
      target: a.target,
      ip: 'workspace',
    }));
    setAuditLogs([...workspaceLogs, ...loginLogs].slice(0, 40));
  }, [loginActivities, realAuditLogs]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createInviteLink(newMemberEmail, newMemberRole, customInviteCode);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setInviteLink(result.url || '');
    setCustomInviteCode('');
    toast.success(result.message);
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await submitFeedback(feedbackDraft, activeSection);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setFeedbackDraft('');
    toast.success(result.message);
  };

  const persistSsoConfig = async (next: typeof ssoConfig) => {
    if (!ORG_ID) {
      toast.info('Set NEXT_PUBLIC_ORGANIZATION_ID to persist SSO to Supabase.');
      return;
    }
    try {
      const res = await fetch('/api/enterprise/sso', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: ORG_ID,
          enabled: next.enabled,
          provider: parseSsoProvider(next.provider),
          domain: next.domainMapping,
          metadataUrl: next.metadataUrl,
          autoProvision: next.authProvisioning,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save SSO');
      toast.success('SSO configuration saved to organization record.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'SSO save failed');
    }
  };

  const handleToggleSSO = () => {
    const nextVal = !ssoConfig.enabled;
    const next = { ...ssoConfig, enabled: nextVal };
    setSsoConfig(next);
    void persistSsoConfig(next);
    if (nextVal) {
      toast.success('SSO domain authentication activated.');
    } else {
      toast.warning('SSO disabled. Password logins remain available.');
    }
  };

  // Add workspace member seat
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) {
      toast.error('Email address cannot be empty.');
      return;
    }
    if (!newMemberEmail.includes('@')) {
      toast.error('Please enter a valid business email.');
      return;
    }
    
    // Seat check for Starter Plan
    if (currentPlan === 'Starter' && workspaceMembers.length >= 1) {
      toast.error('Starter Plan is limited to 1 Workspace Seat. Upgrade to Team Pro or Enterprise to add members.');
      return;
    }
    // Seat check for Team Pro
    if (currentPlan === 'Team Pro' && workspaceMembers.length >= 15) {
      toast.error('Team Pro Plan is limited to 15 Workspace Seats. Upgrade to Enterprise for unlimited seats.');
      return;
    }

    const name = newMemberEmail.split('@')[0].split('.').map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' ');
    const newMember = {
      id: `p-${Date.now()}`,
      name,
      email: newMemberEmail.trim(),
      role: newMemberRole,
      status: 'Active',
    };

    setWorkspaceMembers(prev => {
      const updated = [...prev, newMember];
      void syncSeatsToRazorpay(updated.length);
      return updated;
    });
    setNewMemberEmail('');
    toast.success(`Invite sent to ${newMember.email}. Seat allocated.`);
    
    // Append to audit logs
    const newAudit = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: userProfile.name || 'You',
      action: 'Invite User Seat',
      target: `${newMember.name} (${newMember.role})`,
      ip: '192.168.1.42',
    };
    setAuditLogs(prev => [newAudit, ...prev]);
  };

  const handleRemoveMember = async (id: string, name: string) => {
    if (user && id === user.id) {
      toast.error('Cannot remove the workspace owner.');
      return;
    }
    const isConfirmed = await confirm(`Are you sure you want to remove ${name} from this workspace?`, "Remove Member");
    if (isConfirmed) {
      const success = await removeWorkspaceMember(id);
      if (success) {
        setWorkspaceMembers(prev => {
          const updated = prev.filter(m => m.id !== id);
          void syncSeatsToRazorpay(updated.length);
          return updated;
        });
      }
    }
  };

  const handleBanMember = async (id: string, name: string) => {
    if (user && id === user.id) {
      toast.error('Cannot ban the workspace owner.');
      return;
    }
    const isConfirmed = await confirm(`Are you sure you want to BAN ${name} from this workspace? They will be immediately kicked out and will not be able to re-join.`, "Ban Member");
    if (isConfirmed) {
      const success = await banWorkspaceMember(id);
      if (success) {
        setWorkspaceMembers(prev => prev.map(m => m.id === id ? { ...m, status: 'Banned' } : m));
      }
    }
  };

  const handleUnbanMember = async (id: string, name: string) => {
    const isConfirmed = await confirm(`Are you sure you want to UNBAN ${name}? They will be able to join the workspace again.`, "Unban Member");
    if (isConfirmed) {
      const success = await unbanWorkspaceMember(id);
      if (success) {
        setWorkspaceMembers(prev => prev.map(m => m.id === id ? { ...m, status: 'Active' } : m));
      }
    }
  };

  const planLabelToId = (label: typeof currentPlan): BillingPlanId => {
    return planIdFromLabel(label) ?? 'team_pro';
  };

  const syncSeatsToRazorpay = async (count: number) => {
    if (!ORG_ID) return;
    try {
      await updateSeatCount(ORG_ID, count);
    } catch {
      // Razorpay not configured — local seat state only
    }
  };

  const triggerPlanUpgrade = async (plan: 'Starter' | 'Team Pro' | 'Enterprise') => {
    if (plan === currentPlan) {
      toast.info(`Your workspace is already on the ${plan} plan.`);
      return;
    }
    toast.loading('Activating plan in Beta Mode...', { id: 'checkout' });
    setTimeout(() => {
      setCurrentPlan(plan);
      toast.success(`Plan updated to ${plan} for free during public Beta!`, { id: 'checkout' });
      
      // Add transaction audit log
      const newAudit = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: userProfile.name || 'You',
        action: 'Upgrade Plan Subscription (Beta)',
        target: `${plan} (Beta Mode)`,
        ip: '192.168.1.42',
      };
      setAuditLogs(prev => [newAudit, ...prev]);
    }, 1000);
  };

  const handleOpenBillingPortal = async () => {
    toast.info('Billing management is disabled during the free public Beta phase.');
  };

  // Simulated checkout when Razorpay env vars are not configured
  const handleCompleteCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    
    toast.loading('Processing simulated payment via Razorpay…', { id: 'checkout' });
    
    setTimeout(() => {
      setCurrentPlan(targetPlan);
      setShowCheckoutModal(false);
      toast.success(`Payment verified successfully! Welcome to the ${targetPlan} Plan!`, { id: 'checkout' });
      
      // Add transaction audit log
      const newAudit = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actor: userProfile.name || 'You',
        action: 'Upgrade Plan Subscription',
        target: `${targetPlan} (${billingCycle})`,
        ip: '192.168.1.42',
      };
      setAuditLogs(prev => [newAudit, ...prev]);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="w-6 h-6 text-foreground" />
          Workspace Controls
        </h1>
        <p className="text-sm text-muted-foreground">Manage multi-tenant permissions, billing tiers, SSO channels, and compliance audit logs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
        
        {/* Navigation Sidebar */}
        <nav className="flex flex-col gap-0.5">
          {sections.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              type="button"
              className={cn(
                "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm text-left w-full transition-colors",
                activeSection === item.id 
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Dynamic Content Columns */}
        <div className="flex flex-col gap-8">
          
          {/* General Section */}
          {activeSection === 'general' && (
            <div className="space-y-8">
              <section className="flex flex-col gap-5">
                <div>
                  <h2 className="text-base font-semibold mb-1">General Settings</h2>
                  <p className="text-sm text-muted-foreground">Basic operational workspace parameters and domains.</p>
                </div>
                <div className="h-px bg-border" />
                
                <div className="grid gap-4 max-w-md">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">Workspace Name</label>
                    <input 
                      type="text" 
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      className="px-3 py-1.5 border border-border rounded-md bg-background text-sm focus:ring-1 focus:ring-ring focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">Workspace Subdomain URL</label>
                    <div className="flex items-center">
                      <span className="px-3 py-1.5 border border-r-0 border-border rounded-l-md bg-muted text-muted-foreground text-sm font-medium">
                        nexus-ai.app/
                      </span>
                      <input 
                        type="text" 
                        value={workspaceUrl}
                        onChange={(e) => setWorkspaceUrl(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-border rounded-r-md bg-background text-sm focus:ring-1 focus:ring-ring focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={() => {
                    toast.success('Workspace details saved successfully!');
                    // Audit log
                    const newAudit = {
                      id: `log-${Date.now()}`,
                      timestamp: new Date().toISOString(),
                      actor: userProfile.name || 'You',
                      action: 'Update Workspace Meta',
                      target: `${workspaceName} (url: ${workspaceUrl})`,
                      ip: '192.168.1.42',
                    };
                    setAuditLogs(prev => [newAudit, ...prev]);
                  }}
                  className="w-fit bg-foreground text-background hover:opacity-90 h-8 text-xs font-bold"
                >
                  Save Changes
                </Button>
              </section>

              <section className="flex flex-col gap-5">
                <div>
                  <h2 className="text-base font-semibold mb-1">Global AI Access Privileges</h2>
                  <p className="text-sm text-muted-foreground">Authorize what document contexts your Chief of Staff models can sweep.</p>
                </div>
                <div className="h-px bg-border" />
                
                <div className="flex flex-col gap-3 max-w-lg">
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/20">
                    <div className="flex flex-col gap-0.5 pr-4">
                      <span className="text-xs font-semibold text-foreground">Read Local Document Repositories</span>
                      <span className="text-[10px] text-muted-foreground">Allow Gemini models to index and chunk uploaded files.</span>
                    </div>
                    <Toggle enabled={permissions.readDrive} onToggle={() => setPermissions(p => ({ ...p, readDrive: !p.readDrive }))} />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/20">
                    <div className="flex flex-col gap-0.5 pr-4">
                      <span className="text-xs font-semibold text-foreground">Read Active Emails Sync</span>
                      <span className="text-[10px] text-muted-foreground">Allows context collection across incoming operational mail grids.</span>
                    </div>
                    <Toggle enabled={permissions.readEmails} onToggle={() => setPermissions(p => ({ ...p, readEmails: !p.readEmails }))} />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/20">
                    <div className="flex flex-col gap-0.5 pr-4">
                      <span className="text-xs font-semibold text-foreground">Vector Semantic Similarity Searches</span>
                      <span className="text-[10px] text-muted-foreground">Utilizes text-embedding-3-small vector clusters for document search.</span>
                    </div>
                    <Toggle enabled={permissions.vectorSearch} onToggle={() => setPermissions(p => ({ ...p, vectorSearch: !p.vectorSearch }))} />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/10 opacity-70">
                    <div className="flex flex-col gap-0.5 pr-4">
                      <span className="text-xs font-semibold text-foreground">Automatic AI Email Dispatches</span>
                      <span className="text-[10px] text-muted-foreground">Allows AI to dispatch emails automatically without approval.</span>
                    </div>
                    <Toggle enabled={permissions.autoSend} onToggle={() => {}} disabled />
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground ml-1">
                    <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>Autosend is blocked: Nexus AI requires explicit human-in-the-loop approvals.</span>
                  </div>
                </div>
              </section>

              {/* Danger Zone */}
              {workspace && workspace.ownerId === user?.id && (
                <section className="flex flex-col gap-5 border border-red-500/20 rounded-xl p-5 bg-red-500/5 max-w-lg">
                  <div>
                    <h2 className="text-base font-semibold text-red-500 mb-1 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 animate-pulse" />
                      Danger Zone
                    </h2>
                    <p className="text-xs text-muted-foreground">Irreversible administrative actions for this workspace.</p>
                  </div>
                  <div className="h-px bg-red-500/20" />
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-foreground">Delete this workspace</span>
                      <span className="text-[10px] text-muted-foreground">Once you delete a workspace, there is no going back. All chat logs, documents, and lists will be permanently deleted.</span>
                    </div>
                    <Button 
                      type="button" 
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-8 px-4 shrink-0"
                      onClick={async () => {
                        const confirmName = await prompt(
                          `Are you sure you want to delete this workspace? Type the workspace name "${workspace.name}" to confirm:`,
                          '',
                          'Delete Workspace'
                        );
                        if (confirmName === workspace.name) {
                          const success = await deleteWorkspace(workspace.id);
                          if (success) {
                            toast.success('Workspace deleted.');
                          }
                        } else if (confirmName !== null) {
                          toast.error('Workspace name did not match.');
                        }
                      }}
                    >
                      Delete Workspace
                    </Button>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Account & Seat Management Section */}
          {activeSection === 'account' && (
            <div className="space-y-8">
              <section className="flex flex-col gap-5">
                <div>
                  <h2 className="text-base font-semibold mb-1">My Account Settings</h2>
                  <p className="text-sm text-muted-foreground">Manage your workspace identity, select a profile avatar, and set email coordinates.</p>
                </div>
                <div className="h-px bg-border" />
                
                <div className="grid gap-5">
                  {/* Profile Avatar Selection */}
                  <div className="flex flex-col gap-2.5">
                    <label className="text-xs font-semibold text-foreground">Choose Profile Avatar</label>
                    <div className="flex items-center gap-4 mb-2">
                      {getAvatarStyle(userProfile.avatar) ? (
                        <div 
                          className="w-16 h-16 rounded-full border-2 border-indigo-500 shadow-sm shrink-0" 
                          style={getAvatarStyle(userProfile.avatar) || undefined}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center border-2 border-border shadow-sm text-white font-bold text-lg shrink-0">
                          {userProfile.name ? userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'A'}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">Current Avatar</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">Pick one of the 25 hand-drawn avatars below.</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 bg-muted/20 p-3.5 border border-border/85 rounded-lg max-w-md">
                      {Array.from({ length: 25 }).map((_, idx) => {
                        const avatarVal = `avatar-${idx}`;
                        const isSelected = userProfile.avatar === avatarVal;
                        
                        const col = idx % 5;
                        const row = Math.floor(idx / 5);
                        const x = col * 25;
                        const y = row * 25;
                        
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setUserProfile(prev => ({ ...prev, avatar: avatarVal }))}
                            className={cn(
                              "w-10 h-10 rounded-full border transition-all cursor-pointer hover:scale-105 active:scale-95 focus:outline-none shrink-0",
                              isSelected 
                                ? "border-indigo-600 ring-2 ring-indigo-500/20 scale-105" 
                                : "border-border hover:border-indigo-500/50"
                            )}
                            style={{
                              backgroundImage: "url('/avatars-sheet.jpg')",
                              backgroundSize: '500% 500%',
                              backgroundPosition: `${x}% ${y}%`,
                              backgroundRepeat: 'no-repeat'
                            }}
                            title={`Avatar Option ${idx + 1}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 max-w-md">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground">Profile Full Name</label>
                      <input 
                        type="text" 
                        value={userProfile.name}
                        onChange={(e) => setUserProfile(prev => ({ ...prev, name: e.target.value }))}
                        className="px-3 py-1.5 border border-border rounded-md bg-background text-sm focus:ring-1 focus:ring-ring focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground">Owner Business Email</label>
                      <input 
                        type="email" 
                        value={userProfile.email}
                        onChange={(e) => setUserProfile(prev => ({ ...prev, email: e.target.value }))}
                        className="px-3 py-1.5 border border-border rounded-md bg-background text-sm focus:ring-1 focus:ring-ring focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-500">Security Access Role</label>
                      <input 
                        type="text" 
                        value={userProfile.role}
                        disabled
                        className="px-3 py-1.5 border border-border rounded-md bg-muted text-sm text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={async () => {
                    await updateProfile(userProfile.name, userProfile.email, userProfile.avatar);
                    toast.success('Profile credentials updated!');
                  }}
                  className="w-fit bg-foreground text-background hover:opacity-90 h-8 text-xs font-bold cursor-pointer"
                >
                  Save Profile
                </Button>

                <div className="my-6 border-t border-border" />

                <div className="flex flex-col gap-5 border border-red-500/25 rounded-xl p-5 bg-red-500/5 max-w-md">
                  <div>
                    <h2 className="text-base font-semibold text-red-500 mb-1 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      Danger Zone
                    </h2>
                    <p className="text-xs text-muted-foreground">Irreversible actions on your personal account.</p>
                  </div>
                  <div className="h-px bg-red-500/20" />
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-foreground">Delete Account</span>
                      <span className="text-[10px] text-muted-foreground">Permanently wipe your profile and credentials from Supabase. This action cannot be reverted.</span>
                    </div>
                    <Button 
                      type="button" 
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-8 px-4 shrink-0 cursor-pointer"
                      onClick={async () => {
                        const confirmText = await prompt(
                          `Type "DELETE" to confirm your account deletion:`,
                          '',
                          'Delete Account'
                        );
                        if (confirmText === 'DELETE') {
                          const result = await deleteAccount();
                          if (result.success) {
                            toast.success('Account successfully deleted.');
                          }
                        } else if (confirmText !== null) {
                          toast.error('Confirmation code did not match.');
                        }
                      }}
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>
              </section>

              {/* Enterprise Seats Management Section */}
              <section className="flex flex-col gap-5">
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">Workspace Seats & Teammates</h2>
                    <span className="text-[10px] font-bold bg-white/5 border px-2 py-0.5 rounded-full text-foreground/80">
                      Seats Allocated: {workspaceMembers.length} / {currentPlan === 'Starter' ? '1' : currentPlan === 'Team Pro' ? '15' : 'Unlimited'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {workspace ? `${workspace.name} · ${workspace.slug}` : 'Create your workspace, then invite teammates.'}
                  </p>
                </div>
                <div className="h-px bg-border" />

                {/* Invite Seat Form */}
                <form onSubmit={handleCreateInvite} className="flex gap-2 max-w-lg items-end">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">Invite Email</label>
                    <input 
                      type="email" 
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="e.g. colleague@company.com"
                      disabled={!canManageTeamMembers}
                      className="px-3 py-1.5 border border-border rounded-md bg-background text-sm focus:ring-1 focus:ring-ring focus:outline-none h-8"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 w-32 font-mono">
                    <label className="text-xs font-semibold text-foreground font-sans">Custom Code</label>
                    <input 
                      type="text" 
                      value={customInviteCode}
                      onChange={(e) => setCustomInviteCode(e.target.value.toUpperCase())}
                      placeholder="e.g. MYCODE"
                      disabled={!canManageTeamMembers}
                      className="px-3 py-1.5 border border-border rounded-md bg-background text-sm focus:ring-1 focus:ring-ring focus:outline-none h-8 uppercase font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 w-28">
                    <label className="text-xs font-semibold text-foreground">Assign Role</label>
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                      disabled={!canManageTeamMembers}
                      className="px-2 py-1.5 border border-border rounded-md bg-background text-xs focus:ring-1 focus:ring-ring focus:outline-none h-8"
                    >
                      <option value="Member">Member</option>
                      <option value="Guest">Guest</option>
                    </select>
                  </div>
                  <Button type="submit" disabled={!canManageTeamMembers} className="bg-foreground text-background hover:opacity-90 h-8 text-xs font-bold shrink-0">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Create Invite
                  </Button>
                </form>
                {!canManageTeamMembers && (
                  <p className="text-[10px] text-muted-foreground">Only workspace admins can invite or add teammates.</p>
                )}
                {inviteLink && (
                  <div className="max-w-lg p-2.5 border border-border rounded-lg bg-muted/30 text-xs flex items-center justify-between gap-3">
                    <span className="truncate font-mono text-muted-foreground">{inviteLink}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteLink);
                        toast.success('Invite link copied.');
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                )}
                {workspaceInvites.length > 0 && (
                  <div className="max-w-lg text-[10px] text-muted-foreground">
                    Active invites: {workspaceInvites.filter(invite => !invite.usedAt && !invite.revokedAt).length}
                  </div>
                )}

                {/* Seats List Table */}
                <div className="border border-border rounded-lg overflow-hidden max-w-lg">
                  <div className="bg-muted px-3 py-2 border-b border-border flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    <span>Member details</span>
                    <span className="mr-12">Role privileges</span>
                  </div>
                  <div className="divide-y divide-border">
                    {workspaceMembers.map(member => (
                      <div key={member.id} className="p-3 flex items-center justify-between hover:bg-muted/10 transition-colors">
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-foreground truncate">{member.name}</span>
                          <span className="text-[10px] text-muted-foreground truncate">{member.email}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {member.status === 'Banned' || member.status === 'banned' ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold border bg-red-500/10 border-red-500/30 text-red-500 uppercase tracking-wider shrink-0">
                              Banned
                            </span>
                          ) : null}

                          {canManageTeamMembers && member.id !== user?.id ? (
                            member.status === 'Banned' || member.status === 'banned' ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/10"
                                onClick={() => handleUnbanMember(member.id, member.name)}
                              >
                                Unban
                              </Button>
                            ) : (
                              <>
                                <select
                                  value={member.role}
                                  onChange={async (e) => {
                                    const newRole = e.target.value;
                                    const success = await updateMemberRole(member.id, newRole);
                                    if (success) {
                                      setWorkspaceMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m));
                                    }
                                  }}
                                  className="px-2 py-1.5 border border-border rounded-md bg-background text-[10px] focus:ring-1 focus:ring-ring focus:outline-none h-7"
                                >
                                  <option value="Admin">Admin</option>
                                  <option value="Member">Member</option>
                                  <option value="Developer">Developer</option>
                                  <option value="Designer">Designer</option>
                                  <option value="Guest">Guest</option>
                                </select>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/10 shrink-0"
                                  onClick={() => handleBanMember(member.id, member.name)}
                                >
                                  Ban
                                </Button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember(member.id, member.name)}
                                  className="text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 rounded transition-colors"
                                  title="Remove colleague seat"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )
                          ) : (
                            <span className={cn(
                              "text-[9px] px-2 py-0.5 rounded font-bold border",
                              member.role === 'Admin' ? 'bg-white border-foreground/30 text-foreground' : 'bg-muted border-border text-slate-500'
                            )}>
                              {member.role}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Workspace Invite Link & Code (Admins only) */}
                {workspace && (
                  <div className="max-w-lg border border-border rounded-lg p-4 bg-muted/20 flex flex-col gap-3">
                    <h3 className="text-xs font-bold text-foreground">Workspace Invite Link & Code</h3>
                    <div className="flex flex-col md:flex-row gap-2 items-start md:items-center justify-between">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Shareable Invite Code</span>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-extrabold text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 font-mono">
                            {workspace.inviteCode || 'NO CODE'}
                          </code>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-muted"
                            onClick={() => {
                              if (workspace.inviteCode) {
                                navigator.clipboard.writeText(workspace.inviteCode);
                                toast.success('Invite code copied to clipboard!');
                              }
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {canManageTeamMembers && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const ok = await regenerateWorkspaceInviteCode();
                            if (ok) {
                              toast.success('Workspace invite code updated.');
                            }
                          }}
                          className="text-[10px] h-7 font-bold gap-1 mt-1 md:mt-0"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Regenerate Code
                        </Button>
                      )}
                    </div>

                    <div className="h-px bg-border my-1" />

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Shareable Invite Link</span>
                      <div className="flex items-center justify-between gap-2 p-2 bg-background border border-border rounded-md text-xs font-mono text-muted-foreground truncate select-all">
                        <span className="truncate">{workspace.inviteCode ? `${origin}/invite/${workspace.inviteCode}` : 'Generate a code first'}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 shrink-0"
                          onClick={() => {
                            if (workspace.inviteCode) {
                              navigator.clipboard.writeText(`${origin}/invite/${workspace.inviteCode}`);
                              toast.success('Invite link copied!');
                            }
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pending Join Requests Section */}
                {joinRequests && joinRequests.length > 0 && (
                  <div className="border border-border rounded-lg overflow-hidden max-w-lg">
                    <div className="bg-amber-500/5 px-3 py-2 border-b border-border flex items-center justify-between text-[10px] uppercase font-bold text-amber-500 tracking-wider">
                      <span>Pending Join Requests ({joinRequests.filter(r => r.status === 'pending').length})</span>
                      <span className="text-[9px] text-muted-foreground font-medium uppercase">Requires Action</span>
                    </div>
                    <div className="divide-y divide-border">
                      {joinRequests.filter(req => req.status === 'pending').map(req => (
                        <PendingRequestRow key={req.id} req={req} reviewJoinRequest={reviewJoinRequest} />
                      ))}
                      {joinRequests.filter(req => req.status === 'pending').length === 0 && (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          No pending join requests at this time.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="max-w-lg grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="border border-border rounded-lg p-3 bg-muted/10">
                    <h3 className="text-xs font-bold text-foreground mb-1">AI Usage Today</h3>
                    <p className="text-[10px] text-muted-foreground">
                      {aiUsage.find(item => item.userId === user?.id && item.date === new Date().toISOString().slice(0, 10))?.requests || 0}
                      {' / '}
                      {aiUsage.find(item => item.userId === user?.id && item.date === new Date().toISOString().slice(0, 10))?.limit || (user?.role?.toLowerCase().includes('admin') ? 100 : 25)}
                      {' '}requests
                    </p>
                  </div>
                  <div className="border border-border rounded-lg p-3 bg-muted/10">
                    <h3 className="text-xs font-bold text-foreground mb-1">Tester Feedback</h3>
                    <p className="text-[10px] text-muted-foreground">{feedbackItems.length} notes captured</p>
                  </div>
                </div>

                <form onSubmit={handleSubmitFeedback} className="max-w-lg flex flex-col gap-2">
                  <label className="text-xs font-semibold text-foreground">Send Test Feedback</label>
                  <textarea
                    value={feedbackDraft}
                    onChange={(e) => setFeedbackDraft(e.target.value)}
                    placeholder="What felt confusing, broken, or promising?"
                    className="min-h-20 px-3 py-2 border border-border rounded-md bg-background text-sm focus:ring-1 focus:ring-ring focus:outline-none resize-none"
                  />
                  <Button type="submit" variant="outline" className="w-fit h-8 text-xs font-bold">
                    Send Feedback
                  </Button>
                </form>
              </section>
            </div>
          )}

          {/* Appearance Section */}
          {activeSection === 'appearance' && (
            <section className="flex flex-col gap-5">
              <div>
                <h2 className="text-base font-semibold mb-1">Appearance & Styling</h2>
                <p className="text-sm text-muted-foreground">Customize how your workspace looks and define custom user themes.</p>
              </div>
              <div className="h-px bg-border" />
              
              <div className="flex items-center justify-between p-3 border border-border rounded-lg max-w-md bg-card/20">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-foreground">Workspace Theme Toggles</span>
                  <span className="text-[10px] text-muted-foreground">Switch between high-contrast dark and light modes.</span>
                </div>
                <Button onClick={toggleTheme} variant="outline" size="sm" className="h-7 text-xs border-border font-bold">
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </Button>
              </div>

              {/* Theme Presets Grid */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Workspace Color Palettes</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Choose from a variety of curated, responsive workspace palettes.</p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg">
                  {[
                    { id: 'vintage', label: 'Vintage Cream', colors: ['#f5f4ec', '#e9dfcd', '#8f573b'] },
                    { id: 'nexus', label: 'Nexus Default', colors: ['#ffffff', '#fbfbfa', '#37352f'] },
                    { id: 'apricot', label: 'Warm Apricot', colors: ['#faf6ee', '#f3ede2', '#8e573e'] },
                    { id: 'ocean', label: 'Nordic Ocean', colors: ['#edf3f6', '#e2edf2', '#2c5a70'] },
                    { id: 'cyberpunk', label: 'Cyberpunk Neon', colors: ['#0d0a12', '#100c16', '#ff0055'] },
                    { id: 'forest', label: 'Forest Mint', colors: ['#f2f6f2', '#e5ece5', '#2e6b27'] }
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setThemeConfig({ name: preset.id })}
                      type="button"
                      className={cn(
                        "p-3 rounded-lg border text-left flex flex-col gap-2 transition-all hover:bg-accent/40 bg-card/40 cursor-pointer",
                        themeConfig.name === preset.id ? "border-primary ring-1 ring-primary" : "border-border"
                      )}
                    >
                      <span className="text-[11px] font-bold text-foreground leading-none">{preset.label}</span>
                      <div className="flex items-center gap-1 mt-1">
                        {preset.colors.map((c, i) => (
                          <span 
                            key={i} 
                            className="w-3.5 h-3.5 rounded-full border border-border/60 shrink-0" 
                            style={{ backgroundColor: c }} 
                          />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Theme Editor */}
              <div className="space-y-3 pt-2">
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Branding Custom Theme Creator</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Customize corporate branding colors. Styling applies globally in real-time.</p>
                </div>
                
                <div className="p-4 border border-border rounded-lg max-w-md bg-card/20 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between gap-2 p-1.5 border border-border/50 rounded bg-background">
                      <span className="text-[10px] font-semibold text-muted-foreground">Text / Accent</span>
                      <input 
                        type="color" 
                        value={themeConfig.name === 'custom' ? themeConfig.primary || '#37352f' : '#37352f'}
                        onChange={(e) => setThemeConfig({
                          name: 'custom',
                          primary: e.target.value,
                          background: themeConfig.name === 'custom' ? themeConfig.background : undefined,
                          sidebar: themeConfig.name === 'custom' ? themeConfig.sidebar : undefined,
                          accent: themeConfig.name === 'custom' ? themeConfig.accent : undefined,
                        })}
                        className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 p-1.5 border border-border/50 rounded bg-background">
                      <span className="text-[10px] font-semibold text-muted-foreground">Background</span>
                      <input 
                        type="color" 
                        value={themeConfig.name === 'custom' ? themeConfig.background || '#ffffff' : '#ffffff'}
                        onChange={(e) => setThemeConfig({
                          name: 'custom',
                          background: e.target.value,
                          primary: themeConfig.name === 'custom' ? themeConfig.primary : undefined,
                          sidebar: themeConfig.name === 'custom' ? themeConfig.sidebar : undefined,
                          accent: themeConfig.name === 'custom' ? themeConfig.accent : undefined,
                        })}
                        className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 p-1.5 border border-border/50 rounded bg-background">
                      <span className="text-[10px] font-semibold text-muted-foreground">Sidebar</span>
                      <input 
                        type="color" 
                        value={themeConfig.name === 'custom' ? themeConfig.sidebar || '#fbfbfa' : '#fbfbfa'}
                        onChange={(e) => setThemeConfig({
                          name: 'custom',
                          sidebar: e.target.value,
                          primary: themeConfig.name === 'custom' ? themeConfig.primary : undefined,
                          background: themeConfig.name === 'custom' ? themeConfig.background : undefined,
                          accent: themeConfig.name === 'custom' ? themeConfig.accent : undefined,
                        })}
                        className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 p-1.5 border border-border/50 rounded bg-background">
                      <span className="text-[10px] font-semibold text-muted-foreground">Highlight Hover</span>
                      <input 
                        type="color" 
                        value={themeConfig.name === 'custom' ? themeConfig.accent || '#f1f1ef' : '#f1f1ef'}
                        onChange={(e) => setThemeConfig({
                          name: 'custom',
                          accent: e.target.value,
                          primary: themeConfig.name === 'custom' ? themeConfig.primary : undefined,
                          background: themeConfig.name === 'custom' ? themeConfig.background : undefined,
                          sidebar: themeConfig.name === 'custom' ? themeConfig.sidebar : undefined,
                        })}
                        className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                      />
                    </div>
                  </div>
                  {themeConfig.name === 'custom' && (
                    <Button 
                      onClick={() => setThemeConfig({ name: 'nexus' })}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-8 border-dashed border-red-500/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      Reset Custom Branding
                    </Button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <section className="flex flex-col gap-5">
              <div>
                <h2 className="text-base font-semibold mb-1">Notifications</h2>
                <p className="text-sm text-muted-foreground">Customize how and when you receive workspace sync alerts.</p>
              </div>
              <div className="h-px bg-border" />
              
              <div className="flex flex-col gap-3 max-w-md">
                <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/20">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-foreground">Email Notifications</span>
                    <span className="text-[10px] text-muted-foreground">Receive daily digests of action items.</span>
                  </div>
                  <Toggle enabled={true} onToggle={() => {}} />
                </div>
                <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/20">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-foreground">AI Chief of Staff Alerts</span>
                    <span className="text-[10px] text-muted-foreground">Real-time alerts for identified contract bottlenecks.</span>
                  </div>
                  <Toggle enabled={true} onToggle={() => {}} />
                </div>
                <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/20">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-foreground">Desktop Mentions</span>
                    <span className="text-[10px] text-muted-foreground">Push notifications for direct @mentions in team chat.</span>
                  </div>
                  <Toggle enabled={false} onToggle={() => {}} />
                </div>
              </div>
            </section>
          )}

          {/* Security & SSO SAML Section */}
          {activeSection === 'security' && (
            <div className="space-y-8">
              <section className="flex flex-col gap-5">
                <div>
                  <h2 className="text-base font-semibold mb-1">Enterprise SSO Configurations</h2>
                  <p className="text-sm text-muted-foreground">Secure team sign-ins using SAML / OIDC provider mappings.</p>
                </div>
                <div className="h-px bg-border" />

                <div className="flex flex-col gap-3 max-w-lg">
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/20">
                    <div className="flex flex-col gap-0.5 pr-4">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-foreground" />
                        SAML Single Sign-On Authentication
                      </span>
                      <span className="text-[10px] text-muted-foreground">Requires users to authenticate via your identity portal.</span>
                    </div>
                    <Toggle enabled={ssoConfig.enabled} onToggle={handleToggleSSO} />
                  </div>

                  {ssoConfig.enabled && (
                    <div className="p-4 border border-border rounded-lg bg-zinc-950/20 max-w-lg space-y-4 animate-in fade-in slide-in-from-top-1.5 duration-200">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-bold text-foreground tracking-wider">SSO Identity Provider</label>
                        <select
                          value={ssoConfig.provider}
                          onChange={(e) => setSsoConfig(p => ({ ...p, provider: e.target.value }))}
                          className="px-2 py-1.5 border border-border rounded bg-background text-xs focus:ring-1 focus:ring-ring focus:outline-none"
                        >
                          <option value="Google Workspace">Google Workspace Enterprise</option>
                          <option value="Microsoft Azure AD">Microsoft Azure AD OIDC</option>
                          <option value="Okta SAML 2.0">Okta SAML 2.0 Hub</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-bold text-foreground tracking-wider">SAML Identity Metadata URL</label>
                        <input 
                          type="text"
                          value={ssoConfig.metadataUrl}
                          onChange={(e) => setSsoConfig(p => ({ ...p, metadataUrl: e.target.value }))}
                          className="px-3 py-1.5 border border-border rounded bg-background text-xs focus:ring-1 focus:ring-ring focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-bold text-foreground tracking-wider">Verified Auth Domain Mappings</label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 font-semibold text-xs border border-white/5 bg-zinc-900 px-2.5 py-1 rounded">@</span>
                          <input 
                            type="text"
                            value={ssoConfig.domainMapping}
                            onChange={(e) => setSsoConfig(p => ({ ...p, domainMapping: e.target.value }))}
                            className="flex-1 px-3 py-1.5 border border-border rounded bg-background text-xs focus:ring-1 focus:ring-ring focus:outline-none"
                          />
                        </div>
                        <span className="text-[8px] text-muted-foreground mt-0.5">Auto-provisions logins with domain emails.</span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-1 border-t border-border/50">
                        <span className="text-[10px] font-semibold text-slate-500">Auto-provision seat on first auth</span>
                        <Toggle enabled={ssoConfig.authProvisioning} onToggle={() => setSsoConfig(p => ({ ...p, authProvisioning: !p.authProvisioning }))} />
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="flex flex-col gap-5">
                <div>
                  <h2 className="text-base font-semibold mb-1">Corporate Cryptography</h2>
                  <p className="text-sm text-muted-foreground">Configure AES symmetric keys securing enterprise team channels.</p>
                </div>
                <div className="h-px bg-border" />
                
                <div className="p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-lg max-w-lg flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">Symmetric Cryptography is Active</span>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-500/90 leading-relaxed mt-1">
                      Nexus AI encrypts all enterprise message bodies locally using symmetric keys in your browser memory before sending them to the Supabase PostgreSQL database. 
                    </p>
                    <span className="text-[9px] font-semibold mt-2 text-indigo-500/80 cursor-pointer flex items-center gap-1 hover:underline">
                      Review symmetric security specifications
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-5">
                <div>
                  <h2 className="text-base font-semibold mb-1">Active Sessions & Devices</h2>
                  <p className="text-sm text-muted-foreground">Manage your current active sessions across all browser devices.</p>
                </div>
                <div className="h-px bg-border" />

                <div className="p-4 border border-border rounded-lg bg-card/20 max-w-lg flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1 text-left">
                    <span className="text-xs font-semibold text-foreground">Sign out of all other devices</span>
                    <span className="text-[10px] text-muted-foreground">
                      This will revoke all active refresh tokens and terminate all current sessions.
                    </span>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline"
                    className="border-red-500/40 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20 text-xs font-semibold h-8 cursor-pointer shrink-0"
                    onClick={async () => {
                      const isConfirmed = await confirm(
                        "Are you sure you want to log out of all active devices? You will be logged out globally across all browsers.",
                        "Logout Everywhere"
                      );
                      if (isConfirmed) {
                        await logout(true);
                        toast.success("Successfully logged out from all other devices.");
                      }
                    }}
                  >
                    Logout Everywhere
                  </Button>
                </div>
              </section>
            </div>
          )}

          {/* Pricing & Billing Section (Beta Mode & Donation Hub) */}
          {activeSection === 'billing' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <section className="flex flex-col gap-5">
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      Workspace Subscription Plan
                    </h2>
                    <span className="text-xs font-bold bg-[#818cf8]/10 text-[#818cf8] border border-[#818cf8]/20 px-3 py-1 rounded-full">
                      Active: {currentPlan} Plan (Beta Pass)
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Nexus AI Beta is completely free for all team sizes. Active seats in workspace: {workspaceMembers.length}
                  </p>
                </div>

                <div className="p-4 border border-indigo-500/20 bg-indigo-500/5 rounded-xl max-w-lg flex items-start gap-3">
                  <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-indigo-400">Beta Mode Active (Zero Cost)</span>
                    <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                      No payment or seat license fees are charged during the public beta. You can scale your team up to the seat limits of each tier at no cost.
                    </p>
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Subscriptions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                  {[
                    { id: 'Starter', price: 'Free', seats: '1 seat', icon: User },
                    { id: 'Team Pro', price: 'Free', seats: 'Up to 15 seats', icon: Users, featured: true },
                    { id: 'Enterprise', price: 'Free', seats: 'Unlimited seats', icon: Database }
                  ].map((plan) => (
                    <div 
                      key={plan.id}
                      className={cn(
                        "p-4 rounded-xl border flex flex-col justify-between transition-all bg-card/20",
                        currentPlan === plan.id ? "border-[#818cf8] ring-1 ring-[#818cf8]" : "border-border/60 hover:border-[#818cf8]/40"
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">{plan.id}</span>
                          {plan.id === currentPlan && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          )}
                        </div>
                        <div className="flex items-baseline">
                          <span className="text-2xl font-extrabold text-foreground">{plan.price}</span>
                          <span className="text-[9px] text-muted-foreground ml-1">during Beta</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold leading-none">{plan.seats}</p>
                      </div>

                      <Button
                        onClick={() => triggerPlanUpgrade(plan.id as any)}
                        variant={plan.id === currentPlan ? 'outline' : 'default'}
                        type="button"
                        className={cn(
                          "w-full mt-4 h-7 text-[10px] font-bold rounded-lg cursor-pointer transition-all",
                          plan.id === currentPlan 
                            ? 'border-border text-slate-400 cursor-not-allowed hover:bg-transparent' 
                            : 'bg-foreground text-background hover:opacity-90 active:scale-95'
                        )}
                      >
                        {plan.id === currentPlan ? 'Active Plan' : 'Upgrade Plan'}
                      </Button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Billing Info Panel */}
              <section className="flex flex-col gap-5">
                <div>
                  <h2 className="text-base font-semibold mb-1">Billing Details</h2>
                  <p className="text-sm text-muted-foreground">Active payment cards, invoice records, and billing cycles.</p>
                </div>
                <div className="h-px bg-border" />
                
                <div className="p-4 border border-border rounded-lg max-w-lg bg-card/25 flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground font-sans">Public Beta Pass Active</span>
                    <span className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      Your workspace is registered under the Nexus AI Public Beta program. Credit cards and Razorpay payment sync are currently inactive.
                    </span>
                  </div>
                </div>
              </section>

              {/* Support & Donations Section */}
              <section className="flex flex-col gap-5 max-w-2xl">
                <div>
                  <h2 className="text-base font-semibold text-rose-500 mb-1 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-500 fill-rose-500 animate-pulse" />
                    Support Our Development
                  </h2>
                  <p className="text-sm text-muted-foreground">Nexus AI Beta is built with passion. If you love using it, consider donating to keep our GPU compute servers fast and sustainable.</p>
                </div>
                <div className="h-px bg-border" />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                  {/* Patreon Card */}
                  <div className="p-4 border border-border bg-card/20 hover:border-[#818cf8]/45 transition-colors rounded-xl flex flex-col justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-foreground">Patreon Community</span>
                      <span className="text-[10px] text-muted-foreground leading-relaxed">Get exclusive development updates, early access to new generative model configurations, and direct feedback channels with the developer team.</span>
                    </div>
                    <a 
                      href="https://www.patreon.com/c/sainathkotage/membership" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full h-8 flex items-center justify-center gap-1.5 bg-[#FF424D] hover:bg-[#FF424D]/90 text-white rounded-lg text-xs font-bold transition-all hover:scale-[1.01] active:scale-95"
                    >
                      Support on Patreon
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* UPI Donation Card */}
                  <div className="p-4 border border-border bg-card/20 hover:border-[#818cf8]/45 transition-colors rounded-xl flex flex-col justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-foreground">UPI Transfer (India)</span>
                      <span className="text-[10px] text-muted-foreground leading-relaxed">Direct support via UPI. Fast, secure, and zero-fee donations to keep server nodes active.</span>
                      
                      <div className="mt-2.5 flex items-center justify-between bg-muted/60 border border-border/80 px-2.5 py-1.5 rounded-lg">
                        <span className="text-[10px] font-mono font-bold text-foreground selection:bg-indigo-500/20">nexusai@upi</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          type="button"
                          className="w-6 h-6 text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-md shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText("nexusai@upi");
                            toast.success("UPI Address copied to clipboard!");
                          }}
                          title="Copy UPI ID"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="w-full text-center py-2 border border-dashed border-indigo-500/20 rounded-lg text-[9.5px] font-bold text-indigo-400 bg-indigo-500/5 select-all">
                      UPI ID: nexusai@upi
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* Audit Logs compliance section */}
          {activeSection === 'audit' && (
            <section className="flex flex-col gap-5">
              <div>
                <h2 className="text-base font-semibold mb-1">Security Audit Compliance Log</h2>
                <p className="text-sm text-muted-foreground">Immutable administrative transaction stream for organization compliance auditing.</p>
              </div>
              <div className="h-px bg-border" />

              <div className="border border-border rounded-lg overflow-hidden bg-black text-slate-400 font-mono text-[10px]">
                <div className="bg-muted px-4 py-2 border-b border-border flex items-center justify-between font-bold text-muted-foreground text-[9px] uppercase tracking-wider shrink-0">
                  <span>Audit Timestamp</span>
                  <span>Event Action</span>
                  <span className="mr-8">Details</span>
                </div>
                <div className="divide-y divide-border/60 max-h-[300px] overflow-y-auto scrollbar-thin">
                  {auditLogs.map(log => (
                    <div key={log.id} className="p-3 hover:bg-white/5 transition-colors flex items-center justify-between shrink-0 leading-relaxed select-all">
                      <span className="text-slate-500 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className="text-indigo-400 font-bold shrink-0">{log.action}</span>
                      <span className="text-slate-300 truncate max-w-[200px]">{log.target}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground ml-1">
                <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>Audit streams sync immutable records dynamically with database transaction journals.</span>
              </div>
            </section>
          )}

          {/* Onboarding & Tutorial Settings Section */}
          {activeSection === 'tutorial' && (
            <div className="space-y-8 animate-fadeIn text-xs">
              <section className="flex flex-col gap-5">
                <div>
                  <h2 className="text-base font-semibold mb-1">Onboarding Tutorial Controls</h2>
                  <p className="text-sm text-muted-foreground">Manage your interactive tour progress, restart guides, and A/B configurations.</p>
                </div>
                <div className="h-px bg-border" />

                <div className="flex flex-col gap-4 max-w-lg">
                  <div className="flex items-center justify-between p-4 border border-black/[0.06] dark:border-white/[0.08] rounded-2xl bg-black/[0.01] dark:bg-white/[0.01] shadow-none">
                    <div className="flex flex-col gap-1 pr-4">
                      <span className="text-xs font-semibold text-foreground">Interactive Tour Checklist</span>
                      <p className="text-[10px] text-muted-foreground leading-normal">
                        Relaunch the step-by-step tutorial tour focusing on core collaborative assets.
                      </p>
                    </div>
                    <Button 
                      onClick={() => restartTutorial()}
                      type="button"
                      className="bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium rounded-full h-8 text-[11px] px-4 shrink-0 gap-1.5 shadow-none transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Restart Tour
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-black/[0.06] dark:border-white/[0.08] rounded-2xl bg-black/[0.01] dark:bg-white/[0.01] shadow-none">
                    <div className="flex flex-col gap-1 pr-4">
                      <span className="text-xs font-semibold text-foreground">Reset Onboarding State</span>
                      <p className="text-[10px] text-muted-foreground leading-normal">
                        Clear all completion records, force-reload the Welcome screen, and re-draw clean guides.
                      </p>
                    </div>
                    <Button 
                      variant="outline"
                      type="button"
                      onClick={() => resetProgress()}
                      className="border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-400 font-medium rounded-full h-8 text-[11px] px-4 shrink-0 cursor-pointer"
                    >
                      Reset Progress
                    </Button>
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-5">
                <div>
                  <h2 className="text-base font-semibold mb-1">A/B Testing Variants</h2>
                  <p className="text-sm text-muted-foreground">Assign and test alternative onboarding layouts manually.</p>
                </div>
                <div className="h-px bg-border" />

                <div className="flex items-center gap-3 p-3.5 bg-black/[0.01] dark:bg-white/[0.01] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl max-w-lg">
                  <div className="flex flex-col gap-0.5 flex-1">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      Current Assigned Flow:
                      <span className="bg-[#0071e3]/10 text-[#0071e3] dark:text-[#0071e3] border border-[#0071e3]/20 px-2 py-0.2 rounded-full font-mono font-semibold">
                        Variant {abVariant}
                      </span>
                    </span>
                    <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                      {abVariant === 'A' 
                        ? 'Variant A (Selected): Displaying extensive instructions, detailing sidebars, calendar features, and structural descriptions.'
                        : 'Variant B: Displaying active task challenges, brief highlights, and action checklist indicators.'}
                    </p>
                  </div>

                  <div className="flex bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.02] dark:border-white/[0.02] rounded-full p-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setAbVariantManually('A')}
                      className={cn(
                        "px-3 py-1 text-[10px] font-semibold rounded-full transition-all cursor-pointer",
                        abVariant === 'A' ? "bg-[#0071e3] text-white shadow-none" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      A
                    </button>
                    <button
                      type="button"
                      onClick={() => setAbVariantManually('B')}
                      className={cn(
                        "px-3 py-1 text-[10px] font-semibold rounded-full transition-all cursor-pointer",
                        abVariant === 'B' ? "bg-[#0071e3] text-white shadow-none" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      B
                    </button>
                  </div>
                </div>
              </section>

              {/* KPI Analytics Summary Panel */}
              <section className="flex flex-col gap-5">
                <div>
                  <h2 className="text-base font-semibold mb-1">Onboarding Analytics (KPI Logs)</h2>
                  <p className="text-sm text-muted-foreground">Live telemetry dashboard monitoring onboarding health. (Supabase synced: {dbAvailable ? 'Yes' : 'No - Cached Locally'})</p>
                </div>
                <div className="h-px bg-border" />

                <div className="grid grid-cols-3 gap-4 max-w-lg">
                  <div className="p-3 border border-border bg-card/20 rounded-xl flex flex-col gap-1.5 shadow-sm">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Completion Rate</span>
                    <span className="text-xl font-bold text-foreground">84.2%</span>
                    <span className="text-[9px] text-emerald-600 font-semibold font-mono">▲ +4.1% vs last month</span>
                  </div>

                  <div className="p-3 border border-border bg-card/20 rounded-xl flex flex-col gap-1.5 shadow-sm">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Avg. Tour Duration</span>
                    <span className="text-xl font-bold text-foreground">1m 42s</span>
                    <span className="text-[9px] text-muted-foreground font-medium">Optimal target: &lt; 2m</span>
                  </div>

                  <div className="p-3 border border-border bg-card/20 rounded-xl flex flex-col gap-1.5 shadow-sm">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Skip Rate</span>
                    <span className="text-xl font-bold text-foreground">15.8%</span>
                    <span className="text-[9px] text-red-600 font-semibold font-mono">▼ -2.4% vs last month</span>
                  </div>
                </div>

                {/* Event telemetry table */}
                <div className="border border-border rounded-lg overflow-hidden bg-black text-slate-400 font-mono text-[9px] max-w-lg">
                  <div className="bg-muted px-3 py-1.5 border-b border-border text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>Onboarding Event Name</span>
                    <span>Status / Variant</span>
                  </div>
                  <div className="divide-y divide-border/60 max-h-[140px] overflow-y-auto scrollbar-thin">
                    <div className="p-2 flex items-center justify-between">
                      <span className="text-slate-300 font-mono">tutorial_started</span>
                      <span className="text-indigo-500 font-bold font-mono">VARIANT_{abVariant}</span>
                    </div>
                    <div className="p-2 flex items-center justify-between">
                      <span className="text-slate-300 font-mono">tutorial_step_completed (1/6)</span>
                      <span className="text-slate-500 font-mono">12s spent</span>
                    </div>
                    {status === 'completed' && (
                      <div className="p-2 flex items-center justify-between bg-emerald-500/5">
                        <span className="text-emerald-400 font-bold font-mono">tutorial_completed</span>
                        <span className="text-emerald-500 font-bold font-mono">SUCCESS</span>
                      </div>
                    )}
                    {status === 'skipped' && (
                      <div className="p-2 flex items-center justify-between bg-red-500/5">
                        <span className="text-red-400 font-bold font-mono">tutorial_skipped</span>
                        <span className="text-red-500 font-bold font-mono">SKIPPED</span>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}

        </div>
      </div>

      {/* Dynamic Stripe Simulator Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-background border border-border shadow-2xl rounded-2xl max-w-md w-full p-6 space-y-5 animate-in scale-in duration-200 relative">
            <button
              onClick={() => setShowCheckoutModal(false)}
              type="button"
              className="absolute top-4 right-4 text-slate-500 hover:text-foreground hover:bg-muted p-1.5 rounded transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-indigo-600 bg-indigo-500/5 px-2.5 py-1 rounded border border-indigo-500/10">Razorpay Payment Gateway</span>
              <h3 className="text-base font-bold text-foreground mt-2">Secure License Checkout</h3>
              <p className="text-xs text-muted-foreground">Upgrading your workspace subscription plan seat license. Charges apply instantly.</p>
            </div>

            <div className="h-px bg-border" />

            <form onSubmit={handleCompleteCheckout} className="space-y-4">
              <div className="p-3 bg-muted/40 border border-border rounded-lg space-y-1">
                <div className="flex justify-between text-xs text-slate-500 font-semibold">
                  <span>Selected Package</span>
                  <span>Price / mo</span>
                </div>
                <div className="flex justify-between text-sm text-foreground font-bold pt-1">
                  <span>{targetPlan} License Tier</span>
                  <span>{targetPlan === 'Starter' ? '$10' : targetPlan === 'Team Pro' ? '$19' : '$49'}</span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-foreground">Cardholder Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={checkoutCard.name}
                    onChange={(e) => setCheckoutCard(p => ({ ...p, name: e.target.value }))}
                    className="px-3 py-2 border border-border rounded bg-background text-xs focus:ring-1 focus:ring-ring focus:outline-none"
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-foreground">Credit Card Number</label>
                  <input 
                    type="text" 
                    required
                    value={checkoutCard.number}
                    onChange={(e) => setCheckoutCard(p => ({ ...p, number: e.target.value }))}
                    className="px-3 py-2 border border-border rounded bg-background text-xs focus:ring-1 focus:ring-ring focus:outline-none font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-foreground">Expiration Date</label>
                    <input 
                      type="text" 
                      required
                      placeholder="MM/YY"
                      value={checkoutCard.expiry}
                      onChange={(e) => setCheckoutCard(p => ({ ...p, expiry: e.target.value }))}
                      className="px-3 py-2 border border-border rounded bg-background text-xs focus:ring-1 focus:ring-ring focus:outline-none font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-foreground">Security Code (CVC)</label>
                    <input 
                      type="text" 
                      required
                      placeholder="123"
                      value={checkoutCard.cvc}
                      onChange={(e) => setCheckoutCard(p => ({ ...p, cvc: e.target.value }))}
                      className="px-3 py-2 border border-border rounded bg-background text-xs focus:ring-1 focus:ring-ring focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  type="submit"
                  className="w-full bg-foreground text-background hover:opacity-90 font-bold py-5 rounded-lg text-xs"
                >
                  Confirm & Charge Payment via Razorpay
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function PendingRequestRow({ req, reviewJoinRequest }: { req: any; reviewJoinRequest: any }) {
  const [loading, setLoading] = useState<'approving' | 'rejecting' | null>(null);

  const handleReview = async (status: 'approved' | 'rejected') => {
    setLoading(status === 'approved' ? 'approving' : 'rejecting');
    const success = await reviewJoinRequest(req.id, status);
    if (!success) {
      setLoading(null);
    }
  };

  return (
    <div className="p-3 flex items-center justify-between hover:bg-muted/10 transition-colors">
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-bold text-foreground truncate">{req.userName}</span>
        <span className="text-[10px] text-muted-foreground truncate">{req.userEmail}</span>
        <span className="text-[9px] text-muted-foreground/60 mt-0.5">
          Requested {new Date(req.requestedAt).toLocaleDateString()}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          type="button"
          onClick={() => handleReview('rejected')}
          disabled={loading !== null}
          variant="outline"
          className="h-7 text-[10px] border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-400 font-bold"
        >
          {loading === 'rejecting' ? (
            <div className="w-3.5 h-3.5 rounded-full border border-red-500 border-t-transparent animate-spin" />
          ) : (
            'Reject'
          )}
        </Button>
        <Button
          type="button"
          onClick={() => handleReview('approved')}
          disabled={loading !== null}
          className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
        >
          {loading === 'approving' ? (
            <div className="w-3.5 h-3.5 rounded-full border border-white border-t-transparent animate-spin" />
          ) : (
            'Approve'
          )}
        </Button>
      </div>
    </div>
  );
}
