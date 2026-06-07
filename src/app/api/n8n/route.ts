import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const apiKeyHeader = req.headers.get('x-n8n-api-key');
    const configuredApiKey = process.env.N8N_API_KEY;

    // Verify API Key if configured in env
    if (configuredApiKey && apiKeyHeader !== configuredApiKey) {
      return NextResponse.json({ error: 'Unauthorized: Invalid API key' }, { status: 401 });
    }

    const { action, data, workspaceId } = await req.json();

    if (!action || !data) {
      return NextResponse.json({ error: 'Missing action or data in payload' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    switch (action) {
      case 'create_task': {
        const { title, description, priority, dueDate, status, assignee } = data;
        const { data: task, error } = await supabase
          .from('tasks')
          .insert({
            title,
            description,
            priority: priority || 'medium',
            status: status || 'todo',
            due_date: dueDate || '',
            assignee: assignee || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, task });
      }

      case 'create_document': {
        const { title, type, size, summary, content, tags, keyPoints, extractedTasks } = data;
        const { data: doc, error } = await supabase
          .from('documents')
          .insert({
            title,
            type: type || 'pdf',
            size: size || '0 KB',
            summary: summary || '',
            content: content || '',
            tags: tags || [],
            key_points: keyPoints || [],
            extracted_tasks: extractedTasks || [],
            uploaded_at: new Date().toISOString(),
            processing_status: 'completed',
          })
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, doc });
      }

      case 'create_email': {
        const { to, toName, fromEmail, fromName, subject, body, status, aiGenerated } = data;
        const { data: email, error } = await supabase
          .from('emails')
          .insert({
            to_name: toName,
            to,
            from_email: fromEmail,
            from_name: fromName,
            subject,
            body,
            status: status || 'received',
            ai_generated: aiGenerated ?? true,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, email });
      }

      case 'add_audit_log': {
        const { senderName, title, message } = data;
        const { data: log, error } = await supabase
          .from('audit_logs')
          .insert({
            workspace_id: workspaceId || 'global-n8n',
            actor_id: 'n8n-agent',
            actor_name: senderName || 'n8n Automation Agent',
            action: title || 'Automated Action',
            target: message || '',
            timestamp: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, auditLog: log });
      }

      default:
        return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('n8n API Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'An error occurred during n8n action execution.' },
      { status: 500 }
    );
  }
}
