-- Enterprise organizations, billing (Stripe), and SSO for Nexus AI
-- Run in Supabase SQL Editor or via: supabase db push

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  owner_id uuid references auth.users (id) on delete set null,
  plan_id text not null default 'starter' check (plan_id in ('starter', 'team_pro', 'enterprise')),
  seat_count int not null default 1 check (seat_count >= 1),
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
  billing_status text default 'inactive',
  razorpay_customer_id text,
  razorpay_subscription_id text unique,
  sso_enabled boolean not null default false,
  sso_provider text default 'google_workspace',
  sso_domain text,
  sso_metadata_url text,
  sso_auto_provision boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists idx_organizations_sso_domain
  on public.organizations (sso_domain)
  where sso_enabled = true;

create index if not exists idx_org_members_org
  on public.organization_members (organization_id);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create policy "Members can read their organization"
  on public.organizations for select
  using (
    id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
    )
  );

create policy "Admins can update organization"
  on public.organizations for update
  using (
    id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and role in ('admin', 'owner')
    )
  );

create policy "Members can read org membership"
  on public.organization_members for select
  using (
    organization_id in (
      select organization_id from public.organization_members om
      where om.user_id = auth.uid()
    )
  );

-- Service role bypasses RLS for Stripe webhooks (use service key server-side only)
