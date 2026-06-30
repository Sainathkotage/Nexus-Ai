import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { code, instruction, language } = await req.json();

    if (!code || !instruction) {
      return NextResponse.json({ error: 'Missing code or instruction parameters' }, { status: 400 });
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || 'google/gemma-2-9b-it:free';

    if (!openRouterKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured on the server' }, { status: 500 });
    }

    const systemPrompt = `You are an expert AI software engineer. Your task is to modify, optimize, or write code based on the user's instructions.
Output ONLY the resulting code. Do NOT enclose the code in markdown code blocks (\`\`\`). Do NOT provide explanations, descriptions, or comments before or after the code.
If the language is ${language || 'TypeScript'}, ensure the code strictly adheres to it.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nexus-ai.com', // Optional OpenRouter tracking
        'X-Title': 'Nexus AI Code Writer',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Original Code:\n${code}\n\nInstruction:\n${instruction}` }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || '';

    return NextResponse.json({ result: result.trim() });
  } catch (error: any) {
    console.error('[CodeWriter AI API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal AI Server Error' }, { status: 500 });
  }
}
