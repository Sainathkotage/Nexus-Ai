import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Invite code is required.' }, { status: 400 });
    }

    let cleanedCode = code.trim().toUpperCase();
    if (!cleanedCode) {
      return NextResponse.json({ error: 'Invalid invite code.' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select('id, name, slug')
      .eq('invite_code', cleanedCode)
      .single();

    if (error || !workspace) {
      return NextResponse.json({ error: 'Workspace not found for this invite code.' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug
      }
    });
  } catch (err: any) {
    console.error('Details invite API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
