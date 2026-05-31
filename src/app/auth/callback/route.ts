import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const email = data.user.email;
      const domain = email?.split('@')[1]?.toLowerCase();

      if (domain) {
        const admin = createSupabaseAdminClient();
        const { data: org } = await admin
          .from('organizations')
          .select('id, sso_auto_provision, seat_count, plan_id')
          .eq('sso_domain', domain)
          .eq('sso_enabled', true)
          .maybeSingle();

        if (org?.sso_auto_provision) {
          await admin.from('organization_members').upsert(
            {
              organization_id: org.id,
              user_id: data.user.id,
              role: 'member',
              status: 'active',
            },
            { onConflict: 'organization_id,user_id' }
          );

          await admin.from('profiles').upsert({
            id: data.user.id,
            email: email ?? '',
            full_name:
              data.user.user_metadata?.full_name ??
              data.user.user_metadata?.name ??
              email?.split('@')[0],
          });
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=sso_callback_failed`);
}
