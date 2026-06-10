import { Sparkles, ArrowRight, Cpu, Brain } from 'lucide-react';
import { useState } from 'react';

const capabilities = [
  {
    id: 'brief',
    label: 'Daily Briefing',
    prompt: 'Give me my morning briefing.',
    response:
      'Good morning, Alex. You have 3 meetings today, the 10am with Product is blocked for deep work. 12 new emails, 3 urgent from investors. I have drafted 4 task updates and queued your weekly sync agenda. Want me to send?',
    actions: ['Review emails', 'Open calendar', 'Edit agenda'],
  },
  {
    id: 'draft',
    label: 'Auto-draft',
    prompt: 'Draft a reply to Sarah about the pricing changes.',
    response:
      'Hi Sarah. Thanks for flagging. I have reviewed the updated tier structure and looped in Marcus for finance review. Suggest we align on enterprise pricing by Thursday before going to board. I have attached the comparison doc. Best, Alex',
    actions: ['Send draft', 'Edit in editor', 'Schedule for 9am'],
  },
  {
    id: 'plan',
    label: 'Plan work',
    prompt: 'Break down the Q1 launch into weekly tasks.',
    response:
      'Created a 10-week plan in your Tasks space with milestones for design freeze (W2), beta launch (W6), and GA (W10). Assigned owners based on your team availability. Added 14 subtasks and 3 dependencies.',
    actions: ['Open plan', 'Share with team', 'Adjust timeline'],
  },
  {
    id: 'search',
    label: 'Find anything',
    prompt: 'What did we decide about the mobile app in last week\'s meeting?',
    response:
      'In the Product Sync on Oct 14 (38:12 mark), you and Priya agreed to delay mobile launch to Q2 and prioritize web onboarding. Action items: Marcus to update roadmap, you to brief investors. [source: meeting notes, recording]',
    actions: ['Play recording', 'See notes', 'Create task'],
  },
];

export function AIChief() {
  const [active, setActive] = useState(capabilities[0]);

  return (
    <section id="ai" className="py-24 md:py-32 relative">
      {/* Subtle warm wash */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-100/30 to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-3 mb-6">
              <span className="h-px w-8 bg-ink-400" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-ink-500 font-sans">
                The AI Chief of Staff
              </span>
            </div>
            <h2 className="font-serif text-5xl md:text-6xl font-medium text-ink-900 leading-[1.05]">
              An AI that doesn't just answer,
              <br />
              <span className="italic text-ink-400 font-normal">it takes action.</span>
            </h2>
            <p className="mt-6 text-lg text-ink-500 leading-relaxed font-serif italic">
              Nexus watches your calendar, reads your email, and understands your
              tasks. Then it suggests, drafts, and executes with you in full
              control.
            </p>

            <div className="mt-8 space-y-4">
              {[
                { icon: Brain, text: 'Knows your full work context: docs, chats, meetings' },
                { icon: Cpu, text: 'Runs agentic workflows across 200+ integrations' },
                { icon: Sparkles, text: 'Proactive suggestions before you even ask' },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-3">
                  <div className="mt-0.5 w-7 h-7 rounded-sm bg-ink-900 flex items-center justify-center shrink-0 border border-accent-600/50">
                    <item.icon className="w-3.5 h-3.5 text-accent-500" strokeWidth={2.5} />
                  </div>
                  <p className="text-sm text-ink-700 pt-1 font-sans">{item.text}</p>
                </div>
              ))}
            </div>

            <a
              href="#pricing"
              className="group mt-10 inline-flex items-center gap-2 px-6 py-3 bg-ink-900 hover:bg-accent-600 text-cream-100 text-sm font-medium rounded-sm transition-all font-sans"
            >
              Try AI Chief of Staff
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>

          {/* Right, interactive demo */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-500/20 via-amber-300/10 to-transparent rounded-sm blur-2xl" />
            <div className="relative bg-cream-50 rounded-sm border border-ink-900/15 shadow-2xl shadow-ink-900/15 overflow-hidden vintage-border">
              {/* Tab bar */}
              <div className="flex gap-1 p-2 border-b border-ink-900/10 bg-cream-100 overflow-x-auto">
                {capabilities.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActive(c)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-sm whitespace-nowrap transition-all font-sans ${
                      active.id === c.id
                        ? 'bg-ink-900 text-cream-100'
                        : 'text-ink-600 hover:bg-ink-900/5'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <div className="p-5 min-h-[380px] flex flex-col">
                {/* User prompt */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-7 h-7 rounded-sm bg-gradient-to-br from-ink-700 to-ink-900 flex items-center justify-center text-cream-100 text-[10px] font-semibold shrink-0 border border-ink-900">
                    A
                  </div>
                  <div className="flex-1 bg-cream-200 rounded-sm rounded-tl-none px-3.5 py-2.5 border border-ink-900/10">
                    <p className="text-sm text-ink-900 font-sans">{active.prompt}</p>
                  </div>
                </div>

                {/* AI response */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-sm bg-gradient-to-br from-accent-500 to-amber-700 flex items-center justify-center shrink-0 border border-ink-900/10">
                    <Sparkles className="w-3.5 h-3.5 text-cream-100" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-ink-900 font-sans">NexusAi Beta</span>
                      <span className="text-[10px] text-ink-400 font-sans italic">just now</span>
                    </div>
                    <p className="text-sm text-ink-700 leading-relaxed font-sans">{active.response}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {active.actions.map((a) => (
                        <button
                          key={a}
                          className="px-2.5 py-1 bg-cream-100 hover:bg-cream-200 text-ink-800 text-[11px] font-medium rounded-sm transition-colors border border-ink-900/15 font-sans"
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Input bar */}
                <div className="mt-auto pt-5">
                  <div className="flex items-center gap-2 px-3.5 py-2.5 border border-ink-900/15 rounded-sm bg-cream-100">
                    <Sparkles className="w-4 h-4 text-ink-500" />
                    <span className="text-sm text-ink-400 flex-1 italic font-serif">
                      Ask NexusAi Beta anything…
                    </span>
                    <kbd className="px-1.5 py-0.5 text-[10px] bg-cream-50 border border-ink-900/15 rounded-sm text-ink-500 font-mono">
                      ⌘K
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
