-- SQL schema for profiles and in-app team messages
-- You can run this in your Supabase SQL Editor to support auth synchronization!

-- Create a table for public profiles linked to Auth users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  tag TEXT NOT NULL,
  unique_handle TEXT GENERATED ALWAYS AS (username || '#' || tag) STORED,
  role TEXT,
  avatar TEXT,
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline', 'idle', 'dnd')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS unique_handle TEXT GENERATED ALWAYS AS (username || '#' || tag) STORED;

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Allow individual write access to profiles" ON public.profiles
  FOR ALL USING (auth.uid() = id);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_tag_unique
  ON public.profiles (lower(username), tag);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_unique_handle_unique
  ON public.profiles (lower(unique_handle));

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

CREATE OR REPLACE FUNCTION public.is_workspace_member(workspace_id_to_check TEXT, user_id_to_check TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = workspace_id_to_check
      AND user_id = user_id_to_check
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

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

CREATE POLICY "Admins can manage invites" ON public.workspace_invites
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

CREATE POLICY "Workspace users can read operational logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = audit_logs.workspace_id AND user_id = auth.uid()::text AND status = 'active'
    )
  );

CREATE POLICY "Users can create feedback" ON public.feedback
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can read own AI usage" ON public.ai_usage
  FOR SELECT USING (user_id = auth.uid()::text);

-- Create a trigger to automatically insert a profile row when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  base_username TEXT;
  generated_tag TEXT;
BEGIN
  base_username := COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  generated_tag := COALESCE(new.raw_user_meta_data->>'tag', floor(1000 + random() * 9000)::text);

  WHILE EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(username) = lower(base_username)
      AND tag = generated_tag
  ) LOOP
    generated_tag := floor(1000 + random() * 9000)::text;
  END LOOP;

  INSERT INTO public.profiles (id, email, username, tag, role, status)
  VALUES (
    new.id,
    new.email,
    base_username,
    generated_tag,
    COALESCE(new.raw_user_meta_data->>'role', 'Member'),
    'online'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

-- Create a table for direct messages
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on messages
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

CREATE TABLE IF NOT EXISTS public.team_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on team_messages
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read their own team messages" ON public.team_messages
  FOR SELECT TO authenticated USING (
    auth.uid()::text = sender_id OR auth.uid()::text = receiver_id
  );

CREATE POLICY "Allow users to insert their own team messages" ON public.team_messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid()::text = sender_id
  );

-- Create a table for friend links added with the Name#Number format
CREATE TABLE IF NOT EXISTS public.user_friends (
  user_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  added_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, friend_id)
);

ALTER TABLE public.user_friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read their friend list" ON public.user_friends
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Allow admins to add team members" ON public.user_friends
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (lower(COALESCE(role, '')) LIKE '%admin%' OR lower(COALESCE(role, '')) LIKE '%owner%')
    )
  );

CREATE POLICY "Allow admins to update team members" ON public.user_friends
  FOR UPDATE USING (
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

CREATE POLICY "Allow admins to remove team members" ON public.user_friends
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (lower(COALESCE(role, '')) LIKE '%admin%' OR lower(COALESCE(role, '')) LIKE '%owner%')
    )
  );

-- Create login_activities table
CREATE TABLE IF NOT EXISTS public.login_activities (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_role TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ip_address TEXT,
  device TEXT
);

-- Enable RLS on login_activities
ALTER TABLE public.login_activities ENABLE ROW LEVEL SECURITY;

-- Allow read access to login activities
CREATE POLICY "Allow members to read login activities" ON public.login_activities
  FOR SELECT USING (true);

-- Allow inserting own login activity
CREATE POLICY "Allow individual write access to login_activities" ON public.login_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

