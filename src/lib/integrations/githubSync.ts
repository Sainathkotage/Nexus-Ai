import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { getInstallationAccessToken } from './githubHelper';

interface SyncStats {
  issuesSynced: number;
  prsSynced: number;
  commitsSynced: number;
  rateLimitLimit: number;
  rateLimitRemaining: number;
  rateLimitReset: number;
}

/**
 * Parses GitHub's paginated Link header to locate next page URL.
 */
function parseLinkHeader(header: string | null): string | null {
  if (!header) return null;
  const parts = header.split(',');
  for (const part of parts) {
    const section = part.split(';');
    if (section.length !== 2) continue;
    const url = section[0].replace(/<(.*)>/, '$1').trim();
    const name = section[1].replace(/rel="(.*)"/, '$1').trim();
    if (name === 'next') return url;
  }
  return null;
}

/**
 * Checks response headers to track rate limiting and returns true if exhausted.
 */
function handleRateLimits(headers: Headers, stats: SyncStats): boolean {
  const limit = headers.get('x-ratelimit-limit');
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');

  if (limit) stats.rateLimitLimit = parseInt(limit, 10);
  if (remaining) stats.rateLimitRemaining = parseInt(remaining, 10);
  if (reset) stats.rateLimitReset = parseInt(reset, 10);

  // If we have less than 50 requests left, trigger rate limit pause
  if (stats.rateLimitRemaining < 50) {
    console.warn(`[GitHubSync] Rate limit near exhaustion: ${stats.rateLimitRemaining}/${stats.rateLimitLimit}`);
    return true;
  }
  return false;
}

/**
 * Performs a complete context synchronization of a single repository.
 * Fetches commits, issues, and pull requests in paginated chunks and maps them to unified documents.
 */
export async function syncRepository(
  workspaceId: string,
  installationId: string,
  repoId: string,
  repoFullName: string
): Promise<SyncStats> {
  const supabase = createSupabaseAdminClient();
  const timestamp = new Date().toISOString();

  const stats: SyncStats = {
    issuesSynced: 0,
    prsSynced: 0,
    commitsSynced: 0,
    rateLimitLimit: 5000,
    rateLimitRemaining: 5000,
    rateLimitReset: 0,
  };

  // 1. Retrieve token (App IAT, with fallback to OAuth access token)
  let token = '';
  try {
    const { token: iat } = await getInstallationAccessToken(installationId);
    token = iat;
  } catch (err) {
    console.log('[GitHubSync] App token exchange failed. Falling back to user OAuth credentials.');
    const { data: integration } = await supabase
      .from('workspace_integrations')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('connector_id', 'github')
      .maybeSingle();

    if (integration) {
      const { getDecryptedGitHubCredentials } = await import('./githubHelper');
      const creds = await getDecryptedGitHubCredentials(integration.id);
      token = creds.access_token || creds.accessToken || '';
    }
  }

  if (!token) {
    throw new Error('Unable to acquire GitHub API token for sync');
  }

  const fetchWithAuth = async (url: string) => {
    return fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Nexus-AI-Integration',
      },
    });
  };

  // 2. Fetch Issues (excluding Pull Requests)
  // Note: GitHub issues API returns both issues and PRs by default.
  // We filter out objects containing the 'pull_request' key.
  let issuesUrl: string | null = `https://api.github.com/repos/${repoFullName}/issues?state=all&per_page=100`;
  while (issuesUrl) {
    const res = await fetchWithAuth(issuesUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch issues: ${res.statusText}`);
    }

    if (handleRateLimits(res.headers, stats)) {
      break; // Pause due to rate limit
    }

    const issues: any[] = await res.json();
    for (const issue of issues) {
      if (issue.pull_request) continue; // Skip PRs, handled separately

      const docId = `github-issue-${repoId}-${issue.number}`;
      const title = `GitHub Issue #${issue.number} - ${issue.title}`;
      const content = `GitHub Issue #${issue.number}
Title: ${issue.title}
State: ${issue.state}
Author: ${issue.user?.login}
Assignee: ${issue.assignees?.map((a: any) => a.login).join(', ') || 'Unassigned'}
Labels: ${issue.labels?.map((l: any) => l.name).join(', ') || 'None'}
Created At: ${issue.created_at}

Description:
${issue.body || 'No description provided.'}`;

      const docPayload = {
        id: docId,
        workspace_id: workspaceId,
        title,
        type: 'txt',
        size: `${(content.length / 1024).toFixed(2)} KB`,
        summary: issue.body ? issue.body.substring(0, 200) : issue.title,
        content,
        tags: ['github', 'issue', issue.state, ...(issue.labels?.map((l: any) => l.name.toLowerCase()) || [])],
        key_points: [
          `State is ${issue.state}`,
          `Author: ${issue.user?.login}`,
          `Assignees: ${issue.assignees?.map((a: any) => a.login).join(', ') || 'None'}`,
        ],
        extracted_tasks: [],
        extracted_people: issue.assignees?.map((a: any) => a.login.toUpperCase()) || [],
        extracted_organizations: ['GitHub'],
        uploaded_at: timestamp,
        processing_status: 'completed',
        uploaded_by: { id: 'github-connector', name: 'GitHub Sync', email: '', avatar: '', role: 'Member' },
      };

      await supabase.from('documents').upsert(docPayload);
      stats.issuesSynced++;

      // Create identity relationship if assignee maps to email
      if (issue.assignee) {
        // Try mapping username if logged. In production, we'd lookup git username maps
        const { data: member } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', `%${issue.assignee.login}%`)
          .limit(1)
          .maybeSingle();

        if (member) {
          await supabase.from('entity_relations').upsert({
            workspace_id: workspaceId,
            source_entity_id: docId,
            target_entity_id: `user-${member.id}`,
            relation_type: 'ASSIGNED_TO',
            confidence: 1.0,
          });
        }
      }
    }

    issuesUrl = parseLinkHeader(res.headers.get('Link'));
  }

  // 3. Fetch Pull Requests
  let prsUrl: string | null = `https://api.github.com/repos/${repoFullName}/pulls?state=all&per_page=100`;
  while (prsUrl) {
    const res = await fetchWithAuth(prsUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch PRs: ${res.statusText}`);
    }

    if (handleRateLimits(res.headers, stats)) {
      break;
    }

    const prs: any[] = await res.json();
    for (const pr of prs) {
      const docId = `github-pr-${repoId}-${pr.number}`;
      const title = `GitHub PR #${pr.number} - ${pr.title}`;
      const content = `GitHub Pull Request #${pr.number}
Title: ${pr.title}
State: ${pr.state}
Author: ${pr.user?.login}
Merged At: ${pr.merged_at || 'Not merged'}
Branch: ${pr.head?.ref} -> ${pr.base?.ref}
Created At: ${pr.created_at}

Description:
${pr.body || 'No description provided.'}`;

      const docPayload = {
        id: docId,
        workspace_id: workspaceId,
        title,
        type: 'txt',
        size: `${(content.length / 1024).toFixed(2)} KB`,
        summary: pr.body ? pr.body.substring(0, 200) : pr.title,
        content,
        tags: ['github', 'pr', pr.state, pr.merged_at ? 'merged' : 'open'],
        key_points: [
          `State is ${pr.state}`,
          `Branch: ${pr.head?.ref} to ${pr.base?.ref}`,
          `Author: ${pr.user?.login}`,
        ],
        extracted_tasks: [],
        extracted_people: [pr.user?.login?.toUpperCase()].filter(Boolean),
        extracted_organizations: ['GitHub'],
        uploaded_at: timestamp,
        processing_status: 'completed',
        uploaded_by: { id: 'github-connector', name: 'GitHub Sync', email: '', avatar: '', role: 'Member' },
      };

      await supabase.from('documents').upsert(docPayload);
      stats.prsSynced++;

      // Scan description body for Jira ticket mentions (e.g. NEX-45)
      const ticketRegex = /[A-Z]+-[0-9]+/g;
      const ticketMentions = (pr.body || '').match(ticketRegex) || [];
      const uniqueTickets = Array.from(new Set(ticketMentions)) as string[];

      for (const ticket of uniqueTickets) {
        await supabase.from('entity_relations').upsert({
          workspace_id: workspaceId,
          source_entity_id: docId,
          target_entity_id: `jira-${ticket.toLowerCase()}`,
          relation_type: 'IMPLEMENTS',
          confidence: 1.0,
        });
      }
    }

    prsUrl = parseLinkHeader(res.headers.get('Link'));
  }

  // 4. Fetch Commits
  let commitsUrl: string | null = `https://api.github.com/repos/${repoFullName}/commits?per_page=100`;
  let commitCount = 0;
  
  // Set cap on initial commits sync (max 200 items to avoid rate limit starvation)
  while (commitsUrl && commitCount < 200) {
    const res = await fetchWithAuth(commitsUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch commits: ${res.statusText}`);
    }

    if (handleRateLimits(res.headers, stats)) {
      break;
    }

    const commits: any[] = await res.json();
    for (const item of commits) {
      if (commitCount >= 200) break;

      const shaShort = item.sha.substring(0, 7);
      const docId = `github-commit-${repoId}-${item.sha}`;
      const title = `GitHub Commit ${shaShort} - ${item.commit?.message?.split('\n')[0]}`;
      const content = `GitHub Commit ${item.sha}
Author: ${item.commit?.author?.name} <${item.commit?.author?.email}>
Date: ${item.commit?.author?.date}
Message:
${item.commit?.message}`;

      const docPayload = {
        id: docId,
        workspace_id: workspaceId,
        title,
        type: 'txt',
        size: `${(content.length / 1024).toFixed(2)} KB`,
        summary: item.commit?.message || '',
        content,
        tags: ['github', 'commit'],
        key_points: [
          `Author: ${item.commit?.author?.name}`,
          `SHA: ${item.sha}`,
        ],
        extracted_tasks: [],
        extracted_people: [item.commit?.author?.name?.toUpperCase()].filter(Boolean),
        extracted_organizations: ['GitHub'],
        uploaded_at: timestamp,
        processing_status: 'completed',
        uploaded_by: { id: 'github-connector', name: 'GitHub Sync', email: '', avatar: '', role: 'Member' },
      };

      await supabase.from('documents').upsert(docPayload);
      stats.commitsSynced++;
      commitCount++;

      // Scan commit messages for Jira ticket references to link code changes to tickets
      const ticketRegex = /[A-Z]+-[0-9]+/g;
      const ticketMentions = (item.commit?.message || '').match(ticketRegex) || [];
      const uniqueTickets = Array.from(new Set(ticketMentions)) as string[];

      for (const ticket of uniqueTickets) {
        await supabase.from('entity_relations').upsert({
          workspace_id: workspaceId,
          source_entity_id: docId,
          target_entity_id: `jira-${ticket.toLowerCase()}`,
          relation_type: 'IMPLEMENTS',
          confidence: 0.9, // slightly lower confidence than PR description links
        });
      }
    }

    commitsUrl = parseLinkHeader(res.headers.get('Link'));
  }

  // 5. Update repository status in database
  try {
    await supabase
      .from('github_repositories')
      .update({
        sync_status: 'completed',
        last_full_sync_at: timestamp,
        last_partial_sync_at: timestamp,
      })
      .eq('id', parseInt(repoId, 10));
  } catch (err) {
    console.warn('[GitHubSync] Table github_repositories missing, skipping status update');
  }

  return stats;
}

/**
 * Triggers context synchronization for all repositories registered under a workspace.
 */
export async function syncWorkspaceGitHubContext(workspaceId: string): Promise<{ success: boolean; reposSynced: number; totalDocs: number }> {
  const supabase = createSupabaseAdminClient();
  const timestamp = new Date().toISOString();

  let reposToSync: { id: string; full_name: string }[] = [];
  let installationIdStr = 'oauth-session';
  let token = '';

  try {
    // Find active GitHub installation for workspace
    let { data: installation, error: instErr } = await supabase
      .from('github_installations')
      .select('id')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (instErr || !installation) {
      console.log('[GitHubSync] Installation not found. Attempting auto-registration via OAuth credentials.');
      const { data: integration } = await supabase
        .from('workspace_integrations')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('connector_id', 'github')
        .maybeSingle();

      if (integration) {
        const { getDecryptedGitHubCredentials } = await import('./githubHelper');
        const creds = await getDecryptedGitHubCredentials(integration.id);
        const userToken = creds.access_token || creds.accessToken;
        
        if (userToken) {
          token = userToken;
          const userRes = await fetch('https://api.github.com/user', {
            headers: {
              'Authorization': `token ${userToken}`,
              'User-Agent': 'Nexus-AI-Integration'
            }
          });

          if (userRes.ok) {
            const userData = await userRes.json();
            const fakeInstallId = userData.id;

            try {
              const { data: newInstall } = await supabase
                .from('github_installations')
                .upsert({
                  id: fakeInstallId,
                  workspace_id: workspaceId,
                  account_id: userData.id,
                  account_name: userData.login,
                  account_avatar: userData.avatar_url,
                  repository_selection: 'all'
                })
                .select()
                .single();

              if (newInstall) {
                installation = newInstall;
              }
            } catch (e) {
              console.warn('[GitHubSync] Table github_installations missing, proceeding with virtual installation');
              installation = { id: fakeInstallId } as any;
            }

            const reposRes = await fetch('https://api.github.com/user/repos?per_page=10', {
              headers: {
                'Authorization': `token ${userToken}`,
                'User-Agent': 'Nexus-AI-Integration'
              }
            });

            if (reposRes.ok) {
              const reposData = await reposRes.json();
              reposToSync = reposData.map((r: any) => ({ id: String(r.id), full_name: r.full_name }));

              try {
                const repoPayloads = reposData.map((repo: any) => ({
                  id: repo.id,
                  installation_id: fakeInstallId,
                  workspace_id: workspaceId,
                  name: repo.name,
                  full_name: repo.full_name,
                  is_private: repo.private,
                  default_branch: repo.default_branch || 'main',
                  sync_status: 'pending'
                }));

                if (repoPayloads.length > 0) {
                  await supabase
                    .from('github_repositories')
                    .upsert(repoPayloads);
                }
              } catch (e) {
                console.warn('[GitHubSync] Table github_repositories missing, virtual repos will be synced');
              }
            }
          }
        }
      }
    } else {
      installationIdStr = String(installation.id);
      // Fetch all repositories registered for the installation
      const { data: repos, error: reposErr } = await supabase
        .from('github_repositories')
        .select('id, name, full_name')
        .eq('installation_id', installation.id);

      if (!reposErr && repos && repos.length > 0) {
        reposToSync = repos.map((r: any) => ({ id: String(r.id), full_name: r.full_name }));
      }
    }
  } catch (err) {
    console.error('[GitHubSync] Table checking failed, trying direct OAuth fallback:', err);
    const { data: integration } = await supabase
      .from('workspace_integrations')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('connector_id', 'github')
      .maybeSingle();

    if (integration) {
      try {
        const { getDecryptedGitHubCredentials } = await import('./githubHelper');
        const creds = await getDecryptedGitHubCredentials(integration.id);
        const userToken = creds.access_token || creds.accessToken;
        if (userToken) {
          token = userToken;
          const reposRes = await fetch('https://api.github.com/user/repos?per_page=5', {
            headers: {
              'Authorization': `token ${userToken}`,
              'User-Agent': 'Nexus-AI-Integration'
            }
          });
          if (reposRes.ok) {
            const reposData = await reposRes.json();
            reposToSync = reposData.map((r: any) => ({ id: String(r.id), full_name: r.full_name }));
          }
        }
      } catch (inner) {
        console.error('[GitHubSync] Direct OAuth fallback failed:', inner);
      }
    }
  }

  if (reposToSync.length === 0) {
    return { success: true, reposSynced: 0, totalDocs: 0 };
  }

  let totalDocs = 0;
  let reposSynced = 0;

  for (const repo of reposToSync) {
    try {
      try {
        await supabase
          .from('github_repositories')
          .update({ sync_status: 'syncing' })
          .eq('id', parseInt(repo.id, 10));
      } catch (e) {}

      const stats = await syncRepository(workspaceId, installationIdStr, repo.id, repo.full_name);
      totalDocs += stats.issuesSynced + stats.prsSynced + stats.commitsSynced;
      reposSynced++;
    } catch (err) {
      console.error(`[GitHubSync] Failed to sync repository ${repo.full_name}:`, err);
      
      try {
        await supabase
          .from('github_repositories')
          .update({ sync_status: 'failed' })
          .eq('id', parseInt(repo.id, 10));
      } catch (e) {}
    }
  }

  return {
    success: true,
    reposSynced,
    totalDocs,
  };
}
