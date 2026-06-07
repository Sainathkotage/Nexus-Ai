-- 1. Create tables first to prevent policy references from failing on non-existent tables

-- Create projects table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create project_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(50) DEFAULT 'member', -- admin, member, viewer
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(project_id, user_id)
);

-- Create invitations table if it doesn't exist (with email nullable to support link-based invitations!)
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  email VARCHAR(255), -- NULLABLE to support general invite links!
  role VARCHAR(50) DEFAULT 'member', -- admin, member, viewer
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, expired
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE
);

-- 2. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if any to allow safe re-execution
DROP POLICY IF EXISTS "Allow project members to read projects" ON public.projects;
DROP POLICY IF EXISTS "Allow authenticated users to create projects" ON public.projects;

DROP POLICY IF EXISTS "Allow members to read project membership" ON public.project_members;
DROP POLICY IF EXISTS "Allow project admins to manage membership" ON public.project_members;

DROP POLICY IF EXISTS "Allow read access to invitations by token" ON public.invitations;
DROP POLICY IF EXISTS "Allow project admins to manage invitations" ON public.invitations;

-- 4. Create Row Level Security Policies

-- Create policy to allow members to view projects they belong to
CREATE POLICY "Allow project members to read projects" ON public.projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
    )
  );

-- Create policy to allow creating projects
CREATE POLICY "Allow authenticated users to create projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create policy to allow members to read membership
CREATE POLICY "Allow members to read project membership" ON public.project_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members self
      WHERE self.project_id = project_members.project_id
        AND self.user_id = auth.uid()
    )
  );

-- Create policy to allow admins to manage membership
CREATE POLICY "Allow project admins to manage membership" ON public.project_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.project_members self
      WHERE self.project_id = project_members.project_id
        AND self.user_id = auth.uid()
        AND self.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members self
      WHERE self.project_id = project_members.project_id
        AND self.user_id = auth.uid()
        AND self.role = 'admin'
    )
  );

-- Allow reading invitations (needed to validate before joining)
CREATE POLICY "Allow read access to invitations by token" ON public.invitations
  FOR SELECT USING (true);

-- Allow project admins to manage invitations
CREATE POLICY "Allow project admins to manage invitations" ON public.invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.project_members self
      WHERE self.project_id = invitations.project_id
        AND self.user_id = auth.uid()
        AND self.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members self
      WHERE self.project_id = invitations.project_id
        AND self.user_id = auth.uid()
        AND self.role = 'admin'
    )
  );
