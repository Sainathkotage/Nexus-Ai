import { useState } from 'react';
import { ChevronDown, ArrowUpRight } from 'lucide-react';

const faqs = [
  {
    q: 'How is Nexus different from Notion, Linear, or Slack?',
    a: 'Nexus unifies docs, tasks, calendar, email, and chat in one AI-native workspace. Instead of context-switching between apps, you work in one surface where the AI understands everything. We also integrate with all your existing tools, so you do not have to migrate.',
  },
  {
    q: 'Is my data safe? What about privacy?',
    a: 'Yes. Nexus is SOC 2 Type II certified, HIPAA-compliant on Enterprise plans, and uses end-to-end encryption. Your data is never used to train public models. You can choose where your data is stored (US, EU, or self-hosted).',
  },
  {
    q: 'What does "AI Chief of Staff" actually do?',
    a: 'It proactively monitors your calendar, inbox, and tasks, then surfaces what matters. It drafts replies, summarizes meetings, creates follow-up tasks, and suggests reschedules, always with you in control. Think of it as a trusted executive assistant who never sleeps.',
  },
  {
    q: 'Can I bring my existing data?',
    a: 'Absolutely. We have one-click importers for Notion, Google Docs, Asana, Trello, Linear, Jira, and more. Your existing links, comments, and history are preserved.',
  },
  {
    q: 'What happens when I hit my AI action limit?',
    a: 'You will get a heads-up at 80% and 100%. You can upgrade anytime, or buy add-on packs. Core workspace features (docs, tasks, calendar) never stop working.',
  },
  {
    q: 'Do you have a mobile app?',
    a: 'Yes, native iOS and Android apps with offline support, push notifications, and full AI access. Desktop apps for macOS, Windows, and Linux also available.',
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 md:py-32 relative">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="vintage-divider text-xs font-semibold uppercase tracking-[0.3em] mb-6 text-ink-500 font-sans">
            <span className="flourish text-base">✦</span>
            <span className="mx-3">Frequently Asked</span>
            <span className="flourish text-base">✦</span>
          </div>
          <h2 className="font-serif text-5xl md:text-6xl font-medium text-ink-900">
            Questions, answered.
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="vintage-card rounded-sm overflow-hidden transition-colors"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left"
              >
                <span className="font-serif text-lg font-medium text-ink-900">{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-ink-500 shrink-0 transition-transform ${
                    open === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5 -mt-1">
                  <p className="text-ink-600 leading-relaxed font-sans">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCTA({ onStart, onBookDemo }: { onStart?: (e: React.MouseEvent) => void; onBookDemo?: (e: React.MouseEvent) => void }) {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-6">
        <div className="relative bg-ink-900 rounded-sm overflow-hidden px-8 py-16 md:p-20 text-center border border-accent-600/30">
          {/* Glow effects */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-accent-500/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-amber-600/20 rounded-full blur-3xl" />

          {/* Vintage grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,240,220,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,240,220,0.4) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative">
            <div className="vintage-divider text-xs font-semibold uppercase tracking-[0.3em] mb-8 text-cream-300 font-sans">
              <span className="flourish text-base">❦</span>
              <span className="mx-3">A Final Word</span>
              <span className="flourish text-base">❦</span>
            </div>
            <h2 className="font-serif text-5xl md:text-6xl font-medium text-cream-100 leading-tight">
              Ready to meet your
              <br />
              <span className="italic bg-gradient-to-r from-accent-500 via-amber-400 to-yellow-300 bg-clip-text text-transparent font-normal">
                AI Chief of Staff?
              </span>
            </h2>
            <p className="mt-6 text-lg text-cream-200 max-w-xl mx-auto italic font-serif">
              Join 20,000+ teams who have made Nexus the center of their work.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={onStart}
                className="group px-7 py-3.5 bg-cream-100 hover:bg-white text-ink-900 text-sm font-medium rounded-sm transition-all inline-flex items-center justify-center gap-2 font-sans cursor-pointer border-0"
              >
                Start free, 2 minutes
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
              <button
                onClick={onBookDemo}
                className="px-7 py-3.5 bg-cream-100/10 hover:bg-cream-100/20 backdrop-blur text-cream-100 text-sm font-medium rounded-sm border border-cream-100/20 transition-all font-sans cursor-pointer"
              >
                Book a demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
