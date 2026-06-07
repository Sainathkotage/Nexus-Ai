/**
 * Triggers an n8n webhook workflow.
 * Useful for offloading background tasks (like complex research, email scraping, or CRM updates) to n8n AI Agents.
 */
export async function triggerN8nWorkflow(event: string, payload: any) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('n8n Webhook URL is not configured. Define N8N_WEBHOOK_URL in env file.');
    return { success: false, error: 'not_configured' };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Nexus-Event': event,
      },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        payload,
      }),
    });

    if (!res.ok) {
      console.error(`n8n webhook returned status ${res.status}`);
      return { success: false, status: res.status };
    }

    const data = await res.json().catch(() => ({}));
    return { success: true, data };
  } catch (err: any) {
    console.error('Error triggering n8n webhook:', err);
    return { success: false, error: err.message || 'network_error' };
  }
}
