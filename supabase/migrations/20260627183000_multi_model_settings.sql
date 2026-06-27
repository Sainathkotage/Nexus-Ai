-- Migration: Support dynamic multi-model registry and preferences
-- Date: 2026-06-27

-- 1. Create table for dynamic model registry cache
CREATE TABLE IF NOT EXISTS public.ai_models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    context_length INTEGER NOT NULL,
    input_cost_per_token NUMERIC(10, 8) NOT NULL,
    output_cost_per_token NUMERIC(10, 8) NOT NULL,
    capabilities TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add columns to profiles and workspaces tables for model preference tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_model_id TEXT REFERENCES public.ai_models(id) ON DELETE SET NULL;

ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS default_model_id TEXT REFERENCES public.ai_models(id) ON DELETE SET NULL;

-- 3. Pre-populate database registry with verified OpenRouter free models
INSERT INTO public.ai_models (id, name, provider, context_length, input_cost_per_token, output_cost_per_token, capabilities, is_active)
VALUES 
  ('google/gemini-2.5-flash:free', 'Gemini 2.5 Flash (Free)', 'Google', 1048576, 0.0, 0.0, ARRAY['chat', 'vision', 'streaming', 'voice'], true),
  ('meta-llama/llama-3-8b-instruct:free', 'Llama 3 8B Instruct (Free)', 'Meta', 8192, 0.0, 0.0, ARRAY['chat', 'streaming'], true),
  ('qwen/qwen-2.5-72b-instruct:free', 'Qwen 2.5 72B Instruct (Free)', 'Alibaba', 32768, 0.0, 0.0, ARRAY['chat', 'streaming'], true),
  ('deepseek/deepseek-chat:free', 'DeepSeek Chat (Free)', 'DeepSeek', 64000, 0.0, 0.0, ARRAY['chat', 'streaming'], true)
ON CONFLICT (id) DO UPDATE 
SET 
  name = EXCLUDED.name,
  context_length = EXCLUDED.context_length,
  capabilities = EXCLUDED.capabilities,
  is_active = EXCLUDED.is_active;

-- 4. Enable Row Level Security policies
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to ai_models" ON public.ai_models
  FOR SELECT USING (true);
