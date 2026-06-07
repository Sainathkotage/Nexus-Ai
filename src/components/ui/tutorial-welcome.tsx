'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTutorial } from '@/lib/tutorial-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, HelpCircle, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export function TutorialWelcome() {
  const { showWelcome, startTutorial, skipTutorial, abVariant } = useTutorial();
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const [glowPos, setGlowPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const cardRect = e.currentTarget.getBoundingClientRect();
    setGlowPos({
      x: e.clientX - cardRect.left,
      y: e.clientY - cardRect.top
    });
  };

  // Focus management: Focus the start button when the welcome modal opens
  useEffect(() => {
    if (showWelcome) {
      setTimeout(() => {
        startButtonRef.current?.focus();
      }, 100);
    }
  }, [showWelcome]);

  if (!showWelcome) return null;

  return (
    <>
      <Dialog open={showWelcome} onOpenChange={(open) => !open && skipTutorial()}>
        <DialogContent 
          onMouseMove={handleMouseMove}
          className="notification sm:max-w-md border-none p-0 overflow-hidden relative select-none"
        >
          {/* Uiverse Hover Glow Elements */}
          <div className="notiglow" style={{ left: `${glowPos.x}px`, top: `${glowPos.y}px` }} />
          <div className="notiborderglow" style={{ left: `${glowPos.x}px`, top: `${glowPos.y}px` }} />

          {/* Content Container (relative z-5 to overlay glow elements) */}
          <div className="relative z-[5] flex flex-col w-full h-full p-6">
            <div className="flex flex-col items-center text-center gap-5 py-2">
              
              {/* Refined clean logo container */}
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="w-12 h-12 rounded-full bg-[#32a6ff]/10 border border-[#32a6ff]/20 flex items-center justify-center text-[#32a6ff] shrink-0"
              >
                <Sparkles className="w-5 h-5" />
              </motion.div>

              <DialogHeader className="gap-2">
                <DialogTitle className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-200 leading-tight">
                  Welcome to Nexus AI
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
                  {abVariant === 'A' ? (
                    <span>
                      Let's take a quick 2-minute tour of your new AI-powered workspace. We'll show you how to manage collaborative tasks, write documents, track focus time, and interact with your AI Chief of Staff.
                    </span>
                  ) : (
                    <span>
                      Learn the essential features of Nexus AI in a few interactive steps. Try out live tools, start a focus timer, and see how AI can automate your workload!
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              {/* Quick Checklist */}
              <div className="w-full border border-white/[0.06] rounded-2xl p-4 text-left flex flex-col gap-2 text-[11px] bg-white/[0.01]">
                <span className="font-semibold text-neutral-500 uppercase tracking-wider text-[9px]">WORKSPACE OVERVIEW</span>
                <div className="grid grid-cols-1 gap-2 mt-0.5 text-neutral-300 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#32a6ff]" />
                    <span>Navigate through Documents, Tasks, and Chat</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#32a6ff]" />
                    <span>Interact with smart AI insights & OKRs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#32a6ff]" />
                    <span>Track time dynamically with the focus clock</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-5 sm:justify-between items-center w-full gap-2 border-t border-white/[0.06] pt-4">
              <button 
                type="button"
                onClick={skipTutorial}
                className="text-xs text-neutral-400 hover:text-neutral-200 font-medium h-8 hover:bg-transparent transition-colors cursor-pointer"
                aria-label="Skip onboarding tour"
              >
                Skip Tour
              </button>
              <button 
                ref={startButtonRef}
                type="button"
                onClick={startTutorial}
                className="bg-[#32a6ff] hover:bg-[#4cb5ff] text-white font-semibold h-8.5 rounded-full text-xs px-5 shadow-none transition-colors w-full sm:w-auto cursor-pointer"
                aria-label="Start onboarding tour"
              >
                Start Tour
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSS Stylesheet Injector for Uiverse notification style */}
      <style jsx global>{`
        .notification {
          display: flex;
          flex-direction: column;
          isolation: isolate;
          position: relative;
          width: 20rem;
          height: auto;
          min-height: 8.5rem;
          background: #29292c;
          border-radius: 1rem;
          overflow: hidden;
          font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
          font-size: 16px;
          --gradient: linear-gradient(to bottom, #2eadff, #3d83ff, #7e61ff);
          --color: #32a6ff;
          box-sizing: border-box;
          border: none;
        }

        @media (max-width: 767px) {
          .notification {
            width: auto !important;
          }
        }

        .notification:before {
          position: absolute;
          content: "";
          inset: 0.0625rem;
          border-radius: 0.9375rem;
          background: #18181b;
          z-index: 2;
        }

        .notification:after {
          position: absolute;
          content: "";
          width: 0.25rem;
          inset: 0.65rem auto 0.65rem 0.5rem;
          border-radius: 0.125rem;
          background: var(--gradient);
          transition: transform 300ms ease;
          z-index: 4;
        }

        .notification:hover:after {
          transform: translateX(0.15rem);
        }

        .notititle {
          color: var(--color);
          padding: 0.65rem 0.25rem 0.4rem 1.25rem;
          font-weight: 500;
          font-size: 1.1rem;
          transition: transform 300ms ease;
          z-index: 5;
        }

        .notification:hover .notititle {
          transform: translateX(0.15rem);
        }

        .notibody {
          color: #99999d;
          padding: 0 1.25rem;
          transition: transform 300ms ease;
          z-index: 5;
        }

        .notification:hover .notibody {
          transform: translateX(0.25rem);
        }

        .notiglow,
        .notiborderglow {
          position: absolute;
          width: 20rem;
          height: 20rem;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle closest-side at center, white, transparent);
          opacity: 0;
          transition: opacity 300ms ease;
          pointer-events: none;
        }

        .notiglow {
          z-index: 3;
        }

        .notiborderglow {
          z-index: 1;
        }

        .notification:hover .notiglow {
          opacity: 0.1;
        }

        .notification:hover .notiborderglow {
          opacity: 0.1;
        }
      `}</style>
    </>
  );
}
