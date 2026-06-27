export interface AIModel {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  inputCostPerToken: number;
  outputCostPerToken: number;
  capabilities: Array<'chat' | 'vision' | 'streaming' | 'voice'>;
  isActive: boolean;
}

// Single source of truth for verified OpenRouter free models
export const FREE_MODELS_REGISTRY: AIModel[] = [
  {
    id: 'google/gemini-2.5-flash:free',
    name: 'Gemini 2.5 Flash (Free)',
    provider: 'Google',
    contextLength: 1048576,
    inputCostPerToken: 0.0,
    outputCostPerToken: 0.0,
    capabilities: ['chat', 'vision', 'streaming', 'voice'],
    isActive: true
  },
  {
    id: 'meta-llama/llama-3-8b-instruct:free',
    name: 'Llama 3 8B Instruct (Free)',
    provider: 'Meta',
    contextLength: 8192,
    inputCostPerToken: 0.0,
    outputCostPerToken: 0.0,
    capabilities: ['chat', 'streaming'],
    isActive: true
  },
  {
    id: 'qwen/qwen-2.5-72b-instruct:free',
    name: 'Qwen 2.5 72B Instruct (Free)',
    provider: 'Alibaba',
    contextLength: 32768,
    inputCostPerToken: 0.0,
    outputCostPerToken: 0.0,
    capabilities: ['chat', 'streaming'],
    isActive: true
  },
  {
    id: 'deepseek/deepseek-chat:free',
    name: 'DeepSeek Chat (Free)',
    provider: 'DeepSeek',
    contextLength: 64000,
    inputCostPerToken: 0.0,
    outputCostPerToken: 0.0,
    capabilities: ['chat', 'streaming'],
    isActive: true
  }
];

export const DEFAULT_AI_MODEL_ID = 'google/gemini-2.5-flash:free';

export function getModelById(modelId: string): AIModel {
  return FREE_MODELS_REGISTRY.find(m => m.id === modelId) || FREE_MODELS_REGISTRY[0];
}

export function isCapabilitySupported(modelId: string, capability: 'chat' | 'vision' | 'streaming' | 'voice'): boolean {
  const model = getModelById(modelId);
  return model.capabilities.includes(capability);
}
