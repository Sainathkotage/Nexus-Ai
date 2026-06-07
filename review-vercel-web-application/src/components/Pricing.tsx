import { Check } from 'lucide-react';

export function Pricing() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      desc: 'For individuals getting started.',
      features: [
        'Up to 3 workspaces',
        '100 AI actions per month',
        'Docs, tasks, calendar',
        'Email integration, 1 account',
        'Community support',
      ],
      cta: 'Start free',
      featured: false,
    },
    {
      name: 'Pro',
      price: '$12',
      period: '/ user / month',
      desc: 'For power users and small teams.',
      features: [
        'Unlimited workspaces',
        '2,000 AI actions per month',
        'AI Chief of Staff, full access',
        'Unlimited email accounts',
        '200+ integrations',
        'Version history, 90 days',
        'Priority support',
      ],
      cta: 'Start 14-day trial',
      featured: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'contact sales',
      desc: 'For organizations with advanced needs.',
      features: [
        'Everything in Pro',
        'Unlimited AI actions',
        'SSO, SAML, SCIM',
        'Audit logs and DLP',
        'Custom AI training on your data',
        'Dedicated success manager',
        '99.99% uptime SLA',
      ],
      cta: 'Talk to sales',
      featured: false,
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
            <span className="italic text-ink-500 font-normal">Serious power.</span>
          </h2>
          <p className="mt-6 text-lg text-ink-500">
            Start free. Upgrade when you are ready. Cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-sm p-6 transition-all ${
                p.featured
                  ? 'bg-ink-900 text-cream-100 shadow-2xl shadow-ink-900/30 md:-translate-y-2'
                  : 'vintage-card'
              }`}
              style={p.featured ? { border: '1px solid rgba(194, 65, 12, 0.4)' } : undefined}
            >
              {p.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent-500 text-cream-100 text-[10px] font-semibold uppercase tracking-[0.2em] rounded-sm">
                  Most Popular
                </div>
              )}
              <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70 mb-3 font-sans">
                {p.name}
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-serif text-5xl font-medium">{p.price}</span>
                <span className="text-sm opacity-60 font-sans">{p.period}</span>
              </div>
              <p className={`text-sm mb-6 font-sans ${p.featured ? 'text-cream-200' : 'text-ink-500'}`}>
                {p.desc}
              </p>

              <button
                className={`w-full py-2.5 rounded-sm text-sm font-medium transition-all font-sans ${
                  p.featured
                    ? 'bg-cream-100 text-ink-900 hover:bg-white'
                    : 'bg-ink-900 text-cream-100 hover:bg-ink-700'
                }`}
              >
                {p.cta}
              </button>

              <div className={`mt-6 pt-6 border-t space-y-3 ${p.featured ? 'border-cream-100/20' : 'border-ink-900/10'}`}>
                {p.features.map((f) => (
                  <div key={f} className="flex items-start gap-2.5 font-sans">
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        p.featured ? 'bg-accent-500/30' : 'bg-accent-500/15'
                      }`}
                    >
                      <Check
                        className={`w-2.5 h-2.5 ${
                          p.featured ? 'text-accent-500' : 'text-accent-600'
                        }`}
                        strokeWidth={3}
                      />
                    </div>
                    <span className="text-sm">{f}</span>
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
