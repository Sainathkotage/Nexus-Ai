import { NextResponse } from 'next/server';
import { detectPromptInjection } from '@/lib/security';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { messages, context, modelId } = await req.json();

    // Shield against prompt injection attacks
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    if (lastUserMessage && detectPromptInjection(lastUserMessage)) {
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

    // Build context-rich system instructions
    const systemPrompt = `You are "Nexus AI", the intelligent real-time workspace and meeting assistant participating as a co-presenter in this live video call.

Current Meeting Context:
- Title: "${context.meetingTitle || 'Unnamed Meeting'}"
- Active Coworker / Partner: "${context.currentCallPartner?.name || 'None'}"
- Active Workspace: "${context.workspaceName || 'Nexus Workspace'}"
- Participants in Meeting: ${JSON.stringify(context.participants || [])}

Workspace Context (respecting user permissions):
- Active Documents: ${JSON.stringify((context.documents || []).map((d: any) => ({ title: d.title, summary: d.summary || '' })))}
- Current Open Tasks: ${JSON.stringify((context.tasks || []).map((t: any) => ({ title: t.title, status: t.status, priority: t.priority })))}
- Upcoming Events: ${JSON.stringify((context.calendarEvents || []).map((e: any) => ({ title: e.title, startTime: e.startTime, date: e.date })))}

Live Meeting Transcript (chronological speech log of this call):
${(context.liveTranscript || []).map((t: any) => `[${t.timestamp || ''}] ${t.senderName}: "${t.text}"`).join('\n')}

Role & Response Instructions:
1. Act as a direct participant in the call. Be helpful, concise, and professional.
2. If asked about what someone said or what happened in the meeting, refer to the "Live Meeting Transcript" context.
3. If asked to create a task, calendar event, or send an email, confirm you will perform the actions and write out the exact details.
4. Output your response in standard Markdown format. Use checklists, bullet points, task cards, or tables when appropriate.
5. If the user asks you to create a task, append a markdown representation of the task card to make it easy for them, like:
   \`\`\`task
   Title: [Task Title]
   Priority: [High/Medium/Low]
   Due Date: [YYYY-MM-DD]
   \`\`\`
6. Keep answers relatively short so they can be spoken and read quickly during a live meeting. Do not write extremely long paragraphs.`;

    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        try {
          if (openRouterApiKey) {
            // Stream via OpenRouter
            const formattedMessages = [
              { role: 'system', content: systemPrompt },
              ...messages.map((m: any) => ({
                role: m.role,
                content: m.content
              }))
            ];

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${openRouterApiKey}`,
                'HTTP-Referer': 'https://nexus-ai.com',
                'X-Title': 'Nexus AI',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: modelId || process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
                messages: formattedMessages,
                stream: true,
                temperature: 0.5
              })
            });

            if (!response.ok) {
              const errText = await response.text();
              throw new Error(`OpenRouter stream request failed: ${errText}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            if (reader) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const cleaned = line.trim();
                  if (!cleaned) continue;

                  if (cleaned.startsWith('data: ')) {
                    const dataStr = cleaned.slice(6);
                    if (dataStr === '[DONE]') continue;

                    try {
                      const parsed = JSON.parse(dataStr);
                      const text = parsed.choices?.[0]?.delta?.content || '';
                      if (text) {
                        controller.enqueue(encoder.encode(text));
                      }
                    } catch (e) {
                      // ignore parse errors of partial chunks
                    }
                  }
                }
              }
            }
          } else if (geminiApiKey) {
            // Stream via Gemini API directly
            const contents = [
              {
                role: 'user',
                parts: [{ text: `System Instruction: ${systemPrompt}` }]
              },
              ...messages.map((m: any) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
              }))
            ];

            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${geminiApiKey}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  contents,
                  generationConfig: {
                    temperature: 0.5
                  }
                })
              }
            );

            if (!response.ok) {
              const errText = await response.text();
              throw new Error(`Gemini stream request failed: ${errText}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            if (reader) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const cleaned = line.trim();
                  if (!cleaned) continue;

                  if (cleaned.startsWith('data: ')) {
                    const dataStr = cleaned.slice(6);
                    try {
                      const parsed = JSON.parse(dataStr);
                      const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                      if (text) {
                        controller.enqueue(encoder.encode(text));
                      }
                    } catch (e) {
                      // ignore parse errors of partial chunks
                    }
                  }
                }
              }
            }
          }

          controller.close();
        } catch (err: any) {
          console.error('[AI Stream] Error in stream generation:', err);
          controller.enqueue(encoder.encode(`\n\n*Error generating response: ${err.message || 'Stream generation failed'}*`));
          controller.close();
        }
      }
    });

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    });

  } catch (error: any) {
    console.error('[AI Chat API Route] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
