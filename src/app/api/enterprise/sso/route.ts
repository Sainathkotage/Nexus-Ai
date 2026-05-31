import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { parseSsoProvider, type SsoProvider } from '@/lib/enterprise/sso';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain')?.trim().toLowerCase();
  const providerParam = searchParams.get('provider');

  if (!domain) {
    return NextResponse.json({ error: 'domain query parameter is required' }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: org } = await admin
    .from('organizations')
    .select('id, name, sso_enabled, sso_provider, sso_domain, sso_metadata_url, sso_auto_provision')
    .eq('sso_domain', domain)
    .eq('sso_enabled', true)
    .maybeSingle();

  if (!org) {
    return NextResponse.json(
      { error: 'No SSO configuration found for this domain' },
      { status: 404 }
    );
  }

  const provider: SsoProvider =
    (providerParam as SsoProvider) ||
    parseSsoProvider(org.sso_provider ?? 'google_workspace');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
  const callbackUrl = `${appUrl}/auth/callback`;

  if (provider === 'saml' || provider === 'google_workspace') {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabase.auth.signInWithSSO({
      domain: org.sso_domain ?? domain,
      options: { redirectTo: callbackUrl },
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (data?.url) {
      return NextResponse.redirect(data.url);
    }
  }

  if (provider === 'azure_ad') {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: { redirectTo: callbackUrl },
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (data?.url) {
      return NextResponse.redirect(data.url);
    }
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl,
      queryParams: { hd: org.sso_domain ?? domain },
    },
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (data?.url) {
    return NextResponse.redirect(data.url);
  }

  return NextResponse.json(
    { error: 'SSO could not be initiated. Configure providers in Supabase Dashboard.' },
    { status: 503 }
  );
}

export async function PUT(request: Request) {
  const body = await request.json();
  const {
    organizationId,
    enabled,
    provider,
    domain,
    metadataUrl,
    autoProvision,
  } = body;

  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
  }

  const { createSupabaseServerClient } = await import('@/lib/supabase/server');
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: membership } = await admin
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership || !['admin', 'owner'].includes(membership.role)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  const { error } = await admin
    .from('organizations')
    .update({
      sso_enabled: Boolean(enabled),
      sso_provider: provider ?? 'google_workspace',
      sso_domain: domain?.replace(/^@/, '').toLowerCase(),
      sso_metadata_url: metadataUrl ?? null,
      sso_auto_provision: autoProvision !== false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
