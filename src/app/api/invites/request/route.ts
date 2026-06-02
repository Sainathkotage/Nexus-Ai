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

    let cleanedCode = code.trim().toUpperCase();
    if (!cleanedCode) {
      return NextResponse.json({ error: 'Invalid invite code.' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // 1. Find the workspace by invite code
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('id, name, owner_id')
      .eq('invite_code', cleanedCode)
      .single();

    if (wsError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });
    }

    // 2. Check if the user is already a member
    const { data: member, error: memberErr } = await supabase
      .from('workspace_members')
      .select('role, status')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (member && member.status === 'active') {
      return NextResponse.json({ error: 'You are already a member of this workspace.' }, { status: 400 });
    }

    // 3. Check for existing request
    const { data: existingReq, error: reqErr } = await supabase
      .from('workspace_join_requests')
      .select('*')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingReq) {
      if (existingReq.status === 'pending') {
        return NextResponse.json({ error: 'You already have a pending request to join this workspace.' }, { status: 400 });
      } else if (existingReq.status === 'approved') {
        return NextResponse.json({ error: 'Your request has already been approved.' }, { status: 400 });
      } else {
        // If rejected, let them request again by deleting or updating the existing row
        await supabase
          .from('workspace_join_requests')
          .delete()
          .eq('id', existingReq.id);
      }
    }

    // 4. Create join request
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const { data: request, error: insertErr } = await supabase
      .from('workspace_join_requests')
      .insert({
        id: requestId,
        workspace_id: workspace.id,
        user_id: user.id,
        status: 'pending',
        requested_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertErr || !request) {
      throw insertErr || new Error('Failed to insert join request.');
    }

    // 5. Notify all admins/owners of the workspace
    const { data: admins } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspace.id)
      .in('role', ['Admin', 'Owner'])
      .eq('status', 'active');

    const adminIds = new Set((admins || []).map((adm: any) => adm.user_id));
    if (workspace.owner_id) {
      adminIds.add(workspace.owner_id);
    }

    const notificationsToInsert = Array.from(adminIds).map((adminId: string) => ({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: adminId,
      title: 'New Join Request',
      message: `${user.email} is requesting to join workspace "${workspace.name}".`,
      type: 'join_request',
      read: false,
      request_id: requestId,
      created_at: new Date().toISOString()
    }));

    if (notificationsToInsert.length > 0) {
      await supabase.from('notifications').insert(notificationsToInsert);
    }

    return NextResponse.json({
      ok: true,
      message: 'Join request submitted successfully. Waiting for admin approval.',
      request,
      workspaceName: workspace.name
    });
  } catch (err: any) {
    console.error('Request join API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
