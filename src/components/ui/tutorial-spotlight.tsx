'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTutorial, TUTORIAL_STEPS } from '@/lib/tutorial-context';
import { ChevronLeft, ChevronRight, X, Pause, Play, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

export function TutorialSpotlight() {
  const {
    isTutorialActive,
    currentStep,
    abVariant,
    nextStep,
    prevStep,
    skipTutorial,
    isPaused,
    pauseTutorial,
    resumeTutorial,
    trackInteractiveAction
  } = useTutorial();

  const [rect, setRect] = useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 1200, height: 800 });
  const [isMobile, setIsMobile] = useState(false);
  const [targetVisible, setTargetVisible] = useState(false);
  const [glowPos, setGlowPos] = useState({ x: 0, y: 0 });

  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const cardRect = e.currentTarget.getBoundingClientRect();
    setGlowPos({
      x: e.clientX - cardRect.left,
      y: e.clientY - cardRect.top
    });
  };
  
  // Touch Swiping Refs for Mobile
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const step = TUTORIAL_STEPS[currentStep];

  // ── Calculate Target Rect ──────────────────────────────────────
  const updateRect = useCallback(() => {
    if (!isTutorialActive || !step || !step.target) {
      setRect(null);
      setTargetVisible(false);
      return;
    }

    const el = document.querySelector(step.target);
    if (el) {
      const newRect = el.getBoundingClientRect();
      // Ensure element has actual visible coordinates
      if (newRect.width > 0 && newRect.height > 0) {
        setRect(newRect);
        setTargetVisible(true);
      } else {
        setTargetVisible(false);
      }
    } else {
      setRect(null);
      setTargetVisible(false);
    }
  }, [isTutorialActive, step]);

  // Set window size & mobile flag
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      setIsMobile(window.innerWidth < 768);
      updateRect();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', updateRect, { capture: true });

    // Poll to capture layout shifts or lazy loading elements
    const interval = setInterval(updateRect, 250);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', updateRect, { capture: true });
      clearInterval(interval);
    };
  }, [updateRect]);

  // Update target rect when current step changes
  useEffect(() => {
    updateRect();
  }, [currentStep, isTutorialActive, updateRect]);

  // ── Focus Management: Trap Focus inside card ───────────────────
  useEffect(() => {
    if (!isTutorialActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Global navigation hotkeys
      if (e.key === 'Escape') {
        e.preventDefault();
        skipTutorial();
        return;
      }
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        nextStep();
        return;
      }

      // Local Tab Focus Trap
      if (e.key === 'Tab' && cardRef.current) {
        const focusableElements = cardRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([-1])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Autofocus Card container on step load
    cardRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTutorialActive, currentStep, skipTutorial, nextStep]);

  // ── Swipe Gestures for Mobile Bottom Sheet ────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    const swipeThreshold = 50; // min distance in px

    if (diff > swipeThreshold) {
      // Swiped Left -> Next Step
      nextStep();
    } else if (diff < -swipeThreshold && currentStep > 1) {
      // Swiped Right -> Previous Step
      prevStep();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!isTutorialActive || !step || currentStep === 0 || currentStep === TUTORIAL_STEPS.length - 1) {
    return null;
  }

  // ── Calculate Tooltip Positioning (Desktop) ───────────────────
  let cardStyle: React.CSSProperties = {};
  const padding = 6;
  const cardW = 320;
  const cardH = 175; // Approx height

  if (rect && !isMobile) {
    let top = 0;
    let left = 0;

    if (step.placement === 'right') {
      left = rect.right + padding;
      top = rect.top + (rect.height - cardH) / 2;
    } else if (step.placement === 'left') {
      left = rect.left - cardW - padding;
      top = rect.top + (rect.height - cardH) / 2;
    } else if (step.placement === 'top') {
      left = rect.left + (rect.width - cardW) / 2;
      top = rect.top - cardH - padding;
    } else { // default: bottom
      left = rect.left + (rect.width - cardW) / 2;
      top = rect.bottom + padding;
    }

    // Adjust boundaries to fit viewport securely
    left = Math.max(16, Math.min(windowSize.width - cardW - 16, left));
    top = Math.max(16, Math.min(windowSize.height - cardH - 16, top));

    cardStyle = {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${cardW}px`,
      zIndex: 50
    };
  } else if (!isMobile) {
    // If target element is not loaded yet / scrolled off screen on desktop, center it
    cardStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: `${cardW}px`,
      zIndex: 50
    };
  }

  const getTutorialFavicon = (name: string) => {
    switch (name) {
      case 'left-sidebar':
        return 'https://www.google.com/s2/favicons?domain=notion.so&sz=32';
      case 'ai-recommendation':
        return 'https://www.google.com/s2/favicons?domain=openai.com&sz=32';
      case 'time-tracker':
        return 'https://www.google.com/s2/favicons?domain=clockify.me&sz=32';
      case 'ai-chat':
        return 'https://www.google.com/s2/favicons?domain=anthropic.com&sz=32';
      case 'tasks-board':
        return 'https://www.google.com/s2/favicons?domain=trello.com&sz=32';
      case 'documents-container':
        return 'https://www.google.com/s2/favicons?domain=docs.google.com&sz=32';
      case 'welcome':
      case 'celebration':
      default:
        return '/favicon.ico';
    }
  };

  const description = abVariant === 'A' ? step.descriptionA : step.descriptionB;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 select-none">
      
      {/* ── Background Cutout Overlay (4 Panels) ───────────────── */}
      {rect && targetVisible && (
        <div className="absolute inset-0 pointer-events-none transition-all duration-300">
          
          {/* Top cover */}
          <div 
            className="absolute bg-black/40 dark:bg-black/60 pointer-events-auto top-0 left-0 right-0"
            style={{ height: `${rect.top - padding}px` }}
          />
          {/* Bottom cover */}
          <div 
            className="absolute bg-black/40 dark:bg-black/60 pointer-events-auto bottom-0 left-0 right-0"
            style={{ top: `${rect.bottom + padding}px` }}
          />
          {/* Left cover */}
          <div 
            className="absolute bg-black/40 dark:bg-black/60 pointer-events-auto left-0"
            style={{ 
              top: `${rect.top - padding}px`, 
              height: `${rect.height + 2 * padding}px`,
              width: `${rect.left - padding}px`
            }}
          />
          {/* Right cover */}
          <div 
            className="absolute bg-black/40 dark:bg-black/60 pointer-events-auto right-0"
            style={{ 
              top: `${rect.top - padding}px`, 
              height: `${rect.height + 2 * padding}px`,
              left: `${rect.right + padding}px`
            }}
          />

          {/* Highlight ring overlay */}
          <div 
            className="absolute border-2 border-[#0071e3] shadow-[0_0_0_2px_rgba(0,113,227,0.15)] rounded-xl pointer-events-none transition-all duration-150 animate-pulse-soft"
            style={{
              left: `${rect.left - padding}px`,
              top: `${rect.top - padding}px`,
              width: `${rect.width + 2 * padding}px`,
              height: `${rect.height + 2 * padding}px`,
            }}
          />
        </div>
      )}

      {/* Full screen backdrop fallback if target is missing */}
      {(!rect || !targetVisible) && (
        <div className="absolute inset-0 pointer-events-auto bg-black/35 backdrop-blur-[1px]" />
      )}

      {/* ── Tooltip Dialog Card ───────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          ref={cardRef}
          tabIndex={0}
          initial={isMobile ? { y: 200, opacity: 0 } : { scale: 0.95, opacity: 0 }}
          animate={isMobile ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
          exit={isMobile ? { y: 200, opacity: 0 } : { scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 18 }}
          style={isMobile ? undefined : cardStyle}
          onTouchStart={isMobile ? handleTouchStart : undefined}
          onTouchMove={isMobile ? handleTouchMove : undefined}
          onTouchEnd={isMobile ? handleTouchEnd : undefined}
          onMouseMove={handleMouseMove}
          className={cn(
            "notification pointer-events-auto flex flex-col outline-none select-none text-left",
            isMobile && "fixed bottom-4 left-4 right-4 z-50"
          )}
          role="dialog"
          aria-modal="true"
          aria-label={`Tutorial step ${currentStep}: ${step.title}`}
        >
          {/* Uiverse Hover Glow Elements */}
          <div className="notiglow" style={{ left: `${glowPos.x}px`, top: `${glowPos.y}px` }} />
          <div className="notiborderglow" style={{ left: `${glowPos.x}px`, top: `${glowPos.y}px` }} />

          {/* Inner Content Area (relative z-5 to float above glow elements) */}
          <div className="relative z-[5] flex flex-col flex-1 h-full w-full justify-between">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-3.5 pb-1">
              <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 tracking-wider">
                Step {currentStep} of {TUTORIAL_STEPS.length - 2}
              </span>
              <button
                onClick={skipTutorial}
                className="text-neutral-400 hover:text-neutral-200 transition-colors p-0.5 rounded-full hover:bg-white/10 cursor-pointer"
                title="Skip tutorial tour"
                aria-label="Skip tutorial"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Title */}
            <h4 className="notititle font-semibold tracking-tight flex items-center gap-1.5">
              {step.title}
              <img src={getTutorialFavicon(step.name)} className="w-4.5 h-4.5 object-contain inline-block shrink-0" alt="" />
            </h4>

            {/* Body Description */}
            <div className="notibody">
              <p className="text-[11.5px] leading-relaxed">
                {description}
              </p>

              {/* Warn user if element is out of view */}
              {(!rect || !targetVisible) && (
                <div className="text-[9.5px] text-amber-500 mt-2 flex items-center gap-1 select-none font-medium">
                  <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                  Loading target element...
                </div>
              )}
            </div>

            {/* Footer Controls */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3.5 mt-2 border-t border-white/[0.06]">
              {/* Step Indicators */}
              <div className="flex items-center gap-1.5">
                {Array.from({ length: TUTORIAL_STEPS.length - 2 }).map((_, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "w-1.2 h-1.2 rounded-full transition-colors duration-200",
                      currentStep === i + 1 ? "bg-[#32a6ff]" : "bg-neutral-700"
                    )}
                  />
                ))}
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-1.5">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="h-6.5 text-[10.5px] px-2.5 text-neutral-400 hover:text-neutral-200 hover:bg-white/5 rounded-full font-medium transition-colors cursor-pointer"
                    aria-label="Previous step"
                  >
                    Back
                  </button>
                )}
                
                {step.interactiveAction ? (
                  <span className="text-[10px] text-[#32a6ff] font-semibold bg-[#32a6ff]/10 px-2 py-0.5 rounded-full border border-[#32a6ff]/20 animate-pulse">
                    Perform Action
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="h-6.5 text-[10.5px] px-3.5 bg-[#32a6ff] hover:bg-[#4cb5ff] text-white rounded-full font-semibold transition-colors shrink-0 cursor-pointer shadow-none"
                    aria-label="Next step"
                  >
                    {currentStep === TUTORIAL_STEPS.length - 2 ? 'Finish' : 'Next'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

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
    </div>
  );
}
