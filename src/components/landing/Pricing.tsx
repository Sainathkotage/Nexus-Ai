import { Check } from 'lucide-react';

export function Pricing({ onStart, onBookDemo }: { onStart?: (e: React.MouseEvent) => void; onBookDemo?: (e: React.MouseEvent) => void }) {
  const plans = [
    {
      name: 'Public Beta Access',
      price: '$0',
      period: 'free during beta',
      desc: 'Access all premium AI workspaces, employee handover generators, and commitments tracking features.',
      features: [
        'Unlimited workspaces & documents',
        'Proactive AI Chief of Staff & Handover Generators',
        'Automatic commitments & unfulfilled tasks extractions',
        'Interactive SVG relationship graphs & collaboration weights',
        'Decision logs tracking & semantic Q&A indexers',
        'Direct feedback channels with core engineering',
        'No credit card required to sign up',
      ],
      cta: 'Get Started for Free',
      featured: true,
    },
  ];

  return (
    <section id="pricing" className="py-24 md:py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <div className="vintage-divider text-xs font-semibold uppercase tracking-[0.3em] mb-6 text-ink-500">
            <span className="flourish text-base">✦</span>
            <span className="mx-3">Pricing</span>
            <span className="flourish text-base">✦</span>
          </div>
          <h2 className="font-serif text-5xl md:text-6xl font-medium text-ink-900 leading-[1.05]">
            Simple pricing.
            <br />
            <span className="italic text-ink-500 font-normal">Free till Beta.</span>
          </h2>
          <p className="mt-6 text-lg text-ink-500 font-serif italic">
            Get full access to all premium NexusAi Beta features, completely free of charge during our public Beta release.
          </p>
        </div>

        <div className="flex justify-center max-w-lg mx-auto">
          {plans.map((p) => (
            <div
              key={p.name}
              className="relative rounded-sm p-8 transition-all bg-ink-900 text-cream-100 shadow-2xl shadow-ink-900/30 w-full"
              style={{ border: '1px solid rgba(194, 65, 12, 0.4)' }}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent-500 text-cream-100 text-[10px] font-semibold uppercase tracking-[0.2em] rounded-sm">
                Beta Release Offer
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70 mb-3 font-sans">
                {p.name}
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-serif text-5xl font-medium">{p.price}</span>
                <span className="text-sm opacity-60 font-sans">{p.period}</span>
              </div>
              <p className="text-sm mb-6 font-sans text-cream-200">
                {p.desc}
              </p>

              <button
                onClick={onStart}
                className="w-full py-2.5 rounded-sm text-sm font-medium transition-all font-sans cursor-pointer border-0 bg-cream-100 text-ink-900 hover:bg-white"
              >
                {p.cta}
              </button>

              <div className="mt-6 pt-6 border-t border-cream-100/20 space-y-3">
                {p.features.map((f) => (
                  <div key={f} className="flex items-start gap-2.5 font-sans">
                    <div className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-accent-500/30">
                      <Check className="w-2.5 h-2.5 text-accent-500" strokeWidth={3} />
                    </div>
                    <span className="text-sm text-cream-100">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
