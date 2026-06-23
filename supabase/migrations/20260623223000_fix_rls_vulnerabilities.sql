-- 1. Enable RLS and define policies for public.team_messages
ALTER TABLE IF EXISTS public.team_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to read their own team messages" ON public.team_messages;
CREATE POLICY "Allow users to read their own team messages" ON public.team_messages
  FOR SELECT TO authenticated USING (
    auth.uid()::text = sender_id OR auth.uid()::text = receiver_id
  );

DROP POLICY IF EXISTS "Allow users to insert their own team messages" ON public.team_messages;
CREATE POLICY "Allow users to insert their own team messages" ON public.team_messages
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid()::text = sender_id
  );

-- 2. Enable RLS and define policies for other project tables
ALTER TABLE IF EXISTS public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_insights ENABLE ROW LEVEL SECURITY;

-- documents policies
DROP POLICY IF EXISTS "Allow authenticated users access to documents" ON public.documents;
CREATE POLICY "Allow authenticated users access to documents" ON public.documents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- tasks policies
DROP POLICY IF EXISTS "Allow authenticated users access to tasks" ON public.tasks;
CREATE POLICY "Allow authenticated users access to tasks" ON public.tasks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- calendar_events policies
DROP POLICY IF EXISTS "Allow authenticated users access to calendar_events" ON public.calendar_events;
CREATE POLICY "Allow authenticated users access to calendar_events" ON public.calendar_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- emails policies
DROP POLICY IF EXISTS "Allow authenticated users access to emails" ON public.emails;
CREATE POLICY "Allow authenticated users access to emails" ON public.emails
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- conversations policies
DROP POLICY IF EXISTS "Allow authenticated users access to conversations" ON public.conversations;
CREATE POLICY "Allow authenticated users access to conversations" ON public.conversations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- messages policies
DROP POLICY IF EXISTS "Allow authenticated users access to messages" ON public.messages;
CREATE POLICY "Allow authenticated users access to messages" ON public.messages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ai_insights policies
DROP POLICY IF EXISTS "Allow authenticated users access to ai_insights" ON public.ai_insights;
CREATE POLICY "Allow authenticated users access to ai_insights" ON public.ai_insights
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Fix project membership recursion issues by recreating functions and explicitly setting OWNER TO postgres
CREATE OR REPLACE FUNCTION public.is_project_member(project_id_to_check UUID, user_id_to_check UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = project_id_to_check
      AND user_id = user_id_to_check
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER FUNCTION public.is_project_member(UUID, UUID) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.is_project_admin(project_id_to_check UUID, user_id_to_check UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = project_id_to_check
      AND user_id = user_id_to_check
      AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER FUNCTION public.is_project_admin(UUID, UUID) OWNER TO postgres;

-- 4. Recreate project policies to ensure fresh function bindings
DROP POLICY IF EXISTS "Allow project members to read projects" ON public.projects;
CREATE POLICY "Allow project members to read projects" ON public.projects
  FOR SELECT USING (
    public.is_project_member(id, auth.uid())
  );

DROP POLICY IF EXISTS "Allow members to read project membership" ON public.project_members;
CREATE POLICY "Allow members to read project membership" ON public.project_members
  FOR SELECT USING (
    public.is_project_member(project_id, auth.uid())
  );

DROP POLICY IF EXISTS "Allow project admins to manage membership" ON public.project_members;
CREATE POLICY "Allow project admins to manage membership" ON public.project_members
  FOR ALL USING (
    public.is_project_admin(project_id, auth.uid())
  )
  WITH CHECK (
    public.is_project_admin(project_id, auth.uid())
  );

DROP POLICY IF EXISTS "Allow project admins to manage invitations" ON public.invitations;
CREATE POLICY "Allow project admins to manage invitations" ON public.invitations
  FOR ALL USING (
    public.is_project_admin(project_id, auth.uid())
  )
  WITH CHECK (
    public.is_project_admin(project_id, auth.uid())
  );
