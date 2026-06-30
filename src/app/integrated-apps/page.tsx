'use client';

import React, { useState, useEffect } from 'react';
import { useWorkspace } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { 
  ChevronDown, ChevronUp, FileText, Globe, Layers, AlertCircle, 
  ExternalLink, Search, RefreshCw, Sparkles, HelpCircle, CheckCircle2, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Link from 'next/link';

const SlackIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="8" height="8" x="3" y="3" rx="1" />
    <rect width="8" height="8" x="13" y="3" rx="1" />
    <rect width="8" height="8" x="3" y="13" rx="1" />
    <rect width="8" height="8" x="13" y="13" rx="1" />
  </svg>
);

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const NotionIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    <path d="m9 3 3 13 3-13" />
  </svg>
);

const JiraIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 13h10v10H2z" />
    <path d="M12 2h10v10H12z" />
    <path d="M2 2h10v10H2z" />
  </svg>
);

interface IntegratedApp {
  id: string;
  name: string;
  connectorId: string;
  status: string;
  installedBy: string;
  createdAt: string;
}

export default function IntegratedAppsPage() {
  const { workspace } = useWorkspace();
  const [activeApps, setActiveApps] = useState<IntegratedApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [appContents, setAppContents] = useState<Record<string, any[]>>({});
  const [loadingContents, setLoadingContents] = useState<Record<string, boolean>>({});
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [slackChannels, setSlackChannels] = useState<any[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  useEffect(() => {
    async function loadMetadata() {
      if (!workspace) return;
      setLoadingMetadata(true);
      try {
        const { data: dbChannels } = await supabase
          .from('channels')
          .select('*');
        setSlackChannels(dbChannels || []);

        const res = await fetch(`/api/integrations/github/repos?workspaceId=${workspace.id}`);
        if (res.ok) {
          const data = await res.json();
          setGithubRepos(data.repos || []);
        }
      } catch (err) {
        console.warn('[IntegratedApps] Metadata loading warning:', err);
      } finally {
        setLoadingMetadata(false);
      }
    }
    loadMetadata();
  }, [workspace]);

  useEffect(() => {
    async function loadWorkspaceApps() {
      if (!workspace) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('workspace_integrations')
          .select('*')
          .eq('workspace_id', workspace.id)
          .eq('status', 'active');

        if (error) throw error;

        const apps = (data || []).map((item: any) => ({
          id: item.id,
          name: item.connector_id.charAt(0).toUpperCase() + item.connector_id.slice(1),
          connectorId: item.connector_id,
          status: item.status,
          installedBy: item.installed_by || 'Teammate',
          createdAt: new Date(item.created_at).toLocaleDateString(),
        }));

        setActiveApps(apps);
        
        // Auto-expand the first app if any exist
        if (apps.length > 0) {
          handleExpandApp(apps[0].connectorId);
        }
      } catch (err: any) {
        console.error('[IntegratedApps] Error loading apps:', err);
        toast.error('Failed to load active workspace integrations.');
      } finally {
        setLoading(false);
      }
    }

    loadWorkspaceApps();
  }, [workspace]);

  const handleExpandApp = async (connectorId: string) => {
    if (expandedApp === connectorId) {
      setExpandedApp(null);
      return;
    }

    setExpandedApp(connectorId);

    // Fetch documents for this app if not already cached
    if (!appContents[connectorId] && workspace) {
      setLoadingContents(prev => ({ ...prev, [connectorId]: true }));
      try {
        const { data: documents, error } = await supabase
          .from('documents')
          .select('*')
          .eq('workspace_id', workspace.id)
          .contains('tags', JSON.stringify([connectorId]))
          .order('uploaded_at', { ascending: false });

        if (error) throw error;

        setAppContents(prev => ({ ...prev, [connectorId]: documents || [] }));
      } catch (err: any) {
        console.error(`[IntegratedApps] Error fetching content for ${connectorId}:`, err);
        toast.error(`Failed to fetch indexed files for ${connectorId}`);
      } finally {
        setLoadingContents(prev => ({ ...prev, [connectorId]: false }));
      }
    }
  };

  const toggleDocExpand = (docId: string) => {
    setExpandedDocs(prev => ({ ...prev, [docId]: !prev[docId] }));
  };

  const getConnectorIcon = (connectorId: string) => {
    const className = "w-6 h-6";
    switch (connectorId) {
      case 'github': return <GithubIcon className={className} />;
      case 'slack': return <SlackIcon className={className} />;
      case 'notion': return <NotionIcon className={className} />;
      case 'jira': return <JiraIcon className={className} />;
      default: return <Layers className={className} />;
    }
  };

  const getConnectorDesc = (connectorId: string) => {
    switch (connectorId) {
      case 'github': return 'Source code repositories, pull requests, issues trackers, and commit histories.';
      case 'slack': return 'Indexed Slack workspace chats, direct message threads, and uploaded files.';
      case 'notion': return 'Notion project wikis, databases, product specifications, and documentation.';
      case 'jira': return 'Jira project tasks, active sprint backlogs, and bug logs.';
      default: return 'Connected third-party data synced into the AI reasoning context.';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <span className="text-sm font-semibold text-muted-foreground">Retrieving integrated workspace configurations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/60 bg-card/30 backdrop-blur-md px-6 py-5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" /> Integrated Apps
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Explore files, messages, commits, and pages synced to your workspace context.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/integrations">
            <Button size="sm" variant="outline" className="h-8 text-xs font-semibold gap-1.5 cursor-pointer">
              Go to Integration Marketplace <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 md:p-8 max-w-5xl mx-auto w-full flex flex-col gap-6">
        {activeApps.length === 0 ? (
          <div className="border border-border/60 bg-card rounded-3xl p-10 flex flex-col items-center text-center gap-6 shadow-sm max-w-md mx-auto my-10">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/10">
              <Layers className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-bold text-foreground">No active integrated apps found</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect external apps in the integrations tab to feed commits, wikis, tickets, and chats directly into Nexus AI workspace memory.
              </p>
            </div>
            <Link href="/integrations">
              <Button className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2 text-xs">
                Set up first integration
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {activeApps.map((app) => {
              const isExpanded = expandedApp === app.connectorId;
              const contents = appContents[app.connectorId] || [];
              const isContentLoading = loadingContents[app.connectorId];

              return (
                <div key={app.id} className="bg-card border border-border/80 rounded-2xl overflow-hidden transition-all shadow-sm">
                  {/* Card Header (Click to expand) */}
                  <button
                    onClick={() => handleExpandApp(app.connectorId)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/10 group-hover:scale-105 transition-transform shrink-0">
                        {getConnectorIcon(app.connectorId)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-foreground">{app.name} Connection</h3>
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-0 hover:bg-emerald-500/10 font-semibold px-2 py-0.2 text-[9px] uppercase tracking-wider">
                            Active
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{getConnectorDesc(app.connectorId)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-3xs text-muted-foreground hidden sm:inline">Installed {app.createdAt}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Content Area */}
                  {isExpanded && (
                    <div className="border-t border-border/60 bg-muted/20 px-6 py-5 flex flex-col gap-5">
                      
                      {/* GitHub Specific Metadata: List Profile Repositories */}
                      {app.connectorId === 'github' && (
                        <div className="bg-card border border-border/60 rounded-xl p-4.5 shadow-2xs">
                          <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5 font-mono">
                            <Layers className="w-3.5 h-3.5 text-indigo-500" /> Repositories in GitHub Profile ({githubRepos.length})
                          </h4>
                          {loadingMetadata ? (
                            <div className="flex items-center gap-2 py-2 text-2xs text-muted-foreground animate-pulse">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Fetching GitHub profile repositories...
                            </div>
                          ) : githubRepos.length === 0 ? (
                            <div className="text-2xs text-muted-foreground py-2">
                              No repositories found. Ensure you have authorized Nexus to access your repositories.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                              {githubRepos.map((repo) => (
                                <a 
                                  key={repo.id}
                                  href={repo.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 hover:bg-muted/10 hover:border-border/80 transition-all text-xs font-semibold group/repo"
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                    <span className="text-foreground truncate group-hover/repo:text-indigo-500 transition-colors">{repo.full_name}</span>
                                    {repo.is_private && (
                                      <Badge className="bg-amber-500/10 text-amber-600 border-0 hover:bg-amber-500/10 scale-90 origin-left px-1.5 font-semibold text-[8px] uppercase">
                                        Private
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground font-mono font-medium shrink-0 ml-2">
                                    {repo.default_branch || 'main'}
                                  </span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Slack Specific Metadata: List Channels */}
                      {app.connectorId === 'slack' && (
                        <div className="bg-card border border-border/60 rounded-xl p-4.5 shadow-2xs">
                          <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5 font-mono">
                            <Layers className="w-3.5 h-3.5 text-indigo-500" /> Joined Slack Channels ({slackChannels.length})
                          </h4>
                          {loadingMetadata ? (
                            <div className="flex items-center gap-2 py-2 text-2xs text-muted-foreground animate-pulse">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Fetching Slack channels...
                            </div>
                          ) : slackChannels.length === 0 ? (
                            <div className="text-2xs text-muted-foreground py-2">
                              No synced channels found.
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                              {slackChannels.map((ch) => (
                                <div 
                                  key={ch.id}
                                  className="flex items-center gap-2 p-2.5 rounded-lg border border-border/40 text-xs font-semibold bg-card truncate"
                                >
                                  <span className="text-muted-foreground font-mono">#</span>
                                  <span className="text-foreground truncate">{ch.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Document List */}
                      <div>
                        {isContentLoading ? (
                          <div className="py-8 flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                            <span className="text-[11px] text-muted-foreground">Crawling index directory...</span>
                          </div>
                        ) : contents.length === 0 ? (
                          <div className="py-8 flex flex-col items-center justify-center text-center gap-2 border border-dashed border-border/60 bg-card rounded-xl">
                            <AlertCircle className="w-6 h-6 text-amber-500/70" />
                            <span className="text-xs font-semibold text-foreground">No synced documents found</span>
                            <span className="text-3xs text-muted-foreground max-w-sm px-4">
                              We haven't indexed any commits or files for {app.name} yet. Trigger a sync in the Integrations dashboard.
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-1">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Indexed Documents ({contents.length})</span>
                              <span className="text-3xs text-muted-foreground">Workspace context ready</span>
                            </div>
                            
                            <div className="flex flex-col gap-2.5">
                              {contents.map((doc) => {
                                const isDocExpanded = !!expandedDocs[doc.id];
                                return (
                                  <div key={doc.id} className="border border-border/40 bg-card rounded-xl overflow-hidden transition-all hover:border-border/80">
                                    {/* Document Row Header */}
                                    <button
                                      onClick={() => toggleDocExpand(doc.id)}
                                      className="w-full text-left p-3.5 flex items-center justify-between hover:bg-muted/10 transition-colors cursor-pointer"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 rounded bg-muted text-muted-foreground shrink-0">
                                          <FileText className="w-4 h-4 text-indigo-500" />
                                        </div>
                                        <div>
                                          <h4 className="text-xs font-bold text-foreground">{doc.title}</h4>
                                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-border/40 text-muted-foreground">
                                              {doc.type.toUpperCase()}
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground">{doc.size}</span>
                                            <span className="w-1 h-1 rounded-full bg-border" />
                                            <span className="text-[10px] text-muted-foreground">Synced {new Date(doc.uploaded_at).toLocaleString()}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="shrink-0 pl-4">
                                        {isDocExpanded ? (
                                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                        ) : (
                                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                        )}
                                      </div>
                                    </button>

                                    {/* Document Details Block */}
                                    {isDocExpanded && (
                                      <div className="border-t border-border/45 bg-muted/10 p-4 space-y-3.5 text-xs text-foreground">
                                        {/* Key points if available */}
                                        {doc.key_points && doc.key_points.length > 0 && (
                                          <div className="space-y-1">
                                            <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Key Details</h5>
                                            <ul className="list-disc list-inside pl-1 space-y-0.5 text-muted-foreground text-[11px]">
                                              {doc.key_points.map((pt: string, i: number) => (
                                                <li key={i}>{pt}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}

                                        {/* Raw content snippet */}
                                        <div className="space-y-1.5">
                                          <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Extracted Text Content</h5>
                                          <pre className="bg-muted/80 p-3 rounded-lg border border-border/30 text-[10px] font-mono whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed select-text">
                                            {doc.content}
                                          </pre>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
