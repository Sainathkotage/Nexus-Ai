import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const auth = await createSupabaseServerClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'Invite code is required.' }, { status: 400 });
    }

    // Extract code in case a full URL was pasted/submitted
    let cleanedCode = code.trim();
    if (cleanedCode.includes('/invite/')) {
      const parts = cleanedCode.split('/invite/');
      cleanedCode = parts[parts.length - 1].split('?')[0].split('#')[0];
    } else if (cleanedCode.includes('inviteCode=')) {
      const parts = cleanedCode.split('inviteCode=');
      cleanedCode = parts[parts.length - 1].split('&')[0].split('#')[0];
    } else if (cleanedCode.includes('/') && (cleanedCode.startsWith('http://') || cleanedCode.startsWith('https://') || cleanedCode.split('/').length > 1)) {
      const parts = cleanedCode.split('/');
      cleanedCode = parts[parts.length - 1].split('?')[0].split('#')[0];
    }
    cleanedCode = cleanedCode.toUpperCase();

    if (!cleanedCode) {
      return NextResponse.json({ error: 'Invalid invite code format.' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // 1. Fetch the invite using admin client (bypassing RLS)
    const { data: invite, error: inviteErr } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('code', cleanedCode)
      .single();

    if (inviteErr || !invite) {
      return NextResponse.json({ error: 'Invalid or unrecognized invite code.' }, { status: 404 });
    }

    // 2. Validate invite state
    if (invite.used_at || invite.used_by) {
      return NextResponse.json({ error: 'This invite code has already been used.' }, { status: 400 });
    }
    if (invite.revoked_at) {
      return NextResponse.json({ error: 'This invite code has been revoked.' }, { status: 400 });
    }
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'This invite code has expired.' }, { status: 400 });
    }

    // 3. Insert into workspace_members (bypassing RLS)
    const { error: memberErr } = await supabase.from('workspace_members').insert({
      workspace_id: invite.workspace_id,
      user_id: user.id,
      role: invite.role || 'Member',
      status: 'active',
      added_by: invite.created_by
    });

    if (memberErr && !memberErr.message.includes('duplicate key')) {
      throw memberErr;
    }

    // 4. Update the invite as used (bypassing RLS)
    await supabase
      .from('workspace_invites')
      .update({
        used_by: user.id,
        used_at: new Date().toISOString()
      })
      .eq('id', invite.id);

    // 5. Update user's profile role (bypassing RLS)
    const nextRole = invite.role || 'Member';
    await supabase.from('profiles').update({ role: nextRole }).eq('id', user.id);

    // Auto-confirm the user's email address since they joined via a valid invite code
    try {
      await supabase.auth.admin.updateUserById(user.id, {
        email_confirm: true
      });
    } catch (authConfirmErr) {
      console.warn('Could not auto-confirm user email:', authConfirmErr);
    }

    return NextResponse.json({
      ok: true,
      message: 'Successfully joined the team workspace!',
      workspaceId: invite.workspace_id,
      role: nextRole
    });
  } catch (error) {
    console.error('Join invite API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to join workspace.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
