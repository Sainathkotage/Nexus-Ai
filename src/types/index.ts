// ============================================================
// Nexus AI — Type Definitions
// ============================================================

// --- Common ---
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type Status = 'active' | 'archived' | 'deleted';

export interface Person {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  tag?: string;
  status?: 'online' | 'offline' | 'idle' | 'dnd';
  customStatus?: string;
  dnd?: boolean;
  lastSeenAt?: string;
  notificationSettings?: Record<string, 'all' | 'mentions' | 'muted'>;
  emailVerified?: boolean;
}

// --- Documents ---
export type DocumentType = 'pdf' | 'docx' | 'txt' | 'meeting' | 'research';

export interface DocumentFile {
  id: string;
  title: string;
  type: DocumentType;
  size: string;
  uploadedAt: string;
  uploadedBy: Person;
  summary: string;
  keyPoints: string[];
  extractedTasks: ExtractedTask[];
  extractedDeadlines: ExtractedDeadline[];
  extractedPeople: string[];
  extractedOrganizations: string[];
  tags: string[];
  thumbnail: string;
  processingStatus: 'processing' | 'completed' | 'failed';
  content: string;
  pageCount?: number;
}

export interface ExtractedTask {
  id: string;
  text: string;
  deadline?: string;
  assignee?: string;
  sourceDocumentId: string;
  sourceDocumentTitle: string;
}

export interface ExtractedDeadline {
  id: string;
  text: string;
  date: string;
  sourceDocumentId: string;
  sourceDocumentTitle: string;
}

// --- Tasks ---
export type TaskStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignee: Person;
  dueDate: string;
  tags: string[];
  sourceDocument?: {
    id: string;
    title: string;
  };
  createdAt: string;
  updatedAt: string;
  subtasks: { id: string; text: string; completed: boolean }[];
  budget?: number;
  timeEstimate?: number;
  dependencies?: { blocks: string[]; blockedBy: string[] };
}

// --- Calendar ---
export type EventCategory = 'meeting' | 'deadline' | 'reminder' | 'event' | 'ai-extracted';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  category: EventCategory;
  description: string;
  attendees: Person[];
  location?: string;
  sourceDocument?: {
    id: string;
    title: string;
  };
  isAiExtracted: boolean;
  addedToCalendar: boolean;
  color: string;
}

// --- Emails ---
export type EmailStatus = 'draft' | 'pending' | 'sent' | 'received';

export interface Email {
  id: string;
  to: string;
  toName: string;
  from?: string;
  fromName?: string;
  subject: string;
  body: string;
  status: EmailStatus;
  createdAt: string;
  sentAt?: string;
  aiGenerated: boolean;
  sourcePrompt?: string;
  threadId?: string;
}

// --- AI Chat ---
export type MessageRole = 'user' | 'assistant';

export interface SourceReference {
  documentId: string;
  documentTitle: string;
  pageNumber?: number;
  excerpt: string;
  relevance: number;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  sources?: SourceReference[];
  isStreaming?: boolean;
  media?: { url: string; name: string; type: string };
  status?: 'sending' | 'delivered';
  editedAt?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// --- AI Insights ---
export type InsightType = 'deadline' | 'blocked' | 'followup' | 'update' | 'meeting' | 'action';

export interface AIInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  priority: Priority;
  actionLabel?: string;
  relatedDocumentId?: string;
  relatedTaskId?: string;
  timestamp: string;
}

// --- Knowledge Graph ---
export type NodeType = 'document' | 'project' | 'person' | 'task' | 'meeting';

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  color: string;
  size: number;
}

export interface GraphLink {
  source: string;
  target: string;
  label: string;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// --- Dashboard ---
export interface DashboardStats {
  totalDocuments: number;
  documentsTrend: number;
  pendingTasks: number;
  tasksTrend: number;
  upcomingMeetings: number;
  nextMeeting: string;
  emailsAwaitingApproval: number;
  emailsTrend: number;
}

export interface ProjectProgress {
  name: string;
  completed: number;
  inProgress: number;
  remaining: number;
}

export interface TeamWorkload {
  name: string;
  avatar: string;
  tasks: number;
  capacity: number;
}

// --- Activity ---
export type ActivityType = 'upload' | 'task_complete' | 'email_sent' | 'ai_insight' | 'meeting' | 'comment';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  user: Person;
}

// --- Navigation ---
export type PageId = 'dashboard' | 'documents' | 'chat' | 'tasks' | 'calendar' | 'emails' | 'settings' | 'team-chat' | 'whiteboard' | 'crm' | 'ai-inbox' | 'ai-handover';

// --- Enterprise Channels ---
export interface Channel {
  id: string;
  name: string;
  category: string;
  isGroup?: boolean;
  starredBy?: string[];
  createdAt?: string;
}

export interface ChannelMessage {
  id: string;
  channelId?: string;
  sender: Person;
  content: string;
  timestamp: string;
  media?: { url: string; name: string; type: string };
  replies?: ChannelMessageReply[];
  parentId?: string;
  editedAt?: string;
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: string;
  reactions?: MessageReaction[];
  reads?: MessageRead[];
  status?: 'sending' | 'delivered';
}

export interface ChannelMessageReply {
  id: string;
  sender: Person;
  content: string;
  timestamp: string;
  parentId: string;
}

export interface MessageReaction {
  id?: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt?: string;
}

export interface MessageRead {
  messageId: string;
  userId: string;
  readAt?: string;
}

// --- Goals & OKRs ---
export interface GoalOKR {
  id: string;
  title: string;
  category: 'company' | 'team' | 'personal';
  progress: number;
  target: number;
}

// --- CRM Deals ---
export interface Deal {
  id: string;
  title: string;
  company: string;
  value: number;
  stage: 'lead' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost';
  score?: number; // 0-100 AI Deal Score
  forecastCategory?: 'commit' | 'best_case' | 'pipeline'; // AI Forecasting
  stageUpdatedAt?: string; // Stale deal tracking
  lastActivityAt?: string; // Stale deal tracking
  primaryContactName?: string;
  primaryContactEmail?: string;
  ownerId?: string;
  ownerName?: string;
  notes?: string;
}

// --- Login Activities / Audit Logs ---
export interface LoginActivity {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  timestamp: string;
  ipAddress: string;
  device: string;
}

export interface NotificationItem {
  id: string;
  senderName: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  type?: string;
  title?: string;
  requestId?: string;
}

export interface ThemeConfig {
  name: string;
  primary?: string;
  background?: string;
  sidebar?: string;
  accent?: string;
}

// --- AI Action Inbox ---
export interface AiInboxItem {
  id: string;
  title: string;
  description: string;
  type: 'email' | 'crm' | 'meeting' | 'task' | 'general';
  status: 'pending' | 'completed';
  createdAt: string;
  actionData?: any;
}

// --- AI Handover ---
export interface HandoverProject {
  name: string;
  progress: number;
  status: string;
  blockers: string[];
  keyStakeholders: string[];
  nextActions: string[];
}

export interface HandoverGraphNode {
  id: string;
  label: string;
  role: string;
  interactionLevel: 'high' | 'medium' | 'low';
}

export interface HandoverGraphLink {
  source: string;
  target: string;
  label: string;
}

export interface HandoverDecision {
  id: string;
  date: string;
  title: string;
  details: string;
  rationale: string;
  category: string;
}

export interface HandoverCommitment {
  id: string;
  text: string;
  dueDate: string;
  status: 'pending' | 'completed';
  source: string;
}

export interface SuccessorBrief {
  timeToRead: string;
  projectsCount: number;
  relationshipsCount: number;
  deadlinesCount: number;
  commitmentsCount: number;
  risksCount: number;
  textBriefing: string;
}

export interface HandoverRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  projects: HandoverProject[];
  relationshipGraph: {
    nodes: HandoverGraphNode[];
    links: HandoverGraphLink[];
  };
  decisionHistory: HandoverDecision[];
  commitments: HandoverCommitment[];
  successorBriefing: SuccessorBrief;
  risks: string[];
  createdBy: string;
  createdAt: string;
  status: 'active' | 'transitioning' | 'completed';
}

// --- Meeting & Video Calling ---
export interface MeetingParticipant {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  joinTime: string;
  leaveTime?: string;
  isMuted?: boolean;
  isCameraOff?: boolean;
  handRaised?: boolean;
  isScreenSharing?: boolean;
}

export interface MeetingRecord {
  id: string;
  title: string;
  workspaceId: string;
  channelId?: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in seconds
  participants: MeetingParticipant[];
  recordingUrl?: string;
  transcript?: { senderName: string; text: string; timestamp: string }[];
  summary?: string;
  actionItems?: { text: string; assignee?: string; dueDate?: string }[];
  decisions?: string[];
}

