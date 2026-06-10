import { ArrowUpRight, Sparkles, Play, FileText, Calendar, CheckSquare, Mail } from 'lucide-react';

export function Hero({ onStart }: { onStart?: (e: React.MouseEvent) => void }) {
  return (
    <section className="relative pt-32 pb-20 md:pt-44 md:pb-28 overflow-hidden">
      <div className="absolute inset-0 grain opacity-40 pointer-events-none" />

      {/* Warm vintage glow */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-gradient-to-br from-amber-300/30 via-orange-200/20 to-transparent blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center max-w-4xl mx-auto">
          {/* Vintage label */}
          <div className="inline-flex items-center gap-3 mb-10 animate-fade-in-up">
            <span className="h-px w-10 bg-ink-400" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-ink-500 font-sans">
              Est. 2026 · AI Workspace
            </span>
            <span className="h-px w-10 bg-ink-400" />
          </div>

          <h1 className="font-serif text-6xl md:text-8xl font-medium text-ink-900 leading-[0.95] animate-fade-in-up delay-100">
            Your AI{' '}
            <span className="relative inline-block italic">
              <span className="relative z-10">Chief of Staff</span>
              <svg
                className="absolute -bottom-3 left-0 w-full"
                viewBox="0 0 300 12"
                fill="none"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 8 C 60 2, 120 2, 180 6 S 280 10, 298 4"
                  stroke="#c2410c"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <br />
            <span className="text-ink-400 font-normal">that runs your work.</span>
          </h1>

          <p className="mt-10 text-lg md:text-xl text-ink-500 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200 font-serif italic">
            Documents, tasks, calendar, email, and chat unified in one intelligent
            workspace. Nexus reads, plans, and acts so you can focus on what matters.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row gap-3 justify-center items-center animate-fade-in-up delay-300">
            <button
              onClick={onStart}
              className="group px-7 py-3.5 bg-ink-900 hover:bg-accent-600 text-cream-100 text-sm font-medium rounded-sm transition-all inline-flex items-center gap-2 shadow-lg shadow-ink-900/20 font-sans cursor-pointer border-0"
            >
              Start free, no credit card
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
            <a
              href="#workspace"
              className="group px-7 py-3.5 bg-cream-50 hover:bg-white text-ink-800 text-sm font-medium rounded-sm border border-ink-900/20 transition-all inline-flex items-center gap-2 font-sans"
            >
              <Play className="w-3.5 h-3.5 fill-ink-800" />
              Watch demo
            </a>
          </div>

          <p className="mt-6 text-xs text-ink-400 animate-fade-in-up delay-400 font-sans uppercase tracking-widest">
            Free for individuals · Team plans from $12/month
          </p>
        </div>

        {/* Workspace preview */}
        <div className="relative mt-20 md:mt-28 animate-fade-in-up delay-500">
          <div className="relative mx-auto max-w-6xl">
            {/* Vintage warm glow behind card */}
            <div className="absolute inset-x-8 top-8 -bottom-8 bg-gradient-to-br from-amber-400/30 via-orange-300/20 to-sepia-200/20 rounded-sm blur-2xl" />

            <div className="relative bg-cream-50 rounded-sm border border-ink-900/15 shadow-2xl shadow-ink-900/15 overflow-hidden vintage-border">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-ink-900/10 bg-cream-100">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/70 border border-ink-900/20" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70 border border-ink-900/20" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70 border border-ink-900/20" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-3 py-1 bg-cream-50 rounded-sm border border-ink-900/15 text-xs text-ink-500 flex items-center gap-2 font-sans">
                    <Sparkles className="w-3 h-3 text-accent-500" />
                    nexus.ai/workspace
                  </div>
                </div>
                <div className="w-12" />
              </div>

              {/* App body */}
              <div className="grid grid-cols-12 min-h-[420px] md:min-h-[520px]">
                {/* Sidebar */}
                <div className="col-span-3 md:col-span-2 border-r border-ink-900/10 p-3 hidden md:block bg-cream-100/60">
                  <div className="text-[10px] font-semibold text-ink-400 uppercase tracking-[0.2em] px-2 py-1 mb-1 font-sans">
                    Workspace
                  </div>
                  {[
                    { icon: Sparkles, label: 'AI Assistant', active: true },
                    { icon: FileText, label: 'Documents' },
                    { icon: CheckSquare, label: 'Tasks' },
                    { icon: Calendar, label: 'Calendar' },
                    { icon: Mail, label: 'Inbox' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs font-sans ${
                        item.active
                          ? 'bg-ink-900 text-cream-100'
                          : 'text-ink-600 hover:bg-ink-900/5'
                      }`}
                    >
                      <item.icon className="w-3.5 h-3.5" strokeWidth={2} />
                      <span className="truncate">{item.label}</span>
                    </div>
                  ))}
                  <div className="text-[10px] font-semibold text-ink-400 uppercase tracking-[0.2em] px-2 py-1 mt-4 mb-1 font-sans">
                    Recent
                  </div>
                  {['Q4 Roadmap', 'Team sync', 'Product brief'].map((d) => (
                    <div key={d} className="flex items-center gap-2 px-2 py-1 text-xs text-ink-600 hover:bg-ink-900/5 rounded-sm truncate font-sans">
                      <div className="w-1.5 h-1.5 rounded-full bg-ink-400" />
                      {d}
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="col-span-12 md:col-span-10 p-6 md:p-8 bg-cream-50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-[10px] text-ink-400 uppercase tracking-[0.2em] font-sans">
                        Good morning, Alex
                      </div>
                      <div className="font-serif text-xl font-medium text-ink-900">
                        Today's Agenda
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-accent-500/10 text-accent-600 rounded-sm text-[10px] font-medium uppercase tracking-wider font-sans">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse-dot" />
                      AI active
                    </div>
                  </div>

                  {/* AI summary card */}
                  <div className="bg-gradient-to-br from-ink-900 to-ink-700 text-cream-100 rounded-sm p-4 mb-4 relative overflow-hidden border border-ink-900">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-accent-500/20 rounded-full blur-2xl" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-accent-500" />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cream-300 font-sans">
                          AI Briefing
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-cream-100 font-sans">
                        You have <span className="text-white font-semibold">3 meetings</span>,{' '}
                        <span className="text-white font-semibold">12 emails</span> to review, and{' '}
                        <span className="text-white font-semibold">4 tasks</span> due today. I have
                        drafted responses to your 2 most urgent emails. Want me to send them?
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button className="px-3 py-1 bg-cream-100 text-ink-900 text-[11px] font-medium rounded-sm font-sans">
                          Review drafts
                        </button>
                        <button className="px-3 py-1 bg-cream-100/10 text-cream-100 text-[11px] font-medium rounded-sm hover:bg-cream-100/20 font-sans border border-cream-100/20">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Grid of mini widgets */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Widget
                      title="Tasks"
                      value="4 due"
                      subtext="2 urgent"
                      color="text-accent-600"
                      bar={65}
                    />
                    <Widget
                      title="Inbox"
                      value="12 new"
                      subtext="3 starred"
                      color="text-ink-800"
                      bar={40}
                    />
                    <Widget
                      title="Meetings"
                      value="3 today"
                      subtext="Next in 47m"
                      color="text-ink-700"
                      bar={80}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Floating AI card */}
            <div className="hidden md:block absolute -left-8 top-1/3 bg-cream-50 rounded-sm shadow-xl border border-ink-900/15 p-3 w-56 animate-float">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-sm bg-gradient-to-br from-accent-500 to-amber-700 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-cream-100" />
                </div>
                <span className="text-xs font-semibold text-ink-900 font-sans flex items-center gap-1">
                  NexusAi <span className="text-[8px] bg-accent-500/10 text-accent-600 px-1 py-0.2 rounded font-sans uppercase tracking-wider font-bold">Beta</span>
                </span>
              </div>
              <p className="text-[11px] text-ink-600 leading-snug font-sans">
                Drafted a recap of yesterday's standup and shared it with the team.
              </p>
            </div>

            <div className="hidden md:block absolute -right-6 bottom-10 bg-cream-50 rounded-sm shadow-xl border border-ink-900/15 p-3 w-60 animate-float" style={{ animationDelay: '2s' }}>
              <div className="text-[11px] text-ink-400 mb-1 uppercase tracking-wider font-sans">Suggested</div>
              <div className="text-xs font-medium text-ink-900 mb-2 font-sans">
                Reschedule 2pm with Priya?
              </div>
              <div className="flex gap-1.5">
                <button className="flex-1 px-2 py-1 bg-ink-900 text-cream-100 text-[10px] font-medium rounded-sm font-sans">
                  Yes, move to 4pm
                </button>
                <button className="px-2 py-1 text-ink-600 text-[10px] font-medium rounded-sm hover:bg-ink-900/5 font-sans">
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Widget({
  title,
  value,
  subtext,
  color,
  bar,
}: {
  title: string;
  value: string;
  subtext: string;
  color: string;
  bar: number;
}) {
  return (
    <div className="bg-cream-100 rounded-sm p-3 border border-ink-900/10">
      <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 font-semibold font-sans">
        {title}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={`text-base font-semibold font-serif ${color}`}>{value}</span>
        <span className="text-[10px] text-ink-400 font-sans">{subtext}</span>
      </div>
      <div className="mt-2 h-1 bg-ink-900/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent-600 to-ink-700 rounded-full transition-all duration-1000"
          style={{ width: `${bar}%` }}
        />
      </div>
    </div>
  );
}
