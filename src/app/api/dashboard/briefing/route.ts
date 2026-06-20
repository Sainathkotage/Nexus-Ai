import { NextResponse } from 'next/server';
import { callLLM } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const { tasks, calendarEvents, notifications } = await req.json();

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!openRouterApiKey && !geminiApiKey) {
      return NextResponse.json(
        { error: 'AI API key is not configured.' },
        { status: 500 }
      );
    }

    // Process tasks: filter today or overdue (exclude timesheets log tasks)
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

    const context = `
TASKS PENDING:
${pendingTasks.length > 0 ? pendingTasks.join('\n') : 'No pending tasks.'}

CALENDAR EVENTS:
${todayEvents.length > 0 ? todayEvents.join('\n') : 'No events scheduled.'}

UNREAD NOTIFICATIONS & MENTIONS:
${unreads.length > 0 ? unreads.join('\n') : 'No unread updates.'}
    `.trim();

    const systemPrompt = `You are Nexus AI, a helpful Chief of Staff. Generate a warm, concise "Morning Briefing" paragraph (max 3 sentences) for the user.
Greet the user. Summarize what requires immediate attention based on their tasks, events, and notifications. Keep it professional, action-oriented, and conversational. Write a single short paragraph. Return in clean text/markdown format.`;

    const contents = [
      {
        role: 'user' as const,
        parts: [{ text: `Here is my workspace context for today:\n\n${context}\n\nPlease write my morning briefing.` }]
      }
    ];

    const aiBriefing = await callLLM(
      [
        {
          role: 'user',
          content: `Here is my workspace context for today:\n\n${context}\n\nPlease write my morning briefing.`
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
