import { FREE_MODELS_REGISTRY, DEFAULT_AI_MODEL_ID } from './model-registry';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamOptions {
  temperature?: number;
  maxTokens?: number;
  fallbackModelId?: string;
}

/**
 * High-performance OpenRouter streaming client service
 */
export async function streamOpenRouter(
  messages: ChatMessage[],
  modelId: string,
  options: StreamOptions = {}
): Promise<ReadableStream> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not defined in backend environments.');
  }

  // Validate selected model exists in our free registry
  const targetModel = FREE_MODELS_REGISTRY.find(m => m.id === modelId);
  const selectedModelId = targetModel ? targetModel.id : DEFAULT_AI_MODEL_ID;
  const fallbackModelId = options.fallbackModelId || DEFAULT_AI_MODEL_ID;

  const temp = options.temperature !== undefined ? options.temperature : 0.5;

  const initiateRequest = async (activeModel: string): Promise<Response> => {
    return fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://nexus-ai.com',
        'X-Title': 'Nexus AI Workspace',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: activeModel,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        stream: true,
        temperature: temp,
        max_tokens: options.maxTokens
      }),
    });
  };

  let response: Response;
  try {
    console.log(`[OpenRouter] Routing stream query to: ${selectedModelId}`);
    response = await initiateRequest(selectedModelId);

    // Dynamic error fallback to default free model if service is offline/rate-limited
    if (!response.ok && selectedModelId !== fallbackModelId) {
      console.warn(`[OpenRouter] Target model ${selectedModelId} failed (Status: ${response.status}). Falling back to: ${fallbackModelId}`);
      response = await initiateRequest(fallbackModelId);
    }
  } catch (err) {
    if (selectedModelId !== fallbackModelId) {
      console.warn(`[OpenRouter] Connection error to ${selectedModelId}. Attempting fallback to ${fallbackModelId}`);
      response = await initiateRequest(fallbackModelId);
    } else {
      throw err;
    }
  }

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenRouter API failed with status ${response.status}: ${errBody}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  // Create standard text encoder readable stream for Edge Routing
  return new ReadableStream({
    async start(controller) {
      let buffer = '';
      try {
        if (!reader) {
          controller.close();
          return;
        }

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
                const token = parsed.choices?.[0]?.delta?.content || '';
                if (token) {
                  controller.enqueue(encoder.encode(token));
                }
              } catch (e) {
                // ignore parsing fragments
              }
            }
          }
        }
        controller.close();
      } catch (streamErr: any) {
        console.error('[OpenRouter] Streaming pipeline error:', streamErr);
        controller.enqueue(encoder.encode(`\n\n*Connection error: ${streamErr.message || 'Stream interrupted'}*`));
        controller.close();
      }
    }
  });
}
