import { NextResponse } from 'next/server';
import { callLLM } from '@/lib/ai';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { tasks, calendarEvents, notifications, workspaceId } = await req.json();

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!openRouterApiKey && !geminiApiKey) {
      return NextResponse.json(
        { error: 'AI API key is not configured.' },
        { status: 500 }
      );
    }

    // Process tasks: filter today or overdue
    const pendingTasks = (tasks || [])
      .filter((t: any) => t.status !== 'done' && !t.tags?.includes('time-log'))
      .map((t: any) => `- Task: ${t.title} (Priority: ${t.priority}, Due: ${t.dueDate || 'No due date'})`);

    // Process calendar events
    const todayEvents = (calendarEvents || [])
      .map((e: any) => `- Event: ${e.title} (${e.startTime} - ${e.endTime})`);

    // Process unread notifications
    const unreads = (notifications || [])
      .filter((n: any) => !n.read)
      .map((n: any) => `- Notification: ${n.message || n.title}`);

    // Fetch workspace documents (Notion, GitHub, Slack context)
    let docsContextText = '';
    if (workspaceId) {
      try {
        const supabaseAdmin = createSupabaseAdminClient();
        const { data: dbDocs } = await supabaseAdmin
          .from('documents')
          .select('title, tags, content')
          .eq('workspace_id', workspaceId)
          .limit(10);
        
        if (dbDocs && dbDocs.length > 0) {
          docsContextText = dbDocs.map((d: any) => {
            const tagStr = Array.isArray(d.tags) ? d.tags.join(', ') : '';
            return `- Synced Item: "${d.title}" (Platform/Tags: [${tagStr}]) - Summary: ${d.content?.slice(0, 150)}...`;
          }).join('\n');
        }
      } catch (err) {
        console.warn('[Briefing API] Failed to query workspace documents:', err);
      }
    }

    const context = `
TASKS PENDING:
${pendingTasks.length > 0 ? pendingTasks.join('\n') : 'No pending tasks.'}

CALENDAR EVENTS:
${todayEvents.length > 0 ? todayEvents.join('\n') : 'No events scheduled.'}

UNREAD NOTIFICATIONS & MENTIONS:
${unreads.length > 0 ? unreads.join('\n') : 'No unread updates.'}

RECENTLY SYNCED INTEGRATIONS DATA (SLACK, GITHUB, NOTION):
${docsContextText ? docsContextText : 'No active integration updates synced yet.'}
    `.trim();

    const systemPrompt = `You are Nexus AI, a helpful Chief of Staff. Generate a warm, concise "Morning Briefing" summary for the user.
Greet the user. Summarize what requires immediate attention based on their tasks, calendar events, notifications, and recent integrated app updates (Slack threads, GitHub commits, Notion pages).
Keep it conversational, professional, and action-oriented.
At the very end of your briefing, add a "Sources Used" section listing the documents, commits, or tickets that provided context (e.g., "*Sources: [Notion: specs], [GitHub: commit 75261f1]*"). Return in clean text/markdown format.`;

    const aiBriefing = await callLLM(
      [
        {
          role: 'user',
          content: `Here is my workspace context for today:\n\n${context}\n\nPlease write my morning briefing with sources.`
        }
      ],
      {
        systemPrompt,
        temperature: 0.6
      }
    );

    return NextResponse.json({ text: aiBriefing.trim() });
  } catch (error: any) {
    console.error('Gemini Briefing API Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'An error occurred while generating briefing.' },
      { status: 500 }
    );
  }
}
