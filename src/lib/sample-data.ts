// ============================================================
// Nexus AI — Comprehensive Sample Data
// ============================================================
import {
  Person, DocumentFile, Task, CalendarEvent, Email, ChatMessage, Conversation,
  AIInsight, KnowledgeGraphData, DashboardStats, ProjectProgress, TeamWorkload,
  ActivityItem, GraphNode, GraphLink
} from '@/types';

// ── People ──────────────────────────────────────────────────
export const people: Person[] = [
  { id: 'p1', name: 'Sarah Chen', email: 'sarah@nexus.ai', avatar: '', role: 'Product Lead' },
  { id: 'p2', name: 'Marcus Johnson', email: 'marcus@nexus.ai', avatar: '', role: 'Engineering Manager' },
  { id: 'p3', name: 'Elena Rodriguez', email: 'elena@nexus.ai', avatar: '', role: 'Design Director' },
  { id: 'p4', name: 'Alex Kim', email: 'alex@nexus.ai', avatar: '', role: 'Senior Developer' },
  { id: 'p5', name: 'James Wilson', email: 'james@nexus.ai', avatar: '', role: 'Data Scientist' },
  { id: 'p6', name: 'Priya Patel', email: 'priya@nexus.ai', avatar: '', role: 'UX Researcher' },
  { id: 'p7', name: 'David Lee', email: 'david@nexus.ai', avatar: '', role: 'DevOps Lead' },
  { id: 'p8', name: 'Nina Kowalski', email: 'nina@nexus.ai', avatar: '', role: 'Content Strategist' },
];

export const currentUser = people[0];

// ── Helper ──────────────────────────────────────────────────
function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function daysAgo(n: number): string {
  return daysFromNow(-n);
}

// ── Documents ───────────────────────────────────────────────
export const documents: DocumentFile[] = [
  {
    id: 'doc1',
    title: 'Q2 2026 Product Roadmap',
    type: 'pdf',
    size: '2.4 MB',
    uploadedAt: daysAgo(5),
    uploadedBy: people[0],
    summary: 'Comprehensive product roadmap for Q2 2026 covering three major feature launches: AI-powered search, collaborative workspaces, and enterprise API v2. Includes timeline, resource allocation, and success metrics.',
    keyPoints: [
      'AI-powered search launching June 15th',
      'Collaborative workspaces beta starting July 1st',
      'Enterprise API v2 release scheduled for August',
      'Budget increase of 15% approved for engineering',
      'New partnership with CloudScale for infrastructure',
    ],
    extractedTasks: [
      { id: 'et1', text: 'Finalize AI search algorithm specifications', deadline: daysFromNow(7), assignee: 'Alex Kim', sourceDocumentId: 'doc1', sourceDocumentTitle: 'Q2 2026 Product Roadmap' },
      { id: 'et2', text: 'Conduct user testing for collaborative workspaces', deadline: daysFromNow(14), assignee: 'Priya Patel', sourceDocumentId: 'doc1', sourceDocumentTitle: 'Q2 2026 Product Roadmap' },
      { id: 'et3', text: 'Draft Enterprise API v2 documentation', deadline: daysFromNow(21), assignee: 'Nina Kowalski', sourceDocumentId: 'doc1', sourceDocumentTitle: 'Q2 2026 Product Roadmap' },
    ],
    extractedDeadlines: [
      { id: 'ed1', text: 'AI Search Launch', date: daysFromNow(16), sourceDocumentId: 'doc1', sourceDocumentTitle: 'Q2 2026 Product Roadmap' },
      { id: 'ed2', text: 'Workspaces Beta', date: daysFromNow(32), sourceDocumentId: 'doc1', sourceDocumentTitle: 'Q2 2026 Product Roadmap' },
    ],
    extractedPeople: ['Sarah Chen', 'Alex Kim', 'Marcus Johnson', 'Elena Rodriguez'],
    extractedOrganizations: ['CloudScale', 'Nexus AI', 'TechVentures Inc.'],
    tags: ['roadmap', 'product', 'Q2-2026', 'strategy'],
    thumbnail: '📋',
    processingStatus: 'completed',
    content: 'Full product roadmap content...',
    pageCount: 24,
  },
  {
    id: 'doc2',
    title: 'Board Meeting Minutes - May 2026',
    type: 'meeting',
    size: '890 KB',
    uploadedAt: daysAgo(3),
    uploadedBy: people[1],
    summary: 'Minutes from the May board meeting covering financial performance, strategic direction, and hiring plans. Board approved budget increase and new market expansion into APAC region.',
    keyPoints: [
      'Revenue grew 32% quarter-over-quarter',
      'Board approved $2M additional budget for R&D',
      'APAC expansion planned for Q3 2026',
      'New CTO hire approved — search begins immediately',
      'Customer retention rate improved to 94%',
    ],
    extractedTasks: [
      { id: 'et4', text: 'Prepare APAC market entry strategy document', deadline: daysFromNow(10), assignee: 'Sarah Chen', sourceDocumentId: 'doc2', sourceDocumentTitle: 'Board Meeting Minutes - May 2026' },
      { id: 'et5', text: 'Begin CTO recruitment process', deadline: daysFromNow(5), assignee: 'Marcus Johnson', sourceDocumentId: 'doc2', sourceDocumentTitle: 'Board Meeting Minutes - May 2026' },
    ],
    extractedDeadlines: [
      { id: 'ed3', text: 'APAC Strategy Due', date: daysFromNow(10), sourceDocumentId: 'doc2', sourceDocumentTitle: 'Board Meeting Minutes - May 2026' },
    ],
    extractedPeople: ['Sarah Chen', 'Marcus Johnson', 'Board of Directors'],
    extractedOrganizations: ['Nexus AI', 'Sequoia Capital'],
    tags: ['meeting', 'board', 'strategy', 'financial'],
    thumbnail: '📝',
    processingStatus: 'completed',
    content: 'Meeting minutes content...',
    pageCount: 8,
  },
  {
    id: 'doc3',
    title: 'Competitive Analysis Report',
    type: 'research',
    size: '5.1 MB',
    uploadedAt: daysAgo(7),
    uploadedBy: people[5],
    summary: 'In-depth competitive analysis covering 12 competitors in the AI workspace market. Key finding: Nexus AI has strongest AI integration but needs to improve collaboration features and mobile experience.',
    keyPoints: [
      'Nexus AI ranked #1 in AI capabilities among competitors',
      'Gap identified in real-time collaboration features',
      'Mobile app experience is below market average',
      'Pricing is competitive but enterprise tier needs restructuring',
      '3 new competitors entered the market in Q1 2026',
    ],
    extractedTasks: [
      { id: 'et6', text: 'Redesign mobile app navigation flow', deadline: daysFromNow(30), assignee: 'Elena Rodriguez', sourceDocumentId: 'doc3', sourceDocumentTitle: 'Competitive Analysis Report' },
    ],
    extractedDeadlines: [],
    extractedPeople: ['Priya Patel', 'Elena Rodriguez'],
    extractedOrganizations: ['Notion', 'Linear', 'Coda', 'Confluence'],
    tags: ['research', 'competitive-analysis', 'market'],
    thumbnail: '📊',
    processingStatus: 'completed',
    content: 'Competitive analysis full content...',
    pageCount: 45,
  },
  {
    id: 'doc4',
    title: 'Engineering Architecture Review',
    type: 'pdf',
    size: '3.2 MB',
    uploadedAt: daysAgo(2),
    uploadedBy: people[3],
    summary: 'Technical architecture review for the microservices migration. Proposes moving from monolith to event-driven microservices with Kubernetes orchestration. Estimated 6-month timeline.',
    keyPoints: [
      'Migration from monolith to 12 microservices',
      'Event-driven architecture using Apache Kafka',
      'Kubernetes deployment on AWS EKS',
      'Expected 40% improvement in deployment frequency',
      'Estimated cost reduction of 25% after migration',
    ],
    extractedTasks: [
      { id: 'et7', text: 'Set up Kubernetes cluster on AWS EKS', deadline: daysFromNow(14), assignee: 'David Lee', sourceDocumentId: 'doc4', sourceDocumentTitle: 'Engineering Architecture Review' },
      { id: 'et8', text: 'Design event schema for Kafka topics', deadline: daysFromNow(10), assignee: 'Alex Kim', sourceDocumentId: 'doc4', sourceDocumentTitle: 'Engineering Architecture Review' },
    ],
    extractedDeadlines: [
      { id: 'ed4', text: 'Architecture Sign-off', date: daysFromNow(7), sourceDocumentId: 'doc4', sourceDocumentTitle: 'Engineering Architecture Review' },
    ],
    extractedPeople: ['Alex Kim', 'David Lee', 'Marcus Johnson'],
    extractedOrganizations: ['AWS', 'Apache Foundation'],
    tags: ['engineering', 'architecture', 'microservices', 'technical'],
    thumbnail: '⚙️',
    processingStatus: 'completed',
    content: 'Architecture review content...',
    pageCount: 32,
  },
  {
    id: 'doc5',
    title: 'Q1 2026 Financial Report',
    type: 'pdf',
    size: '1.8 MB',
    uploadedAt: daysAgo(10),
    uploadedBy: people[0],
    summary: 'Financial summary for Q1 2026 showing strong revenue growth and controlled burn rate. ARR reached $12M milestone.',
    keyPoints: [
      'ARR reached $12M, up from $9.1M last quarter',
      'Net revenue retention rate: 125%',
      'Burn rate reduced by 18%',
      'Enterprise customer count grew to 45',
      'Runway extended to 24 months',
    ],
    extractedTasks: [],
    extractedDeadlines: [],
    extractedPeople: ['Sarah Chen', 'CFO Board'],
    extractedOrganizations: ['Nexus AI', 'TechVentures Inc.'],
    tags: ['financial', 'quarterly-report', 'Q1-2026'],
    thumbnail: '💰',
    processingStatus: 'completed',
    content: 'Financial report full content...',
    pageCount: 18,
  },
  {
    id: 'doc6',
    title: 'User Research Findings - Enterprise Onboarding',
    type: 'docx',
    size: '4.3 MB',
    uploadedAt: daysAgo(1),
    uploadedBy: people[5],
    summary: 'Usability study with 20 enterprise users revealed critical friction points in onboarding flow. Average time-to-value is 45 minutes, target is under 15 minutes.',
    keyPoints: [
      '75% of users struggled with workspace setup',
      'Document upload flow has 3 unnecessary steps',
      'AI chat onboarding tooltip dismissed by 60% of users',
      'Users want template library for common workflows',
      'SSO integration is the #1 requested enterprise feature',
    ],
    extractedTasks: [
      { id: 'et9', text: 'Simplify workspace setup wizard to 3 steps', deadline: daysFromNow(12), assignee: 'Elena Rodriguez', sourceDocumentId: 'doc6', sourceDocumentTitle: 'User Research Findings' },
      { id: 'et10', text: 'Build template library with 10 starter templates', deadline: daysFromNow(20), assignee: 'Nina Kowalski', sourceDocumentId: 'doc6', sourceDocumentTitle: 'User Research Findings' },
    ],
    extractedDeadlines: [
      { id: 'ed5', text: 'Onboarding Redesign Due', date: daysFromNow(15), sourceDocumentId: 'doc6', sourceDocumentTitle: 'User Research Findings' },
    ],
    extractedPeople: ['Priya Patel', 'Elena Rodriguez', 'Nina Kowalski'],
    extractedOrganizations: ['Nexus AI'],
    tags: ['research', 'UX', 'enterprise', 'onboarding'],
    thumbnail: '🔬',
    processingStatus: 'completed',
    content: 'User research findings content...',
    pageCount: 28,
  },
  {
    id: 'doc7',
    title: 'Supplier Agreement - CloudScale',
    type: 'pdf',
    size: '1.2 MB',
    uploadedAt: daysAgo(4),
    uploadedBy: people[1],
    summary: 'Service level agreement with CloudScale for infrastructure hosting. Covers compute, storage, and bandwidth with 99.99% uptime guarantee.',
    keyPoints: [
      '3-year contract with annual renewal option',
      '99.99% uptime SLA guaranteed',
      'Volume discount of 20% at current scale',
      'Data residency compliance for EU and APAC',
      'Dedicated support channel with 1-hour response time',
    ],
    extractedTasks: [
      { id: 'et11', text: 'Review CloudScale SLA terms with legal team', deadline: daysFromNow(5), assignee: 'Marcus Johnson', sourceDocumentId: 'doc7', sourceDocumentTitle: 'Supplier Agreement - CloudScale' },
    ],
    extractedDeadlines: [
      { id: 'ed6', text: 'Contract Signing Deadline', date: daysFromNow(8), sourceDocumentId: 'doc7', sourceDocumentTitle: 'Supplier Agreement - CloudScale' },
    ],
    extractedPeople: ['Marcus Johnson', 'CloudScale Sales Team'],
    extractedOrganizations: ['CloudScale', 'Nexus AI'],
    tags: ['contract', 'supplier', 'infrastructure', 'legal'],
    thumbnail: '📄',
    processingStatus: 'completed',
    content: 'Supplier agreement content...',
    pageCount: 12,
  },
  {
    id: 'doc8',
    title: 'Marketing Campaign Brief - Summer 2026',
    type: 'docx',
    size: '2.1 MB',
    uploadedAt: daysAgo(6),
    uploadedBy: people[7],
    summary: 'Creative brief for the Summer 2026 marketing campaign targeting enterprise customers. Budget of $500K across digital, content, and events.',
    keyPoints: [
      'Campaign theme: "Intelligence at Scale"',
      'Target audience: VP/C-level at companies with 500+ employees',
      'Budget: $500K split across digital (40%), content (35%), events (25%)',
      'Launch date: June 20th, 2026',
      'Expected lead generation: 2,000 MQLs',
    ],
    extractedTasks: [
      { id: 'et12', text: 'Design campaign landing page', deadline: daysFromNow(8), assignee: 'Elena Rodriguez', sourceDocumentId: 'doc8', sourceDocumentTitle: 'Marketing Campaign Brief' },
    ],
    extractedDeadlines: [
      { id: 'ed7', text: 'Campaign Launch', date: daysFromNow(21), sourceDocumentId: 'doc8', sourceDocumentTitle: 'Marketing Campaign Brief' },
    ],
    extractedPeople: ['Nina Kowalski', 'Elena Rodriguez'],
    extractedOrganizations: ['Nexus AI'],
    tags: ['marketing', 'campaign', 'enterprise', 'summer-2026'],
    thumbnail: '📢',
    processingStatus: 'completed',
    content: 'Marketing campaign brief content...',
    pageCount: 15,
  },
];

// ── Tasks ────────────────────────────────────────────────────
export const tasks: Task[] = [
  {
    id: 't1', title: 'Finalize AI search algorithm specs', description: 'Complete the specification document for the AI-powered search feature including ranking algorithm, indexing strategy, and performance benchmarks.',
    status: 'in-progress', priority: 'high', assignee: people[3], dueDate: daysFromNow(7),
    tags: ['engineering', 'ai'], sourceDocument: { id: 'doc1', title: 'Q2 2026 Product Roadmap' },
    createdAt: daysAgo(5), updatedAt: daysAgo(1),
    subtasks: [{ id: 'st1', text: 'Define ranking algorithm', completed: true }, { id: 'st2', text: 'Set up indexing pipeline', completed: false }, { id: 'st3', text: 'Write performance benchmarks', completed: false }],
  },
  {
    id: 't2', title: 'Conduct collaborative workspaces user testing', description: 'Run usability sessions with 10 beta users to validate the collaborative workspace feature.',
    status: 'todo', priority: 'high', assignee: people[5], dueDate: daysFromNow(14),
    tags: ['research', 'UX'], sourceDocument: { id: 'doc1', title: 'Q2 2026 Product Roadmap' },
    createdAt: daysAgo(5), updatedAt: daysAgo(3),
    subtasks: [{ id: 'st4', text: 'Recruit test participants', completed: true }, { id: 'st5', text: 'Prepare test scripts', completed: false }],
  },
  {
    id: 't3', title: 'Draft Enterprise API v2 documentation', description: 'Write comprehensive API docs for the new enterprise API endpoints.',
    status: 'backlog', priority: 'medium', assignee: people[7], dueDate: daysFromNow(21),
    tags: ['documentation', 'api'], sourceDocument: { id: 'doc1', title: 'Q2 2026 Product Roadmap' },
    createdAt: daysAgo(5), updatedAt: daysAgo(5),
    subtasks: [],
  },
  {
    id: 't4', title: 'Prepare APAC market entry strategy', description: 'Create a comprehensive strategy document for expanding into the Asia-Pacific market.',
    status: 'in-progress', priority: 'urgent', assignee: people[0], dueDate: daysFromNow(10),
    tags: ['strategy', 'APAC'], sourceDocument: { id: 'doc2', title: 'Board Meeting Minutes' },
    createdAt: daysAgo(3), updatedAt: daysAgo(1),
    subtasks: [{ id: 'st6', text: 'Market size analysis', completed: true }, { id: 'st7', text: 'Competitor mapping', completed: true }, { id: 'st8', text: 'Pricing strategy', completed: false }, { id: 'st9', text: 'Go-to-market plan', completed: false }],
  },
  {
    id: 't5', title: 'Begin CTO recruitment process', description: 'Initiate the search for a new CTO as approved by the board.',
    status: 'todo', priority: 'urgent', assignee: people[1], dueDate: daysFromNow(5),
    tags: ['hiring', 'leadership'], sourceDocument: { id: 'doc2', title: 'Board Meeting Minutes' },
    createdAt: daysAgo(3), updatedAt: daysAgo(2),
    subtasks: [{ id: 'st10', text: 'Draft job description', completed: true }, { id: 'st11', text: 'Engage executive recruiter', completed: false }],
  },
  {
    id: 't6', title: 'Set up Kubernetes cluster on AWS EKS', description: 'Provision and configure the Kubernetes cluster for microservices deployment.',
    status: 'in-progress', priority: 'high', assignee: people[6], dueDate: daysFromNow(14),
    tags: ['devops', 'infrastructure'], sourceDocument: { id: 'doc4', title: 'Engineering Architecture Review' },
    createdAt: daysAgo(2), updatedAt: daysAgo(0),
    subtasks: [{ id: 'st12', text: 'Create EKS cluster', completed: true }, { id: 'st13', text: 'Configure networking', completed: true }, { id: 'st14', text: 'Set up monitoring', completed: false }],
  },
  {
    id: 't7', title: 'Design event schema for Kafka topics', description: 'Define the event schema and topic structure for the event-driven architecture.',
    status: 'todo', priority: 'high', assignee: people[3], dueDate: daysFromNow(10),
    tags: ['engineering', 'architecture'], sourceDocument: { id: 'doc4', title: 'Engineering Architecture Review' },
    createdAt: daysAgo(2), updatedAt: daysAgo(2),
    subtasks: [],
  },
  {
    id: 't8', title: 'Simplify workspace setup wizard', description: 'Redesign the onboarding wizard from 7 steps to 3 steps based on user research.',
    status: 'todo', priority: 'medium', assignee: people[2], dueDate: daysFromNow(12),
    tags: ['design', 'UX', 'onboarding'], sourceDocument: { id: 'doc6', title: 'User Research Findings' },
    createdAt: daysAgo(1), updatedAt: daysAgo(1),
    subtasks: [],
  },
  {
    id: 't9', title: 'Build template library', description: 'Create 10 starter templates for common enterprise workflows.',
    status: 'backlog', priority: 'medium', assignee: people[7], dueDate: daysFromNow(20),
    tags: ['content', 'templates'], sourceDocument: { id: 'doc6', title: 'User Research Findings' },
    createdAt: daysAgo(1), updatedAt: daysAgo(1),
    subtasks: [],
  },
  {
    id: 't10', title: 'Review CloudScale SLA terms', description: 'Review the SLA terms with the legal team before signing.',
    status: 'review', priority: 'high', assignee: people[1], dueDate: daysFromNow(5),
    tags: ['legal', 'contract'], sourceDocument: { id: 'doc7', title: 'Supplier Agreement - CloudScale' },
    createdAt: daysAgo(4), updatedAt: daysAgo(1),
    subtasks: [{ id: 'st15', text: 'Legal review complete', completed: true }, { id: 'st16', text: 'Negotiate terms', completed: true }, { id: 'st17', text: 'Final approval', completed: false }],
  },
  {
    id: 't11', title: 'Design campaign landing page', description: 'Create a high-converting landing page for the Summer 2026 campaign.',
    status: 'in-progress', priority: 'medium', assignee: people[2], dueDate: daysFromNow(8),
    tags: ['design', 'marketing'], sourceDocument: { id: 'doc8', title: 'Marketing Campaign Brief' },
    createdAt: daysAgo(6), updatedAt: daysAgo(0),
    subtasks: [{ id: 'st18', text: 'Wireframes complete', completed: true }, { id: 'st19', text: 'High-fidelity mockups', completed: true }, { id: 'st20', text: 'Developer handoff', completed: false }],
  },
  {
    id: 't12', title: 'Redesign mobile app navigation', description: 'Rework the mobile app navigation flow based on competitive analysis findings.',
    status: 'backlog', priority: 'low', assignee: people[2], dueDate: daysFromNow(30),
    tags: ['design', 'mobile'], sourceDocument: { id: 'doc3', title: 'Competitive Analysis Report' },
    createdAt: daysAgo(7), updatedAt: daysAgo(7),
    subtasks: [],
  },
  {
    id: 't13', title: 'Implement SSO integration', description: 'Add SAML and OIDC support for enterprise single sign-on.',
    status: 'review', priority: 'high', assignee: people[3], dueDate: daysFromNow(3),
    tags: ['engineering', 'security', 'enterprise'],
    createdAt: daysAgo(14), updatedAt: daysAgo(0),
    subtasks: [{ id: 'st21', text: 'SAML provider', completed: true }, { id: 'st22', text: 'OIDC provider', completed: true }, { id: 'st23', text: 'Testing & QA', completed: true }],
  },
  {
    id: 't14', title: 'Prepare investor update deck', description: 'Monthly investor update for May covering KPIs and milestones.',
    status: 'done', priority: 'high', assignee: people[0], dueDate: daysAgo(1),
    tags: ['investor-relations', 'reporting'],
    createdAt: daysAgo(10), updatedAt: daysAgo(1),
    subtasks: [{ id: 'st24', text: 'Gather KPIs', completed: true }, { id: 'st25', text: 'Create deck', completed: true }, { id: 'st26', text: 'Review with CFO', completed: true }],
  },
  {
    id: 't15', title: 'Deploy monitoring dashboards', description: 'Set up Grafana dashboards for the new microservices architecture.',
    status: 'done', priority: 'medium', assignee: people[6], dueDate: daysAgo(2),
    tags: ['devops', 'monitoring'],
    createdAt: daysAgo(8), updatedAt: daysAgo(2),
    subtasks: [{ id: 'st27', text: 'Configure Prometheus', completed: true }, { id: 'st28', text: 'Create dashboards', completed: true }],
  },
  {
    id: 't16', title: 'Write Q2 content calendar', description: 'Plan and schedule all blog posts, webinars, and social media for Q2.',
    status: 'done', priority: 'medium', assignee: people[7], dueDate: daysAgo(3),
    tags: ['content', 'marketing'],
    createdAt: daysAgo(12), updatedAt: daysAgo(3),
    subtasks: [],
  },
];

// ── Calendar Events ─────────────────────────────────────────
export const calendarEvents: CalendarEvent[] = [
  {
    id: 'ev1', title: 'Product Strategy Review', date: daysFromNow(1),
    startTime: '10:00', endTime: '11:30', category: 'meeting',
    description: 'Quarterly product strategy review with leadership team.',
    attendees: [people[0], people[1], people[2]],
    location: 'Conference Room A / Zoom',
    isAiExtracted: false, addedToCalendar: true, color: '#6366f1',
  },
  {
    id: 'ev2', title: 'AI Search Launch Planning', date: daysFromNow(3),
    startTime: '14:00', endTime: '15:00', category: 'meeting',
    description: 'Planning session for the AI-powered search feature launch.',
    attendees: [people[0], people[3], people[4]],
    sourceDocument: { id: 'doc1', title: 'Q2 2026 Product Roadmap' },
    isAiExtracted: true, addedToCalendar: true, color: '#8b5cf6',
  },
  {
    id: 'ev3', title: 'Architecture Sign-off Deadline', date: daysFromNow(7),
    startTime: '09:00', endTime: '09:00', category: 'deadline',
    description: 'Final deadline for architecture review sign-off.',
    attendees: [people[1], people[3], people[6]],
    sourceDocument: { id: 'doc4', title: 'Engineering Architecture Review' },
    isAiExtracted: true, addedToCalendar: false, color: '#ef4444',
  },
  {
    id: 'ev4', title: 'CloudScale Contract Signing', date: daysFromNow(8),
    startTime: '11:00', endTime: '12:00', category: 'meeting',
    description: 'Contract signing ceremony with CloudScale.',
    attendees: [people[1]],
    sourceDocument: { id: 'doc7', title: 'Supplier Agreement - CloudScale' },
    isAiExtracted: true, addedToCalendar: false, color: '#f59e0b',
  },
  {
    id: 'ev5', title: 'APAC Strategy Presentation', date: daysFromNow(10),
    startTime: '15:00', endTime: '16:30', category: 'meeting',
    description: 'Present APAC market entry strategy to the board.',
    attendees: [people[0], people[1]],
    sourceDocument: { id: 'doc2', title: 'Board Meeting Minutes' },
    isAiExtracted: true, addedToCalendar: true, color: '#6366f1',
  },
  {
    id: 'ev6', title: 'User Testing Sessions', date: daysFromNow(14),
    startTime: '09:00', endTime: '17:00', category: 'event',
    description: 'Full day of user testing sessions for collaborative workspaces.',
    attendees: [people[5], people[2]],
    sourceDocument: { id: 'doc1', title: 'Q2 2026 Product Roadmap' },
    isAiExtracted: true, addedToCalendar: false, color: '#10b981',
  },
  {
    id: 'ev7', title: 'Onboarding Redesign Review', date: daysFromNow(15),
    startTime: '13:00', endTime: '14:00', category: 'deadline',
    description: 'Review deadline for the onboarding redesign.',
    attendees: [people[2], people[5]],
    sourceDocument: { id: 'doc6', title: 'User Research Findings' },
    isAiExtracted: true, addedToCalendar: false, color: '#ef4444',
  },
  {
    id: 'ev8', title: 'AI Search Feature Launch', date: daysFromNow(16),
    startTime: '10:00', endTime: '10:00', category: 'deadline',
    description: 'Target launch date for AI-powered search.',
    attendees: [people[0], people[3], people[4]],
    sourceDocument: { id: 'doc1', title: 'Q2 2026 Product Roadmap' },
    isAiExtracted: true, addedToCalendar: true, color: '#8b5cf6',
  },
  {
    id: 'ev9', title: 'Team All-Hands', date: daysFromNow(2),
    startTime: '16:00', endTime: '17:00', category: 'meeting',
    description: 'Weekly all-hands meeting for the product team.',
    attendees: people,
    location: 'Main Hall / Zoom',
    isAiExtracted: false, addedToCalendar: true, color: '#6366f1',
  },
  {
    id: 'ev10', title: 'Campaign Launch Day', date: daysFromNow(21),
    startTime: '09:00', endTime: '18:00', category: 'event',
    description: 'Summer 2026 marketing campaign launch.',
    attendees: [people[7], people[2]],
    sourceDocument: { id: 'doc8', title: 'Marketing Campaign Brief' },
    isAiExtracted: true, addedToCalendar: true, color: '#f59e0b',
  },
  {
    id: 'ev11', title: '1:1 with Marcus', date: daysFromNow(0),
    startTime: '14:00', endTime: '14:30', category: 'meeting',
    description: 'Weekly 1:1 sync with engineering manager.',
    attendees: [people[0], people[1]],
    isAiExtracted: false, addedToCalendar: true, color: '#6366f1',
  },
  {
    id: 'ev12', title: 'Design Review', date: daysFromNow(4),
    startTime: '11:00', endTime: '12:00', category: 'meeting',
    description: 'Weekly design review with the product and engineering teams.',
    attendees: [people[2], people[0], people[3]],
    isAiExtracted: false, addedToCalendar: true, color: '#10b981',
  },
];

// ── Emails ──────────────────────────────────────────────────
export const emails: Email[] = [
  {
    id: 'em1', to: 'sales@cloudscale.io', toName: 'CloudScale Sales', subject: 'Request for Updated Infrastructure Pricing',
    body: 'Dear CloudScale Team,\n\nThank you for the productive meeting last week. As discussed, we are planning to scale our infrastructure significantly in Q3 2026 as we expand into the APAC region.\n\nCould you please provide updated pricing for the following:\n\n1. Compute instances (estimated 200% increase)\n2. Storage (estimated 150% increase)\n3. Bandwidth for APAC data centers\n4. Premium support tier options\n\nWe would like to receive the updated pricing by end of this week if possible, as we need to finalize our Q3 budget.\n\nBest regards,\nSarah Chen\nProduct Lead, Nexus AI',
    status: 'pending', createdAt: daysAgo(1), aiGenerated: true,
    sourcePrompt: 'Email CloudScale asking for updated pricing for our APAC expansion',
  },
  {
    id: 'em2', to: 'recruiter@toptalent.com', toName: 'Executive Recruiters', subject: 'CTO Search - Nexus AI',
    body: 'Dear Recruiting Team,\n\nWe are initiating a search for a Chief Technology Officer at Nexus AI. The role requires:\n\n• 15+ years of experience in software engineering\n• Experience scaling AI/ML products\n• Track record of building engineering teams (50+ engineers)\n• Enterprise SaaS background preferred\n• Experience with microservices architecture and cloud-native technologies\n\nWe are looking to fill this position within the next 60 days. Please let us know your availability for an initial briefing call this week.\n\nBest regards,\nMarcus Johnson\nEngineering Manager, Nexus AI',
    status: 'sent', createdAt: daysAgo(2), sentAt: daysAgo(2), aiGenerated: true,
    sourcePrompt: 'Email our executive recruiter about the CTO search with key requirements',
  },
  {
    id: 'em3', to: 'elena@nexus.ai', toName: 'Elena Rodriguez', subject: 'Design Review - Mobile Navigation Redesign',
    body: 'Hi Elena,\n\nFollowing up on the competitive analysis findings, I wanted to discuss the mobile navigation redesign timeline.\n\nKey considerations:\n• Current navigation has 3 more taps than competitor average\n• Users spend 40% more time finding features on mobile\n• We should prioritize the top 5 most-used features\n\nCan we schedule a design review session this week to kickstart this project?\n\nThanks,\nSarah',
    status: 'draft', createdAt: daysAgo(0), aiGenerated: true,
    sourcePrompt: 'Draft email to Elena about starting the mobile navigation redesign based on competitive analysis',
  },
  {
    id: 'em4', to: 'team@nexus.ai', toName: 'Product Team', subject: 'Weekly Update - Sprint 24 Progress',
    body: 'Hi team,\n\nHere\'s your weekly sprint update:\n\n✅ Completed:\n• SSO integration (SAML + OIDC) - ready for QA\n• Monitoring dashboards deployed\n• Investor update deck sent\n\n🔄 In Progress:\n• AI search algorithm specifications (70%)\n• Kubernetes cluster setup (80%)\n• Campaign landing page design (60%)\n\n🚨 Blockers:\n• CloudScale pricing needed for budget finalization\n• Legal review pending for supplier agreement\n\nLet me know if you have any questions.\n\nBest,\nSarah',
    status: 'sent', createdAt: daysAgo(1), sentAt: daysAgo(1), aiGenerated: false,
  },
  {
    id: 'em5', to: 'legal@nexus.ai', toName: 'Legal Team', subject: 'Urgent: CloudScale Agreement Review',
    body: 'Hi Legal Team,\n\nWe need to complete the review of the CloudScale supplier agreement by end of week. The contract signing is scheduled for next week.\n\nKey areas requiring review:\n1. Data residency clauses for EU and APAC compliance\n2. SLA terms and penalty structure\n3. Termination and exit clauses\n4. IP ownership of custom configurations\n\nThe full agreement document has been uploaded to the workspace. Please prioritize this review.\n\nThanks,\nMarcus',
    status: 'pending', createdAt: daysAgo(0), aiGenerated: true,
    sourcePrompt: 'Email legal about urgently reviewing the CloudScale agreement before signing next week',
  },
  {
    id: 'em6', to: 'nina@nexus.ai', toName: 'Nina Kowalski', subject: 'Template Library - Content Brief',
    body: 'Hi Nina,\n\nBased on the user research findings, we need to build a template library with 10 starter templates. Here are the priority templates based on user demand:\n\n1. Project Kickoff\n2. Meeting Notes\n3. Product Requirements Document\n4. Sprint Retrospective\n5. Customer Feedback Summary\n6. Competitive Analysis\n7. Quarterly Business Review\n8. Design Brief\n9. Technical Specification\n10. Marketing Campaign Plan\n\nCan you start drafting the content for the first 5 templates by next week?\n\nThanks,\nSarah',
    status: 'sent', createdAt: daysAgo(3), sentAt: daysAgo(3), aiGenerated: true,
    sourcePrompt: 'Email Nina about creating the template library with the top 10 templates users requested',
  },
];

// ── AI Chat ─────────────────────────────────────────────────
export const conversations: Conversation[] = [
  {
    id: 'conv1',
    title: 'Q2 Roadmap Analysis',
    createdAt: daysAgo(2),
    updatedAt: daysAgo(0),
    messages: [
      {
        id: 'msg1', role: 'user', content: 'Summarize the Q2 product roadmap and highlight any risks.',
        timestamp: daysAgo(2) + 'T10:00:00Z',
      },
      {
        id: 'msg2', role: 'assistant',
        content: 'Based on my analysis of the **Q2 2026 Product Roadmap**, here\'s a comprehensive summary:\n\n## Key Initiatives\n\n1. **AI-Powered Search** (Launch: June 15)\n   - Full-text semantic search across all workspace documents\n   - Estimated 3x improvement in information discovery\n\n2. **Collaborative Workspaces** (Beta: July 1)\n   - Real-time multi-user editing\n   - Permissions and sharing controls\n\n3. **Enterprise API v2** (Release: August)\n   - RESTful and GraphQL endpoints\n   - Rate limiting and authentication improvements\n\n## ⚠️ Identified Risks\n\n1. **Tight timeline for AI Search** — Only 2 weeks remain before the algorithm specs deadline, and the team is at 70% capacity\n2. **Dependency on CloudScale** — Infrastructure partnership not yet finalized; delays could impact Q3 plans\n3. **Resource contention** — Alex Kim is assigned to both AI search specs and Kafka schema design simultaneously\n\n## Budget\n- 15% engineering budget increase approved\n- New partnership with CloudScale for infrastructure (pending contract)',
        timestamp: daysAgo(2) + 'T10:00:05Z',
        sources: [
          { documentId: 'doc1', documentTitle: 'Q2 2026 Product Roadmap', pageNumber: 3, excerpt: 'AI-powered search launching June 15th with semantic search capabilities...', relevance: 0.95 },
          { documentId: 'doc1', documentTitle: 'Q2 2026 Product Roadmap', pageNumber: 8, excerpt: 'Budget increase of 15% approved for engineering department...', relevance: 0.88 },
        ],
      },
      {
        id: 'msg3', role: 'user', content: 'What action items should I prioritize this week?',
        timestamp: daysAgo(1) + 'T09:00:00Z',
      },
      {
        id: 'msg4', role: 'assistant',
        content: 'Based on the roadmap deadlines and current task statuses, here are your **priority action items for this week**:\n\n### 🔴 Critical (This Week)\n1. **Review CloudScale SLA terms** — Contract signing is in 8 days, legal review still pending\n2. **Begin CTO recruitment** — Board-mandated, 5-day deadline approaching\n3. **Finalize AI search specs** — 7-day deadline, currently in progress at ~70%\n\n### 🟡 Important (Next 2 Weeks)\n4. **Design Kafka event schemas** — Blocks microservices migration progress\n5. **Campaign landing page** — 8 days until launch, currently at 60%\n6. **APAC strategy document** — Board presentation in 10 days\n\n### 💡 Recommendation\nI notice Alex Kim is assigned to both items #3 and #4, which creates a resource conflict. Consider:\n- Reassigning the Kafka schema design to another engineer\n- Or extending the Kafka deadline by 1 week\n\nShall I create a prioritized task view with these items?',
        timestamp: daysAgo(1) + 'T09:00:05Z',
        sources: [
          { documentId: 'doc1', documentTitle: 'Q2 2026 Product Roadmap', pageNumber: 5, excerpt: 'AI search algorithm specifications must be finalized before development begins...', relevance: 0.92 },
          { documentId: 'doc7', documentTitle: 'Supplier Agreement - CloudScale', pageNumber: 1, excerpt: 'Contract signing deadline: June 7, 2026...', relevance: 0.89 },
          { documentId: 'doc2', documentTitle: 'Board Meeting Minutes', pageNumber: 4, excerpt: 'CTO hire approved — search begins immediately...', relevance: 0.85 },
        ],
      },
    ],
  },
  {
    id: 'conv2',
    title: 'Financial & Growth Analysis',
    createdAt: daysAgo(5),
    updatedAt: daysAgo(4),
    messages: [
      {
        id: 'msg5', role: 'user', content: 'Compare our Q1 financial performance with our competitive positioning.',
        timestamp: daysAgo(5) + 'T14:00:00Z',
      },
      {
        id: 'msg6', role: 'assistant',
        content: '## Financial vs. Competitive Analysis\n\nCross-referencing the **Q1 Financial Report** with the **Competitive Analysis Report**:\n\n### Financial Strengths\n| Metric | Value | Industry Avg |\n|--------|-------|-------------|\n| ARR | $12M | $8.5M |\n| QoQ Growth | 32% | 22% |\n| Net Revenue Retention | 125% | 110% |\n| Enterprise Customers | 45 | 32 |\n\n### Strategic Alignment\n- ✅ Our **AI capabilities** (ranked #1) are driving the strong **net revenue retention** (125%)\n- ⚠️ Despite strong financials, our **mobile experience** gap could slow enterprise adoption\n- ⚠️ **3 new competitors** entered in Q1 — our pricing advantage is narrowing\n\n### Key Recommendation\nThe financial data supports investing in the identified gaps:\n1. **Mobile redesign** — Protect enterprise retention\n2. **Real-time collaboration** — Match competitor parity\n3. **APAC expansion** — Capitalize on growth while ahead\n\nThe 32% growth rate and extended 24-month runway give us the resources to address these gaps.',
        timestamp: daysAgo(5) + 'T14:00:05Z',
        sources: [
          { documentId: 'doc5', documentTitle: 'Q1 2026 Financial Report', pageNumber: 2, excerpt: 'ARR reached $12M, up from $9.1M last quarter...', relevance: 0.94 },
          { documentId: 'doc3', documentTitle: 'Competitive Analysis Report', pageNumber: 12, excerpt: 'Nexus AI ranked #1 in AI capabilities among 12 competitors...', relevance: 0.91 },
        ],
      },
    ],
  },
];

// ── AI Insights ─────────────────────────────────────────────
export const aiInsights: AIInsight[] = [
  { id: 'ins1', type: 'deadline', title: '3 deadlines due this week', description: 'CloudScale SLA review, CTO recruitment start, and AI search specs all due within 7 days.', priority: 'urgent', actionLabel: 'View Deadlines', timestamp: daysAgo(0) + 'T08:00:00Z' },
  { id: 'ins2', type: 'blocked', title: '2 tasks blocked by missing information', description: 'APAC strategy and Q3 budget planning are waiting for CloudScale pricing update.', priority: 'high', actionLabel: 'View Blocked Tasks', relatedTaskId: 't4', timestamp: daysAgo(0) + 'T08:15:00Z' },
  { id: 'ins3', type: 'followup', title: 'Follow up with CloudScale', description: 'Pricing request email sent 1 day ago. No response yet. Consider a follow-up.', priority: 'medium', actionLabel: 'Send Follow-up', relatedDocumentId: 'doc7', timestamp: daysAgo(0) + 'T09:00:00Z' },
  { id: 'ins4', type: 'update', title: 'Architecture review document updated', description: 'Alex Kim updated the Engineering Architecture Review yesterday with new Kafka schema proposals.', priority: 'low', relatedDocumentId: 'doc4', timestamp: daysAgo(0) + 'T07:30:00Z' },
  { id: 'ins5', type: 'meeting', title: 'Product Strategy Review tomorrow', description: 'You have a strategy review meeting at 10:00 AM with Marcus and Elena. Agenda not yet set.', priority: 'medium', actionLabel: 'Set Agenda', timestamp: daysAgo(0) + 'T08:30:00Z' },
  { id: 'ins6', type: 'action', title: 'SSO integration ready for final review', description: 'All subtasks completed. The SSO integration is ready for your final sign-off.', priority: 'high', actionLabel: 'Review Now', relatedTaskId: 't13', timestamp: daysAgo(0) + 'T10:00:00Z' },
];

// ── Dashboard Stats ─────────────────────────────────────────
export const dashboardStats: DashboardStats = {
  totalDocuments: 8,
  documentsTrend: 12,
  pendingTasks: 10,
  tasksTrend: -5,
  upcomingMeetings: 6,
  nextMeeting: 'Product Strategy Review — Tomorrow, 10:00 AM',
  emailsAwaitingApproval: 2,
  emailsTrend: 3,
};

// ── Project Progress ────────────────────────────────────────
export const projectProgress: ProjectProgress[] = [
  { name: 'AI Search', completed: 35, inProgress: 40, remaining: 25 },
  { name: 'Workspaces', completed: 15, inProgress: 20, remaining: 65 },
  { name: 'API v2', completed: 10, inProgress: 15, remaining: 75 },
  { name: 'Mobile', completed: 5, inProgress: 10, remaining: 85 },
  { name: 'Infra Migration', completed: 45, inProgress: 30, remaining: 25 },
];

// ── Team Workload ───────────────────────────────────────────
export const teamWorkload: TeamWorkload[] = [
  { name: 'Sarah C.', avatar: '', tasks: 4, capacity: 5 },
  { name: 'Marcus J.', avatar: '', tasks: 3, capacity: 4 },
  { name: 'Elena R.', avatar: '', tasks: 3, capacity: 4 },
  { name: 'Alex K.', avatar: '', tasks: 3, capacity: 3 },
  { name: 'James W.', avatar: '', tasks: 1, capacity: 3 },
  { name: 'Priya P.', avatar: '', tasks: 2, capacity: 3 },
  { name: 'David L.', avatar: '', tasks: 2, capacity: 3 },
  { name: 'Nina K.', avatar: '', tasks: 3, capacity: 4 },
];

// ── Knowledge Graph ─────────────────────────────────────────
const graphNodes: GraphNode[] = [
  // Documents
  { id: 'doc1', label: 'Q2 Roadmap', type: 'document', color: '#6366f1', size: 8 },
  { id: 'doc2', label: 'Board Minutes', type: 'document', color: '#6366f1', size: 6 },
  { id: 'doc3', label: 'Competitive Analysis', type: 'document', color: '#6366f1', size: 7 },
  { id: 'doc4', label: 'Architecture Review', type: 'document', color: '#6366f1', size: 7 },
  { id: 'doc5', label: 'Q1 Financial', type: 'document', color: '#6366f1', size: 5 },
  { id: 'doc6', label: 'User Research', type: 'document', color: '#6366f1', size: 6 },
  { id: 'doc7', label: 'CloudScale SLA', type: 'document', color: '#6366f1', size: 5 },
  { id: 'doc8', label: 'Marketing Brief', type: 'document', color: '#6366f1', size: 5 },
  // Projects
  { id: 'proj1', label: 'AI Search', type: 'project', color: '#8b5cf6', size: 9 },
  { id: 'proj2', label: 'Workspaces', type: 'project', color: '#8b5cf6', size: 8 },
  { id: 'proj3', label: 'APAC Expansion', type: 'project', color: '#8b5cf6', size: 7 },
  { id: 'proj4', label: 'Infra Migration', type: 'project', color: '#8b5cf6', size: 8 },
  { id: 'proj5', label: 'Summer Campaign', type: 'project', color: '#8b5cf6', size: 6 },
  // People
  { id: 'p1', label: 'Sarah Chen', type: 'person', color: '#10b981', size: 8 },
  { id: 'p2', label: 'Marcus Johnson', type: 'person', color: '#10b981', size: 7 },
  { id: 'p3', label: 'Elena Rodriguez', type: 'person', color: '#10b981', size: 6 },
  { id: 'p4', label: 'Alex Kim', type: 'person', color: '#10b981', size: 7 },
  { id: 'p7', label: 'David Lee', type: 'person', color: '#10b981', size: 5 },
  // Tasks
  { id: 't1', label: 'AI Search Specs', type: 'task', color: '#f59e0b', size: 5 },
  { id: 't4', label: 'APAC Strategy', type: 'task', color: '#f59e0b', size: 5 },
  { id: 't6', label: 'K8s Setup', type: 'task', color: '#f59e0b', size: 5 },
  { id: 't13', label: 'SSO Integration', type: 'task', color: '#f59e0b', size: 5 },
  // Meetings
  { id: 'ev1', label: 'Strategy Review', type: 'meeting', color: '#ec4899', size: 5 },
  { id: 'ev2', label: 'Launch Planning', type: 'meeting', color: '#ec4899', size: 4 },
  { id: 'ev5', label: 'APAC Presentation', type: 'meeting', color: '#ec4899', size: 4 },
];

const graphLinks: GraphLink[] = [
  // Document → Project connections
  { source: 'doc1', target: 'proj1', label: 'defines' },
  { source: 'doc1', target: 'proj2', label: 'defines' },
  { source: 'doc4', target: 'proj4', label: 'describes' },
  { source: 'doc2', target: 'proj3', label: 'approves' },
  { source: 'doc8', target: 'proj5', label: 'plans' },
  { source: 'doc3', target: 'proj1', label: 'analyzes' },
  // Person → Project connections
  { source: 'p1', target: 'proj1', label: 'leads' },
  { source: 'p1', target: 'proj3', label: 'leads' },
  { source: 'p4', target: 'proj1', label: 'develops' },
  { source: 'p4', target: 'proj4', label: 'develops' },
  { source: 'p2', target: 'proj4', label: 'manages' },
  { source: 'p3', target: 'proj5', label: 'designs' },
  { source: 'p7', target: 'proj4', label: 'operates' },
  // Person → Document connections
  { source: 'p1', target: 'doc1', label: 'authored' },
  { source: 'p2', target: 'doc2', label: 'authored' },
  { source: 'p4', target: 'doc4', label: 'authored' },
  { source: 'p1', target: 'doc5', label: 'authored' },
  // Task → Project connections
  { source: 't1', target: 'proj1', label: 'part of' },
  { source: 't4', target: 'proj3', label: 'part of' },
  { source: 't6', target: 'proj4', label: 'part of' },
  // Task → Person connections
  { source: 't1', target: 'p4', label: 'assigned to' },
  { source: 't4', target: 'p1', label: 'assigned to' },
  { source: 't6', target: 'p7', label: 'assigned to' },
  { source: 't13', target: 'p4', label: 'assigned to' },
  // Meeting → Person connections
  { source: 'ev1', target: 'p1', label: 'attendee' },
  { source: 'ev1', target: 'p2', label: 'attendee' },
  { source: 'ev2', target: 'p1', label: 'attendee' },
  { source: 'ev2', target: 'p4', label: 'attendee' },
  { source: 'ev5', target: 'p1', label: 'attendee' },
  // Meeting → Project connections
  { source: 'ev1', target: 'proj1', label: 'reviews' },
  { source: 'ev2', target: 'proj1', label: 'plans' },
  { source: 'ev5', target: 'proj3', label: 'presents' },
  // Document cross-references
  { source: 'doc5', target: 'doc3', label: 'supports' },
  { source: 'doc7', target: 'doc2', label: 'referenced in' },
  { source: 'doc6', target: 'doc3', label: 'complements' },
];

export const knowledgeGraphData: KnowledgeGraphData = {
  nodes: graphNodes,
  links: graphLinks,
};

// ── Recent Activity ─────────────────────────────────────────
export const recentActivity: ActivityItem[] = [
  { id: 'act1', type: 'upload', title: 'Document uploaded', description: 'User Research Findings uploaded', timestamp: daysAgo(0) + 'T09:30:00Z', user: people[5] },
  { id: 'act2', type: 'task_complete', title: 'Task completed', description: 'Deploy monitoring dashboards', timestamp: daysAgo(0) + 'T08:45:00Z', user: people[6] },
  { id: 'act3', type: 'email_sent', title: 'Email sent', description: 'CTO Search email to recruiters', timestamp: daysAgo(1) + 'T14:20:00Z', user: people[1] },
  { id: 'act4', type: 'ai_insight', title: 'AI insight generated', description: 'New deadline risk detected', timestamp: daysAgo(1) + 'T10:00:00Z', user: people[0] },
  { id: 'act5', type: 'upload', title: 'Document uploaded', description: 'Architecture Review updated', timestamp: daysAgo(2) + 'T16:00:00Z', user: people[3] },
  { id: 'act6', type: 'comment', title: 'Comment added', description: 'Feedback on campaign designs', timestamp: daysAgo(2) + 'T11:30:00Z', user: people[2] },
  { id: 'act7', type: 'meeting', title: 'Meeting scheduled', description: 'APAC Strategy Presentation', timestamp: daysAgo(3) + 'T09:00:00Z', user: people[0] },
];

// ── Suggested Prompts ───────────────────────────────────────
export const suggestedPrompts = [
  { id: 'sp1', text: 'Summarize all documents from this week', category: 'Summarize' },
  { id: 'sp2', text: 'What are the key deadlines coming up?', category: 'Extract' },
  { id: 'sp3', text: 'Compare the product roadmap with competitive analysis', category: 'Compare' },
  { id: 'sp4', text: 'List all action items from the board meeting', category: 'Extract' },
  { id: 'sp5', text: 'What risks were identified across all documents?', category: 'Analyze' },
  { id: 'sp6', text: 'Generate a weekly status update email', category: 'Generate' },
  { id: 'sp7', text: 'Who is working on what this sprint?', category: 'Query' },
  { id: 'sp8', text: 'What decisions were made in the board meeting?', category: 'Extract' },
];
