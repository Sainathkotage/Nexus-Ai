import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { CredentialVault } from '@/lib/integrations/vault';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // Formatted as "workspaceId:connectorId:userId"

  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings?error=oauth_missing_params', req.url));
  }

  const [workspaceId, connectorId, userId] = state.split(':');

  if (!workspaceId || !connectorId || !userId) {
    return NextResponse.redirect(new URL('/settings?error=oauth_invalid_state', req.url));
  }

  try {
    let tokenUrl = '';
    let clientId = '';
    let clientSecret = '';

    // Connector-specific OAuth client credentials
    if (connectorId === 'github') {
      tokenUrl = 'https://github.com/login/oauth/access_token';
      clientId = process.env.GITHUB_CLIENT_ID || '';
      clientSecret = process.env.GITHUB_CLIENT_SECRET || '';
    } else if (connectorId === 'slack') {
      tokenUrl = 'https://slack.com/api/oauth.v2.access';
      clientId = process.env.SLACK_CLIENT_ID || '';
      clientSecret = process.env.SLACK_CLIENT_SECRET || '';
    } else if (connectorId === 'notion') {
      tokenUrl = 'https://api.notion.com/v1/oauth/token';
      clientId = process.env.NOTION_CLIENT_ID || '';
      clientSecret = process.env.NOTION_CLIENT_SECRET || '';
    }

    if (!clientId || !clientSecret) {
      throw new Error(`OAuth credentials not configured for ${connectorId}`);
    }

    // Exchange auth code for tokens
    let headers: Record<string, string> = {
      'Accept': 'application/json'
    };
    let body: any;

    if (connectorId === 'slack') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const params = new URLSearchParams();
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('code', code);
      params.append('redirect_uri', `${new URL(req.url).origin}/api/integrations/oauth/callback`);
      body = params.toString();
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${new URL(req.url).origin}/api/integrations/oauth/callback`
      });
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers,
      body
    });

    const tokenData = await response.json();

    if (!response.ok || tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange OAuth token');
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new Error('Access token not returned from provider');
    }

    // Create Supabase Admin client to bypass RLS for private schema credentials insertion
    const supabase = createSupabaseAdminClient();

    // 1. Create integration installation record
    const { data: integration, error: installErr } = await supabase
      .from('workspace_integrations')
      .insert({
        workspace_id: workspaceId,
        connector_id: connectorId,
        status: 'active',
        installed_by: userId
      })
      .select()
      .single();

    if (installErr) throw installErr;

    // 2. Encrypt token credentials
    const { encryptedData, iv } = CredentialVault.encrypt(JSON.stringify(tokenData));

    // 3. Save credentials in database
    const { error: credErr } = await supabase
      .from('credentials')
      .insert({
        integration_id: integration.id,
        encrypted_data: encryptedData,
        iv: iv,
        auth_fields: {
          scopes: tokenData.scope,
          token_type: tokenData.token_type
        }
      });

    if (credErr) throw credErr;

    // Redirect user back to integrations hub with success flag
    return NextResponse.redirect(new URL(`/integrations?success=connected&connector=${connectorId}`, req.url));

  } catch (error: any) {
    console.error('[OAuth Callback API] Error:', error);
    return NextResponse.redirect(new URL(`/integrations?error=oauth_failed&msg=${encodeURIComponent(error.message || 'unknown')}`, req.url));
  }
}
