import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CredentialVault } from '@/lib/integrations/vault';
import { ConnectorRegistry } from '@/lib/integrations/framework';
import '@/lib/integrations/connectors';

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { connectorId, workspaceId, apiKeyValue, basicAuthValue, customFields } = await req.json();

    if (!connectorId || !workspaceId) {
      return NextResponse.json({ error: 'Missing required parameters: connectorId and workspaceId' }, { status: 400 });
    }

    const connector = ConnectorRegistry.get(connectorId);
    if (!connector) {
      return NextResponse.json({ error: `Connector not found: ${connectorId}` }, { status: 404 });
    }

    // Insert integration record
    const { data: integration, error: installErr } = await supabase
      .from('workspace_integrations')
      .insert({
        workspace_id: workspaceId,
        connector_id: connectorId,
        status: 'active',
        installed_by: user.id
      })
      .select()
      .single();

    if (installErr) throw installErr;

    // Handle non-OAuth authentications immediately
    if (connector.authType === 'api_key' || connector.authType === 'basic') {
      const secretToEncrypt = connector.authType === 'api_key' ? apiKeyValue : basicAuthValue;
      if (!secretToEncrypt) {
        return NextResponse.json({ error: 'Authentication secret value is required' }, { status: 400 });
      }

      // Encrypt sensitive token
      const { encryptedData, iv } = CredentialVault.encrypt(secretToEncrypt);

      const { error: credErr } = await supabase
        .from('credentials')
        .insert({
          integration_id: integration.id,
          encrypted_data: encryptedData,
          iv: iv,
          auth_fields: customFields || {}
        });

      if (credErr) throw credErr;
    }

    return NextResponse.json({ success: true, integrationId: integration.id });
  } catch (error: any) {
    console.error('[Integrations Install API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
