-- Migration: Add tables for GitHub Integration support
-- Path: supabase/migrations/20260630010000_github_integration_tables.sql

-- 1. Create GitHub installations table
CREATE TABLE IF NOT EXISTS public.github_installations (
    id BIGINT PRIMARY KEY, -- GitHub's installation_id
    workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    account_id BIGINT NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_avatar VARCHAR(256),
    repository_selection VARCHAR(32) NOT NULL DEFAULT 'all' CHECK (repository_selection IN ('all', 'selected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create GitHub repositories table
CREATE TABLE IF NOT EXISTS public.github_repositories (
    id BIGINT PRIMARY KEY, -- GitHub's repository_id
    installation_id BIGINT NOT NULL REFERENCES public.github_installations(id) ON DELETE CASCADE,
    workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    default_branch VARCHAR(64) NOT NULL DEFAULT 'main',
    sync_status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'completed', 'failed')),
    last_partial_sync_at TIMESTAMPTZ,
    last_full_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Webhook events table for logging and audit-trailing
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connector_id VARCHAR(64) NOT NULL DEFAULT 'github',
    event_type VARCHAR(128) NOT NULL,
    github_delivery_id UUID UNIQUE,
    payload JSONB NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    error_log TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.github_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- 5. Policies for github_installations
DROP POLICY IF EXISTS "Allow members access to github installations" ON public.github_installations;
CREATE POLICY "Allow members access to github installations" ON public.github_installations
    FOR ALL TO authenticated USING (
        public.is_workspace_member(workspace_id, auth.uid()::text)
    )
    WITH CHECK (
        public.is_workspace_member(workspace_id, auth.uid()::text)
    );

-- 6. Policies for github_repositories
DROP POLICY IF EXISTS "Allow members access to github repositories" ON public.github_repositories;
CREATE POLICY "Allow members access to github repositories" ON public.github_repositories
    FOR ALL TO authenticated USING (
        public.is_workspace_member(workspace_id, auth.uid()::text)
    )
    WITH CHECK (
        public.is_workspace_member(workspace_id, auth.uid()::text)
    );

-- 7. Policies for webhook_events (restricted to service_role)
DROP POLICY IF EXISTS "Block direct webhook event access by clients" ON public.webhook_events;
CREATE POLICY "Block direct webhook event access by clients" ON public.webhook_events
    FOR ALL TO service_role USING (true);

-- 8. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_github_installations_workspace ON public.github_installations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_github_repositories_installation ON public.github_repositories(installation_id);
CREATE INDEX IF NOT EXISTS idx_github_repositories_workspace ON public.github_repositories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON public.webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_delivery_id ON public.webhook_events(github_delivery_id);
