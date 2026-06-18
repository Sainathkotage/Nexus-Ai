'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTutorial } from '@/lib/tutorial-context';
import { X, HelpCircle, BookOpen, RotateCcw, Keyboard, MessageSquare, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/store';
import { toast } from 'sonner';

export function HelpCenter() {
  const { restartTutorial, isTutorialActive } = useTutorial();
  const { user, submitFeedback } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'faq' | 'shortcuts' | 'feedback'>('faq');
  const panelRef = useRef<HTMLDivElement>(null);

  const [feedbackCategory, setFeedbackCategory] = useState('general');
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    setIsSubmitting(true);
    try {
      const fullMessage = `[${feedbackCategory.toUpperCase()}] ${feedbackText}`;
      const res = await submitFeedback(fullMessage, 'help_center_popup');
      if (res.ok) {
        toast.success('Feedback submitted! Thank you.');
        setFeedbackText('');
      } else {
        toast.error(res.message || 'Failed to send feedback.');
      }
    } catch (err) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If tutorial is currently running, hide the help center button to avoid UI clutter
  const shouldRender = user && !isTutorialActive;

  // Toggle Help panel keyboard listener (Alt+H)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close panel listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 select-none">
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-[0_4px_12px_rgba(0,0,0,0.06)] flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-all pointer-events-auto cursor-pointer relative group"
        title="Help & Tour (Alt+H)"
        aria-label="Toggle help panel"
      >
        <HelpCircle className="w-5 h-5 group-hover:scale-105 transition-transform" />
        <span className="absolute right-12 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md text-neutral-800 dark:text-neutral-200 border border-black/[0.05] dark:border-white/[0.08] px-2.5 py-0.5 rounded-full text-[10px] shadow-sm font-medium opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap">
          Help & Quick Tour
        </span>
      </button>

      {/* Slide-in Help Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute bottom-12 right-0 w-80 bg-white/80 dark:bg-neutral-900/85 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-[0_12px_36px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.35)] rounded-3xl p-4.5 pointer-events-auto flex flex-col gap-4 text-left max-h-[460px] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.06] pb-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#0071e3]" />
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Help Center</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors p-0.5 rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer"
                aria-label="Close help panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Tour Button Section */}
            <div className="bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl p-3.5 flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5">
                <BookOpen className="w-4 h-4 text-[#0071e3] mt-0.5 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Interactive Workspace Tour</span>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-normal">
                    Let us guide you through our core features (Dashboard, Tasks, OKRs, AI Chat, Docs, and Timers) step by step.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  restartTutorial();
                }}
                className="w-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium h-8 rounded-full text-[11px] mt-1 shadow-none transition-colors cursor-pointer"
              >
                Start Workspace Tour
              </button>
            </div>

            {/* Tab toggler (macOS style pill control) */}
            <div className="flex bg-black/[0.03] dark:bg-white/[0.04] p-0.5 rounded-full border border-black/[0.02] dark:border-white/[0.02] shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('faq')}
                className={cn(
                  "flex-1 py-1 text-[10px] font-semibold rounded-full transition-all cursor-pointer",
                  activeTab === 'faq' ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)]" : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
                )}
              >
                FAQs
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('shortcuts')}
                className={cn(
                  "flex-1 py-1 text-[10px] font-semibold rounded-full transition-all cursor-pointer",
                  activeTab === 'shortcuts' ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)]" : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
                )}
              >
                Shortcuts
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('feedback')}
                className={cn(
                  "flex-1 py-1 text-[10px] font-semibold rounded-full transition-all cursor-pointer",
                  activeTab === 'feedback' ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)]" : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
                )}
              >
                Feedback
              </button>
            </div>

            {/* Scrollable Tabs Content */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 custom-scrollbar">
              {activeTab === 'faq' && (
                <div className="flex flex-col gap-3.5 py-1 text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5"><img src="/favicon.ico" className="w-3.5 h-3.5 object-contain" alt="" /> How do I create a new Workspace?</span>
                    <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      Click the team workspace header dropdown in the top-left corner of the sidebar, then click <strong>+ Create or Join Team</strong>.
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5"><img src="https://www.google.com/s2/favicons?domain=docs.google.com&sz=32" className="w-3.5 h-3.5 object-contain" alt="" /> Can I chat with documents?</span>
                    <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      Yes! Open the **Documents** tab, upload a document (PDF, TXT), click it, and the AI will extract summaries. You can also chat about it in **AI Chat**.
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5"><img src="https://www.google.com/s2/favicons?domain=clockify.me&sz=32" className="w-3.5 h-3.5 object-contain" alt="" /> What is the Global Time Tracker?</span>
                    <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      Located in the top bar. Enter a task description, click Play, and log your hours directly to your kanban task sheets.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'shortcuts' && (
                <div className="flex flex-col gap-2.5 py-1 text-[10.5px]">
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-neutral-500 dark:text-neutral-400">Search Panel</span>
                    <kbd className="bg-neutral-100 dark:bg-neutral-800/80 px-1.5 py-0.5 border border-black/[0.04] dark:border-white/[0.06] rounded-md font-mono text-[9px] text-neutral-800 dark:text-neutral-200 shadow-[0_1px_1px_rgba(0,0,0,0.04)] font-medium">Ctrl + K</kbd>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-neutral-500 dark:text-neutral-400">Toggle Help Panel</span>
                    <kbd className="bg-neutral-100 dark:bg-neutral-800/80 px-1.5 py-0.5 border border-black/[0.04] dark:border-white/[0.06] rounded-md font-mono text-[9px] text-neutral-800 dark:text-neutral-200 shadow-[0_1px_1px_rgba(0,0,0,0.04)] font-medium">Alt + H</kbd>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-neutral-500 dark:text-neutral-400">Ask AI Copilot</span>
                    <kbd className="bg-neutral-100 dark:bg-neutral-800/80 px-1.5 py-0.5 border border-black/[0.04] dark:border-white/[0.06] rounded-md font-mono text-[9px] text-neutral-800 dark:text-neutral-200 shadow-[0_1px_1px_rgba(0,0,0,0.04)] font-medium">Ctrl + Shift + A</kbd>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-neutral-500 dark:text-neutral-400">Toggle Left Sidebar</span>
                    <kbd className="bg-neutral-100 dark:bg-neutral-800/80 px-1.5 py-0.5 border border-black/[0.04] dark:border-white/[0.06] rounded-md font-mono text-[9px] text-neutral-800 dark:text-neutral-200 shadow-[0_1px_1px_rgba(0,0,0,0.04)] font-medium">Ctrl + \</kbd>
                  </div>
                </div>
              )}

              {activeTab === 'feedback' && (
                <div className="flex flex-col gap-3.5 py-1 text-xs">
                  <form onSubmit={handleSubmitFeedback} className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Feedback Category</label>
                      <select
                        value={feedbackCategory}
                        onChange={(e) => setFeedbackCategory(e.target.value)}
                        className="bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-2.5 py-1.5 text-[11px] text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary/30"
                      >
                        <option value="general" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">General Feedback</option>
                        <option value="bug" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">Bug Report</option>
                        <option value="feature" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">Feature Request</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Your Message</label>
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="Tell us what you think or report an issue..."
                        rows={5}
                        className="bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] rounded-xl p-2.5 text-[11px] text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none placeholder:text-neutral-450 dark:placeholder:text-neutral-550 leading-normal"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#0071e3] hover:bg-[#0077ed] disabled:bg-[#0071e3]/50 text-white font-medium h-8 rounded-full text-[11px] mt-1 shadow-none transition-colors cursor-pointer flex items-center justify-center"
                    >
                      {isSubmitting ? 'Sending...' : 'Send Feedback'}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-[9px] text-neutral-400/60 dark:text-neutral-500/60 border-t border-black/[0.04] dark:border-white/[0.06] pt-2 shrink-0 flex items-center justify-between">
              <span>Nexus AI v0.1.0</span>
              <span>Workspace Active</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
