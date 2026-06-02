-- Supabase SQL migration for Advanced Team Chat tables
-- You can execute these definitions in the Supabase SQL Editor!

-- Add presence and notification columns to profiles if they do not exist
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS unique_handle TEXT GENERATED ALWAYS AS (username || '#' || tag) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_tag_unique
  ON public.profiles (lower(username), tag);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_unique_handle_unique
  ON public.profiles (lower(unique_handle));

CREATE OR REPLACE FUNCTION public.is_workspace_member(workspace_id_to_check TEXT, user_id_to_check TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = workspace_id_to_check
      AND user_id = user_id_to_check
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.users_share_workspace(first_user_id TEXT, second_user_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members first_member
    JOIN public.workspace_members second_member
      ON second_member.workspace_id = first_member.workspace_id
    WHERE first_member.user_id = first_user_id
      AND second_member.user_id = second_user_id
      AND first_member.status = 'active'
      AND second_member.status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Workspace foundation for test-run collaboration
CREATE TABLE IF NOT EXISTS public.workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Member',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'removed')),
  added_by TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.workspace_invites (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'Member',
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_by TEXT,
  used_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.document_permissions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id TEXT,
  access_level TEXT NOT NULL DEFAULT 'private' CHECK (access_level IN ('private', 'workspace', 'user')),
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.feedback (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  page TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ai_usage (
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT NOT NULL,
  usage_date DATE NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0,
  request_limit INTEGER NOT NULL DEFAULT 25,
  PRIMARY KEY (workspace_id, user_id, usage_date)
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Owners can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Members can read workspace membership" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can add themselves" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can manage workspace membership" ON public.workspace_members;

CREATE POLICY "Members can read their workspaces" ON public.workspaces
  FOR SELECT USING (
    owner_id = auth.uid()::text OR public.is_workspace_member(workspaces.id, auth.uid()::text)
  );

CREATE POLICY "Owners can create workspaces" ON public.workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid()::text);

CREATE POLICY "Members can read workspace membership" ON public.workspace_members
  FOR SELECT USING (
    user_id = auth.uid()::text OR public.is_workspace_member(workspace_members.workspace_id, auth.uid()::text)
  );

CREATE POLICY "Workspace owners can add themselves" ON public.workspace_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.workspaces
      WHERE workspaces.id = workspace_members.workspace_id
        AND workspaces.owner_id = auth.uid()::text
    )
  );

CREATE POLICY "Admins can manage workspace membership" ON public.workspace_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (lower(COALESCE(role, '')) LIKE '%admin%' OR lower(COALESCE(role, '')) LIKE '%owner%')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (lower(COALESCE(role, '')) LIKE '%admin%' OR lower(COALESCE(role, '')) LIKE '%owner%')
    )
  );

-- Legacy friend rows are intentionally not used for access. Team membership is the source of truth.

-- Create Channels table (supports categories, group chats, DMs, and starring)
CREATE TABLE IF NOT EXISTS public.channels (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  is_group BOOLEAN DEFAULT FALSE,
  starred_by TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.channels
  ADD COLUMN IF NOT EXISTS workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Enable RLS on channels
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to channels" ON public.channels;
DROP POLICY IF EXISTS "Allow individual insert access to channels" ON public.channels;
DROP POLICY IF EXISTS "Allow individual update access to channels" ON public.channels;

CREATE POLICY "Team members can read channels" ON public.channels
  FOR SELECT USING (
    workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid()::text)
  );

CREATE POLICY "Team members can create channels" ON public.channels
  FOR INSERT WITH CHECK (
    workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid()::text)
  );

CREATE POLICY "Team members can update channels" ON public.channels
  FOR UPDATE USING (
    workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid()::text)
  );

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shared team members can read direct messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Shared team members can send direct messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Senders can edit direct messages" ON public.direct_messages;

CREATE POLICY "Shared team members can read direct messages" ON public.direct_messages
  FOR SELECT USING (
    (sender_id = auth.uid()::text OR receiver_id = auth.uid()::text)
    AND public.users_share_workspace(sender_id, receiver_id)
  );

CREATE POLICY "Shared team members can send direct messages" ON public.direct_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()::text
    AND public.users_share_workspace(sender_id, receiver_id)
  );

CREATE POLICY "Senders can edit direct messages" ON public.direct_messages
  FOR UPDATE USING (sender_id = auth.uid()::text)
  WITH CHECK (sender_id = auth.uid()::text);

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

DROP POLICY IF EXISTS "Allow public read access to channel_messages" ON public.channel_messages;
DROP POLICY IF EXISTS "Allow individual write access to channel_messages" ON public.channel_messages;

CREATE POLICY "Team members can read channel messages" ON public.channel_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.channels
      WHERE channels.id = channel_messages.channel_id
        AND channels.workspace_id IS NOT NULL
        AND public.is_workspace_member(channels.workspace_id, auth.uid()::text)
    )
  );

CREATE POLICY "Team members can write channel messages" ON public.channel_messages
  FOR ALL USING (
    sender_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.channels
      WHERE channels.id = channel_messages.channel_id
        AND channels.workspace_id IS NOT NULL
        AND public.is_workspace_member(channels.workspace_id, auth.uid()::text)
    )
  )
  WITH CHECK (
    sender_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.channels
      WHERE channels.id = channel_messages.channel_id
        AND channels.workspace_id IS NOT NULL
        AND public.is_workspace_member(channels.workspace_id, auth.uid()::text)
    )
  );

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

DROP POLICY IF EXISTS "Allow public read access to reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Allow individual write access to reactions" ON public.message_reactions;

CREATE POLICY "Team members can read reactions" ON public.message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.channel_messages
      JOIN public.channels ON channels.id = channel_messages.channel_id
      WHERE channel_messages.id = message_reactions.message_id
        AND channels.workspace_id IS NOT NULL
        AND public.is_workspace_member(channels.workspace_id, auth.uid()::text)
    )
  );

CREATE POLICY "Team members can write reactions" ON public.message_reactions
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (
    user_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.channel_messages
      JOIN public.channels ON channels.id = channel_messages.channel_id
      WHERE channel_messages.id = message_reactions.message_id
        AND channels.workspace_id IS NOT NULL
        AND public.is_workspace_member(channels.workspace_id, auth.uid()::text)
    )
  );

-- Create Message Reads / Read Receipts table
CREATE TABLE IF NOT EXISTS public.message_reads (
  message_id TEXT REFERENCES public.channel_messages(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (message_id, user_id)
);

-- Enable RLS on message reads
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to message_reads" ON public.message_reads;
DROP POLICY IF EXISTS "Allow individual write access to message_reads" ON public.message_reads;

CREATE POLICY "Team members can read read receipts" ON public.message_reads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.channel_messages
      JOIN public.channels ON channels.id = channel_messages.channel_id
      WHERE channel_messages.id = message_reads.message_id
        AND channels.workspace_id IS NOT NULL
        AND public.is_workspace_member(channels.workspace_id, auth.uid()::text)
    )
  );

CREATE POLICY "Team members can write read receipts" ON public.message_reads
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (
    user_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.channel_messages
      JOIN public.channels ON channels.id = channel_messages.channel_id
      WHERE channel_messages.id = message_reads.message_id
        AND channels.workspace_id IS NOT NULL
        AND public.is_workspace_member(channels.workspace_id, auth.uid()::text)
    )
  );
