-- Connector metadata table
CREATE TABLE IF NOT EXISTS public.connectors (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    category VARCHAR(64) NOT NULL,
    logo_url VARCHAR(256),
    description TEXT,
    auth_type VARCHAR(32) NOT NULL, -- 'oauth2' | 'api_key' | 'basic'
    supported_triggers JSONB DEFAULT '[]',
    supported_actions JSONB DEFAULT '[]',
    health_status VARCHAR(32) DEFAULT 'healthy',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Installed integrations in workspaces
CREATE TABLE IF NOT EXISTS public.workspace_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    connector_id VARCHAR(64) REFERENCES public.connectors(id),
    status VARCHAR(32) DEFAULT 'active', -- 'active' | 'suspended' | 'error'
    installed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Encrypted credentials store
CREATE TABLE IF NOT EXISTS public.credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID REFERENCES public.workspace_integrations(id) ON DELETE CASCADE,
    encrypted_data TEXT NOT NULL, -- AES-256 encrypted OAuth tokens / keys
    iv VARCHAR(32) NOT NULL,
    auth_fields JSONB NOT NULL, -- metadata fields (e.g. scopes, client_id)
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event Workflows
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    trigger_config JSONB NOT NULL, -- { connector_id, event_type, filters }
    actions_config JSONB NOT NULL, -- Array of actions and parameters
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Execution Logs
CREATE TABLE IF NOT EXISTS public.execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL, -- 'success' | 'failed' | 'running'
    payload JSONB,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Sync status logs for background indexing
CREATE TABLE IF NOT EXISTS public.sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID REFERENCES public.workspace_integrations(id) ON DELETE CASCADE,
    job_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) DEFAULT 'pending', -- 'pending' | 'syncing' | 'completed' | 'failed'
    last_synced_at TIMESTAMPTZ,
    error_log TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_integrations_ws ON public.workspace_integrations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_credentials_integration ON public.credentials(integration_id);
CREATE INDEX IF NOT EXISTS idx_workflows_workspace ON public.workflows(workspace_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_workflow ON public.execution_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_integration ON public.sync_jobs(integration_id);

-- Enable RLS
ALTER TABLE public.workspace_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;

-- workspace_integrations policies
DROP POLICY IF EXISTS "Allow members access to active integrations" ON public.workspace_integrations;
CREATE POLICY "Allow members access to active integrations" ON public.workspace_integrations
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = workspace_integrations.workspace_id AND member_id = auth.uid()
        )
    );

-- credentials policies (Read/Write restricted to service role only)
DROP POLICY IF EXISTS "Block direct credential access by clients" ON public.credentials;
CREATE POLICY "Block direct credential access by clients" ON public.credentials
    FOR ALL TO service_role USING (true);

-- workflows policies
DROP POLICY IF EXISTS "Allow members access to workflows" ON public.workflows;
CREATE POLICY "Allow members access to workflows" ON public.workflows
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = workflows.workspace_id AND member_id = auth.uid()
        )
    );

-- Seed connectors metadata
INSERT INTO public.connectors (id, name, category, description, logo_url, auth_type, supported_triggers, supported_actions, health_status)
VALUES 
('slack', 'Slack', 'Communication', 'Post messages, summarize channels, and automatically handle incoming chat events.', 'https://cdn-icons-png.flaticon.com/512/2111/2111615.png', 'oauth2', '["message_received"]'::jsonb, '[{"id":"send_message","name":"Send Channel Message","description":"Sends a chat message to a Slack channel"}]'::jsonb, 'healthy'),
('notion', 'Notion', 'Productivity', 'Synchronize Notion databases, docs, and team wikis into your AI search space.', 'https://cdn.iconscout.com/icon/free/png-256/free-notion-3628994-3030219.png', 'oauth2', '["page_added"]'::jsonb, '[{"id":"create_page","name":"Create Database Page","description":"Creates a new page in a selected Notion database"}]'::jsonb, 'healthy'),
('github', 'GitHub', 'Developer Tools', 'Connect pull requests, issues, commits, and codebase documentation directly to Nexus AI workspace context.', 'https://cdn-icons-png.flaticon.com/512/25/25231.png', 'oauth2', '["push","pull_request","issue_created"]'::jsonb, '[{"id":"create_issue","name":"Create Issue","description":"Creates a new issue in a GitHub repository"}]'::jsonb, 'healthy')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    logo_url = EXCLUDED.logo_url,
    auth_type = EXCLUDED.auth_type,
    supported_triggers = EXCLUDED.supported_triggers,
    supported_actions = EXCLUDED.supported_actions;
