-- SQL migration for user onboarding tutorial progress and analytics events

-- Create tutorial progress table
CREATE TABLE IF NOT EXISTS public.user_tutorial_progress (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'paused', 'completed', 'skipped')),
  ab_variant TEXT NOT NULL DEFAULT 'A' CHECK (ab_variant IN ('A', 'B')),
  completed_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on user_tutorial_progress
ALTER TABLE public.user_tutorial_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own tutorial progress" ON public.user_tutorial_progress;
DROP POLICY IF EXISTS "Users can insert own tutorial progress" ON public.user_tutorial_progress;
DROP POLICY IF EXISTS "Users can update own tutorial progress" ON public.user_tutorial_progress;

CREATE POLICY "Users can read own tutorial progress" ON public.user_tutorial_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tutorial progress" ON public.user_tutorial_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tutorial progress" ON public.user_tutorial_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create tutorial analytics events table
CREATE TABLE IF NOT EXISTS public.tutorial_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_name TEXT NOT NULL,
  step_index INTEGER,
  step_name TEXT,
  duration INTEGER, -- duration in seconds
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on tutorial_analytics_events
ALTER TABLE public.tutorial_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own tutorial analytics events" ON public.tutorial_analytics_events;
DROP POLICY IF EXISTS "Users can insert own tutorial analytics events" ON public.tutorial_analytics_events;

CREATE POLICY "Users can read own tutorial analytics events" ON public.tutorial_analytics_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tutorial analytics events" ON public.tutorial_analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
