import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { tasks, calendarEvents, notifications } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured.' },
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
        role: 'user',
        parts: [{ text: `Here is my workspace context for today:\n\n${context}\n\nPlease write my morning briefing.` }]
      }
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.6,
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || 'Gemini API briefing generation failed');
    }

    const aiBriefing = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No updates for today.';

    return NextResponse.json({ text: aiBriefing.trim() });
  } catch (error: any) {
    console.error('Gemini Briefing API Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'An error occurred while generating briefing.' },
      { status: 500 }
    );
  }
}
