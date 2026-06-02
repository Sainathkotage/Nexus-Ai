'use client';

import React from 'react';
import { motion } from 'motion/react';
import { 
  FileText, Search, GitCompare, TrendingUp, Wand2, HelpCircle
} from 'lucide-react';
import { suggestedPrompts } from '@/lib/chat-prompts';

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
}

export function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  
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
    <motion.div 
      variants={container} 
      initial="hidden" 
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-4xl mx-auto my-8"
    >
      {suggestedPrompts.map((prompt) => (
        <motion.button
          variants={item}
          key={prompt.id}
          onClick={() => onSelect(prompt.text)}
          className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all text-left group shadow-sm hover:shadow"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            {getCategoryIcon(prompt.category)}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary/70 transition-colors">
              {prompt.category}
            </span>
            <span className="text-sm font-medium text-foreground leading-snug mt-0.5">
              {prompt.text}
            </span>
          </div>
        </motion.button>
      ))}
    </motion.div>
  );
}
