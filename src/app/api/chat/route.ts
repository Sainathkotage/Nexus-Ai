import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { getTodayAiUsage, isAdminRole } from '@/lib/permissions';
import { detectPromptInjection } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const { messages, documentContext, workspaceId } = await req.json();

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


    const systemPrompt = `You are Nexus AI, an advanced AI Chief of Staff. You help users manage their workspace, analyze documents, and organize tasks. Provide concise, helpful, and professional responses formatted in markdown.
    
${documentContext ? `Here is the contents of the documents currently in the user's workspace:\n\n${documentContext}\n\nUse this context to answer the user's questions.` : ''}`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please add GEMINI_API_KEY in .env.local.' },
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

    // Convert standard chat message format to Gemini's REST format
    const contents = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // The Gemini REST URL
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    let response: Response | null = null;
    let data: any = null;
    let attempt = 0;
    const maxAttempts = 3;
    let delay = 1000;

    while (attempt < maxAttempts) {
      try {
        response = await fetch(url, {
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
              temperature: 0.7,
            }
          })
        });

        data = await response.json();

        if (response.ok) {
          break;
        }

        // Retry on rate limits, service overload, or internal errors
        const isRetriable = [429, 503, 500].includes(response.status) || 
                            (data?.error?.message && String(data.error.message).toLowerCase().includes('demand'));
                            
        if (!isRetriable || attempt === maxAttempts - 1) {
          break;
        }

        console.warn(`Gemini Chat API returned status ${response.status}. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxAttempts})`);
      } catch (err) {
        if (attempt === maxAttempts - 1) throw err;
        console.warn(`Fetch error in Gemini chat request. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxAttempts})`);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
      delay *= 2; // Exponential backoff
    }

    if (!response || !response.ok) {
      console.error('Gemini API Response Error:', data);
      return NextResponse.json(
        { error: data?.error?.message || 'Failed to generate response from Gemini API due to high demand.' },
        { status: response ? response.status : 503 }
      );
    }

    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I am unable to process that right now.';

    return NextResponse.json({ text: aiResponse });
  } catch (error: any) {
    console.error('Gemini API Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'An error occurred while communicating with the AI assistant.' },
      { status: 500 }
    );
  }
}
