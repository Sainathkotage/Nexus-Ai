import { Sparkles, ArrowRight, CheckCircle2, Target } from 'lucide-react';

export function LogoCloud() {
  const currentCapabilities = [
    {
      title: 'AI Employee Handover',
      desc: 'Generate complete handoff briefs, project statuses, unfulfilled commitments, and collaborator maps in 5 minutes.',
    },
    {
      title: 'Interactive Relationship Graphing',
      desc: 'Track and visualize communication networks, connection intensities, and core stakeholders client-side.',
    },
    {
      title: 'Semantic Decision Logging',
      desc: 'Automatic indexing of product and architecture decisions with search Q&A to answer questions instantly.',
    },
    {
      title: 'Verbal Commitments Tracker',
      desc: 'Extract and track pending agreements (e.g. "I will review by Friday") from messages, chats, and emails.',
    },
  ];

  const futureProspects = [
    {
      title: 'Continuous Webhook Sync',
      desc: 'Real-time background memory capture from Slack, Zoom, Google Meet, GitHub, and Jira APIs.',
    },
    {
      title: 'Autonomous Workflow Execution',
      desc: 'Multi-agent dispatching capable of communicating with external web platforms to complete tasks.',
    },
    {
      title: 'Relationship Weight Time-Decay',
      desc: 'Exponential relationship relevance scaling, ensuring older connections fade dynamically as teams evolve.',
    },
    {
      title: 'Self-Hosted Enterprise Isolation',
      desc: 'Dedicated private VPC options featuring SAML/OIDC SSO, strict data residency compliance, and SOC 2 Type II isolation.',
    },
  ];

  return (
    <section className="py-20 border-y border-ink-900/10 bg-cream-50/40 relative">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-stretch">
          
          {/* Column 1: Current Offerings */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] font-sans">
                Active in Beta Today
              </span>
            </div>
            
            <h3 className="font-serif text-3xl font-medium text-ink-900">
              Capturing unwritten memory.
            </h3>
            <p className="text-sm text-ink-500 font-sans leading-relaxed">
              NexusAi Beta ingests workspace context directly, creating a living memory layer that protects against employee churn and team knowledge leakage.
            </p>

            <div className="space-y-5 mt-4">
              {currentCapabilities.map((cap) => (
                <div key={cap.title} className="flex items-start gap-3">
                  <div className="mt-1 shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-ink-950 font-sans">{cap.title}</span>
                    <span className="text-xs text-ink-500 font-sans leading-relaxed">{cap.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Future Prospects */}
          <div className="flex flex-col gap-6 md:border-l md:border-ink-900/10 md:pl-12 lg:pl-20">
            <div className="flex items-center gap-2 text-accent-600">
              <Target className="w-4 h-4" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] font-sans">
                Future Prospects
              </span>
            </div>
            
            <h3 className="font-serif text-3xl font-medium text-ink-900">
              The Agentic Roadmap.
            </h3>
            <p className="text-sm text-ink-500 font-sans leading-relaxed">
              We are scaling the cognitive workspace from simple summaries to autonomous agents running on top of a highly integrated organizational context model.
            </p>

            <div className="space-y-5 mt-4">
              {futureProspects.map((prog) => (
                <div key={prog.title} className="flex items-start gap-3">
                  <div className="mt-1 shrink-0">
                    <ArrowRight className="w-4 h-4 text-accent-600" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-ink-950 font-sans">{prog.title}</span>
                    <span className="text-xs text-ink-500 font-sans leading-relaxed">{prog.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
