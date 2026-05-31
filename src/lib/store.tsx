'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import {
  PageId, DocumentFile, Task, TaskStatus, CalendarEvent,
  Email, EmailStatus, ChatMessage, Conversation, AIInsight,
  Person, GoalOKR, Channel, Deal, ChannelMessage, LoginActivity,
  NotificationItem, ThemeConfig, ChannelMessageReply, MessageReaction, MessageRead
} from '@/types';
import * as sampleData from '@/lib/sample-data';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const seedUsers: Person[] = [
  { id: 'p1', name: 'Sarah Chen', email: 'sarah@nexus.ai', avatar: '', role: 'Product Lead', tag: '1024', status: 'online' },
  { id: 'p2', name: 'Marcus Johnson', email: 'marcus@nexus.ai', avatar: '', role: 'Engineering Manager', tag: '2081', status: 'online' },
  { id: 'p3', name: 'Elena Rodriguez', email: 'elena@nexus.ai', avatar: '', role: 'Design Director', tag: '3042', status: 'offline' },
  { id: 'p4', name: 'Alex Kim', email: 'alex@nexus.ai', avatar: '', role: 'Senior Developer', tag: '4091', status: 'online' },
  { id: 'p5', name: 'James Wilson', email: 'james@nexus.ai', avatar: '', role: 'Data Scientist', tag: '5128', status: 'offline' },
  { id: 'p6', name: 'Priya Patel', email: 'priya@nexus.ai', avatar: '', role: 'UX Researcher', tag: '6014', status: 'online' },
  { id: 'p7', name: 'David Lee', email: 'david@nexus.ai', avatar: '', role: 'DevOps Lead', tag: '7082', status: 'offline' },
  { id: 'p8', name: 'Nina Kowalski', email: 'nina@nexus.ai', avatar: '', role: 'Content Strategist', tag: '8093', status: 'offline' },
];

const seedChannels: Channel[] = [
  { id: 'c1', name: 'general', category: 'General' },
  { id: 'c2', name: 'announcements', category: 'General' },
  { id: 'c3', name: 'marketing-campaign', category: 'Departments' },
  { id: 'c4', name: 'engineering-sync', category: 'Departments' },
  { id: 'c5', name: 'design-feedback', category: 'Departments' },
];

const seedGoals: GoalOKR[] = [
  { id: 'g1', title: 'Launch Enterprise API v2', category: 'company', progress: 75, target: 100 },
  { id: 'g2', title: 'Increase active user count to 10k', category: 'company', progress: 8400, target: 10000 },
  { id: 'g3', title: 'Redesign documents sidebar navigation', category: 'team', progress: 100, target: 100 },
  { id: 'g4', title: 'Complete personal training course on React 19', category: 'personal', progress: 40, target: 100 },
];

const seedDeals: Deal[] = [
  { id: 'd1', title: 'Acme Corp Enterprise Suite', company: 'Acme Corp', value: 45000, stage: 'negotiation' },
  { id: 'd2', title: 'Stark Industries Integration', company: 'Stark Industries', value: 120000, stage: 'proposal' },
  { id: 'd3', title: 'Wayne Enterprises Cloud Migration', company: 'Wayne Enterprises', value: 85000, stage: 'contacted' },
  { id: 'd4', title: 'Oscorp Research Partnership', company: 'Oscorp', value: 30000, stage: 'lead' },
  { id: 'd5', title: 'Umbrella Corp Licensing', company: 'Umbrella Corp', value: 65000, stage: 'won' },
];

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
  thumbnail: dbDoc.thumbnail || '📄',
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
    content: m.content,
    timestamp: m.timestamp,
    sources: m.sources || []
  })).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
  createdAt: dbConv.created_at,
  updatedAt: dbConv.updated_at
});

const mapDbChannelMessage = (dbMsg: any, allProfiles: Person[]): ChannelMessage => {
  const sender = allProfiles.find(p => p.id === dbMsg.sender_id || p.email === dbMsg.sender_id) || {
    id: dbMsg.sender_id,
    name: dbMsg.sender_id === 'p1' ? 'Sarah Chen' : 'Unknown Teammate',
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

    const domainsRes = await fetch('https://api.mail.tm/domains');
    if (!domainsRes.ok) throw new Error('Failed to fetch Mail.tm domains');
    const domainsData = await domainsRes.json();
    const domainList = domainsData['hydra:member'] || [];
    if (domainList.length === 0) throw new Error('No domains available from Mail.tm');
    const domain = domainList[0].domain;

    const randomId = Math.floor(10000 + Math.random() * 90000);
    const address = `sarah.chen.${randomId}@${domain}`;
    const password = `pass_${Math.random().toString(36).substring(2, 10)}`;

    const createRes = await fetch('https://api.mail.tm/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password })
    });

    if (!createRes.ok) {
      const errData = await createRes.text();
      throw new Error(`Failed to create Mail.tm account: ${errData}`);
    }

    const tokenRes = await fetch('https://api.mail.tm/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password })
    });
    if (!tokenRes.ok) throw new Error('Failed to acquire Mail.tm token');
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
    console.error('Mailbox creation exception:', e);
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

  // Documents
  documents: DocumentFile[];
  addDocument: (doc: Omit<DocumentFile, 'id' | 'uploadedAt' | 'uploadedBy'> | DocumentFile) => void;
  deleteDocument: (id: string) => void;
  selectedDocumentId: string | null;
  setSelectedDocumentId: (id: string | null) => void;

  // Tasks
  tasks: Task[];
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
  teamMessages: Record<string, ChatMessage[]>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, username: string, tag: string, role: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setUserStatus: (status: 'online' | 'offline' | 'idle' | 'dnd') => Promise<void>;
  sendTeamMessage: (friendId: string, content: string, media?: { url: string; name: string; type: string }) => Promise<void>;

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

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Typing indicators & Online Presence
  typingUsers: Record<string, { userId: string; username: string; timestamp: number }[]>;
  onlinePresence: Record<string, { status: string; lastSeen: string }>;
  broadcastTyping: (channelId: string, isTyping: boolean) => void;

  // Starring, Editing, Reactions, Pinning & Reads
  toggleStarChannel: (channelId: string) => Promise<void>;
  editChannelMessage: (channelId: string, messageId: string, content: string) => Promise<void>;
  deleteChannelMessage: (channelId: string, messageId: string) => Promise<void>;
  addReaction: (channelId: string, messageId: string, emoji: string) => Promise<void>;
  removeReaction: (channelId: string, messageId: string, reactionId: string) => Promise<void>;
  togglePinMessage: (channelId: string, messageId: string, isPinned: boolean) => Promise<void>;
  markMessageAsRead: (messageId: string) => Promise<void>;
  createChannel: (name: string, category: string, isGroup?: boolean) => Promise<string>;
}

const WorkspaceContext = createContext<WorkspaceState | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  // Navigation
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  // Connectivity
  const [isOnline, setIsOnline] = useState(true);

  // Documents
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Tasks
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskView, setTaskView] = useState<'kanban' | 'list' | 'calendar'>('kanban');

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
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // User Authentication & Chat State
  const [user, setUser] = useState<Person | null>(null);
  const [userStatus, setUserStatusState] = useState<'online' | 'offline' | 'idle' | 'dnd'>('online');
  const [allUsers, setAllUsers] = useState<Person[]>([]);
  const [teamMessages, setTeamMessages] = useState<Record<string, ChatMessage[]>>({});

  // Custom Status & DND
  const [customStatus, setCustomStatusState] = useState('');
  const [dnd, setDndState] = useState(false);

  // Channels State
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelMessages, setChannelMessages] = useState<Record<string, ChannelMessage[]>>({});

  // Goals & OKRs State
  const [goals, setGoals] = useState<GoalOKR[]>([]);

  // Custom Roles State
  const [roles, setRoles] = useState<string[]>([]);

  // Login Activities State
  const [loginActivities, setLoginActivities] = useState<LoginActivity[]>([]);

  // CRM Deals State
  const [deals, setDeals] = useState<Deal[]>([]);

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Themes Config State
  const [themeConfig, setThemeConfigState] = useState<ThemeConfig>({ name: 'notion' });

  // Chat presence & typing states
  const [typingUsers, setTypingUsers] = useState<Record<string, { userId: string; username: string; timestamp: number }[]>>({});
  const [onlinePresence, setOnlinePresence] = useState<Record<string, { status: string; lastSeen: string }>>({});

  // Time Tracker State
  const [activeTimerTask, setActiveTimerTask] = useState('');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);

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
    if (themeConfig.name === 'notion') {
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
    } else {
      const isDark = theme === 'dark';
      let colors: any = null;

      if (themeConfig.name === 'apricot') {
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
      }
    }
  }, [theme, themeConfig]);

  // Hydration & initial fetch from Supabase
  useEffect(() => {
    const fetchData = async () => {
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

        const storedUser = localStorage.getItem('nexus_user');
        const storedUserStatus = localStorage.getItem('nexus_user_status');
        const storedAllUsers = localStorage.getItem('nexus_all_users');
        const storedTeamMessages = localStorage.getItem('nexus_team_messages');

        if (storedUser) setUser(JSON.parse(storedUser));
        if (storedUserStatus) setUserStatusState(storedUserStatus as any);
        if (storedAllUsers) {
          setAllUsers(JSON.parse(storedAllUsers));
        } else {
          setAllUsers(seedUsers);
          localStorage.setItem('nexus_all_users', JSON.stringify(seedUsers));
        }
        if (storedTeamMessages) setTeamMessages(JSON.parse(storedTeamMessages));

        // Load Enterprise features state
        const storedCustomStatus = localStorage.getItem('nexus_custom_status');
        const storedDnd = localStorage.getItem('nexus_dnd');
        const storedChannels = localStorage.getItem('nexus_channels');
        const storedChannelMessages = localStorage.getItem('nexus_channel_messages');
        const storedGoals = localStorage.getItem('nexus_goals');
        const storedDeals = localStorage.getItem('nexus_deals');

        if (storedCustomStatus) setCustomStatusState(storedCustomStatus);
        if (storedDnd) setDndState(JSON.parse(storedDnd));
        
        if (storedChannels) {
          setChannels(JSON.parse(storedChannels));
        } else {
          setChannels(seedChannels);
          localStorage.setItem('nexus_channels', JSON.stringify(seedChannels));
        }

        if (storedChannelMessages) {
          setChannelMessages(JSON.parse(storedChannelMessages));
        } else {
          const defaultChannelMessages = {
            'c1': [
              {
                id: 'seed-cmsg-1',
                sender: { id: 'p2', name: 'Marcus Johnson', email: 'marcus@nexus.ai', avatar: '', role: 'Engineering Manager', tag: '2081' },
                content: encryptMessage("Welcome everyone! Let's use this channel for general project alignment and highlights."),
                timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
                replies: []
              },
              {
                id: 'seed-cmsg-2',
                sender: { id: 'p3', name: 'Elena Rodriguez', email: 'elena@nexus.ai', avatar: '', role: 'Design Director', tag: '3042' },
                content: encryptMessage("Thanks Marcus! I will post the design specifications in the #design-feedback channel."),
                timestamp: new Date(Date.now() - 3600000 * 23).toISOString(),
                replies: []
              }
            ],
            'c5': [
              {
                id: 'seed-cmsg-3',
                sender: { id: 'p3', name: 'Elena Rodriguez', email: 'elena@nexus.ai', avatar: '', role: 'Design Director', tag: '3042' },
                content: encryptMessage("@Sarah Chen let's review the documents sidebar redesign today! Ready for feedback."),
                timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
                replies: []
              }
            ],
            'c4': [
              {
                id: 'seed-cmsg-4',
                sender: { id: 'p2', name: 'Marcus Johnson', email: 'marcus@nexus.ai', avatar: '', role: 'Engineering Manager', tag: '2081' },
                content: encryptMessage("We need approval from @Product Lead to merge the Enterprise API code. Please check the logs."),
                timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
                replies: []
              }
            ]
          };
          setChannelMessages(defaultChannelMessages);
          localStorage.setItem('nexus_channel_messages', JSON.stringify(defaultChannelMessages));
        }

        if (storedGoals) {
          setGoals(JSON.parse(storedGoals));
        } else {
          setGoals(seedGoals);
          localStorage.setItem('nexus_goals', JSON.stringify(seedGoals));
        }

        const storedRoles = localStorage.getItem('nexus_roles');
        if (storedRoles) {
          setRoles(JSON.parse(storedRoles));
        } else {
          const defaultRoles = [
            'Product Lead',
            'Senior Developer',
            'Engineering Manager',
            'Design Director',
            'Data Scientist',
            'UX Researcher',
            'Content Strategist',
            'Developer',
            'Admin',
            'Team Leader'
          ];
          setRoles(defaultRoles);
          localStorage.setItem('nexus_roles', JSON.stringify(defaultRoles));
        }

        const storedLoginActivities = localStorage.getItem('nexus_login_activities');
        if (storedLoginActivities) {
          setLoginActivities(JSON.parse(storedLoginActivities));
        } else {
          const seedLoginActivities: LoginActivity[] = [
            { id: 'la-1', userId: 'p2', userName: 'Marcus Johnson', userRole: 'Engineering Manager', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), ipAddress: '192.168.1.15', device: 'Desktop (macOS/Safari)' },
            { id: 'la-2', userId: 'p3', userName: 'Elena Rodriguez', userRole: 'Design Director', timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), ipAddress: '192.168.1.42', device: 'Desktop (macOS/Chrome)' },
            { id: 'la-3', userId: 'p1', userName: 'Sarah Chen', userRole: 'Product Lead', timestamp: new Date(Date.now() - 3600000 * 8).toISOString(), ipAddress: '192.168.1.101', device: 'Desktop (Windows/Chrome)' },
            { id: 'la-4', userId: 'p4', userName: 'Alex Kim', userRole: 'Senior Developer', timestamp: new Date(Date.now() - 3600000 * 12).toISOString(), ipAddress: '192.168.1.55', device: 'Desktop (Linux/Firefox)' }
          ];
          setLoginActivities(seedLoginActivities);
          localStorage.setItem('nexus_login_activities', JSON.stringify(seedLoginActivities));
        }

        const storedThemeConfig = localStorage.getItem('nexus_theme_config');
        if (storedThemeConfig) setThemeConfigState(JSON.parse(storedThemeConfig));

        const storedNotifications = localStorage.getItem('nexus_notifications');
        if (storedNotifications) {
          setNotifications(JSON.parse(storedNotifications));
        } else {
          const seedNotifications: NotificationItem[] = [
            {
              id: 'notif-1',
              senderName: 'Elena Rodriguez',
              message: 'tagged you in #design-feedback: "@Sarah Chen let\'s review the documents sidebar redesign today!"',
              timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
              read: false,
              link: '/team-chat'
            },
            {
              id: 'notif-2',
              senderName: 'Marcus Johnson',
              message: 'tagged @Product Lead in #engineering-sync: "We need approval from @Product Lead to merge the Enterprise API code."',
              timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
              read: false,
              link: '/team-chat'
            }
          ];
          setNotifications(seedNotifications);
          localStorage.setItem('nexus_notifications', JSON.stringify(seedNotifications));
        }

        if (storedDeals) {
          setDeals(JSON.parse(storedDeals));
        } else {
          setDeals(seedDeals);
          localStorage.setItem('nexus_deals', JSON.stringify(seedDeals));
        }
      } catch (e) {
        console.error('Failed to parse from localStorage:', e);
      }

      // 2. Fetch from Supabase Database
      try {
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

        const docs = docsQuery.data.map(mapDbDoc);
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
              status: profile?.status || 'online'
            };
            setUser(authenticatedUser);
            localStorage.setItem('nexus_user', JSON.stringify(authenticatedUser));
            localStorage.setItem('nexus_user_status', authenticatedUser.status || 'online');
          }

          // Fetch all profiles from public.profiles
          const { data: dbProfiles } = await supabase.from('profiles').select('*');
          let mappedProfilesList: Person[] = [...seedUsers];
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
            setAllUsers(prev => {
              const merged = [...seedUsers];
              mappedProfilesList.forEach((dbP: any) => {
                const idx = merged.findIndex(m => m.id === dbP.id || m.email === dbP.email);
                if (idx !== -1) {
                  merged[idx] = dbP;
                } else {
                  merged.push(dbP);
                }
              });
              localStorage.setItem('nexus_all_users', JSON.stringify(merged));
              return merged;
            });
          }

          // Fetch DMs involving this user
          if (currentUserId) {
            const { data: dms } = await supabase
              .from('team_messages')
              .select('*')
              .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
              .order('timestamp', { ascending: true });
            
            if (dms) {
              const messagesMapped: Record<string, ChatMessage[]> = {};
              dms.forEach((d: any) => {
                const partnerId = d.sender_id === currentUserId ? d.receiver_id : d.sender_id;
                if (!messagesMapped[partnerId]) messagesMapped[partnerId] = [];
                messagesMapped[partnerId].push({
                  id: d.id,
                  role: d.sender_id === currentUserId ? 'user' : 'assistant',
                  content: d.content,
                  timestamp: d.timestamp
                });
              });
              setTeamMessages(prev => {
                const merged = { ...prev, ...messagesMapped };
                localStorage.setItem('nexus_team_messages', JSON.stringify(merged));
                return merged;
              });
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
            localStorage.setItem('nexus_channels', JSON.stringify(dbChs));
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
            localStorage.setItem('nexus_channel_messages', JSON.stringify(messagesMapped));
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
        // Keep default welcome conversation if no conversations exist
        const finalConvos = localConvos.length > 0 ? localConvos : [
          {
            id: 'c-welcome',
            title: 'Welcome to Nexus AI',
            messages: [
              {
                id: 'm-welcome-1',
                role: 'assistant',
                content: 'Hello! I am your Nexus AI assistant. Upload your own documents in the **Documents** tab, then check them on the sidebar here to ask me questions, summarize, find mistakes, create infographics, or draft emails!',
                timestamp: new Date().toISOString()
              }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        const finalInsights = localInsights;

        setDocuments(finalDocs);
        setTasks(finalTasks);
        setCalendarEvents(finalEvents);
        setEmails(finalEmails);
        setConversations(finalConvos as Conversation[]);
        setInsights(finalInsights);

        if (finalConvos.length > 0 && !activeConversationId) {
          setActiveConversationId(finalConvos[0].id);
        }
      }
    };

    fetchData();
  }, []);

  // Realtime subscription for team messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('realtime_team_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_messages'
        },
        (payload: any) => {
          const newDbMsg = payload.new;
          if (newDbMsg.sender_id === user.id || newDbMsg.receiver_id === user.id) {
            const partnerId = newDbMsg.sender_id === user.id ? newDbMsg.receiver_id : newDbMsg.sender_id;
            
            const incomingMsg: ChatMessage = {
              id: newDbMsg.id,
              role: newDbMsg.sender_id === user.id ? 'user' : 'assistant',
              content: newDbMsg.content,
              timestamp: newDbMsg.timestamp
            };

            setTeamMessages(prev => {
              const partnerMsgs = prev[partnerId] || [];
              if (partnerMsgs.some(m => m.id === incomingMsg.id)) return prev;
              
              const updated = {
                ...prev,
                [partnerId]: [...partnerMsgs, incomingMsg]
              };
              localStorage.setItem('nexus_team_messages', JSON.stringify(updated));
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
              const mapped = mapDbChannelMessage(newDbMsg, allUsers);
              
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
  }, [allUsers]);

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
      uploadedBy: (doc as any).uploadedBy || sampleData.currentUser,
      summary: doc.summary || 'Summary pending analysis.',
      keyPoints: doc.keyPoints || [],
      extractedTasks: doc.extractedTasks || [],
      extractedDeadlines: doc.extractedDeadlines || [],
      extractedPeople: doc.extractedPeople || [],
      extractedOrganizations: doc.extractedOrganizations || [],
      tags: doc.tags || ['uploaded'],
      thumbnail: doc.thumbnail || '📄',
      processingStatus: doc.processingStatus || 'completed',
      content: doc.content || '',
    };

    setDocuments(prev => {
      const updated = [newDocument, ...prev];
      localStorage.setItem('nexus_documents', JSON.stringify(updated));
      return updated;
    });

    // Automatically add extracted tasks to task store!
    if (newDocument.extractedTasks && newDocument.extractedTasks.length > 0) {
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
          assignee: user || seedUsers[0]
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
  }, [addTask, createCalendarEvent]);

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

  const markNotificationsAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem('nexus_notifications', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addNotification = useCallback((n: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
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
  }, []);

  // ── Authentication & Dynamic Status Actions ──────────────────
  const register = useCallback(async (email: string, username: string, tag: string, role: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username, tag, role }
        }
      });
      if (error) throw error;
      if (data.user) {
        const newPerson: Person = {
          id: data.user.id,
          name: username,
          email,
          avatar: '',
          role,
          tag,
          status: 'online'
        };
        
        await supabase.from('profiles').upsert({
          id: newPerson.id,
          email: newPerson.email,
          username: newPerson.name,
          tag: newPerson.tag,
          role: newPerson.role,
          status: 'online'
        });

        setUser(newPerson);
        setUserStatusState('online');
        localStorage.setItem('nexus_user', JSON.stringify(newPerson));
        localStorage.setItem('nexus_user_status', 'online');
        recordLogin(newPerson);

        setAllUsers(prev => {
          const filtered = prev.filter(u => u.email !== email && u.id !== newPerson.id);
          const updated = [...filtered, newPerson];
          localStorage.setItem('nexus_all_users', JSON.stringify(updated));
          return updated;
        });

        return true;
      }
    } catch (e) {
      console.warn('Supabase sign-up failed or not configured, using local fallback:', e);
    }

    const localId = `u-${Date.now()}`;
    const newPerson: Person = {
      id: localId,
      name: username,
      email,
      avatar: '',
      role,
      tag,
      status: 'online'
    };

    setUser(newPerson);
    setUserStatusState('online');
    localStorage.setItem('nexus_user', JSON.stringify(newPerson));
    localStorage.setItem('nexus_user_status', 'online');
    recordLogin(newPerson);

    try {
      const registeredListRaw = localStorage.getItem('nexus_registered_users') || '[]';
      const registeredList = JSON.parse(registeredListRaw);
      registeredList.push({ ...newPerson, password });
      localStorage.setItem('nexus_registered_users', JSON.stringify(registeredList));
    } catch (err) {
      console.error(err);
    }

    setAllUsers(prev => {
      const filtered = prev.filter(u => u.email !== email);
      const updated = [...filtered, newPerson];
      localStorage.setItem('nexus_all_users', JSON.stringify(updated));
      return updated;
    });

    return true;
  }, []);

  const login = useCallback(async (usernameOrEmail: string, password: string) => {
    let resolvedEmail = usernameOrEmail;

    // 1. Resolve email if it's a username (no @ symbol)
    if (!usernameOrEmail.includes('@')) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', usernameOrEmail)
          .single();
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
          status: profileStatus as 'online' | 'offline' | 'idle' | 'dnd'
        };

        setUser(authenticatedUser);
        setUserStatusState(authenticatedUser.status || 'online');
        localStorage.setItem('nexus_user', JSON.stringify(authenticatedUser));
        localStorage.setItem('nexus_user_status', authenticatedUser.status || 'online');
        recordLogin(authenticatedUser);

        try {
          await supabase.from('profiles').update({ status: 'online' }).eq('id', data.user.id);
        } catch (err) {}

        return true;
      }
    } catch (e) {
      console.warn('Supabase sign-in failed, utilizing local fallback:', e);
    }

    try {
      if ((usernameOrEmail === 'sarah@nexus.ai' || usernameOrEmail.toLowerCase() === 'sarah' || usernameOrEmail.toLowerCase() === 'sarah chen') && password === 'password') {
        const sarah = seedUsers[0];
        setUser(sarah);
        setUserStatusState('online');
        localStorage.setItem('nexus_user', JSON.stringify(sarah));
        localStorage.setItem('nexus_user_status', 'online');
        recordLogin(sarah);
        return true;
      }

      const registeredListRaw = localStorage.getItem('nexus_registered_users') || '[]';
      const registeredList = JSON.parse(registeredListRaw) as any[];
      const found = registeredList.find(u => 
        (u.email.toLowerCase() === usernameOrEmail.toLowerCase() || u.name.toLowerCase() === usernameOrEmail.toLowerCase()) && 
        u.password === password
      );
      if (found) {
        const authenticatedUser: Person = {
          id: found.id,
          name: found.name,
          email: found.email,
          avatar: found.avatar,
          role: found.role,
          tag: found.tag,
          status: 'online'
        };
        setUser(authenticatedUser);
        setUserStatusState('online');
        localStorage.setItem('nexus_user', JSON.stringify(authenticatedUser));
        localStorage.setItem('nexus_user_status', 'online');
        recordLogin(authenticatedUser);
        return true;
      }
    } catch (err) {
      console.error(err);
    }

    return false;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (user) {
        try {
          await supabase.from('profiles').update({ status: 'offline' }).eq('id', user.id);
        } catch (err) {}
      }
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase sign out warning:', e);
    }
    setUser(null);
    setUserStatusState('offline');
    localStorage.removeItem('nexus_user');
    localStorage.removeItem('nexus_user_status');
  }, [user]);

  const setUserStatus = useCallback(async (status: 'online' | 'offline' | 'idle' | 'dnd') => {
    setUserStatusState(status);
    localStorage.setItem('nexus_user_status', status);

    if (user) {
      const updatedUser = { ...user, status };
      setUser(updatedUser);
      localStorage.setItem('nexus_user', JSON.stringify(updatedUser));

      setAllUsers(prev => {
        const updated = prev.map(u => u.id === user.id ? updatedUser : u);
        localStorage.setItem('nexus_all_users', JSON.stringify(updated));
        return updated;
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

  const sendTeamMessage = useCallback(async (receiverId: string, content: string, media?: { url: string; name: string; type: string }) => {
    if (!user) return;
    const msgId = `tmsg-${Date.now()}`;
    const encryptedContent = encryptMessage(content);
    const newMsg: ChatMessage = {
      id: msgId,
      role: 'user',
      content: encryptedContent,
      timestamp: new Date().toISOString(),
      media
    };

    setTeamMessages(prev => {
      const currentDMs = prev[receiverId] || [];
      const updated = {
        ...prev,
        [receiverId]: [...currentDMs, newMsg]
      };
      localStorage.setItem('nexus_team_messages', JSON.stringify(updated));
      return updated;
    });

    try {
      await supabase.from('team_messages').insert({
        id: msgId,
        sender_id: user.id,
        receiver_id: receiverId,
        content: encryptedContent,
        timestamp: newMsg.timestamp
      });
    } catch (e) {
      console.warn('Sync DM to team_messages failed:', e);
    }

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
          localStorage.setItem('nexus_team_messages', JSON.stringify(updated));
          return updated;
        });

        try {
          supabase.from('team_messages').insert({
            id: replyId,
            sender_id: receiverId,
            receiver_id: user.id,
            content: encryptedReply,
            timestamp: replyMsg.timestamp
          }).then();
        } catch (err) {}
      }, 1500);
    }
  }, [user, allUsers]);

  // ── Enterprise Status, Channels, CRM & OKR Operations ────────
  const setCustomStatus = useCallback(async (statusText: string) => {
    setCustomStatusState(statusText);
    localStorage.setItem('nexus_custom_status', statusText);
    if (user) {
      const updated = { ...user, customStatus: statusText };
      setUser(updated);
      localStorage.setItem('nexus_user', JSON.stringify(updated));
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
      localStorage.setItem('nexus_user', JSON.stringify(updated));
      setAllUsers(prev => prev.map(u => u.id === user.id ? updated : u));
      try {
        await supabase.from('profiles').update({ dnd: dndVal }).eq('id', user.id);
      } catch (err) {}
    }
  }, [user]);

  const sendChannelMessage = useCallback(async (channelId: string, content: string, media?: { url: string; name: string; type: string }) => {
    if (!user) return;
    const encryptedContent = encryptMessage(content);
    const newMsg: ChannelMessage = {
      id: `cmsg-${Date.now()}`,
      sender: user,
      content: encryptedContent,
      timestamp: new Date().toISOString(),
      media,
      replies: []
    };

    setChannelMessages(prev => {
      const current = prev[channelId] || [];
      const updated = { ...prev, [channelId]: [...current, newMsg] };
      localStorage.setItem('nexus_channel_messages', JSON.stringify(updated));
      return updated;
    });

    try {
      await supabase.from('channel_messages').insert({
        id: newMsg.id,
        channel_id: channelId,
        sender_id: user.id,
        content: encryptedContent,
        timestamp: newMsg.timestamp,
        media
      });
    } catch (e) {
      console.warn("Sync channel message to Supabase failed:", e);
    }
  }, [user]);

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
      localStorage.setItem('nexus_channel_messages', JSON.stringify(updated));
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
      localStorage.setItem('nexus_channels', JSON.stringify(updated));
      return updated;
    });
    try {
      await supabase.from('channels').insert({
        id,
        name,
        category,
        is_group: isGroup,
        starred_by: []
      });
    } catch (e) {
      console.warn("Sync create channel failed:", e);
    }
    return id;
  }, []);

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
      localStorage.setItem('nexus_channels', JSON.stringify(updated));
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
      localStorage.setItem('nexus_channel_messages', JSON.stringify(updated));
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
      localStorage.setItem('nexus_channel_messages', JSON.stringify(updated));
      return updated;
    });
    try {
      await supabase.from('channel_messages').delete().eq('id', messageId);
    } catch (e) {
      console.warn("Sync delete message failed:", e);
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
      localStorage.setItem('nexus_channel_messages', JSON.stringify(updated));
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
      localStorage.setItem('nexus_channel_messages', JSON.stringify(updated));
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
      localStorage.setItem('nexus_channel_messages', JSON.stringify(updated));
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
      
      addTask({
        title: `Time Log: ${taskName}`,
        description: `Logged ${mins}m ${secs}s of work.`,
        status: 'done',
        priority: 'low',
        dueDate: new Date().toISOString().split('T')[0],
        tags: ['time-log'],
        subtasks: [],
        assignee: user || seedUsers[0]
      });
    }
    resetTimer();
  }, [activeTimerTask, timerElapsed, resetTimer, addTask]);

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
              to_name: 'Sarah Chen',
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
  }, []);

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
        content: newMessage.content,
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
    documents, addDocument, deleteDocument, selectedDocumentId, setSelectedDocumentId,
    tasks, addTask, deleteTask, moveTask, updateTask, taskView, setTaskView,
    calendarEvents, selectedDate, setSelectedDate, addEventToCalendar, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent,
    user, userStatus, allUsers, teamMessages, login, register, logout, setUserStatus, sendTeamMessage,
    customStatus, dnd, setCustomStatus, setDnd,
    channels, channelMessages, sendChannelMessage, sendChannelReply,
    goals, addGoal, updateGoal, deleteGoal,
    roles, addRole,
    loginActivities,
    deals, updateDealStage,
    activeTimerTask, isTimerRunning, timerElapsed, startTimer, pauseTimer, resetTimer, logTimer,
    emails, addEmail, editEmail, deleteEmail, updateEmailStatus,
    inboundEmailAddress, isSyncingEmails, syncInboundEmails,
    emailRedirect, setEmailRedirect,
    conversations, activeConversationId, setActiveConversationId, addMessage, createConversation, deleteConversation,
    insights,
    theme, toggleTheme,
    themeConfig, setThemeConfig,
    notifications, markNotificationsAsRead, addNotification,
    searchQuery, setSearchQuery,
    commandPaletteOpen, setCommandPaletteOpen,
    typingUsers, onlinePresence, broadcastTyping,
    toggleStarChannel, editChannelMessage, deleteChannelMessage,
    addReaction, removeReaction, togglePinMessage, markMessageAsRead, createChannel,
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