import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const authHeader = req.headers.get('Authorization');
    let user = null;
    let authErr = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data, error } = await supabase.auth.getUser(token);
      user = data?.user;
      authErr = error;
    } else {
      const { data, error } = await supabase.auth.getUser();
      user = data?.user;
      authErr = error;
    }

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createSupabaseAdminClient();
    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteErr) {
      console.error('Failed to delete user from Supabase Auth:', deleteErr);
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    // Clear Supabase session cookies
    const cookieStore = await cookies();
    cookieStore.getAll().forEach((cookie) => {
      if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) {
        cookieStore.delete(cookie.name);
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete Account Route Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
