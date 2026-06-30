import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { CredentialVault } from '@/lib/integrations/vault';

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { connectorId, workspaceId, clientId, clientSecret } = await req.json();

    if (!connectorId || !workspaceId || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Missing required parameters: connectorId, workspaceId, clientId, and clientSecret' },
        { status: 400 }
      );
    }

    const adminClient = createSupabaseAdminClient();

    // 1. Get or create the configuration integration record (status = 'config')
    let { data: configIntegration, error: findErr } = await adminClient
      .from('workspace_integrations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('connector_id', connectorId)
      .eq('status', 'config')
      .maybeSingle();

    if (!configIntegration) {
      const { data: newIntegration, error: createErr } = await adminClient
        .from('workspace_integrations')
        .insert({
          workspace_id: workspaceId,
          connector_id: connectorId,
          status: 'config',
          installed_by: user.id
        })
        .select()
        .single();

      if (createErr) throw createErr;
      configIntegration = newIntegration;
    }

    // 2. Encrypt the clientSecret
    const { encryptedData, iv } = CredentialVault.encrypt(clientSecret);

    // 3. Get or create credential record
    const { data: existingCredential } = await adminClient
      .from('credentials')
      .select('id')
      .eq('integration_id', configIntegration.id)
      .maybeSingle();

    if (existingCredential) {
      const { error: updateErr } = await adminClient
        .from('credentials')
        .update({
          encrypted_data: encryptedData,
          iv: iv,
          auth_fields: {
            client_id: clientId
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCredential.id);

      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await adminClient
        .from('credentials')
        .insert({
          integration_id: configIntegration.id,
          encrypted_data: encryptedData,
          iv: iv,
          auth_fields: {
            client_id: clientId
          }
        });

      if (insertErr) throw insertErr;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[OAuth Config API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
