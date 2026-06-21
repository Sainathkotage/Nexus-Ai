'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTutorial } from '@/lib/tutorial-context';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

const CAPABILITIES = [
  'preserves organization memory',
  'summarizes documents automatically',
  'coordinates calendars and huddles',
  'manages tasks and project pipelines',
  'drafts emails and updates channels',
];

export function OnboardingWelcome() {
  const { startTutorial, skipTutorial } = useTutorial();
  const [capIndex, setCapIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCapIndex((prev) => (prev + 1) % CAPABILITIES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] py-8 text-center max-w-xl mx-auto relative z-10 px-4">
      {/* Animated Logo Container */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative mb-8"
      >
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 opacity-30 blur-lg animate-pulse" />
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center border border-indigo-400/30 shadow-2xl">
          <Sparkles className="w-8 h-8 text-white" strokeWidth={2.5} />
        </div>
      </motion.div>

      {/* Main Headers */}
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4 leading-tight font-serif"
      >
        Meet your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">AI Chief of Staff</span>
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6"
      >
        Nexus AI unifies your workspace. It is an active operating system that:
      </motion.p>

      {/* Rotating capability tagline */}
      <div className="h-8 mb-12 relative w-full flex justify-center items-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={capIndex}
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -15, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm tracking-wide uppercase font-mono"
          >
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{CAPABILITIES[capIndex]}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full"
      >
        <Button
          onClick={startTutorial}
          size="lg"
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-xl shadow-indigo-600/20 dark:shadow-indigo-600/5 transition-all flex items-center justify-center gap-2 group border-0 cursor-pointer"
        >
          <span>Start Your Setup</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Button>
        
        <Button
          variant="ghost"
          onClick={skipTutorial}
          size="lg"
          className="w-full sm:w-auto text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium py-3 px-8 rounded-xl transition-all cursor-pointer"
        >
          Skip for now
        </Button>
      </motion.div>

      {/* Trust Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="mt-12 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
        <span>Fully encrypted private data context · Nagpur, India</span>
      </motion.div>
    </div>
  );
}
