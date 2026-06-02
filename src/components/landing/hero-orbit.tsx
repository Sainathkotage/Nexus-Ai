'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  Calendar,
  Mail,
  MessageSquare,
  CheckSquare,
  Bell,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

// --- Types & Data ---

type OrbitItem =
  | { kind: 'avatar'; initials: string; color: string; glow: string }
  | { kind: 'icon'; Icon: LucideIcon; glow: string };

const RING_ONE: OrbitItem[] = [
  { kind: 'avatar', initials: 'SC', color: 'from-violet-400 to-purple-600', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.6)]' },
  { kind: 'icon', Icon: FileText, glow: 'shadow-[0_0_15px_rgba(251,191,36,0.5)]' },
  { kind: 'avatar', initials: 'MJ', color: 'from-amber-300 to-orange-500', glow: 'shadow-[0_0_20px_rgba(251,191,36,0.6)]' },
  { kind: 'icon', Icon: Calendar, glow: 'shadow-[0_0_15px_rgba(96,165,250,0.5)]' },
];

const RING_TWO: OrbitItem[] = [
  { kind: 'icon', Icon: Mail, glow: 'shadow-[0_0_15px_rgba(236,72,153,0.5)]' },
  { kind: 'avatar', initials: 'ER', color: 'from-pink-400 to-rose-600', glow: 'shadow-[0_0_20px_rgba(236,72,153,0.6)]' },
  { kind: 'icon', Icon: MessageSquare, glow: 'shadow-[0_0_15px_rgba(129,140,248,0.5)]' },
  { kind: 'avatar', initials: 'AK', color: 'from-cyan-400 to-blue-600', glow: 'shadow-[0_0_20px_rgba(56,189,248,0.6)]' },
  { kind: 'icon', Icon: CheckSquare, glow: 'shadow-[0_0_15px_rgba(52,211,153,0.5)]' },
];

const RING_THREE: OrbitItem[] = [
  { kind: 'icon', Icon: Bell, glow: 'shadow-[0_0_15px_rgba(251,191,36,0.4)]' },
  { kind: 'avatar', initials: 'NP', color: 'from-indigo-400 to-violet-600', glow: 'shadow-[0_0_20px_rgba(129,140,248,0.6)]' },
  { kind: 'icon', Icon: Sparkles, glow: 'shadow-[0_0_20px_rgba(168,85,247,0.6)]' },
];

// --- CSS Animations (Injected to avoid tailwind config edits) ---
const orbitStyles = `
  @keyframes orbit-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes orbit-counter-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(-360deg); }
  }
  @keyframes pulse-core {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.05); }
  }
  .orbit-ring {
    animation: orbit-spin var(--duration) linear infinite;
    animation-direction: var(--direction);
  }
  .orbit-item-wrapper {
    animation: orbit-counter-spin var(--duration) linear infinite;
    animation-direction: var(--direction);
  }
  /* Pause on hover */
  .orbit-container:hover .orbit-ring,
  .orbit-container:hover .orbit-item-wrapper {
    animation-play-state: paused;
  }
  /* Allow individual rings to keep spinning if not hovered directly, 
     but pause if the specific ring is hovered */
  .orbit-ring:hover .orbit-item-wrapper {
    animation-play-state: paused;
  }
`;

// --- Components ---

function OrbitItemNode({ item }: { item: OrbitItem }) {
  const isAvatar = item.kind === 'avatar';

  return (
    <div className="group/item cursor-pointer">
      <div
        className={`
          transition-all duration-300 ease-out group-hover/item:scale-125
          ${isAvatar 
            ? `w-11 h-11 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center text-[11px] font-bold text-white ring-2 ring-white/20` 
            : 'w-10 h-10 rounded-xl bg-[#151025]/80 border border-white/10 flex items-center justify-center backdrop-blur-md'
          }
          ${item.glow} group-hover/item:shadow-[0_0_30px_rgba(168,85,247,0.8)]
        `}
      >
        {isAvatar ? (
          item.initials
        ) : (
          <item.Icon className="w-4 h-4 text-white/90" />
        )}
      </div>
    </div>
  );
}

function OrbitRing({
  radiusPercent,
  items,
  duration,
  reverse = false,
}: {
  radiusPercent: string;
  items: OrbitItem[];
  duration: number;
  reverse?: boolean;
}) {
  const step = 360 / items.length;
  const direction = reverse ? 'reverse' : 'normal';

  return (
    <div 
      className="absolute inset-0 orbit-ring group/ring"
      style={{ 
        // @ts-ignore - CSS variables
        '--duration': `${duration}s`, 
        '--direction': direction 
      }}
    >
      {/* Orbital Path */}
      <div 
        className="absolute inset-0 rounded-full border border-dashed border-white/[0.07] transition-colors duration-500 group-hover/ring:border-violet-500/30"
        style={{ 
          transform: `scale(${radiusPercent})`,
          boxShadow: 'inset 0 0 30px rgba(168, 85, 247, 0.03)' 
        }} 
      />

      {/* Items */}
      {items.map((item, i) => {
        const angle = i * step;
        return (
          <div
            key={i}
            className="absolute left-1/2 top-1/2"
            style={{
              transform: `rotate(${angle}deg) translateY(calc(-${radiusPercent} * 0.5))`,
            }}
          >
            <div 
              className="orbit-item-wrapper absolute -translate-x-1/2 -translate-y-1/2"
              style={{ 
                // @ts-ignore
                '--duration': `${duration}s`, 
                '--direction': direction,
                transform: `rotate(-${angle}deg)` 
              }}
            >
              <OrbitItemNode item={item} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HeroOrbit() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  return (
    <>
      <style>{orbitStyles}</style>
      
      <div 
        className="orbit-container relative w-full max-w-[520px] aspect-square mx-auto lg:mx-0 lg:ml-auto transition-transform duration-500 ease-out"
        style={{
          transform: isHovered 
            ? `perspective(1000px) rotateY(${mousePos.x * 10}deg) rotateX(${-mousePos.y * 10}deg)` 
            : 'perspective(1000px) rotateY(0deg) rotateX(0deg)',
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          
          {/* Orbits (Using percentages for perfect responsiveness) */}
          <OrbitRing radiusPercent="96%" items={RING_THREE} duration={90} reverse />
          <OrbitRing radiusPercent="70%" items={RING_TWO} duration={60} />
          <OrbitRing radiusPercent="44%" items={RING_ONE} duration={40} reverse />

          {/* Center Content */}
          <div className="relative z-10 text-center select-none pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: 'easeOut' }}
            >
              <p className="text-[10px] uppercase tracking-[0.4em] text-violet-300/90 mb-3 font-semibold">
                Unified
              </p>
              <p className="text-6xl sm:text-7xl font-black tracking-tighter leading-none bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent">
                6-in-1
              </p>
              <p className="text-lg sm:text-xl text-white/60 mt-3 font-light tracking-widest uppercase">
                Workspace
              </p>
            </motion.div>
          </div>

          {/* Pulsing Core Glow */}
          <div 
            className="absolute w-[40%] aspect-square rounded-full pointer-events-none"
            style={{ 
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%)',
              animation: 'pulse-core 4s ease-in-out infinite'
            }} 
          />
        </div>

        {/* Ambient Background Glows */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-violet-600/20 rounded-full blur-[60px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-cyan-600/10 rounded-full blur-[60px] pointer-events-none" />
      </div>
    </>
  );
}