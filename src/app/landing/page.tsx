'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useWorkspace } from '@/lib/store';
import { MessageSquare, ClipboardList, Search, ArrowLeftRight, Zap } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  category: string;
  brandColor: string;
  glowColor: string;
  description: string;
  syncFlow: {
    from: string;
    to: string;
  }[];
  logo: React.ReactNode;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'slack',
    name: 'Slack',
    category: 'communication',
    brandColor: '#4a154b',
    glowColor: 'rgba(74, 21, 75, 0.25)',
    description: 'Sync conversations, channels, and threads in real-time to keep your teams aligned.',
    syncFlow: [
      { from: 'Slack message in channel', to: 'Nexus AI context & task thread' },
      { from: 'Nexus task update', to: 'Slack thread reply & notification' }
    ],
    logo: (
      <svg viewBox="0 0 54 54" className="w-8 h-8">
        <g fill="none" fillRule="evenodd">
          <path d="M10.5 34.5a5.25 5.25 0 1 1-5.25 5.25H10.5v-5.25z" fill="#36C5F0"/>
          <path d="M15.75 34.5a5.25 5.25 0 0 1 5.25 5.25v10.5a5.25 5.25 0 0 1-5.25 5.25 5.25 5.25 0 0 1-5.25-5.25v-10.5a5.25 5.25 0 0 1 5.25-5.25z" fill="#36C5F0"/>
          <path d="M19.5 10.5a5.25 5.25 0 1 1-5.25-5.25v5.25h5.25z" fill="#2EB67D"/>
          <path d="M19.5 15.75A5.25 5.25 0 0 1 14.25 21H3.75A5.25 5.25 0 0 1-1.5 15.75a5.25 5.25 0 0 1 5.25-5.25h10.5a5.25 5.25 0 0 1 5.25 5.25z" fill="#2EB67D"/>
          <path d="M43.5 19.5a5.25 5.25 0 1 1 5.25-5.25H43.5v5.25z" fill="#ECB22E"/>
          <path d="M38.25 19.5a5.25 5.25 0 0 1-5.25-5.25V3.75a5.25 5.25 0 0 1 5.25 5.25v10.5a5.25 5.25 0 0 1-5.25 5.25z" fill="#ECB22E"/>
          <path d="M34.5 43.5a5.25 5.25 0 1 1 5.25 5.25H34.5v-5.25z" fill="#E01E5A"/>
          <path d="M34.5 38.25a5.25 5.25 0 0 1 5.25-5.25h10.5a5.25 5.25 0 0 1 5.25 5.25 5.25 5.25 0 0 1-5.25 5.25H39.75a5.25 5.25 0 0 1-5.25-5.25z" fill="#E01E5A"/>
        </g>
      </svg>
    )
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    category: 'communication',
    brandColor: '#5059c9',
    glowColor: 'rgba(80, 89, 201, 0.25)',
    description: 'Bring Teams chat context and meeting summaries directly into your projects.',
    syncFlow: [
      { from: 'Teams channel update', to: 'Nexus meeting workspace & action list' },
      { from: 'Nexus task assignee update', to: 'Teams direct message notification' }
    ],
    logo: (
      <svg viewBox="0 0 32 32" className="w-8 h-8">
        <path d="M24,18a4,4,0,0,1,4,4v2H20V22A4,4,0,0,1,24,18Z" fill="#5059c9"/>
        <circle cx="24" cy="13" r="3" fill="#5059c9"/>
        <path d="M12,14a5,5,0,0,1,5,5v3H7V19A5,5,0,0,1,12,14Z" fill="#7b83eb"/>
        <circle cx="12" cy="8" r="4" fill="#7b83eb"/>
      </svg>
    )
  },
  {
    id: 'meet',
    name: 'Google Meet',
    category: 'communication',
    brandColor: '#0084ff',
    glowColor: 'rgba(0, 132, 255, 0.25)',
    description: 'Capture real-time meeting transcription details and outline instant agenda item tasks.',
    syncFlow: [
      { from: 'Meet live voice transcript', to: 'Nexus interactive meeting minutes' },
      { from: 'Nexus task draft validation', to: 'Meet workspace follow-up card' }
    ],
    logo: (
      <svg viewBox="0 0 24 24" className="w-8 h-8">
        <path d="M0 5.5V17a3 3 0 003 3h11.5v-6L11 11l-3.5 3-4-3.5v-6h-2z" fill="#0084ff"/>
        <path d="M20 5.5l-4.5 3.5v6l4.5 3.5a1 1 0 001.5-.8V6.3a1 1 0 00-1.5-.8z" fill="#00aa47"/>
        <path d="M14.5 0H3A3 3 0 000 3v2.5h14.5V0z" fill="#ff2d55"/>
        <path d="M14.5 5.5H22V3a3 3 0 00-3-3h-4.5v5.5z" fill="#ffb300"/>
      </svg>
    )
  },
  {
    id: 'zoom',
    name: 'Zoom',
    category: 'communication',
    brandColor: '#2D8CFF',
    glowColor: 'rgba(45, 140, 255, 0.25)',
    description: 'Archive cloud meeting records, transcript logs, and post-call analytics instantly.',
    syncFlow: [
      { from: 'Zoom cloud video record', to: 'Nexus meeting minutes & audio logs' },
      { from: 'Nexus follow-up actions', to: 'Zoom post-meeting participant digest' }
    ],
    logo: (
      <svg viewBox="0 0 32 32" className="w-8 h-8">
        <circle cx="16" cy="16" r="15" fill="#2D8CFF" />
        <path d="M9 12h8a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2zm12 1.5l3.5-2.5a.5.5 0 0 1 .8.4v9.2a.5.5 0 0 1-.8.4L21 18.5v-5z" fill="white" />
      </svg>
    )
  },
  {
    id: 'linear',
    name: 'Linear',
    category: 'projects',
    brandColor: '#5E6AD2',
    glowColor: 'rgba(94, 106, 210, 0.25)',
    description: 'Synchronize software development cycles, tickets, and milestones bidirectionally.',
    syncFlow: [
      { from: 'Linear issue status update', to: 'Nexus task board & release log' },
      { from: 'Nexus client feedback validation', to: 'Linear ticket description & stack trace' }
    ],
    logo: (
      <svg viewBox="0 0 32 32" className="w-8 h-8">
        <path d="M16 4L26 9.8v11.6L16 27.2L6 21.4V9.8L16 4z" fill="none" stroke="#5E6AD2" strokeWidth="2.5" />
        <path d="M16 11l5 3v4l-5 3v-10z" fill="#5E6AD2" />
      </svg>
    )
  },
  {
    id: 'jira',
    name: 'Jira',
    category: 'projects',
    brandColor: '#0052CC',
    glowColor: 'rgba(0, 82, 204, 0.25)',
    description: 'Bridge enterprise software workflows, sprint tracking, and project backlogs.',
    syncFlow: [
      { from: 'Jira sprint item completed', to: 'Nexus dashboard velocity metrics' },
      { from: 'Nexus task revision notes', to: 'Jira issue comment thread' }
    ],
    logo: (
      <svg viewBox="0 0 24 24" className="w-8 h-8">
        <path d="M11.5 2.5L2 12h6.5l3-3.5 3 3.5H21l-9.5-9.5z" fill="#0052CC" />
        <path d="M11.5 13L2 22.5h6.5l3-3.5 3 3.5H21L11.5 13z" fill="#2684FF" />
      </svg>
    )
  },
  {
    id: 'asana',
    name: 'Asana',
    category: 'projects',
    brandColor: '#FC636B',
    glowColor: 'rgba(252, 99, 107, 0.25)',
    description: 'Map cross-team progress, milestones, and task boards across divisions.',
    syncFlow: [
      { from: 'Asana task milestone met', to: 'Nexus manager progress display' },
      { from: 'Nexus comment update', to: 'Asana collaborator task log' }
    ],
    logo: (
      <svg viewBox="0 0 24 24" className="w-8 h-8">
        <circle cx="12" cy="7" r="3.5" fill="#FC636B" />
        <circle cx="7.5" cy="15" r="3.5" fill="#FC636B" />
        <circle cx="16.5" cy="15" r="3.5" fill="#FC636B" />
      </svg>
    )
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'docs',
    brandColor: '#2b2b2b',
    glowColor: 'rgba(43, 43, 43, 0.25)',
    description: 'Sync wiki spaces, project databases, and team directories for unified knowledge searches.',
    syncFlow: [
      { from: 'Notion document update', to: 'Nexus global AI index & reference base' },
      { from: 'Nexus whiteboard item saved', to: 'Notion project gallery database row' }
    ],
    logo: (
      <svg viewBox="0 0 32 32" className="w-8 h-8">
        <rect width="32" height="32" rx="6" fill="#000000" />
        <path d="M9 8h3.5l7.5 11.5V8H23v16h-3.5L12 12.5V24H9V8z" fill="#ffffff" />
      </svg>
    )
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'crm',
    brandColor: '#00A1E0',
    glowColor: 'rgba(0, 161, 224, 0.25)',
    description: 'Enrich enterprise pipeline accounts, opportunity events, and contract statuses.',
    syncFlow: [
      { from: 'Salesforce opportunity closed', to: 'Nexus client onboarding kickoff task' },
      { from: 'Nexus milestone achieved', to: 'Salesforce deal update & progress timeline' }
    ],
    logo: (
      <svg viewBox="0 0 32 32" className="w-8 h-8">
        <path d="M22.5 15.5a4.5 4.5 0 0 0-7.8-3.1 5.5 5.5 0 0 0-9.2 4.1 4.5 4.5 0 0 0 1.5 8.7h15.5a4.5 4.5 0 0 0 0-9.7z" fill="#00A1E0" />
      </svg>
    )
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'crm',
    brandColor: '#FF7A59',
    glowColor: 'rgba(255, 122, 89, 0.25)',
    description: 'Link customer records, support cases, and sales contacts in unified chats.',
    syncFlow: [
      { from: 'HubSpot ticket created', to: 'Nexus engineer support chat flag' },
      { from: 'Nexus task resolution note', to: 'HubSpot ticket resolution status' }
    ],
    logo: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#FF7A59" strokeWidth="2.5" />
        <circle cx="12" cy="12" r="3.5" fill="#FF7A59" />
        <line x1="12" y1="2" x2="12" y2="8.5" stroke="#FF7A59" strokeWidth="2.5" />
        <circle cx="12" cy="2" r="1.5" fill="#FF7A59" />
      </svg>
    )
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    category: 'crm',
    brandColor: '#4285F4',
    glowColor: 'rgba(66, 133, 244, 0.25)',
    description: 'Ensure calendars, scheduling availability, and reminders align flawlessly.',
    syncFlow: [
      { from: 'Google Calendar event rescheduled', to: 'Nexus meeting plan & whiteboard updates' },
      { from: 'Nexus action item flagged', to: 'Google Calendar follow-up event slot' }
    ],
    logo: (
      <svg viewBox="0 0 32 32" className="w-8 h-8">
        <rect x="3" y="3" width="26" height="26" rx="5" fill="#4285F4" />
        <rect x="7" y="10" width="18" height="15" rx="2" fill="white" />
        <text x="16" y="22" fill="#4285F4" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">31</text>
      </svg>
    )
  },
  {
    id: 'figma',
    name: 'Figma',
    category: 'docs',
    brandColor: '#F24E1E',
    glowColor: 'rgba(242, 78, 30, 0.25)',
    description: 'Embed layout previews, capture canvas remarks, and track design progress.',
    syncFlow: [
      { from: 'Figma document version published', to: 'Nexus dashboard design view node' },
      { from: 'Nexus task comment', to: 'Figma file canvas reviewer remarks' }
    ],
    logo: (
      <svg viewBox="0 0 24 36" className="w-5 h-8">
        <path d="M6 9a6 6 0 0 1 6-6h6v12h-6A6 6 0 0 1 6 9z" fill="#F24E1E" />
        <path d="M6 21a6 6 0 0 1 6-6h6v12h-6A6 6 0 0 1 6 21z" fill="#A259FF" />
        <path d="M12 33a6 6 0 0 1-6-6 6 6 0 0 1 6-6h6v6a6 6 0 0 1-6 6z" fill="#0ACF83" />
        <circle cx="18" cy="21" r="6" fill="#1ABC9C" />
        <circle cx="18" cy="9" r="6" fill="#FF7262" />
      </svg>
    )
  }
];

export default function LandingPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useWorkspace();
  const darkMode = theme === 'dark';

  const [selectedIntegration, setSelectedIntegration] = useState<Integration>(INTEGRATIONS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredIntegrations = INTEGRATIONS.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
    return () => {
      document.documentElement.style.colorScheme = '';
    };
  }, [darkMode]);

  const goToWorkspace = (query?: string) => {
    const searchParams = new URLSearchParams(window.location.search);
    const inviteCode = searchParams.get('inviteCode');

    let finalQuery = query || '';
    if (inviteCode) {
      const params = new URLSearchParams(finalQuery);
      params.set('inviteCode', inviteCode);
      finalQuery = params.toString();
    }

    router.push(finalQuery ? `/?${finalQuery}` : '/');
  };

  const handleStartTrial = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.success('Opening your workspace…');
    goToWorkspace('auth=signup&trial=1');
  };

  const handleBookDemo = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href =
      'mailto:hello@nexus.ai?subject=Nexus%20AI%20Demo%20Request&body=Hi%2C%20I%27d%20like%20to%20book%20a%20demo.';
  };

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`nexus-landing ${darkMode ? 'dark' : ''}`}>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .nexus-landing {
          --bg: #f8f7f4;
          --bg-secondary: #f0efeb;
          --text-primary: #2a2a2a;
          --text-secondary: #6b6b6b;
          --text-tertiary: #9a9a9a;
          --border: #e5e4e0;
          --accent: #3d3d3d;
          --card-bg: #ffffff;
          --hover-bg: #f3f2ee;
          min-height: 100vh;
          background: var(--bg);
          color: var(--text-primary);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          line-height: 1.6;
          transition: background 0.3s, color 0.3s;
        }

        .nexus-landing.dark {
          --bg: #1a1a1a;
          --bg-secondary: #242424;
          --text-primary: #e8e8e8;
          --text-secondary: #a0a0a0;
          --text-tertiary: #6b6b6b;
          --border: #333333;
          --accent: #c4c4c4;
          --card-bg: #242424;
          --hover-bg: #2a2a2a;
        }

        .nexus-landing nav {
          position: sticky;
          top: 0;
          z-index: 100;
          border-bottom: 1px solid var(--border);
          padding: 1rem 0;
          backdrop-filter: blur(8px);
          background: rgba(248, 247, 244, 0.9);
        }

        .nexus-landing.dark nav {
          background: rgba(26, 26, 26, 0.9);
        }

        .nav-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          font-size: 1.25rem;
          font-weight: 600;
          letter-spacing: -0.02em;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-primary);
          font-family: inherit;
        }

        .nav-links {
          display: flex;
          gap: 2rem;
          align-items: center;
          list-style: none;
        }

        .nav-links a {
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s;
        }

        .nav-links a:hover {
          color: var(--text-primary);
        }

        .nav-sign-in {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 0.9rem;
          cursor: pointer;
          font-family: inherit;
          transition: color 0.2s;
        }

        .nav-sign-in:hover {
          color: var(--text-primary);
        }

        .theme-toggle {
          background: none;
          border: 1px solid var(--border);
          padding: 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .theme-toggle:hover {
          border-color: var(--text-secondary);
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
        }

        .hero {
          padding: 6rem 0 4rem;
          max-width: 800px;
        }

        .hero h1 {
          font-size: 3.5rem;
          font-weight: 600;
          letter-spacing: -0.03em;
          line-height: 1.1;
          margin-bottom: 1.5rem;
        }

        .hero p {
          font-size: 1.25rem;
          color: var(--text-secondary);
          line-height: 1.7;
          margin-bottom: 2rem;
        }

        .hero-note {
          font-size: 0.875rem;
          color: var(--text-tertiary);
          margin-top: 1rem;
        }

        .cta-group {
          display: flex;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .btn-primary {
          background: var(--text-primary);
          color: var(--bg);
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s;
          text-decoration: none;
          display: inline-block;
          font-family: inherit;
        }

        .btn-primary:hover {
          opacity: 0.85;
        }

        .btn-secondary {
          color: var(--text-primary);
          padding: 0.75rem 1.5rem;
          border: 1px solid var(--border);
          background: transparent;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: border-color 0.2s;
          text-decoration: none;
          display: inline-block;
          font-family: inherit;
        }

        .btn-secondary:hover {
          border-color: var(--text-secondary);
        }

        .problem-section {
          padding: 6rem 0;
          border-top: 1px solid var(--border);
        }

        .problem-section h2 {
          font-size: 2rem;
          font-weight: 600;
          margin-bottom: 1rem;
          letter-spacing: -0.02em;
        }

        .problem-section > .container > p {
          font-size: 1.1rem;
          color: var(--text-secondary);
          max-width: 650px;
          line-height: 1.7;
          margin-bottom: 3rem;
        }

        .scenario-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          margin-top: 2rem;
        }

        .scenario-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
          transition: border-color 0.2s;
        }

        .scenario-card:hover {
          border-color: var(--text-tertiary);
        }

        .scenario-icon {
          width: 40px;
          height: 40px;
          background: var(--bg-secondary);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          font-size: 1.25rem;
        }

        .scenario-card h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .scenario-card p {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0;
        }

        .how-it-works {
          padding: 6rem 0;
          border-top: 1px solid var(--border);
        }

        .how-it-works h2 {
          font-size: 2rem;
          font-weight: 600;
          margin-bottom: 3rem;
          letter-spacing: -0.02em;
        }

        .workflow-diagram {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 2rem;
          max-width: 800px;
        }

        .workflow-step {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          padding: 1rem 0;
          border-bottom: 1px solid var(--border);
        }

        .workflow-step:last-child {
          border-bottom: none;
        }

        .step-number {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--bg-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          font-weight: 600;
          flex-shrink: 0;
        }

        .step-content h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .step-content p {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        /* Integrations Interactive Showcase Styles */
        .integrations {
          padding: 6rem 0;
          border-top: 1px solid var(--border);
        }

        .integrations-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 3rem;
          margin-top: 3rem;
        }

        @media (min-width: 992px) {
          .integrations-layout {
            grid-template-columns: 1.15fr 0.85fr;
          }
        }

        .integrations-directory {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .integrations-header h2 {
          font-size: 2.25rem;
          font-weight: 750;
          letter-spacing: -0.03em;
          margin-bottom: 0.5rem;
        }

        .integrations-header p {
          font-size: 1.1rem;
          color: var(--text-secondary);
        }

        .integrations-controls {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        @media (min-width: 640px) {
          .integrations-controls {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }

        .search-wrapper {
          position: relative;
          flex: 1;
          max-width: 320px;
        }

        .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-tertiary);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 0.6rem 1rem 0.6rem 2.25rem;
          font-size: 0.875rem;
          background: var(--card-bg);
          border: 1px solid var(--border);
          color: var(--text-primary);
          border-radius: 8px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .search-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px rgba(100, 100, 100, 0.1);
        }

        .category-tabs {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: none;
        }

        .category-tabs::-webkit-scrollbar {
          display: none;
        }

        .category-tab {
          padding: 0.5rem 0.9rem;
          font-size: 0.8rem;
          font-weight: 600;
          background: var(--bg-secondary);
          border: 1px solid transparent;
          color: var(--text-secondary);
          border-radius: 20px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .category-tab:hover {
          color: var(--text-primary);
          background: var(--hover-bg);
        }

        .category-tab.active {
          background: var(--text-primary);
          color: var(--bg);
        }

        .integration-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
        }

        @media (min-width: 480px) {
          .integration-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .integration-item-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.25rem 0.75rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          outline: none;
        }

        .integration-item-card:hover {
          transform: translateY(-2px);
          border-color: var(--brand-color);
          box-shadow: 0 8px 24px var(--brand-hover-glow);
        }

        .integration-item-card.active {
          border-color: var(--brand-color);
          box-shadow: 0 0 0 2px var(--brand-color);
          background: var(--bg-secondary);
        }

        .integration-logo-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 36px;
          transition: transform 0.2s;
        }

        .integration-item-card:hover .integration-logo-wrapper {
          transform: scale(1.1);
        }

        .integration-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }

        .active-dot-pulse {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: var(--brand-color);
          box-shadow: 0 0 8px var(--brand-color);
        }

        .no-integrations-found {
          grid-column: 1 / -1;
          text-align: center;
          padding: 3rem 0;
          color: var(--text-tertiary);
          font-size: 0.9rem;
          border: 1px dashed var(--border);
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.01);
        }

        .integrations-visualizer {
          display: flex;
          align-items: stretch;
        }

        .visualizer-console {
          flex: 1;
          background: #0f0f11;
          color: #f3f4f6;
          border: 1px solid #27272a;
          border-radius: 20px;
          padding: 2rem;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 2rem;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .console-glow-bg {
          position: absolute;
          top: -20%;
          left: -20%;
          right: -20%;
          bottom: -20%;
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
          z-index: 0;
          transition: background-color 0.5s ease;
        }

        .console-header-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 1;
        }

        .live-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          background: rgba(16, 185, 129, 0.1);
          color: #34d399;
          padding: 0.3rem 0.75rem;
          border-radius: 9999px;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #10b981;
          box-shadow: 0 0 10px #10b981;
          animation: dot-pulse-anim 1.5s infinite alternate;
        }

        @keyframes dot-pulse-anim {
          from { opacity: 0.4; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1.1); }
        }

        .latency-text {
          font-size: 0.7rem;
          font-weight: 500;
          color: #9ca3af;
          font-family: monospace;
        }

        .sync-canvas {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 120px;
          position: relative;
          z-index: 1;
          padding: 0 0.5rem;
        }

        .nexus-orb-node, .target-tool-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          width: 80px;
          position: relative;
        }

        .node-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #e5e7eb;
          text-align: center;
        }

        .nexus-orb-avatar {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.5rem;
          color: white;
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
          position: relative;
          z-index: 2;
        }

        .nexus-orb-ring-outer {
          position: absolute;
          top: -6px;
          left: 8px;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: 1px dashed rgba(168, 85, 247, 0.4);
          animation: orbit-rotate 15s linear infinite;
        }

        .nexus-orb-ring-inner {
          position: absolute;
          top: -2px;
          left: 12px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: 1px solid rgba(99, 102, 241, 0.2);
          animation: orbit-rotate 10s linear infinite reverse;
        }

        @keyframes orbit-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .tool-logo-halo {
          position: absolute;
          top: -4px;
          left: 10px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 1px solid transparent;
          transition: all 0.5s ease;
          pointer-events: none;
        }

        .tool-logo-container {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #1e1e24;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
          z-index: 2;
          transition: all 0.5s ease;
          overflow: hidden;
        }

        .sync-arrows-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          position: relative;
          margin: 0 1rem;
        }

        .sync-arrow-line {
          height: 2px;
          background: linear-gradient(90deg, #1f2937, #374151, #1f2937);
          position: relative;
          border-radius: 9999px;
        }

        .pulse-particle {
          position: absolute;
          top: -2px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .particle-right {
          background: #818cf8;
          box-shadow: 0 0 10px #818cf8;
          animation: float-left-to-right 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .particle-left {
          background: var(--brand-color, #f59e0b);
          box-shadow: 0 0 10px var(--brand-color, #f59e0b);
          animation: float-right-to-left 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          animation-delay: 1.2s;
        }

        @keyframes float-left-to-right {
          0% { left: 0%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }

        @keyframes float-right-to-left {
          0% { right: 0%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { right: 100%; opacity: 0; }
        }

        .sync-action-badge {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #1f2937;
          border: 1px solid #374151;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          z-index: 3;
        }

        .animate-spin-slow {
          animation: spin 6s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .sync-details-card {
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 14px;
          padding: 1.25rem;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .details-card-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .details-card-header h4 {
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: #f3f4f6;
        }

        .details-card-desc {
          font-size: 0.8rem;
          color: #9ca3af;
          line-height: 1.5;
        }

        .details-flows {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          margin-top: 0.25rem;
        }

        .flow-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          background: #0f0f11;
          border: 1px solid #27272a;
          padding: 0.6rem 0.8rem;
          border-radius: 8px;
        }

        .flow-badge {
          font-size: 0.6rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #818cf8;
          font-family: monospace;
        }

        .flow-item:nth-child(2) .flow-badge {
          color: var(--brand-color, #818cf8);
        }

        .flow-text {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          color: #e5e7eb;
          flex-wrap: wrap;
        }

        .flow-source, .flow-target {
          font-weight: 550;
        }

        .flow-arrow {
          color: #6b7280;
        }

        /* Dark mode landing integration updates */
        .nexus-landing.dark .search-input {
          background: #18181b;
          border-color: #27272a;
        }

        .nexus-landing.dark .search-input:focus {
          border-color: #52525b;
        }

        .nexus-landing.dark .category-tab {
          background: #27272a;
          color: #a1a1aa;
        }

        .nexus-landing.dark .category-tab:hover {
          background: #3f3f46;
          color: #f4f4f5;
        }

        .nexus-landing.dark .category-tab.active {
          background: #f4f4f5;
          color: #09090b;
        }

        .nexus-landing.dark .integration-item-card {
          background: #18181b;
          border-color: #27272a;
        }

        .nexus-landing.dark .integration-item-card.active {
          background: #09090b;
        }

        .quote-section {
          padding: 6rem 0;
          border-top: 1px solid var(--border);
        }

        .nexus-landing blockquote {
          font-size: 1.5rem;
          line-height: 1.6;
          max-width: 700px;
          font-weight: 400;
          letter-spacing: -0.01em;
          margin-bottom: 1.5rem;
        }

        .quote-attribution {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .final-cta {
          padding: 6rem 0;
          text-align: center;
          border-top: 1px solid var(--border);
        }

        .final-cta h2 {
          font-size: 2rem;
          font-weight: 600;
          margin-bottom: 1rem;
          letter-spacing: -0.02em;
        }

        .final-cta p {
          font-size: 1.1rem;
          color: var(--text-secondary);
          margin-bottom: 2rem;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }

        .final-cta .cta-group {
          justify-content: center;
        }

        .nexus-landing footer {
          border-top: 1px solid var(--border);
          padding: 2rem 0;
          text-align: center;
          color: var(--text-tertiary);
          font-size: 0.875rem;
        }

        .nexus-landing footer a {
          color: inherit;
          text-decoration: none;
        }

        .nexus-landing footer a:hover {
          color: var(--text-secondary);
        }

        @media (max-width: 768px) {
          .hero h1 {
            font-size: 2.5rem;
          }

          .hero p {
            font-size: 1.1rem;
          }

          .nav-links {
            gap: 1rem;
          }

          .nav-links a.nav-link-hide-mobile {
            display: none;
          }

          .cta-group {
            flex-direction: column;
            align-items: stretch;
          }

          .nexus-landing blockquote {
            font-size: 1.25rem;
          }
        }
      `}</style>

      <nav>
        <div className="nav-container">
          <button type="button" className="logo" onClick={handleLogoClick}>
            Nexus AI
          </button>
          <ul className="nav-links">
            <li>
              <a href="#how" className="nav-link-hide-mobile">
                How it works
              </a>
            </li>
            <li>
              <a href="#integrations" className="nav-link-hide-mobile">
                Integrations
              </a>
            </li>
            <li>
              <a href="#pricing" className="nav-link-hide-mobile">
                Pricing
              </a>
            </li>
            <li>
              <button
                type="button"
                className="nav-sign-in"
                onClick={() => goToWorkspace('auth=signin')}
              >
                Log in
              </button>
            </li>
            <li>
              <button
                type="button"
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {darkMode ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <main>
        <section className="hero container">
          <h1>Your AI agent actually gets how your team works.</h1>
          <p>
            Nexus AI stays in context across everything—chat, whiteboards, tasks, meetings, your CRM.
            No more switching between tools and starting over. It just knows what&apos;s happening and what
            matters.
          </p>
          <div className="cta-group">
            <a href="/" className="btn-primary" onClick={handleStartTrial}>
              Start free trial
            </a>
            <a href="#how" className="btn-secondary">
              See how it works
            </a>
          </div>
          <p className="hero-note">No credit card required · 14-day trial · Setup in 10 minutes</p>
        </section>

        <section className="problem-section" id="how">
          <div className="container">
            <h2>You know this problem.</h2>
            <p>
              The meeting just ended. Everyone knows what they&apos;re supposed to do. Then you open three
              different apps and none of them know what happened in that meeting. Sound familiar?
            </p>

            <div className="scenario-grid">
              <div className="scenario-card">
                <div className="scenario-icon">
                  <MessageSquare className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                </div>
                <h3>Team chat gets lost</h3>
                <p>
                  That decision you made in Slack? Your PM tool has no idea. You end up explaining it again.
                </p>
              </div>
              <div className="scenario-card">
                <div className="scenario-icon">
                  <ClipboardList className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                </div>
                <h3>Tasks don&apos;t match reality</h3>
                <p>
                  What&apos;s in your task board doesn&apos;t reflect what actually happened in meetings, calls,
                  or conversations.
                </p>
              </div>
              <div className="scenario-card">
                <div className="scenario-icon">
                  <Search className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                </div>
                <h3>Context is everywhere and nowhere</h3>
                <p>
                  Information is spread across whiteboards, docs, chat, and notes. Good luck finding it when
                  you need it.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="how-it-works">
          <div className="container">
            <h2>How Nexus AI handles it</h2>
            <div className="workflow-diagram">
              <div className="workflow-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3>It listens to everything (with permission)</h3>
                  <p>
                    Connect your tools. Nexus AI follows along with your team&apos;s actual workflow—meetings,
                    chats, updates.
                  </p>
                </div>
              </div>
              <div className="workflow-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>Builds a living context graph</h3>
                  <p>
                    It understands how everything connects: that Slack thread relates to this task, which
                    relates to that meeting, which affects that customer.
                  </p>
                </div>
              </div>
              <div className="workflow-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3>Actually helpful AI assistance</h3>
                  <p>
                    Ask it anything. &quot;What did we decide about the Q3 roadmap?&quot; or &quot;Draft a
                    follow-up to the client about the contract.&quot; It knows the context.
                  </p>
                </div>
              </div>
              <div className="workflow-step">
                <div className="step-number">4</div>
                <div className="step-content">
                  <h3>Takes action across tools</h3>
                  <p>
                    Create tasks, update CRM records, schedule meetings, draft messages—all without leaving
                    the conversation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="integrations" id="integrations">
          <div className="container">
            <div className="integrations-layout">
              {/* Left Column - Directory */}
              <div className="integrations-directory">
                <div className="integrations-header">
                  <h2>Works with tools you already use</h2>
                  <p>Two-way sync means everything stays in one place.</p>
                </div>
                
                {/* Search and Categories */}
                <div className="integrations-controls">
                  <div className="search-wrapper">
                    <Search className="w-4 h-4 search-icon" />
                    <input 
                      type="text" 
                      placeholder="Search integrations..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  <div className="category-tabs">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'communication', label: 'Chat & Meet' },
                      { id: 'projects', label: 'Projects' },
                      { id: 'docs', label: 'Docs & Design' },
                      { id: 'crm', label: 'CRM & Calendar' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        className={`category-tab ${activeCategory === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveCategory(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid */}
                <div className="integration-grid">
                  {filteredIntegrations.map((item) => {
                    const isActive = selectedIntegration.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedIntegration(item)}
                        className={`integration-item-card ${isActive ? 'active' : ''}`}
                        style={{
                          '--brand-hover-glow': item.glowColor,
                          '--brand-color': item.brandColor
                        } as React.CSSProperties}
                      >
                        <div className="integration-logo-wrapper">
                          {item.logo}
                        </div>
                        <span className="integration-name">{item.name}</span>
                        {isActive && <span className="active-dot-pulse" />}
                      </button>
                    );
                  })}
                  {filteredIntegrations.length === 0 && (
                    <div className="no-integrations-found">
                      No tools found matching &quot;{searchQuery}&quot;
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Visualizer Console */}
              <div className="integrations-visualizer">
                <div className="visualizer-console" style={{
                  '--brand-color': selectedIntegration.brandColor,
                  '--brand-hover-glow': selectedIntegration.glowColor
                } as React.CSSProperties}>
                  <div className="console-glow-bg" style={{ backgroundColor: selectedIntegration.brandColor + '15' }} />
                  
                  {/* Realtime Status Badges */}
                  <div className="console-header-status">
                    <span className="live-pill">
                      <span className="live-dot" />
                      Two-Way Sync Active
                    </span>
                    <span className="latency-text">Realtime (&lt; 100ms)</span>
                  </div>

                  {/* Sync Animation Canvas */}
                  <div className="sync-canvas">
                    {/* Nexus Orb */}
                    <div className="nexus-orb-node">
                      <div className="nexus-orb-ring-outer" />
                      <div className="nexus-orb-ring-inner" />
                      <div className="nexus-orb-avatar">N</div>
                      <span className="node-label">Nexus AI</span>
                    </div>

                    {/* Interactive Arrows */}
                    <div className="sync-arrows-container">
                      <div className="sync-arrow-line arrow-to-right">
                        <div className="pulse-particle particle-right" />
                      </div>
                      <div className="sync-arrow-line arrow-to-left">
                        <div className="pulse-particle particle-left" />
                      </div>
                      <div className="sync-action-badge">
                        <ArrowLeftRight className="w-4 h-4 text-indigo-400 animate-spin-slow" />
                      </div>
                    </div>

                    {/* Target Tool Node */}
                    <div className="target-tool-node">
                      <div className="tool-logo-halo" style={{ borderColor: selectedIntegration.brandColor + '30', boxShadow: `0 0 20px ${selectedIntegration.glowColor}` }} />
                      <div className="tool-logo-container" style={{ border: `1px solid ${selectedIntegration.brandColor}30` }}>
                        {selectedIntegration.logo}
                      </div>
                      <span className="node-label">{selectedIntegration.name}</span>
                    </div>
                  </div>

                  {/* Live Sync Detail Card */}
                  <div className="sync-details-card">
                    <div className="details-card-header">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <h4>Nexus &harr; {selectedIntegration.name} Pipeline</h4>
                    </div>
                    <p className="details-card-desc">{selectedIntegration.description}</p>
                    
                    <div className="details-flows">
                      {selectedIntegration.syncFlow.map((flow, index) => (
                        <div key={index} className="flow-item">
                          <div className="flow-badge">
                            {index === 0 ? 'INCOMING EVENT' : 'OUTGOING ACTION'}
                          </div>
                          <div className="flow-text">
                            <span className="flow-source">{flow.from}</span>
                            <span className="flow-arrow">&rarr;</span>
                            <span className="flow-target">{flow.to}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="quote-section">
          <div className="container">
            <blockquote>
              &quot;We stopped having &apos;sync&apos; meetings. Everyone already knows what&apos;s happening
              because the AI already told them. That alone saved us 6 hours a week.&quot;
            </blockquote>
            <div className="quote-attribution">— Operations lead at a 50-person SaaS company</div>
          </div>
        </section>

        <section className="final-cta" id="pricing">
          <div className="container">
            <h2>Give it a try</h2>
            <p>Start with a 14-day free trial. See if it fits how your team actually works.</p>
            <div className="cta-group">
              <a href="/" className="btn-primary" onClick={handleStartTrial}>
                Start free trial
              </a>
              <a href="#" className="btn-secondary" onClick={handleBookDemo}>
                Book a demo
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="container">
          <p>
            © {new Date().getFullYear()} Nexus AI ·{' '}
            <a href="/settings">Privacy</a> · <a href="/settings">Terms</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
