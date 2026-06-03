import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { invitationService } from '@/lib/services/invitationService';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Check if user is logged in
    const auth = await createSupabaseServerClient();
    const { data: { user } } = await auth.auth.getUser();
    
    let loggedInUserId = user?.id;
    let fullName = '';
    let username = '';
    let password = '';
    let avatarFile: File | null = null;
    let avatarUrl = '';

    // If user is not logged in, read onboarding credentials from request body
    if (!loggedInUserId) {
      const contentType = req.headers.get('content-type') || '';
      
      if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        fullName = String(formData.get('fullName') || '');
        username = String(formData.get('username') || '');
        password = String(formData.get('password') || '');
        avatarFile = formData.get('avatar') as File | null;
      } else {
        const body = await req.json().catch(() => ({}));
        fullName = body.fullName || '';
        username = body.username || '';
        password = body.password || '';
        avatarUrl = body.avatarUrl || '';
      }

      // Handle avatar file upload if present
      if (avatarFile) {
        const supabaseAdmin = createSupabaseAdminClient();
        const fileName = `${Date.now()}-${avatarFile.name}`;
        
        try {
          await supabaseAdmin.storage.createBucket('avatars', { public: true });
        } catch (_) {}

        const buffer = await avatarFile.arrayBuffer();
        const { error: storageErr } = await supabaseAdmin.storage
          .from('avatars')
          .upload(fileName, Buffer.from(buffer), {
            contentType: avatarFile.type,
            upsert: true
          });

        if (!storageErr) {
          const { data: { publicUrl } } = supabaseAdmin.storage
            .from('avatars')
            .getPublicUrl(fileName);
          avatarUrl = publicUrl;
        } else {
          console.warn('Could not upload avatar image:', storageErr);
        }
      }
    }

    const result = await invitationService.acceptInvitation(
      token, 
      !loggedInUserId ? { fullName, username, password, avatarUrl } : undefined,
      loggedInUserId
    );

    return NextResponse.json({
      ok: true,
      message: 'Successfully joined the project team!',
      projectId: result.projectId,
      userId: result.userId
    });
  } catch (error: any) {
    console.error('Accept invitation API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
