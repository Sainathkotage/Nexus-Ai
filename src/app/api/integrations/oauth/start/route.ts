import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const connectorId = searchParams.get('connector');
    const workspaceId = searchParams.get('workspace');

    if (!connectorId || !workspaceId) {
      return NextResponse.json(
        { error: 'Missing required parameters: connector and workspace' },
        { status: 400 }
      );
    }

    // 1. Get authenticated user
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch custom client config from DB credentials (if configured by workspace admin)
    const adminClient = createSupabaseAdminClient();
    const { data: configIntegration } = await adminClient
      .from('workspace_integrations')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('connector_id', connectorId)
      .eq('status', 'config')
      .maybeSingle();

    let customClientId = '';
    if (configIntegration) {
      const { data: credential } = await adminClient
        .from('credentials')
        .select('auth_fields')
        .eq('integration_id', configIntegration.id)
        .maybeSingle();

      if (credential && credential.auth_fields) {
        customClientId = (credential.auth_fields as any).client_id || '';
      }
    }

    // 3. Resolve client configuration
    let authUrl = '';
    const redirectUri = `${new URL(req.url).origin}/api/integrations/oauth/callback`;
    const state = `${workspaceId}:${connectorId}:${user.id}`;

    if (connectorId === 'github') {
      const clientId = customClientId || process.env.GITHUB_CLIENT_ID;
      if (!clientId) {
        return NextResponse.redirect(new URL(`/integrations?error=oauth_missing_config&provider=GitHub`, req.url));
      }
      authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,read:user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    } else if (connectorId === 'slack') {
      const clientId = customClientId || process.env.SLACK_CLIENT_ID;
      if (!clientId) {
        return NextResponse.redirect(new URL(`/integrations?error=oauth_missing_config&provider=Slack`, req.url));
      }
      // Note: Slack scopes must be bot scopes under standard OAuth v2
      const scopes = 'channels:read,channels:history,chat:write,files:read,users:read';
      authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    } else if (connectorId === 'notion') {
      const clientId = customClientId || process.env.NOTION_CLIENT_ID;
      if (!clientId) {
        return NextResponse.redirect(new URL(`/integrations?error=oauth_missing_config&provider=Notion`, req.url));
      }
      // Notion oauth doesn't strictly require scope param since permissions are defined in the integration settings
      authUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    } else if (connectorId === 'jira') {
      const clientId = customClientId || process.env.JIRA_CLIENT_ID;
      if (!clientId) {
        return NextResponse.redirect(new URL(`/integrations?error=oauth_missing_config&provider=Jira`, req.url));
      }
      const scopes = 'read:jira-work write:jira-work read:jira-user';
      authUrl = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&response_type=code&prompt=consent`;
    } else {
      return NextResponse.redirect(new URL(`/integrations?error=oauth_unsupported&connector=${connectorId}`, req.url));
    }

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('[OAuth Start API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
