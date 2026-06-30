import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { getInstallationAccessToken } from '@/lib/integrations/githubHelper';

async function getGitHubToken(workspaceId: string): Promise<string> {
  const supabase = createSupabaseAdminClient();

  const { data: installation } = await supabase
    .from('github_installations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (installation) {
    try {
      const { token } = await getInstallationAccessToken(String(installation.id));
      return token;
    } catch (e) {}
  }

  const { data: integration } = await supabase
    .from('workspace_integrations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('connector_id', 'github')
    .maybeSingle();

  if (integration) {
    const { getDecryptedGitHubCredentials } = await import('@/lib/integrations/githubHelper');
    const creds = await getDecryptedGitHubCredentials(integration.id);
    return creds.access_token || creds.accessToken || '';
  }

  throw new Error('No GitHub credentials found for this workspace');
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 });
    }

    const token = await getGitHubToken(workspaceId);
    if (!token) {
      return NextResponse.json({ repos: [] });
    }

    const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Nexus-AI-Integration'
      }
    });

    if (!res.ok) {
      throw new Error(`GitHub repos fetch failed: ${res.statusText}`);
    }

    const repos = await res.json();
    const mapped = (repos || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      description: r.description,
      is_private: r.private,
      url: r.html_url,
      default_branch: r.default_branch || 'main'
    }));

    return NextResponse.json({ repos: mapped });
  } catch (error: any) {
    console.error('[GitHub Repos API] Error:', error);
    return NextResponse.json({ repos: [], error: error.message });
  }
}
