'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface FloatingAiButtonProps {
  onClick: () => void;
  isActive: boolean;
}

export function FloatingAiButton({ onClick, isActive }: FloatingAiButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`fixed bottom-24 right-6 z-45 p-4 rounded-full shadow-2xl flex items-center justify-center border transition-all duration-300 pointer-events-auto ${
        isActive 
          ? 'bg-purple-600 border-purple-500 text-white shadow-purple-600/35 animate-pulse' 
          : 'bg-zinc-950/80 border-white/10 text-purple-400 hover:text-white shadow-black/40 hover:bg-purple-600 hover:border-purple-500'
      }`}
      title="Ask Nexus AI"
    >
      <Sparkles className="w-5.5 h-5.5" />
    </motion.button>
  );
}
