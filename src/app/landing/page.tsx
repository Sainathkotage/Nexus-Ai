'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useWorkspace } from '@/lib/store';
import { MessageSquare, ClipboardList, Search } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useWorkspace();
  const darkMode = theme === 'dark';

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

        .integrations {
          padding: 6rem 0;
          border-top: 1px solid var(--border);
        }

        .integrations h2 {
          font-size: 2rem;
          font-weight: 600;
          margin-bottom: 1rem;
          letter-spacing: -0.02em;
        }

        .integrations > .container > p {
          font-size: 1.1rem;
          color: var(--text-secondary);
          margin-bottom: 2rem;
        }

        .integration-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 1rem;
        }

        .integration-item {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 1.25rem;
          text-align: center;
          font-size: 0.9rem;
          font-weight: 500;
          transition: border-color 0.2s;
        }

        .integration-item:hover {
          border-color: var(--text-tertiary);
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
            <h2>Works with tools you already use</h2>
            <p>Two-way sync means everything stays in one place.</p>
            <div className="integration-grid">
              {[
                'Slack',
                'Microsoft Teams',
                'Google Meet',
                'Zoom',
                'Linear',
                'Jira',
                'Asana',
                'Notion',
                'Salesforce',
                'HubSpot',
                'Google Calendar',
                'Figma',
              ].map((name) => (
                <div key={name} className="integration-item">
                  {name}
                </div>
              ))}
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
