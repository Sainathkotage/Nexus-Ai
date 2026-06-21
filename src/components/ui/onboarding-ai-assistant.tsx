'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTutorial } from '@/lib/tutorial-context';
import { Sparkles, MessageCircle, X, HelpCircle, ArrowRight } from 'lucide-react';

export function OnboardingAiAssistant() {
  const { onboardingPhase, completedMissions } = useTutorial();
  const [isOpen, setIsOpen] = useState(false);

  // Contextual tips based on current onboarding phase
  const getContextualTip = () => {
    switch (onboardingPhase) {
      case 'welcome':
        return 'Welcome to Nexus! Click "Start Your Setup" to customize your workspace experience in 3 simple questions.';
      case 'personalization':
        return 'Select your role and goals! This shapes the suggested tasks, document summaries, and starter prompts in your workspace.';
      case 'workspace-setup':
        return 'Hold tight! We are currently configuring your database, secure encryption protocols, and custom templates.';
      case 'missions':
        if (completedMissions.length === 0) {
          return 'Mission 1: Fill out the task form on the right and click "Create Task" to write it to your dashboard.';
        }
        if (!completedMissions.includes('chat')) {
          return 'Mission 2: Select a prompt preset or type a question to consult Nexus AI. Your response will appear inline.';
        }
        if (!completedMissions.includes('document')) {
          return 'Mission 3: Select any PDF or text file to upload. Nexus AI parses information and extracts decisions automatically.';
        }
        if (!completedMissions.includes('invite')) {
          return 'Mission 4: Provide an email address to generate a secure copyable invitation link for collaborators.';
        }
        if (!completedMissions.includes('automation')) {
          return 'Mission 5: Choose a trigger and action to save your automation pipeline. Autopilot handles notifications automatically.';
        }
        return 'Awesome! All missions are complete. Click "Finish Onboarding" on the left to claim your celebration rewards.';
      case 'celebration':
        return 'Congratulations! You have completed all onboarding missions. Click "Enter Your Workspace" to begin exploring.';
      default:
        return 'Need help? I am here to help you get the most out of your Nexus Chief of Staff workspace.';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-16 right-0 w-80 bg-card border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 text-left overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 fill-indigo-500/20" />
                <span>Nexus AI Assistant</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-transparent border-0 cursor-pointer p-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content / Tip */}
            <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-900">
              {getContextualTip()}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              <span>Status: Online</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-indigo-600 hover:underline flex items-center gap-0.5 bg-transparent border-0 cursor-pointer font-bold"
              >
                <span>Got it</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white flex items-center justify-center shadow-xl shadow-indigo-600/20 dark:shadow-indigo-600/5 cursor-pointer border-0 relative"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -45, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 45, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div
              key="help"
              initial={{ rotate: 45, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -45, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative flex items-center justify-center"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-indigo-600 animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
