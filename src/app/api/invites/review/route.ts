import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const auth = await createSupabaseServerClient();
    const { data: { user: reviewer } } = await auth.auth.getUser();
    if (!reviewer) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }

    const { requestId, status } = await req.json();
    if (!requestId || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request body parameters.' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // 1. Fetch the request details
    const { data: joinRequest, error: reqError } = await supabase
      .from('workspace_join_requests')
      .select('*, workspaces(name, owner_id)')
      .eq('id', requestId)
      .single();

    if (reqError || !joinRequest) {
      return NextResponse.json({ error: 'Join request not found.' }, { status: 404 });
    }

    const workspaceId = joinRequest.workspace_id;
    const requesterId = joinRequest.user_id;
    const workspaceName = joinRequest.workspaces?.name || 'Workspace';

    // 2. Verify reviewer is admin or owner
    const { data: reviewerMember } = await supabase
      .from('workspace_members')
      .select('role, status')
      .eq('workspace_id', workspaceId)
      .eq('user_id', reviewer.id)
      .maybeSingle();

    const isWorkspaceAdmin = reviewerMember && ['Admin', 'Owner'].includes(reviewerMember.role) && reviewerMember.status === 'active';
    const isWorkspaceOwner = joinRequest.workspaces?.owner_id === reviewer.id;

    if (!isWorkspaceAdmin && !isWorkspaceOwner) {
      return NextResponse.json({ error: 'Permission denied. Only workspace admins can approve requests.' }, { status: 403 });
    }

    // 3. Process status
    if (status === 'approved') {
      // 3.1. Insert into workspace_members (role: Member)
      const { error: memberErr } = await supabase
        .from('workspace_members')
        .upsert({
          workspace_id: workspaceId,
          user_id: requesterId,
          role: 'Member',
          status: 'active',
          joined_at: new Date().toISOString(),
          added_by: reviewer.id
        });

      if (memberErr) throw memberErr;

      // 3.2. Update profile role to Member
      const { data: requesterProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', requesterId)
        .single();

      if (!requesterProfile || !requesterProfile.role) {
        await supabase
          .from('profiles')
          .update({ role: 'Member' })
          .eq('id', requesterId);
      }

      // 3.3. Update join request status
      await supabase
        .from('workspace_join_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewer.id
        })
        .eq('id', requestId);

      // 3.4. Auto-confirm the user's email address
      try {
        await supabase.auth.admin.updateUserById(requesterId, {
          email_confirm: true
        });
      } catch (authConfirmErr) {
        console.warn('Could not auto-confirm requester email:', authConfirmErr);
      }

      // 3.5. Notify requester
      await supabase.from('notifications').insert({
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        user_id: requesterId,
        title: 'Join Request Approved',
        message: `Your request to join workspace "${workspaceName}" has been approved!`,
        type: 'success',
        read: false,
        created_at: new Date().toISOString()
      });

    } else {
      // status === 'rejected'
      // 3.6. Update join request status
      await supabase
        .from('workspace_join_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewer.id
        })
        .eq('id', requestId);

      // 3.7. Notify requester
      await supabase.from('notifications').insert({
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        user_id: requesterId,
        title: 'Join Request Declined',
        message: `Your request to join workspace "${workspaceName}" was rejected by the administrator.`,
        type: 'error',
        read: false,
        created_at: new Date().toISOString()
      });
    }

    // 4. Mark notifications for this join request as read
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('request_id', requestId);

    return NextResponse.json({
      ok: true,
      message: `Join request has been successfully ${status}.`
    });
  } catch (err: any) {
    console.error('Review join request API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
