import { Sparkles } from 'lucide-react';

export function Footer() {
  const cols = [
    {
      title: 'Product',
      links: ['Features', 'AI Chief of Staff', 'Integrations', 'Pricing', 'Changelog', 'Roadmap'],
    },
    {
      title: 'Resources',
      links: ['Docs', 'API', 'Guides', 'Blog', 'Community', 'Status'],
    },
    {
      title: 'Company',
      links: ['About', 'Careers', 'Press', 'Contact', 'Customers'],
    },
    {
      title: 'Legal',
      links: ['Privacy', 'Terms', 'Security', 'DPA', 'Subprocessors'],
    },
  ];

  return (
    <footer className="relative border-t border-ink-900/10 bg-cream-100/60">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-6 gap-8 mb-12">
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-ink-900 to-ink-700 flex items-center justify-center border border-accent-600/30">
                <Sparkles className="w-4 h-4 text-cream-100" strokeWidth={2.5} />
              </div>
              <span className="font-serif font-medium text-ink-900 text-xl">
                Nexus
              </span>
            </a>
            <p className="text-sm text-ink-500 max-w-xs leading-relaxed font-serif italic">
              Your AI Chief of Staff. Documents, tasks, calendar, and email
              unified in one intelligent workspace.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-ink-500 font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-pulse-dot" />
              All systems operational
            </div>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold text-ink-900 mb-4 uppercase tracking-[0.2em] font-sans">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-ink-500 hover:text-accent-600 transition-colors font-sans"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-ink-900/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-xs text-ink-500 font-sans">
            © 2026 Nexus AI, Inc. Crafted with care Nagpur, India.
          </p>
          <div className="flex items-center gap-4 text-xs text-ink-500 font-sans">
            <a href="#" className="hover:text-accent-600 transition-colors">Twitter</a>
            <span className="text-ink-300">·</span>
            <a href="#" className="hover:text-accent-600 transition-colors">GitHub</a>
            <span className="text-ink-300">·</span>
            <a href="#" className="hover:text-accent-600 transition-colors">LinkedIn</a>
            <span className="text-ink-300">·</span>
            <a href="#" className="hover:text-accent-600 transition-colors">Discord</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
