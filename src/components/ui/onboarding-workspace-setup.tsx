'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useTutorial } from '@/lib/tutorial-context';
import { Loader2, CheckCircle2 } from 'lucide-react';

export function OnboardingWorkspaceSetup() {
  const { userPersona, setOnboardingPhase } = useTutorial();
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    `Analyzing workflows for ${userPersona.role || 'your role'}...`,
    'Provisioning database workspace schema...',
    'Spinning up secure local context graphs...',
    'Deploying proactive AI Chief of Staff agents...',
  ];

  useEffect(() => {
    // Increment progress bar smoothly
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const diff = Math.random() * 8 + 3;
        return Math.min(prev + diff, 100);
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  // Update checklist items based on progress
  useEffect(() => {
    if (progress >= 95) {
      setActiveStep(4);
      // Auto-advance to missions after a slight delay
      const timeout = setTimeout(() => {
        setOnboardingPhase('missions');
      }, 800);
      return () => clearTimeout(timeout);
    } else if (progress >= 70) {
      setActiveStep(3);
    } else if (progress >= 40) {
      setActiveStep(2);
    } else if (progress >= 15) {
      setActiveStep(1);
    }
  }, [progress, setOnboardingPhase]);

  return (
    <div className="flex flex-col items-center justify-center max-w-md mx-auto w-full py-12 px-4 min-h-[420px] text-center relative z-10">
      {/* Animated gear or spinner */}
      <div className="relative mb-8">
        <Loader2 className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin" strokeWidth={2} />
        <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 leading-tight font-serif">
        Setting Up Your Workspace
      </h2>
      
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-8 max-w-xs leading-relaxed">
        Configuring personal preferences and indexing core dashboard widgets. This will take a few moments.
      </p>

      {/* Progress Bar Container */}
      <div className="w-full bg-slate-100 dark:bg-slate-800/80 h-2.5 rounded-full overflow-hidden mb-8 relative border border-slate-200/20">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shadow-lg"
          style={{ width: `${progress}%` }}
          transition={{ ease: 'easeOut' }}
        />
      </div>

      {/* Checklist status elements */}
      <div className="w-full flex flex-col gap-3.5 text-left border border-slate-200/50 dark:border-slate-800/60 bg-card rounded-xl p-5 shadow-sm">
        {steps.map((step, idx) => {
          const isCompleted = idx < activeStep;
          const isActive = idx === activeStep;

          return (
            <div
              key={idx}
              className={`flex items-center gap-3 text-xs transition-opacity duration-300 ${
                isCompleted || isActive ? 'opacity-100' : 'opacity-30'
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              ) : isActive ? (
                <Loader2 className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
              )}
              <span
                className={`font-medium ${
                  isCompleted
                    ? 'text-slate-500 dark:text-slate-400 line-through decoration-slate-300 dark:decoration-slate-700'
                    : isActive
                    ? 'text-slate-900 dark:text-white font-bold'
                    : 'text-slate-400 dark:text-slate-600'
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
