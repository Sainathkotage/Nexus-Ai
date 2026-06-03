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

    const { email, role, message } = await req.json();

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required.' }, { status: 400 });
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role selection.' }, { status: 400 });
    }

    // 1. Verify that the current user is a project member with 'admin' role
    const { data: currentMember, error: memberErr } = await auth
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberErr || !currentMember || currentMember.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Forbidden: You must be a project administrator to invite teammates.' 
      }, { status: 403 });
    }

    // 2. Check if the user being invited is already a member
    const { data: invitedProfile } = await auth
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (invitedProfile) {
      const { data: existingMember } = await auth
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', invitedProfile.id)
        .maybeSingle();

      if (existingMember) {
        return NextResponse.json({ error: 'This user is already a member of the project.' }, { status: 400 });
      }
    }

    // 3. Check for active pending invitation for this email
    const { data: existingInvite } = await auth
      .from('invitations')
      .select('id, expires_at')
      .eq('project_id', projectId)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite && new Date(existingInvite.expires_at).getTime() > Date.now()) {
      return NextResponse.json({ error: 'A pending invitation has already been sent to this email.' }, { status: 400 });
    }

    // 4. Generate token and expires_at (7 days)
    const token = crypto.randomUUID();
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: newInvite, error: inviteErr } = await auth
      .from('invitations')
      .insert({
        project_id: projectId,
        email,
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
      message: 'Invitation sent successfully.',
      invitation: newInvite
    });
  } catch (error: any) {
    console.error('Send invitation API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
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

    // Verify current user is a project member
    const { data: isMember } = await auth
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden: You are not a member of this project.' }, { status: 403 });
    }

    // List all pending invitations
    const { data: invitations, error: inviteErr } = await auth
      .from('invitations')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'pending');

    if (inviteErr) {
      throw inviteErr;
    }

    return NextResponse.json({
      ok: true,
      invitations
    });
  } catch (error: any) {
    console.error('Get invitations API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
