import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { canManageWorkspaceMembers, isAdminRole } from '@/lib/permissions';

export async function POST(req: Request) {
  try {
    const auth = await createSupabaseServerClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }

    const { workspaceId, email, role = 'Member' } = await req.json();
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required.' }, { status: 400 });
    }

    const allowed = await canManageWorkspaceMembers(user.id);
    if (!allowed) {
      return NextResponse.json({ error: 'Only admins can create invites.' }, { status: 403 });
    }

    const supabase = createSupabaseAdminClient();
    const code = Math.random().toString(36).slice(2, 10).toUpperCase();
    const invite = {
      id: `invite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      workspace_id: workspaceId,
      code,
      email: email || null,
      role: isAdminRole(role) ? 'Member' : role,
      created_by: user.id,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const { error } = await supabase.from('workspace_invites').insert(invite);
    if (error) throw error;

    const origin = new URL(req.url).origin;
    return NextResponse.json({ invite, url: `${origin}/invite/${code}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create invite.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
