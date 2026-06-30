import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { getTodayAiUsage, isAdminRole } from '@/lib/permissions';
import { detectPromptInjection } from '@/lib/security';
import { callLLM, parseRobustJson } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const { messages, documentContext, workspaceId, users, currentUser, currentDate } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    // Shield against prompt injection attacks
    const userMessages = messages.filter((msg: any) => msg.role === 'user');
    for (const msg of userMessages) {
      if (msg.content && detectPromptInjection(msg.content)) {
        return NextResponse.json(
          { error: 'Potential prompt injection attempt detected. Request blocked for security.' },
          { status: 400 }
        );
      }
    }


    // Fetch active integrations and dynamic document contents for the workspace
    let activeIntegrationsText = '';
    let integrationsDocContext = '';
    if (workspaceId) {
      try {
        const supabaseAdmin = createSupabaseAdminClient();
        const { data: integrations } = await supabaseAdmin
          .from('workspace_integrations')
          .select('connector_id, status')
          .eq('workspace_id', workspaceId)
          .eq('status', 'active');
        
        if (integrations && integrations.length > 0) {
          const list = integrations.map((i: any) => i.connector_id).join(', ');
          activeIntegrationsText = `Active workspace integrations connected: [${list}]. Synced context files (like Notion pages, Slack chats, GitHub PRs) are available in the documents list. You can read, analyze, and summarize them directly.`;
        }

        // Fetch up to 20 documents synced in the workspace (Notion, Slack, Github, Jira)
        const { data: dbDocs } = await supabaseAdmin
          .from('documents')
          .select('title, content, tags')
          .eq('workspace_id', workspaceId)
          .limit(20);
        
        if (dbDocs && dbDocs.length > 0) {
          integrationsDocContext = dbDocs.map((d: any) => {
            const tagList = Array.isArray(d.tags) ? d.tags.join(', ') : '';
            return `[Source: ${tagList || 'general'}] Title: ${d.title}\nContent:\n${d.content}`;
          }).join('\n\n---\n\n');
        }
      } catch (err) {
        console.warn('Failed to fetch workspace integrations/docs for system prompt:', err);
      }
    }

    const githubContext = `Connected GitHub Repositories:
1. Sainathkotage/Nexus-Ai (Private, Active Synced Workspace)
   - Description: Unified AI reasoning space, real-time whiteboards, Slack/Jira sync layers, and Groq-powered reasoning models.
   - Default Branch: main
   - Recent Commits:
     - [75261f1] feat: use Groq (llama-3.3-70b-versatile) as primary AI engine (by Sainath Kotage, 2 mins ago)
     - [0a955f9] fix: import Trash2 icon in DocumentsPage to resolve client-side crash (by Sainath Kotage, 15 mins ago)
     - [93caf33] fix: resolve teammate-uploaded documents query and post-fetch filter (by Sainath Kotage, 45 mins ago)
     - [fabdf86] feat: add skeleton loading, bulk delete, and friendly categories (by Sainath Kotage, 2 hours ago)
   - Branches: main, dev, feature/groq-sync, fix/login-callback

2. Sainathkotage/nexus-ai-marketing (Public)
   - Description: Nexus AI landing pages, blogs, and SEO marketing structures.
   - Default Branch: main`;

    const systemPrompt = `You are Nexus AI, an advanced AI Chief of Staff. You help users manage their workspace, analyze documents, organize tasks, and schedule meetings.
    
Current local date/time context: ${currentDate || new Date().toISOString()}
Current authenticated user: ${JSON.stringify(currentUser || null)}
List of all workspace members: ${JSON.stringify(users || [])}
${activeIntegrationsText ? `\n${activeIntegrationsText}\n` : ''}

--- GitHub Repository Context ---
${githubContext}

You possess deep cross-tool reasoning capabilities. When analyzing documents or conversations, actively look for connections between Jira tickets (e.g., matching reference patterns like NEX-45) and Slack message logs. If a Slack discussion thread contains updates, blockers, or capacity alerts regarding a specific Jira issue, synthesize decisions and make active recommendations. Provide options to resolve conflicts (e.g. by reassigning tasks, updating deadlines, or scheduling sync meetings) using the actions array below.


    You must respond with a JSON object following this schema:
{
  "text": "Your main natural language response to the user. Format in markdown. Be professional and helpful.",
  "actions": [
    {
      "type": "create_calendar_event" | "create_task" | "send_email",
      // ... action specific properties listed below ...
    }
  ]
}

Supported actions:
1. create_calendar_event (use "type": "create_calendar_event"):
   - title: Title of the meeting.
   - date: Date string (YYYY-MM-DD). If the user says "tomorrow", calculate it based on the current local date/time context.
   - startTime: Time string (HH:MM).
   - endTime: Time string (HH:MM), default to 30 mins or 1 hour after startTime.
   - category: Must be "meeting" or "other".
   - description: Description of the meeting.
   - attendeeIds: Array of user IDs attending.
   - color: A theme color (e.g., "indigo", "emerald", "purple", "amber").

2. create_task:
   - title: Task title.
   - description: Task description.
   - priority: "high", "medium", or "low".
   - assigneeId: User ID of the assignee. Default to the current user's ID if not specified.
   - dueDate: Date string (YYYY-MM-DD).
   - tags: Array of tags.

3. send_email:
   - to: Recipient's email address.
   - toName: Recipient's name.
   - subject: Subject line.
   - body: Professional email body text.

Ensure the response is valid JSON and contains only the JSON structure.
${documentContext ? `Here is the contents of the user selected documents:\n\n${documentContext}\n\n` : ''}
${integrationsDocContext ? `Here is the integrated apps context (Slack, Notion, GitHub, Jira) synced in this workspace:\n\n${integrationsDocContext}\n\nUse this context to answer queries and make recommendations.` : ''}`;

    const gorqApiKey = process.env.GORQ_API_KEY;
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!gorqApiKey && !openRouterApiKey && !geminiApiKey) {
      return NextResponse.json(
        { error: 'AI API key is not configured. Please add GORQ_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY in .env.local.' },
        { status: 500 }
      );
    }

    const auth = await createSupabaseServerClient();
    const { data: { user } } = await auth.auth.getUser();
    if (user && workspaceId) {
      const supabase = createSupabaseAdminClient();
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const limit = isAdminRole(profile?.role) ? 100 : 25;
      const usage = await getTodayAiUsage(user.id, workspaceId);
      if ((usage?.requests || 0) > limit) {
        return NextResponse.json({ error: `Daily AI limit reached (${limit} requests).` }, { status: 429 });
      }
    }

    try {
      const aiResponse = await callLLM(messages, {
        systemPrompt,
        temperature: 0.7,
        jsonMode: true
      });
      
      const parsed = parseRobustJson(aiResponse) || {};
      const text = parsed.text || aiResponse;
      const actions = parsed.actions || [];
      return NextResponse.json({ text, actions });

    } catch (err: any) {
      console.error('LLM Call Error (chat):', err);
      return NextResponse.json(
        { error: err?.message || 'Failed to generate response from AI provider.' },
        { status: 502 }
      );
    }
  } catch (error: any) {
    console.error('Gemini API Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'An error occurred while communicating with the AI assistant.' },
      { status: 500 }
    );
  }
}
