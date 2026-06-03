import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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

    // 1. Fetch all members of the project
    const { data: members, error: membersErr } = await auth
      .from('project_members')
      .select('*')
      .eq('project_id', projectId);

    if (membersErr) {
      throw membersErr;
    }

    if (!members || members.length === 0) {
      return NextResponse.json({ ok: true, members: [] });
    }

    // 2. Fetch profiles for these users to get names, emails, and avatars
    const userIds = members.map(m => m.user_id);
    const { data: profiles, error: profilesErr } = await auth
      .from('profiles')
      .select('id, email, username, avatar')
      .in('id', userIds);

    if (profilesErr) {
      console.warn('Could not load user profiles:', profilesErr);
    }

    // 3. Merge profiles data into members list
    const membersWithProfiles = members.map(member => {
      const profile = profiles?.find(p => p.id === member.user_id);
      return {
        id: member.id,
        role: member.role,
        joined_at: member.joined_at,
        user_id: member.user_id,
        user: profile ? {
          id: profile.id,
          email: profile.email,
          name: profile.username,
          avatar: profile.avatar
        } : {
          id: member.user_id,
          email: '',
          name: 'Teammate',
          avatar: null
        }
      };
    });

    return NextResponse.json({
      ok: true,
      members: membersWithProfiles
    });
  } catch (error: any) {
    console.error('Get project members API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
