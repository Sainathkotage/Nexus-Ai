import { createSupabaseAdminClient } from '@/lib/supabase/server';

export const ADMIN_ROLE_PATTERN = /(admin|owner)/i;

export function isAdminRole(role?: string | null) {
  return ADMIN_ROLE_PATTERN.test(role || '');
}

export async function getServerProfile(userId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data;
}

export async function canManageWorkspaceMembers(userId: string) {
  const profile = await getServerProfile(userId);
  return isAdminRole(profile?.role);
}

export async function canViewDocument(userId: string, documentId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('document_permissions')
    .select('id')
    .eq('document_id', documentId)
    .or(`user_id.eq.${userId},access_level.eq.workspace`)
    .limit(1);

  if (error) return false;
  return (data || []).length > 0;
}

export async function getTodayAiUsage(userId: string, workspaceId: string) {
  const supabase = createSupabaseAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('ai_usage')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('usage_date', today)
    .single();

  return data || null;
}
