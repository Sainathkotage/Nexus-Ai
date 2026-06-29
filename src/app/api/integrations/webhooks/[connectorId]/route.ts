import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { ConnectorRegistry } from '@/lib/integrations/framework';
import '@/lib/integrations/connectors';

export async function POST(req: Request, { params }: { params: any }) {
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  const { connectorId } = resolvedParams;
  
  try {
    const payload = await req.json();
    console.log(`[WebhookGateway] Received event for connector: ${connectorId}`, payload);

    // Handle Slack URL verification challenge immediately
    if (connectorId === 'slack' && payload.type === 'url_verification') {
      console.log('[WebhookGateway] Responding to Slack URL verification challenge');
      return NextResponse.json({ challenge: payload.challenge });
    }

    const connector = ConnectorRegistry.get(connectorId);
    if (!connector) {
      return NextResponse.json({ error: `Connector not found: ${connectorId}` }, { status: 404 });
    }

    // Call connector helper to format webhook details into standard triggers
    let triggerDetails = { triggerId: 'generic_event', data: payload };
    if (connector.handleWebhook) {
      triggerDetails = await connector.handleWebhook(payload);
    }

    const supabase = createSupabaseAdminClient();

    // 1. Query workspace_integrations to get integration ID and workspace ID
    const { data: integrations } = await supabase
      .from('workspace_integrations')
      .select('id, workspace_id')
      .eq('connector_id', connectorId)
      .eq('status', 'active')
      .limit(1);

    const workspaceId = integrations && integrations[0] ? integrations[0].workspace_id : 'ws-1780498983030-je7ug';
    const integrationId = integrations && integrations[0] ? integrations[0].id : null;

    // 2. Query credentials using integration_id
    let creds: any[] = [];
    if (integrationId) {
      const { data: dbCreds } = await supabase
        .from('credentials')
        .select('encrypted_data, iv')
        .eq('integration_id', integrationId)
        .limit(1);
      if (dbCreds) creds = dbCreds;
    }

    // Decrypt credentials bot token if available
    let botToken = connectorId === 'slack' ? (process.env.SLACK_BOT_TOKEN || '') : '';
    const credential = creds && creds[0];
    if (credential && credential.encrypted_data && credential.iv) {
      const { CredentialVault } = await import('@/lib/integrations/vault');
      try {
        const decrypted = CredentialVault.decrypt(credential.encrypted_data, credential.iv);
        const parsed = JSON.parse(decrypted);
        botToken = parsed.access_token || parsed.authed_user?.access_token || decrypted;
      } catch (e) {
        botToken = credential.encrypted_data;
      }
    }

    // Normalize context data for AI workspace ingestion
    if (connectorId === 'slack' && triggerDetails.triggerId === 'message_received') {
      const isFileShare = triggerDetails.data.subtype === 'file_share';
      
      if (!isFileShare) {
        const { normalizeSlackMessage } = await import('@/lib/integrations/contextNormalizer');
        await normalizeSlackMessage(triggerDetails.data, workspaceId, botToken);

        // Check if message text mentions "nexus" or "nex-" (case-insensitive)
        const text = triggerDetails.data.text || '';
        const containsNexus = text.toLowerCase().includes('nexus') || text.toLowerCase().includes('nex-');

        if (containsNexus) {
          // Resolve all active workspace members to send notification to
          const { data: members } = await supabase
            .from('workspace_members')
            .select('user_id')
            .eq('workspace_id', workspaceId)
            .eq('status', 'active');

          if (members && members.length > 0) {
            const senderName = triggerDetails.data.user || 'Someone';
            const cleanText = text.length > 80 ? `${text.substring(0, 80)}...` : text;
            
            const notificationPayloads = members.map((member, index) => ({
              id: `notif-slack-mention-${Date.now()}-${index}`,
              user_id: member.user_id,
              title: `Slack Mention: Nexus`,
              message: `${senderName}: "${cleanText}"`,
              type: 'system',
              read: false,
              created_at: new Date().toISOString()
            }));

            const { error: notifErr } = await supabase
              .from('notifications')
              .insert(notificationPayloads);

            if (notifErr) {
              console.error('[WebhookGateway] Failed to insert Slack mention notifications:', notifErr);
            } else {
              console.log(`[WebhookGateway] Slack mention notifications sent to ${members.length} members`);
            }
          }
        }

        // Auto-triage and run decision service for ticket mentions
        const ticketRegex = /[A-Z]+-[0-9]+/g;
        const ticketMentions = text.match(ticketRegex) || [];
        const uniqueTickets = Array.from(new Set(ticketMentions));

        if (uniqueTickets.length > 0) {
          const { autoTriageSlackMention } = await import('@/lib/integrations/decisionService');
          for (const ticket of uniqueTickets) {
            // Trigger the triage asynchronously so it does not block the webhook response
            autoTriageSlackMention(ticket, workspaceId).catch(err => {
              console.error(`[WebhookGateway] Error running auto-triage for ${ticket}:`, err);
            });
          }
        }
      } else {
        // Handle file_share subtype immediately
        const files = triggerDetails.data.files || [];
        if (files.length > 0 && botToken) {
          const { normalizeSlackFile } = await import('@/lib/integrations/contextNormalizer');
          for (const file of files) {
            normalizeSlackFile({ file_id: file.id, user_id: triggerDetails.data.user }, workspaceId, botToken).catch(err => {
              console.error('[WebhookGateway] Error normalizing Slack message file:', err);
            });
          }
        }
      }
    } else if (connectorId === 'slack' && triggerDetails.triggerId === 'file_shared') {
      if (botToken) {
        const { normalizeSlackFile } = await import('@/lib/integrations/contextNormalizer');
        // Trigger file download and storage ingestion in the background
        normalizeSlackFile(triggerDetails.data, workspaceId, botToken).catch(err => {
          console.error('[WebhookGateway] Error normalizing Slack file:', err);
        });
      } else {
        console.warn('[WebhookGateway] Slack bot token not available for file normalization');
      }
    } else if (connectorId === 'jira' && (triggerDetails.triggerId === 'issue_created' || triggerDetails.triggerId === 'issue_updated')) {
      const { normalizeJiraIssue } = await import('@/lib/integrations/contextNormalizer');
      await normalizeJiraIssue(triggerDetails.data, workspaceId);
    }

    // Query active workflows in integrations schema matching this connector/triggerId
    const { data: workflows, error: workflowErr } = await supabase
      .from('workflows')
      .select('*')
      .eq('is_active', true);

    if (workflowErr) throw workflowErr;

    // Filter workflows locally to match trigger configuration (connector_id and event_type)
    const matchingWorkflows = (workflows || []).filter(flow => {
      const config = flow.trigger_config || {};
      return config.connector_id === connectorId && config.event_type === triggerDetails.triggerId;
    });

    const executionResults = [];

    // Trigger async execution of matching workflows
    for (const flow of matchingWorkflows) {
      console.log(`[WebhookGateway] Dispatching workflow execution: ${flow.name} (${flow.id})`);
      
      // Log starting run
      const { data: log, error: logErr } = await supabase
        .from('execution_logs')
        .insert({
          workflow_id: flow.id,
          status: 'running',
          payload: triggerDetails.data
        })
        .select()
        .single();

      if (logErr) continue;

      // Execute action flow asynchronously
      try {
        const actions = flow.actions_config || [];
        for (const action of actions) {
          // In production, resolves connector, decrypts tokens, and calls executeAction
          console.log(`[Workflow Engine] Executing action: ${action.action_id} for connector: ${action.connector_id}`);
        }

        // Update run log to success
        await supabase
          .from('execution_logs')
          .update({ status: 'success', completed_at: new Date().toISOString() })
          .eq('id', log.id);

        executionResults.push({ workflowId: flow.id, status: 'success' });
      } catch (err: any) {
        // Update run log to failure
        await supabase
          .from('execution_logs')
          .update({ 
            status: 'failed', 
            error_message: err.message || 'Execution error',
            completed_at: new Date().toISOString() 
          })
          .eq('id', log.id);

        executionResults.push({ workflowId: flow.id, status: 'failed', error: err.message });
      }
    }

    return NextResponse.json({ success: true, processedCount: executionResults.length, results: executionResults });
  } catch (error: any) {
    console.error('[Webhook Gateway Route Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Webhook Processing Error' }, { status: 500 });
  }
}
