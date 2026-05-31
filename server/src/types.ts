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
export type EmailStatus = 'draft' | 'pending' | 'sent';

export interface Email {
  id: string;
  to: string;
  toName: string;
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
export type PageId = 'dashboard' | 'documents' | 'chat' | 'tasks' | 'calendar' | 'emails' | 'settings';

export interface Database {
  people: Person[];
  currentUser: Person;
  documents: DocumentFile[];
  tasks: Task[];
  calendarEvents: CalendarEvent[];
  emails: Email[];
  conversations: Conversation[];
  aiInsights: AIInsight[];
  dashboardStats: DashboardStats;
  projectProgress: ProjectProgress[];
  teamWorkload: TeamWorkload[];
  knowledgeGraphData: KnowledgeGraphData;
  recentActivity: ActivityItem[];
  suggestedPrompts: { id: string, text: string, category: string }[];
}
