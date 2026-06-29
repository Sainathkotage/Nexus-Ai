import { createSupabaseAdminClient } from '@/lib/supabase/server';
import https from 'https';
import { URL } from 'url';

async function downloadFileWithHttps(url: string, token: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isSlackDomain = parsedUrl.hostname.endsWith('slack.com');
    const options: https.RequestOptions = {};
    if (isSlackDomain) {
      options.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    https.get(url, options, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          downloadFileWithHttps(redirectUrl, token).then(resolve).catch(reject);
          return;
        }
      }
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        reject(new Error(`Failed to download file, status: ${res.statusCode}`));
        return;
      }
      const data: Buffer[] = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', (err) => reject(err));
  });
}


export interface SlackWebhookPayload {
  client_msg_id?: string;
  type: string;
  text: string;
  user: string;
  ts: string;
  channel: string;
  event_ts?: string;
  channel_type?: string;
}

export interface JiraIssuePayload {
  key: string;
  fields: {
    summary: string;
    description?: string;
    status: {
      name: string;
    };
    priority: {
      name: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
    } | null;
  };
}

/**
 * Maps a Slack user ID to a registered user profile in the workspace.
 * Fallbacks to the first active workspace member if no exact match is found.
 */
export async function mapSlackUserToProfile(slackUserId: string, workspaceId: string, botToken?: string) {
  const supabase = createSupabaseAdminClient();
  
  let token = botToken;
  if (!token) {
    // Attempt to load token from credentials table
    try {
      const { data: integrations } = await supabase
        .from('workspace_integrations')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('connector_id', 'slack')
        .eq('status', 'active')
        .limit(1);
      
      const integrationId = integrations?.[0]?.id;
      if (integrationId) {
        const { data: dbCreds } = await supabase
          .from('credentials')
          .select('encrypted_data, iv')
          .eq('integration_id', integrationId)
          .limit(1);
        const credential = dbCreds?.[0];
        if (credential && credential.encrypted_data && credential.iv) {
          const { CredentialVault } = await import('@/lib/integrations/vault');
          const decrypted = CredentialVault.decrypt(credential.encrypted_data, credential.iv);
          const parsed = JSON.parse(decrypted);
          token = parsed.access_token || parsed.authed_user?.access_token || decrypted;
        }
      }
    } catch (e) {
      console.warn('[contextNormalizer] Failed to load Slack credentials for mapping:', e);
    }
  }

  if (!token) {
    token = process.env.SLACK_BOT_TOKEN || '';
  }

  // Attempt to fetch email and name from Slack API
  if (token && slackUserId && slackUserId.startsWith('U')) {
    try {
      const response = await fetch(`https://slack.com/api/users.info?user=${slackUserId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.ok && data.user) {
        const email = data.user.profile?.email;
        const realName = data.user.profile?.real_name || data.user.real_name;
        const userName = data.user.name;

        // Try exact email match first
        if (email) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .maybeSingle();
          if (profile) return profile;
        }

        // Try username match second
        if (userName) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', userName)
            .maybeSingle();
          if (profile) return profile;
        }

        // Try real name match third
        if (realName) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .ilike('username', `%${realName}%`);
          if (profiles && profiles.length > 0) return profiles[0];
        }
      }
    } catch (err) {
      console.error('[contextNormalizer] Slack users.info mapping failed:', err);
    }
  }

  // 1. Direct match by username or email (fallback)
  const { data: profileByUsername } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', slackUserId)
    .single();
    
  if (profileByUsername) {
    return profileByUsername;
  }

  // 2. Get workspace members to check for mapping fallbacks
  const { data: members } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active');

  if (members && members.length > 0) {
    const userIds = members.map(m => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    if (profiles && profiles.length > 0) {
      const matched = profiles.find(p => p.username.toLowerCase() === slackUserId.toLowerCase());
      return matched || profiles[0];
    }
  }
  
  return null;
}

/**
 * Normalizes a Slack message payload and registers it as a document
 * and edge relations in the database.
 */
export async function normalizeSlackMessage(event: SlackWebhookPayload, workspaceId: string, botToken?: string) {
  const supabase = createSupabaseAdminClient();
  const timestamp = new Date().toISOString();
  
  // 1. Resolve sender profile
  const profile = await mapSlackUserToProfile(event.user, workspaceId, botToken);
  const uploader = profile ? {
    id: profile.id,
    name: profile.username,
    email: profile.email,
    avatar: profile.avatar || '',
    role: profile.role || 'Member',
    visibility: 'shared'
  } : {
    id: 'slack-system',
    name: 'Slack System',
    email: '',
    avatar: '',
    role: 'Member',
    visibility: 'shared'
  };

  const docId = `slack-msg-${event.client_msg_id || event.ts}`;
  const title = `Slack Message in ${event.channel}`;
  const textContent = event.text || '';

  // 2. Save the message as a document context object
  const docPayload = {
    id: docId,
    title,
    type: 'txt',
    size: `${(textContent.length / 1024).toFixed(2)} KB`,
    summary: textContent,
    content: textContent,
    tags: ['slack', 'message', 'discussion'],
    key_points: [],
    extracted_tasks: [],
    extracted_people: [uploader.name.toUpperCase()],
    extracted_organizations: [],
    uploaded_at: timestamp,
    processing_status: 'completed',
    uploaded_by: { ...uploader, workspaceId }
  };

  let { error: docErr } = await supabase
    .from('documents')
    .insert({ ...docPayload, workspace_id: workspaceId });

  if (docErr && docErr.message?.includes('workspace_id')) {
    const { error: fallbackErr } = await supabase
      .from('documents')
      .insert(docPayload);
    docErr = fallbackErr;
  }

  if (docErr) {
    console.error('[contextNormalizer] Slack document ingestion error:', docErr);
  }

  // 3. Scan Slack text for ticket mentions (e.g. NEX-45)
  const ticketRegex = /[A-Z]+-[0-9]+/g;
  const ticketMentions = textContent.match(ticketRegex) || [];
  const uniqueTickets = Array.from(new Set(ticketMentions));

  for (const ticket of uniqueTickets) {
    const relationPayload = {
      workspace_id: workspaceId,
      source_entity_id: docId,
      target_entity_id: `jira-${ticket.toLowerCase()}`,
      relation_type: 'DISCUSSES',
      confidence: 1.0
    };

    const { error: relErr } = await supabase
      .from('entity_relations')
      .insert(relationPayload);

    if (relErr) {
      console.error('[contextNormalizer] Failed to insert Slack-Jira entity relation:', relErr);
    }
  }

  return docPayload;
}

/**
 * Normalizes a Jira issue payload and registers it as a document 
 * and edge relations in the database.
 */
export async function normalizeJiraIssue(issue: JiraIssuePayload, workspaceId: string) {
  const supabase = createSupabaseAdminClient();
  const timestamp = new Date().toISOString();

  const key = issue.key;
  const fields = issue.fields;
  const docId = `jira-${key.toLowerCase()}`;
  const title = `Jira: ${key} - ${fields.summary}`;
  const content = `Jira Issue: ${key}
Summary: ${fields.summary}
Description: ${fields.description || 'No description'}
Status: ${fields.status?.name || 'Unknown'}
Priority: ${fields.priority?.name || 'Medium'}
Assignee: ${fields.assignee ? fields.assignee.displayName : 'Unassigned'}`;

  // 1. Ingest Jira ticket as a document
  const docPayload = {
    id: docId,
    title,
    type: 'txt',
    size: `${(content.length / 1024).toFixed(2)} KB`,
    summary: fields.description || fields.summary,
    content,
    tags: ['jira', 'issue', fields.status?.name?.toLowerCase()].filter(Boolean),
    key_points: [
      `Status is ${fields.status?.name}`,
      `Priority is ${fields.priority?.name}`,
      `Assignee: ${fields.assignee ? fields.assignee.displayName : 'None'}`
    ],
    extracted_tasks: [],
    extracted_people: fields.assignee ? [fields.assignee.displayName.toUpperCase()] : [],
    extracted_organizations: ['Atlassian'],
    uploaded_at: timestamp,
    processing_status: 'completed',
    uploaded_by: { id: 'jira-connector', name: 'Jira Sync', email: '', avatar: '', role: 'Member', visibility: 'shared', workspaceId }
  };

  let { error: docErr } = await supabase
    .from('documents')
    .insert({ ...docPayload, workspace_id: workspaceId });

  if (docErr && docErr.message?.includes('workspace_id')) {
    const { error: fallbackErr } = await supabase
      .from('documents')
      .insert(docPayload);
    docErr = fallbackErr;
  }

  if (docErr) {
    console.error('[contextNormalizer] Jira document ingestion error:', docErr);
  }

  // 2. Map assignee to system user and construct relation edge
  if (fields.assignee && fields.assignee.emailAddress) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', fields.assignee.emailAddress)
      .single();

    if (profile) {
      const relationPayload = {
        workspace_id: workspaceId,
        source_entity_id: docId,
        target_entity_id: `user-${profile.id}`,
        relation_type: 'ASSIGNED_TO',
        confidence: 1.0
      };

      const { error: relErr } = await supabase
        .from('entity_relations')
        .insert(relationPayload);

      if (relErr) {
        console.error('[contextNormalizer] Failed to insert Jira-Assignee relation:', relErr);
      }
    }
  }

  return docPayload;
}

/**
 * Downloads a shared file from Slack and uploads it to Supabase Storage,
 * registering it as a document context object.
 */
export async function normalizeSlackFile(
  event: { file_id: string; user_id: string; file?: { id: string } },
  workspaceId: string,
  accessToken: string
) {
  const supabase = createSupabaseAdminClient();
  const timestamp = new Date().toISOString();
  const fileId = event.file_id || (event.file && event.file.id);

  if (!fileId) {
    console.error('[contextNormalizer] Slack file_shared event does not contain a file_id');
    return null;
  }

  // 1. Get file metadata from Slack API
  const fileInfoUrl = `https://slack.com/api/files.info?file=${fileId}`;
  const fileInfoRes = await fetch(fileInfoUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  const fileInfo = await fileInfoRes.json();
  if (!fileInfo.ok || !fileInfo.file) {
    console.error('[contextNormalizer] Failed to fetch Slack file info:', fileInfo.error || 'unknown');
    return null;
  }

  const file = fileInfo.file;
  const downloadUrl = file.url_private_download;
  const fileName = `${Date.now()}-${file.name}`;
  const mimetype = file.mimetype || 'application/octet-stream';
  const sizeBytes = file.size || 0;

  if (!downloadUrl) {
    console.error('[contextNormalizer] Slack file download URL is missing');
    return null;
  }

  // 2. Download raw file buffer
  let fileBuffer: Buffer;
  try {
    fileBuffer = await downloadFileWithHttps(downloadUrl, accessToken);
  } catch (err: any) {
    console.error('[contextNormalizer] Failed to download Slack file binary:', err.message || err);
    return null;
  }

  // 3. Upload to Supabase Storage bucket 'documents'
  const { error: storageErr } = await supabase.storage
    .from('documents')
    .upload(fileName, Buffer.from(fileBuffer), {
      contentType: mimetype,
      upsert: true
    });

  if (storageErr) {
    console.error('[contextNormalizer] Supabase Storage upload error:', storageErr);
    return null;
  }

  // 4. Resolve sender profile
  const profile = await mapSlackUserToProfile(event.user_id, workspaceId, accessToken);
  const uploader = profile ? {
    id: profile.id,
    name: profile.username,
    email: profile.email,
    avatar: profile.avatar || '',
    role: profile.role || 'Member',
    visibility: 'shared'
  } : {
    id: 'slack-system',
    name: 'Slack System',
    email: '',
    avatar: '',
    role: 'Member',
    visibility: 'shared'
  };

  // Convert mimetype to local DocumentType
  let docType = 'txt';
  if (mimetype.includes('pdf')) docType = 'pdf';
  else if (mimetype.includes('word') || mimetype.includes('officedocument.wordprocessingml')) docType = 'docx';
  else if (mimetype.includes('sheet') || mimetype.includes('officedocument.spreadsheetml')) docType = 'xlsx';
  else if (mimetype.includes('image')) docType = 'png';

  // 5. Ingest into public.documents table
  const docPayload = {
    id: `slack-file-${file.id}`,
    title: file.title || file.name,
    type: docType,
    size: `${(sizeBytes / 1024).toFixed(2)} KB`,
    summary: `File shared in Slack by ${uploader.name}. Format: ${file.filetype?.toUpperCase() || 'Attachment'}`,
    content: `Slack Shared File details:
File ID: ${file.id}
File Name: ${file.name}
File Title: ${file.title || 'Untitled'}
Mime Type: ${mimetype}
Slack Download URL: ${file.url_private}
Stored Path: documents/${fileName}`,
    tags: ['slack', 'file', file.filetype || 'attachment'],
    key_points: [],
    extracted_tasks: [],
    extracted_people: [uploader.name.toUpperCase()],
    extracted_organizations: [],
    uploaded_at: timestamp,
    processing_status: 'completed',
    uploaded_by: { ...uploader, workspaceId }
  };

  let { error: docErr } = await supabase
    .from('documents')
    .insert({ ...docPayload, workspace_id: workspaceId });

  if (docErr && docErr.message?.includes('workspace_id')) {
    const { error: fallbackErr } = await supabase
      .from('documents')
      .insert(docPayload);
    docErr = fallbackErr;
  }

  if (docErr) {
    console.error('[contextNormalizer] Failed to insert Slack file document record:', docErr);
  } else {
    console.log('[contextNormalizer] Slack file successfully ingested as document:', file.name);

    // Insert notification records to alert all active workspace members about the file upload
    const { data: members } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active');

    if (members && members.length > 0) {
      const notificationPayloads = members.map((member, index) => ({
        id: `notif-slack-file-${Date.now()}-${index}`,
        user_id: member.user_id,
        title: `Slack Document Uploaded`,
        message: `New document "${file.title || file.name}" uploaded in Slack has been synced.`,
        type: 'system',
        read: false,
        created_at: new Date().toISOString()
      }));

      const { error: notifErr } = await supabase
        .from('notifications')
        .insert(notificationPayloads);

      if (notifErr) {
        console.error('[contextNormalizer] Failed to insert Slack file notifications:', notifErr);
      } else {
        console.log(`[contextNormalizer] Slack file notifications sent to ${members.length} members`);
      }
    }
  }

  return docPayload;
}
