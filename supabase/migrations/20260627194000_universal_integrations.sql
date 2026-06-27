-- Create schema to isolate integrations data
CREATE SCHEMA IF NOT EXISTS integrations;

-- Connector metadata table
CREATE TABLE IF NOT EXISTS integrations.connectors (
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
CREATE TABLE IF NOT EXISTS integrations.workspace_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    connector_id VARCHAR(64) REFERENCES integrations.connectors(id),
    status VARCHAR(32) DEFAULT 'active', -- 'active' | 'suspended' | 'error'
    installed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Encrypted credentials store
CREATE TABLE IF NOT EXISTS integrations.credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID REFERENCES integrations.workspace_integrations(id) ON DELETE CASCADE,
    encrypted_data TEXT NOT NULL, -- AES-256 encrypted OAuth tokens / keys
    iv VARCHAR(32) NOT NULL,
    auth_fields JSONB NOT NULL, -- metadata fields (e.g. scopes, client_id)
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event Workflows
CREATE TABLE IF NOT EXISTS integrations.workflows (
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
CREATE TABLE IF NOT EXISTS integrations.execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES integrations.workflows(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL, -- 'success' | 'failed' | 'running'
    payload JSONB,
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Sync status logs for background indexing
CREATE TABLE IF NOT EXISTS integrations.sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID REFERENCES integrations.workspace_integrations(id) ON DELETE CASCADE,
    job_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) DEFAULT 'pending', -- 'pending' | 'syncing' | 'completed' | 'failed'
    last_synced_at TIMESTAMPTZ,
    error_log TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_integrations_ws ON integrations.workspace_integrations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_credentials_integration ON integrations.credentials(integration_id);
CREATE INDEX IF NOT EXISTS idx_workflows_workspace ON integrations.workflows(workspace_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_workflow ON integrations.execution_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_integration ON integrations.sync_jobs(integration_id);

-- Enable RLS
ALTER TABLE integrations.workspace_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations.execution_logs ENABLE ROW LEVEL SECURITY;

-- workspace_integrations policies
DROP POLICY IF EXISTS "Allow members access to active integrations" ON integrations.workspace_integrations;
CREATE POLICY "Allow members access to active integrations" ON integrations.workspace_integrations
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = workspace_integrations.workspace_id AND member_id = auth.uid()
        )
    );

-- credentials policies (Read/Write restricted to service role only)
DROP POLICY IF EXISTS "Block direct credential access by clients" ON integrations.credentials;
CREATE POLICY "Block direct credential access by clients" ON integrations.credentials
    FOR ALL TO service_role USING (true);

-- workflows policies
DROP POLICY IF EXISTS "Allow members access to workflows" ON integrations.workflows;
CREATE POLICY "Allow members access to workflows" ON integrations.workflows
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = workflows.workspace_id AND member_id = auth.uid()
        )
    );
