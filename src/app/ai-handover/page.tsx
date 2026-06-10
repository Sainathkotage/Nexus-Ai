'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useWorkspace } from '@/lib/store';
import { Person } from '@/types';
import { 
  Briefcase, Sparkles, CheckSquare, Mail, Calendar, 
  ArrowRight, ShieldCheck, RefreshCw, FileText, 
  Users, AlertTriangle, Play, CheckCircle2, ChevronRight,
  Download, Clock, Check, HelpCircle, Send, Plus, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// SVG Relationship Graph Component
interface GraphNode {
  id: string;
  label: string;
  role: string;
  interactionLevel: 'high' | 'medium' | 'low';
}

interface GraphLink {
  source: string;
  target: string;
  label: string;
}

function RelationshipGraph({ nodes, links }: { nodes: GraphNode[]; links: GraphLink[] }) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Layout node coordinates dynamically (center node represents the leaving employee)
  const width = 600;
  const height = 350;
  const cx = width / 2;
  const cy = height / 2;

  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    // Center node
    positions['employee'] = { x: cx, y: cy };

    // Outer nodes distributed in a circle
    const outerNodes = nodes.filter(n => n.id !== 'employee');
    const radius = 120;
    outerNodes.forEach((node, index) => {
      const angle = (index * 2 * Math.PI) / outerNodes.length - Math.PI / 2;
      positions[node.id] = {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle)
      };
    });

    return positions;
  }, [nodes, cx, cy]);

  const activeLinks = useMemo(() => {
    if (!hoveredNodeId && !selectedNodeId) return links;
    const activeId = selectedNodeId || hoveredNodeId;
    return links.filter(l => l.source === activeId || l.target === activeId);
  }, [links, hoveredNodeId, selectedNodeId]);

  const getInteractionColor = (level: string) => {
    switch (level) {
      case 'high': return 'fill-indigo-500 stroke-indigo-400';
      case 'medium': return 'fill-sky-500 stroke-sky-400';
      default: return 'fill-emerald-500 stroke-emerald-400';
    }
  };

  const activeNodeIds = useMemo(() => {
    const activeId = selectedNodeId || hoveredNodeId;
    if (!activeId) return new Set(nodes.map(n => n.id));
    const set = new Set<string>([activeId]);
    links.forEach(l => {
      if (l.source === activeId) set.add(l.target);
      if (l.target === activeId) set.add(l.source);
    });
    return set;
  }, [nodes, links, hoveredNodeId, selectedNodeId]);

  return (
    <div className="relative border border-border/80 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl p-4 flex flex-col items-center justify-center overflow-hidden min-h-[380px]">
      <div className="absolute top-3 left-3 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
        Interactive Collaboration Graph
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex gap-3 text-[9px] font-semibold text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          High Connection
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          Medium Connection
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Low Connection
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-xl h-auto">
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(99, 102, 241, 0.15)" />
            <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
          </radialGradient>
        </defs>

        {/* Outer connection field glow */}
        <circle cx={cx} cy={cy} r={140} fill="url(#glow)" />

        {/* Links */}
        {links.map((link, idx) => {
          const from = nodePositions[link.source] || { x: cx, y: cy };
          const to = nodePositions[link.target] || { x: cx, y: cy };
          const isLinkActive = activeLinks.includes(link);
          return (
            <g key={idx}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className={cn(
                  "transition-all duration-300 stroke-2",
                  isLinkActive 
                    ? "stroke-indigo-500/60 stroke-[2px]" 
                    : "stroke-border/40 dark:stroke-border/10 stroke-[1px]"
                )}
              />
              {isLinkActive && (
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 - 4}
                  className="fill-indigo-600 dark:fill-indigo-400 text-[8px] font-semibold text-center select-none"
                  textAnchor="middle"
                >
                  {link.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const pos = nodePositions[node.id] || { x: cx, y: cy };
          const isNodeActive = activeNodeIds.has(node.id);
          const isCenter = node.id === 'employee';
          
          return (
            <g
              key={node.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              onClick={() => setSelectedNodeId(selectedNodeId === node.id ? null : node.id)}
            >
              {isCenter ? (
                <>
                  <circle r={28} className="fill-indigo-500/10 stroke-indigo-500/40 animate-pulse stroke-1" />
                  <circle r={22} className="fill-indigo-600 stroke-background stroke-2" />
                  <text className="fill-white font-extrabold text-[10px]" textAnchor="middle" y={3}>
                    {node.label.split(' ').map(n => n[0]).join('')}
                  </text>
                </>
              ) : (
                <>
                  <circle
                    r={isNodeActive ? 16 : 14}
                    className={cn(
                      "stroke-background stroke-2 transition-all duration-300",
                      getInteractionColor(node.interactionLevel),
                      !isNodeActive && "opacity-40"
                    )}
                  />
                  <text className="fill-white font-bold text-[8px]" textAnchor="middle" y={3}>
                    {node.label.split(' ').map(n => n[0]).join('')}
                  </text>
                </>
              )}

              {/* Labels */}
              <text
                y={isCenter ? 38 : 24}
                className={cn(
                  "font-bold text-[9px] select-none text-center transition-all duration-300",
                  isNodeActive ? "fill-foreground text-[10px]" : "fill-muted-foreground opacity-50"
                )}
                textAnchor="middle"
              >
                {node.label}
              </text>
              <text
                y={isCenter ? 48 : 33}
                className="fill-muted-foreground/60 text-[7.5px] select-none text-center"
                textAnchor="middle"
              >
                {node.role}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Selected Node Details */}
      <div className="mt-2 w-full max-w-md bg-card border border-border/60 p-2.5 rounded-lg text-xs flex items-center justify-between min-h-[48px]">
        {selectedNodeId || hoveredNodeId ? (
          (() => {
            const activeId = selectedNodeId || hoveredNodeId;
            const node = nodes.find(n => n.id === activeId);
            const outgoingLinks = links.filter(l => l.source === activeId || l.target === activeId);
            return (
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-indigo-500">{node?.label} ({node?.role})</span>
                <span className="text-[10px] text-muted-foreground leading-normal">
                  {node?.id === 'employee' 
                    ? 'Main leaving employee profile.'
                    : `Collaboration summary: ${outgoingLinks.map(l => l.label).join('; ')}`
                  }
                </span>
              </div>
            );
          })()
        ) : (
          <span className="text-muted-foreground/80 italic text-center w-full">
            Hover or click nodes in the graph to view active connection details.
          </span>
        )}
      </div>
    </div>
  );
}

export default function AIHandoverPage() {
  const { 
    setActivePage, 
    allUsers, 
    tasks, 
    emails, 
    documents, 
    teamMessages,
    channelMessages,
    user: currentUser
  } = useWorkspace();

  // Seeding high-fidelity mockup users if the workspace profiles list is empty
  const workspaceUsers = useMemo(() => {
    const list = [...allUsers];
    if (list.length === 0) {
      list.push(
        { id: 'usr-john-smith', name: 'John Smith', email: 'john.smith@nexus-ai.com', role: 'Lead Frontend Engineer', avatar: '', status: 'online' },
        { id: 'usr-snehal-patil', name: 'Snehal Patil', email: 'snehal.patil@nexus-ai.com', role: 'Backend Lead', avatar: '', status: 'online' },
        { id: 'usr-david-vance', name: 'David Vance', email: 'david.vance@nexus-ai.com', role: 'Security Lead', avatar: '', status: 'dnd' },
        { id: 'usr-sarah-jenks', name: 'Sarah Jenks', email: 'sarah.jenks@nexus-ai.com', role: 'Product Manager', avatar: '', status: 'online' }
      );
    }
    return list;
  }, [allUsers]);

  // UI state
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [transitionStatus, setTransitionStatus] = useState<Record<string, 'active' | 'transitioning' | 'completed'>>({});
  const [handovers, setHandovers] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'relationships' | 'decisions' | 'commitments' | 'qa'>('overview');
  
  // Q&A search query
  const [qaQuery, setQaQuery] = useState('');
  const [qaAnswer, setQaAnswer] = useState<string | null>(null);
  const [qaLoading, setQaLoading] = useState(false);

  useEffect(() => {
    setActivePage('ai-handover');
    
    // Load local storage states
    const cachedStatus = localStorage.getItem('nexus_handover_status');
    const cachedHandovers = localStorage.getItem('nexus_generated_handovers');
    if (cachedStatus) setTransitionStatus(JSON.parse(cachedStatus));
    if (cachedHandovers) setHandovers(JSON.parse(cachedHandovers));

    // Default select first employee
    if (workspaceUsers.length > 0) {
      setSelectedUserId(workspaceUsers[0].id);
    }
  }, [setActivePage, workspaceUsers]);

  const selectedUser = workspaceUsers.find(u => u.id === selectedUserId);

  // Filter tasks, emails, documents associated with selected user
  const userTasks = useMemo(() => {
    return tasks.filter(t => t.assignee?.id === selectedUserId || t.assignee?.name === selectedUser?.name);
  }, [tasks, selectedUserId, selectedUser]);

  const userEmails = useMemo(() => {
    if (!selectedUser) return [];
    return emails.filter(e => e.to === selectedUser.email || e.from === selectedUser.email);
  }, [emails, selectedUser]);

  const userDocs = useMemo(() => {
    return documents.filter(d => d.uploadedBy?.id === selectedUserId || d.uploadedBy?.name === selectedUser?.name);
  }, [documents, selectedUserId, selectedUser]);

  const userMessages = useMemo(() => {
    if (!selectedUserId) return [];
    const messages: any[] = [];
    if (teamMessages[selectedUserId]) {
      messages.push(...teamMessages[selectedUserId]);
    }
    Object.values(channelMessages).flat().forEach(m => {
      if (m.sender?.id === selectedUserId || m.sender?.name === selectedUser?.name) {
        messages.push(m);
      }
    });
    return messages;
  }, [teamMessages, channelMessages, selectedUserId, selectedUser]);

  const activeHandover = selectedUserId ? handovers[selectedUserId] : null;

  const handleGenerateHandover = async () => {
    if (!selectedUserId || !selectedUser) return;
    
    setIsGenerating(true);
    setGenerationStep(0);

    // Dynamic loading text step updates to feel highly premium and alive
    const steps = [
      'Scanning employee workspace footprint...',
      'Analyzing recent task updates & deadlines...',
      'Scanning emails and direct message history...',
      'Proactively extracting unfulfilled commitments...',
      'Mapping team relationship collaboration matrix...',
      'Indexing architectural and codebase decisions...',
      'Compiling successor onboarding briefings...'
    ];

    const timer = setInterval(() => {
      setGenerationStep(prev => {
        if (prev >= steps.length - 1) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 700);

    try {
      const response = await fetch('/api/handover/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          userName: selectedUser.name,
          userRole: selectedUser.role,
          tasks: userTasks,
          emails: userEmails,
          documents: userDocs,
          messages: userMessages
        })
      });

      const data = await response.json();
      clearInterval(timer);

      if (data.success && data.data) {
        const updatedHandovers = { ...handovers, [selectedUserId]: data.data };
        setHandovers(updatedHandovers);
        localStorage.setItem('nexus_generated_handovers', JSON.stringify(updatedHandovers));

        const updatedStatus = { ...transitionStatus, [selectedUserId]: 'transitioning' as const };
        setTransitionStatus(updatedStatus);
        localStorage.setItem('nexus_handover_status', JSON.stringify(updatedStatus));

        toast.success(`Handover generated successfully for ${selectedUser.name}!`);
      } else {
        throw new Error(data.error || 'Failed to generate');
      }
    } catch (e: any) {
      clearInterval(timer);
      toast.error(`Error: ${e.message || 'Generation offline'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateStatus = (userId: string, newStatus: 'active' | 'transitioning' | 'completed') => {
    const updatedStatus = { ...transitionStatus, [userId]: newStatus };
    setTransitionStatus(updatedStatus);
    localStorage.setItem('nexus_handover_status', JSON.stringify(updatedStatus));
    
    if (newStatus === 'completed') {
      toast.success(`Transition complete! Successor notified about handover handoff.`);
    } else {
      toast.info(`Status updated to ${newStatus}`);
    }
  };

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaQuery.trim() || !activeHandover) return;

    setQaLoading(true);
    setQaAnswer(null);

    // Simulating context searching locally on the generated decisions and project documents
    setTimeout(() => {
      const query = qaQuery.toLowerCase();
      let foundAnswer = '';

      if (query.includes('firebase') || query.includes('supabase') || query.includes('migrate')) {
        const dec = activeHandover.decisionHistory.find((d: any) => d.id === 'd1');
        foundAnswer = dec 
          ? `During architecture meeting on 12 March, the team decided to move because Firebase costs were increasing and row-level security was needed. The migration is currently 100% completed.`
          : `We migrated to Supabase because Firebase costs were scaling rapidly and we required Row-Level Security (RLS) for project data safety.`;
      } else if (query.includes('stripe') || query.includes('pay') || query.includes('razorpay')) {
        const dec = activeHandover.decisionHistory.find((d: any) => d.id === 'd2');
        foundAnswer = dec
          ? `Stripe was chosen because Razorpay lacked robust multi-currency card authorization in testing. Currently, Client Portal redesign is waiting for Stripe account approval.`
          : `We transitioned to Stripe to solve international multi-currency billing issues in our customer portal.`;
      } else if (query.includes('aws') || query.includes('infrastructure') || query.includes('credentials')) {
        foundAnswer = `AWS Infrastructure audit is 95% complete. The IAM access root credentials need rotation as John was the main owner. Contact David (Security Lead) to complete key rotation.`;
      } else if (query.includes('sarah') || query.includes('mike') || query.includes('david')) {
        foundAnswer = `Based on John's relationship graph, he worked closely with Sarah Jenks (Product Manager) on client portals, and David Vance (Security Lead) on database access roles. Connect with Sarah first.`;
      } else {
        // Fallback search in commitments or next actions
        const matches: string[] = [];
        activeHandover.projects.forEach((p: any) => {
          p.nextActions.forEach((a: string) => {
            if (a.toLowerCase().includes(query)) matches.push(`[Next Action] ${a}`);
          });
        });
        activeHandover.commitments.forEach((c: any) => {
          if (c.text.toLowerCase().includes(query)) matches.push(`[Commitment] "${c.text}" (Source: ${c.source})`);
        });

        if (matches.length > 0) {
          foundAnswer = `Here are relevant points located in John's handover details:\n\n${matches.join('\n')}`;
        } else {
          foundAnswer = `I couldn't locate specific references to "${qaQuery}". John worked on Client Portal, AWS Audit, and Payments. Try asking "Why did we migrate from Firebase?" or "What are AWS next actions?".`;
        }
      }

      setQaAnswer(foundAnswer);
      setQaLoading(false);
    }, 600);
  };

  const handleToggleCommitment = (commitmentId: string) => {
    if (!selectedUserId || !activeHandover) return;
    const updatedCommitments = activeHandover.commitments.map((c: any) => {
      if (c.id === commitmentId) {
        const newStatus = c.status === 'completed' ? 'pending' : 'completed';
        return { ...c, status: newStatus };
      }
      return c;
    });

    const updatedHandover = { ...activeHandover, commitments: updatedCommitments };
    const updatedHandovers = { ...handovers, [selectedUserId]: updatedHandover };
    setHandovers(updatedHandovers);
    localStorage.setItem('nexus_generated_handovers', JSON.stringify(updatedHandovers));
    toast.success('Commitment status updated!');
  };

  const handleExportMarkdown = () => {
    if (!activeHandover) return;
    
    const md = `# Nexus AI Handover: ${activeHandover.employeeName}
Role: ${activeHandover.employeeRole}
Generated: ${format(new Date(activeHandover.createdAt), 'MMMM d, yyyy')}
Created By: ${activeHandover.createdBy}

## Onboarding Briefing
${activeHandover.successorBriefing.textBriefing}

## Projects List
${activeHandover.projects.map((p: any) => `
### ${p.name} (${p.progress}% Complete)
- Status: ${p.status}
- Blockers: ${p.blockers.join(', ')}
- Key Stakeholders: ${p.keyStakeholders.join(', ')}
- Next Actions:
${p.nextActions.map((a: string) => `  * [ ] ${a}`).join('\n')}
`).join('\n')}

## Unfulfilled Commitments
${activeHandover.commitments.filter((c: any) => c.status === 'pending').map((c: any) => `
- [ ] ${c.text} (Source: ${c.source}, Due: ${c.dueDate})
`).join('')}

## Core Decisions History
${activeHandover.decisionHistory.map((d: any) => `
### ${d.title} (${d.date})
* Details: ${d.details}
* Rationale: ${d.rationale}
* Category: ${d.category}
`).join('\n')}

## Operational Risks Detected
${activeHandover.risks.map((r: string) => `- [ ] ${r}`).join('\n')}
    `;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Handover_${activeHandover.employeeName.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Markdown handover exported!');
  };

  // Rendering loading text
  const loadingSteps = [
    'Scanning employee workspace footprint...',
    'Analyzing recent task updates & deadlines...',
    'Scanning emails and direct message history...',
    'Proactively extracting unfulfilled commitments...',
    'Mapping team relationship collaboration matrix...',
    'Indexing architectural and codebase decisions...',
    'Compiling successor onboarding briefings...'
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-6 h-[calc(100vh-3rem)] overflow-hidden text-foreground bg-background select-none">
      
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-500" />
            AI Employee Handover
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Generate interactive briefings, extract unfulfilled commitments, map dependencies, and capture decision logs automatically.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column - Employee Directory */}
        <div className="lg:col-span-1 border border-border rounded-xl flex flex-col bg-card overflow-hidden">
          <div className="p-3 border-b border-border bg-muted/10 shrink-0 flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Team Directory
            </span>
            <Badge variant="outline" className="text-[8px] tracking-wider uppercase font-bold py-0.2 bg-background">
              {workspaceUsers.length} members
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/40 p-2 space-y-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {workspaceUsers.map(user => {
              const isSelected = user.id === selectedUserId;
              const status = transitionStatus[user.id] || 'active';
              const hasReport = !!handovers[user.id];

              return (
                <div
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={cn(
                    "p-3 rounded-lg border text-left cursor-pointer transition-all flex flex-col gap-1.5 relative group select-none",
                    isSelected 
                      ? "bg-indigo-500/[0.03] border-indigo-500/30 shadow-xs" 
                      : "bg-card border-border/80 hover:border-indigo-500/20"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-sky-400 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-bold truncate text-foreground leading-none">{user.name}</span>
                        {hasReport && (
                          <span title="Handover Generated">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-muted-foreground truncate block mt-0.5">{user.role}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/40 pt-1.5 mt-0.5">
                    <span className="text-[8px] font-mono text-muted-foreground/60">{user.email}</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[8px] font-bold py-0 px-1.5 uppercase tracking-wide",
                        status === 'completed' 
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : status === 'transitioning'
                            ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                            : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                      )}
                    >
                      {status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column - Handover Panel */}
        <div className="lg:col-span-3 border border-border rounded-xl flex flex-col bg-card overflow-hidden relative">
          
          <AnimatePresence mode="wait">
            {isGenerating ? (
              // AI Loading animation sequence
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/90 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                  <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
                </div>
                
                <h3 className="text-sm font-bold text-foreground mb-1">Generating Handover Dashboard</h3>
                <p className="text-xs text-indigo-500 font-semibold animate-pulse h-4">
                  {loadingSteps[generationStep]}
                </p>
                <p className="text-[10px] text-muted-foreground mt-4 max-w-sm">
                  Nexus is scanning and correlating documents, commitments, chats, and task cards. This takes under 5 seconds.
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {selectedUser ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              
              {/* Handover Toolbar */}
              <div className="p-4 border-b border-border bg-muted/10 shrink-0 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold text-foreground">{selectedUser.name} — Handover</span>
                    <span className="text-[9px] text-muted-foreground">Status: <strong className="capitalize">{transitionStatus[selectedUserId] || 'Active'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeHandover ? (
                    <>
                      <div className="flex border border-border bg-background rounded-lg p-0.5">
                        <button
                          onClick={() => handleUpdateStatus(selectedUserId, 'active')}
                          className={cn(
                            "px-2 py-1 text-[9px] font-bold rounded-md cursor-pointer",
                            (transitionStatus[selectedUserId] || 'active') === 'active' ? "bg-muted text-foreground" : "text-muted-foreground"
                          )}
                        >
                          Active
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(selectedUserId, 'transitioning')}
                          className={cn(
                            "px-2 py-1 text-[9px] font-bold rounded-md cursor-pointer",
                            transitionStatus[selectedUserId] === 'transitioning' ? "bg-indigo-500/10 text-indigo-500" : "text-muted-foreground"
                          )}
                        >
                          Leaving
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(selectedUserId, 'completed')}
                          className={cn(
                            "px-2 py-1 text-[9px] font-bold rounded-md cursor-pointer",
                            transitionStatus[selectedUserId] === 'completed' ? "bg-emerald-500/10 text-emerald-500" : "text-muted-foreground"
                          )}
                        >
                          Done
                        </button>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleExportMarkdown}
                        className="h-8 text-[10px] font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Export MD
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGenerateHandover}
                        className="h-8 text-[10px] font-bold flex items-center gap-1.5 text-indigo-500 hover:text-indigo-600 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Re-generate
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleGenerateHandover}
                      className="bg-indigo-600 hover:bg-indigo-600/90 text-white font-bold text-xs h-8 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Generate AI Handover
                    </Button>
                  )}
                </div>
              </div>

              {activeHandover ? (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Tabs */}
                  <div className="flex border-b border-border bg-muted/5 p-1 shrink-0 gap-1 overflow-x-auto text-[10px] font-bold">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className={cn(
                        "px-3.5 py-1.5 rounded-md cursor-pointer whitespace-nowrap transition-colors",
                        activeTab === 'overview' ? "bg-card border border-border text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Successor Briefing
                    </button>
                    <button
                      onClick={() => setActiveTab('projects')}
                      className={cn(
                        "px-3.5 py-1.5 rounded-md cursor-pointer whitespace-nowrap transition-colors",
                        activeTab === 'projects' ? "bg-card border border-border text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Projects & Blockers ({activeHandover.projects.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('relationships')}
                      className={cn(
                        "px-3.5 py-1.5 rounded-md cursor-pointer whitespace-nowrap transition-colors",
                        activeTab === 'relationships' ? "bg-card border border-border text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Relationship Graph ({activeHandover.relationshipGraph.nodes.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('decisions')}
                      className={cn(
                        "px-3.5 py-1.5 rounded-md cursor-pointer whitespace-nowrap transition-colors",
                        activeTab === 'decisions' ? "bg-card border border-border text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Decision History ({activeHandover.decisionHistory.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('commitments')}
                      className={cn(
                        "px-3.5 py-1.5 rounded-md cursor-pointer whitespace-nowrap transition-colors",
                        activeTab === 'commitments' ? "bg-card border border-border text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Commitment Tracker ({activeHandover.commitments.filter((x: any) => x.status === 'pending').length})
                    </button>
                    <button
                      onClick={() => setActiveTab('qa')}
                      className={cn(
                        "px-3.5 py-1.5 rounded-md cursor-pointer whitespace-nowrap transition-colors",
                        activeTab === 'qa' ? "bg-card border border-border text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Successor Q&A
                    </button>
                  </div>

                  {/* Tab Contents */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    
                    {activeTab === 'overview' && (
                      <div className="space-y-6">
                        {/* Briefing summary statistics */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          <div className="p-3 bg-muted/10 border border-border/85 rounded-xl text-center">
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-muted-foreground">Active Projects</span>
                            <div className="font-extrabold text-lg text-foreground mt-0.5">{activeHandover.successorBriefing.projectsCount}</div>
                          </div>
                          <div className="p-3 bg-muted/10 border border-border/85 rounded-xl text-center">
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-muted-foreground">Stakeholders</span>
                            <div className="font-extrabold text-lg text-foreground mt-0.5">{activeHandover.successorBriefing.relationshipsCount}</div>
                          </div>
                          <div className="p-3 bg-muted/10 border border-border/85 rounded-xl text-center">
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-muted-foreground">Deadlines</span>
                            <div className="font-extrabold text-lg text-foreground mt-0.5">{activeHandover.successorBriefing.deadlinesCount}</div>
                          </div>
                          <div className="p-3 bg-muted/10 border border-border/85 rounded-xl text-center">
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-500">Commitments</span>
                            <div className="font-extrabold text-lg text-indigo-500 mt-0.5">{activeHandover.successorBriefing.commitmentsCount}</div>
                          </div>
                          <div className="p-3 bg-red-500/[0.02] border border-red-500/20 rounded-xl text-center">
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-red-500">Open Risks</span>
                            <div className="font-extrabold text-lg text-red-500 mt-0.5">{activeHandover.successorBriefing.risksCount}</div>
                          </div>
                        </div>

                        {/* Onboarding briefing paragraph */}
                        <div className="border border-indigo-500/20 bg-indigo-500/[0.01] rounded-xl p-4 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-xs text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" /> Onboarding Briefing
                            </span>
                            <Badge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 text-[8.5px] uppercase font-bold py-0.2">
                              {activeHandover.successorBriefing.timeToRead}
                            </Badge>
                          </div>
                          <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap font-medium">
                            {activeHandover.successorBriefing.textBriefing}
                          </p>
                        </div>

                        {/* Risks and Single points of failure */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-red-500" /> Key Operational Risks
                          </h4>
                          <div className="flex flex-col gap-2">
                            {activeHandover.risks.map((risk: string, idx: number) => (
                              <div key={idx} className="p-3 bg-red-500/[0.02] border border-red-500/10 rounded-lg flex items-start gap-2.5 text-xs text-foreground font-semibold leading-relaxed">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                <span>{risk}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'projects' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {activeHandover.projects.map((proj: any, idx: number) => (
                            <div key={idx} className="border border-border/80 rounded-xl p-4 bg-card flex flex-col gap-3.5 justify-between">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold text-foreground">{proj.name}</h4>
                                  <Badge className="text-[8px] uppercase tracking-wide py-0 px-1.5 font-bold">
                                    {proj.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 bg-muted/60 h-2 rounded-full overflow-hidden">
                                    <div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${proj.progress}%` }} />
                                  </div>
                                  <span className="text-[10px] font-bold text-muted-foreground">{proj.progress}%</span>
                                </div>
                              </div>

                              <div className="space-y-2 border-t border-border/40 pt-3 text-[10.5px]">
                                <div>
                                  <span className="font-bold text-muted-foreground uppercase text-[8px] tracking-wider block">Current Blockers</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {proj.blockers.map((b: string, bIdx: number) => (
                                      <span key={bIdx} className="bg-red-500/10 text-red-500 border border-red-500/15 py-0.2 px-1.5 rounded text-[9px] font-bold leading-normal">
                                        {b}
                                      </span>
                                    ))}
                                    {proj.blockers.length === 0 && <span className="text-muted-foreground/60 italic">No blockers logged.</span>}
                                  </div>
                                </div>

                                <div>
                                  <span className="font-bold text-muted-foreground uppercase text-[8px] tracking-wider block">Key Stakeholders</span>
                                  <span className="text-foreground/90 font-medium block mt-0.5">{proj.keyStakeholders.join(', ')}</span>
                                </div>

                                <div>
                                  <span className="font-bold text-indigo-500 uppercase text-[8px] tracking-wider block">Next Critical Actions</span>
                                  <ul className="list-disc pl-3.5 space-y-0.5 mt-1 font-semibold text-foreground/80">
                                    {proj.nextActions.map((act: string, aIdx: number) => (
                                      <li key={aIdx}>{act}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === 'relationships' && (
                      <div className="space-y-4">
                        <RelationshipGraph 
                          nodes={activeHandover.relationshipGraph.nodes} 
                          links={activeHandover.relationshipGraph.links} 
                        />
                        <div className="border border-border/60 rounded-xl p-3 bg-muted/10 text-xs">
                          <span className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider block mb-1">Graph Insights</span>
                          <p className="leading-relaxed text-muted-foreground">
                            This graph maps interactions from the team calendar, direct messages, and email headers. It exposes crucial relationships: for projects, Sarah Jenks is the product reviewer, while Mike Vance represents the primary client contact for payments.
                          </p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'decisions' && (
                      <div className="space-y-4">
                        <div className="relative border-l-2 border-border/80 ml-3.5 pl-6 space-y-5 py-2">
                          {activeHandover.decisionHistory.map((dec: any) => (
                            <div key={dec.id} className="relative group">
                              {/* Pulsing indicator node */}
                              <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-background ring-4 ring-indigo-500/10 group-hover:scale-110 transition-transform" />
                              
                              <div className="border border-border/85 bg-card rounded-xl p-4 flex flex-col gap-2 shadow-2xs">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-bold text-foreground">{dec.title}</h4>
                                    <Badge variant="outline" className="text-[8px] py-0 px-1.5 bg-background">{dec.category}</Badge>
                                  </div>
                                  <span className="text-[9px] font-mono text-muted-foreground/60 font-semibold">{dec.date}</span>
                                </div>

                                <p className="text-xs text-muted-foreground leading-normal mt-0.5">{dec.details}</p>
                                
                                <div className="mt-1 border-t border-border/40 pt-2.5 flex flex-col gap-1">
                                  <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-wider">Architecture Rationale</span>
                                  <p className="text-[11px] leading-relaxed text-foreground font-semibold italic bg-muted/20 p-2 border border-border/40 rounded-lg">
                                    "{dec.rationale}"
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === 'commitments' && (
                      <div className="space-y-4">
                        <div className="border border-border/60 bg-muted/10 p-3 rounded-xl text-xs text-muted-foreground leading-relaxed">
                          Nexus automatically detects verbal commitments made in chat rooms, meetings, and emails (e.g. "I'll do X"). Successors can tick these off as they complete them.
                        </div>

                        <div className="flex flex-col gap-2">
                          {activeHandover.commitments.map((com: any) => {
                            const isDone = com.status === 'completed';
                            return (
                              <div
                                key={com.id}
                                onClick={() => handleToggleCommitment(com.id)}
                                className={cn(
                                  "p-3 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-3 relative select-none",
                                  isDone 
                                    ? "bg-muted/10 border-border/40 opacity-60" 
                                    : "bg-card border-border hover:border-indigo-500/20"
                                )}
                              >
                                <div className="mt-0.5 shrink-0">
                                  {isDone ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border border-border flex items-center justify-center hover:bg-emerald-500/10 hover:border-emerald-500 transition-colors bg-background" />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1 flex flex-col gap-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={cn("text-xs font-bold truncate text-foreground", isDone && "line-through text-muted-foreground")}>
                                      {com.text}
                                    </span>
                                    <Badge variant="outline" className="text-[8px] py-0 px-1 bg-background shrink-0 font-bold">
                                      {com.source}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center justify-between text-[9px] text-muted-foreground/60 font-semibold mt-1">
                                    <span>Source: Detected in {com.source}</span>
                                    <span className="font-mono">Due: {com.dueDate}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {activeTab === 'qa' && (
                      <div className="space-y-4">
                        <div className="border border-border/60 bg-muted/10 p-3.5 rounded-xl text-xs text-muted-foreground leading-normal">
                          Successors can ask Nexus questions regarding decisions, stakeholders, next actions, or credentials left behind.
                        </div>

                        <form onSubmit={handleAskQuestion} className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                            <input
                              type="text"
                              value={qaQuery}
                              onChange={(e) => setQaQuery(e.target.value)}
                              placeholder="e.g. Why did we migrate from Firebase to Supabase?"
                              className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-foreground h-9 font-semibold"
                            />
                          </div>
                          <Button
                            type="submit"
                            disabled={qaLoading}
                            className="bg-indigo-600 hover:bg-indigo-600/90 text-white font-bold text-xs h-9 px-4 rounded-lg cursor-pointer"
                          >
                            Ask Nexus
                          </Button>
                        </form>

                        <div className="min-h-[120px] border border-border/80 bg-zinc-50/20 dark:bg-zinc-950/25 rounded-xl p-4 flex flex-col gap-2">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                            Nexus AI Answer
                          </span>
                          
                          {qaLoading && (
                            <div className="flex items-center gap-2 text-xs text-indigo-500 font-semibold animate-pulse py-4">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Searching organizational memory index...
                            </div>
                          )}

                          {!qaLoading && qaAnswer && (
                            <div className="text-xs leading-relaxed text-foreground font-medium whitespace-pre-wrap p-3 bg-card border border-border/60 rounded-lg shadow-2xs">
                              {qaAnswer}
                            </div>
                          )}

                          {!qaLoading && !qaAnswer && (
                            <div className="text-center text-xs text-muted-foreground/60 py-6 italic">
                              Ask a question above to scan John's handover documents, decisions, and chat memory.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              ) : (
                // Blank slate when Selected Employee has no handover generated yet
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                  <Briefcase className="w-12 h-12 opacity-15 mb-3 text-indigo-500" />
                  <h4 className="text-sm font-bold text-foreground">No Handover Generated</h4>
                  <p className="text-xs mt-1.5 max-w-[280px] leading-relaxed">
                    Click "Generate AI Handover" to compile tasks, DMs, documents, and relationship matrices for {selectedUser.name}.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleGenerateHandover}
                    className="bg-indigo-600 hover:bg-indigo-600/90 text-white font-bold text-xs h-9 px-4 rounded-lg mt-4 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Generate AI Handover
                  </Button>
                </div>
              )}
            </div>
          ) : (
            // Select user blank slate
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
              <Users className="w-12 h-12 opacity-15 mb-3 text-indigo-500" />
              <h4 className="text-sm font-bold text-foreground">Select Team Member</h4>
              <p className="text-xs mt-1.5 max-w-[240px]">Select a workspace employee from the left panel to begin handover planning.</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
