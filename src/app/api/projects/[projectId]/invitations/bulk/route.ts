import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { invitationService } from '@/lib/services/invitationService';

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

    // 1. Verify inviting user is an admin
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

    const { invitations } = await req.json();

    if (!invitations || !Array.isArray(invitations) || invitations.length === 0) {
      return NextResponse.json({ error: 'Invitations array is empty or invalid.' }, { status: 400 });
    }

    const successes: { email: string; role: string }[] = [];
    const failures: { email: string; error: string }[] = [];

    // 2. Process each invitation
    for (const invite of invitations) {
      const email = invite.email?.trim();
      const role = invite.role?.trim().toLowerCase();
      const message = invite.message?.trim() || '';

      if (!email || !role) {
        failures.push({ email: email || 'Unknown', error: 'Email and role are required.' });
        continue;
      }

      if (!['admin', 'member', 'viewer'].includes(role)) {
        failures.push({ email, error: 'Invalid role selection.' });
        continue;
      }

      // Check if user is already a member
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
          failures.push({ email, error: 'This user is already a member of this project.' });
          continue;
        }
      }

      // Check for active pending invitation for this email
      const { data: existingInvite } = await auth
        .from('invitations')
        .select('id, expires_at')
        .eq('project_id', projectId)
        .eq('email', email)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInvite && new Date(existingInvite.expires_at).getTime() > Date.now()) {
        failures.push({ email, error: 'A pending invitation has already been sent to this email.' });
        continue;
      }

      try {
        // Delegate to invitationService to create invitation row and send email
        await invitationService.createInvitation(projectId, user.id, {
          email,
          role,
          message
        });

        successes.push({ email, role });
      } catch (err: any) {
        failures.push({ email, error: err.message || 'Failed to generate invitation.' });
      }
    }

    return NextResponse.json({
      ok: true,
      successes,
      failures,
      message: `Successfully processed bulk invitations: ${successes.length} succeeded, ${failures.length} failed.`
    });
  } catch (error: any) {
    console.error('Bulk invite API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
