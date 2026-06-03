'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useWorkspace, isAdminLevelRole } from '@/lib/store';
import { motion } from 'motion/react';
import { 
  FileText, CheckSquare, Calendar, Mail, 
  Sparkles, ChevronRight, Plus, Check, ArrowRight, 
  ExternalLink, CloudUpload, Clock, Target, BarChart2,
  ShieldAlert, Edit2, Trash2, Briefcase, X, Save
} from 'lucide-react';
import { format, isSameDay, addDays, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { 
    setActivePage, 
    documents, 
    tasks, 
    calendarEvents, 
    emails, 
    insights,
    moveTask,
    updateEmailStatus,
    goals,
    user,
    addGoal,
    updateGoal,
    deleteGoal,
    roles,
    addRole,
    loginActivities,
    workspace,
    createWorkspace,
    joinWorkspaceByCode
  } = useWorkspace();
  const router = useRouter();
  const [greeting, setGreeting] = useState('Good morning');
  const today = new Date();

  const [loading, setLoading] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      toast.error('Team name cannot be empty');
      return;
    }
    setLoading(true);
    try {
      const success = await createWorkspace(teamName.trim());
      if (success) {
        toast.success(`Welcome to your new team: ${teamName.trim()}!`);
      }
    } catch (err) {
      toast.error('Failed to create team workspace');
    } finally {
      setLoading(false);
    }
  };

  const extractAndCleanCode = (input: string) => {
    let cleaned = input.trim();
    if (!cleaned) return '';

    if (cleaned.includes('/invite/')) {
      const parts = cleaned.split('/invite/');
      cleaned = parts[parts.length - 1].split('?')[0].split('#')[0];
    } else if (cleaned.includes('inviteCode=')) {
      const parts = cleaned.split('inviteCode=');
      cleaned = parts[parts.length - 1].split('&')[0].split('#')[0];
    } else if (cleaned.includes('/') && (cleaned.startsWith('http://') || cleaned.startsWith('https://') || cleaned.split('/').length > 1)) {
      const parts = cleaned.split('/');
      cleaned = parts[parts.length - 1].split('?')[0].split('#')[0];
    }
    return cleaned.toUpperCase();
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCode = extractAndCleanCode(inviteCode);
    if (!finalCode) {
      toast.error('Invite code cannot be empty');
      return;
    }
    setInviteCode(finalCode);
    setLoading(true);
    try {
      const result = await joinWorkspaceByCode(finalCode);
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('An error occurred while joining the team.');
    } finally {
      setLoading(false);
    }
  };

  if (!workspace) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-background relative overflow-hidden min-h-[calc(100vh-3rem)]">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full filter blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-[120px] pointer-events-none" />

        <div className="w-full max-w-4xl flex flex-col gap-8 relative z-10">
          <div className="flex flex-col items-center text-center gap-2">
            <img src="/logo.png" className="w-16 h-16 object-contain rounded-xl shadow-lg border border-border/50 mb-2" alt="Logo" />
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Welcome to Nexus AI
            </h1>
            <p className="text-sm text-muted-foreground max-w-lg">
              Get started by creating a new collaborative workspace for your team or joining an existing one.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch mt-6">
            {/* Create Workspace Card */}
            <div className="bg-zinc-50/60 dark:bg-zinc-900/30 rounded-2xl p-10 pl-8 pr-8 flex flex-col justify-between min-h-[420px] transition-all duration-300">
              <div className="flex flex-col">
                {/* Section Label */}
                <div className="flex items-center gap-1.5 text-xs font-semibold tracking-tight text-indigo-600 dark:text-indigo-400">
                  <span className="text-[10px]">●</span>
                  <span>SETUP</span>
                </div>
                
                {/* Title */}
                <h2 className="text-[32px] font-bold text-foreground tracking-tight leading-tight mt-4">
                  Create Workspace
                </h2>
                
                {/* Subtitle */}
                <h3 className="text-base font-medium text-foreground/90 mt-3">
                  Start a new team environment.
                </h3>
                
                {/* Description */}
                <p className="text-[14px] text-muted-foreground mt-2 leading-relaxed">
                  Generate invite codes and create a shared space for chat, documents, and tasks.
                </p>
              </div>

              {/* Form & Button */}
              <form onSubmit={handleCreateTeam} className="flex flex-col gap-6 mt-10">
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-foreground/80">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Acme Corporation or Dev Team"
                    className="w-full bg-[#fcfcfb] dark:bg-[#1a1a1a] border border-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-all"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-foreground text-background hover:opacity-90 font-bold transition-all text-xs h-10 mt-2 cursor-pointer"
                >
                  {loading ? 'Creating...' : 'Create Workspace'}
                </Button>
              </form>
            </div>

            {/* Join Workspace Card */}
            <div className="bg-zinc-50/60 dark:bg-zinc-900/30 rounded-2xl p-10 pl-8 pr-8 flex flex-col justify-between min-h-[420px] transition-all duration-300">
              <div className="flex flex-col">
                {/* Section Label */}
                <div className="flex items-center gap-1.5 text-xs font-semibold tracking-tight text-indigo-600 dark:text-indigo-400">
                  <span className="text-[10px]">●</span>
                  <span>JOIN</span>
                </div>
                
                {/* Title */}
                <h2 className="text-[30px] font-semibold text-foreground tracking-tight leading-tight mt-4">
                  Join Existing Team
                </h2>
                
                {/* Subtitle */}
                <h3 className="text-base font-medium text-foreground/90 mt-3">
                  Already invited?
                </h3>
                
                {/* Description */}
                <p className="text-[14px] text-muted-foreground mt-2 leading-relaxed">
                  Enter an invite code or workspace link to request access.
                </p>
              </div>

              {/* Form & Button */}
              <form onSubmit={handleJoinTeam} className="flex flex-col gap-6 mt-10">
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-medium text-foreground/80">
                    Invite Code or Link
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.includes('/') || val.includes('?') || val.includes('http')) {
                        setInviteCode(extractAndCleanCode(val));
                      } else {
                        setInviteCode(val.toUpperCase());
                      }
                    }}
                    placeholder="e.g. ABCDEFGH"
                    className="w-full bg-[#fcfcfb] dark:bg-[#1a1a1a] border border-border rounded-lg px-3.5 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 transition-all"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-foreground text-background hover:opacity-90 font-bold transition-all text-xs h-10 mt-2 cursor-pointer"
                >
                  {loading ? 'Joining...' : 'Join Workspace'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = isAdminLevelRole(user?.role);

  // Role Manager state
  const [newRoleTitle, setNewRoleTitle] = useState('');

  // Objectives Creator state
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalCategory, setGoalCategory] = useState<'company' | 'team' | 'personal'>('company');
  const [goalProgress, setGoalProgress] = useState(0);
  const [goalTarget, setGoalTarget] = useState(100);

  // Objectives Editor state
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<'company' | 'team' | 'personal'>('company');
  const [editProgress, setEditProgress] = useState(0);
  const [editTarget, setEditTarget] = useState(100);

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleTitle.trim()) {
      toast.error('Role title cannot be empty');
      return;
    }
    addRole(newRoleTitle.trim());
    toast.success(`Role "${newRoleTitle.trim()}" added to sign up options!`);
    setNewRoleTitle('');
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) {
      toast.error('Objective title cannot be empty');
      return;
    }
    if (goalTarget <= 0) {
      toast.error('Target value must be greater than zero');
      return;
    }
    addGoal({
      title: goalTitle.trim(),
      category: goalCategory,
      progress: goalProgress,
      target: goalTarget
    });
    toast.success(`Objective "${goalTitle.trim()}" created!`);
    setGoalTitle('');
    setGoalCategory('company');
    setGoalProgress(0);
    setGoalTarget(100);
    setShowAddGoal(false);
  };

  const startEditGoal = (goal: any) => {
    setEditingGoalId(goal.id);
    setEditTitle(goal.title);
    setEditCategory(goal.category);
    setEditProgress(goal.progress);
    setEditTarget(goal.target);
  };

  const handleSaveGoalEdit = (goalId: string) => {
    if (!editTitle.trim()) {
      toast.error('Objective title cannot be empty');
      return;
    }
    if (editTarget <= 0) {
      toast.error('Target value must be greater than zero');
      return;
    }
    updateGoal(goalId, {
      title: editTitle.trim(),
      category: editCategory,
      progress: Number(editProgress),
      target: Number(editTarget)
    });
    toast.success('Objective updated successfully!');
    setEditingGoalId(null);
  };

  const handleDeleteGoal = (goalId: string, title: string) => {
    deleteGoal(goalId);
    toast.success(`Objective "${title}" deleted`);
  };

  useEffect(() => {
    setActivePage('dashboard');
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 17) setGreeting('Good afternoon');
    else if (hour >= 17) setGreeting('Good evening');
  }, [setActivePage]);

  const totalDocuments = documents.length;
  const pendingTasksCount = tasks.filter(t => t.status !== 'done').length;
  const upcomingMeetingsCount = calendarEvents.filter(e => e.category === 'meeting').length;
  const emailsAwaitingCount = emails.filter(e => e.status === 'draft' || e.status === 'pending').length;

  const priorityTasks = useMemo(() => {
    return tasks
      .filter(t => t.status !== 'done' && !t.tags.includes('time-log'))
      .sort((a, b) => {
        const order: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
        return (order[a.priority] || 3) - (order[b.priority] || 3);
      })
      .slice(0, 4);
  }, [tasks]);

  const agendaEvents = useMemo(() => {
    const tomorrow = addDays(today, 1);
    return calendarEvents
      .filter(e => {
        const eventDate = new Date(e.date);
        return isSameDay(eventDate, today) || isSameDay(eventDate, tomorrow);
      })
      .sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return a.startTime.localeCompare(b.startTime);
      })
      .slice(0, 5);
  }, [calendarEvents]);

  const emailDrafts = useMemo(() => {
    return emails
      .filter(e => e.status === 'draft' || e.status === 'pending')
      .slice(0, 3);
  }, [emails]);

  // Logged time sheets from tasks
  const loggedTimesheets = useMemo(() => {
    return tasks
      .filter(t => t.tags.includes('time-log'))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
  }, [tasks]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  const nav = (page: string) => {
    setActivePage(page as any);
    router.push(page === 'dashboard' ? '/' : `/${page}`);
  };

  const handleTaskComplete = (taskId: string, title: string) => {
    moveTask(taskId, 'done');
    toast.success(`"${title}" completed`);
  };

  const handleEmailApprove = (emailId: string, subject: string) => {
    updateEmailStatus(emailId, 'sent');
    toast.success(`"${subject}" sent`);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8 min-h-screen text-foreground bg-background">
      
      {/* Welcome Header */}
      <motion.div 
        initial={{ opacity: 0, y: -8 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{greeting}, {user?.name || 'there'}</h1>
          <p className="text-sm text-muted-foreground">{format(today, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => nav('chat')}
            className="gap-2 text-sm h-8 border-border hover:bg-accent"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ask AI
          </Button>
          <Button 
            size="sm"
            onClick={() => nav('documents')}
            className="bg-foreground text-background hover:opacity-90 gap-2 text-sm h-8"
          >
            <Plus className="w-3.5 h-3.5" />
            New Page
          </Button>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={item} onClick={() => nav('documents')} className="cursor-pointer group">
          <div className="border border-border rounded-lg p-4 hover:bg-accent/30 transition-colors">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Documents</span>
              <FileText className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold">{totalDocuments}</span>
              <span className="text-[10px] text-green-600 bg-green-50 dark:bg-green-950/20 dark:text-green-400 px-1.5 py-0.5 rounded font-medium">+12%</span>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} onClick={() => nav('tasks')} className="cursor-pointer group">
          <div className="border border-border rounded-lg p-4 hover:bg-accent/30 transition-colors">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tasks</span>
              <CheckSquare className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold">{pendingTasksCount}</span>
              <span className="text-[10px] text-muted-foreground">pending</span>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} onClick={() => nav('calendar')} className="cursor-pointer group">
          <div className="border border-border rounded-lg p-4 hover:bg-accent/30 transition-colors">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Meetings</span>
              <Calendar className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold">{upcomingMeetingsCount}</span>
              <span className="text-[10px] text-muted-foreground">this week</span>
            </div>
          </div>
        </motion.div>

        <motion.div variants={item} onClick={() => nav('emails')} className="cursor-pointer group">
          <div className="border border-border rounded-lg p-4 hover:bg-accent/30 transition-colors">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Drafts</span>
              <Mail className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold">{emailsAwaitingCount}</span>
              {emailsAwaitingCount > 0 ? (
                <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">Review</span>
              ) : (
                <span className="text-[10px] text-muted-foreground">up to date</span>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left 2/3 */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          
          {/* AI Copilot Bar */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="border border-border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
          >
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium">AI Recommendation</h4>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {insights.length > 0 ? insights[0].description : "You have 3 deadlines approaching this week. Start reviewing CloudScale contract details."}
                </p>
              </div>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => nav('chat')}
              className="text-xs shrink-0 self-end md:self-center gap-1.5 h-7"
            >
              Analyze <ArrowRight className="w-3 h-3" />
            </Button>
          </motion.div>

          {/* Priority Tasks + Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Priority Tasks */}
            <div className="border border-border rounded-lg flex flex-col bg-card">
              <div className="p-4 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-muted-foreground" />
                  Priority Tasks
                </h3>
                <button onClick={() => nav('tasks')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  View <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <div className="px-4 pb-4 flex-1 flex flex-col gap-2">
                {priorityTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 text-muted-foreground flex-1">
                    <Check className="w-6 h-6 opacity-30 mb-2" />
                    <p className="text-xs">All caught up!</p>
                  </div>
                ) : (
                  priorityTasks.map(task => (
                    <div 
                      key={task.id} 
                      className="flex items-start gap-2.5 p-2 rounded-md hover:bg-accent/30 transition-colors group"
                    >
                      <button 
                        onClick={() => handleTaskComplete(task.id, task.title)}
                        className="w-4 h-4 mt-0.5 rounded-full border border-border/80 flex items-center justify-center hover:border-foreground transition-all shrink-0 bg-background"
                      >
                        <Check className="w-2.5 h-2.5 opacity-0 group-hover:opacity-40 transition-opacity" />
                      </button>
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <span className="text-sm leading-snug truncate">{task.title}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "text-[9px] uppercase tracking-wider font-semibold px-1 py-0.5 rounded-sm",
                            task.priority === 'urgent' && "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400",
                            task.priority === 'high' && "bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400",
                            task.priority === 'medium' && "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400",
                            task.priority === 'low' && "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                          )}>
                            {task.priority}
                          </span>
                          {task.dueDate && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" /> {format(new Date(task.dueDate), 'MMM d')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Schedule */}
            <div className="border border-border rounded-lg flex flex-col bg-card">
              <div className="p-4 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Schedule
                </h3>
                <button onClick={() => nav('calendar')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  View <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <div className="px-4 pb-4 flex-1 flex flex-col gap-2">
                {agendaEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 text-muted-foreground flex-1">
                    <Calendar className="w-6 h-6 opacity-30 mb-2" />
                    <p className="text-xs">No events today or tomorrow</p>
                  </div>
                ) : (
                  agendaEvents.map(event => {
                    const isToday = isSameDay(new Date(event.date), new Date());
                    return (
                      <div 
                        key={event.id}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1 pr-2">
                          <span className="text-sm leading-snug truncate">{event.title}</span>
                          <span className="text-[10px] text-muted-foreground">
                            <span className="font-medium">{isToday ? 'Today' : 'Tomorrow'}</span> · {event.startTime} – {event.endTime}
                          </span>
                        </div>
                        {event.category === 'meeting' && (
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-1.5 py-0.5 rounded font-medium shrink-0">
                            Join
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* OKRs Trackers & Time tracker Logs row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* OKRs & Goals Progress */}
            <div className="border border-border rounded-lg p-4 flex flex-col bg-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  Objectives & OKRs
                </h3>
                {isAdmin && (
                  <button 
                    onClick={() => setShowAddGoal(!showAddGoal)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    {showAddGoal ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {/* Add Goal Form Inline */}
              {isAdmin && showAddGoal && (
                <form onSubmit={handleAddGoal} className="mb-4 p-3 border border-dashed border-border rounded-md space-y-2 bg-muted/10">
                  <div className="text-xs font-semibold text-muted-foreground mb-1">New Objective</div>
                  <input
                    type="text"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder="Objective Title"
                    className="w-full bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Category</label>
                      <select
                        value={goalCategory}
                        onChange={(e) => setGoalCategory(e.target.value as any)}
                        className="w-full bg-background border border-border rounded p-1 text-[10px] focus:outline-none"
                      >
                        <option value="company">Company</option>
                        <option value="team">Team</option>
                        <option value="personal">Personal</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Progress</label>
                      <input
                        type="number"
                        value={goalProgress}
                        onChange={(e) => setGoalProgress(Number(e.target.value))}
                        className="w-full bg-background border border-border rounded p-1 text-[10px] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Target</label>
                      <input
                        type="number"
                        value={goalTarget}
                        onChange={(e) => setGoalTarget(Number(e.target.value))}
                        className="w-full bg-background border border-border rounded p-1 text-[10px] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-1.5 pt-1">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowAddGoal(false)}
                      className="h-6 text-[10px] px-2"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      size="sm" 
                      className="h-6 text-[10px] px-2 bg-foreground text-background"
                    >
                      Save OKR
                    </Button>
                  </div>
                </form>
              )}

              <div className="flex-1 flex flex-col gap-3.5">
                {(goals || []).map(goal => {
                  const percent = Math.min(100, Math.max(0, Math.round((goal.progress / goal.target) * 100)));
                  const isEditing = editingGoalId === goal.id;

                  if (isEditing) {
                    return (
                      <div key={goal.id} className="p-2.5 border border-border rounded bg-muted/5 space-y-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full bg-background border border-border rounded px-2 py-0.5 text-xs font-semibold focus:outline-none"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold">Category</label>
                            <select
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value as any)}
                              className="w-full bg-background border border-border rounded p-0.5 text-[10px] focus:outline-none"
                            >
                              <option value="company">Company</option>
                              <option value="team">Team</option>
                              <option value="personal">Personal</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold">Progress</label>
                            <input
                              type="number"
                              value={editProgress}
                              onChange={(e) => setEditProgress(Number(e.target.value))}
                              className="w-full bg-background border border-border rounded p-0.5 text-[10px] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold">Target</label>
                            <input
                              type="number"
                              value={editTarget}
                              onChange={(e) => setEditTarget(Number(e.target.value))}
                              className="w-full bg-background border border-border rounded p-0.5 text-[10px] focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingGoalId(null)}
                            className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveGoalEdit(goal.id)}
                            className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded transition-colors"
                            title="Save changes"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={goal.id} className="space-y-1 group relative">
                      <div className="flex items-center justify-between text-xs pr-12">
                        <span className="font-semibold text-foreground truncate max-w-[200px]" title={goal.title}>{goal.title}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">{goal.category}</span>
                          <span className="font-bold text-muted-foreground font-mono">{percent}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-muted border border-border/40 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      
                      {isAdmin && (
                        <div className="absolute right-0 top-[-4px] hidden group-hover:flex items-center gap-1 bg-background/90 pl-2">
                          <button 
                            type="button"
                            onClick={() => startEditGoal(goal)}
                            className="p-0.5 hover:bg-accent text-muted-foreground hover:text-foreground rounded transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDeleteGoal(goal.id, goal.title)}
                            className="p-0.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-500 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Logged Timesheets */}
            <div className="border border-border rounded-lg p-4 flex flex-col bg-card">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Logged Timesheets
              </h3>
              <div className="flex-1 flex flex-col gap-2">
                {loggedTimesheets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-4 text-muted-foreground flex-1">
                    <Clock className="w-6 h-6 opacity-30 mb-2 animate-pulse" />
                    <span className="text-xs text-muted-foreground">Track and log task time from the top navigation bar!</span>
                  </div>
                ) : (
                  loggedTimesheets.map(log => (
                    <div key={log.id} className="p-2 border border-border/80 rounded bg-muted/10 flex items-center justify-between text-xs">
                      <div className="flex flex-col gap-0.5 truncate pr-2">
                        <span className="font-bold truncate text-foreground">{log.title.replace('Time Log: ', '')}</span>
                        <span className="text-[9px] text-muted-foreground">{format(parseISO(log.createdAt), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                      <Badge variant="secondary" className="font-mono text-[9px] px-1.5 py-0.5 font-bold shrink-0">
                        {log.description}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Right 1/3 */}
        <div className="flex flex-col gap-6">
          
          {/* Quick Actions */}
          <div className="border border-border rounded-lg p-4 bg-card">
            <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Upload PDF', icon: CloudUpload, page: 'documents' },
                { label: 'Add Task', icon: CheckSquare, page: 'tasks' },
                { label: 'Write Email', icon: Mail, page: 'emails' },
                { label: 'New Chat', icon: Sparkles, page: 'chat' },
              ].map(action => (
                <button 
                  key={action.label}
                  onClick={() => nav(action.page)}
                  className="flex items-center gap-2 px-3 py-2 text-xs border border-border rounded-md hover:bg-accent/50 transition-colors text-left"
                >
                  <action.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Email Drafts */}
          <div className="border border-border rounded-lg flex flex-col bg-card">
            <div className="p-4 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Drafts
              </h3>
            </div>
            <div className="px-4 pb-4 flex flex-col gap-2">
              {emailDrafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                  <Mail className="w-6 h-6 opacity-30 mb-2" />
                  <p className="text-xs">No drafts</p>
                </div>
              ) : (
                emailDrafts.map(email => (
                  <div key={email.id} className="p-2.5 rounded-md border border-border hover:bg-accent/20 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-medium truncate">To: {email.toName}</span>
                      <span className="text-[9px] text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 px-1 py-0.5 rounded font-medium shrink-0 ml-2">Draft</span>
                    </div>
                    <span className="text-xs text-foreground truncate block">{email.subject}</span>
                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{email.body}</p>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/50">
                      <button onClick={() => nav('emails')} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                        Review <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                      <button 
                        onClick={() => handleEmailApprove(email.id, email.subject)}
                        className="text-[10px] bg-foreground text-background px-2 py-0.5 rounded font-medium hover:opacity-90 transition-opacity flex items-center gap-1"
                      >
                        <Check className="w-2.5 h-2.5" /> Approve
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Documents */}
          <div className="border border-border rounded-lg flex-1 flex flex-col bg-card">
            <div className="p-4 pb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Recent Documents
              </h3>
            </div>
            <div className="px-4 pb-4 flex-1 flex flex-col gap-1.5">
              {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-4 text-muted-foreground flex-1">
                  <FileText className="w-6 h-6 opacity-30 mb-2" />
                  <p className="text-xs">No documents yet</p>
                </div>
              ) : (
                documents.slice(0, 4).map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => nav('documents')}
                    className="flex items-center gap-2.5 p-2 rounded-md hover:bg-accent/30 transition-colors w-full text-left group"
                  >
                    <div className="w-7 h-7 rounded bg-muted flex items-center justify-center text-sm shrink-0">
                      {doc.thumbnail || '📄'}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm truncate group-hover:text-foreground">{doc.title}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{doc.type} · {doc.size}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Command Center */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-border">
          {/* Teammate Login Logs */}
          <div className="border border-border rounded-lg p-4 bg-card md:col-span-2 flex flex-col">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-foreground">
              <ShieldAlert className="w-4 h-4 text-indigo-500" />
              Teammate Login Activities (Audit Logs)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-medium">
                    <th className="pb-2 pr-2">Teammate</th>
                    <th className="pb-2 px-2">Role</th>
                    <th className="pb-2 px-2">IP Address</th>
                    <th className="pb-2 px-2">Device</th>
                    <th className="pb-2 pl-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(loginActivities || []).slice(0, 6).map((log) => (
                    <tr key={log.id} className="hover:bg-accent/25 transition-colors">
                      <td className="py-2.5 pr-2 font-medium text-foreground">{log.userName}</td>
                      <td className="py-2.5 px-2 text-muted-foreground">{log.userRole}</td>
                      <td className="py-2.5 px-2 font-mono text-muted-foreground">{log.ipAddress}</td>
                      <td className="py-2.5 px-2 text-muted-foreground max-w-[120px] truncate" title={log.device}>{log.device}</td>
                      <td className="py-2.5 pl-2 text-right text-muted-foreground">
                        {format(new Date(log.timestamp), 'MMM d, h:mm a')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Role Manager Widget */}
          <div className="border border-border rounded-lg p-4 bg-card flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-2 text-foreground">
                <Briefcase className="w-4 h-4 text-indigo-500" />
                Create Team Roles
              </h3>
              <p className="text-[11px] text-muted-foreground mb-4">
                Add new team roles. These will immediately populate the Sign Up role dropdown list.
              </p>
              <form onSubmit={handleCreateRole} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">New Role Title</label>
                  <input
                    type="text"
                    value={newRoleTitle}
                    onChange={(e) => setNewRoleTitle(e.target.value)}
                    placeholder="e.g. Lead QA Engineer"
                    className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
                <Button type="submit" size="sm" className="w-full text-xs h-8 bg-foreground text-background hover:opacity-90">
                  Add Role Options
                </Button>
              </form>
            </div>
            
            <div className="mt-4 pt-3 border-t border-border/60">
              <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider block mb-2">Active Roles ({roles?.length || 0})</span>
              <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto pr-1">
                {(roles || []).map(r => (
                  <Badge key={r} variant="secondary" className="text-[8px] px-1.5 py-0.5">{r}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
