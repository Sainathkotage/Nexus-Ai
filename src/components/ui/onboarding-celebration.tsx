'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useTutorial } from '@/lib/tutorial-context';
import { useWorkspace } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Award, Check, Sparkles, Trophy, ArrowRight } from 'lucide-react';
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

export function OnboardingCelebration() {
  const { skipTutorial, userPersona } = useTutorial();
  const { user } = useWorkspace();
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#eab308', '#a855f7', '#f97316', '#ff4d4d', '#ff00aa'];
    const shapes: ('circle' | 'square' | 'triangle')[] = ['circle', 'square', 'triangle'];
    
    const newParticles = Array.from({ length: 100 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 1.5}s`,
      duration: `${2.5 + Math.random() * 2}s`,
      size: `${6 + Math.random() * 8}px`,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)]
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] py-8 text-center max-w-xl mx-auto relative z-10 px-4 select-none">
      
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
            transform: translateY(80vh) rotate(720deg);
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
      <div className="absolute inset-0 pointer-events-none overflow-hidden h-full w-full">
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

      {/* Decorative Glows */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Content Container */}
      <div className="flex flex-col items-center text-center gap-6 relative z-10 w-full">
        
        {/* Trophy Icon with spring animations */}
        <motion.div
          initial={{ scale: 0.5, rotate: -15, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ 
            type: 'spring',
            stiffness: 260,
            damping: 15,
            delay: 0.1
          }}
          className="w-20 h-20 rounded-2xl bg-indigo-600/10 dark:bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-lg"
        >
          <Trophy className="w-10 h-10 animate-bounce" style={{ animationDuration: '3s' }} />
        </motion.div>

        <div className="flex flex-col gap-2">
          <motion.h2 
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight font-serif"
          >
            You're All Set, {user?.name || 'Chief'}!
          </motion.h2>
          
          <motion.p 
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed"
          >
            Your AI Chief of Staff workspace has been optimized for your role as <span className="font-bold text-indigo-600 dark:text-indigo-400">{userPersona.role || 'Workspace Member'}</span>.
          </motion.p>
        </div>

        {/* Gamified summary box */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 text-left flex flex-col gap-3 text-xs bg-slate-50/50 dark:bg-slate-900/10 shadow-sm"
        >
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px]">ONBOARDING XP REWARDS</span>
            <span className="bg-indigo-600/10 text-indigo-700 dark:text-indigo-400 font-bold px-2 py-0.5 rounded text-[10px] font-mono">1,000 XP Earned</span>
          </div>

          <div className="flex flex-col gap-2.5 text-slate-600 dark:text-slate-400 font-semibold">
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-green-500 shrink-0" />
              <span>Created first dashboard task (+150 XP)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-green-500 shrink-0" />
              <span>Tested AI context chat prompts (+200 XP)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-green-500 shrink-0" />
              <span>Summarized files and parsed notes (+250 XP)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-green-500 shrink-0" />
              <span>Provisioned teammate invitation link (+150 XP)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-green-500 shrink-0" />
              <span>Saved automatic triage workflows (+250 XP)</span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full mt-4"
        >
          <Button
            onClick={skipTutorial}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg border-0 cursor-pointer flex items-center justify-center gap-2 group"
          >
            <span>Enter Your Workspace</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-[10px] text-slate-400 dark:text-slate-500"
        >
          Need to review this tour? Access guide missions anytime from the Help Center bubble.
        </motion.div>
      </div>

    </div>
  );
}
