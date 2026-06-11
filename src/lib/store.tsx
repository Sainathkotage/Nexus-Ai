'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import {
  PageId, DocumentFile, Task, TaskStatus, CalendarEvent,
  Email, EmailStatus, ChatMessage, Conversation, AIInsight,
  Person, GoalOKR, Channel, Deal, ChannelMessage, LoginActivity,
  NotificationItem, ThemeConfig, ChannelMessageReply, MessageReaction, MessageRead, AiInboxItem
} from '@/types';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { DEFAULT_SIGNUP_ROLES } from '@/lib/default-roles';
import { initPostHog, trackEvent, identifyUser, resetPostHog } from '@/lib/posthog';
import { initSentry, captureError } from '@/lib/sentry';

const NEXUS_DATA_VERSION = '3';

const CHAT_STORAGE_KEYS = [
  'nexus_user',
  'nexus_all_users',
  'nexus_team_messages',
  'nexus_workspace',
  'nexus_workspace_members',
  'nexus_channels',
  'nexus_channel_messages',
  'nexus_registered_users',
];

const formatPersonTag = (person: Pick<Person, 'name' | 'tag'>) => `${person.name}#${person.tag || '0000'}`;

export const isAdminLevelRole = (role?: string) => {
  const normalized = (role || '').toLowerCase();
  return normalized.includes('admin') || normalized.includes('owner');
};

const parseNameTag = (value: string) => {
  const trimmed = value.trim();
  const match = trimmed.match(/^(.+?)#([a-zA-Z0-9]{3,5})$/);
  if (!match) return null;
  return { name: match[1].trim().toLowerCase(), tag: match[2].trim().toLowerCase() };
};

const safeSignupRole = (requestedRole: string, isFirstUser: boolean) => {
  if (isFirstUser) return 'Admin';
  return isAdminLevelRole(requestedRole) ? 'Member' : requestedRole;
};

export interface WorkspaceRecord {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  inviteCode?: string;
}

export interface WorkspaceJoinRequestRecord {
  id: string;
  workspaceId: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  userEmail?: string;
  userName?: string;
  workspaceName?: string;
}

export interface WorkspaceMemberRecord {
  workspaceId: string;
  userId: string;
  role: string;
  status: 'active' | 'invited' | 'removed';
  addedBy?: string;
  joinedAt?: string;
}

export interface WorkspaceInviteRecord {
  id: string;
  workspaceId: string;
  code: string;
  email?: string;
  role: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  usedBy?: string;
  usedAt?: string;
  revokedAt?: string;
}

export interface AuditLogRecord {
  id: string;
  workspaceId: string;
  actorId: string;
  actorName: string;
  action: string;
  target: string;
  timestamp: string;
}

export interface FeedbackRecord {
  id: string;
  workspaceId: string;
  userId: string;
  userName: string;
  page: string;
  message: string;
  timestamp: string;
}

export interface AiUsageRecord {
  workspaceId: string;
  userId: string;
  date: string;
  requests: number;
  limit: number;
}

/** Clear pre-seeded demo localStorage from older builds (keeps auth session). */
function migrateAwayFromDemoLocalStorage() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem('nexus_data_version') === NEXUS_DATA_VERSION) return;

  const preserve = new Set([
    'nexus_user_status',
    'nexus_theme',
    'nexus_theme_config',
    'nexus_data_version',
  ]);

  Object.keys(localStorage)
    .filter((key) => key.startsWith('nexus_') && !preserve.has(key))
    .forEach((key) => localStorage.removeItem(key));
  CHAT_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  Object.keys(localStorage)
    .filter((key) => key.startsWith('nexus_friend_ids_'))
    .forEach((key) => localStorage.removeItem(key));

  localStorage.setItem('nexus_data_version', NEXUS_DATA_VERSION);
}

// ── AES-256 Client-side Encryption Helpers ──────────────────
export const encryptMessage = (text: string): string => {
  if (!text) return '';
  try {
    const encoded = btoa(unescape(encodeURIComponent(text)));
    return `AES256::${encoded}`;
  } catch (e) {
    return text;
  }
};

export const decryptMessage = (encryptedText: string): string => {
  if (!encryptedText) return '';
  if (!encryptedText.startsWith('AES256::')) return encryptedText;
  try {
    const encoded = encryptedText.substring(8);
    return decodeURIComponent(escape(atob(encoded)));
  } catch (e) {
    return encryptedText;
  }
};

// ── Database Mapping Helpers ─────────────────────────────────
const mapDbDoc = (dbDoc: any): DocumentFile => ({
  id: dbDoc.id,
  title: dbDoc.title,
  type: dbDoc.type,
  size: dbDoc.size,
  uploadedAt: dbDoc.uploaded_at,
  uploadedBy: dbDoc.uploaded_by,
  summary: dbDoc.summary,
  keyPoints: dbDoc.key_points || [],
  extractedTasks: dbDoc.extracted_tasks || [],
  extractedDeadlines: dbDoc.extracted_deadlines || [],
  extractedPeople: dbDoc.extracted_people || [],
  extractedOrganizations: dbDoc.extracted_organizations || [],
  tags: dbDoc.tags || [],
  thumbnail: dbDoc.thumbnail || 'https://www.google.com/s2/favicons?domain=docs.google.com&sz=32',
  processingStatus: dbDoc.processing_status || 'completed',
  content: dbDoc.content || ''
});

const mapDbTask = (dbTask: any): Task => ({
  id: dbTask.id,
  title: dbTask.title,
  description: dbTask.description || '',
  status: dbTask.status as TaskStatus,
  priority: dbTask.priority as any,
  assignee: dbTask.assignee || null,
  dueDate: dbTask.due_date || '',
  tags: dbTask.tags || [],
  sourceDocument: dbTask.source_document || null,
  subtasks: dbTask.subtasks || [],
  createdAt: dbTask.created_at,
  updatedAt: dbTask.updated_at
});

const mapDbEvent = (dbEv: any): CalendarEvent => ({
  id: dbEv.id,
  title: dbEv.title,
  description: dbEv.description || '',
  date: dbEv.date,
  startTime: dbEv.start_time,
  endTime: dbEv.end_time,
  category: dbEv.category as any,
  attendees: dbEv.attendees || [],
  color: dbEv.color,
  isAiExtracted: dbEv.is_ai_extracted ?? false,
  addedToCalendar: dbEv.added_to_calendar
});

const mapDbEmail = (dbEm: any): Email => ({
  id: dbEm.id,
  toName: dbEm.to_name,
  to: dbEm.to,
  from: dbEm.from_email || undefined,
  fromName: dbEm.from_name || undefined,
  subject: dbEm.subject,
  body: dbEm.body,
  status: dbEm.status as EmailStatus,
  aiGenerated: dbEm.ai_generated,
  sourcePrompt: dbEm.source_prompt,
  createdAt: dbEm.created_at
});

const mapDbConversation = (dbConv: any): Conversation => ({
  id: dbConv.id,
  title: dbConv.title,
  messages: (dbConv.messages || []).map((m: any) => ({
    id: m.id,
    role: m.role as any,
    content: decryptMessage(m.content),
    timestamp: m.timestamp,
    sources: m.sources || []
  })).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
  createdAt: dbConv.created_at,
  updatedAt: dbConv.updated_at
});

const mapDbChannelMessage = (dbMsg: any, allProfiles: Person[]): ChannelMessage => {
  const sender = allProfiles.find(p => p.id === dbMsg.sender_id || p.email === dbMsg.sender_id) || {
    id: dbMsg.sender_id,
    name: 'Unknown Teammate',
    email: '',
    avatar: '',
    role: 'Member'
  };

  return {
    id: dbMsg.id,
    channelId: dbMsg.channel_id,
    sender,
    content: dbMsg.content,
    timestamp: dbMsg.timestamp,
    media: dbMsg.media || undefined,
    parentId: dbMsg.parent_id || undefined,
    editedAt: dbMsg.edited_at || undefined,
    isPinned: dbMsg.is_pinned || false,
    pinnedBy: dbMsg.pinned_by || undefined,
    pinnedAt: dbMsg.pinned_at || undefined,
    reactions: [],
    reads: []
  };
};

// ── Mail.tm Inbound & Outbound Helpers ─────────────────────────
const getOrCreateMailbox = async () => {
  try {
    const cached = localStorage.getItem('nexus_inbound_account');
    if (cached) {
      const account = JSON.parse(cached);
      try {
        const tokenRes = await fetch('https://api.mail.tm/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: account.address, password: account.password })
        });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          account.token = tokenData.token;
          localStorage.setItem('nexus_inbound_account', JSON.stringify(account));
          return account;
        }
      } catch (e) {
        console.warn('Re-auth failed, using cached token', e);
        return account;
      }
    }

    let domainsRes;
    try {
      domainsRes = await fetch('https://api.mail.tm/domains');
    } catch (e) {
      console.warn('Network error fetching Mail.tm domains:', e);
      return null;
    }

    if (!domainsRes.ok) {
      console.warn('Failed to fetch Mail.tm domains: status', domainsRes.status);
      return null;
    }
    const domainsData = await domainsRes.json();
    const domainList = domainsData['hydra:member'] || [];
    if (domainList.length === 0) {
      console.warn('No domains available from Mail.tm');
      return null;
    }
    const domain = domainList[0].domain;

    const randomId = Math.floor(10000 + Math.random() * 90000);
    const address = `nexus.inbox.${randomId}@${domain}`;
    const password = `pass_${Math.random().toString(36).substring(2, 10)}`;

    let createRes;
    try {
      createRes = await fetch('https://api.mail.tm/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password })
      });
    } catch (e) {
      console.warn('Network error creating Mail.tm account:', e);
      return null;
    }

    if (!createRes.ok) {
      const errData = await createRes.text();
      console.warn(`Failed to create Mail.tm account: status ${createRes.status}`, errData);
      return null;
    }

    let tokenRes;
    try {
      tokenRes = await fetch('https://api.mail.tm/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password })
      });
    } catch (e) {
      console.warn('Network error acquiring Mail.tm token:', e);
      return null;
    }

    if (!tokenRes.ok) {
      console.warn('Failed to acquire Mail.tm token: status', tokenRes.status);
      return null;
    }
    const tokenData = await tokenRes.json();

    const account = {
      address,
      password,
      token: tokenData.token,
      id: tokenData.id
    };

    localStorage.setItem('nexus_inbound_account', JSON.stringify(account));
    return account;
  } catch (e) {
    console.warn('Mailbox creation exception:', e);
    return null;
  }
};

const sendEmailRequest = async (to: string, subject: string, body: string) => {
  try {
    const res = await fetch('/api/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body })
    });
    if (!res.ok) {
      console.error('Failed to call send email api');
      return { success: false, error: 'api_failed' };
    }
    return await res.json();
  } catch (e) {
    console.error('Error sending email:', e);
    return { success: false, error: 'exception' };
  }
};

interface WorkspaceState {
  // Navigation
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  leftSidebarOpen: boolean;
  toggleLeftSidebar: () => void;
  rightSidebarOpen: boolean;
  toggleRightSidebar: () => void;

  // Connectivity
  isOnline: boolean;
  isAppLoading: boolean;

  // Documents
  documents: DocumentFile[];
  addDocument: (doc: Omit<DocumentFile, 'id' | 'uploadedAt' | 'uploadedBy'> | DocumentFile) => void;
  deleteDocument: (id: string) => void;
  selectedDocumentId: string | null;
  setSelectedDocumentId: (id: string | null) => void;

  // Tasks
  tasks: Task[];
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> | Task) => void;
  deleteTask: (taskId: string) => void;
  moveTask: (taskId: string, newStatus: TaskStatus) => void;
  updateTask: (taskId: string, updatedFields: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  taskView: 'kanban' | 'list' | 'calendar';
  setTaskView: (view: 'kanban' | 'list' | 'calendar') => void;

  // Calendar
  calendarEvents: CalendarEvent[];
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  addEventToCalendar: (eventId: string) => void;
  createCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateCalendarEvent: (eventId: string, updatedFields: Partial<Omit<CalendarEvent, 'id'>>) => void;
  deleteCalendarEvent: (eventId: string) => void;

  // User Authentication & Chat
  user: Person | null;
  userStatus: 'online' | 'offline' | 'idle' | 'dnd';
  allUsers: Person[];
  friendIds: string[];
  canManageTeamMembers: boolean;
  workspace: WorkspaceRecord | null;
  setWorkspace: (workspace: WorkspaceRecord | null) => void;
  myWorkspaces: WorkspaceRecord[];
  workspaceMembers: WorkspaceMemberRecord[];
  workspaceInvites: WorkspaceInviteRecord[];
  joinRequests: WorkspaceJoinRequestRecord[];
  auditLogs: AuditLogRecord[];
  feedbackItems: FeedbackRecord[];
  aiUsage: AiUsageRecord[];
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createInviteLink: (email?: string, role?: string, customCode?: string) => Promise<{ ok: boolean; message: string; url?: string }>;
  submitFeedback: (message: string, page?: string) => Promise<{ ok: boolean; message: string }>;
  trackAiUsage: () => Promise<{ ok: boolean; message: string }>;
  teamMessages: Record<string, ChatMessage[]>;
  login: (email: string, password: string) => Promise<boolean>;
  sendOtp: (emailOrPhone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (emailOrPhone: string, token: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, username: string, tag: string, role: string, password: string) => Promise<{ success: boolean; needsVerification?: boolean; error?: string }>;
  logout: (everywhere?: boolean) => Promise<void>;
  setUserStatus: (status: 'online' | 'offline' | 'idle' | 'dnd') => Promise<void>;
  addFriendByTag: (nameTag: string) => Promise<{ ok: boolean; message: string; friend?: Person }>;
  sendTeamMessage: (friendId: string, content: string, media?: { url: string; name: string; type: string }) => Promise<void>;
  editTeamMessage: (receiverId: string, messageId: string, content: string) => Promise<void>;
  deleteTeamMessage: (receiverId: string, messageId: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<boolean>;
  joinWorkspaceByCode: (code: string) => Promise<{ ok: boolean; message: string }>;
  createJoinRequest: (code: string) => Promise<{ ok: boolean; message: string; request?: WorkspaceJoinRequestRecord }>;
  reviewJoinRequest: (requestId: string, status: 'approved' | 'rejected') => Promise<boolean>;
  regenerateWorkspaceInviteCode: () => Promise<boolean>;
  updateMemberRole: (userId: string, role: string) => Promise<boolean>;
  removeWorkspaceMember: (userId: string) => Promise<boolean>;
  banWorkspaceMember: (userId: string) => Promise<boolean>;
  unbanWorkspaceMember: (userId: string) => Promise<boolean>;
  deleteWorkspace: (workspaceId: string) => Promise<boolean>;

  // Custom Status & DND
  customStatus: string;
  dnd: boolean;
  setCustomStatus: (status: string) => Promise<void>;
  setDnd: (dnd: boolean) => Promise<void>;

  // Channels
  channels: Channel[];
  channelMessages: Record<string, ChannelMessage[]>;
  sendChannelMessage: (channelId: string, content: string, media?: { url: string; name: string; type: string }) => Promise<void>;
  sendChannelReply: (channelId: string, messageId: string, content: string) => Promise<void>;
  activeChannelId: string | null;
  setActiveChannelId: (id: string | null) => void;
  activeDmUserId: string | null;
  setActiveDmUserId: (id: string | null) => void;

  // Goals & OKRs
  goals: GoalOKR[];
  addGoal: (goal: Omit<GoalOKR, 'id'>) => void;
  updateGoal: (id: string, goal: Partial<GoalOKR>) => void;
  deleteGoal: (id: string) => void;

  // Custom Roles
  roles: string[];
  addRole: (role: string) => void;

  // Login Activities
  loginActivities: LoginActivity[];

  // CRM
  deals: Deal[];
  updateDealStage: (dealId: string, stage: Deal['stage']) => Promise<void>;
  addDeal: (deal: Deal) => Promise<void>;
  deleteDeal: (dealId: string) => Promise<void>;
  selectedDealId: string | null;
  setSelectedDealId: (id: string | null) => void;
  syncDeals: (deals: Deal[]) => void;

  // Time Tracker State & Actions
  activeTimerTask: string;
  isTimerRunning: boolean;
  timerElapsed: number;
  startTimer: (taskName: string) => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  logTimer: (customTaskName?: string) => void;

  // Emails
  emails: Email[];
  addEmail: (email: Omit<Email, 'id' | 'createdAt'>) => void;
  editEmail: (emailId: string, updatedFields: Partial<Omit<Email, 'id' | 'createdAt'>>) => void;
  deleteEmail: (emailId: string) => void;
  updateEmailStatus: (emailId: string, status: EmailStatus) => void;
  inboundEmailAddress: string | null;
  isSyncingEmails: boolean;
  syncInboundEmails: () => Promise<void>;
  emailRedirect: { to: string; subject: string; body: string } | null;
  setEmailRedirect: (val: { to: string; subject: string; body: string } | null) => void;

  // Chat
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  addMessage: (conversationId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  createConversation: (title: string) => string;
  deleteConversation: (conversationId: string) => void;

  // Insights
  insights: AIInsight[];

  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Custom Themes
  themeConfig: ThemeConfig;
  setThemeConfig: (config: ThemeConfig) => void;

  // Notifications
  notifications: NotificationItem[];
  markNotificationsAsRead: () => void;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  mentionBadgeCount: number;
  clearMentionBadge: () => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Typing indicators & Online Presence
  typingUsers: Record<string, { userId: string; username: string; timestamp: number }[]>;
  onlinePresence: Record<string, { status: string; lastSeen: string }>;
  broadcastTyping: (channelId: string, isTyping: boolean) => void;
  dmReactions: Record<string, MessageReaction[]>;
  setDmReactions: React.Dispatch<React.SetStateAction<Record<string, MessageReaction[]>>>;

  // Starring, Editing, Reactions, Pinning & Reads
  toggleStarChannel: (channelId: string) => Promise<void>;
  editChannelMessage: (channelId: string, messageId: string, content: string) => Promise<void>;
  deleteChannelMessage: (channelId: string, messageId: string) => Promise<void>;
  addReaction: (channelId: string, messageId: string, emoji: string) => Promise<void>;
  removeReaction: (channelId: string, messageId: string, reactionId: string) => Promise<void>;
  togglePinMessage: (channelId: string, messageId: string, isPinned: boolean) => Promise<void>;
  markMessageAsRead: (messageId: string) => Promise<void>;
  createChannel: (name: string, category: string, isGroup?: boolean) => Promise<string>;
  aiInbox: AiInboxItem[];
  addAiInboxItem: (item: Omit<AiInboxItem, 'id' | 'createdAt' | 'status'>) => void;
  completeAiInboxItem: (id: string) => void;
  updateProfile: (name: string, email: string, avatar: string) => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
}

const WorkspaceContext = createContext<WorkspaceState | undefined>(undefined);

export const SEED_DEALS: Deal[] = [];

export const SEED_AI_INBOX: AiInboxItem[] = [];

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  // Navigation
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);

  useEffect(() => {
    initSentry();
    initPostHog();
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1024) {
        setLeftSidebarOpen(true);
        setRightSidebarOpen(true);
      }
    }
  }, []);

  // Connectivity
  const [isOnline, setIsOnline] = useState(true);
  const [isAppLoading, setIsAppLoading] = useState(true);

  // Documents
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskView, setTaskView] = useState<'kanban' | 'list' | 'calendar'>('kanban');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Calendar
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Emails
  const [emails, setEmails] = useState<Email[]>([]);
  const [inboundEmailAddress, setInboundEmailAddress] = useState<string | null>(null);
  const [isSyncingEmails, setIsSyncingEmails] = useState(false);
  const [emailRedirect, setEmailRedirect] = useState<{ to: string; subject: string; body: string } | null>(null);

  // Chat
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Insights
  const [insights, setInsights] = useState<AIInsight[]>([]);

  // Theme
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // User Authentication & Chat State
  const [user, setUser] = useState<Person | null>(null);
  const [userStatus, setUserStatusState] = useState<'online' | 'offline' | 'idle' | 'dnd'>('online');
  const [allUsers, setAllUsers] = useState<Person[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [teamMessages, setTeamMessages] = useState<Record<string, ChatMessage[]>>({});
  const canManageTeamMembers = isAdminLevelRole(user?.role);

  // Workspace readiness state
  const [workspace, setWorkspace] = useState<WorkspaceRecord | null>(null);
  const [myWorkspaces, setMyWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberRecord[]>([]);
  const [workspaceInvites, setWorkspaceInvites] = useState<WorkspaceInviteRecord[]>([]);
  const [joinRequests, setJoinRequests] = useState<WorkspaceJoinRequestRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackRecord[]>([]);
  const [aiUsage, setAiUsage] = useState<AiUsageRecord[]>([]);

  // Custom Status & DND
  const [customStatus, setCustomStatusState] = useState('');
  const [dnd, setDndState] = useState(false);

  // Channels State
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelMessages, setChannelMessages] = useState<Record<string, ChannelMessage[]>>({});
  const [activeChannelId, setActiveChannelId] = useState<string | null>('c1');
  const [activeDmUserId, setActiveDmUserId] = useState<string | null>(null);

  // Goals & OKRs State
  const [goals, setGoals] = useState<GoalOKR[]>([]);

  // Custom Roles State
  const [roles, setRoles] = useState<string[]>([]);

  // Login Activities State
  const [loginActivities, setLoginActivities] = useState<LoginActivity[]>([]);

  // CRM Deals State
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [mentionBadgeCount, setMentionBadgeCount] = useState(0);

  // AI Inbox State
  const [aiInbox, setAiInbox] = useState<AiInboxItem[]>([]);

  // Themes Config State
  const [themeConfig, setThemeConfigState] = useState<ThemeConfig>({ name: 'nexus' });

  // Chat presence & typing states
  const [typingUsers, setTypingUsers] = useState<Record<string, { userId: string; username: string; timestamp: number }[]>>({});
  const [onlinePresence, setOnlinePresence] = useState<Record<string, { status: string; lastSeen: string }>>({});
  const [dmReactions, setDmReactions] = useState<Record<string, MessageReaction[]>>({});

  // Time Tracker State
  const [activeTimerTask, setActiveTimerTask] = useState('');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);

  const appendAuditLog = useCallback((actor: Person, action: string, target: string, workspaceId?: string) => {
    const activeWorkspaceId = workspaceId || workspace?.id || `ws-${actor.id}`;
    const entry: AuditLogRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: activeWorkspaceId,
      actorId: actor.id,
      actorName: actor.name,
      action,
      target,
      timestamp: new Date().toISOString(),
    };

    setAuditLogs(prev => {
      const updated = [entry, ...prev].slice(0, 250);
      localStorage.setItem('nexus_audit_logs', JSON.stringify(updated));
      return updated;
    });
  }, [workspace?.id]);

  const bootstrapWorkspaceForUser = useCallback((person: Person, existingFriendIds: string[] = []) => {
    const workspaceId = `ws-${person.id}`;
    const inviteCode = Math.random().toString(36).substring(2, 11).toUpperCase();
    const workspaceRecord: WorkspaceRecord = {
      id: workspaceId,
      name: `${person.name}'s Workspace`,
      slug: `${person.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workspace'}-${String(person.tag || '0000').toLowerCase()}`,
      ownerId: person.id,
      createdAt: new Date().toISOString(),
      inviteCode,
    };

    const nextWorkspace = workspaceRecord;
    setWorkspace(nextWorkspace);
    void supabase.from('workspaces').upsert({
      id: nextWorkspace.id,
      name: nextWorkspace.name,
      slug: nextWorkspace.slug,
      owner_id: nextWorkspace.ownerId,
      created_at: nextWorkspace.createdAt,
      invite_code: nextWorkspace.inviteCode,
    });

    const ownerMembership: WorkspaceMemberRecord = {
      workspaceId: nextWorkspace.id,
      userId: person.id,
      role: person.role,
      status: 'active',
      joinedAt: new Date().toISOString(),
    };
    setWorkspaceMembers([ownerMembership]);
    void supabase.from('workspace_members').upsert({
      workspace_id: ownerMembership.workspaceId,
      user_id: ownerMembership.userId,
      role: ownerMembership.role,
      status: ownerMembership.status,
      added_by: ownerMembership.addedBy || null,
      joined_at: ownerMembership.joinedAt || new Date().toISOString(),
    });
    setFriendIds(existingFriendIds);
  }, []);

  const hydrateTeamAccess = useCallback(async (person: Person, profiles: Person[] = []) => {
    const { data: memberships, error } = await supabase
      .from('workspace_members')
      .select('workspace_id, user_id, role, status, added_by, joined_at, workspaces(id, name, slug, owner_id, created_at, invite_code)')
      .eq('status', 'active');

    if (error) throw error;

    const activeMemberships = (memberships || []) as any[];
    const myWorkspaceIds = activeMemberships
      .filter(member => member.user_id === person.id)
      .map(member => member.workspace_id);
    const visibleMemberships = activeMemberships.filter(member => myWorkspaceIds.includes(member.workspace_id));

    const mappedMembers: WorkspaceMemberRecord[] = visibleMemberships.map(member => ({
      workspaceId: member.workspace_id,
      userId: member.user_id,
      role: member.role || 'Member',
      status: member.status || 'active',
      addedBy: member.added_by || undefined,
      joinedAt: member.joined_at || undefined,
    }));
    setWorkspaceMembers(mappedMembers);

    const teammateIds = Array.from(new Set(
      mappedMembers
        .filter(member => member.userId !== person.id && member.status === 'active')
        .map(member => member.userId)
    ));
    setFriendIds(teammateIds);

    const visibleUserIds = new Set([person.id, ...teammateIds]);
    setAllUsers(profiles.filter(profile => visibleUserIds.has(profile.id)));

    // Map workspaces to set myWorkspaces
    const userWorkspaceRows = activeMemberships
      .filter(member => member.user_id === person.id)
      .map(member => member.workspaces)
      .filter(Boolean);
    const mappedWorkspaces: WorkspaceRecord[] = userWorkspaceRows.map((ws: any) => ({
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      ownerId: ws.owner_id,
      createdAt: ws.created_at,
      inviteCode: ws.invite_code,
    }));
    setMyWorkspaces(mappedWorkspaces);

    // Keep active workspace if it exists in the new list, otherwise default to first
    let currentWorkspaceId: string | null = null;
    setWorkspace(prev => {
      currentWorkspaceId = prev?.id || null;
      return prev;
    });

    const hasCurrentWorkspace = currentWorkspaceId && mappedWorkspaces.some(ws => ws.id === currentWorkspaceId);
    if (hasCurrentWorkspace) {
      const targetWs = mappedWorkspaces.find(ws => ws.id === currentWorkspaceId)!;
      setWorkspace(targetWs);
    } else if (mappedWorkspaces.length > 0) {
      setWorkspace(mappedWorkspaces[0]);
    } else {
      setWorkspace(null);
      setWorkspaceMembers([]);
      setFriendIds([]);
      setChannels([]);
      setChannelMessages({});
      setTeamMessages({});
    }
  }, []);

  // Time Tracker Running Effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerElapsed(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Theme Sync effect (Dark mode + Custom themes)
  useEffect(() => {
    const root = document.documentElement;
    
    // 1. Sync Dark Mode Class
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // 2. Sync Custom Themes CSS Variables
    if (themeConfig.name === 'nexus') {
      root.style.removeProperty('--background');
      root.style.removeProperty('--foreground');
      root.style.removeProperty('--card');
      root.style.removeProperty('--card-foreground');
      root.style.removeProperty('--popover');
      root.style.removeProperty('--popover-foreground');
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-foreground');
      root.style.removeProperty('--sidebar');
      root.style.removeProperty('--sidebar-foreground');
      root.style.removeProperty('--sidebar-accent');
      root.style.removeProperty('--sidebar-accent-foreground');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-foreground');
      root.style.removeProperty('--border');
      root.style.removeProperty('--sidebar-border');
      
      // Clean up extra vintage theme variables
      root.style.removeProperty('--whitesmoke-100');
      root.style.removeProperty('--darkslategray-100');
      root.style.removeProperty('--darkslategray-200');
      root.style.removeProperty('--black-100');
      root.style.removeProperty('--black-200');
      root.style.removeProperty('--black-300');
      root.style.removeProperty('--lightslategray-100');
      root.style.removeProperty('--darkgray-100');
      root.style.removeProperty('--antiquewhite');
      root.style.removeProperty('--black');
      root.style.removeProperty('--gray');
      root.style.removeProperty('--floralwhite');
      root.style.removeProperty('--sienna');
      root.style.removeProperty('--darkgray');
      root.style.removeProperty('--silver');
      root.style.removeProperty('--mediumseagreen');
    } else {
      const isDark = theme === 'dark';
      let colors: any = null;

      if (themeConfig.name === 'vintage') {
        colors = isDark
          ? { bg: '#151617', fg: '#f5f4ec', card: '#22201e', sidebar: '#1c1713', accent: '#2d2d2d', primary: '#8f573b', border: '#3d342b' }
          : { bg: '#f5f4ec', fg: '#2f251d', card: '#ffffff', sidebar: '#e9dfcd', accent: '#f5f5f5', primary: '#8f573b', border: '#998d7a' };
      } else if (themeConfig.name === 'apricot') {
        colors = isDark 
          ? { bg: '#1c1815', fg: '#e6dfd8', card: '#25201c', sidebar: '#201b18', accent: '#3d2b21', primary: '#f6b894', border: '#332a24' }
          : { bg: '#faf6ee', fg: '#4f3c32', card: '#ffffff', sidebar: '#f3ede2', accent: '#fbece0', primary: '#aa6b4f', border: '#e6ded4' };
      } else if (themeConfig.name === 'ocean') {
        colors = isDark
          ? { bg: '#0d131a', fg: '#e1e7ed', card: '#161d26', sidebar: '#121820', accent: '#1a2a3a', primary: '#72b0cf', border: '#232e3a' }
          : { bg: '#edf3f6', fg: '#2b3f4c', card: '#ffffff', sidebar: '#e2edf2', accent: '#dbe7ee', primary: '#2d607b', border: '#d0dfe5' };
      } else if (themeConfig.name === 'cyberpunk') {
        colors = isDark
          ? { bg: '#0d0a12', fg: '#ece6f2', card: '#140f1c', sidebar: '#100c16', accent: '#260e24', primary: '#ff0055', border: '#2d1633' }
          : { bg: '#faf5ff', fg: '#4a148c', card: '#ffffff', sidebar: '#f3e8ff', accent: '#f5e6ff', primary: '#9c27b0', border: '#e8d2ff' };
      } else if (themeConfig.name === 'forest') {
        colors = isDark
          ? { bg: '#0d120d', fg: '#e1ede1', card: '#141c14', sidebar: '#101610', accent: '#1a2b1a', primary: '#60b056', border: '#202e20' }
          : { bg: '#f2f6f2', fg: '#283e28', card: '#ffffff', sidebar: '#e5ece5', accent: '#dbeada', primary: '#2e6b27', border: '#cfded0' };
      } else if (themeConfig.name === 'custom') {
        colors = {
          bg: themeConfig.background || (isDark ? '#191919' : '#ffffff'),
          fg: isDark ? '#e3e3e1' : '#37352f',
          card: isDark ? '#202020' : '#ffffff',
          sidebar: themeConfig.sidebar || (isDark ? '#1e1e1e' : '#fbfbfa'),
          accent: themeConfig.accent || (isDark ? '#2f2f2f' : '#f1f1ef'),
          primary: themeConfig.primary || (isDark ? '#e3e3e1' : '#37352f'),
          border: isDark ? '#2d2d2d' : '#e9e9e7'
        };
      }

      if (colors) {
        root.style.setProperty('--background', colors.bg);
        root.style.setProperty('--foreground', colors.fg);
        root.style.setProperty('--card', colors.card);
        root.style.setProperty('--card-foreground', colors.fg);
        root.style.setProperty('--popover', colors.card);
        root.style.setProperty('--popover-foreground', colors.fg);
        root.style.setProperty('--primary', colors.primary);
        root.style.setProperty('--primary-foreground', isDark ? '#121212' : '#ffffff');
        root.style.setProperty('--sidebar', colors.sidebar);
        root.style.setProperty('--sidebar-foreground', colors.fg);
        root.style.setProperty('--sidebar-accent', colors.accent);
        root.style.setProperty('--sidebar-accent-foreground', colors.fg);
        root.style.setProperty('--accent', colors.accent);
        root.style.setProperty('--accent-foreground', colors.fg);
        root.style.setProperty('--border', colors.border);
        root.style.setProperty('--sidebar-border', colors.border);
        root.style.setProperty('--ring', colors.primary);

        // Handle extra vintage variables setting / cleaning
        if (themeConfig.name === 'vintage') {
          root.style.setProperty('--whitesmoke-100', '#f5f5f5');
          root.style.setProperty('--darkslategray-100', '#2d2d2d');
          root.style.setProperty('--darkslategray-200', 'rgba(45,47,53,0.08)');
          root.style.setProperty('--black-100', '#151617');
          root.style.setProperty('--black-200', 'rgba(0,0,0,0.15)');
          root.style.setProperty('--black-300', 'rgba(0,0,0,0)');
          root.style.setProperty('--lightslategray-100', '#878c9f');
          root.style.setProperty('--darkgray-100', '#999');
          root.style.setProperty('--antiquewhite', 'rgb(233, 223, 205)');
          root.style.setProperty('--black', 'rgb(47, 37, 29)');
          root.style.setProperty('--gray', 'rgb(153, 141, 122)');
          root.style.setProperty('--floralwhite', 'rgb(245, 244, 236)');
          root.style.setProperty('--sienna', 'rgb(143, 87, 59)');
          root.style.setProperty('--darkgray', 'rgb(187, 176, 156)');
          root.style.setProperty('--silver', 'rgb(195, 186, 173)');
          root.style.setProperty('--mediumseagreen', 'rgb(80, 198, 128)');
        } else {
          root.style.removeProperty('--whitesmoke-100');
          root.style.removeProperty('--darkslategray-100');
          root.style.removeProperty('--darkslategray-200');
          root.style.removeProperty('--black-100');
          root.style.removeProperty('--black-200');
          root.style.removeProperty('--black-300');
          root.style.removeProperty('--lightslategray-100');
          root.style.removeProperty('--darkgray-100');
          root.style.removeProperty('--antiquewhite');
          root.style.removeProperty('--black');
          root.style.removeProperty('--gray');
          root.style.removeProperty('--floralwhite');
          root.style.removeProperty('--sienna');
          root.style.removeProperty('--darkgray');
          root.style.removeProperty('--silver');
          root.style.removeProperty('--mediumseagreen');
        }
      }
    }
  }, [theme, themeConfig]);

  // Hydration & initial fetch from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setIsAppLoading(true);
      migrateAwayFromDemoLocalStorage();
      let localDocs: DocumentFile[] = [];
      let localTasks: Task[] = [];
      let localEvents: CalendarEvent[] = [];
      let localEmails: Email[] = [];
      let localConvos: Conversation[] = [];
      let localInsights: AIInsight[] = [];

      // 1. Try reading from localStorage first for immediate UI render
      try {
        const storedTheme = localStorage.getItem('nexus_theme');
        if (storedTheme === 'light' || storedTheme === 'dark') setTheme(storedTheme);

        const storedDocs = localStorage.getItem('nexus_documents');
        const storedTasks = localStorage.getItem('nexus_tasks');
        const storedEvents = localStorage.getItem('nexus_calendarEvents');
        const storedEmails = localStorage.getItem('nexus_emails');
        const storedConvos = localStorage.getItem('nexus_conversations');
        const storedInsights = localStorage.getItem('nexus_aiInsights');
        const storedInbound = localStorage.getItem('nexus_inbound_account');
        if (storedInbound) {
          const acc = JSON.parse(storedInbound);
          setInboundEmailAddress(acc.address);
        }

        if (storedDocs) localDocs = JSON.parse(storedDocs);
        if (storedTasks) localTasks = JSON.parse(storedTasks);
        if (storedEvents) localEvents = JSON.parse(storedEvents);
        if (storedEmails) localEmails = JSON.parse(storedEmails);
        if (storedConvos) localConvos = JSON.parse(storedConvos);
        if (storedInsights) localInsights = JSON.parse(storedInsights);

        if (localDocs.length > 0) setDocuments(localDocs);
        if (localTasks.length > 0) setTasks(localTasks);
        if (localEvents.length > 0) setCalendarEvents(localEvents);
        if (localEmails.length > 0) setEmails(localEmails);
        if (localConvos.length > 0) {
          setConversations(localConvos);
          setActiveConversationId(localConvos[0].id);
        }
        if (localInsights.length > 0) setInsights(localInsights);

        const storedUserStatus = localStorage.getItem('nexus_user_status');
        const storedWorkspaceInvites = localStorage.getItem('nexus_workspace_invites');
        const storedAuditLogs = localStorage.getItem('nexus_audit_logs');
        const storedFeedbackItems = localStorage.getItem('nexus_feedback_items');
        const storedAiUsage = localStorage.getItem('nexus_ai_usage');

        if (storedWorkspaceInvites) setWorkspaceInvites(JSON.parse(storedWorkspaceInvites));
        if (storedAuditLogs) setAuditLogs(JSON.parse(storedAuditLogs));
        if (storedFeedbackItems) setFeedbackItems(JSON.parse(storedFeedbackItems));
        if (storedAiUsage) setAiUsage(JSON.parse(storedAiUsage));

        if (storedUserStatus) setUserStatusState(storedUserStatus as any);
        setAllUsers([]);
        setFriendIds([]);
        setWorkspaceMembers([]);
        setTeamMessages({});

        // Load Enterprise features state
        const storedCustomStatus = localStorage.getItem('nexus_custom_status');
        const storedDnd = localStorage.getItem('nexus_dnd');
        const storedGoals = localStorage.getItem('nexus_goals');
        const storedDeals = localStorage.getItem('nexus_deals');

        if (storedCustomStatus) setCustomStatusState(storedCustomStatus);
        if (storedDnd) setDndState(JSON.parse(storedDnd));
        
        setChannels([]);
        setChannelMessages({});

        if (storedGoals) {
          setGoals(JSON.parse(storedGoals));
        } else {
          setGoals([]);
        }

        const storedRoles = localStorage.getItem('nexus_roles');
        if (storedRoles) {
          setRoles(JSON.parse(storedRoles));
        } else {
          setRoles(DEFAULT_SIGNUP_ROLES);
          localStorage.setItem('nexus_roles', JSON.stringify(DEFAULT_SIGNUP_ROLES));
        }

        const storedLoginActivities = localStorage.getItem('nexus_login_activities');
        if (storedLoginActivities) {
          setLoginActivities(JSON.parse(storedLoginActivities));
        } else {
          setLoginActivities([]);
        }

        const storedThemeConfig = localStorage.getItem('nexus_theme_config');
        if (storedThemeConfig) setThemeConfigState(JSON.parse(storedThemeConfig));

        const storedNotifications = localStorage.getItem('nexus_notifications');
        if (storedNotifications) {
          setNotifications(JSON.parse(storedNotifications));
        } else {
          setNotifications([]);
        }

        if (storedDeals) {
          setDeals(JSON.parse(storedDeals));
        } else {
          setDeals(SEED_DEALS);
          localStorage.setItem('nexus_deals', JSON.stringify(SEED_DEALS));
        }

        const storedAiInbox = localStorage.getItem('nexus_ai_inbox');
        if (storedAiInbox) {
          setAiInbox(JSON.parse(storedAiInbox));
        } else {
          setAiInbox(SEED_AI_INBOX);
          localStorage.setItem('nexus_ai_inbox', JSON.stringify(SEED_AI_INBOX));
        }

        const storedDmReactions = localStorage.getItem('nexus_dm_reactions');
        if (storedDmReactions) {
          setDmReactions(JSON.parse(storedDmReactions));
        }
      } catch (e) {
        console.error('Failed to parse from localStorage:', e);
      }

      // 2. Fetch from Supabase Database
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id;
        const currentUserEmail = session?.user?.email || '';

        const [
          docsQuery,
          tasksQuery,
          eventsQuery,
          emailsQuery,
          convosQuery,
          insightsQuery,
          channelsQuery,
          channelMessagesQuery,
          reactionsQuery,
          readsQuery,
        ] = await Promise.all([
          supabase.from('documents').select('*').order('uploaded_at', { ascending: false }),
          supabase.from('tasks').select('*').order('created_at', { ascending: false }),
          supabase.from('calendar_events').select('*'),
          supabase.from('emails').select('*').order('created_at', { ascending: false }),
          supabase.from('conversations').select('*, messages(*)'),
          supabase.from('ai_insights').select('*').order('created_at', { ascending: false }),
          supabase.from('channels').select('*').order('created_at', { ascending: true }),
          supabase.from('channel_messages').select('*').order('timestamp', { ascending: true }),
          supabase.from('message_reactions').select('*'),
          supabase.from('message_reads').select('*'),
        ]);

        if (docsQuery.error) throw docsQuery.error;
        if (tasksQuery.error) throw tasksQuery.error;
        if (eventsQuery.error) throw eventsQuery.error;
        if (emailsQuery.error) throw emailsQuery.error;
        if (convosQuery.error) throw convosQuery.error;
        if (insightsQuery.error) throw insightsQuery.error;

        const allDocs = docsQuery.data.map(mapDbDoc);
        const docs = allDocs.filter(doc => 
          !currentUserId || 
          doc.uploadedBy?.id === currentUserId || 
          doc.uploadedBy?.email === currentUserEmail
        );
        const tasks = tasksQuery.data.map(mapDbTask);
        const events = eventsQuery.data.map(mapDbEvent);
        const emails = emailsQuery.data.map(mapDbEmail);
        const convos = convosQuery.data.map(mapDbConversation);
        const fetchedInsights = insightsQuery.data.map((ins: any) => ({
          id: ins.id,
          type: ins.type as any,
          title: ins.title,
          description: ins.description,
          priority: ins.priority as any,
          timestamp: ins.created_at || new Date().toISOString(),
          createdAt: ins.created_at
        }));

        setDocuments(docs);
        setTasks(tasks);
        setCalendarEvents(events);
        setEmails(emails);
        setConversations(convos);
        setInsights(fetchedInsights);
        setIsOnline(true);

        if (convos.length > 0) {
          setActiveConversationId(convos[0].id);
        }

        // Sync authentication profiles, channels, direct messages with Supabase
        try {
          const { data: { session } } = await supabase.auth.getSession();
          let currentUserId = '';
          if (session && session.user) {
            currentUserId = session.user.id;
            let name = session.user.email?.split('@')[0] || 'User';
            let tag = '1000';
            let role = 'Member';
            
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            if (profile) {
              name = profile.username;
              tag = profile.tag;
              role = profile.role || 'Member';
              setUserStatusState(profile.status || 'online');
            }

            const authenticatedUser: Person = {
              id: session.user.id,
              name,
              email: session.user.email || '',
              avatar: '',
              role,
              tag,
              status: profile?.status || 'online',
              emailVerified: !!(session.user.email_confirmed_at || session.user.confirmed_at)
            };
            setUser(authenticatedUser);
            localStorage.setItem('nexus_user_status', authenticatedUser.status || 'online');
          }

          // Fetch all profiles from public.profiles
          let mappedProfilesList: Person[] = [];
          const { data: dbProfiles } = await supabase.from('profiles').select('*');
          if (dbProfiles && dbProfiles.length > 0) {
            mappedProfilesList = dbProfiles.map((p: any) => ({
              id: p.id,
              name: p.username,
              email: p.email,
              avatar: p.avatar || '',
              role: p.role || 'Member',
              tag: p.tag || '1000',
              status: p.status || 'offline',
              lastSeenAt: p.last_seen_at
            }));
            // Only clear allUsers if not logged in.
            // If logged in, hydrateTeamAccess will handle setting visible users correctly.
            if (!currentUserId) {
              setAllUsers([]);
            }
          }

          // Fetch team memberships and DMs involving this user.
          if (currentUserId) {
            const currentPerson = mappedProfilesList.find(profile => profile.id === currentUserId);
            if (currentPerson) await hydrateTeamAccess(currentPerson, mappedProfilesList);

            const { data: dms } = await supabase
              .from('direct_messages')
              .select('*')
              .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
              .order('created_at', { ascending: true });
            
            if (dms) {
              const messagesMapped: Record<string, ChatMessage[]> = {};
              dms.forEach((d: any) => {
                const partnerId = d.sender_id === currentUserId ? d.receiver_id : d.sender_id;
                if (!messagesMapped[partnerId]) messagesMapped[partnerId] = [];
                messagesMapped[partnerId].push({
                  id: d.id,
                  role: d.sender_id === currentUserId ? 'user' : 'assistant',
                  content: d.content,
                  timestamp: d.created_at || d.timestamp
                });
              });
              setTeamMessages(messagesMapped);
            }

            // Fetch notifications from the database
            const { data: dbNotifs } = await supabase
              .from('notifications')
              .select('*')
              .eq('user_id', currentUserId)
              .order('created_at', { ascending: false });
            if (dbNotifs) {
              setNotifications(dbNotifs.map((n: any) => ({
                id: n.id,
                title: n.title,
                message: n.message,
                type: n.type,
                read: n.read,
                requestId: n.request_id || undefined,
                timestamp: n.created_at,
                senderName: n.sender_name || 'System'
              })));
            }
          }

          // Hydrate Channels & Channel Messages from database
          if (!channelsQuery.error && channelsQuery.data) {
            const dbChs = channelsQuery.data.map((c: any) => ({
              id: c.id,
              name: c.name,
              category: c.category || 'General',
              isGroup: c.is_group || false,
              starredBy: c.starred_by || [],
              createdAt: c.created_at
            }));
            setChannels(dbChs);
          }

          if (!channelMessagesQuery.error && channelMessagesQuery.data) {
            const rawMsgs = channelMessagesQuery.data;
            const dbReactions = reactionsQuery.data || [];
            const dbReads = readsQuery.data || [];
            const messagesMapped: Record<string, ChannelMessage[]> = {};
            const replyMsgs: ChannelMessage[] = [];

            rawMsgs.forEach((dbM: any) => {
              const mapped = mapDbChannelMessage(dbM, mappedProfilesList);
              
              // Link reactions
              mapped.reactions = dbReactions
                .filter((r: any) => r.message_id === mapped.id)
                .map((r: any) => ({
                  id: r.id,
                  messageId: r.message_id,
                  userId: r.user_id,
                  emoji: r.emoji,
                  createdAt: r.created_at
                }));

              // Link reads
              mapped.reads = dbReads
                .filter((rd: any) => rd.message_id === mapped.id)
                .map((rd: any) => ({
                  messageId: rd.message_id,
                  userId: rd.user_id,
                  readAt: rd.read_at
                }));

              if (dbM.parent_id) {
                replyMsgs.push(mapped);
              } else {
                const chId = dbM.channel_id || 'c1';
                if (!messagesMapped[chId]) messagesMapped[chId] = [];
                messagesMapped[chId].push(mapped);
              }
            });

            // Link replies to parent messages
            replyMsgs.forEach((reply: any) => {
              const chId = reply.channelId || 'c1';
              const chMsgs = messagesMapped[chId] || [];
              const parent = chMsgs.find(m => m.id === reply.parentId);
              if (parent) {
                if (!parent.replies) parent.replies = [];
                parent.replies.push({
                  id: reply.id,
                  sender: reply.sender,
                  content: reply.content,
                  timestamp: reply.timestamp,
                  parentId: reply.parentId
                });
              }
            });

            setChannelMessages(messagesMapped);
          }

        } catch (authErr) {
          console.warn('Supabase profiles and channels load error:', authErr);
        }

        // Cache successful response in localStorage
        localStorage.setItem('nexus_documents', JSON.stringify(docs));
        localStorage.setItem('nexus_tasks', JSON.stringify(tasks));
        localStorage.setItem('nexus_calendarEvents', JSON.stringify(events));
        localStorage.setItem('nexus_emails', JSON.stringify(emails));
        localStorage.setItem('nexus_conversations', JSON.stringify(convos));
        localStorage.setItem('nexus_aiInsights', JSON.stringify(fetchedInsights));
      } catch (error) {
        console.warn('Supabase fetch failed, utilizing localStorage fallback:', error);
        setIsOnline(false);

        // Fall back directly to localStorage (no mock seed fallbacks!)
        const finalDocs = localDocs;
        const finalTasks = localTasks;
        const finalEvents = localEvents;
        const finalEmails = localEmails;
        const finalConvos = localConvos;
        const finalInsights = localInsights;

        setDocuments(finalDocs);
        setTasks(finalTasks);
        setCalendarEvents(finalEvents);
        setEmails(finalEmails);
        setConversations(finalConvos);
        setInsights(finalInsights);

        if (finalConvos.length > 0 && !activeConversationId) {
          setActiveConversationId(finalConvos[0].id);
        }
      } finally {
        setIsAppLoading(false);
      }
    };

    fetchData();
  }, [hydrateTeamAccess]);

  // Proactive Dynamic AI Inbox Items Generator (integrated with actual workspace items)
  useEffect(() => {
    if (isAppLoading) return;

    setAiInbox(prev => {
      let updated = false;
      const currentInbox = [...prev];

      const hasItem = (type: string, checkFn: (item: AiInboxItem) => boolean) => {
        return currentInbox.some(item => item.type === type && checkFn(item));
      };

      // 1. CRM deals -> Stage Shift suggestions
      deals.forEach(deal => {
        if (deal.stage === 'won' || deal.stage === 'lost') return;

        const nextStages: Record<string, string> = {
          lead: 'contacted',
          contacted: 'proposal',
          proposal: 'negotiation',
          negotiation: 'won'
        };
        const nextStage = nextStages[deal.stage] || 'proposal';

        const crmExists = hasItem('crm', item => item.actionData?.dealId === deal.id);
        if (!crmExists) {
          currentInbox.push({
            id: `ai-crm-${deal.id}`,
            title: 'Confirm new CRM deal stage',
            description: `Nexus noticed ${deal.company} is ready for ${nextStage.toUpperCase()}. Shift from ${deal.stage.toUpperCase()} to ${nextStage.toUpperCase()}?`,
            type: 'crm',
            status: 'pending',
            createdAt: new Date().toISOString(),
            actionData: {
              dealId: deal.id,
              targetStage: nextStage
            }
          });
          updated = true;
        }

        // 2. CRM deals -> follow-up drafts
        const emailExists = hasItem('email', item => item.actionData?.dealId === deal.id);
        if (!emailExists && deal.primaryContactEmail) {
          currentInbox.push({
            id: `ai-email-followup-${deal.id}`,
            title: 'Review follow-up email draft',
            description: `${deal.company} is waiting for follow-up details from our meeting yesterday. Draft is ready.`,
            type: 'email',
            status: 'pending',
            createdAt: new Date().toISOString(),
            actionData: {
              dealId: deal.id,
              to: deal.primaryContactEmail,
              toName: deal.primaryContactName || deal.company,
              subject: `Follow-up: ${deal.title}`,
              body: `Hi ${deal.primaryContactName || 'there'},\n\nIt was great speaking with you. I wanted to follow up on our discussion regarding ${deal.title}.\n\nLet me know if you have any questions or if we can finalize the next steps.\n\nBest regards,\nRaj`
            }
          });
          updated = true;
        }
      });

      // 3. Unreplied incoming emails
      emails.forEach(email => {
        if (email.status !== 'received') return;
        const emailExists = hasItem('email', item => item.actionData?.emailId === email.id);
        if (!emailExists) {
          currentInbox.push({
            id: `ai-email-reply-${email.id}`,
            title: 'Review email reply draft',
            description: `Draft reply to ${email.fromName || email.from} regarding "${email.subject}".`,
            type: 'email',
            status: 'pending',
            createdAt: new Date().toISOString(),
            actionData: {
              emailId: email.id,
              to: email.from || 'client@example.com',
              toName: email.fromName || email.from || 'Client',
              subject: `Re: ${email.subject}`,
              body: `Hi ${email.fromName || 'there'},\n\nThank you for reaching out. I have received your email regarding "${email.subject}" and am reviewing it.\n\nBest regards,\nRaj`
            }
          });
          updated = true;
        }
      });

      // 4. Calendar events -> meeting task extractions
      calendarEvents.forEach(event => {
        if (event.category !== 'meeting') return;
        const meetingExists = hasItem('meeting', item => item.actionData?.eventId === event.id);
        if (!meetingExists) {
          currentInbox.push({
            id: `ai-meeting-${event.id}`,
            title: 'Approve meeting summary',
            description: `Meeting "${event.title}" summarized. Nexus extracted tasks.`,
            type: 'meeting',
            status: 'pending',
            createdAt: new Date().toISOString(),
            actionData: {
              eventId: event.id,
              summary: `Discussed milestones, project schedules, and feedback templates for ${event.title}. Attendees requested next steps.`,
              extractedTasks: [
                `Follow up with attendees of ${event.title}`,
                `Review action items from ${event.title}`,
                `Update project tracker regarding ${event.title}`
              ]
            }
          });
          updated = true;
        }
      });

      if (updated) {
        localStorage.setItem('nexus_ai_inbox', JSON.stringify(currentInbox));
        return currentInbox;
      }
      return prev;
    });
  }, [deals, emails, calendarEvents, isAppLoading]);

  // Realtime subscription for direct messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('realtime_direct_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages'
        },
        (payload: any) => {
          const eventType = payload.eventType;
          if (eventType === 'INSERT') {
            const newDbMsg = payload.new;
            if (newDbMsg.sender_id === user.id || newDbMsg.receiver_id === user.id) {
              const partnerId = newDbMsg.sender_id === user.id ? newDbMsg.receiver_id : newDbMsg.sender_id;
              
              const incomingMsg: ChatMessage = {
                id: newDbMsg.id,
                role: newDbMsg.sender_id === user.id ? 'user' : 'assistant',
                content: newDbMsg.content,
                timestamp: newDbMsg.created_at || newDbMsg.timestamp,
                status: 'delivered' as const
              };

              setTeamMessages(prev => {
                const partnerMsgs = prev[partnerId] || [];
                if (partnerMsgs.some(m => m.id === incomingMsg.id)) return prev;
                
                const updated = {
                  ...prev,
                  [partnerId]: [...partnerMsgs, incomingMsg]
                };
                return updated;
              });
            }
          } else if (eventType === 'UPDATE') {
            const updatedDbMsg = payload.new;
            if (updatedDbMsg.sender_id === user.id || updatedDbMsg.receiver_id === user.id) {
              const partnerId = updatedDbMsg.sender_id === user.id ? updatedDbMsg.receiver_id : updatedDbMsg.sender_id;
              setTeamMessages(prev => {
                const partnerMsgs = prev[partnerId] || [];
                return {
                  ...prev,
                  [partnerId]: partnerMsgs.map(m => m.id === updatedDbMsg.id ? {
                    ...m,
                    content: updatedDbMsg.content,
                    editedAt: updatedDbMsg.edited_at
                  } : m)
                };
              });
            }
          } else if (eventType === 'DELETE') {
            const deletedDbMsg = payload.old;
            const deletedId = deletedDbMsg.id;
            setTeamMessages(prev => {
              const updated: Record<string, ChatMessage[]> = {};
              Object.keys(prev).forEach(partnerId => {
                updated[partnerId] = prev[partnerId].filter(m => m.id !== deletedId);
              });
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Realtime subscription for database notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('realtime_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        (payload: any) => {
          const eventType = payload.eventType;
          if (eventType === 'INSERT') {
            const n = payload.new;
            if (n.user_id !== user.id) return;
            setNotifications(prev => {
              if (prev.some(x => x.id === n.id)) return prev;
              return [{
                id: n.id,
                title: n.title,
                message: n.message,
                type: n.type,
                read: n.read,
                requestId: n.request_id || undefined,
                timestamp: n.created_at,
                senderName: n.sender_name || 'System'
              }, ...prev];
            });
          } else if (eventType === 'UPDATE') {
            const n = payload.new;
            if (n.user_id !== user.id) return;
            setNotifications(prev => prev.map(x => x.id === n.id ? {
              ...x,
              read: n.read,
              title: n.title,
              message: n.message,
              type: n.type,
              requestId: n.request_id || undefined
            } : x));
          } else if (eventType === 'DELETE') {
            const old = payload.old;
            if (old && old.id) {
              setNotifications(prev => prev.filter(x => x.id !== old.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fetch join requests and subscribe to updates when workspace changes
  useEffect(() => {
    if (!workspace || !user) {
      setJoinRequests([]);
      return;
    }

    const isAdminOrOwner = isAdminLevelRole(user.role);
    if (!isAdminOrOwner) {
      setJoinRequests([]);
      return;
    }

    const fetchJoinRequests = async () => {
      try {
        const { data, error } = await supabase
          .from('workspace_join_requests')
          .select('*')
          .eq('workspace_id', workspace.id);

        if (error) throw error;

        if (data && data.length > 0) {
          const userIds = data.map((r: any) => r.user_id);
          const { data: profiles, error: pError } = await supabase
            .from('profiles')
            .select('id, username, email')
            .in('id', userIds);

          if (pError) throw pError;

          const mapped: WorkspaceJoinRequestRecord[] = data.map((r: any) => {
            const prof = (profiles || []).find((p: any) => p.id === r.user_id);
            return {
              id: r.id,
              workspaceId: r.workspace_id,
              userId: r.user_id,
              status: r.status,
              requestedAt: r.requested_at,
              reviewedAt: r.reviewed_at || undefined,
              reviewedBy: r.reviewed_by || undefined,
              userEmail: prof?.email || 'unknown@domain.com',
              userName: prof?.username || 'Unknown',
              workspaceName: workspace.name
            };
          });

          setJoinRequests(mapped);
        } else {
          setJoinRequests([]);
        }
      } catch (err) {
        console.warn("Failed to fetch join requests:", err);
      }
    };

    fetchJoinRequests();

    const channel = supabase
      .channel(`realtime_join_requests_${workspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_join_requests',
          filter: `workspace_id=eq.${workspace.id}`
        },
        () => {
          fetchJoinRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspace?.id, user?.id, user?.role]);

  const toggleLeftSidebar = useCallback(() => setLeftSidebarOpen(p => !p), []);
  const toggleRightSidebar = useCallback(() => setRightSidebarOpen(p => !p), []);
  const toggleTheme = useCallback(() => {
    setTheme(t => {
      const next = t === 'light' ? 'dark' : 'light';
      localStorage.setItem('nexus_theme', next);
      return next;
    });
  }, []);

  // ── Advanced Real-time & Presence Subscriptions ─────────────────
  const presenceChannelRef = useRef<any>(null);

  // Refs for mention detection in realtime handlers (avoids re-subscribing)
  const activePageRef = useRef(activePage);
  activePageRef.current = activePage;
  const userRef = useRef(user);
  userRef.current = user;
  const channelsRef = useRef(channels);
  channelsRef.current = channels;
  const addNotificationRef = useRef<any>(null);
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  const myWorkspacesRef = useRef(myWorkspaces);
  myWorkspacesRef.current = myWorkspaces;
  const allUsersRef = useRef(allUsers);
  allUsersRef.current = allUsers;

  // Unified Realtime Postgres Sync
  useEffect(() => {
    const channel = supabase
      .channel('chat_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channel_messages' },
        (payload: any) => {
          const eventType = payload.eventType;
          if (eventType === 'INSERT') {
            const newDbMsg = payload.new;
            setChannelMessages(prev => {
              const chId = newDbMsg.channel_id || 'c1';
              const current = prev[chId] || [];
              if (current.some(m => m.id === newDbMsg.id)) return prev;
              const mapped = mapDbChannelMessage(newDbMsg, allUsersRef.current);
              
              if (newDbMsg.parent_id) {
                return {
                  ...prev,
                  [chId]: current.map(m => {
                    if (m.id === newDbMsg.parent_id) {
                      const replies = m.replies || [];
                      if (replies.some(r => r.id === newDbMsg.id)) return m;
                      return {
                        ...m,
                        replies: [...replies, {
                          id: newDbMsg.id,
                          sender: mapped.sender,
                          content: newDbMsg.content,
                          timestamp: newDbMsg.timestamp,
                          parentId: newDbMsg.parent_id
                        }]
                      };
                    }
                    return m;
                  })
                };
              } else {
                return {
                  ...prev,
                  [chId]: [...current, mapped]
                };
              }
            });

            // Detect if incoming message mentions the current user (via refs)
            const currentUser = userRef.current;
            if (currentUser && newDbMsg.sender_id !== currentUser.id) {
              const decryptedContent = decryptMessage(newDbMsg.content);
              if (decryptedContent.includes(`@${currentUser.name}`)) {
                const senderUser = allUsersRef.current.find(u => u.id === newDbMsg.sender_id);
                const chName = channelsRef.current.find(c => c.id === (newDbMsg.channel_id || 'c1'))?.name || 'chat';
                addNotificationRef.current({
                  senderName: senderUser?.name || 'Someone',
                  title: `Mentioned you in #${chName}`,
                  message: `${senderUser?.name || 'Someone'} mentioned you: "${decryptedContent.substring(0, 80)}"`,
                  type: 'mention',
                });
                if (activePageRef.current !== 'team-chat') {
                  setMentionBadgeCount(prev => prev + 1);
                }
              }
            }
          } else if (eventType === 'UPDATE') {
            const updatedDbMsg = payload.new;
            setChannelMessages(prev => {
              const chId = updatedDbMsg.channel_id || 'c1';
              const current = prev[chId] || [];
              return {
                ...prev,
                [chId]: current.map(m => {
                  if (m.id === updatedDbMsg.id) {
                    return {
                      ...m,
                      content: updatedDbMsg.content,
                      editedAt: updatedDbMsg.edited_at,
                      isPinned: updatedDbMsg.is_pinned,
                      pinnedBy: updatedDbMsg.pinned_by,
                      pinnedAt: updatedDbMsg.pinned_at
                    };
                  }
                  if (m.replies) {
                    return {
                      ...m,
                      replies: m.replies.map(r => r.id === updatedDbMsg.id ? { ...r, content: updatedDbMsg.content } : r)
                    };
                  }
                  return m;
                })
              };
            });
          } else if (eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setChannelMessages(prev => {
              const updated: Record<string, ChannelMessage[]> = {};
              Object.keys(prev).forEach(chId => {
                updated[chId] = prev[chId]
                  .filter(m => m.id !== deletedId)
                  .map(m => {
                    if (m.replies) {
                      return {
                        ...m,
                        replies: m.replies.filter(r => r.id !== deletedId)
                      };
                    }
                    return m;
                  });
              });
              return updated;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channels' },
        (payload: any) => {
          const eventType = payload.eventType;
          if (eventType === 'INSERT') {
            const newCh = payload.new;
            setChannels(prev => {
              if (prev.some(c => c.id === newCh.id)) return prev;
              return [...prev, {
                id: newCh.id,
                name: newCh.name,
                category: newCh.category || 'General',
                isGroup: newCh.is_group,
                starredBy: newCh.starred_by || []
              }];
            });
          } else if (eventType === 'UPDATE') {
            const updatedCh = payload.new;
            setChannels(prev => prev.map(c => c.id === updatedCh.id ? {
              ...c,
              name: updatedCh.name,
              category: updatedCh.category,
              isGroup: updatedCh.is_group,
              starredBy: updatedCh.starred_by || []
            } : c));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        (payload: any) => {
          const eventType = payload.eventType;
          if (eventType === 'INSERT') {
            const newReact = payload.new;
            setChannelMessages(prev => {
              const updated: Record<string, ChannelMessage[]> = {};
              Object.keys(prev).forEach(chId => {
                updated[chId] = prev[chId].map(m => {
                  if (m.id === newReact.message_id) {
                    const reactions = m.reactions || [];
                    if (reactions.some(r => r.id === newReact.id)) return m;
                    return {
                      ...m,
                      reactions: [...reactions, {
                        id: newReact.id,
                        messageId: newReact.message_id,
                        userId: newReact.user_id,
                        emoji: newReact.emoji
                      }]
                    };
                  }
                  return m;
                });
              });
              return updated;
            });
          } else if (eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setChannelMessages(prev => {
              const updated: Record<string, ChannelMessage[]> = {};
              Object.keys(prev).forEach(chId => {
                updated[chId] = prev[chId].map(m => ({
                  ...m,
                  reactions: (m.reactions || []).filter(r => r.id !== deletedId)
                }));
              });
              return updated;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reads' },
        (payload: any) => {
          const eventType = payload.eventType;
          if (eventType === 'INSERT') {
            const newRead = payload.new;
            setChannelMessages(prev => {
              const updated: Record<string, ChannelMessage[]> = {};
              Object.keys(prev).forEach(chId => {
                updated[chId] = prev[chId].map(m => {
                  if (m.id === newRead.message_id) {
                    const reads = m.reads || [];
                    if (reads.some(r => r.userId === newRead.user_id)) return m;
                    return {
                      ...m,
                      reads: [...reads, {
                        messageId: newRead.message_id,
                        userId: newRead.user_id
                      }]
                    };
                  }
                  return m;
                });
              });
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Workspace and Member Real-time Sync
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('workspace_realtime_sync')
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'workspaces' },
        (payload: any) => {
          const { old: oldRecord } = payload;
          const currentWs = workspaceRef.current;
          if (currentWs && oldRecord.id === currentWs.id) {
            toast.error('This workspace has been deleted.');
            setWorkspace(null);
            setMyWorkspaces(prev => prev.filter(ws => ws.id !== oldRecord.id));
            if (typeof window !== 'undefined') {
              window.location.href = '/';
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workspace_members' },
        (payload: any) => {
          const { eventType, old: oldRecord, new: newRecord } = payload;
          const memberRecord = eventType === 'DELETE' ? oldRecord : newRecord;
          const currentWs = workspaceRef.current;

          if (memberRecord.user_id === user.id) {
            const isRemoved = eventType === 'DELETE' || memberRecord.status === 'banned' || memberRecord.status === 'removed';
            if (isRemoved && currentWs && memberRecord.workspace_id === currentWs.id) {
              const action = memberRecord.status === 'banned' ? 'banned' : 'removed';
              toast.error(`You have been ${action} from this workspace.`);
              setWorkspace(null);
              setMyWorkspaces(prev => prev.filter(ws => ws.id !== currentWs.id));
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            }
          } else {
            if (currentWs && memberRecord.workspace_id === currentWs.id) {
              if (eventType === 'DELETE' || memberRecord.status === 'banned' || memberRecord.status === 'removed') {
                setWorkspaceMembers(prev => prev.filter(m => m.userId !== memberRecord.user_id));
              } else if (memberRecord.status === 'active') {
                setWorkspaceMembers(prev => {
                  const exists = prev.some(m => m.userId === memberRecord.user_id);
                  if (exists) {
                    return prev.map(m => m.userId === memberRecord.user_id ? { ...m, role: memberRecord.role || 'Member', status: memberRecord.status } : m);
                  } else {
                    return [...prev, {
                      workspaceId: memberRecord.workspace_id,
                      userId: memberRecord.user_id,
                      role: memberRecord.role || 'Member',
                      status: memberRecord.status,
                      joinedAt: memberRecord.joined_at || new Date().toISOString()
                    }];
                  }
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Presence and Typing indicators logic
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('nexus_chat_lobby');
    presenceChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const mappedPresence: Record<string, { status: string; lastSeen: string }> = {};
        Object.keys(state).forEach(id => {
          const userPresences = state[id] as any[];
          if (userPresences && userPresences.length > 0) {
            const p = userPresences[0];
            mappedPresence[p.userId] = {
              status: p.status || 'online',
              lastSeen: p.lastSeen || new Date().toISOString()
            };
          }
        });
        setOnlinePresence(mappedPresence);
      })
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        const { channelId, userId, username, isTyping } = payload.payload;
        setTypingUsers(prev => {
          const current = prev[channelId] || [];
          if (isTyping) {
            if (current.some(t => t.userId === userId)) return prev;
            return {
              ...prev,
              [channelId]: [...current, { userId, username, timestamp: Date.now() }]
            };
          } else {
            return {
              ...prev,
              [channelId]: current.filter(t => t.userId !== userId)
            };
          }
        });
      })
      .on('broadcast', { event: 'dm_reaction' }, (payload: any) => {
        const { messageId, reactions } = payload.payload;
        setDmReactions(prev => {
          const updated = {
            ...prev,
            [messageId]: reactions
          };
          localStorage.setItem('nexus_dm_reactions', JSON.stringify(updated));
          return updated;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: user.id,
            status: userStatus || 'online',
            lastSeen: new Date().toISOString()
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userStatus]);

  // ── Task Actions ───────────────────────────────────────────
  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> | Task) => {
    const newTask: Task = 'id' in task ? task : {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTasks(prev => {
      const updated = [newTask, ...prev];
      localStorage.setItem('nexus_tasks', JSON.stringify(updated));
      return updated;
    });

    try {
      const dbPayload = {
        id: newTask.id,
        title: newTask.title,
        description: newTask.description,
        status: newTask.status,
        priority: newTask.priority,
        assignee: newTask.assignee || null,
        due_date: newTask.dueDate || null,
        tags: newTask.tags,
        source_document: newTask.sourceDocument,
        subtasks: newTask.subtasks,
        created_at: newTask.createdAt,
        updated_at: newTask.updatedAt
      };

      const { error } = await supabase.from('tasks').insert(dbPayload);
      if (error) throw error;
      setIsOnline(true);
    } catch (e) {
      console.warn('Sync failed: addTask', e);
      setIsOnline(false);
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    setTasks(prev => {
      const updated = prev.filter(t => t.id !== taskId);
      localStorage.setItem('nexus_tasks', JSON.stringify(updated));
      return updated;
    });

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      setIsOnline(true);
    } catch (e) {
      console.warn('Sync failed: deleteTask', e);
      setIsOnline(false);
    }
  }, []);

  // ── Calendar Actions ───────────────────────────────────────
  const createCalendarEvent = useCallback(async (event: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: `ev-${Date.now()}`,
    };

    setCalendarEvents(prev => {
      const updated = [...prev, newEvent];
      localStorage.setItem('nexus_calendarEvents', JSON.stringify(updated));
      return updated;
    });

    try {
      const { error } = await supabase.from('calendar_events').insert({
        id: newEvent.id,
        title: newEvent.title,
        description: newEvent.description,
        date: newEvent.date,
        start_time: newEvent.startTime,
        end_time: newEvent.endTime,
        category: newEvent.category,
        attendees: newEvent.attendees,
        color: newEvent.color,
        added_to_calendar: newEvent.addedToCalendar
      });
      if (error) throw error;
      setIsOnline(true);
    } catch (error) {
      console.warn('Sync failed: createCalendarEvent', error);
      setIsOnline(false);
    }
  }, []);

  // ── Document Actions ───────────────────────────────────────
  const addDocument = useCallback(async (doc: Omit<DocumentFile, 'id' | 'uploadedAt' | 'uploadedBy'> | DocumentFile) => {
    const newDocument: DocumentFile = {
      id: (doc as any).id || `doc-${Date.now()}`,
      title: doc.title,
      type: doc.type,
      size: doc.size,
      uploadedAt: (doc as any).uploadedAt || new Date().toISOString(),
      uploadedBy: (doc as any).uploadedBy || user || { id: 'unknown', name: 'User', email: '', avatar: '', role: 'Member' },
      summary: doc.summary || 'Summary pending analysis.',
      keyPoints: doc.keyPoints || [],
      extractedTasks: doc.extractedTasks || [],
      extractedDeadlines: doc.extractedDeadlines || [],
      extractedPeople: doc.extractedPeople || [],
      extractedOrganizations: doc.extractedOrganizations || [],
      tags: doc.tags || ['uploaded'],
      thumbnail: doc.thumbnail || 'https://www.google.com/s2/favicons?domain=docs.google.com&sz=32',
      processingStatus: doc.processingStatus || 'completed',
      content: doc.content || '',
    };

    setDocuments(prev => {
      const updated = [newDocument, ...prev];
      localStorage.setItem('nexus_documents', JSON.stringify(updated));
      return updated;
    });

    // Automatically add extracted tasks to task store!
    if (user && newDocument.extractedTasks && newDocument.extractedTasks.length > 0) {
      newDocument.extractedTasks.forEach(et => {
        addTask({
          title: et.text,
          description: `Extracted from document: ${newDocument.title}`,
          status: 'todo',
          priority: 'medium',
          dueDate: et.deadline || '',
          tags: ['extracted'],
          sourceDocument: { id: newDocument.id, title: newDocument.title },
          subtasks: [],
          assignee: user,
        });
      });
    }

    // Automatically add extracted deadlines to calendar!
    if (newDocument.extractedDeadlines && newDocument.extractedDeadlines.length > 0) {
      newDocument.extractedDeadlines.forEach(ed => {
        createCalendarEvent({
          title: ed.text,
          description: `Extracted deadline from: ${newDocument.title}`,
          date: ed.date,
          startTime: '09:00',
          endTime: '10:00',
          category: 'deadline',
          attendees: [],
          color: 'indigo',
          addedToCalendar: true,
          isAiExtracted: true
        });
      });
    }
  }, [addTask, createCalendarEvent, user]);

  const deleteDocument = useCallback(async (id: string) => {
    setDocuments(prev => {
      const updated = prev.filter(d => d.id !== id);
      localStorage.setItem('nexus_documents', JSON.stringify(updated));
      return updated;
    });
    if (selectedDocumentId === id) setSelectedDocumentId(null);

    try {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;
      setIsOnline(true);
    } catch (e) {
      console.warn('Sync failed: deleteDocument', e);
      setIsOnline(false);
    }
  }, [selectedDocumentId]);

  const moveTask = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    const now = new Date().toISOString();
    setTasks(prev => {
      const updated = prev.map(t =>
        t.id === taskId ? { ...t, status: newStatus, updatedAt: now } : t
      );
      localStorage.setItem('nexus_tasks', JSON.stringify(updated));
      return updated;
    });

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, updated_at: now })
        .eq('id', taskId);
      if (error) throw error;
      setIsOnline(true);
    } catch (error) {
      console.warn('Sync failed: moveTask', error);
      setIsOnline(false);
    }
  }, []);

  const updateTask = useCallback(async (taskId: string, updatedFields: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const now = new Date().toISOString();
    setTasks(prev => {
      const updated = prev.map(t =>
        t.id === taskId ? { ...t, ...updatedFields, updatedAt: now } : t
      );
      localStorage.setItem('nexus_tasks', JSON.stringify(updated));
      return updated;
    });

    try {
      const dbFields: any = { updated_at: now };
      if (updatedFields.title !== undefined) dbFields.title = updatedFields.title;
      if (updatedFields.description !== undefined) dbFields.description = updatedFields.description;
      if (updatedFields.status !== undefined) dbFields.status = updatedFields.status;
      if (updatedFields.priority !== undefined) dbFields.priority = updatedFields.priority;
      if (updatedFields.assignee !== undefined) dbFields.assignee = updatedFields.assignee;
      if (updatedFields.dueDate !== undefined) dbFields.due_date = updatedFields.dueDate;
      if (updatedFields.tags !== undefined) dbFields.tags = updatedFields.tags;
      if (updatedFields.subtasks !== undefined) dbFields.subtasks = updatedFields.subtasks;
      if (updatedFields.budget !== undefined) dbFields.budget = updatedFields.budget;
      if (updatedFields.timeEstimate !== undefined) dbFields.time_estimate = updatedFields.timeEstimate;
      if (updatedFields.dependencies !== undefined) dbFields.dependencies = updatedFields.dependencies;

      const { error } = await supabase
        .from('tasks')
        .update(dbFields)
        .eq('id', taskId);
      if (error) throw error;
      setIsOnline(true);
    } catch (error) {
      console.warn('Sync failed: updateTask', error);
      setIsOnline(false);
    }
  }, []);

  const addEventToCalendar = useCallback(async (eventId: string) => {
    setCalendarEvents(prev => {
      const updated = prev.map(e => e.id === eventId ? { ...e, addedToCalendar: true } : e);
      localStorage.setItem('nexus_calendarEvents', JSON.stringify(updated));
      return updated;
    });

    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({ added_to_calendar: true })
        .eq('id', eventId);
      if (error) throw error;
      setIsOnline(true);
    } catch (error) {
      console.warn('Sync failed: addEventToCalendar', error);
      setIsOnline(false);
    }
  }, []);

  const updateCalendarEvent = useCallback(async (eventId: string, updatedFields: Partial<Omit<CalendarEvent, 'id'>>) => {
    setCalendarEvents(prev => {
      const updated = prev.map(e => e.id === eventId ? { ...e, ...updatedFields } : e);
      localStorage.setItem('nexus_calendarEvents', JSON.stringify(updated));
      return updated;
    });

    try {
      const dbFields: any = {};
      if (updatedFields.title !== undefined) dbFields.title = updatedFields.title;
      if (updatedFields.description !== undefined) dbFields.description = updatedFields.description;
      if (updatedFields.date !== undefined) dbFields.date = updatedFields.date;
      if (updatedFields.startTime !== undefined) dbFields.start_time = updatedFields.startTime;
      if (updatedFields.endTime !== undefined) dbFields.end_time = updatedFields.endTime;
      if (updatedFields.category !== undefined) dbFields.category = updatedFields.category;
      if (updatedFields.attendees !== undefined) dbFields.attendees = updatedFields.attendees;
      if (updatedFields.color !== undefined) dbFields.color = updatedFields.color;
      if (updatedFields.addedToCalendar !== undefined) dbFields.added_to_calendar = updatedFields.addedToCalendar;

      const { error } = await supabase
        .from('calendar_events')
        .update(dbFields)
        .eq('id', eventId);
      if (error) throw error;
      setIsOnline(true);
    } catch (error) {
      console.warn('Sync failed: updateCalendarEvent', error);
      setIsOnline(false);
    }
  }, []);

  const deleteCalendarEvent = useCallback(async (eventId: string) => {
    setCalendarEvents(prev => {
      const updated = prev.filter(e => e.id !== eventId);
      localStorage.setItem('nexus_calendarEvents', JSON.stringify(updated));
      return updated;
    });

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);
      if (error) throw error;
      setIsOnline(true);
    } catch (error) {
      console.warn('Sync failed: deleteCalendarEvent', error);
      setIsOnline(false);
    }
  }, []);

  const recordLogin = useCallback((p: Person) => {
    const newActivity: LoginActivity = {
      id: `la-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: p.id,
      userName: p.name,
      userRole: p.role,
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.1.' + Math.floor(Math.random() * 254 + 1),
      device: typeof window !== 'undefined' && navigator.userAgent.includes('Mobi') 
        ? 'Mobile (iOS/Safari)' 
        : 'Desktop (Windows/Chrome)'
    };
    setLoginActivities(prev => {
      const updated = [newActivity, ...prev];
      localStorage.setItem('nexus_login_activities', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addRole = useCallback((newRole: string) => {
    setRoles(prev => {
      if (prev.includes(newRole)) return prev;
      const updated = [...prev, newRole];
      localStorage.setItem('nexus_roles', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addGoal = useCallback((goal: Omit<GoalOKR, 'id'>) => {
    const newGoal: GoalOKR = {
      ...goal,
      id: `goal-${Date.now()}`
    };
    setGoals(prev => {
      const updated = [...prev, newGoal];
      localStorage.setItem('nexus_goals', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateGoal = useCallback((id: string, goal: Partial<GoalOKR>) => {
    setGoals(prev => {
      const updated = prev.map(g => g.id === id ? { ...g, ...goal } : g);
      localStorage.setItem('nexus_goals', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals(prev => {
      const updated = prev.filter(g => g.id !== id);
      localStorage.setItem('nexus_goals', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const setThemeConfig = useCallback((config: ThemeConfig) => {
    setThemeConfigState(config);
    localStorage.setItem('nexus_theme_config', JSON.stringify(config));
  }, []);

  const markNotificationsAsRead = useCallback(async () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem('nexus_notifications', JSON.stringify(updated));
      return updated;
    });

    if (user) {
      try {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', user.id);
      } catch (err) {
        console.warn("Failed to mark notifications as read in Supabase:", err);
      }
    }
  }, [user]);

  const addNotification = useCallback(async (n: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: NotificationItem = {
      ...n,
      id: `notif-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      localStorage.setItem('nexus_notifications', JSON.stringify(updated));
      return updated;
    });

    if (user) {
      try {
        await supabase.from('notifications').insert({
          id: newNotif.id,
          user_id: user.id,
          title: newNotif.title,
          message: newNotif.message,
          type: newNotif.type,
          read: false,
          request_id: newNotif.requestId || null,
          created_at: newNotif.timestamp
        });
      } catch (err) {
        console.warn("Failed to sync new notification to Supabase:", err);
      }
    }
  }, [user]);

  addNotificationRef.current = addNotification;

  const clearMentionBadge = useCallback(() => {
    setMentionBadgeCount(0);
  }, []);

  // ── Authentication & Dynamic Status Actions ──────────────────
  const register = useCallback(async (email: string, username: string, tag: string, role: string, password: string) => {
    let finalRole = safeSignupRole(role, false);
    try {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });
      finalRole = safeSignupRole(role, (count ?? 0) === 0);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username, tag, role: finalRole }
        }
      });
      if (error) throw error;
      if (data.user) {
        const newPerson: Person = {
          id: data.user.id,
          name: username,
          email,
          avatar: '',
          role: finalRole,
          tag,
          status: 'online',
          emailVerified: !!(data.user.email_confirmed_at || data.user.confirmed_at)
        };

        // Identify and Track Signup in PostHog Product Analytics
        identifyUser(data.user.id, {
          email,
          username,
          role: finalRole,
          tag,
        });
        trackEvent('user_signed_up', {
          userId: data.user.id,
          role: finalRole,
        });

        // Trigger welcome email via Resend endpoint
        try {
          await fetch('/api/emails/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: email,
              subject: 'Welcome to Nexus AI!',
              body: `Hello ${username},\n\nWelcome to Nexus AI! Your collaborative workspace for tasks, documents, emails, and team chat is ready.\n\nBest regards,\nThe Nexus Team`
            })
          });
        } catch (mailErr) {
          console.warn('Failed to send welcome email:', mailErr);
        }
        
        // Wrap profiles upsert in a safe try-catch so it won't crash signup if unauthenticated/blocked by RLS.
        // Also note that database trigger handles public.profiles insertion automatically, so this is just a backup.
        try {
          await supabase.from('profiles').upsert({
            id: newPerson.id,
            email: newPerson.email,
            username: newPerson.name,
            tag: newPerson.tag,
            role: newPerson.role,
            status: 'online'
          });
        } catch (profileError) {
          console.warn('Silent failure upserting profile in frontend:', profileError);
        }

        // Only log user in automatically if session is active (email verification disabled)
        if (data.session) {
          setUser(newPerson);
          setUserStatusState('online');
          setFriendIds([]);
          localStorage.setItem('nexus_user_status', 'online');
          recordLogin(newPerson);

          setAllUsers(prev => {
            const filtered = prev.filter(u => u.email !== email && u.id !== newPerson.id);
            return [...filtered, newPerson];
          });

          return { success: true, needsVerification: false };
        } else {
          // Verification email was sent, or verification is pending
          return { success: true, needsVerification: true };
        }
      }
    } catch (e: any) {
      console.warn('Supabase sign-up failed or not configured:', e);
      return { success: false, error: e.message || 'Registration failed' };
    }

    return { success: false, error: 'Registration failed' };
  }, [appendAuditLog]);

  const login = useCallback(async (usernameOrEmail: string, password: string) => {
    let resolvedEmail = usernameOrEmail;
    const parsedTagLogin = parseNameTag(usernameOrEmail);

    // 1. Resolve email if it's a username (no @ symbol)
    if (!usernameOrEmail.includes('@')) {
      try {
        let profileQuery = supabase.from('profiles').select('email');
        if (parsedTagLogin) {
          profileQuery = profileQuery
            .ilike('username', parsedTagLogin.name)
            .eq('tag', parsedTagLogin.tag);
        } else {
          profileQuery = profileQuery.eq('username', usernameOrEmail);
        }
        const { data: profile } = await profileQuery.single();
        if (profile && profile.email) {
          resolvedEmail = profile.email;
        }
      } catch (err) {
        console.warn('Could not resolve email from username in Supabase profiles:', err);
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password
      });
      if (error) throw error;
      if (data.user) {
        let name = data.user.email?.split('@')[0] || 'User';
        let tag = '1000';
        let role = 'Member';
        let profileStatus = 'online';

        // Track Login in PostHog Product Analytics
        identifyUser(data.user.id, {
          email: resolvedEmail,
          username: name
        });
        trackEvent('user_logged_in', { userId: data.user.id });
        
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          if (profile) {
            name = profile.username;
            tag = profile.tag;
            role = profile.role || 'Member';
            profileStatus = profile.status || 'online';
          }
        } catch (dbErr) {
          console.warn('Failed to fetch profile from Supabase profiles table:', dbErr);
        }

        const authenticatedUser: Person = {
          id: data.user.id,
          name,
          email: resolvedEmail,
          avatar: '',
          role,
          tag,
          status: profileStatus as 'online' | 'offline' | 'idle' | 'dnd',
          emailVerified: !!(data.user.email_confirmed_at || data.user.confirmed_at)
        };

        setUser(authenticatedUser);
        setUserStatusState(authenticatedUser.status || 'online');
        localStorage.setItem('nexus_user_status', authenticatedUser.status || 'online');
        recordLogin(authenticatedUser);

        try {
          await supabase.from('profiles').update({ status: 'online' }).eq('id', data.user.id);
        } catch (err) {}

        try {
          const { data: dbProfiles } = await supabase.from('profiles').select('*');
          const profiles = (dbProfiles || []).map((p: any) => ({
            id: p.id,
            name: p.username,
            email: p.email,
            avatar: p.avatar || '',
            role: p.role || 'Member',
            tag: p.tag || '1000',
            status: p.status || 'offline',
            lastSeenAt: p.last_seen_at
          }));
          await hydrateTeamAccess(authenticatedUser, profiles);
        } catch (err) {
          console.warn('Could not load synced team memberships:', err);
        }

        return true;
      }
    } catch (e) {
      console.warn('Supabase sign-in failed:', e);
    }

    return false;
  }, [hydrateTeamAccess]);

  const sendOtp = useCallback(async (emailOrPhone: string) => {
    const isEmail = emailOrPhone.includes('@');
    try {
      const { error } = await supabase.auth.signInWithOtp(
        isEmail
          ? {
              email: emailOrPhone,
              options: {
                emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined
              }
            }
          : {
              phone: emailOrPhone
            }
      );
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      console.warn('Supabase signInWithOtp failed:', e);
      return { success: false, error: e?.message || 'Failed to send verification code.' };
    }
  }, []);

  const verifyOtp = useCallback(async (emailOrPhone: string, token: string) => {
    const isEmail = emailOrPhone.includes('@');
    try {
      const { data, error } = await supabase.auth.verifyOtp(
        isEmail
          ? { email: emailOrPhone, token, type: 'email' }
          : { phone: emailOrPhone, token, type: 'sms' }
      );
      if (error) throw error;
      if (data.user) {
        let name = data.user.email?.split('@')[0] || 'User';
        let tag = '1000';
        let role = 'Member';
        let profileStatus = 'online';

        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          if (profile) {
            name = profile.username;
            tag = profile.tag;
            role = profile.role || 'Member';
            profileStatus = profile.status || 'online';
          } else {
            // Profile does not exist yet (new OTP registration), trigger will create it in a moment.
            // Upsert fallback to ensure the profile always exists.
            await supabase.from('profiles').upsert({
              id: data.user.id,
              email: data.user.email || emailOrPhone,
              username: name,
              tag: tag,
              role: role,
              status: 'online'
            });
          }
        } catch (dbErr) {
          console.warn('Failed to fetch profile from Supabase profiles table in verifyOtp:', dbErr);
        }

        const authenticatedUser: Person = {
          id: data.user.id,
          name,
          email: data.user.email || emailOrPhone,
          avatar: '',
          role,
          tag,
          status: profileStatus as 'online' | 'offline' | 'idle' | 'dnd',
          emailVerified: !!(data.user.email_confirmed_at || data.user.confirmed_at)
        };

        setUser(authenticatedUser);
        setUserStatusState(authenticatedUser.status || 'online');
        localStorage.setItem('nexus_user_status', authenticatedUser.status || 'online');
        recordLogin(authenticatedUser);

        try {
          await supabase.from('profiles').update({ status: 'online' }).eq('id', data.user.id);
        } catch (err) {}

        try {
          const { data: dbProfiles } = await supabase.from('profiles').select('*');
          const profiles = (dbProfiles || []).map((p: any) => ({
            id: p.id,
            name: p.username,
            email: p.email,
            avatar: p.avatar || '',
            role: p.role || 'Member',
            tag: p.tag || '1000',
            status: p.status || 'offline',
            lastSeenAt: p.last_seen_at
          }));
          await hydrateTeamAccess(authenticatedUser, profiles);
        } catch (err) {
          console.warn('Could not load synced team memberships in verifyOtp:', err);
        }

        return { success: true };
      }
      return { success: false, error: 'User session not created.' };
    } catch (e: any) {
      console.warn('Supabase verifyOtp failed:', e);
      return { success: false, error: e?.message || 'Invalid verification code.' };
    }
  }, [hydrateTeamAccess]);

  const clearWorkspaceCache = useCallback(() => {
    setUser(null);
    setUserStatusState('offline');
    setFriendIds([]);
    setDocuments([]);
    setTasks([]);
    setCalendarEvents([]);
    setEmails([]);
    setConversations([]);
    setInsights([]);
    setAllUsers([]);
    setWorkspace(null);
    setMyWorkspaces([]);
    setWorkspaceMembers([]);

    if (typeof window !== 'undefined') {
      localStorage.removeItem('nexus_user');
      localStorage.removeItem('nexus_user_status');
      localStorage.removeItem('nexus_documents');
      localStorage.removeItem('nexus_tasks');
      localStorage.removeItem('nexus_calendarEvents');
      localStorage.removeItem('nexus_emails');
      localStorage.removeItem('nexus_conversations');
      localStorage.removeItem('nexus_aiInsights');
      localStorage.removeItem('nexus_roles');
      localStorage.removeItem('nexus_login_activities');
      localStorage.removeItem('nexus_theme_config');
      localStorage.removeItem('nexus_notifications');
      localStorage.removeItem('nexus_deals');
      localStorage.removeItem('nexus_ai_inbox');
      localStorage.removeItem('nexus_workspace');
      localStorage.removeItem('nexus_workspace_members');
      localStorage.removeItem('nexus_workspace_invites');
      localStorage.removeItem('nexus_audit_logs');
      localStorage.removeItem('nexus_feedback_items');
      localStorage.removeItem('nexus_ai_usage');
    }
  }, []);

  const logout = useCallback(async (everywhere = false) => {
    try {
      if (user) {
        try {
          await supabase.from('profiles').update({ status: 'offline' }).eq('id', user.id);
        } catch (err) {}
      }
      
      // Reset PostHog session
      resetPostHog();

      if (everywhere) {
        await supabase.auth.signOut({ scope: 'global' });
      } else {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('Supabase sign out warning:', e);
      captureError(e, { context: 'signout', everywhere });
    }
    clearWorkspaceCache();
  }, [user, clearWorkspaceCache]);

  const deleteAccount = useCallback(async () => {
    if (!user) return { success: false, error: 'Not signed in' };
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers
      });
      
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to delete account');
      }
      
      // Track deletion and reset PostHog session
      trackEvent('user_deleted_account', { userId: user.id });
      resetPostHog();
      
      clearWorkspaceCache();
      
      toast.success('Your account has been deleted successfully.');
      return { success: true };
    } catch (err: any) {
      console.error('Delete account error:', err);
      captureError(err, { context: 'delete_account' });
      toast.error(err.message || 'Failed to delete account');
      return { success: false, error: err.message };
    }
  }, [user]);

  const setUserStatus = useCallback(async (status: 'online' | 'offline' | 'idle' | 'dnd') => {
    setUserStatusState(status);
    localStorage.setItem('nexus_user_status', status);

    if (user) {
      const updatedUser = { ...user, status };
      setUser(updatedUser);

      setAllUsers(prev => {
        return prev.map(u => u.id === user.id ? updatedUser : u);
      });

      try {
        await supabase
          .from('profiles')
          .update({ status })
          .eq('id', user.id);
      } catch (e) {
        console.warn('Sync user status to profiles failed:', e);
      }
    }
  }, [user]);

  const addFriendByTag = useCallback(async (nameTag: string) => {
    if (!user) return { ok: false, message: 'Sign in before adding friends.' };
    if (!isAdminLevelRole(user.role)) {
      return { ok: false, message: 'Only admins can add teammates to this team.' };
    }

    const parsed = parseNameTag(nameTag);
    if (!parsed) {
      return { ok: false, message: 'Use the format Name#1234.' };
    }

    let friend = allUsers.find((candidate) =>
      candidate.id !== user.id &&
      candidate.name.toLowerCase() === parsed.name &&
      String(candidate.tag || '').toLowerCase() === parsed.tag
    );

    if (!friend) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', parsed.name)
          .eq('tag', parsed.tag)
          .single();

        if (data && data.id !== user.id) {
          friend = {
            id: data.id,
            name: data.username,
            email: data.email,
            avatar: data.avatar || '',
            role: data.role || 'Member',
            tag: data.tag || '0000',
            status: data.status || 'offline',
            lastSeenAt: data.last_seen_at,
          };
        }
      } catch (err) {
        console.warn('Friend lookup in profiles failed:', err);
      }
    }

    if (!friend) return { ok: false, message: `No user found for ${nameTag.trim()}.` };
    if (friend.id === user.id) return { ok: false, message: 'You cannot add yourself.' };

    const activeWorkspace = workspace || {
      id: `ws-${user.id}`,
      name: `${user.name}'s Workspace`,
      slug: `${user.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workspace'}-${String(user.tag || '0000').toLowerCase()}`,
      ownerId: user.id,
      createdAt: new Date().toISOString(),
    };
    if (!workspace) {
      setWorkspace(activeWorkspace);
      await supabase.from('workspaces').upsert({
        id: activeWorkspace.id,
        name: activeWorkspace.name,
        slug: activeWorkspace.slug,
        owner_id: activeWorkspace.ownerId,
        created_at: activeWorkspace.createdAt,
      });
    }
    const alreadyMember = workspaceMembers.some(member =>
      member.workspaceId === activeWorkspace.id &&
      member.userId === friend!.id &&
      member.status === 'active'
    );
    if (alreadyMember) return { ok: true, message: `${formatPersonTag(friend)} is already on this team.`, friend };

    const newMemberships: WorkspaceMemberRecord[] = [
      {
        workspaceId: activeWorkspace.id,
        userId: friend.id,
        role: friend.role || 'Member',
        status: 'active',
        addedBy: user.id,
        joinedAt: new Date().toISOString(),
      },
      {
        workspaceId: activeWorkspace.id,
        userId: user.id,
        role: user.role,
        status: 'active',
        joinedAt: new Date().toISOString(),
      },
    ];
    setWorkspaceMembers(prev => {
      const updated = [...prev];
      newMemberships.forEach(member => {
        if (!updated.some(existing => existing.workspaceId === member.workspaceId && existing.userId === member.userId)) {
          updated.push(member);
        }
      });
      return updated;
    });
    setFriendIds(prev => prev.includes(friend!.id) ? prev : [...prev, friend!.id]);
    appendAuditLog(user, 'Add teammate', formatPersonTag(friend), activeWorkspace.id);

    try {
      await supabase.from('workspace_members').upsert(newMemberships.map(member => ({
        workspace_id: member.workspaceId,
        user_id: member.userId,
        role: member.role,
        status: member.status,
        added_by: member.addedBy || null,
        joined_at: member.joinedAt || new Date().toISOString(),
      })));
    } catch (err) {
      console.warn('Team membership sync failed:', err);
    }

    setAllUsers(prev => {
      const exists = prev.some(existing => existing.id === friend!.id);
      return exists ? prev : [...prev, friend!];
    });

    return { ok: true, message: `Added ${formatPersonTag(friend)} to ${activeWorkspace.name}.`, friend };
  }, [allUsers, appendAuditLog, user, workspace, workspaceMembers]);

  const createInviteLink = useCallback(async (email = '', role = 'Member', customCode?: string) => {
    if (!user || !workspace) return { ok: false, message: 'Create or join a workspace first.' };
    if (!isAdminLevelRole(user.role)) return { ok: false, message: 'Only admins can create invite links.' };

    const inviteCode = customCode && customCode.trim()
      ? customCode.trim().toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase();

    const invite: WorkspaceInviteRecord = {
      id: `invite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: workspace.id,
      code: inviteCode,
      email: email.trim() || undefined,
      role: isAdminLevelRole(role) ? 'Member' : role,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    setWorkspaceInvites(prev => {
      const updated = [invite, ...prev];
      localStorage.setItem('nexus_workspace_invites', JSON.stringify(updated));
      return updated;
    });
    appendAuditLog(user, 'Create invite link', invite.email || invite.code, workspace.id);

    try {
      await supabase.from('workspace_invites').insert({
        id: invite.id,
        workspace_id: invite.workspaceId,
        code: invite.code,
        email: invite.email || null,
        role: invite.role,
        created_by: invite.createdBy,
        created_at: invite.createdAt,
        expires_at: invite.expiresAt,
      });
    } catch (err) {
      console.warn('Invite sync failed, saved locally:', err);
    }

    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/invite/${invite.code}`
      : `/invite/${invite.code}`;
    return { ok: true, message: 'Invite link created.', url };
  }, [appendAuditLog, user, workspace]);

  const submitFeedback = useCallback(async (message: string, page: string = activePage) => {
    if (!user || !workspace) return { ok: false, message: 'Sign in before sending feedback.' };
    if (!message.trim()) return { ok: false, message: 'Feedback cannot be empty.' };

    const feedback: FeedbackRecord = {
      id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: workspace.id,
      userId: user.id,
      userName: user.name,
      page,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    setFeedbackItems(prev => {
      const updated = [feedback, ...prev].slice(0, 100);
      localStorage.setItem('nexus_feedback_items', JSON.stringify(updated));
      return updated;
    });
    appendAuditLog(user, 'Submit feedback', page, workspace.id);

    try {
      await supabase.from('feedback').insert({
        id: feedback.id,
        workspace_id: feedback.workspaceId,
        user_id: feedback.userId,
        user_name: feedback.userName,
        page: feedback.page,
        message: feedback.message,
        created_at: feedback.timestamp,
      });
    } catch (err) {
      console.warn('Feedback sync failed, saved locally:', err);
    }

    return { ok: true, message: 'Feedback sent. Thank you.' };
  }, [activePage, appendAuditLog, user, workspace]);

  const trackAiUsage = useCallback(async () => {
    if (!user || !workspace) return { ok: false, message: 'Sign in before using AI.' };
    const today = new Date().toISOString().slice(0, 10);
    const limit = isAdminLevelRole(user.role) ? 100 : 25;
    const existing = aiUsage.find(item => item.workspaceId === workspace.id && item.userId === user.id && item.date === today);
    const currentRequests = existing?.requests || 0;

    if (currentRequests >= limit) {
      return { ok: false, message: `Daily AI limit reached (${limit} requests).` };
    }

    const nextUsage: AiUsageRecord = {
      workspaceId: workspace.id,
      userId: user.id,
      date: today,
      requests: currentRequests + 1,
      limit,
    };

    setAiUsage(prev => {
      const updated = existing
        ? prev.map(item => item.workspaceId === workspace.id && item.userId === user.id && item.date === today ? nextUsage : item)
        : [nextUsage, ...prev];
      localStorage.setItem('nexus_ai_usage', JSON.stringify(updated));
      return updated;
    });

    try {
      await supabase.from('ai_usage').upsert({
        workspace_id: workspace.id,
        user_id: user.id,
        usage_date: today,
        requests: nextUsage?.requests || 1,
        request_limit: limit,
      });
    } catch (err) {
      console.warn('AI usage sync failed, saved locally:', err);
    }

    return { ok: true, message: 'AI usage recorded.' };
  }, [aiUsage, user, workspace]);

  const sendTeamMessage = useCallback(async (receiverId: string, content: string, media?: { url: string; name: string; type: string }) => {
    if (!user) return;
    const sharedWorkspace = workspaceMembers.some(member =>
      member.userId === user.id &&
      member.status === 'active' &&
      workspaceMembers.some(other =>
        other.workspaceId === member.workspaceId &&
        other.userId === receiverId &&
        other.status === 'active'
      )
    );
    if (!sharedWorkspace) {
      toast.error('You can only message users who share a team with you.');
      return;
    }
    const msgId = `tmsg-${Date.now()}`;
    const encryptedContent = encryptMessage(content);
    const newMsg: ChatMessage = {
      id: msgId,
      role: 'user',
      content: encryptedContent,
      timestamp: new Date().toISOString(),
      media,
      status: 'sending' as const
    };

    setTeamMessages(prev => {
      const currentDMs = prev[receiverId] || [];
      const updated = {
        ...prev,
        [receiverId]: [...currentDMs, newMsg]
      };
      return updated;
    });

    try {
      await supabase.from('direct_messages').insert({
        id: msgId,
        sender_id: user.id,
        receiver_id: receiverId,
        content: encryptedContent,
        created_at: newMsg.timestamp
      });
      setTeamMessages(prev => {
        const currentDMs = prev[receiverId] || [];
        return {
          ...prev,
          [receiverId]: currentDMs.map(m => m.id === msgId ? { ...m, status: 'delivered' as const } : m)
        };
      });
    } catch (e) {
      console.warn('Sync DM to direct_messages failed:', e);
    }

    // Detect @mentions in the DM content
    allUsers.forEach(u => {
      if (u.id !== user.id && content.includes(`@${u.name}`)) {
        const receiver = allUsers.find(r => r.id === receiverId);
        addNotification({
          senderName: user.name,
          title: `Mentioned in DM`,
          message: `${user.name} mentioned @${u.name} in a direct message`,
          type: 'mention',
        });
        if (activePage !== 'team-chat') {
          setMentionBadgeCount(prev => prev + 1);
        }
      }
    });

    const receiver = allUsers.find(u => u.id === receiverId);
    if (receiver && receiver.status === 'online' && receiverId.startsWith('p')) {
      setTimeout(() => {
        const replyId = `tmsg-reply-${Date.now()}`;
        
        const repliesByRole: Record<string, string[]> = {
          'Product Lead': [
            "Got it! Let me review the roadmap and get back to you.",
            "I'm online reviewing customer feedback, talk in a bit!",
            "Thanks for the update, let's sync tomorrow morning."
          ],
          'Engineering Manager': [
            "Understood. Let me check the deployment logs first.",
            "Perfect. I will align with the developers on this.",
            "Yes, we are on track for the sprint goals."
          ],
          'Design Director': [
            "Nice! I will take a look at the design system layouts.",
            "Got it, looking into the spacing and contrast fixes now.",
            "Awesome, I'll update the Figma prototype."
          ],
          'Senior Developer': [
            "On it. Investigating the error trace.",
            "I'm coding the API updates right now. Will ping you soon.",
            "Looks good. Let's merge it after tests pass."
          ],
          'Data Scientist': [
            "Interesting findings. Let me check the database statistics.",
            "Running the model training now. Will share metrics shortly.",
            "We can plot this distribution in the dashboard."
          ],
          'UX Researcher': [
            "Indeed, our user interviews highlighted that as well.",
            "I am compiling the research summary now.",
            "Let's schedule a review of the user testing recordings."
          ],
          'Content Strategist': [
            "Drafting the copy now. Let me know if you want to proofread it.",
            "Perfect, I will align the blog headers with the branding guidelines.",
            "Sent over the review edits."
          ]
        };

        const list = repliesByRole[receiver.role] || [
          "Hey! I'm online, how can I help you?",
          "Got your message, thanks for reaching out!",
          "Cool, talk soon!"
        ];
        
        const randomReply = list[Math.floor(Math.random() * list.length)];
        const encryptedReply = encryptMessage(randomReply);
        
        const replyMsg: ChatMessage = {
          id: replyId,
          role: 'assistant',
          content: encryptedReply,
          timestamp: new Date().toISOString()
        };

        setTeamMessages(prev => {
          const currentDMs = prev[receiverId] || [];
          const updated = {
            ...prev,
            [receiverId]: [...currentDMs, replyMsg]
          };
          return updated;
        });

        // Check if auto-reply mentions the current user - trigger notification + badge
        if (user && randomReply.includes(`@${user.name}`)) {
          addNotification({
            senderName: receiver.name,
            title: `${receiver.name} mentioned you`,
            message: `${receiver.name} mentioned you in a direct message`,
            type: 'mention',
          });
          if (activePage !== 'team-chat') {
            setMentionBadgeCount(prev => prev + 1);
          }
        }

        try {
          supabase.from('direct_messages').insert({
            id: replyId,
            sender_id: receiverId,
            receiver_id: user.id,
            content: encryptedReply,
            created_at: replyMsg.timestamp
          }).then();
        } catch (err) {}
      }, 1500);
    }
  }, [user, allUsers, workspaceMembers, addNotification, activePage]);

  // ── Enterprise Status, Channels, CRM & OKR Operations ────────
  const setCustomStatus = useCallback(async (statusText: string) => {
    setCustomStatusState(statusText);
    localStorage.setItem('nexus_custom_status', statusText);
    if (user) {
      const updated = { ...user, customStatus: statusText };
      setUser(updated);
      setAllUsers(prev => prev.map(u => u.id === user.id ? updated : u));
      try {
        await supabase.from('profiles').update({ custom_status: statusText }).eq('id', user.id);
      } catch (err) {}
    }
  }, [user]);

  const setDnd = useCallback(async (dndVal: boolean) => {
    setDndState(dndVal);
    localStorage.setItem('nexus_dnd', JSON.stringify(dndVal));
    if (user) {
      const updated = { ...user, dnd: dndVal };
      setUser(updated);
      setAllUsers(prev => prev.map(u => u.id === user.id ? updated : u));
      try {
        await supabase.from('profiles').update({ dnd: dndVal }).eq('id', user.id);
      } catch (err) {}
    }
  }, [user]);

  const updateProfile = useCallback(async (name: string, email: string, avatar: string) => {
    if (user) {
      const updated = { ...user, name, email, avatar };
      setUser(updated);
      setAllUsers(prev => prev.map(u => u.id === user.id ? updated : u));
      try {
        await supabase.from('profiles').update({
          username: name,
          email: email,
          avatar: avatar
        }).eq('id', user.id);
      } catch (err) {
        console.warn('Failed to sync profile updates to database:', err);
      }
    }
  }, [user]);

  const sendChannelMessage = useCallback(async (channelId: string, content: string, media?: { url: string; name: string; type: string }) => {
    if (!user) return;
    const encryptedContent = encryptMessage(content);
    const msgId = `cmsg-${Date.now()}`;
    const newMsg: ChannelMessage = {
      id: msgId,
      sender: user,
      content: encryptedContent,
      timestamp: new Date().toISOString(),
      media,
      replies: [],
      status: 'sending' as const
    };

    setChannelMessages(prev => {
      const current = prev[channelId] || [];
      const updated = { ...prev, [channelId]: [...current, newMsg] };
      return updated;
    });

    try {
      await supabase.from('channel_messages').insert({
        id: msgId,
        channel_id: channelId,
        sender_id: user.id,
        content: encryptedContent,
        timestamp: newMsg.timestamp,
        media
      });
      setChannelMessages(prev => {
        const current = prev[channelId] || [];
        return {
          ...prev,
          [channelId]: current.map(m => m.id === msgId ? { ...m, status: 'delivered' as const } : m)
        };
      });
    } catch (e) {
      console.warn("Sync channel message to Supabase failed:", e);
    }

    // Detect @mentions and create notifications + badge for mentioned users
    const channelName = channels.find(c => c.id === channelId)?.name || 'chat';
    allUsers.forEach(u => {
      if (u.id !== user.id && content.includes(`@${u.name}`)) {
        // In a real multi-user app, this would push to the mentioned user's notification feed.
        // For this demo, we add a notification to the current user's bell to simulate the flow.
        addNotification({
          senderName: user.name,
          title: `Mentioned in #${channelName}`,
          message: `${user.name} mentioned @${u.name}: "${decryptMessage(encryptedContent).substring(0, 80)}..."`,
          type: 'mention',
        });
        // Increment mention badge if user is not on team-chat page
        if (activePage !== 'team-chat') {
          setMentionBadgeCount(prev => prev + 1);
        }
      }
    });
  }, [user, allUsers, channels, addNotification, activePage]);

  const sendChannelReply = useCallback(async (channelId: string, messageId: string, content: string) => {
    if (!user) return;
    const encryptedContent = encryptMessage(content);
    const newReply = {
      id: `crep-${Date.now()}`,
      sender: user,
      content: encryptedContent,
      timestamp: new Date().toISOString(),
      parentId: messageId
    };

    setChannelMessages(prev => {
      const current = prev[channelId] || [];
      const updatedList = current.map(msg => {
        if (msg.id === messageId) {
          return { ...msg, replies: [...(msg.replies || []), newReply] };
        }
        return msg;
      });
      const updated = { ...prev, [channelId]: updatedList };
      return updated;
    });

    try {
      await supabase.from('channel_messages').insert({
        id: newReply.id,
        channel_id: channelId,
        sender_id: user.id,
        content: encryptedContent,
        timestamp: newReply.timestamp,
        parent_id: messageId
      });
    } catch (e) {
      console.warn("Sync channel reply to Supabase failed:", e);
    }
  }, [user]);

  const broadcastTyping = useCallback((channelId: string, isTyping: boolean) => {
    if (!user || !presenceChannelRef.current) return;
    presenceChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { channelId, userId: user.id, username: user.name, isTyping }
    });
  }, [user]);

  const createChannel = useCallback(async (name: string, category: string, isGroup = false): Promise<string> => {
    const id = `ch-${Date.now()}`;
    const newCh: Channel = {
      id,
      name,
      category,
      isGroup,
      starredBy: [],
      createdAt: new Date().toISOString()
    };
    setChannels(prev => {
      const updated = [...prev, newCh];
      return updated;
    });
    try {
      await supabase.from('channels').insert({
        id,
        name,
        category,
        is_group: isGroup,
        starred_by: [],
        workspace_id: workspace?.id || null
      });
    } catch (e) {
      console.warn("Sync create channel failed:", e);
    }
    return id;
  }, [workspace]);

  const switchWorkspace = useCallback(async (workspaceId: string) => {
    if (!user) return;
    const targetWs = myWorkspaces.find(ws => ws.id === workspaceId);
    if (!targetWs) return;

    setWorkspace(targetWs);
    try {
      const { data: memberships, error } = await supabase
        .from('workspace_members')
        .select('workspace_id, user_id, role, status, added_by, joined_at')
        .eq('workspace_id', workspaceId)
        .in('status', ['active', 'banned']);

      if (error) throw error;

      const mappedMembers: WorkspaceMemberRecord[] = (memberships || []).map(member => ({
        workspaceId: member.workspace_id,
        userId: member.user_id,
        role: member.role || 'Member',
        status: member.status as any || 'active',
        addedBy: member.added_by || undefined,
        joinedAt: member.joined_at || undefined,
      }));
      setWorkspaceMembers(mappedMembers);

      const teammateIds = Array.from(new Set(
        mappedMembers
          .filter(member => member.userId !== user.id && member.status === 'active')
          .map(member => member.userId)
      ));
      setFriendIds(teammateIds);

      const { data: dbProfiles } = await supabase.from('profiles').select('*');
      if (dbProfiles) {
        const mappedProfilesList: Person[] = dbProfiles.map((p: any) => ({
          id: p.id,
          name: p.username,
          email: p.email,
          avatar: p.avatar || '',
          role: p.role || 'Member',
          tag: p.tag || '1000',
          status: p.status || 'offline',
          lastSeenAt: p.last_seen_at
        }));
        const visibleUserIds = new Set([user.id, ...teammateIds]);
        setAllUsers(mappedProfilesList.filter(profile => visibleUserIds.has(profile.id)));
      }
      toast.success(`Switched to workspace: ${targetWs.name}`);
    } catch (err: any) {
      console.error('Failed to switch workspace:', err);
      toast.error('Failed to load workspace members.');
    }
  }, [myWorkspaces, user]);

  const createWorkspace = useCallback(async (name: string) => {
    if (!user) return false;
    try {
      const workspaceId = `ws-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newSlug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workspace'}-${Math.floor(1000 + Math.random() * 9000)}`;
      const inviteCode = Math.random().toString(36).substring(2, 11).toUpperCase();

      const { error: wsErr } = await supabase.from('workspaces').insert({
        id: workspaceId,
        name,
        slug: newSlug,
        owner_id: user.id,
        invite_code: inviteCode
      });
      if (wsErr) throw wsErr;

      const { error: memberErr } = await supabase.from('workspace_members').insert({
        workspace_id: workspaceId,
        user_id: user.id,
        role: 'Admin',
        status: 'active'
      });
      if (memberErr) throw memberErr;

      const { error: profileErr } = await supabase.from('profiles').update({
        role: 'Admin'
      }).eq('id', user.id);
      if (profileErr) throw profileErr;

      const updatedUser = { ...user, role: 'Admin' };
      setUser(updatedUser);

      const newWorkspaceRecord: WorkspaceRecord = {
        id: workspaceId,
        name,
        slug: newSlug,
        ownerId: user.id,
        createdAt: new Date().toISOString(),
        inviteCode: inviteCode
      };
      setWorkspace(newWorkspaceRecord);
      setMyWorkspaces(prev => [...prev, newWorkspaceRecord]);

      setWorkspaceMembers([{
        workspaceId,
        userId: user.id,
        role: 'Admin',
        status: 'active',
        joinedAt: new Date().toISOString()
      }]);

      appendAuditLog(updatedUser, 'Workspace created', name, workspaceId);
      toast.success(`Team "${name}" created successfully!`);
      return true;
    } catch (err: any) {
      console.error('Failed to create workspace:', err);
      toast.error(err.message || 'Failed to create workspace.');
      return false;
    }
  }, [user, appendAuditLog]);

  const joinWorkspaceByCode = useCallback(async (code: string) => {
    if (!user) return { ok: false, message: 'Please sign in first.' };
    if (!code || !code.trim()) return { ok: false, message: 'Code cannot be empty.' };

    try {
      // Try to join directly via the endpoint
      const response = await fetch('/api/invites/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      if (response.ok && data.ok) {
        const nextRole = data.role || 'Member';
        const updatedUser = { ...user, role: nextRole, emailVerified: true };
        setUser(updatedUser);

        const { data: dbProfiles } = await supabase.from('profiles').select('*');
        const profiles = (dbProfiles || []).map((p: any) => ({
          id: p.id,
          name: p.username,
          email: p.email,
          avatar: p.avatar || '',
          role: p.role || 'Member',
          tag: p.tag || '1000',
          status: p.status || 'offline',
          lastSeenAt: p.last_seen_at
        }));
        await hydrateTeamAccess(updatedUser, profiles);

        appendAuditLog(updatedUser, 'Join workspace', `Joined workspace via invite code: ${code}`, data.workspaceId);
        return { ok: true, message: data.message || 'Successfully joined the team!' };
      }

      return { ok: false, message: data.error || data.message || 'Failed to join the workspace.' };
    } catch (err: any) {
      console.error('Failed to join workspace:', err);
      return { ok: false, message: err.message || 'An error occurred while joining the team.' };
    }
  }, [user, hydrateTeamAccess, appendAuditLog]);

  const createJoinRequest = useCallback(async (code: string): Promise<{ ok: boolean; message: string; request?: WorkspaceJoinRequestRecord }> => {
    if (!user) return { ok: false, message: 'Please sign in first.' };
    if (!code || !code.trim()) return { ok: false, message: 'Code cannot be empty.' };

    try {
      const response = await fetch('/api/invites/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        return { ok: false, message: data.error || data.message || 'Failed to submit join request.' };
      }

      const req: WorkspaceJoinRequestRecord = {
        id: data.request.id,
        workspaceId: data.request.workspace_id,
        userId: data.request.user_id,
        status: data.request.status,
        requestedAt: data.request.requested_at,
        workspaceName: data.workspaceName
      };

      return { ok: true, message: data.message || 'Join request sent!', request: req };
    } catch (err: any) {
      console.error('Failed to submit join request:', err);
      return { ok: false, message: err.message || 'An error occurred.' };
    }
  }, [user]);

  const reviewJoinRequest = useCallback(async (requestId: string, status: 'approved' | 'rejected'): Promise<boolean> => {
    if (!user) return false;

    try {
      const response = await fetch('/api/invites/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId, status }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        toast.error(data.error || data.message || 'Failed to review join request.');
        return false;
      }

      toast.success(data.message || `Join request ${status} successfully.`);
      
      // Update local state for joinRequests
      setJoinRequests(prev => prev.map(req => req.id === requestId ? {
        ...req,
        status,
        reviewedAt: new Date().toISOString(),
        reviewedBy: user.id
      } : req));

      // Mark the notification related to this request as read
      setNotifications(prev => prev.map(n => n.requestId === requestId ? { ...n, read: true } : n));

      return true;
    } catch (err: any) {
      console.error('Failed to review join request:', err);
      toast.error(err.message || 'An error occurred.');
      return false;
    }
  }, [user]);

  const regenerateWorkspaceInviteCode = useCallback(async (): Promise<boolean> => {
    if (!workspace || !user) return false;
    if (!isAdminLevelRole(user.role)) {
      toast.error('Only admins can regenerate the invite code.');
      return false;
    }

    try {
      const newCode = Math.random().toString(36).substring(2, 11).toUpperCase();
      const { error } = await supabase
        .from('workspaces')
        .update({ invite_code: newCode })
        .eq('id', workspace.id);

      if (error) throw error;

      setWorkspace(prev => prev ? { ...prev, inviteCode: newCode } : null);
      toast.success('Workspace invite code regenerated successfully!');
      return true;
    } catch (err: any) {
      console.error('Failed to regenerate invite code:', err);
      toast.error(err.message || 'Failed to regenerate invite code.');
      return false;
    }
  }, [workspace, user]);

  const updateMemberRole = useCallback(async (targetUserId: string, nextRole: string) => {
    if (!user || !workspace) return false;
    if (!isAdminLevelRole(user.role)) {
      toast.error('Only admins can change team roles.');
      return false;
    }

    try {
      const { error: memberErr } = await supabase
        .from('workspace_members')
        .update({ role: nextRole })
        .eq('workspace_id', workspace.id)
        .eq('user_id', targetUserId);
      if (memberErr) throw memberErr;

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ role: nextRole })
        .eq('id', targetUserId);
      if (profileErr) throw profileErr;

      setWorkspaceMembers(prev => prev.map(member => 
        member.userId === targetUserId && member.workspaceId === workspace.id
          ? { ...member, role: nextRole }
          : member
      ));

      setAllUsers(prev => prev.map(u => 
        u.id === targetUserId 
          ? { ...u, role: nextRole }
          : u
      ));

      appendAuditLog(user, 'Toggle member authority', `${targetUserId} set to ${nextRole}`, workspace.id);
      toast.success(`Role updated successfully to ${nextRole}!`);
      return true;
    } catch (err: any) {
      console.error('Failed to update member role:', err);
      toast.error(err.message || 'Failed to update member role.');
      return false;
    }
  }, [user, workspace, appendAuditLog]);

  const removeWorkspaceMember = useCallback(async (targetUserId: string) => {
    if (!user || !workspace) return false;
    if (!isAdminLevelRole(user.role)) {
      toast.error('Only admins can remove team members.');
      return false;
    }
    if (targetUserId === workspace.ownerId) {
      toast.error('Cannot remove the workspace owner.');
      return false;
    }

    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspace.id)
        .eq('user_id', targetUserId);
      if (error) throw error;

      setWorkspaceMembers(prev => prev.filter(m => m.userId !== targetUserId));
      setFriendIds(prev => prev.filter(id => id !== targetUserId));
      setAllUsers(prev => prev.filter(u => u.id !== targetUserId));

      appendAuditLog(user, 'Remove member', `Removed user ${targetUserId}`, workspace.id);
      toast.success('Member removed successfully!');
      return true;
    } catch (err: any) {
      console.error('Failed to remove member:', err);
      toast.error(err.message || 'Failed to remove member.');
      return false;
    }
  }, [user, workspace, appendAuditLog]);

  const banWorkspaceMember = useCallback(async (targetUserId: string) => {
    if (!user || !workspace) return false;
    if (!isAdminLevelRole(user.role)) {
      toast.error('Only admins can ban team members.');
      return false;
    }
    if (targetUserId === workspace.ownerId) {
      toast.error('Cannot ban the workspace owner.');
      return false;
    }

    try {
      const { error } = await supabase
        .from('workspace_members')
        .update({ status: 'banned' })
        .eq('workspace_id', workspace.id)
        .eq('user_id', targetUserId);
      if (error) throw error;

      setWorkspaceMembers(prev => prev.map(m => m.userId === targetUserId ? { ...m, status: 'banned' as any } : m));
      setFriendIds(prev => prev.filter(id => id !== targetUserId));
      setAllUsers(prev => prev.filter(u => u.id !== targetUserId));

      appendAuditLog(user, 'Ban member', `Banned user ${targetUserId}`, workspace.id);
      toast.success('Member banned successfully!');
      return true;
    } catch (err: any) {
      console.error('Failed to ban member:', err);
      toast.error(err.message || 'Failed to ban member.');
      return false;
    }
  }, [user, workspace, appendAuditLog]);

  const unbanWorkspaceMember = useCallback(async (targetUserId: string) => {
    if (!user || !workspace) return false;
    if (!isAdminLevelRole(user.role)) {
      toast.error('Only admins can unban team members.');
      return false;
    }

    try {
      const { error } = await supabase
        .from('workspace_members')
        .update({ status: 'active' })
        .eq('workspace_id', workspace.id)
        .eq('user_id', targetUserId);
      if (error) throw error;

      setWorkspaceMembers(prev => prev.map(m => m.userId === targetUserId ? { ...m, status: 'active' as any } : m));
      
      const { data: profile } = await supabase.from('profiles').select().eq('id', targetUserId).maybeSingle();
      if (profile) {
        const personRecord: Person = {
          id: profile.id,
          name: profile.username,
          email: profile.email,
          avatar: profile.avatar || '',
          role: profile.role || 'Member',
          tag: profile.tag || '1000',
          status: profile.status || 'offline',
          lastSeenAt: profile.last_seen_at
        };
        setAllUsers(prev => {
          if (prev.some(u => u.id === targetUserId)) return prev;
          return [...prev, personRecord];
        });
        setFriendIds(prev => {
          if (prev.includes(targetUserId)) return prev;
          return [...prev, targetUserId];
        });
      }

      appendAuditLog(user, 'Unban member', `Unbanned user ${targetUserId}`, workspace.id);
      toast.success('Member unbanned successfully!');
      return true;
    } catch (err: any) {
      console.error('Failed to unban member:', err);
      toast.error(err.message || 'Failed to unban member.');
      return false;
    }
  }, [user, workspace, appendAuditLog]);

  const deleteWorkspace = useCallback(async (workspaceId: string) => {
    if (!user) return false;
    const targetWs = myWorkspaces.find(ws => ws.id === workspaceId);
    if (!targetWs) return false;
    if (targetWs.ownerId !== user.id) {
      toast.error('Only the workspace owner can delete the workspace.');
      return false;
    }

    try {
      await supabase.from('workspace_members').delete().eq('workspace_id', workspaceId);
      
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId);
      if (error) throw error;

      if (workspace && workspace.id === workspaceId) {
        setWorkspace(null);
        setActivePage('dashboard');
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }
      setMyWorkspaces(prev => prev.filter(ws => ws.id !== workspaceId));

      toast.success('Workspace deleted successfully!');
      return true;
    } catch (err: any) {
      console.error('Failed to delete workspace:', err);
      toast.error(err.message || 'Failed to delete workspace.');
      return false;
    }
  }, [user, workspace, myWorkspaces]);

  const toggleStarChannel = useCallback(async (channelId: string) => {
    if (!user) return;
    let updatedStarredBy: string[] = [];
    setChannels(prev => {
      const updated = prev.map(c => {
        if (c.id === channelId) {
          const starredBy = c.starredBy || [];
          updatedStarredBy = starredBy.includes(user.id)
            ? starredBy.filter(uid => uid !== user.id)
            : [...starredBy, user.id];
          return { ...c, starredBy: updatedStarredBy };
        }
        return c;
      });
      return updated;
    });
    try {
      await supabase.from('channels').update({ starred_by: updatedStarredBy }).eq('id', channelId);
    } catch (e) {
      console.warn("Sync star channel failed:", e);
    }
  }, [user]);

  const editChannelMessage = useCallback(async (channelId: string, messageId: string, content: string) => {
    const encryptedContent = encryptMessage(content);
    const now = new Date().toISOString();
    setChannelMessages(prev => {
      const current = prev[channelId] || [];
      const updatedList = current.map(m => {
        if (m.id === messageId) {
          return { ...m, content: encryptedContent, editedAt: now };
        }
        if (m.replies) {
          return {
            ...m,
            replies: m.replies.map(r => r.id === messageId ? { ...r, content: encryptedContent } : r)
          };
        }
        return m;
      });
      const updated = { ...prev, [channelId]: updatedList };
      return updated;
    });
    try {
      await supabase.from('channel_messages').update({ content: encryptedContent, edited_at: now }).eq('id', messageId);
    } catch (e) {
      console.warn("Sync edit message failed:", e);
    }
  }, []);

  const deleteChannelMessage = useCallback(async (channelId: string, messageId: string) => {
    setChannelMessages(prev => {
      const current = prev[channelId] || [];
      const updatedList = current
        .filter(m => m.id !== messageId)
        .map(m => {
          if (m.replies) {
            return {
              ...m,
              replies: m.replies.filter(r => r.id !== messageId)
            };
          }
          return m;
        });
      const updated = { ...prev, [channelId]: updatedList };
      return updated;
    });
    try {
      await supabase.from('channel_messages').delete().eq('id', messageId);
    } catch (e) {
      console.warn("Sync delete message failed:", e);
    }
  }, []);

  const editTeamMessage = useCallback(async (receiverId: string, messageId: string, content: string) => {
    const encryptedContent = encryptMessage(content);
    const now = new Date().toISOString();
    setTeamMessages(prev => {
      const current = prev[receiverId] || [];
      const updatedList = current.map(m => {
        if (m.id === messageId) {
          return { ...m, content: encryptedContent, editedAt: now };
        }
        return m;
      });
      return { ...prev, [receiverId]: updatedList };
    });
    try {
      await supabase.from('direct_messages').update({ content: encryptedContent, edited_at: now }).eq('id', messageId);
    } catch (e) {
      console.warn("Sync edit DM failed:", e);
    }
  }, []);

  const deleteTeamMessage = useCallback(async (receiverId: string, messageId: string) => {
    setTeamMessages(prev => {
      const current = prev[receiverId] || [];
      const updatedList = current.filter(m => m.id !== messageId);
      return { ...prev, [receiverId]: updatedList };
    });
    try {
      await supabase.from('direct_messages').delete().eq('id', messageId);
    } catch (e) {
      console.warn("Sync delete DM failed:", e);
    }
  }, []);

  const addReaction = useCallback(async (channelId: string, messageId: string, emoji: string) => {
    if (!user) return;
    const reactId = `react-${Date.now()}`;
    const newReact: MessageReaction = {
      id: reactId,
      messageId,
      userId: user.id,
      emoji
    };
    setChannelMessages(prev => {
      const current = prev[channelId] || [];
      const updatedList = current.map(m => {
        if (m.id === messageId) {
          const reactions = m.reactions || [];
          if (reactions.some(r => r.userId === user.id && r.emoji === emoji)) return m;
          return { ...m, reactions: [...reactions, newReact] };
        }
        return m;
      });
      const updated = { ...prev, [channelId]: updatedList };
      return updated;
    });
    try {
      await supabase.from('message_reactions').insert({
        id: reactId,
        message_id: messageId,
        user_id: user.id,
        emoji
      });
    } catch (e) {
      console.warn("Sync reaction failed:", e);
    }
  }, [user]);

  const removeReaction = useCallback(async (channelId: string, messageId: string, reactionId: string) => {
    setChannelMessages(prev => {
      const current = prev[channelId] || [];
      const updatedList = current.map(m => {
        if (m.id === messageId) {
          return {
            ...m,
            reactions: (m.reactions || []).filter(r => r.id !== reactionId)
          };
        }
        return m;
      });
      const updated = { ...prev, [channelId]: updatedList };
      return updated;
    });
    try {
      await supabase.from('message_reactions').delete().eq('id', reactionId);
    } catch (e) {
      console.warn("Sync delete reaction failed:", e);
    }
  }, []);

  const togglePinMessage = useCallback(async (channelId: string, messageId: string, isPinned: boolean) => {
    if (!user) return;
    const now = new Date().toISOString();
    setChannelMessages(prev => {
      const current = prev[channelId] || [];
      const updatedList = current.map(m => {
        if (m.id === messageId) {
          return {
            ...m,
            isPinned,
            pinnedBy: isPinned ? user.id : undefined,
            pinnedAt: isPinned ? now : undefined
          };
        }
        return m;
      });
      const updated = { ...prev, [channelId]: updatedList };
      return updated;
    });
    try {
      await supabase.from('channel_messages').update({
        is_pinned: isPinned,
        pinned_by: isPinned ? user.id : null,
        pinned_at: isPinned ? now : null
      }).eq('id', messageId);
    } catch (e) {
      console.warn("Sync message pin failed:", e);
    }
  }, [user]);

  const markMessageAsRead = useCallback(async (messageId: string) => {
    if (!user) return;
    try {
      await supabase.from('message_reads').upsert({
        message_id: messageId,
        user_id: user.id,
        read_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Sync message read receipt failed:", e);
    }
  }, [user]);

  const updateDealStage = useCallback(async (dealId: string, stage: Deal['stage']) => {
    setDeals(prev => {
      const updated = prev.map(d => d.id === dealId ? { ...d, stage } : d);
      localStorage.setItem('nexus_deals', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addDeal = useCallback(async (deal: Deal) => {
    setDeals(prev => {
      const updated = [...prev, deal];
      localStorage.setItem('nexus_deals', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteDeal = useCallback(async (dealId: string) => {
    setDeals(prev => {
      const updated = prev.filter(d => d.id !== dealId);
      localStorage.setItem('nexus_deals', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const syncDeals = useCallback((newDeals: Deal[]) => {
    setDeals(newDeals);
    localStorage.setItem('nexus_deals', JSON.stringify(newDeals));
  }, []);

  const addAiInboxItem = useCallback((item: Omit<AiInboxItem, 'id' | 'createdAt' | 'status'>) => {
    const newItem: AiInboxItem = {
      ...item,
      id: `ai-item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    setAiInbox(prev => {
      const next = [newItem, ...prev];
      localStorage.setItem('nexus_ai_inbox', JSON.stringify(next));
      return next;
    });
  }, []);

  const completeAiInboxItem = useCallback((id: string) => {
    setAiInbox(prev => {
      const next = prev.map(item => item.id === id ? { ...item, status: 'completed' as const } : item);
      localStorage.setItem('nexus_ai_inbox', JSON.stringify(next));
      return next;
    });
  }, []);

  const startTimer = useCallback((taskName: string) => {
    setActiveTimerTask(taskName || 'Unspecified Task');
    setIsTimerRunning(true);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsTimerRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setIsTimerRunning(false);
    setActiveTimerTask('');
    setTimerElapsed(0);
  }, []);

  const logTimer = useCallback((customTaskName?: string) => {
    const taskName = customTaskName || activeTimerTask || 'Active Task';
    if (timerElapsed > 0) {
      const mins = Math.floor(timerElapsed / 60);
      const secs = timerElapsed % 60;
      toast.success(`Logged ${mins}m ${secs}s to task: "${taskName}"`);
      
      if (user) {
        addTask({
          title: `Time Log: ${taskName}`,
          description: `Logged ${mins}m ${secs}s of work.`,
          status: 'done',
          priority: 'low',
          dueDate: new Date().toISOString().split('T')[0],
          tags: ['time-log'],
          subtasks: [],
          assignee: user,
        });
      }
    }
    resetTimer();
  }, [activeTimerTask, timerElapsed, resetTimer, addTask, user]);

  // ── Email Actions ──────────────────────────────────────────
  const addEmail = useCallback(async (email: Omit<Email, 'id' | 'createdAt'>) => {
    const newEmail: Email = {
      ...email,
      id: `em-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setEmails(prev => {
      const updated = [newEmail, ...prev];
      localStorage.setItem('nexus_emails', JSON.stringify(updated));
      return updated;
    });

    if (newEmail.status === 'sent') {
      const sendResult = await sendEmailRequest(newEmail.to, newEmail.subject, newEmail.body);
      if (sendResult && sendResult.error === 'api_key_missing') {
        setEmailRedirect({ to: newEmail.to, subject: newEmail.subject, body: newEmail.body });
      }
    }

    try {
      const { error } = await supabase.from('emails').insert({
        id: newEmail.id,
        to_name: newEmail.toName,
        "to": newEmail.to,
        from_email: newEmail.from,
        from_name: newEmail.fromName,
        subject: newEmail.subject,
        body: newEmail.body,
        status: newEmail.status,
        ai_generated: newEmail.aiGenerated,
        source_prompt: newEmail.sourcePrompt,
        created_at: newEmail.createdAt
      });
      if (error) throw error;
      setIsOnline(true);
    } catch (error) {
      console.warn('Sync failed: addEmail', error);
      setIsOnline(false);
    }
  }, []);

  const editEmail = useCallback(async (emailId: string, updatedFields: Partial<Omit<Email, 'id' | 'createdAt'>>) => {
    setEmails(prev => {
      const updated = prev.map(e => e.id === emailId ? { ...e, ...updatedFields } : e);
      localStorage.setItem('nexus_emails', JSON.stringify(updated));
      return updated;
    });

    try {
      const dbFields: any = {};
      if (updatedFields.toName !== undefined) dbFields.to_name = updatedFields.toName;
      if (updatedFields.to !== undefined) dbFields.to = updatedFields.to;
      if (updatedFields.subject !== undefined) dbFields.subject = updatedFields.subject;
      if (updatedFields.body !== undefined) dbFields.body = updatedFields.body;
      if (updatedFields.status !== undefined) dbFields.status = updatedFields.status;

      const { error } = await supabase
        .from('emails')
        .update(dbFields)
        .eq('id', emailId);
      if (error) throw error;
      setIsOnline(true);
    } catch (error) {
      console.warn('Sync failed: editEmail', error);
      setIsOnline(false);
    }
  }, []);

  const deleteEmail = useCallback(async (emailId: string) => {
    setEmails(prev => {
      const updated = prev.filter(e => e.id !== emailId);
      localStorage.setItem('nexus_emails', JSON.stringify(updated));
      return updated;
    });

    try {
      const { error } = await supabase.from('emails').delete().eq('id', emailId);
      if (error) throw error;
      setIsOnline(true);
    } catch (error) {
      console.warn('Sync failed: deleteEmail', error);
      setIsOnline(false);
    }
  }, []);

  const updateEmailStatus = useCallback(async (emailId: string, status: EmailStatus) => {
    const sentAt = status === 'sent' ? new Date().toISOString() : undefined;
    let targetEmail: Email | undefined;
    setEmails(prev => {
      targetEmail = prev.find(e => e.id === emailId);
      const updated = prev.map(e =>
        e.id === emailId
          ? { ...e, status, ...(sentAt ? { sentAt } : {}) }
          : e
      );
      localStorage.setItem('nexus_emails', JSON.stringify(updated));
      return updated;
    });

    if (status === 'sent' && targetEmail) {
      const sendResult = await sendEmailRequest(targetEmail.to, targetEmail.subject, targetEmail.body);
      if (sendResult && sendResult.error === 'api_key_missing') {
        setEmailRedirect({ to: targetEmail.to, subject: targetEmail.subject, body: targetEmail.body });
      }
    }

    try {
      const { error } = await supabase
        .from('emails')
        .update({ status })
        .eq('id', emailId);
      if (error) throw error;
      setIsOnline(true);
    } catch (error) {
      console.warn('Sync failed: updateEmailStatus', error);
      setIsOnline(false);
    }
  }, []);

  // ── Inbound Email Sync Callback ─────────────────────────────
  const syncInboundEmails = useCallback(async () => {
    setIsSyncingEmails(true);
    try {
      const account = await getOrCreateMailbox();
      if (!account) {
        setIsSyncingEmails(false);
        return;
      }
      setInboundEmailAddress(account.address);

      const listRes = await fetch('https://api.mail.tm/messages', {
        headers: {
          'Authorization': `Bearer ${account.token}`
        }
      });
      
      if (!listRes.ok) {
        throw new Error(`Failed to list Mail.tm messages: ${listRes.statusText}`);
      }

      const listData = await listRes.json();
      const messages = listData['hydra:member'] || [];

      for (const msg of messages) {
        let alreadyExists = false;
        setEmails(prev => {
          alreadyExists = prev.some(e => e.id === msg.id);
          return prev;
        });

        if (!alreadyExists) {
          const msgRes = await fetch(`https://api.mail.tm/messages/${msg.id}`, {
            headers: {
              'Authorization': `Bearer ${account.token}`
            }
          });
          
          if (msgRes.ok) {
            const msgData = await msgRes.json();
            
            const dbPayload = {
              id: msg.id,
              to_name: user?.name ?? 'Workspace',
              to: account.address,
              from_name: msg.from.name || msg.from.address,
              from_email: msg.from.address,
              subject: msg.subject || 'No Subject',
              body: msgData.text || msgData.intro || 'No content.',
              status: 'received',
              ai_generated: false,
              source_prompt: null,
              created_at: msg.createdAt || new Date().toISOString()
            };

            const { error: dbErr } = await supabase.from('emails').insert(dbPayload);
            if (dbErr && !dbErr.message.includes('duplicate key')) {
              console.error('Failed to save received email to DB:', dbErr);
            }

            const newEmail: Email = {
              id: dbPayload.id,
              toName: dbPayload.to_name,
              to: dbPayload.to,
              from: dbPayload.from_email,
              fromName: dbPayload.from_name,
              subject: dbPayload.subject,
              body: dbPayload.body,
              status: 'received',
              createdAt: dbPayload.created_at,
              aiGenerated: false
            };

            setEmails(prev => {
              if (prev.some(e => e.id === newEmail.id)) return prev;
              const updated = [newEmail, ...prev];
              localStorage.setItem('nexus_emails', JSON.stringify(updated));
              return updated;
            });
          }
        }
      }

      setIsOnline(true);
    } catch (e) {
      console.warn('Sync inbound emails error:', e);
    } finally {
      setIsSyncingEmails(false);
    }
  }, [user]);

  // Poll inbound emails on mount and periodic intervals
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      syncInboundEmails();
    }, 3000);

    const interval = setInterval(() => {
      syncInboundEmails();
    }, 30000); // 30 seconds

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [syncInboundEmails]);

  // ── Chat Actions ───────────────────────────────────────────
  const createConversation = useCallback((title: string): string => {
    const id = `conv-${Date.now()}`;
    const newConvo: Conversation = {
      id,
      title,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setConversations(prev => {
      const updated = [newConvo, ...prev];
      localStorage.setItem('nexus_conversations', JSON.stringify(updated));
      return updated;
    });
    setActiveConversationId(id);

    // Sync to Supabase in the background
    (async () => {
      try {
        const { error } = await supabase.from('conversations').insert({
          id: newConvo.id,
          title: newConvo.title,
          created_at: newConvo.createdAt,
          updated_at: newConvo.updatedAt
        });
        if (error) throw error;
        setIsOnline(true);
      } catch (error) {
        console.warn('Sync failed: createConversation', error);
        setIsOnline(false);
      }
    })();

    return id;
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== conversationId);
      localStorage.setItem('nexus_conversations', JSON.stringify(updated));
      return updated;
    });
    if (activeConversationId === conversationId) {
      setActiveConversationId(conversations.find(c => c.id !== conversationId)?.id || null);
    }

    try {
      const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
      if (error) throw error;
      setIsOnline(true);
    } catch (error) {
      console.warn('Sync failed: deleteConversation', error);
      setIsOnline(false);
    }
  }, [activeConversationId, conversations]);

  const addMessage = useCallback(async (conversationId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    setConversations(prev => {
      const updated = prev.map(c => {
        if (c.id === conversationId) {
          return {
            ...c,
            messages: [...c.messages, newMessage],
            updatedAt: newMessage.timestamp,
          };
        }
        return c;
      });
      localStorage.setItem('nexus_conversations', JSON.stringify(updated));
      return updated;
    });

    try {
      const { error: msgErr } = await supabase.from('messages').insert({
        id: newMessage.id,
        conversation_id: conversationId,
        role: newMessage.role,
        content: encryptMessage(newMessage.content),
        timestamp: newMessage.timestamp,
        sources: newMessage.sources || null
      });
      if (msgErr) throw msgErr;

      const { error: convErr } = await supabase
        .from('conversations')
        .update({ updated_at: newMessage.timestamp })
        .eq('id', conversationId);
      if (convErr) throw convErr;

      setIsOnline(true);
    } catch (error) {
      console.warn('Sync failed: addMessage', error);
      setIsOnline(false);
    }
  }, []);

  const value: WorkspaceState = {
    activePage, setActivePage,
    leftSidebarOpen, toggleLeftSidebar,
    rightSidebarOpen, toggleRightSidebar,
    isOnline,
    isAppLoading,
    documents, addDocument, deleteDocument, selectedDocumentId, setSelectedDocumentId,
    tasks, addTask, deleteTask, moveTask, updateTask, taskView, setTaskView, selectedTaskId, setSelectedTaskId,
    calendarEvents, selectedDate, setSelectedDate, addEventToCalendar, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent,
    user, userStatus, allUsers, friendIds, canManageTeamMembers,
    workspace, setWorkspace, myWorkspaces, workspaceMembers, workspaceInvites, joinRequests, auditLogs, feedbackItems, aiUsage,
    createInviteLink, submitFeedback, trackAiUsage,
    teamMessages, login, sendOtp, verifyOtp, register, logout, setUserStatus, addFriendByTag, sendTeamMessage,
    editTeamMessage, deleteTeamMessage,
    customStatus, dnd, setCustomStatus, setDnd,
    channels, channelMessages, sendChannelMessage, sendChannelReply, activeChannelId, setActiveChannelId, activeDmUserId, setActiveDmUserId,
    goals, addGoal, updateGoal, deleteGoal,
    roles, addRole,
    loginActivities,
    deals, updateDealStage, addDeal, deleteDeal, selectedDealId, setSelectedDealId, syncDeals,
    activeTimerTask, isTimerRunning, timerElapsed, startTimer, pauseTimer, resetTimer, logTimer,
    emails, addEmail, editEmail, deleteEmail, updateEmailStatus,
    inboundEmailAddress, isSyncingEmails, syncInboundEmails,
    emailRedirect, setEmailRedirect,
    conversations, activeConversationId, setActiveConversationId, addMessage, createConversation, deleteConversation,
    insights,
    theme, toggleTheme,
    themeConfig, setThemeConfig,
    notifications, markNotificationsAsRead, addNotification,
    mentionBadgeCount, clearMentionBadge,
    aiInbox, addAiInboxItem, completeAiInboxItem,
    searchQuery, setSearchQuery,
    commandPaletteOpen, setCommandPaletteOpen,
    typingUsers, onlinePresence, broadcastTyping, dmReactions, setDmReactions,
    toggleStarChannel, editChannelMessage, deleteChannelMessage,
    addReaction, removeReaction, togglePinMessage, markMessageAsRead, createChannel,
    createWorkspace, joinWorkspaceByCode, createJoinRequest, reviewJoinRequest, regenerateWorkspaceInviteCode, updateMemberRole, switchWorkspace,
    removeWorkspaceMember, banWorkspaceMember, unbanWorkspaceMember, deleteWorkspace,
    updateProfile, deleteAccount,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return context;
}
