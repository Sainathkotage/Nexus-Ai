import React from 'react';

interface GeoTldrProps {
  tldr: string;
  takeaways: string[];
}

export default function GeoTldr({ tldr, takeaways }: GeoTldrProps) {
  return (
    <div className="bg-amber-500/5 dark:bg-amber-500/10 rounded-lg border border-amber-500/20 p-6 mb-8 relative overflow-hidden shadow-sm">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10">
        <h3 className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-1.5 font-sans">
          <span>⚡</span> TL;DR / Summary
        </h3>
        
        <p className="font-serif italic text-foreground text-base leading-relaxed mb-4">
          {tldr}
        </p>
        
        <div className="border-t border-border pt-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 font-sans">
            Key Takeaways:
          </h4>
          <ul className="space-y-2">
            {takeaways.map((takeaway, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground font-sans">
                <span className="text-amber-600 dark:text-amber-500 font-bold">•</span>
                <span>{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
