'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useTutorial } from '@/lib/tutorial-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Award, Check, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface ConfettiParticle {
  id: number;
  left: string;
  delay: string;
  duration: string;
  size: string;
  color: string;
  shape: 'circle' | 'square' | 'triangle';
}

export function TutorialCelebration() {
  const { showCelebration, skipTutorial, abVariant } = useTutorial();
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);
  const exploreButtonRef = useRef<HTMLButtonElement>(null);

  // Generate confetti particles on mount / open
  useEffect(() => {
    if (showCelebration) {
      const colors = ['#f43f5e', '#3b82f6', '#10b981', '#eab308', '#a855f7', '#f97316', '#ff4d4d', '#ff00aa'];
      const shapes: ('circle' | 'square' | 'triangle')[] = ['circle', 'square', 'triangle'];
      
      const newParticles = Array.from({ length: 80 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 2}s`,
        duration: `${2.5 + Math.random() * 2}s`,
        size: `${6 + Math.random() * 10}px`,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)]
      }));
      setParticles(newParticles);

      setTimeout(() => {
        exploreButtonRef.current?.focus();
      }, 100);
    } else {
      setParticles([]);
    }
  }, [showCelebration]);

  if (!showCelebration) return null;

  return (
    <Dialog open={showCelebration} onOpenChange={(open) => !open && skipTutorial()}>
      <DialogContent className="sm:max-w-md bg-white/80 dark:bg-neutral-900/90 backdrop-blur-xl border border-neutral-200/50 dark:border-neutral-800/60 shadow-2xl rounded-3xl p-6 relative overflow-hidden select-none">
        
        {/* CSS Keyframes for Confetti Fall */}
        <style jsx global>{`
          @keyframes confetti-fall {
            0% {
              transform: translateY(-20px) rotate(0deg);
              opacity: 1;
            }
            85% {
              opacity: 1;
            }
            100% {
              transform: translateY(85vh) rotate(720deg);
              opacity: 0;
            }
          }
          .confetti-particle {
            position: absolute;
            top: -20px;
            animation-name: confetti-fall;
            animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
            animation-fill-mode: forwards;
            pointer-events: none;
            z-index: 99;
          }
        `}</style>

        {/* Confetti Particles Container */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <div
              key={p.id}
              className="confetti-particle"
              style={{
                left: p.left,
                animationDelay: p.delay,
                animationDuration: p.duration,
                width: p.size,
                height: p.size,
                backgroundColor: p.shape !== 'triangle' ? p.color : 'transparent',
                borderRadius: p.shape === 'circle' ? '50%' : '0',
                borderLeft: p.shape === 'triangle' ? `${parseFloat(p.size) / 2}px solid transparent` : undefined,
                borderRight: p.shape === 'triangle' ? `${parseFloat(p.size) / 2}px solid transparent` : undefined,
                borderBottom: p.shape === 'triangle' ? `${p.size}px solid ${p.color}` : undefined,
              }}
            />
          ))}
        </div>

        {/* Subtle decorative glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#0071e3]/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-neutral-500/5 rounded-full blur-2xl pointer-events-none" />

        {/* Content Container */}
        <div className="flex flex-col items-center text-center gap-5 py-2 relative z-10">
          
          {/* Trophy Icon with spring animations */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-14 h-14 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0"
          >
            <Award className="w-6 h-6" />
          </motion.div>

          <DialogHeader className="gap-2">
            <DialogTitle className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 leading-tight">
              You're All Set!
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto leading-relaxed">
              {abVariant === 'A' ? (
                <span>
                  Congratulations! You've successfully finished the tour of Nexus AI. You are now equipped with the knowledge to supercharge your workspace productivity.
                </span>
              ) : (
                <span>
                  Boom! Onboarding complete. You've explored the core capabilities and successfully tested your AI workspace tools.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Checklist Summary */}
          <div className="w-full border border-neutral-100 dark:border-neutral-800 rounded-2xl p-4 text-left flex flex-col gap-2.5 text-[11px] bg-neutral-50/50 dark:bg-neutral-950/20">
            <span className="font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider text-[9px]">ONBOARDING ACCOMPLISHED</span>
            <div className="flex flex-col gap-2 text-neutral-700 dark:text-neutral-300 font-medium">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Check className="w-2.5 h-2.5 font-bold" />
                </div>
                <span>Sidebar Navigation Mastered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Check className="w-2.5 h-2.5 font-bold" />
                </div>
                <span>Analyzed AI Suggestion Boards</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Check className="w-2.5 h-2.5 font-bold" />
                </div>
                <span>Triggered Live Focus Time Clock</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Check className="w-2.5 h-2.5 font-bold" />
                </div>
                <span>Unlocked AI Chat, Task boards & Documents</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-neutral-400 dark:text-neutral-500">
            Need to review anything? You can restart this tour at any time via the Help Center.
          </div>
        </div>

        <DialogFooter className="mt-4 w-full">
          <button
            ref={exploreButtonRef}
            type="button"
            onClick={skipTutorial}
            className="w-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium h-9 rounded-full text-xs shadow-none transition-colors cursor-pointer"
            aria-label="Finish tutorial and explore application"
          >
            Explore Nexus AI
          </button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
