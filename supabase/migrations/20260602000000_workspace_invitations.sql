-- 1. Add invite_code to public.workspaces table
ALTER TABLE public.workspaces 
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Generate random invite codes for any existing workspaces
UPDATE public.workspaces 
SET invite_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8)) 
WHERE invite_code IS NULL;

-- 2. Create workspace_join_requests table
CREATE TABLE IF NOT EXISTS public.workspace_join_requests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT unique_workspace_user_request UNIQUE (workspace_id, user_id)
);

-- Enable RLS on requests
ALTER TABLE public.workspace_join_requests ENABLE ROW LEVEL SECURITY;

-- Policy: requesters can view/create their own requests
CREATE POLICY "Allow users to view/create their own requests" ON public.workspace_join_requests
  FOR ALL USING (auth.uid() = user_id);

-- Policy: workspace admins/owners can select and update requests
CREATE POLICY "Allow workspace admins to view requests" ON public.workspace_join_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = workspace_join_requests.workspace_id
        AND workspace_members.user_id = auth.uid()::text
        AND workspace_members.role IN ('Admin', 'Owner')
    )
  );

CREATE POLICY "Allow workspace admins to update requests" ON public.workspace_join_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_members.workspace_id = workspace_join_requests.workspace_id
        AND workspace_members.user_id = auth.uid()::text
        AND workspace_members.role IN ('Admin', 'Owner')
    )
  );

-- 3. Create public.notifications table for real-time alerts
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'join_request')),
  read BOOLEAN NOT NULL DEFAULT false,
  request_id TEXT, -- References the workspace join request ID for inline approvals
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: users can select/update/delete their own notifications
CREATE POLICY "Allow users to manage their own notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);
