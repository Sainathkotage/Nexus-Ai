'use client';

import React, { useEffect } from 'react';
import { useTutorial } from '@/lib/tutorial-context';
import { OnboardingWelcome } from './onboarding-welcome';
import { OnboardingPersonalization } from './onboarding-personalization';
import { OnboardingWorkspaceSetup } from './onboarding-workspace-setup';
import { OnboardingMissions } from './onboarding-missions';
import { OnboardingCelebration } from './onboarding-celebration';
import { OnboardingAiAssistant } from './onboarding-ai-assistant';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, X } from 'lucide-react';

export function OnboardingOverlay() {
  const { onboardingPhase, setOnboardingPhase, skipTutorial, loading } = useTutorial();

  // Handle keyboard escape to minimize or close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Esc minimizes or skips
        if (onboardingPhase !== 'done') {
          // Keep active but let user close if they explicitly want to bypass
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onboardingPhase]);

  if (loading || onboardingPhase === 'done') return null;

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 lg:p-6 select-none font-sans overflow-hidden">
      
      {/* Premium blur backdrop */}
      <div className="absolute inset-0 bg-[#09090b]/40 dark:bg-black/60 backdrop-blur-md" />
      <div className="mesh-backdrop opacity-70 pointer-events-none" />

      {/* Main Container Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.4, cubicBezier: [0.16, 1, 0.3, 1] }}
        className={`w-full relative bg-white/95 dark:bg-slate-950/90 border border-slate-200/50 dark:border-slate-800/80 shadow-2xl rounded-3xl p-6 lg:p-8 flex flex-col justify-between overflow-hidden transition-all duration-300 ${
          onboardingPhase === 'missions' ? 'max-w-4xl min-h-[620px]' : 'max-w-xl min-h-[480px]'
        }`}
      >
        {/* Floating background blobs */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Small header bar */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-4 relative z-20">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <HelpCircle className="w-4 h-4 text-indigo-500" />
            <span>Nexus AI Onboarding Tour</span>
          </div>
          <button
            onClick={skipTutorial}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-0.5 bg-transparent border-0 cursor-pointer p-0"
          >
            <span>Skip Tour</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Phase Components inside central slot */}
        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {onboardingPhase === 'welcome' && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <OnboardingWelcome />
              </motion.div>
            )}

            {onboardingPhase === 'personalization' && (
              <motion.div
                key="personalization"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <OnboardingPersonalization />
              </motion.div>
            )}

            {onboardingPhase === 'workspace-setup' && (
              <motion.div
                key="setup"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <OnboardingWorkspaceSetup />
              </motion.div>
            )}

            {onboardingPhase === 'missions' && (
              <motion.div
                key="missions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <OnboardingMissions />
              </motion.div>
            )}

            {onboardingPhase === 'celebration' && (
              <motion.div
                key="celebration"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <OnboardingCelebration />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </motion.div>

      {/* Contextual AI Assistant Floating Bubble */}
      <OnboardingAiAssistant />
    </div>
  );
}
