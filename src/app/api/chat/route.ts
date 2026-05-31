import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages, documentContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
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

    // Convert standard chat message format to Gemini's REST format
    const contents = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // The Gemini REST URL
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
          temperature: 0.7,
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Response Error:', data);
      return NextResponse.json(
        { error: data?.error?.message || 'Failed to generate response from Gemini API.' },
        { status: response.status }
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
