import React from 'react';
import { CompetitorComparison } from '@/lib/seo-data';

interface ComparisonMatrixProps {
  competitor: CompetitorComparison;
}

export default function ComparisonMatrix({ competitor }: ComparisonMatrixProps) {
  return (
    <div className="my-8 space-y-8">
      {/* 1. Comparison Matrix Grid Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-left text-sm text-foreground">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="p-4 font-semibold uppercase tracking-wider text-xs">Feature Dimension</th>
              <th className="p-4 font-semibold uppercase tracking-wider text-xs text-amber-600 dark:text-amber-500">Nexus AI Workspace</th>
              <th className="p-4 font-semibold uppercase tracking-wider text-xs">{competitor.name}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <td className="p-4 font-medium">Core Workspace Model</td>
              <td className="p-4 text-amber-700 dark:text-amber-500 font-semibold bg-amber-500/5">Active (Agentic Background Processing)</td>
              <td className="p-4 text-muted-foreground">{competitor.coreModel}</td>
            </tr>
            <tr>
              <td className="p-4 font-medium">Email Integration</td>
              <td className="p-4 text-amber-700 dark:text-amber-500 font-semibold bg-amber-500/5">Native (Gmail, Outlook, IMAP Sync)</td>
              <td className="p-4 text-muted-foreground">{competitor.emailIntegration}</td>
            </tr>
            <tr>
              <td className="p-4 font-medium">Calendar Automation</td>
              <td className="p-4 text-amber-700 dark:text-amber-500 font-semibold bg-amber-500/5">Native (Auto-schedules Focus Blocks)</td>
              <td className="p-4 text-muted-foreground">{competitor.calendarAutomation}</td>
            </tr>
            <tr>
              <td className="p-4 font-medium">Offboarding Handovers</td>
              <td className="p-4 text-amber-700 dark:text-amber-500 font-semibold bg-amber-500/5">Yes (Generates handover files in 5 mins)</td>
              <td className="p-4 text-muted-foreground">{competitor.handoverAutomation}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 2. Pros and Cons comparison cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-emerald-500/5 dark:bg-emerald-500/10 rounded-lg border border-emerald-500/20 p-5 shadow-sm">
          <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-500 uppercase tracking-widest mb-3 font-sans">
            Why Choose Nexus AI? (Pros)
          </h4>
          <ul className="space-y-2">
            {competitor.pros.map((pro, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground font-sans">
                <span className="text-emerald-600 dark:text-emerald-500 font-bold">✓</span>
                <span>{pro}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-rose-500/5 dark:bg-rose-500/10 rounded-lg border border-rose-500/20 p-5 shadow-sm">
          <h4 className="text-xs font-bold text-rose-700 dark:text-rose-500 uppercase tracking-widest mb-3 font-sans">
            Limits of {competitor.name} (Cons)
          </h4>
          <ul className="space-y-2">
            {competitor.cons.map((con, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground font-sans">
                <span className="text-rose-600 dark:text-rose-500 font-bold">✗</span>
                <span>{con}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
