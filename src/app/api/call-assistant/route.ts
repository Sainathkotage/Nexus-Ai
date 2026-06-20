import { NextResponse } from 'next/server';
import { detectPromptInjection } from '@/lib/security';
import { callLLM, parseRobustJson } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const { command, currentDate, users, currentCallPartner, currentUser } = await req.json();

    // Shield against prompt injection attacks
    if (command && detectPromptInjection(command)) {
      return NextResponse.json(
        { error: 'Potential prompt injection attempt detected. Request blocked for security.' },
        { status: 400 }
      );
    }


    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!openRouterApiKey && !geminiApiKey) {
      return NextResponse.json(
        { error: 'AI API key is not configured.' },
        { status: 500 }
      );
    }

    const systemPrompt = `You are the Nexus AI Assistant integrated inside a secure video/audio call. 
Your job is to analyze the user's spoken command and decide what actions to take in their workspace (calendar, tasks, emails).

Current local date/time context: ${currentDate}
Current authenticated user: ${JSON.stringify(currentUser)}
Current coworker in the call (default attendee for meetings/tasks if not specified): ${JSON.stringify(currentCallPartner)}
List of all workspace members: ${JSON.stringify(users)}

Analyze the user's natural language command and decide on a list of actions to perform.
Supported actions:
1. create_calendar_event:
   - title: Title of the meeting.
   - date: Date string (YYYY-MM-DD). If user says "tomorrow", calculate it based on the current local date/time context.
   - startTime: Time string (HH:MM).
   - endTime: Time string (HH:MM), default to 30 mins or 1 hour after startTime.
   - category: Must be "meeting" or "other".
   - description: Description of the meeting.
   - attendeeIds: Array of user IDs attending. By default, include the coworker in the call and the current user.
   - color: A theme color (e.g., "indigo", "emerald", "purple", "amber").

2. create_task:
   - title: Task title.
   - description: Task description.
   - priority: "high", "medium", or "low".
   - assigneeId: User ID of the assignee. Default to the current user or the coworker if specified.
   - dueDate: Date string (YYYY-MM-DD).
   - tags: Array of tags (e.g., ["meeting", "follow-up"]).

3. send_email:
   - to: Recipient's email address.
   - toName: Recipient's name.
   - subject: Subject line.
   - body: Professional email body text detailing the scheduled meeting/task.

You must respond with a JSON object following this schema:
{
  "actions": Array of action objects (each must have a "type" field, and the corresponding event/task/email fields),
  "speechResponse": "A natural language verbal response to speak to the user confirming what actions were taken."
}

Ensure the response is valid JSON and contains only the JSON structure.`;

    const jsonText = await callLLM(
      [
        {
          role: 'user',
          content: `User Command: "${command}"`
        }
      ],
      {
        systemPrompt,
        temperature: 0.1,
        jsonMode: true
      }
    );

    if (!jsonText) {
      throw new Error('Empty response from AI model');
    }

    const result = parseRobustJson(jsonText);
    return NextResponse.json(result);


  } catch (error: any) {
    console.error('Call Assistant Error:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
