import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const auth = await createSupabaseServerClient();
    const { data: { user } } = await auth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();

    // 1. Fetch invitation
    const { data: invite, error: inviteErr } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (inviteErr || !invite) {
      return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
    }

    if (invite.status !== 'pending') {
      return NextResponse.json({ error: `This invitation has already been ${invite.status}.` }, { status: 400 });
    }

    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'This invitation has expired.' }, { status: 400 });
    }

    // 2. If it is an email-based invitation, verify the user's email matches
    if (invite.email && invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json({ 
        error: 'Forbidden: This invitation was sent to a different email address.' 
      }, { status: 403 });
    }

    // 3. Check if they are already in the project
    const { data: existingMember } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', invite.project_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMember) {
      // Auto-update invitation status so it doesn't stay pending
      await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invite.id);

      return NextResponse.json({
        ok: true,
        message: 'You are already a member of this project.',
        projectId: invite.project_id
      });
    }

    // 4. Insert into project_members
    const { error: memberErr } = await supabase
      .from('project_members')
      .insert({
        project_id: invite.project_id,
        user_id: user.id,
        role: invite.role || 'member'
      });

    if (memberErr) {
      throw memberErr;
    }

    // 5. Update invitations status
    const { error: updateErr } = await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invite.id);

    if (updateErr) {
      throw updateErr;
    }

    return NextResponse.json({
      ok: true,
      message: 'Successfully joined the project team!',
      projectId: invite.project_id
    });
  } catch (error: any) {
    console.error('Accept invitation API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
