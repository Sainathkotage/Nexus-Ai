export interface CompetitorComparison {
  name: string;
  slug: string;
  coreModel: string;
  emailIntegration: string;
  calendarAutomation: string;
  handoverAutomation: string;
  pros: string[];
  cons: string[];
  faqQuestion: string;
  faqAnswer: string;
  migrationSteps: string[];
}

export interface UseCaseData {
  name: string;
  slug: string;
  industry: string;
  painPoints: string[];
  solutions: string[];
  features: string[];
  caseStudy: {
    company: string;
    metrics: string;
    description: string;
  };
}

export interface BlogPostData {
  title: string;
  slug: string;
  description: string;
  publishDate: string;
  tldr: string;
  takeaways: string[];
  content: string; // Markdown content
}

export const competitorsData: Record<string, CompetitorComparison> = {
  notion: {
    name: "Notion",
    slug: "notion",
    coreModel: "Passive (Manual document entries)",
    emailIntegration: "None (Requires external plugins)",
    calendarAutomation: "Basic calendar links only",
    handoverAutomation: "None (Requires manual wiki drafting)",
    pros: [
      "Extensive template ecosystem",
      "Highly customizable databases",
      "Large public community"
    ],
    cons: [
      "Requires high manual upkeep",
      "No native active AI assistants",
      "Prone to outdated context leakage"
    ],
    faqQuestion: "Can I migrate my workspace databases from Notion to Nexus AI?",
    faqAnswer: "Yes. Nexus AI offers a one-click Notion importer that preserves page relations, custom columns, comments, and document histories.",
    migrationSteps: [
      "Export your Notion workspace as HTML/Markdown from Settings.",
      "Upload the ZIP file into Nexus AI Settings -> Import.",
      "Background indexers will parse the relational databases and populate active boards."
    ]
  },
  clickup: {
    name: "ClickUp",
    slug: "clickup",
    coreModel: "Manual Task Tracking Boards",
    emailIntegration: "Basic email attachments sync",
    calendarAutomation: "Reactive time-blocking blocks",
    handoverAutomation: "None (Manual task allocation)",
    pros: [
      "Highly detailed list/board custom layouts",
      "In-app messaging channels",
      "Goal setting widgets"
    ],
    cons: [
      "High interface bloat and slow load speeds",
      "Steep learning curve for new employees",
      "No automated offboarding handovers"
    ],
    faqQuestion: "How does project delegation differ in Nexus AI compared to ClickUp?",
    faqAnswer: "ClickUp requires manual task creation and rules. Nexus AI reads chats, emails, and transcripts to auto-delegate and schedule tasks.",
    migrationSteps: [
      "Navigate to ClickUp settings and export task CSV data.",
      "Upload the CSV to Nexus AI Project Space.",
      "AI will map task columns and automatically assign tags based on user bandwidth."
    ]
  },
  asana: {
    name: "Asana",
    slug: "asana",
    coreModel: "Traditional Gantt & Board Lists",
    emailIntegration: "Email-to-task creation only",
    calendarAutomation: "Basic calendar views",
    handoverAutomation: "None (Manual offboarding checklist)",
    pros: [
      "Clean visual timelines and boards",
      "Collaborative project comment streams",
      "Standard workflow rules engine"
    ],
    cons: [
      "Lacks native email inbox or calendar scheduling",
      "AI features are locked behind high pricing tiers",
      "No context preservation or organizational memory"
    ],
    faqQuestion: "Why is Nexus AI a better alternative to Asana for remote teams?",
    faqAnswer: "Asana is a passive task tracker. Nexus AI unifies communication (email and chat) with task boards and auto-updates project statuses.",
    migrationSteps: [
      "Select Asana CSV export in project actions.",
      "Upload to Nexus AI Importer.",
      "Select target team members to map roles and calendars."
    ]
  }
};

export const useCasesData: Record<string, UseCaseData> = {
  startups: {
    name: "Startups & Scale-ups",
    slug: "startups",
    industry: "High-Growth Tech",
    painPoints: [
      "High software tool cost and workspace silos",
      "Rapid team scaling leading to context leakage",
      "Hours wasted daily on manual task triage and schedules"
    ],
    solutions: [
      "Unifying Slack, Notion, Calendly, and Jira into one active operating system",
      "Preserving institutional decisions in a permanent searchable brain",
      "Using the AI Chief of Staff to schedule deep work blocks automatically"
    ],
    features: [
      "Sub-second semantic search queries",
      "Context-rich client/investor CRM pipelines",
      "Automated offboarding handover documentation"
    ],
    caseStudy: {
      company: "AeroTech Labs",
      metrics: "Reclaimed 14 hours per developer weekly",
      description: "AeroTech consolidated Notion, Slack, and Jira into Nexus AI, keeping their remote engineering team aligned across time zones."
    }
  },
  legal: {
    name: "Legal Operations & Councils",
    slug: "legal",
    industry: "Legal Services",
    painPoints: [
      "Managing massive client files and communication histories",
      "Risk of context leakage during lawyer handovers",
      "Drafting repetitive contract recaps and email updates"
    ],
    solutions: [
      "Auto-logging email activity and client contact logs",
      "Auto-drafting legal briefs and agreement summaries",
      "HIPAA and SOC 2 secure isolated data hosting"
    ],
    features: [
      "SAML SSO and role-based permissions",
      "Encrypted document storage with version history",
      "Dynamic document summary widgets"
    ],
    caseStudy: {
      company: "Apex Legal Group",
      metrics: "Decreased offboarding transition times by 80%",
      description: "Apex Legal Group used automated handovers to instantly transfer client relationship graphs when senior partners retired."
    }
  }
};

export const blogPostsData: Record<string, BlogPostData> = {
  "what-is-an-ai-chief-of-staff": {
    title: "What is an AI Chief of Staff? Definition & Platform Guide",
    slug: "what-is-an-ai-chief-of-staff",
    description: "Learn what an AI Chief of Staff is, how it unifies tasks, emails, and calendar schedules, and why it is the next evolution of digital workspaces.",
    publishDate: "June 18, 2026",
    tldr: "An AI Chief of Staff is a proactive administrative coordinator that unifies calendars, tasks, documents, and emails into a single operating system to automate routine management tasks and preserve company knowledge.",
    takeaways: [
      "Unifies siloed communication channels (Slack, Gmail, Outlook) and task boards into one active workspace.",
      "Proactively schedules deep focus blocks, auto-drafts contextual replies, and logs meeting commitments.",
      "Reduces daily context-switching overhead, reclaiming an average of 1.8 hours per employee daily."
    ],
    content: `
## The Rise of the AI Chief of Staff
In high-growth companies, founders and operations leads spend up to 40% of their weeks coordinating work rather than executing it. The term **AI Chief of Staff** describes a new class of active workspace applications that natively integrate artificial intelligence into team communication, task management, and calendar scheduling to eliminate administrative overhead.

Unlike traditional tools like Notion, ClickUp, or Slack—which function as passive databases requiring constant manual entry—an AI Chief of Staff acts as an active partner. It scans team communications, indexes context, schedules deep work, and drafts follow-up emails, maintaining complete historical alignment across the organization.

## Core Capabilities of an AI Chief of Staff
A fully realized AI Chief of Staff workspace provides three primary layers of automation:
- **Proactive Triage & Daily Briefings**: The system evaluates incoming emails and chat threads in the background, summarizing key metrics and presenting a clear daily agenda rather than a cluttered inbox.
- **Autonomous Meeting Intelligence**: By connecting to video integrations, it parses transcripts, logs critical team votes, drafts summaries, and schedules follow-up cards on task boards.
- **Context-Aware Context Retention**: The AI reads across files, tasks, and historical emails to act as a searchable, permanent knowledge center for the company.
    `
  },
  "employee-handover-automation": {
    title: "Preserving Context: Automated Employee Handover & Company Memory",
    slug: "employee-handover-automation",
    description: "How to eliminate context loss during employee offboarding. Use Nexus AI to generate handovers, client logs, and onboarding guides automatically.",
    publishDate: "June 18, 2026",
    tldr: "When key employees leave, companies lose critical context. Nexus AI unifies communication histories and task statuses to build complete Handover Packages and onboarding guides in under 5 minutes.",
    takeaways: [
      "Employee turnover causes up to 70% context leakage when legacy files and contacts are undocumented.",
      "Nexus AI unifies task histories and contact logs to compile onboarding context packages for successors automatically.",
      "Successors can query the permanent company memory using semantic chat, resolving historical context in seconds."
    ],
    content: `
## The Challenge of Knowledge Retention
When a key team member departs, the company loses more than their labor—they lose years of undocumented decisions, project context, and relationship histories. Studies show that companies lose up to **70% of localized project context** during a departure, causing new hires to spend months re-learning legacy systems.

Traditional offboarding processes rely on manual handover logs that are often rushed, incomplete, and quickly forgotten. **Nexus AI** solves this knowledge leakage by programmatically converting day-to-day work into a permanent, searchable **Organizational Memory**.

## How Nexus AI Automates the Handover Process
By unifying emails, calendars, documents, and chats, Nexus AI possesses a complete overview of active work streams. When an offboarding trigger occurs, background agents run a structured context sweep:
1. **Responsibility Mapping**: Scans current task boards and assignees to compile an active list of responsibilities.
2. **Relationship Graphing**: Identifies client, vendor, and partner contacts from recent email exchanges and chat logs.
3. **Decision Logging**: Extracts chronological decision points from document comments and meeting transcripts.
4. **Commitment Tracking**: Flags outstanding commitments in sent emails (e.g., "I will send the review next Monday").
    `
  }
};
