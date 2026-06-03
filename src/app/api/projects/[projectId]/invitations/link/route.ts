import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const auth = await createSupabaseServerClient();
    const { data: { user } } = await auth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }

    const { role, expiresIn } = await req.json();

    if (!role) {
      return NextResponse.json({ error: 'Role is required.' }, { status: 400 });
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role selection.' }, { status: 400 });
    }

    // Verify current user is a project member with 'admin' role
    const { data: currentMember, error: memberErr } = await auth
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberErr || !currentMember || currentMember.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Forbidden: You must be a project administrator to generate invite links.' 
      }, { status: 403 });
    }

    // Parse expiresIn (default to 7 days if not parsed correctly)
    let durationMs = 7 * 24 * 60 * 60 * 1000;
    if (expiresIn === '1d') durationMs = 1 * 24 * 60 * 60 * 1000;
    else if (expiresIn === '30d') durationMs = 30 * 24 * 60 * 60 * 1000;

    const token = crypto.randomUUID();
    const expires_at = new Date(Date.now() + durationMs).toISOString();

    // Insert an invitation with NULL email (represents a public/link invite)
    const { data: newInvite, error: inviteErr } = await auth
      .from('invitations')
      .insert({
        project_id: projectId,
        email: null,
        role,
        invited_by: user.id,
        token,
        status: 'pending',
        expires_at
      })
      .select()
      .single();

    if (inviteErr) {
      throw inviteErr;
    }

    return NextResponse.json({
      ok: true,
      token: newInvite.token
    });
  } catch (error: any) {
    console.error('Generate invite link API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
