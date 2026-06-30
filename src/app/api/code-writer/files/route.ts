import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { getInstallationAccessToken } from '@/lib/integrations/githubHelper';

// Helper to get GitHub token for workspace
async function getGitHubToken(workspaceId: string): Promise<string> {
  const supabase = createSupabaseAdminClient();

  // Find active GitHub installation
  const { data: installation } = await supabase
    .from('github_installations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (installation) {
    try {
      const { token } = await getInstallationAccessToken(String(installation.id));
      return token;
    } catch (e) {
      console.log('[CodeWriter API] Failed to get app token, checking user credentials');
    }
  }

  // Fallback to user OAuth credentials
  const { data: integration } = await supabase
    .from('workspace_integrations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('connector_id', 'github')
    .eq('status', 'active')
    .maybeSingle();

  if (integration) {
    const { getDecryptedGitHubCredentials } = await import('@/lib/integrations/githubHelper');
    const creds = await getDecryptedGitHubCredentials(integration.id);
    return creds.access_token || creds.accessToken || '';
  }

  throw new Error('No GitHub credentials found for this workspace');
}

// Flat list parser to build hierarchical directory tree
function buildFileTree(flatFiles: any[]): any[] {
  const root: any[] = [];
  const map: Record<string, any> = {};

  // Filter only folders and allowed source code files
  const allowedExts = ['.ts', '.tsx', '.js', '.jsx', '.json', '.sql', '.css', '.md', '.html', '.yaml', '.yml'];
  
  const filtered = flatFiles.filter(item => {
    if (item.type === 'tree') return true;
    const dotIndex = item.path.lastIndexOf('.');
    if (dotIndex === -1) return false;
    const ext = item.path.substring(dotIndex);
    return allowedExts.includes(ext);
  });

  for (const item of filtered) {
    const parts = item.path.split('/');
    let currentLevel = root;
    let accumulatedPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
      const isLast = i === parts.length - 1;

      if (!map[accumulatedPath]) {
        const node: any = {
          name: part,
          path: accumulatedPath,
          type: isLast && item.type === 'blob' ? 'file' : 'directory'
        };
        if (node.type === 'directory') {
          node.children = [];
        }
        map[accumulatedPath] = node;
        currentLevel.push(node);
      }

      if (map[accumulatedPath].type === 'directory') {
        currentLevel = map[accumulatedPath].children;
      }
    }
  }

  // Clean empty folders recursively
  const cleanTree = (nodes: any[]): any[] => {
    return nodes.filter(node => {
      if (node.type === 'directory') {
        node.children = cleanTree(node.children);
        return node.children.length > 0;
      }
      return true;
    });
  };

  return cleanTree(root);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const repo = searchParams.get('repo'); // e.g. "Sainathkotage/Nexus-Ai"
    const filePath = searchParams.get('path');
    const workspaceId = searchParams.get('workspaceId');

    if (!repo || !workspaceId) {
      return NextResponse.json({ error: 'Missing required parameters: repo and workspaceId' }, { status: 400 });
    }

    const token = await getGitHubToken(workspaceId);
    if (!token) {
      return NextResponse.json({ error: 'GitHub authorization token not found' }, { status: 401 });
    }

    const fetchWithAuth = async (url: string) => {
      return fetch(url, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Nexus-AI-Integration'
        }
      });
    };

    // 1. Read specific file content from GitHub
    if (filePath) {
      const res = await fetchWithAuth(`https://api.github.com/repos/${repo}/contents/${filePath}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch file content from GitHub: ${res.statusText}`);
      }
      const data = await res.json();
      
      // GitHub contents API returns file content base64-encoded
      const decodedContent = Buffer.from(data.content, 'base64').toString('utf-8');
      return NextResponse.json({ 
        content: decodedContent,
        sha: data.sha // Return SHA which is required by GitHub when editing/saving the file
      });
    }

    // 2. Otherwise list repository file tree
    // Fetch default branch
    const repoRes = await fetchWithAuth(`https://api.github.com/repos/${repo}`);
    if (!repoRes.ok) {
      throw new Error(`Failed to fetch repository metadata: ${repoRes.statusText}`);
    }
    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch || 'main';

    // Fetch repository tree recursively
    const treeRes = await fetchWithAuth(`https://api.github.com/repos/${repo}/git/trees/${defaultBranch}?recursive=1`);
    if (!treeRes.ok) {
      throw new Error(`Failed to fetch repository tree: ${treeRes.statusText}`);
    }
    const treeData = await treeRes.json();
    const flatFiles = treeData.tree || [];

    const fileTree = buildFileTree(flatFiles);

    return NextResponse.json({ files: fileTree, defaultBranch });
  } catch (error: any) {
    console.error('[CodeWriter API] Read Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { repo, path: filePath, content, sha, workspaceId, commitMessage } = await req.json();
    
    if (!repo || !filePath || content === undefined || !workspaceId || !sha) {
      return NextResponse.json({ error: 'Missing required parameters: repo, path, content, sha, or workspaceId' }, { status: 400 });
    }

    const token = await getGitHubToken(workspaceId);
    if (!token) {
      return NextResponse.json({ error: 'GitHub authorization token not found' }, { status: 401 });
    }

    // Base64 encode the updated file content
    const base64Content = Buffer.from(content).toString('base64');
    
    const message = commitMessage || `Update ${filePath} via Nexus AI Code Writer`;

    // Commit file changes directly to GitHub
    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Nexus-AI-Integration'
      },
      body: JSON.stringify({
        message,
        content: base64Content,
        sha
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || `Failed to save changes to GitHub: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json({ 
      success: true,
      newSha: data.content?.sha // Return new SHA for subsequent edits
    });
  } catch (error: any) {
    console.error('[CodeWriter API] Write Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
