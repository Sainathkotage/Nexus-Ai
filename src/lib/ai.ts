export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMOptions {
  systemPrompt?: string;
  temperature?: number;
  jsonMode?: boolean;
  model?: string; // Optional custom model for Gemini fallback (e.g., 'gemini-3.5-flash')
}

/**
 * Robust helper to call LLM via OpenRouter (using free models) or directly via Gemini REST API.
 */
export async function callLLM(messages: Message[], options: LLMOptions = {}): Promise<string> {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  const openRouterModel = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash:free';
  const geminiApiKey = process.env.GEMINI_API_KEY;

  const temp = options.temperature !== undefined ? options.temperature : 0.7;

  if (openRouterApiKey) {
    try {
      // Call OpenRouter API
      const formattedMessages: any[] = [];
      
      // Add system prompt if provided
      if (options.systemPrompt) {
        formattedMessages.push({ role: 'system', content: options.systemPrompt });
      }
      
      // Convert messages to standard OpenAI format
      messages.forEach((msg) => {
        formattedMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'system' : 'user',
          content: msg.content,
        });
      });

      const body: any = {
        model: options.model || openRouterModel,
        messages: formattedMessages,
        temperature: temp,
        max_tokens: 4096
      };

      if (options.jsonMode) {
        body.response_format = { type: 'json_object' };
      }

      let response: Response | null = null;
      let data: any = null;
      let attempt = 0;
      const maxAttempts = 3;
      let delay = 1000;

      while (attempt < maxAttempts) {
        try {
          response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openRouterApiKey}`,
              'HTTP-Referer': 'https://nexus-ai.com',
              'X-Title': 'Nexus AI',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });

          data = await response.json();

          if (response.ok) {
            break;
          }

          const isRetriable = [429, 503, 500].includes(response.status);
          if (!isRetriable || attempt === maxAttempts - 1) {
            break;
          }

          console.warn(`OpenRouter API returned status ${response.status}. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxAttempts})`);
        } catch (err) {
          if (attempt === maxAttempts - 1) throw err;
          console.warn(`Fetch error in OpenRouter request. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxAttempts})`);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
        delay *= 2;
      }

      if (!response || !response.ok) {
        console.error('OpenRouter API Response Error:', data);
        throw new Error(data?.error?.message || `OpenRouter API failed with status ${response ? response.status : 'unknown'}`);
      }

      const content = data.choices?.[0]?.message?.content;
      if (content === undefined || content === null) {
        throw new Error('Empty response from OpenRouter');
      }

      return content;
    } catch (err) {
      console.warn("OpenRouter API failed, attempting fallback to direct Gemini API. Error details:", err);
      if (!geminiApiKey) {
        throw err;
      }
      // If we have a gemini key, execution will fall through to the gemini branch below
    }
  }

  if (geminiApiKey) {
    // Fallback: Call Gemini REST API directly
    const contents = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const geminiModel = options.model || 'gemini-3.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;

    const reqBody: any = {
      contents,
      generationConfig: {
        temperature: temp,
      },
    };

    if (options.systemPrompt) {
      reqBody.system_instruction = {
        parts: [{ text: options.systemPrompt }],
      };
    }

    if (options.jsonMode) {
      reqBody.generationConfig.responseMimeType = 'application/json';
    }

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
          body: JSON.stringify(reqBody),
        });

        data = await response.json();

        if (response.ok) {
          break;
        }

        const isRetriable = [429, 503, 500].includes(response.status) ||
          (data?.error?.message && String(data.error.message).toLowerCase().includes('demand'));

        if (!isRetriable || attempt === maxAttempts - 1) {
          break;
        }

        console.warn(`Gemini API returned status ${response.status}. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxAttempts})`);
      } catch (err) {
        if (attempt === maxAttempts - 1) throw err;
        console.warn(`Fetch error in Gemini request. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxAttempts})`);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt++;
      delay *= 2;
    }

    if (!response || !response.ok) {
      console.error('Gemini API Response Error:', data);
      throw new Error(data?.error?.message || `Gemini API failed with status ${response ? response.status : 'unknown'}`);
    }

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (content === undefined || content === null) {
      throw new Error('Empty response from Gemini API');
    }

    return content;
  } else {
    throw new Error('Neither OpenRouter API key nor Gemini API key is configured.');
  }
}

/**
 * Clean and robust JSON parsing for LLM responses which may contain markdown formatting,
 * escaped chars, minor typos, or nested JSON structures inside text fields.
 */
export function parseRobustJson(jsonStr: string): any {
  jsonStr = jsonStr.trim();
  
  if (jsonStr.startsWith('```')) {
    const lines = jsonStr.split('\n');
    if (lines[0].startsWith('```')) lines.shift();
    if (lines[lines.length - 1].startsWith('```')) lines.pop();
    jsonStr = lines.join('\n').trim();
  }

  let parsed: any = null;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    let repairedStr = jsonStr;
    // Fix escaped single quotes (very common LLM nested json mistake)
    repairedStr = repairedStr.replace(/\\'/g, "'");
    // Replace dangling comma or missing closing brace in array of objects
    repairedStr = repairedStr.replace(/("tags"\s*:\s*\[\])\s*,\s*\n\s*\{\s*"type"/g, '$1\n    },\n    {\n      "type"');
    repairedStr = repairedStr.replace(/("tags"\s*:\s*\[\s*\])\s*,\s*\{/g, '$1}, {');
    
    try {
      parsed = JSON.parse(repairedStr);
    } catch (err2) {
      // Regex search for JSON block
      const jsonRegex = /\{[\s\S]*\}/;
      const match = jsonStr.match(jsonRegex);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch (err3) {
          // If still fails, try to repair single quotes inside the extracted block
          try {
            parsed = JSON.parse(match[0].replace(/\\'/g, "'"));
          } catch (err4) {
            console.warn("Robust parser failed to parse repair:", err4);
          }
        }
      }
    }
  }

  if (!parsed) {
    return null;
  }

  // Handle double-serialized nested JSON inside a 'text' or outer field if present
  if (parsed && typeof parsed === 'object') {
    // If the object only has a 'text' field (or similar) and it's a JSON string, unpack it
    if (Object.keys(parsed).length === 1 && typeof parsed.text === 'string' && parsed.text.trim().startsWith('{')) {
      try {
        const nested = parseRobustJson(parsed.text);
        if (nested && typeof nested === 'object') {
          parsed = nested;
        }
      } catch (_) {}
    } else if (typeof parsed.text === 'string' && parsed.text.trim().startsWith('{') && (!parsed.actions || parsed.actions.length === 0)) {
      try {
        const nested = parseRobustJson(parsed.text);
        if (nested && typeof nested === 'object') {
          parsed = {
            ...parsed,
            ...nested,
            text: nested.text || parsed.text // prefer unpacked text if available
          };
        }
      } catch (_) {}
    }

    // Normalize actions if they exist in the object
    if (parsed.actions && Array.isArray(parsed.actions)) {
      parsed.actions = parsed.actions.map((act: any) => {
        if (act && typeof act === 'object') {
          const type = act.type || act.action;
          return { ...act, type };
        }
        return act;
      });
    }
  }

  return parsed;
}


