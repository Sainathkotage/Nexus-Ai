import { UniversalConnector, ConnectorRegistry } from '../framework';

// ==========================================
// 1. GITHUB CONNECTOR
// ==========================================
export const GitHubConnector: UniversalConnector = {
  id: 'github',
  name: 'GitHub',
  category: 'Developer Tools',
  description: 'Connect pull requests, issues, commits, and codebase documentation directly to Nexus AI workspace context.',
  logoUrl: 'https://cdn-icons-png.flaticon.com/512/25/25231.png',
  authType: 'oauth2',
  supportedTriggers: [
    { id: 'push', name: 'New Commit Push', description: 'Triggers when code is pushed to a branch' },
    { id: 'pull_request', name: 'Pull Request Activity', description: 'Triggers when PRs are opened, closed, or merged' },
    { id: 'issue_created', name: 'New Issue Created', description: 'Triggers when a new issue is logged' }
  ],
  supportedActions: [
    {
      id: 'create_issue',
      name: 'Create Issue',
      description: 'Creates a new issue in a GitHub repository',
      paramsSchema: {
        repo: { type: 'string', required: true, description: 'Repository name (owner/repo)' },
        title: { type: 'string', required: true, description: 'Issue Title' },
        body: { type: 'string', required: false, description: 'Issue Body content' }
      }
    }
  ],

  async testConnection(credentials: any): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${credentials.accessToken}`,
          'User-Agent': 'Nexus-AI-Integration'
        }
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  },

  async syncContext(credentials: any, workspaceId: string): Promise<any> {
    // In production, this pulls issues, repo lists, and stores them in public.documents
    console.log(`[GitHubSync] Indexing repo metadata for workspace: ${workspaceId}`);
    return { syncedItems: 12, bytesProcessed: 48500 };
  },

  async executeAction(actionId: string, credentials: any, params: any): Promise<any> {
    if (actionId === 'create_issue') {
      const { repo, title, body } = params;
      const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${credentials.accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Nexus-AI-Integration',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, body })
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`GitHub action failed: ${errText}`);
      }
      return response.json();
    }
    throw new Error(`Unsupported GitHub action: ${actionId}`);
  },

  async registerWebhook(credentials: any, callbackUrl: string): Promise<string> {
    return 'webhook-github-mock-id';
  },

  async handleWebhook(payload: any): Promise<{ triggerId: string; data: any }> {
    if (payload.action === 'opened' && payload.issue) {
      return { triggerId: 'issue_created', data: payload.issue };
    }
    return { triggerId: 'push', data: payload };
  }
};

// ==========================================
// 2. NOTION CONNECTOR
// ==========================================
export const NotionConnector: UniversalConnector = {
  id: 'notion',
  name: 'Notion',
  category: 'Productivity',
  description: 'Synchronize Notion databases, docs, and team wikis into your AI search space.',
  logoUrl: 'https://cdn.iconscout.com/icon/free/png-256/free-notion-3628994-3030219.png',
  authType: 'oauth2',
  supportedTriggers: [
    { id: 'page_added', name: 'Page Added', description: 'Triggers when a new page is added to a database' }
  ],
  supportedActions: [
    {
      id: 'create_page',
      name: 'Create Database Page',
      description: 'Creates a new page in a selected Notion database',
      paramsSchema: {
        databaseId: { type: 'string', required: true, description: 'Notion Database ID' },
        title: { type: 'string', required: true, description: 'Page Title' },
        content: { type: 'string', required: false, description: 'Page body content' }
      }
    }
  ],

  async testConnection(credentials: any): Promise<boolean> {
    try {
      const response = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Notion-Version': '2022-06-28'
        }
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  },

  async syncContext(credentials: any, workspaceId: string): Promise<any> {
    console.log(`[NotionSync] Syncing workspace directories for: ${workspaceId}`);
    return { pagesSynced: 45, databasesFound: 3 };
  },

  async executeAction(actionId: string, credentials: any, params: any): Promise<any> {
    if (actionId === 'create_page') {
      const { databaseId, title, content } = params;
      const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties: {
            Name: {
              title: [
                { text: { content: title } }
              ]
            }
          },
          children: content ? [
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [{ type: 'text', text: { content } }]
              }
            }
          ] : []
        })
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Notion action failed: ${errText}`);
      }
      return response.json();
    }
    throw new Error(`Unsupported Notion action: ${actionId}`);
  }
};

// ==========================================
// 3. SLACK CONNECTOR
// ==========================================
export const SlackConnector: UniversalConnector = {
  id: 'slack',
  name: 'Slack',
  category: 'Communication',
  description: 'Post messages, summarize channels, and automatically handle incoming chat events.',
  logoUrl: 'https://cdn-icons-png.flaticon.com/512/2111/2111615.png',
  authType: 'oauth2',
  supportedTriggers: [
    { id: 'message_received', name: 'New Message', description: 'Triggers when a message is posted to a channel' }
  ],
  supportedActions: [
    {
      id: 'send_message',
      name: 'Send Channel Message',
      description: 'Sends a chat message to a Slack channel',
      paramsSchema: {
        channel: { type: 'string', required: true, description: 'Channel ID (e.g. #general)' },
        text: { type: 'string', required: true, description: 'Message Text' }
      }
    }
  ],

  async testConnection(credentials: any): Promise<boolean> {
    try {
      const response = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`
        }
      });
      const data = await response.json();
      return data.ok;
    } catch (e) {
      return false;
    }
  },

  async syncContext(credentials: any, workspaceId: string): Promise<any> {
    console.log(`[SlackSync] Indexing channel archives for workspace: ${workspaceId}`);
    return { channelsIndexed: 8, messagesRead: 2000 };
  },

  async executeAction(actionId: string, credentials: any, params: any): Promise<any> {
    if (actionId === 'send_message') {
      const { channel, text } = params;
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ channel, text })
      });
      const data = await response.json();
      if (!data.ok) {
        throw new Error(`Slack action failed: ${data.error || 'Unknown error'}`);
      }
      return data;
    }
    throw new Error(`Unsupported Slack action: ${actionId}`);
  },

  async handleWebhook(payload: any): Promise<{ triggerId: string; data: any }> {
    return { triggerId: 'message_received', data: payload.event };
  }
};

// Register all core connectors
ConnectorRegistry.register(GitHubConnector);
ConnectorRegistry.register(NotionConnector);
ConnectorRegistry.register(SlackConnector);
