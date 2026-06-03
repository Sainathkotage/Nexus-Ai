import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
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

    const admin = createSupabaseAdminClient();

    // 1. Check if this is a general workspace-wide invite code
    const { data: workspace, error: wsErr } = await admin
      .from('workspaces')
      .select('id, owner_id')
      .eq('invite_code', cleanedCode)
      .maybeSingle();

    let targetWorkspaceId: string;
    let targetRole = 'Member';
    let addedBy: string | null = null;
    let inviteIdToUpdate: string | null = null;

    if (workspace) {
      targetWorkspaceId = workspace.id;
      addedBy = workspace.owner_id;
    } else {
      // 2. Fetch the individual invite using admin client (bypassing RLS)
      const { data: invite, error: inviteErr } = await admin
        .from('workspace_invites')
        .select('*')
        .eq('code', cleanedCode)
        .single();

      if (inviteErr || !invite) {
        return NextResponse.json({ error: 'Invalid or unrecognized invite code.' }, { status: 404 });
      }

      // 3. Validate invite state
      if (invite.used_at || invite.used_by) {
        return NextResponse.json({ error: 'This invite code has already been used.' }, { status: 400 });
      }
      if (invite.revoked_at) {
        return NextResponse.json({ error: 'This invite code has been revoked.' }, { status: 400 });
      }
      if (new Date(invite.expires_at).getTime() < Date.now()) {
        return NextResponse.json({ error: 'This invite code has expired.' }, { status: 400 });
      }

      targetWorkspaceId = invite.workspace_id;
      targetRole = invite.role || 'Member';
      addedBy = invite.created_by;
      inviteIdToUpdate = invite.id;
    }

    // 4. Generate guest credentials
    const rand = Math.floor(1000 + Math.random() * 9000);
    const guestEmail = `guest_${Date.now()}_${rand}@nexus-ai.com`;
    const guestPassword = `GuestPass_${rand}_${Date.now()}!`;
    const guestUsername = `Guest_${rand}`;
    const guestTag = rand.toString();
    const guestRole = targetRole;

    // 5. Create user with admin client (confirms email automatically)
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: guestEmail,
      password: guestPassword,
      email_confirm: true,
      user_metadata: {
        username: guestUsername,
        tag: guestTag,
        role: guestRole
      }
    });

    if (authErr || !authData.user) {
      throw authErr || new Error('Failed to create guest user');
    }

    const guestUserId = authData.user.id;

    // 6. Insert profile row manually (bypassing RLS)
    // Note: The DB trigger handle_new_user might run, but let's make sure it is updated/overwritten or runs.
    const { error: profileErr } = await admin.from('profiles').upsert({
      id: guestUserId,
      email: guestEmail,
      username: guestUsername,
      tag: guestTag,
      role: guestRole,
      status: 'online'
    });

    if (profileErr) {
      console.warn('Admin profile upsert warning:', profileErr.message);
    }

    // 7. Insert into workspace_members (bypassing RLS)
    const { error: memberErr } = await admin.from('workspace_members').insert({
      workspace_id: targetWorkspaceId,
      user_id: guestUserId,
      role: guestRole,
      status: 'active',
      added_by: addedBy
    });

    if (memberErr) {
      throw memberErr;
    }

    // 8. Update the invite as used (bypassing RLS) if it's an individual invite
    if (inviteIdToUpdate) {
      await admin
        .from('workspace_invites')
        .update({
          used_by: guestUserId,
          used_at: new Date().toISOString()
        })
        .eq('id', inviteIdToUpdate);
    }

    return NextResponse.json({
      ok: true,
      email: guestEmail,
      password: guestPassword,
      message: 'Guest account created and workspace joined!'
    });
  } catch (error) {
    console.error('Guest invite API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to auto-join workspace.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
