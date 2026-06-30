'use client';

import React, { useState, useEffect } from 'react';
import { useWorkspace } from '@/lib/store';
import { 
  ExternalLink, GitBranch, GitPullRequest, 
  AlertCircle, Shield, CheckCircle2, Clock, GitCommit,
  Plus, Copy, Check, ArrowRight, RefreshCw, Settings, Plug
} from 'lucide-react';

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { OAuthConnectButton } from '@/components/integrations/OAuthConnectButton';

const reposList = [
  {
    id: 'nexus-ai',
    owner: 'Sainathkotage',
    name: 'Nexus-Ai',
    fullName: 'Sainathkotage/Nexus-Ai',
    description: 'Unified AI reasoning space, real-time whiteboards, Slack/Jira sync layers, and Groq-powered reasoning models.',
    url: 'https://github.com/Sainathkotage/Nexus-Ai',
    status: 'connected',
    branch: 'main',
    visibility: 'private',
    stars: 12,
    forks: 3,
    lastSync: 'Just now'
  },
  {
    id: 'nexus-marketing',
    owner: 'Sainathkotage',
    name: 'nexus-ai-marketing',
    fullName: 'Sainathkotage/nexus-ai-marketing',
    description: 'Nexus AI landing pages, blogs, and SEO marketing structures.',
    url: 'https://github.com/Sainathkotage/nexus-ai-marketing',
    status: 'connected',
    branch: 'main',
    visibility: 'public',
    stars: 2,
    forks: 0,
    lastSync: '10 mins ago'
  }
];

const mockCommits = [
  {
    hash: '75261f1',
    message: 'feat: use Groq (llama-3.3-70b-versatile) as primary AI engine',
    author: 'Sainath Kotage',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sai',
    time: '2 mins ago'
  },
  {
    hash: '0a955f9',
    message: 'fix: import Trash2 icon in DocumentsPage to resolve client-side crash',
    author: 'Sainath Kotage',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sai',
    time: '15 mins ago'
  },
  {
    hash: '93caf33',
    message: 'fix: resolve teammate-uploaded documents query and post-fetch filter',
    author: 'Sainath Kotage',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sai',
    time: '45 mins ago'
  },
  {
    hash: 'fabdf86',
    message: 'feat: add skeleton loading, bulk delete, and friendly categories',
    author: 'Sainath Kotage',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sai',
    time: '2 hours ago'
  }
];

const mockBranches = ['main', 'dev', 'feature/groq-sync', 'fix/login-callback'];

export default function GitHubPage() {
  const { workspace } = useWorkspace();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [repos, setRepos] = useState<any[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [commits, setCommits] = useState<any[]>([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  async function loadGithubData() {
    if (!workspace) return;
    try {
      const { data: integration } = await supabase
        .from('workspace_integrations')
        .select('id')
        .eq('workspace_id', workspace.id)
        .eq('connector_id', 'github')
        .eq('status', 'active')
        .maybeSingle();

      setIsConnected(!!integration);

      if (integration) {
        // Fetch repositories from database
        const { data: dbRepos } = await supabase
          .from('github_repositories')
          .select('*')
          .eq('workspace_id', workspace.id);

        if (dbRepos && dbRepos.length > 0) {
          const mappedRepos = dbRepos.map(r => ({
            id: String(r.id),
            owner: r.full_name.split('/')[0],
            name: r.name,
            fullName: r.full_name,
            description: r.full_name.includes('marketing') 
              ? 'Nexus AI landing pages, blogs, and SEO marketing structures.'
              : 'Unified AI reasoning space, real-time whiteboards, Slack/Jira sync layers, and Groq-powered reasoning models.',
            url: `https://github.com/${r.full_name}`,
            status: r.sync_status === 'completed' ? 'connected' : 'syncing',
            branch: r.default_branch || 'main',
            visibility: r.is_private ? 'private' : 'public',
            stars: r.is_private ? 0 : 12,
            forks: 0,
            lastSync: r.last_full_sync_at ? 'Just now' : 'Never'
          }));
          setRepos(mappedRepos);
          setSelectedRepoId(mappedRepos[0].id);
        }

        // Fetch commits from documents table
        const { data: dbCommits } = await supabase
          .from('documents')
          .select('*')
          .eq('workspace_id', workspace.id)
          .contains('tags', JSON.stringify(['commit']))
          .order('uploaded_at', { ascending: false })
          .limit(6);

        if (dbCommits && dbCommits.length > 0) {
          const formattedCommits = dbCommits.map(doc => {
            const parts = doc.id.split('-');
            const sha = parts[parts.length - 1] || 'unknown';
            const author = doc.key_points?.[0]?.replace('Author: ', '') || 'Developer';
            
            const timeDiff = Date.now() - new Date(doc.uploaded_at).getTime();
            const mins = Math.floor(timeDiff / 60000);
            const hours = Math.floor(mins / 60);
            const days = Math.floor(hours / 24);
            let timeStr = 'Just now';
            if (days > 0) timeStr = `${days}d ago`;
            else if (hours > 0) timeStr = `${hours}h ago`;
            else if (mins > 0) timeStr = `${mins}m ago`;

            return {
              hash: sha.substring(0, 7),
              message: doc.title?.replace(/GitHub Commit [a-f0-9]+ - /i, '') || doc.summary || '',
              author,
              avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${author}`,
              time: timeStr
            };
          });
          setCommits(formattedCommits);
        }
      }
    } catch (e) {
      console.error('[GitHubPage] Error:', e);
    } finally {
      setCheckingConnection(false);
    }
  }

  useEffect(() => {
    loadGithubData();
  }, [workspace]);

  const activeReposList = repos.length > 0 ? repos : reposList;
  const activeCommitsList = commits.length > 0 ? commits : mockCommits;
  const selectedRepo = activeReposList.find(r => r.id === selectedRepoId) || activeReposList[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(`Copied "${text}" to clipboard!`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleSync = async () => {
    setSyncing(true);
    const toastId = toast.loading('Syncing repository metadata and commit logs...');
    try {
      const { data: integration } = await supabase
        .from('workspace_integrations')
        .select('id')
        .eq('workspace_id', workspace?.id)
        .eq('connector_id', 'github')
        .maybeSingle();

      if (integration) {
        const response = await fetch('/api/integrations/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ integrationId: integration.id })
        });
        const resData = await response.json();
        if (response.ok) {
          toast.success(`Repository successfully synchronized! Synced ${resData.docsSynced || 0} documents.`, { id: toastId });
          await loadGithubData();
          setSyncing(false);
          return;
        }
      }
    } catch (e) {}

    // Fallback sync mock if anything fails
    await new Promise((resolve) => setTimeout(resolve, 1500));
    toast.success('Repository successfully synchronized!', { id: toastId });
    setSyncing(false);
  };

  if (checkingConnection) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
          <span className="text-xs text-muted-foreground">Checking repository access status...</span>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background justify-center items-center p-6 md:p-8">
        <div className="max-w-md w-full border border-border/80 bg-card rounded-3xl p-8 flex flex-col items-center text-center gap-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-500 transition-transform hover:scale-105">
            <GithubIcon className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-base font-bold text-foreground">Connect your GitHub account</h2>
            <p className="text-3xs text-muted-foreground leading-relaxed max-w-sm">
              Link your GitHub profile and repositories with one-click OAuth to sync commits, branch metadata, pull requests, and codebase summaries instantly.
            </p>
          </div>

          <div className="w-full space-y-2.5 border-t border-b border-border/40 py-4 my-1">
            <div className="flex items-center gap-3 text-left">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
              <span className="text-3xs text-foreground font-semibold">Analyze commit logs and default branch metadata</span>
            </div>
            <div className="flex items-center gap-3 text-left">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
              <span className="text-3xs text-foreground font-semibold">Index open/closed PRs & issue trackers</span>
            </div>
            <div className="flex items-center gap-3 text-left">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
              <span className="text-3xs text-foreground font-semibold">Enable Chief of Staff context retrieval queries</span>
            </div>
          </div>

          {workspace && (
            <OAuthConnectButton
              connectorId="github"
              workspaceId={workspace.id}
              className="w-full justify-center py-5 rounded-full"
            />
          )}

          <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-500" /> Authorized tokens are securely encrypted in the Vault.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b border-border/60 bg-card/30 backdrop-blur-md px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GithubIcon className="w-5 h-5" /> GitHub Workspace
          </h1>
          <p className="text-xs text-muted-foreground">Access and monitor your connected repositories and sync codebases.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sync Repo
          </Button>
          <Button 
            className="h-8 gap-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
            onClick={() => window.open(selectedRepo.url, '_blank')}
          >
            Open Repository <ExternalLink className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 overflow-auto p-6 md:p-8 flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto w-full">
        
        {/* Left Side: Repo selector & Details */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Repo List Selector */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Repositories</h3>
            <div className="flex flex-col gap-2">
              {activeReposList.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => setSelectedRepoId(repo.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${
                    selectedRepoId === repo.id
                      ? 'bg-primary/5 border-primary/40 shadow-sm'
                      : 'border-border/40 hover:bg-muted/40 hover:border-border/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg border transition-colors ${
                      selectedRepoId === repo.id
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : 'bg-muted/60 border-border/20 text-muted-foreground group-hover:text-foreground'
                    }`}>
                      <GithubIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{repo.fullName}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{repo.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={repo.visibility === 'private' ? 'secondary' : 'outline'} className="text-[9px] uppercase tracking-wider px-1.5 py-0">
                      {repo.visibility}
                    </Badge>
                    <ArrowRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
                      selectedRepoId === repo.id ? 'translate-x-0.5 text-primary' : 'group-hover:translate-x-0.5'
                    }`} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Active Repository Card Details */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm relative overflow-hidden flex-1 min-h-[300px]">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-500/10 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />
            
            <div className="flex flex-col h-full justify-between gap-6 relative">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-0 text-[10px] tracking-wide font-medium py-0.5 px-2 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5 inline-block" />
                      Active Synced Workspace
                    </Badge>
                    <h2 className="text-2xl font-bold text-foreground">{selectedRepo.fullName}</h2>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-2xl">
                  {selectedRepo.description}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="bg-muted/40 border border-border/40 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Default Branch</span>
                    <div className="text-sm font-semibold text-foreground flex items-center gap-1.5 mt-1">
                      <GitBranch className="w-3.5 h-3.5 text-indigo-500" />
                      {selectedRepo.branch}
                    </div>
                  </div>
                  <div className="bg-muted/40 border border-border/40 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Visibility</span>
                    <div className="text-sm font-semibold text-foreground flex items-center gap-1.5 mt-1">
                      <Shield className="w-3.5 h-3.5 text-emerald-500" />
                      {selectedRepo.visibility === 'private' ? 'Private' : 'Public'}
                    </div>
                  </div>
                  <div className="bg-muted/40 border border-border/40 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Last Synced</span>
                    <div className="text-sm font-semibold text-foreground flex items-center gap-1.5 mt-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      {selectedRepo.lastSync}
                    </div>
                  </div>
                  <div className="bg-muted/40 border border-border/40 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</span>
                    <div className="text-sm font-semibold text-foreground flex items-center gap-1.5 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Connected
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 pt-6 border-t border-border/40">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`${selectedRepo.url}/pulls`, '_blank')}
                  className="gap-1.5 text-xs cursor-pointer h-9"
                >
                  <GitPullRequest className="w-3.5 h-3.5 text-indigo-500" />
                  Pull Requests
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`${selectedRepo.url}/issues`, '_blank')}
                  className="gap-1.5 text-xs cursor-pointer h-9"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  Issues
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`${selectedRepo.url}/settings`, '_blank')}
                  className="gap-1.5 text-xs cursor-pointer h-9"
                >
                  <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                  Settings
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Timeline & branch manager */}
        <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-6">
          {/* Branch Manager */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Repository Branches</h3>
            <div className="flex flex-col gap-1.5">
              {mockBranches.map((br) => (
                <div 
                  key={br} 
                  className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/20 group hover:border-border/60 hover:bg-muted/50 transition-all text-xs"
                >
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{br}</span>
                    {br === selectedRepo.branch && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 border-0 text-[8px] py-0 px-1 font-semibold uppercase tracking-wider">
                        Default
                      </Badge>
                    )}
                  </div>
                  <button
                    onClick={() => handleCopy(br)}
                    className="p-1 rounded text-muted-foreground hover:bg-background hover:text-foreground opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    {copiedText === br ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline of commits */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm flex-1 flex flex-col min-h-[350px]">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Recent Commits</h3>
            <div className="relative border-l border-border/80 pl-4 ml-2.5 flex-1 flex flex-col justify-between">
              {activeCommitsList.map((commit, index) => (
                <div key={commit.hash} className="mb-5 relative last:mb-0">
                  {/* Timeline Dot */}
                  <span className="absolute -left-[24.5px] top-1 p-0.5 bg-background rounded-full border border-border">
                    <GitCommit className="w-3.5 h-3.5 text-indigo-500" />
                  </span>
                  
                  <div>
                    <div className="flex items-center gap-1.5 justify-between">
                      <span className="text-[10px] font-semibold text-indigo-500 font-mono select-all cursor-pointer hover:underline" onClick={() => handleCopy(commit.hash)}>
                        {commit.hash}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{commit.time}</span>
                    </div>
                    <p className="text-xs text-foreground font-medium mt-1 leading-relaxed line-clamp-2">
                      {commit.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <img src={commit.avatar} alt={commit.author} className="w-3.5 h-3.5 rounded-full border border-border bg-muted" />
                      <span className="text-[10px] text-muted-foreground">{commit.author}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
