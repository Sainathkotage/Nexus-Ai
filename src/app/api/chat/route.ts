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


    const systemPrompt = `You are Nexus AI, an advanced AI Chief of Staff. You help users manage their workspace, analyze documents, organize tasks, and schedule meetings.
    
Current local date/time context: ${currentDate || new Date().toISOString()}
Current authenticated user: ${JSON.stringify(currentUser || null)}
List of all workspace members: ${JSON.stringify(users || [])}

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
${documentContext ? `Here is the contents of the documents currently in the user's workspace:\n\n${documentContext}\n\nUse this context to answer the user's questions.` : ''}`;

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!openRouterApiKey && !geminiApiKey) {
      return NextResponse.json(
        { error: 'AI API key is not configured. Please add OPENROUTER_API_KEY or GEMINI_API_KEY in .env.local.' },
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
