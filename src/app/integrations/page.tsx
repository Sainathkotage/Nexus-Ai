'use client';

import React, { useEffect, useState, use } from 'react';
import { useWorkspace } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { usePopup } from '@/lib/popup-context';
import { OAuthConnectButton } from '@/components/integrations/OAuthConnectButton';
import {
  Plug, RefreshCw, Trash2, Plus, AlertTriangle, ExternalLink,
  CheckCircle2, Clock, Shield, Database, Settings, Play, ArrowRight,
  Sparkles, X, Terminal, HelpCircle, ToggleLeft, ToggleRight, Info, Check, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

export default function IntegrationsHubPage() {
  const { workspace } = useWorkspace();
  const { confirm } = usePopup();
  const searchParams = useSearchParams();

  const [installedIntegrations, setInstalledIntegrations] = useState<any[]>([]);
  const [syncJobs, setSyncJobs] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowTrigger, setNewWorkflowTrigger] = useState('slack:message_received');
  const [newWorkflowAction, setNewWorkflowAction] = useState('nexus:create_task');
  const [isLoading, setIsLoading] = useState(true);
  const [syncingStates, setSyncingStates] = useState<Record<string, boolean>>({});
  
  // Custom API Token Modal states
  const [customTokenModal, setCustomTokenModal] = useState<{ open: boolean; connectorId: string | null }>({ open: false, connectorId: null });
  const [customTokenVal, setCustomTokenVal] = useState('');

  // Handle OAuth Redirect URL Params
  useEffect(() => {
    if (!searchParams) return;
    const success = searchParams.get('success');
    const connector = searchParams.get('connector');
    const error = searchParams.get('error');
    const msg = searchParams.get('msg');

    if (success === 'connected' && connector) {
      toast.success(`${connector.toUpperCase()} connected successfully! Nexus AI is now ready to sync workspace context.`);
      // Clean query params
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error === 'oauth_failed') {
      toast.error(`OAuth connection failed: ${msg || 'Unknown error'}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams]);

  const fetchIntegrationsData = async () => {
    if (!workspace) return;
    setIsLoading(true);
    try {
      // 1. Fetch integrations
      const { data: integrations, error: intErr } = await supabase
        .from('workspace_integrations')
        .select('*')
        .eq('workspace_id', workspace.id);
      
      if (intErr) throw intErr;
      setInstalledIntegrations(integrations || []);

      // 2. Fetch sync jobs
      if (integrations && integrations.length > 0) {
        const integrationIds = integrations.map(i => i.id);
        const { data: jobs, error: jobsErr } = await supabase
          .from('sync_jobs')
          .select('*')
          .in('integration_id', integrationIds)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (!jobsErr) setSyncJobs(jobs || []);
      } else {
        setSyncJobs([]);
      }

      // 3. Fetch workflows
      const { data: wfs, error: wfsErr } = await supabase
        .from('workflows')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false });
      
      if (!wfsErr) setWorkflows(wfs || []);
    } catch (e: any) {
      console.error('[FetchIntegrations Error]:', e);
      toast.error('Failed to load integration settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (workspace) {
      fetchIntegrationsData();
    }
  }, [workspace]);

  const handleTriggerSync = async (integrationId: string) => {
    setSyncingStates(prev => ({ ...prev, [integrationId]: true }));
    const toastId = toast.loading('Syncing workspace context and knowledge bases...');
    try {
      const response = await fetch('/api/integrations/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId })
      });
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Sync failed');
      }
      toast.success(`Workspace indexed successfully! Imported ${resData.docsSynced || 0} integration documents.`, { id: toastId });
      fetchIntegrationsData();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Sync failed', { id: toastId });
    } finally {
      setSyncingStates(prev => ({ ...prev, [integrationId]: false }));
    }
  };

  const handleDisconnectIntegration = async (integrationId: string) => {
    const confirmDisconnect = await confirm(
      'Are you sure you want to disconnect this integration? Nexus AI will no longer have access to this context and automated sync logs will be paused.',
      'Disconnect Integration'
    );
    if (!confirmDisconnect) return;

    try {
      const { error } = await supabase
        .from('workspace_integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;
      toast.success('Integration disconnected.');
      fetchIntegrationsData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to disconnect');
    }
  };

  const handleInstallIntegration = async (connectorId: string, token: string) => {
    if (!workspace) return;
    try {
      const response = await fetch('/api/integrations/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectorId,
          workspaceId: workspace.id,
          apiKeyValue: token
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to install');
      }

      toast.success(`${connectorId.toUpperCase()} integration connected successfully!`);
      setCustomTokenModal({ open: false, connectorId: null });
      setCustomTokenVal('');
      fetchIntegrationsData();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to connect integration');
    }
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !newWorkflowName.trim()) return;
    try {
      const triggerParts = newWorkflowTrigger.split(':');
      const actionParts = newWorkflowAction.split(':');
      const { error } = await supabase
        .from('workflows')
        .insert({
          workspace_id: workspace.id,
          name: newWorkflowName,
          trigger_config: {
            connector_id: triggerParts[0],
            event_type: triggerParts[1]
          },
          actions_config: [
            {
              connector_id: actionParts[0],
              action_type: actionParts[1]
            }
          ],
          is_active: true
        });

      if (error) throw error;
      toast.success('Automation workflow created successfully!');
      setNewWorkflowName('');
      setIsCreatingWorkflow(false);
      fetchIntegrationsData();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to create workflow');
    }
  };

  const handleToggleWorkflow = async (workflowId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('workflows')
        .update({ is_active: !currentActive })
        .eq('id', workflowId);
      if (error) throw error;
      toast.success(`Workflow ${!currentActive ? 'enabled' : 'disabled'} successfully!`);
      fetchIntegrationsData();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to update workflow');
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    const confirmDelete = await confirm('Are you sure you want to delete this workflow?', 'Delete Workflow');
    if (!confirmDelete) return;
    try {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', workflowId);
      if (error) throw error;
      toast.success('Workflow deleted successfully!');
      fetchIntegrationsData();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to delete workflow');
    }
  };

  // Available Connector Definitions
  const AVAILABLE_CONNECTORS = [
    {
      id: 'slack',
      name: 'Slack',
      logo: 'https://www.google.com/s2/favicons?domain=slack.com&sz=64',
      bgGlow: 'from-orange-500/5 to-transparent',
      borderColor: 'group-hover:border-orange-500/20',
      description: 'Fetch channel discussions, index shared files, auto-triage mentions and link chat alerts to workspace actions.',
      benefits: ['Channel history indexing', 'Real-time workflow alerts', 'File ingestion from chats']
    },
    {
      id: 'github',
      name: 'GitHub',
      logo: 'https://cdn-icons-png.flaticon.com/512/25/25231.png',
      bgGlow: 'from-indigo-500/5 to-transparent',
      borderColor: 'group-hover:border-indigo-500/20',
      description: 'Link pull requests, issues, commit logs and default branch file contents directly into Nexus retrieval vector indexes.',
      benefits: ['Commit logs integration', 'PR/Issue updates mapping', 'Code repository search']
    },
    {
      id: 'notion',
      name: 'Notion',
      logo: 'https://www.google.com/s2/favicons?domain=notion.so&sz=64',
      bgGlow: 'from-slate-500/5 to-transparent',
      borderColor: 'group-hover:border-slate-500/20',
      description: 'Extract wikis, specification documents, team databases and shared workspaces to build an organizational memory base.',
      benefits: ['Wiki documents indexing', 'Page sync alerts', 'Content markdown conversion']
    },
    {
      id: 'jira',
      name: 'Jira',
      logo: 'https://cdn-icons-png.flaticon.com/512/5968/5968875.png',
      bgGlow: 'from-blue-500/5 to-transparent',
      borderColor: 'group-hover:border-blue-500/20',
      description: 'Synchronize Jira projects, backlog stories, issue tracking and Sprint milestones. Map assignee profiles automatically.',
      benefits: ['Sprint backlogs mapping', 'Auto-triage workflow rules', 'Project workload planning']
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Page Header */}
      <div className="border-b border-border/60 bg-card/30 backdrop-blur-md px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Plug className="w-5 h-5 text-indigo-500 animate-pulse" /> Integrations Hub
          </h1>
          <p className="text-xs text-muted-foreground">Unify Slack chats, GitHub code bases, Notion wikis, and Jira issues into one unified AI space.</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Connection Wizard / Hero */}
        <div className="relative border border-indigo-500/10 rounded-3xl p-6 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-transparent overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="max-w-2xl space-y-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 text-3xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> One-Click Connect
              </span>
              <h2 className="text-lg font-bold text-foreground">Effortless Workspace Synchronization</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect external developer and team channels directly with your active Chief of Staff AI. Nexus automatically triages Jira tickets, monitors Slack references, and imports PR documentation instantly.
              </p>
            </div>
            <div className="flex items-center gap-2 border-l border-border/60 pl-0 md:pl-6">
              <div className="flex -space-x-3">
                <div className="w-8 h-8 rounded-full border border-background bg-card flex items-center justify-center p-1.5 shadow-sm">
                  <img src="https://www.google.com/s2/favicons?domain=slack.com&sz=64" className="w-full h-full object-contain" alt="Slack" />
                </div>
                <div className="w-8 h-8 rounded-full border border-background bg-card flex items-center justify-center p-1.5 shadow-sm">
                  <img src="https://cdn-icons-png.flaticon.com/512/25/25231.png" className="w-full h-full object-contain" alt="GitHub" />
                </div>
                <div className="w-8 h-8 rounded-full border border-background bg-card flex items-center justify-center p-1.5 shadow-sm">
                  <img src="https://www.google.com/s2/favicons?domain=notion.so&sz=64" className="w-full h-full object-contain" alt="Notion" />
                </div>
              </div>
              <span className="text-xs font-semibold text-muted-foreground pl-2">&rarr; Connected to Nexus</span>
            </div>
          </div>
        </div>

        {/* Section 1: Active Connections */}
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Active Connections
            </h3>
            <p className="text-3xs text-muted-foreground">Currently connected tools sharing context with your workspace memory.</p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map(n => (
                <div key={n} className="border border-border/60 p-5 rounded-2xl bg-card/50 flex flex-col gap-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3.5 bg-muted rounded w-1/3" />
                      <div className="h-2.5 bg-muted rounded w-1/5" />
                    </div>
                  </div>
                  <div className="h-14 bg-muted rounded-xl" />
                </div>
              ))}
            </div>
          ) : installedIntegrations.length === 0 ? (
            <div className="p-10 border border-dashed border-border/80 rounded-2xl bg-card/20 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
              <Plug className="w-8 h-8 opacity-45" />
              <p className="text-xs">No active integrations connected yet. Check the App Marketplace below to connect Slack or GitHub.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {installedIntegrations.map((integration) => {
                const connMeta = AVAILABLE_CONNECTORS.find(c => c.id === integration.connector_id) || {
                  name: integration.connector_id,
                  logo: 'https://placeholder.co/64',
                  description: 'External data connector configured for workspace context sync.'
                };
                const isSyncing = syncingStates[integration.id] || false;

                return (
                  <div key={integration.id} className="p-5 border border-border bg-card hover:shadow-md transition-all rounded-2xl flex flex-col justify-between gap-5 relative group">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center border border-border p-2">
                            <img src={connMeta.logo} className="w-full h-full object-contain" alt={connMeta.name} />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-foreground">{connMeta.name} Connection</h4>
                            <span className="text-3xs font-semibold text-muted-foreground uppercase tracking-wider">{integration.connector_id}</span>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-3xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Connected
                        </span>
                      </div>
                      <p className="text-3xs text-muted-foreground leading-relaxed">
                        Data from this platform is synced and retrieved inside smart searches and handover evaluations.
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/40">
                      <span className="text-3xs text-muted-foreground">Installed by: <strong className="text-foreground">Teammate</strong></span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleTriggerSync(integration.id)}
                          disabled={isSyncing}
                          className="h-7 text-3xs px-2.5 cursor-pointer font-semibold border-border text-foreground flex items-center gap-1"
                        >
                          <RefreshCw className={cn("w-3 h-3", isSyncing && "animate-spin")} />
                          {isSyncing ? 'Syncing...' : 'Sync Now'}
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleDisconnectIntegration(integration.id)}
                          className="h-7 text-3xs px-2.5 cursor-pointer font-semibold border-rose-500/20 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 2: Marketplace App Directory */}
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Database className="w-4 h-4 text-indigo-500" /> App Directory & Marketplace
            </h3>
            <p className="text-3xs text-muted-foreground">Link external applications using instant OAuth redirects or fall back to developer tokens.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {AVAILABLE_CONNECTORS.map((connector) => {
              const isInstalled = installedIntegrations.some(i => i.connector_id === connector.id);
              if (isInstalled) return null;

              return (
                <div key={connector.id} className={cn(
                  "border border-border/80 bg-card hover:bg-gradient-to-br transition-all duration-300 rounded-3xl p-6 flex flex-col justify-between gap-6 shadow-sm group",
                  connector.bgGlow
                )}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-muted/40 border border-border/80 flex items-center justify-center p-2.5 transition-transform group-hover:scale-105">
                          <img src={connector.logo} className="w-full h-full object-contain" alt={connector.name} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-foreground">{connector.name} Sync</h4>
                          <span className="text-3xs text-muted-foreground">Marketplace App</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-3xs text-muted-foreground leading-relaxed">
                      {connector.description}
                    </p>

                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Features:</span>
                      <ul className="grid grid-cols-1 gap-1">
                        {connector.benefits.map((b, i) => (
                          <li key={i} className="text-3xs text-foreground font-medium flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-indigo-500" /> {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/40">
                    <button
                      type="button"
                      onClick={() => setCustomTokenModal({ open: true, connectorId: connector.id })}
                      className="text-3xs text-muted-foreground hover:text-foreground font-semibold hover:underline cursor-pointer transition-colors"
                    >
                      Use manual token
                    </button>
                    {workspace && (
                      <OAuthConnectButton
                        connectorId={connector.id as any}
                        workspaceId={workspace.id}
                        size="sm"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Workflows & Automations */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-indigo-500" /> Workflows & Automations
              </h3>
              <p className="text-3xs text-muted-foreground">Automatically trigger workspace tasks, alerts, or system integrations based on tool events.</p>
            </div>
            <Button
              type="button"
              size="xs"
              onClick={() => setIsCreatingWorkflow(!isCreatingWorkflow)}
              className={cn("h-8 text-3xs font-semibold cursor-pointer rounded-full", isCreatingWorkflow ? "bg-muted text-foreground border border-border" : "bg-primary text-primary-foreground")}
            >
              {isCreatingWorkflow ? 'Cancel' : <><Plus className="w-3.5 h-3.5 mr-1" /> Create Workflow</>}
            </Button>
          </div>

          {isCreatingWorkflow && (
            <form onSubmit={handleCreateWorkflow} className="p-5 border border-border bg-card rounded-2xl flex flex-col gap-4 max-w-lg animate-fadeIn">
              <h4 className="text-xs font-bold text-foreground">Configure Custom Automation</h4>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-3xs font-semibold text-muted-foreground uppercase tracking-wider">Workflow Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sync GitHub PRs to Task list"
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                  className="bg-transparent border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-3xs font-semibold text-muted-foreground uppercase tracking-wider">When (Trigger Event)</label>
                  <select
                    value={newWorkflowTrigger}
                    onChange={(e) => setNewWorkflowTrigger(e.target.value)}
                    className="bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-none text-foreground"
                  >
                    <option value="slack:message_received">Slack: Message Received</option>
                    <option value="github:push">GitHub: Commit Pushed</option>
                    <option value="github:pull_request">GitHub: PR Opened</option>
                    <option value="notion:page_added">Notion: Database Page Added</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-3xs font-semibold text-muted-foreground uppercase tracking-wider">Then (Action)</label>
                  <select
                    value={newWorkflowAction}
                    onChange={(e) => setNewWorkflowAction(e.target.value)}
                    className="bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-none text-foreground"
                  >
                    <option value="nexus:create_task">Nexus: Create Workspace Task</option>
                    <option value="nexus:send_email">Nexus: Send Email Notification</option>
                    <option value="slack:send_message">Slack: Post to General Channel</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <Button
                  type="submit"
                  size="xs"
                  className="bg-foreground text-background font-semibold rounded-full h-8 px-4 text-3xs cursor-pointer"
                >
                  Create Workflow
                </Button>
              </div>
            </form>
          )}

          {workflows.length === 0 ? (
            <div className="p-6 border border-dashed border-border/80 rounded-2xl text-center text-muted-foreground text-3xs bg-card/25">
              No active workflow triggers configured. Hook up events to save teammate cycles.
            </div>
          ) : (
            <div className="space-y-2.5">
              {workflows.map((wf) => {
                const triggerText = wf.trigger_config?.connector_id + ': ' + wf.trigger_config?.event_type;
                const actionText = wf.actions_config?.[0]?.connector_id + ': ' + wf.actions_config?.[0]?.action_type;

                return (
                  <div key={wf.id} className="p-4 border border-border rounded-2xl bg-card flex items-center justify-between gap-4 shadow-sm">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-foreground">{wf.name}</span>
                      <span className="text-3xs text-muted-foreground">
                        Trigger: <strong className="text-foreground uppercase tracking-wide">{triggerText}</strong> &rarr; Action: <strong className="text-foreground uppercase tracking-wide">{actionText}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleWorkflow(wf.id, wf.is_active)}
                        className={cn(
                          "h-6 px-3 rounded-full text-3xs font-bold uppercase transition-colors cursor-pointer border",
                          wf.is_active 
                            ? "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20" 
                            : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                        )}
                      >
                        {wf.is_active ? 'Active' : 'Paused'}
                      </button>
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => handleDeleteWorkflow(wf.id)}
                        className="border-border text-muted-foreground hover:text-rose-500 rounded-full w-7 h-7 p-0 cursor-pointer flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 4: Sync History */}
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-indigo-500" /> Sync History & Event Logs
            </h3>
            <p className="text-3xs text-muted-foreground">History log of database ingestions, API pulls, and automated workflow triggers.</p>
          </div>

          {syncJobs.length === 0 ? (
            <div className="p-6 border border-dashed border-border/80 rounded-2xl text-center text-muted-foreground text-3xs bg-card/25">
              No sync executions recorded yet. Link your connectors to watch background logs.
            </div>
          ) : (
            <div className="border border-border rounded-2xl overflow-hidden bg-card/50">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-3xs font-bold uppercase text-muted-foreground">
                    <th className="py-2.5 px-4">Job Details</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Last Sync</th>
                  </tr>
                </thead>
                <tbody>
                  {syncJobs.map((job) => {
                    const statusColor = job.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                        job.status === 'syncing' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                        'bg-red-500/10 text-red-500 border-red-500/20';

                    return (
                      <tr key={job.id} className="border-b border-border/40 hover:bg-muted/20 text-3xs">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {job.job_type === 'context_sync' ? 'Context Index Sync' : job.job_type}
                        </td>
                        <td className="py-3 px-4">
                          <span className={cn("px-2.5 py-0.5 rounded-full text-3xs font-bold uppercase border", statusColor)}>
                            {job.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {job.last_synced_at ? new Date(job.last_synced_at).toLocaleString() : 'Pending'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>

      {/* Manual API Key Modal */}
      <Dialog open={customTokenModal.open} onOpenChange={(open) => !open && setCustomTokenModal({ open: false, connectorId: null })}>
        <DialogContent className="sm:max-w-md bg-background border border-border shadow-lg rounded-xl text-xs p-6 flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Plug className="w-5 h-5 text-indigo-500" />
              Configure {customTokenModal.connectorId?.toUpperCase()} Token Connection
            </DialogTitle>
            <DialogDescription className="text-3xs text-muted-foreground leading-relaxed mt-1">
              Input a personal developer key or credentials token to configure private synchronization manually.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-3xs uppercase font-bold text-foreground/50 tracking-wider">Developer Access Token</label>
            <input
              type="password"
              placeholder="e.g. ghp_xxxxxxxx or secret_xxxxxxx"
              value={customTokenVal}
              onChange={(e) => setCustomTokenVal(e.target.value)}
              className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-foreground"
            />
            {customTokenModal.connectorId && (
              <div className="text-[10px] text-indigo-500 hover:text-indigo-400 font-medium flex items-center gap-1 mt-1.5 transition-colors">
                <ExternalLink className="w-3 h-3 text-indigo-500" />
                <a
                  href={
                    customTokenModal.connectorId === 'slack' ? 'https://api.slack.com/apps' :
                    customTokenModal.connectorId === 'notion' ? 'https://www.notion.so/my-integrations' :
                    customTokenModal.connectorId === 'github' ? 'https://github.com/settings/tokens' :
                    'https://atlassian.com'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-3xs"
                >
                  Get your {customTokenModal.connectorId === 'github' ? 'GitHub' : customTokenModal.connectorId === 'notion' ? 'Notion' : 'Slack'} token here &rarr;
                </a>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCustomTokenModal({ open: false, connectorId: null });
                setCustomTokenVal('');
              }}
              className="text-3xs font-semibold h-8 rounded-full border-border hover:bg-muted text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!customTokenVal.trim()}
              onClick={() => handleInstallIntegration(customTokenModal.connectorId!, customTokenVal)}
              className="text-3xs font-semibold h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
            >
              Connect Integration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
