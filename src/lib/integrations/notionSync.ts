import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { CredentialVault } from './vault';

export async function syncWorkspaceNotionContext(workspaceId: string): Promise<{ success: boolean; docsSynced: number }> {
  const supabase = createSupabaseAdminClient();
  const timestamp = new Date().toISOString();

  // 1. Fetch notion integration
  const { data: integration } = await supabase
    .from('workspace_integrations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('connector_id', 'notion')
    .eq('status', 'active')
    .maybeSingle();

  if (!integration) {
    return { success: true, docsSynced: 0 };
  }

  // 2. Fetch credentials
  const { data: credential } = await supabase
    .from('credentials')
    .select('*')
    .eq('integration_id', integration.id)
    .maybeSingle();

  if (!credential) {
    return { success: true, docsSynced: 0 };
  }

  let accessToken = '';
  try {
    const decrypted = CredentialVault.decrypt(credential.encrypted_data, credential.iv);
    const parsed = JSON.parse(decrypted);
    accessToken = parsed.access_token || parsed.accessToken || decrypted;
  } catch (e) {
    console.error('[NotionSync] Decryption failed:', e);
    return { success: false, docsSynced: 0 };
  }

  if (!accessToken) {
    return { success: true, docsSynced: 0 };
  }

  try {
    // 3. Search Notion pages
    const searchRes = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: { value: 'page', property: 'object' },
        page_size: 10
      })
    });

    if (!searchRes.ok) {
      throw new Error(`Notion search failed: ${searchRes.statusText}`);
    }

    const searchData = await searchRes.json();
    const pages = searchData.results || [];
    let docsSynced = 0;

    for (const page of pages) {
      // Extract title
      let title = 'Untitled Notion Page';
      const properties = page.properties || {};
      
      const titleProp = properties.title || properties.Name || Object.values(properties).find((p: any) => p.type === 'title');
      if (titleProp && titleProp.title && titleProp.title.length > 0) {
        title = titleProp.title.map((t: any) => t.plain_text).join('');
      }

      // Fetch page blocks to build page content
      let content = `Notion Page: ${title}\nURL: ${page.url || ''}\n\n`;
      try {
        const blocksRes = await fetch(`https://api.notion.com/v1/blocks/${page.id}/children?page_size=50`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Notion-Version': '2022-06-28'
          }
        });
        if (blocksRes.ok) {
          const blocksData = await blocksRes.json();
          const blocks = blocksData.results || [];
          for (const block of blocks) {
            const type = block.type;
            const blockContent = block[type];
            if (blockContent && blockContent.rich_text && blockContent.rich_text.length > 0) {
              const text = blockContent.rich_text.map((rt: any) => rt.plain_text).join('');
              content += `${text}\n`;
            }
          }
        }
      } catch (e) {
        console.warn(`[NotionSync] Failed to fetch blocks for page ${page.id}:`, e);
      }

      // Upsert into public.documents table
      const { error: docErr } = await supabase
        .from('documents')
        .upsert({
          id: `notion-page-${page.id}`,
          title: `Notion: ${title}`,
          type: 'txt',
          size: `${Math.round(content.length / 1024 * 10) / 10} KB`,
          summary: `Notion page synced from workspace: ${title}`,
          content: content,
          tags: ['notion', 'page', 'sync'],
          key_points: [title],
          extracted_tasks: [],
          uploaded_at: timestamp,
          processing_status: 'completed',
          workspace_id: workspaceId
        });

      if (!docErr) docsSynced++;
    }

    return { success: true, docsSynced };
  } catch (err: any) {
    console.error('[NotionSync] Sync error:', err);
    return { success: false, docsSynced: 0 };
  }
}
