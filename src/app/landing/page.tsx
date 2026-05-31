'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, Lock, Zap, Search, ChevronRight, Play, 
  Check, ArrowRight, BarChart3, Shield, FileText,
  Menu, X, Cpu, Layers, Eye, ArrowUpRight, MessageSquare,
  Calendar, Mail, CheckSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/lib/store';
import { toast } from 'sonner';
import { startRazorpayCheckout } from '@/lib/billing/client';
import { planIdFromLabel } from '@/lib/billing/plans';
import { Skeleton } from '@/components/ui/skeleton';

const NAV_SECTION_IDS: Record<string, string> = {
  philosophy: 'philosophy',
  features: 'features',
  playground: 'playground',
  specs: 'specs',
  pricing: 'pricing',
  docs: 'specs',
  hero: 'hero',
};

export default function LandingPage() {
  const router = useRouter();
  useWorkspace();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [emailInput, setEmailInput] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  
  // Smooth mouse tracking
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [smoothMousePos, setSmoothMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Smooth interpolation for cursor effect
  useEffect(() => {
    const animate = () => {
      setSmoothMousePos(prev => ({
        x: prev.x + (mousePos.x - prev.x) * 0.1,
        y: prev.y + (mousePos.y - prev.y) * 0.1
      }));
      requestAnimationFrame(animate);
    };
    const frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [mousePos]);

  const [chatPrompt, setChatPrompt] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ 
    role: 'user' | 'assistant'; 
    content: string; 
    sources?: string[];
    timestamp?: string;
  }>>([
    { 
      role: 'assistant', 
      content: "Welcome to Nexus AI. I have access to your entire workspace. Ask me anything about your documents, tasks, or calendar.",
      timestamp: new Date().toISOString()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    const scrollToHero = () => {
      const hero = document.getElementById('hero');
      if (hero) {
        hero.scrollIntoView({ behavior: 'instant', block: 'start' });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    };
    scrollToHero();
    requestAnimationFrame(scrollToHero);
  }, []);

  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get('section');
    if (section && NAV_SECTION_IDS[section]) {
      requestAnimationFrame(() => scrollToSection(section));
    }
  }, []);

  const presetPrompts = [
    {
      label: "Search contracts",
      icon: Search,
      prompt: "What are my upcoming deadlines with Acme Corp?",
      response: "Based on **Acme_Contract_2024.pdf** and **SOW_Phase2.pdf**:\n\n**Upcoming Deadlines:**\n• June 15, 2024 - Design deliverables\n• July 1, 2024 - Integration review\n• August 30, 2024 - Final handover\n\nWould you like me to add these to your calendar?",
      sources: ["Acme_Contract_2024.pdf", "SOW_Phase2.pdf"]
    },
    {
      label: "Budget summary",
      icon: BarChart3,
      prompt: "Summarize Q4 budget decisions",
      response: "**Q4 Budget Summary:**\n\nTotal Allocation: **$120,000**\n\n**Distribution:**\n• Growth & API: $45,000 (37.5%)\n• Infrastructure: $50,000 (41.7%)\n• Operations: $25,000 (20.8%)\n\n**Key Decision:** DevOps hire deferred to next quarter.",
      sources: ["Q4_Planning.docx", "Finance_Report.pdf"]
    },
    {
      label: "Draft email",
      icon: Mail,
      prompt: "Draft follow-up email to Marcus",
      response: "**Subject:** Following up: Proposal Review\n\nHi Marcus,\n\nHope you're well. Wanted to check in on the proposal we sent last Tuesday. Our team is planning Q4 allocations and finalizing the SOW would help us secure your timeline.\n\nLet me know if you have questions.\n\nBest,\nSarah",
      sources: ["Proposal_v2.pdf"]
    }
  ];

  const handleSendPrompt = async (text: string) => {
    if (!text.trim() || isTyping) return;
    
    setChatMessages(prev => [...prev, { 
      role: 'user', 
      content: text,
      timestamp: new Date().toISOString()
    }]);
    setChatPrompt('');
    setIsTyping(true);

    await new Promise(resolve => setTimeout(resolve, 1200));

    const lower = text.toLowerCase();
    const matched = presetPrompts.find(
      (p) =>
        lower.includes(p.label.toLowerCase()) ||
        lower.includes(p.prompt.toLowerCase().slice(0, 12)) ||
        p.prompt.toLowerCase().split(' ').some((w) => w.length > 4 && lower.includes(w))
    );
    
    if (matched) {
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: matched.response, 
        sources: matched.sources,
        timestamp: new Date().toISOString()
      }]);
    } else {
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Analyzing: "${text}"\n\nIn production, I would search across all your indexed documents using semantic vector similarity and provide cited responses.\n\nClick "Enter Workspace" to connect your files.`,
        sources: ["Demo_Mode"],
        timestamp: new Date().toISOString()
      }]);
    }
    setIsTyping(false);
  };

  const scrollToSection = (key: string) => {
    setMobileMenuOpen(false);
    const id = NAV_SECTION_IDS[key.toLowerCase()] ?? key.toLowerCase();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const goToApp = (query?: string) => {
    router.push(query ? `/?${query}` : '/');
  };

  const handleGetStarted = () => {
    scrollToSection('pricing');
    toast.info('Choose a plan to get started');
  };

  const handleWatchDemo = () => {
    scrollToSection('playground');
    toast.info('Try the live AI demo below');
  };

  const handleSignIn = () => {
    toast.info('Opening sign in…');
    goToApp('auth=signin');
  };

  const handleEnterWorkspace = () => {
    toast.success('Opening workspace…');
    goToApp();
  };

  const handleLogoClick = () => {
    scrollToSection('hero');
  };

  const handlePlanSelect = async (planName: string) => {
    if (planName === 'Enterprise') {
      window.location.href =
        'mailto:sales@nexus.ai?subject=Nexus%20AI%20Enterprise%20Plan&body=Hi%2C%20I%27d%20like%20to%20learn%20more%20about%20the%20Enterprise%20plan.';
      toast.success('Opening email to contact sales');
      return;
    }

    const planId = planIdFromLabel(planName);
    if (!planId) {
      toast.error('Unknown plan');
      return;
    }

    const seatCount = planId === 'starter' ? 1 : planId === 'team_pro' ? 5 : 10;
    setCheckoutLoading(planName);

    try {
      await startRazorpayCheckout({
        planId,
        cycle: billingPeriod,
        seatCount,
      });
      toast.success(`Welcome to ${planName}!`);
      goToApp(`plan=${planId}&billing=success`);
    } catch {
      toast.info('Razorpay not configured — opening workspace with selected plan');
      goToApp(`plan=${planId}&billing=${billingPeriod}`);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleEmailSignup = () => {
    const email = emailInput.trim();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    toast.success(`Welcome! Opening workspace for ${email}`);
    setEmailInput('');
    goToApp(`email=${encodeURIComponent(email)}&auth=signup`);
  };

  const handleHeroNavClick = (target: 'playground' | 'features' | 'pricing') => {
    scrollToSection(target);
  };

  const pricingPlans = [
    {
      name: "Starter",
      description: "Perfect for individuals managing personal projects and workflows.",
      priceMonthly: 12,
      priceYearly: 10,
      features: [
        "1 workspace seat",
        "50 document uploads",
        "AI chat with Gemini 2.5",
        "Kanban & calendar boards",
        "100 AI emails per month",
        "TLS encryption"
      ],
      cta: "Start free",
      popular: false
    },
    {
      name: "Team Pro",
      description: "Built for growing teams requiring collaboration and semantic search.",
      priceMonthly: 24,
      priceYearly: 19,
      features: [
        "15 workspace seats",
        "Unlimited documents",
        "Multi-doc semantic search",
        "Real-time team chat",
        "Vector embeddings",
        "CRM pipeline & audit logs",
        "Shared whiteboards",
        "Unlimited AI emails"
      ],
      cta: "Try 14 days free",
      popular: true
    },
    {
      name: "Enterprise",
      description: "Security-first solution for organizations requiring compliance and control.",
      priceMonthly: 59,
      priceYearly: 49,
      features: [
        "Unlimited seats",
        "Custom LLM integration",
        "End-to-end encryption",
        "Admin audit logs",
        "Dedicated support",
        "99.9% uptime SLA",
        "SSO & SAML"
      ],
      cta: "Contact sales",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden antialiased">
      
      {/* Refined background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Smooth gradient orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-500/[0.03] rounded-full blur-3xl" 
             style={{ animation: 'float 20s ease-in-out infinite' }} />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/[0.02] rounded-full blur-3xl" 
             style={{ animation: 'float 25s ease-in-out infinite reverse' }} />
        
        {/* Cursor spotlight - more subtle */}
        <div 
          className="absolute w-96 h-96 bg-white/[0.02] rounded-full blur-3xl transition-all duration-300 ease-out"
          style={{
            left: smoothMousePos.x - 192,
            top: smoothMousePos.y - 192,
          }}
        />

        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -30px) scale(1.1); }
        }
      `}</style>

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 cursor-pointer"
              onClick={handleLogoClick}
            >
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                <Layers className="w-5 h-5 text-black" />
              </div>
              <span className="font-semibold tracking-tight">Nexus AI</span>
            </motion.div>

            <nav className="hidden md:flex items-center gap-8">
              {['Philosophy', 'Features', 'Playground', 'Specs', 'Pricing'].map((item) => (
                <button 
                  key={item}
                  onClick={() => scrollToSection(item.toLowerCase())}
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  {item}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={handleSignIn}
              className="text-sm text-zinc-400 hover:text-white transition-colors hidden sm:block"
            >
              Sign in
            </button>
            <Button 
              onClick={handleEnterWorkspace}
              className="bg-white hover:bg-zinc-200 text-black font-medium px-6 h-10 rounded-full transition-all hover:scale-105"
            >
              Enter workspace
            </Button>
            
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-zinc-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-white/5 bg-black/95 backdrop-blur-xl"
            >
              <div className="px-6 py-6 space-y-4">
                {['Philosophy', 'Features', 'Playground', 'Specs', 'Pricing'].map((item) => (
                  <button 
                    key={item}
                    onClick={() => scrollToSection(item.toLowerCase())}
                    className="block w-full text-left text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    {item}
                  </button>
                ))}
                <button
                  onClick={handleSignIn}
                  className="block w-full text-left text-sm text-zinc-400 hover:text-white transition-colors pt-4 border-t border-white/5"
                >
                  Sign in
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section id="hero" className="relative pt-32 pb-20 px-6 scroll-mt-16">
        <div className="max-w-5xl mx-auto text-center">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-zinc-400 tracking-wide">Unified Intelligence Platform</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight mb-6"
          >
            Work at the
            <br />
            <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
              speed of thought
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            One workspace for documents, tasks, calendar, chat, and email. Powered by AI that understands everything.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
          >
            <Button 
              onClick={handleGetStarted}
              className="bg-white hover:bg-zinc-200 text-black font-medium px-8 h-12 rounded-full text-base group transition-all hover:scale-105"
            >
              Get started free
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              onClick={handleWatchDemo}
              variant="ghost"
              className="text-white hover:text-zinc-300 font-medium px-8 h-12 rounded-full text-base group transition-all hover:scale-105"
            >
              <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              Watch demo
            </Button>
          </motion.div>

          {/* Hero Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative max-w-6xl mx-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 pointer-events-none" />
            
            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-2 shadow-2xl shadow-black/50 overflow-hidden">
              {/* Browser chrome */}
              <div className="h-10 bg-zinc-900 rounded-t-xl px-4 flex items-center gap-2 border-b border-white/5">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                  <div className="w-3 h-3 rounded-full bg-zinc-700" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-xs text-zinc-600 font-mono">app.nexus-ai.com</div>
                </div>
              </div>

              {/* Dashboard preview */}
              <div className="aspect-[16/10] bg-black relative overflow-hidden">
                {/* Sidebar */}
                <div className="absolute left-0 top-0 bottom-0 w-64 border-r border-white/5 bg-zinc-950/50 backdrop-blur-sm p-6">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                      <Layers className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-sm">Workspace</span>
                  </div>

                  <div className="space-y-1">
                    {[
                      { icon: BarChart3, label: 'Dashboard', active: true },
                      { icon: FileText, label: 'Documents' },
                      { icon: MessageSquare, label: 'AI Chat' },
                      { icon: CheckSquare, label: 'Tasks' },
                      { icon: Calendar, label: 'Calendar' },
                      { icon: Mail, label: 'Emails' },
                    ].map((item, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => handleHeroNavClick(item.label === 'AI Chat' ? 'playground' : 'features')}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left cursor-pointer ${
                          item.active 
                            ? 'bg-white/10 text-white' 
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main content */}
                <div className="absolute left-64 right-0 top-0 bottom-0 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Good morning, Sarah</h3>
                      <p className="text-xs text-zinc-500">You have 3 tasks due today</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-400">
                        ⌘K
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-white text-black hover:bg-zinc-200"
                        onClick={() => handleHeroNavClick('playground')}
                      >
                        Ask AI
                      </Button>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                      { label: 'Documents', value: '12', change: '+3 this week' },
                      { label: 'Tasks', value: '8', change: '3 due today' },
                      { label: 'Meetings', value: '5', change: 'Next in 2h' },
                      { label: 'Emails', value: '24', change: '4 unread' },
                    ].map((stat, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-xs text-zinc-500 mb-2">{stat.label}</div>
                        <div className="text-2xl font-bold mb-1">{stat.value}</div>
                        <div className="text-xs text-zinc-600">{stat.change}</div>
                      </div>
                    ))}
                  </div>

                  {/* Task list preview */}
                  <div className="space-y-3">
                    {[
                      { title: 'Review Q4 contract with Acme Corp', priority: 'High' },
                      { title: 'Prepare budget presentation slides', priority: 'Medium' },
                      { title: 'Follow up with Marcus on proposal', priority: 'Low' },
                    ].map((task, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="w-4 h-4 rounded border-2 border-zinc-600" />
                        <span className="flex-1 text-sm">{task.title}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          task.priority === 'High' ? 'bg-red-500/20 text-red-400' :
                          task.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section id="philosophy" className="py-32 px-6 border-t border-white/5 scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4">
              <span className="text-xs font-medium text-zinc-400">The difference</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Stop switching.<br />Start flowing.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Old way */}
            <div className="p-8 rounded-2xl bg-zinc-950/50 border border-white/5">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                <X className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold mb-4">The fragmented way</h3>
              <p className="text-zinc-400 mb-6 leading-relaxed">
                Chat in Slack. Files in Drive. Tasks in Asana. Calendar in Google. Emails everywhere. Context lost. Time wasted.
              </p>
              <div className="flex items-center gap-2 text-sm text-red-500">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>Constant context switching</span>
              </div>
            </div>

            {/* New way */}
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
                  <Check className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="text-xl font-semibold mb-4">The Nexus way</h3>
                <p className="text-zinc-300 mb-6 leading-relaxed">
                  Everything in one place. AI understands it all. Documents connect to tasks. Tasks sync with calendar. Zero friction.
                </p>
                <div className="flex items-center gap-2 text-sm text-emerald-500">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Unified intelligence</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="py-32 px-6 border-t border-white/5 scroll-mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4">
              <span className="text-xs font-medium text-zinc-400">Features</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-4">Built for speed</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Every detail engineered for seamless workflow
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 - Semantic Search (2 cols) */}
            <div className="md:col-span-2 p-8 rounded-2xl bg-zinc-950/50 border border-white/5 hover:border-white/10 transition-all group">
              <div className="flex items-start gap-8">
                <div className="flex-1">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Database className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">Semantic search</h3>
                  <p className="text-zinc-400 leading-relaxed mb-4">
                    Ask questions in plain English. Get instant answers with exact citations from all your documents.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Vector embeddings', '1536 dimensions', 'Instant results'].map((tag) => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Visual representation */}
                <div className="hidden lg:block w-64 h-64 rounded-xl bg-black border border-white/5 p-6 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <svg viewBox="0 0 200 200" className="w-full h-full">
                      <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                      <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                      <circle cx="100" cy="100" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                      
                      {/* Dots */}
                      <circle cx="70" cy="70" r="4" fill="#818cf8" className="animate-pulse" />
                      <circle cx="130" cy="70" r="4" fill="#34d399" />
                      <circle cx="100" cy="130" r="4" fill="#fbbf24" />
                      <circle cx="100" cy="100" r="3" fill="#fff" />
                      
                      {/* Lines */}
                      <line x1="100" y1="100" x2="70" y2="70" stroke="rgba(129,140,248,0.3)" strokeWidth="1" />
                      <line x1="100" y1="100" x2="130" y2="70" stroke="rgba(52,211,153,0.3)" strokeWidth="1" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2 - Security */}
            <div className="p-8 rounded-2xl bg-zinc-950/50 border border-white/5 hover:border-white/10 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Enterprise security</h3>
              <p className="text-zinc-400 leading-relaxed mb-6">
                AES-256 encryption, SSO, audit logs. Your data stays yours.
              </p>
              <div className="h-32 rounded-xl bg-black border border-white/5 flex items-center justify-center">
                <Shield className="w-12 h-12 text-emerald-500/20" />
              </div>
            </div>

            {/* Feature 3 - Real-time */}
            <div className="p-8 rounded-2xl bg-zinc-950/50 border border-white/5 hover:border-white/10 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Real-time sync</h3>
              <p className="text-zinc-400 leading-relaxed">
                See changes instantly. Collaborate seamlessly across your team.
              </p>
            </div>

            {/* Feature 4 - AI Insights (2 cols) */}
            <div className="md:col-span-2 p-8 rounded-2xl bg-zinc-950/50 border border-white/5 hover:border-white/10 transition-all group">
              <div className="flex items-start gap-8">
                {/* CRM visual */}
                <div className="hidden lg:block w-80 rounded-xl bg-black border border-white/5 p-6">
                  <div className="text-xs text-zinc-500 mb-4">Pipeline overview</div>
                  <div className="space-y-3">
                    {[
                      { name: 'Acme Corp', stage: 'Negotiation', value: '$120K', color: 'bg-blue-500' },
                      { name: 'Wayne Enterprises', stage: 'Proposal', value: '$85K', color: 'bg-purple-500' },
                      { name: 'Stark Industries', stage: 'Closed', value: '$200K', color: 'bg-emerald-500' },
                    ].map((deal, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-zinc-950/50 border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{deal.name}</span>
                          <span className="text-xs text-zinc-500">{deal.value}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${deal.color}`} />
                          <span className="text-xs text-zinc-500">{deal.stage}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">CRM & analytics</h3>
                  <p className="text-zinc-400 leading-relaxed">
                    Track deals, monitor pipelines, and get AI-powered insights on your business.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Playground */}
      <section id="playground" className="py-32 px-6 border-t border-white/5 scroll-mt-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4">
              <span className="text-xs font-medium text-zinc-400">Try it live</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-4">See it in action</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Experience AI-powered document search
            </p>
          </div>

          {/* Chat simulator */}
          <div className="rounded-2xl border border-white/10 bg-zinc-950 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="h-14 border-b border-white/5 px-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium">AI Chat</span>
              </div>
              <div className="text-xs text-zinc-600 font-mono">
                {chatMessages.length} messages
              </div>
            </div>

            {/* Messages */}
            <div className="h-96 overflow-y-auto p-6 space-y-6 bg-black/40">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' ? 'bg-white text-black' : 'bg-zinc-800 text-white'
                  }`}>
                    {msg.role === 'user' ? 'Y' : 'AI'}
                  </div>
                  <div className="flex-1 max-w-md">
                    <div className={`rounded-2xl px-4 py-3 ${
                      msg.role === 'user' 
                        ? 'bg-white text-black rounded-tr-none' 
                        : 'bg-zinc-900 text-white rounded-tl-none'
                    }`}>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {msg.sources.map((src, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-white/5 text-xs text-zinc-400">
                            <FileText className="w-3 h-3" />
                            {src}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex gap-4">
                  <Skeleton className="w-8 h-8 rounded-full shrink-0 bg-zinc-800" />
                  <div className="bg-zinc-900 rounded-2xl rounded-tl-none px-4 py-3 space-y-2 min-w-[200px]">
                    <Skeleton className="h-3 w-full bg-zinc-700" />
                    <Skeleton className="h-3 w-4/5 bg-zinc-700" />
                    <Skeleton className="h-3 w-2/3 bg-zinc-700" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick actions */}
            <div className="border-t border-white/5 p-4 bg-black/40">
              <div className="flex flex-wrap gap-2 mb-4">
                {presetPrompts.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendPrompt(preset.prompt)}
                    disabled={isTyping}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/5 hover:border-white/10 transition-all text-sm disabled:opacity-50"
                  >
                    <preset.icon className="w-4 h-4" />
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt(chatPrompt)}
                  placeholder="Ask anything about your documents..."
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/20 transition-colors"
                />
                <Button
                  onClick={() => handleSendPrompt(chatPrompt)}
                  disabled={!chatPrompt.trim() || isTyping}
                  className="bg-white text-black hover:bg-zinc-200 px-6 rounded-xl transition-all hover:scale-105"
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Specs Section */}
      <section id="specs" className="py-32 px-6 border-t border-white/5 scroll-mt-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4">
              <span className="text-xs font-medium text-zinc-400">Technical details</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-4">Enterprise grade</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Built on cutting-edge technology stack
            </p>
          </div>

          <div className="space-y-12">
            {[
              {
                category: "AI & Search",
                specs: [
                  { label: "LLM Engine", value: "Google Gemini 2.5 Flash (1M+ token context)" },
                  { label: "Embeddings", value: "OpenAI text-embedding-3-small (1536D)" },
                  { label: "Vector Search", value: "Cosine similarity with pgvector" },
                  { label: "Context Window", value: "Multi-document semantic retrieval" }
                ]
              },
              {
                category: "Security",
                specs: [
                  { label: "Encryption", value: "AES-256-GCM end-to-end" },
                  { label: "Authentication", value: "Row-level security (RLS) with Supabase" },
                  { label: "Compliance", value: "SOC 2 Type II, GDPR ready" },
                  { label: "Audit Logs", value: "Complete activity tracking" }
                ]
              },
              {
                category: "Platform",
                specs: [
                  { label: "Backend", value: "Next.js 14 with App Router" },
                  { label: "Database", value: "PostgreSQL with Supabase" },
                  { label: "Real-time", value: "WebSocket subscriptions" },
                  { label: "Hosting", value: "Edge network deployment" }
                ]
              }
            ].map((group, idx) => (
              <div key={idx} className="border-b border-white/5 pb-8 last:border-0">
                <h3 className="text-lg font-semibold mb-6">{group.category}</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {group.specs.map((spec, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <span className="text-sm text-zinc-500">{spec.label}</span>
                      <span className="text-sm text-zinc-300">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 px-6 border-t border-white/5 scroll-mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4">
              <span className="text-xs font-medium text-zinc-400">Pricing</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-4">Choose your plan</h2>
            
            {/* Billing toggle */}
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-zinc-900 border border-white/5 mt-8">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  billingPeriod === 'monthly' ? 'bg-white text-black' : 'text-zinc-400'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  billingPeriod === 'yearly' ? 'bg-white text-black' : 'text-zinc-400'
                }`}
              >
                Yearly
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, idx) => (
              <div 
                key={idx}
                className={`rounded-2xl p-8 flex flex-col transition-all ${
                  plan.popular 
                    ? 'bg-white/5 border-2 border-white shadow-2xl shadow-white/10 scale-105' 
                    : 'bg-zinc-950/50 border border-white/5 hover:border-white/10'
                }`}
              >
                <div className="mb-8">
                  {plan.popular && (
                    <div className="inline-block px-3 py-1 rounded-full bg-white text-black text-xs font-medium mb-4">
                      Most popular
                    </div>
                  )}
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-sm text-zinc-400 mb-6">{plan.description}</p>
                  
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-5xl font-bold">
                      ${billingPeriod === 'yearly' ? plan.priceYearly : plan.priceMonthly}
                    </span>
                    <span className="text-zinc-500">/month</span>
                  </div>

                  <Button 
                    onClick={() => void handlePlanSelect(plan.name)}
                    disabled={checkoutLoading === plan.name}
                    className={`w-full py-6 rounded-xl font-medium transition-all hover:scale-105 ${
                      plan.popular 
                        ? 'bg-white text-black hover:bg-zinc-200' 
                        : 'bg-zinc-900 text-white hover:bg-zinc-800 border border-white/10'
                    }`}
                  >
                    {checkoutLoading === plan.name ? 'Processing…' : plan.cta}
                  </Button>
                </div>

                <div className="space-y-4 flex-1">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                      <span className="text-sm text-zinc-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="rounded-3xl border border-white/10 bg-zinc-950/50 p-12 md:p-20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            
            <div className="relative">
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                Ready to work smarter?
              </h2>
              <p className="text-lg text-zinc-400 mb-8 max-w-2xl mx-auto">
                Join teams building faster with unified intelligence
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEmailSignup()}
                  placeholder="Enter your email"
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-white/20 transition-colors"
                />
                <Button
                  onClick={handleEmailSignup}
                  className="bg-white text-black hover:bg-zinc-200 px-8 py-4 rounded-xl font-medium whitespace-nowrap transition-all hover:scale-105"
                >
                  Get started
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <Layers className="w-4 h-4" />
            <span>© 2024 Nexus AI. All rights reserved.</span>
          </div>
          
          <div className="flex items-center gap-8 text-sm">
            {['Philosophy', 'Features', 'Pricing', 'Docs'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => scrollToSection(item.toLowerCase())}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                {item}
              </button>
            ))}
            <button
              type="button"
              onClick={handleEnterWorkspace}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Workspace
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}