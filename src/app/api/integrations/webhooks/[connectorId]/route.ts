import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { ConnectorRegistry } from '@/lib/integrations/framework';
import '@/lib/integrations/connectors';

export async function POST(req: Request, { params }: { params: { connectorId: string } }) {
  const { connectorId } = params;
  
  try {
    const connector = ConnectorRegistry.get(connectorId);
    if (!connector) {
      return NextResponse.json({ error: `Connector not found: ${connectorId}` }, { status: 404 });
    }

    const payload = await req.json();
    console.log(`[WebhookGateway] Received event for connector: ${connectorId}`, payload);

    // Call connector helper to format webhook details into standard triggers
    let triggerDetails = { triggerId: 'generic_event', data: payload };
    if (connector.handleWebhook) {
      triggerDetails = await connector.handleWebhook(payload);
    }

    const supabase = createSupabaseAdminClient();

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
