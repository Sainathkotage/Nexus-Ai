export function LogoCloud() {
  const logos = [
    'Linear',
    'Vercel',
    'Stripe',
    'Figma',
    'Notion',
    'Airtable',
  ];

  return (
    <section className="py-16 border-y border-ink-900/10 bg-cream-50/40">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-ink-400 mb-8 font-sans">
          ✦ Trusted by 20,000+ teams ✦
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {logos.map((l) => (
            <div
              key={l}
              className="text-xl md:text-2xl font-medium text-ink-400 hover:text-ink-700 transition-colors cursor-default font-serif italic"
            >
              {l}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
