import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { userId, userName, userRole, tasks, emails, documents, messages } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;

    // Check if it's the John Smith mockup profile or if we want to run a mock fallback
    const isMock = !apiKey || userName?.toLowerCase().includes('john') || userName?.toLowerCase().includes('smith') || (tasks?.length === 0 && emails?.length === 0);

    if (isMock) {
      // Return high-fidelity preset handover structured data to wow the user instantly
      const mockHandover = {
        id: `handover-${Date.now()}`,
        employeeId: userId || 'mock-id-john-smith',
        employeeName: userName || 'John Smith',
        employeeRole: userRole || 'Lead Fullstack Developer',
        projects: [
          {
            name: 'Client Portal Redesign',
            progress: 80,
            status: 'in-progress',
            blockers: ['Waiting for Stripe approval', 'Design signoff pending'],
            keyStakeholders: ['Sarah (Product Manager)', 'Mike (Client Contact)'],
            nextActions: ['Complete API testing by Friday', 'Follow up with Stripe support team']
          },
          {
            name: 'Payment Gateway Migration',
            progress: 40,
            status: 'in-progress',
            blockers: ['Design signoff pending from Mike'],
            keyStakeholders: ['Mike (Client Contact)', 'Snehal (Backend lead)'],
            nextActions: ['Follow up with Stripe API key setup', 'Address row-level-security policy checks']
          },
          {
            name: 'AWS Infrastructure Audit',
            progress: 95,
            status: 'active',
            blockers: ['None'],
            keyStakeholders: ['David (Security Lead)'],
            nextActions: ['Rotate AWS IAM credentials', 'Hand over root access keys to David']
          }
        ],
        relationshipGraph: {
          nodes: [
            { id: 'employee', label: userName || 'John Smith', role: userRole || 'Lead Fullstack Developer', interactionLevel: 'high' },
            { id: 'sarah', label: 'Sarah Jenks', role: 'Product Manager', interactionLevel: 'high' },
            { id: 'mike', label: 'Mike Vance', role: 'Client Contact', interactionLevel: 'medium' },
            { id: 'david', label: 'David Vance', role: 'Security Lead', interactionLevel: 'high' },
            { id: 'snehal', label: 'Snehal Patil', role: 'Backend Lead', interactionLevel: 'medium' },
            { id: 'raj', label: 'Raj Patel', role: 'DevOps Lead', interactionLevel: 'low' }
          ],
          links: [
            { source: 'employee', target: 'sarah', label: 'Worked closely on Client Portal Redesign' },
            { source: 'employee', target: 'mike', label: 'Managed client relationship for ABC Corp' },
            { source: 'employee', target: 'david', label: 'Frequently discussed IAM and DB security' },
            { source: 'employee', target: 'snehal', label: 'Co-owned the Payments pipeline migration' },
            { source: 'employee', target: 'raj', label: 'Discussed Vercel & Supabase configurations' }
          ]
        },
        decisionHistory: [
          {
            id: 'd1',
            date: '2026-03-12',
            title: 'Migrate from Firebase to Supabase',
            details: 'Moved main application stack database and auth provider to Supabase.',
            rationale: 'During architecture meeting on 12 March, the team decided to move because Firebase costs were increasing and row-level security was needed.',
            category: 'Architecture'
          },
          {
            id: 'd2',
            date: '2026-04-05',
            title: 'Use Stripe for Client Portal Subscriptions',
            details: 'Standardized payment gateway processing using Stripe.',
            rationale: 'Stripe was preferred over Razorpay for international billing. We need international multi-currency credit cards which Stripe handles with cleaner webhook APIs.',
            category: 'Payments'
          },
          {
            id: 'd3',
            date: '2026-04-20',
            title: 'Adopt Next.js 15 Parallel Routes',
            details: 'Changed dashboard route patterns to parallel routes.',
            rationale: 'Decided to adopt parallel routes to load the Analytics and Overview widgets concurrently, resolving load speed bottlenecks.',
            category: 'Frontend'
          }
        ],
        commitments: [
          {
            id: 'c1',
            text: 'Send the proposal to ABC Corp',
            dueDate: 'Tomorrow',
            status: 'pending',
            source: 'Email draft'
          },
          {
            id: 'c2',
            text: 'Review the PR before Friday',
            dueDate: 'Friday',
            status: 'pending',
            source: 'Slack DM to Sarah'
          },
          {
            id: 'c3',
            text: 'Talk to the client next week',
            dueDate: 'Next week',
            status: 'pending',
            source: 'Meeting discussion'
          },
          {
            id: 'c4',
            text: 'Rotate database access secrets',
            dueDate: 'Friday',
            status: 'completed',
            source: 'Task list action'
          }
        ],
        successorBriefing: {
          timeToRead: '15-minute onboarding briefing',
          projectsCount: 3,
          relationshipsCount: 6,
          deadlinesCount: 5,
          commitmentsCount: 4,
          risksCount: 2,
          textBriefing: `John Smith was the core owner of our infrastructure and payment gateways. His departure creates two key operational risks:
1. Payment Migration (currently 40%): The migration needs Stripe signoff which is currently waiting for Stripe support approval. The successor must follow up with Stripe by Friday.
2. IAM Credentials: John owned all root AWS access keys. These keys must be rotated immediately upon transition.
To proceed, start by reviewing the Supabase RLS schema documentation and synchronize with Sarah regarding the client timeline for ABC Corp.`
        },
        risks: [
          'IAM Access: Root keys are owned by John and need immediate rotation.',
          'Stripe approval lag could delay Client Portal payment launches.'
        ],
        createdBy: 'HR / Workspace Manager',
        createdAt: new Date().toISOString(),
        status: 'transitioning'
      };

      return NextResponse.json({ success: true, data: mockHandover });
    }

    // If API key exists and we have real data, use Gemini to do a real workspace extraction
    // Prepare workspace context to feed the AI
    const taskContext = (tasks || []).map((t: any) => 
      `- [Task] "${t.title}": Status=${t.status}, Priority=${t.priority}, Due=${t.dueDate || 'none'}, Desc=${t.description || ''}`
    ).join('\n');

    const emailContext = (emails || []).slice(0, 10).map((e: any) => 
      `- [Email] Subj="${e.subject}", To/From="${e.toName || e.to}", Status=${e.status}, BodySnippet="${(e.body || '').substring(0, 100)}..."`
    ).join('\n');

    const docContext = (documents || []).slice(0, 5).map((d: any) => 
      `- [Doc] "${d.title}" (${d.type}): Summary="${d.summary || ''}"`
    ).join('\n');

    const msgContext = (messages || []).slice(0, 15).map((m: any) => 
      `- [Message] Sender="${m.sender?.name || 'User'}", Msg="${m.content || ''}"`
    ).join('\n');

    const contextText = `
EMPLOYEE INFORMATION:
Name: ${userName}
Role: ${userRole}

TASKS ASSIGNED:
${taskContext || 'No tasks assigned.'}

RECENT EMAILS:
${emailContext || 'No emails found.'}

DOCUMENTS ASSOCIATED:
${docContext || 'No documents associated.'}

CHAT MESSAGES:
${msgContext || 'No chat history found.'}
    `.trim();

    const systemPrompt = `You are Nexus AI Handover Generator.
Analyze the employee's workspace context and output a structured Handover JSON.
Return EXACTLY a JSON object matching this schema. Do not return any extra markdown styling or backticks:
{
  "projects": [
    {
      "name": "Project Name",
      "progress": 80, // Number (0-100)
      "status": "in-progress" or "completed" or "active",
      "blockers": ["Blocker 1", "Blocker 2"],
      "keyStakeholders": ["Sarah (Product Manager)", "David (Dev)"],
      "nextActions": ["Action 1", "Action 2"]
    }
  ],
  "relationshipGraph": {
    "nodes": [
      { "id": "employee", "label": "${userName}", "role": "${userRole}", "interactionLevel": "high" },
      { "id": "contact_id", "label": "Contact Name", "role": "Contact Role", "interactionLevel": "high" | "medium" | "low" }
    ],
    "links": [
      { "source": "employee", "target": "contact_id", "label": "Connection context" }
    ]
  },
  "decisionHistory": [
    {
      "id": "dec_id",
      "date": "2026-06-05",
      "title": "Decision title",
      "details": "Details about decision",
      "rationale": "Why this decision was made",
      "category": "Architecture" | "Billing" | "Product"
    }
  ],
  "commitments": [
    {
      "id": "com_id",
      "text": "Unfulfilled commitment statement extracted (e.g. 'I will send proposal')",
      "dueDate": "Tomorrow" or "Friday" or "Next week",
      "status": "pending",
      "source": "Chat message" or "Email"
    }
  ],
  "successorBriefing": {
    "timeToRead": "15-minute onboarding briefing",
    "projectsCount": 3,
    "relationshipsCount": 5,
    "deadlinesCount": 4,
    "commitmentsCount": 3,
    "risksCount": 2,
    "textBriefing": "Onboarding overview briefing detailing critical projects and risks..."
  },
  "risks": [
    "Key risk 1",
    "Key risk 2"
  ]
}`;

    const contents = [
      {
        role: 'user',
        parts: [{ text: `Here is the workspace activity data for ${userName} (${userRole}):\n\n${contextText}\n\nPlease analyze and generate the structured handover JSON.` }]
      }
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || 'Gemini Handover generation failed');
    }

    const jsonString = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsedData = JSON.parse(jsonString.trim());

    // Inject server-side metadata fields
    const completedHandover = {
      id: `handover-${Date.now()}`,
      employeeId: userId,
      employeeName: userName,
      employeeRole: userRole,
      ...parsedData,
      createdBy: 'HR / Workspace Manager',
      createdAt: new Date().toISOString(),
      status: 'transitioning'
    };

    return NextResponse.json({ success: true, data: completedHandover });
  } catch (error: any) {
    console.error('Gemini Handover API Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'An error occurred while generating employee handover.' },
      { status: 500 }
    );
  }
}
