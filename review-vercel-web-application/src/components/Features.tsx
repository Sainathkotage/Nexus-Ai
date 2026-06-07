import {
  FileText,
  CheckSquare2,
  Calendar,
  Mail,
  MessageSquare,
  Users,
  Zap,
  Lock,
  Workflow,
} from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'Documents',
    desc: 'Rich, collaborative docs with AI writing, smart blocks, and embedded live data from everywhere.',
    tint: 'from-orange-500/10 to-amber-500/5',
    iconColor: 'text-accent-600',
  },
  {
    icon: CheckSquare2,
    title: 'Tasks',
    desc: 'Track work your way: boards, lists, timelines. Nexus auto-triages and re-prioritizes daily.',
    tint: 'from-emerald-700/10 to-teal-700/5',
    iconColor: 'text-emerald-800',
  },
  {
    icon: Calendar,
    title: 'Calendar',
    desc: 'One calendar for everything. AI defends your focus time and auto-schedules deep work.',
    tint: 'from-violet-700/10 to-indigo-700/5',
    iconColor: 'text-violet-800',
  },
  {
    icon: Mail,
    title: 'Email',
    desc: 'Unified inbox across Gmail, Outlook, and IMAP. AI drafts, summarizes, and files for you.',
    tint: 'from-sky-700/10 to-blue-700/5',
    iconColor: 'text-sky-800',
  },
  {
    icon: MessageSquare,
    title: 'AI Chat',
    desc: 'Ask anything. Nexus has read every doc, email, and ticket and cites its sources.',
    tint: 'from-rose-700/10 to-pink-700/5',
    iconColor: 'text-rose-800',
  },
  {
    icon: Users,
    title: 'Collaboration',
    desc: 'Real-time multiplayer. Comments, mentions, and async updates, all searchable by AI.',
    tint: 'from-amber-600/10 to-yellow-600/5',
    iconColor: 'text-amber-800',
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center mb-20">
          <div className="vintage-divider text-xs font-semibold uppercase tracking-[0.3em] mb-6 text-ink-500 font-sans">
            <span className="flourish text-base">✦</span>
            <span className="mx-3">Everything in One Place</span>
            <span className="flourish text-base">✦</span>
          </div>
          <h2 className="font-serif text-5xl md:text-6xl font-medium text-ink-900 leading-[1.05]">
            Six tools. One workspace.
            <br />
            <span className="italic text-ink-400 font-normal">Zero tab fatigue.</span>
          </h2>
          <p className="mt-6 text-lg text-ink-500 leading-relaxed font-serif italic">
            Replace your patchwork of apps with a single, AI-native surface that
            knows your work as well as you do.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative vintage-card rounded-sm p-6 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div
                className={`absolute inset-0 rounded-sm bg-gradient-to-br ${f.tint} opacity-0 group-hover:opacity-100 transition-opacity`}
              />
              <div className="relative">
                <div className="w-10 h-10 rounded-sm bg-cream-200 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform border border-ink-900/10">
                  <f.icon className={`w-5 h-5 ${f.iconColor}`} strokeWidth={2} />
                </div>
                <h3 className="font-serif text-xl font-medium text-ink-900 mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-ink-500 leading-relaxed font-sans">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Capabilities strip */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: Zap, text: 'Sub-second AI responses' },
            { icon: Lock, text: 'SOC 2 Type II. End-to-end encrypted.' },
            { icon: Workflow, text: '200+ integrations' },
          ].map((c) => (
            <div
              key={c.text}
              className="flex items-center gap-3 px-4 py-3 bg-cream-50 rounded-sm border border-ink-900/10"
            >
              <c.icon className="w-4 h-4 text-accent-600" strokeWidth={2} />
              <span className="text-xs font-medium text-ink-700 font-sans">{c.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
