'use client';

import React from 'react';
import { motion } from 'motion/react';
import { useTutorial } from '@/lib/tutorial-context';
import { 
  FileText, Search, GitCompare, TrendingUp, Wand2, HelpCircle
} from 'lucide-react';

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
}

interface SuggestedPrompt {
  id: string;
  text: string;
  category: 'Summarize' | 'Extract' | 'Compare' | 'Analyze' | 'Generate';
}

const DEFAULT_PROMPTS: SuggestedPrompt[] = [
  { id: 'sp1', text: 'Summarize my uploaded documents', category: 'Summarize' },
  { id: 'sp2', text: 'What deadlines are coming up?', category: 'Extract' },
  { id: 'sp3', text: 'Compare two documents side by side', category: 'Compare' },
  { id: 'sp4', text: 'List action items from recent uploads', category: 'Extract' },
  { id: 'sp5', text: 'What risks appear across my files?', category: 'Analyze' },
  { id: 'sp6', text: 'Draft a status update email for my team', category: 'Generate' },
];

const PERSONA_PROMPTS: Record<string, SuggestedPrompt[]> = {
  'Founder / CEO': [
    { id: 'f1', text: 'Summarize active deliverables across my team', category: 'Summarize' },
    { id: 'f2', text: 'What commitments are outstanding in my inbox?', category: 'Extract' },
    { id: 'f3', text: 'Draft a company-wide strategic update from my notes', category: 'Generate' },
    { id: 'f4', text: 'Compare this month\'s growth reports with targets', category: 'Compare' },
  ],
  'Engineering Lead': [
    { id: 'e1', text: 'Extract technical tasks from the recent spec sheets', category: 'Extract' },
    { id: 'e2', text: 'Draft a weekly release changelog for the team', category: 'Generate' },
    { id: 'e3', text: 'Compare implementation guidelines side-by-side', category: 'Compare' },
    { id: 'e4', text: 'Identify potential architectural risks in specifications', category: 'Analyze' },
  ],
  'Product Manager': [
    { id: 'p1', text: 'Draft a feature PRD based on my user feedback notes', category: 'Generate' },
    { id: 'p2', text: 'What milestones and deadlines are coming up for launch?', category: 'Extract' },
    { id: 'p3', text: 'Summarize recent client feature requests and syncs', category: 'Summarize' },
    { id: 'p4', text: 'Compare our Q3 roadmap goals with completed tasks', category: 'Compare' },
  ],
  'Designer': [
    { id: 'd1', text: 'Summarize the branding and UI audit guidelines', category: 'Summarize' },
    { id: 'd2', text: 'Draft a design system release update notice', category: 'Generate' },
    { id: 'd3', text: 'Compare design specifications with developer scope', category: 'Compare' },
    { id: 'd4', text: 'Identify consistency issues mentioned in feedback', category: 'Analyze' },
  ],
  'Operations Manager': [
    { id: 'o1', text: 'Draft a team onboarding wiki template', category: 'Generate' },
    { id: 'o2', text: 'Summarize weekly operational sync notes', category: 'Summarize' },
    { id: 'o3', text: 'List key action items from general company channels', category: 'Extract' },
    { id: 'o4', text: 'Compare standard operating guidelines for reviews', category: 'Compare' },
  ],
  'Marketing / Sales': [
    { id: 'm1', text: 'Draft a newsletter update based on the roadmap', category: 'Generate' },
    { id: 'm2', text: 'Extract client contact info and opportunities from emails', category: 'Extract' },
    { id: 'm3', text: 'Summarize competitor comparison sheets', category: 'Summarize' },
    { id: 'm4', text: 'Analyze growth trends and click metrics from reports', category: 'Analyze' },
  ]
};

export function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  const { userPersona } = useTutorial();

  // Pick personalized prompts or fallback to defaults
  const roleKey = userPersona?.role || '';
  const prompts = PERSONA_PROMPTS[roleKey] || DEFAULT_PROMPTS;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Summarize': return <FileText className="w-4 h-4" />;
      case 'Extract': return <Search className="w-4 h-4" />;
      case 'Compare': return <GitCompare className="w-4 h-4" />;
      case 'Analyze': return <TrendingUp className="w-4 h-4" />;
      case 'Generate': return <Wand2 className="w-4 h-4" />;
      default: return <HelpCircle className="w-4 h-4" />;
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1 }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-8">
      {roleKey && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block text-center mb-4">
          Personalized for {roleKey}
        </span>
      )}
      <motion.div 
        variants={container} 
        initial="hidden" 
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full"
      >
        {prompts.map((prompt) => (
          <motion.button
            variants={item}
            key={prompt.id}
            onClick={() => onSelect(prompt.text)}
            className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all text-left group shadow-sm hover:shadow cursor-pointer text-foreground"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              {getCategoryIcon(prompt.category)}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {prompt.category}
              </span>
              <span className="text-sm font-medium text-foreground leading-snug mt-0.5">
                {prompt.text}
              </span>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
