import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = createSupabaseAdminClient(); // Bypassing RLS for public validation queries

    const { data: invite, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (error || !invite) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    }

    if (invite.status !== 'pending') {
      return NextResponse.json({ error: `Invitation has already been ${invite.status}.` }, { status: 400 });
    }

    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Invitation has expired.' }, { status: 400 });
    }

    // Load project details
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', invite.project_id)
      .maybeSingle();

    // Load inviter details
    let inviterDetails = { name: 'Teammate', email: '' };
    if (invite.invited_by) {
      const { data: inviter } = await supabase
        .from('profiles')
        .select('username, email')
        .eq('id', invite.invited_by)
        .maybeSingle();

      if (inviter) {
        inviterDetails = { name: inviter.username, email: inviter.email };
      }
    }

    return NextResponse.json({
      ok: true,
      invitation: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        project: {
          id: invite.project_id,
          name: project?.name || 'Project Name'
        },
        invited_by: inviterDetails
      }
    });
  } catch (error: any) {
    console.error('Validate invitation API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const invitationId = (await params).token; // In the DELETE context, the dynamic parameter represents the invitation ID
    const auth = await createSupabaseServerClient();
    const { data: { user } } = await auth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();

    // 1. Fetch invitation to check project_id
    const { data: invite, error: inviteErr } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .maybeSingle();

    if (inviteErr || !invite) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    }

    // 2. Verify current user is a project member with 'admin' role
    const { data: currentMember, error: memberErr } = await auth
      .from('project_members')
      .select('role')
      .eq('project_id', invite.project_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberErr || !currentMember || currentMember.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Forbidden: Only project administrators can revoke invitations.' 
      }, { status: 403 });
    }

    // 3. Delete/revoke invitation
    const { error: deleteErr } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invite.id);

    if (deleteErr) {
      throw deleteErr;
    }

    return NextResponse.json({
      ok: true,
      message: 'Invitation revoked successfully.'
    });
  } catch (error: any) {
    console.error('Revoke invitation API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
