import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Allow bypassing user verification in development mode to prevent local cookie/session sync issues
    if (process.env.NODE_ENV !== 'development' && !user) {
      console.warn('[Deepgram API] Unauthorized access attempt (no user session found)');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const key = process.env.DEEPGRAM_API_KEY;
    if (!key) {
      console.error('[Deepgram API] DEEPGRAM_API_KEY environment variable is not defined');
      return NextResponse.json({ error: 'Deepgram API key not configured in .env.local' }, { status: 500 });
    }

    return NextResponse.json({ key });
  } catch (error: any) {
    console.error('[Deepgram API] Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
