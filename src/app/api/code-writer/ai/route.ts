import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { code, instruction, language } = await req.json();

    if (!code || !instruction) {
      return NextResponse.json({ error: 'Missing code or instruction parameters' }, { status: 400 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server' }, { status: 500 });
    }

    const systemPrompt = `You are an expert AI software engineer. Your task is to modify, optimize, or write code based on the user's instructions.
Output ONLY the resulting code. Do NOT enclose the code in markdown code blocks (\`\`\`). Do NOT provide explanations, descriptions, or comments before or after the code.
If the language is ${language || 'TypeScript'}, ensure the code strictly adheres to it.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `Original Code:\n${code}\n\nInstruction:\n${instruction}` }]
          }
        ],
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({ result: result.trim() });
  } catch (error: any) {
    console.error('[CodeWriter AI API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal AI Server Error' }, { status: 500 });
  }
}
