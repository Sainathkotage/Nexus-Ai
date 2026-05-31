-- Supabase SQL migration for Advanced Team Chat tables
-- You can execute these definitions in the Supabase SQL Editor!

-- Add presence and notification columns to profiles if they do not exist
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}'::jsonb;

-- Create Channels table (supports categories, group chats, DMs, and starring)
CREATE TABLE IF NOT EXISTS public.channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  is_group BOOLEAN DEFAULT FALSE,
  starred_by TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on channels
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to channels" ON public.channels
  FOR SELECT USING (true);

CREATE POLICY "Allow individual insert access to channels" ON public.channels
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow individual update access to channels" ON public.channels
  FOR UPDATE USING (true);

-- Create Channel Messages table (supports threading, edits, and pinning)
CREATE TABLE IF NOT EXISTS public.channel_messages (
  id TEXT PRIMARY KEY,
  channel_id TEXT REFERENCES public.channels(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  media JSONB,
  parent_id TEXT REFERENCES public.channel_messages(id) ON DELETE CASCADE,
  edited_at TIMESTAMP WITH TIME ZONE,
  is_pinned BOOLEAN DEFAULT FALSE,
  pinned_by TEXT,
  pinned_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on channel messages
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to channel_messages" ON public.channel_messages
  FOR SELECT USING (true);

CREATE POLICY "Allow individual write access to channel_messages" ON public.channel_messages
  FOR ALL USING (true);

-- Create Message Reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT REFERENCES public.channel_messages(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS on reactions
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to reactions" ON public.message_reactions
  FOR SELECT USING (true);

CREATE POLICY "Allow individual write access to reactions" ON public.message_reactions
  FOR ALL USING (true);

-- Create Message Reads / Read Receipts table
CREATE TABLE IF NOT EXISTS public.message_reads (
  message_id TEXT REFERENCES public.channel_messages(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (message_id, user_id)
);

-- Enable RLS on message reads
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to message_reads" ON public.message_reads
  FOR SELECT USING (true);

CREATE POLICY "Allow individual write access to message_reads" ON public.message_reads
  FOR ALL USING (true);
