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
    // 1. Fetch custom configuration if it exists for this workspace
    const supabaseAdmin = createSupabaseAdminClient();
    const { data: configIntegration } = await supabaseAdmin
      .from('workspace_integrations')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('connector_id', connectorId)
      .eq('status', 'config')
      .maybeSingle();

    let customClientId = '';
    let customClientSecret = '';

    if (configIntegration) {
      const { data: credential } = await supabaseAdmin
        .from('credentials')
        .select('*')
        .eq('integration_id', configIntegration.id)
        .maybeSingle();

      if (credential) {
        if (credential.auth_fields) {
          customClientId = (credential.auth_fields as any).client_id || '';
        }
        try {
          customClientSecret = CredentialVault.decrypt(credential.encrypted_data, credential.iv);
        } catch (e) {
          console.warn('[OAuth Callback API] Failed to decrypt custom client secret');
        }
      }
    }

    let tokenUrl = '';
    let clientId = '';
    let clientSecret = '';

    // Connector-specific OAuth client credentials
    if (connectorId === 'github') {
      tokenUrl = 'https://github.com/login/oauth/access_token';
      clientId = customClientId || process.env.GITHUB_CLIENT_ID || '';
      clientSecret = customClientSecret || process.env.GITHUB_CLIENT_SECRET || '';
    } else if (connectorId === 'slack') {
      tokenUrl = 'https://slack.com/api/oauth.v2.access';
      clientId = customClientId || process.env.SLACK_CLIENT_ID || '';
      clientSecret = customClientSecret || process.env.SLACK_CLIENT_SECRET || '';
    } else if (connectorId === 'notion') {
      tokenUrl = 'https://api.notion.com/v1/oauth/token';
      clientId = customClientId || process.env.NOTION_CLIENT_ID || '';
      clientSecret = customClientSecret || process.env.NOTION_CLIENT_SECRET || '';
    } else if (connectorId === 'jira') {
      tokenUrl = 'https://auth.atlassian.com/oauth/token';
      clientId = customClientId || process.env.JIRA_CLIENT_ID || '';
      clientSecret = customClientSecret || process.env.JIRA_CLIENT_SECRET || '';
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

    // 4. Handle GitHub-specific App installation details and repository discovery
    const installationId = searchParams.get('installation_id');
    if (connectorId === 'github' && installationId) {
      try {
        const { getInstallationAccessToken, generateAppJWT } = await import('@/lib/integrations/githubHelper');
        
        const appId = process.env.GITHUB_APP_ID;
        const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

        if (appId && privateKey) {
          const decodedPrivateKey = privateKey.includes('-----BEGIN RSA PRIVATE KEY-----')
            ? privateKey
            : Buffer.from(privateKey, 'base64').toString('utf8');

          const appJwt = generateAppJWT(appId, decodedPrivateKey);

          // Get GitHub installation metadata
          const installRes = await fetch(`https://api.github.com/app/installations/${installationId}`, {
            headers: {
              'Authorization': `Bearer ${appJwt}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'Nexus-AI-Integration'
            }
          });

          if (installRes.ok) {
            const installData = await installRes.json();
            
            // Insert or update installation
            await supabase
              .from('github_installations')
              .upsert({
                id: parseInt(installationId, 10),
                workspace_id: workspaceId,
                account_id: installData.account?.id,
                account_name: installData.account?.login,
                account_avatar: installData.account?.avatar_url,
                repository_selection: installData.repository_selection || 'all'
              });

            // Retrieve installation access token to discover repositories
            const { token: iat } = await getInstallationAccessToken(installationId);
            
            const reposRes = await fetch('https://api.github.com/installation/repositories', {
              headers: {
                'Authorization': `token ${iat}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Nexus-AI-Integration'
              }
            });

            if (reposRes.ok) {
              const reposData = await reposRes.json();
              const repos = reposData.repositories || [];

              const repoPayloads = repos.map((repo: any) => ({
                id: repo.id,
                installation_id: parseInt(installationId, 10),
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
            }
          }
        }
      } catch (githubErr: any) {
        console.error('[OAuth Callback API] GitHub integration sync warning:', githubErr);
        // Do not crash the entire OAuth callback if metadata sync fails; let the user connect and retry sync
      }
    }

    // Redirect user back to integrations hub with success flag
    return NextResponse.redirect(new URL(`/integrations?success=connected&connector=${connectorId}`, req.url));

  } catch (error: any) {
    console.error('[OAuth Callback API] Error:', error);
    return NextResponse.redirect(new URL(`/integrations?error=oauth_failed&msg=${encodeURIComponent(error.message || 'unknown')}`, req.url));
  }
}
