'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTutorial } from '@/lib/tutorial-context';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';

const QUESTIONS = [
  {
    key: 'role',
    title: 'What is your primary role?',
    subtitle: 'We will tailor your AI Copilot recommendations to your daily workflow.',
    options: ['Founder / CEO', 'Engineering Lead', 'Product Manager', 'Designer', 'Operations Manager', 'Marketing / Sales'],
  },
  {
    key: 'teamSize',
    title: 'What is your team size?',
    subtitle: 'Helps us coordinate workspace sync speeds and permission tiers.',
    options: ['Just me', '2 - 10 people', '11 - 50 people', '50+ people'],
  },
  {
    key: 'goals',
    title: 'What is your primary goal?',
    subtitle: 'Select all options that describe what you want Nexus to automate.',
    options: [
      'Preserve team memory & decisions',
      'Automate handovers & offboarding',
      'Consolidate inbox, chat, and calendar',
      'Track tasks & project execution',
      'Generate automated daily huddle summaries',
    ],
    isMulti: true,
  },
];

export function OnboardingPersonalization() {
  const { userPersona, setUserPersona, setOnboardingPhase } = useTutorial();
  const [currentIdx, setCurrentIdx] = useState(0);

  // Temporary local states to allow navigating back/forth
  const [role, setRole] = useState(userPersona.role);
  const [teamSize, setTeamSize] = useState(userPersona.teamSize);
  const [goals, setGoals] = useState<string[]>(userPersona.goals);

  const activeQuestion = QUESTIONS[currentIdx];

  const handleSelect = (option: string) => {
    if (activeQuestion.key === 'role') {
      setRole(option);
      setTimeout(() => setCurrentIdx(1), 300);
    } else if (activeQuestion.key === 'teamSize') {
      setTeamSize(option);
      setTimeout(() => setCurrentIdx(2), 300);
    } else {
      // Toggle for multi-select
      if (goals.includes(option)) {
        setGoals(goals.filter((g) => g !== option));
      } else {
        setGoals([...goals, option]);
      }
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleNext = () => {
    if (currentIdx === 2) {
      // Save full persona and go to setup
      setUserPersona({ role, teamSize, goals });
      setOnboardingPhase('workspace-setup');
    } else {
      setCurrentIdx(currentIdx + 1);
    }
  };

  // Check if we can proceed
  const canProceed = () => {
    if (currentIdx === 0) return !!role;
    if (currentIdx === 1) return !!teamSize;
    if (currentIdx === 2) return goals.length > 0;
    return false;
  };

  return (
    <div className="max-w-xl mx-auto w-full py-8 px-4 flex flex-col min-h-[480px] justify-between relative z-10">
      {/* Progress indicators */}
      <div className="flex items-center justify-between mb-8">
        {currentIdx > 0 ? (
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-transparent border-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
        ) : (
          <div className="w-10" /> // spacer
        )}

        <div className="flex gap-2">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIdx
                  ? 'w-6 bg-indigo-600'
                  : i < currentIdx
                  ? 'w-2 bg-indigo-600/40'
                  : 'w-2 bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        <div className="w-10" /> {/* spacer */}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center my-4 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col gap-6"
          >
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                {activeQuestion.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {activeQuestion.subtitle}
              </p>
            </div>

            {/* Options grid */}
            <div className="grid grid-cols-1 gap-3 mt-2">
              {activeQuestion.options.map((option) => {
                let isSelected = false;
                if (activeQuestion.key === 'role') isSelected = role === option;
                else if (activeQuestion.key === 'teamSize') isSelected = teamSize === option;
                else isSelected = goals.includes(option);

                return (
                  <button
                    key={option}
                    onClick={() => handleSelect(option)}
                    className={`w-full p-4 rounded-xl border text-left transition-all duration-200 flex items-center justify-between font-sans group cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-semibold ring-1 ring-indigo-600'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 bg-card'
                    }`}
                  >
                    <span className="text-xs">{option}</span>
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 group-hover:border-slate-400 transition-colors shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation Button */}
      <div className="mt-8 flex justify-end">
        {activeQuestion.isMulti && (
          <Button
            disabled={!canProceed()}
            onClick={handleNext}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 group border-0 cursor-pointer disabled:opacity-50"
          >
            <span>Setup Workspace</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
