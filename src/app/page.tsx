'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useWorkspace, isAdminLevelRole } from '@/lib/store';
import { motion } from 'motion/react';
import { 
  FileText, CheckSquare, Calendar, Mail, 
  Sparkles, ChevronRight, Plus, Check, ArrowRight, 
  ExternalLink, CloudUpload, Clock, Target, BarChart2,
  ShieldAlert, Edit2, Trash2, Briefcase, X, Save, RefreshCw, Inbox
} from 'lucide-react';
import { format, isSameDay, addDays, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, getDocumentFavicon } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

const DashboardCharts = dynamic(() => import('@/components/landing/dashboard-charts'), {
  ssr: false,
  loading: () => <div className="h-[480px] w-full bg-card rounded-2xl border border-border flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading Analytics Charts...</div>
});

export default function DashboardPage() {
  const { 
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
    joinWorkspaceByCode,
    aiUsage,
    notifications,
    aiInbox,
    deals,
    teamMessages,
    channelMessages
  } = useWorkspace();
  const router = useRouter();

  // State Declarations
  const [greeting, setGreeting] = useState('Good morning');
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');
  const [loading, setLoading] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
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

  // AI Briefing state
  const [briefingText, setBriefingText] = useState('');
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [isBriefingDismissed, setIsBriefingDismissed] = useState(false);

  // Dynamic AI Briefing items
  const dynamicBriefing = useMemo(() => {
    const list: string[] = [];

    // 1. Stale / Rotting Deals
    const rotting = (deals || []).filter(d => {
      if (!d.stageUpdatedAt) return false;
      if (d.stage === 'won' || d.stage === 'lost') return false;
      const diff = Date.now() - new Date(d.stageUpdatedAt).getTime();
      return diff > 5 * 24 * 60 * 60 * 1000; // 5 days
    });
    if (rotting.length > 0) {
      const days = Math.round((Date.now() - new Date(rotting[0].stageUpdatedAt!).getTime()) / (24 * 60 * 60 * 1000));
      list.push(`${rotting[0].company} deal hasn't been updated in ${days} days`);
    } else if (deals.length > 0) {
      list.push(`Follow up on active deal: "${deals[0].title}"`);
    } else {
      list.push(`No active deals require follow-up`);
    }

    // 2. Unreplied Emails
    const receivedEmails = (emails || []).filter(e => e.status === 'received').length;
    if (receivedEmails > 0) {
      list.push(`${receivedEmails} email${receivedEmails > 1 ? 's' : ''} need${receivedEmails === 1 ? 's' : ''} replies`);
    } else {
      list.push('No unanswered emails in your inbox');
    }

    // 3. Today's meetings
    const todayMeetings = (calendarEvents || []).filter(e => {
      try {
        return isSameDay(parseISO(e.date), new Date());
      } catch {
        return isSameDay(new Date(e.date), new Date());
      }
    });
    if (todayMeetings.length > 0) {
      list.push(`Meeting with ${todayMeetings[0].attendees?.[0]?.name || 'client'} at ${todayMeetings[0].startTime}`);
    } else {
      list.push('No meetings scheduled for today');
    }

    // 4. Drafts / Review tasks
    const draftsCount = (emails || []).filter(e => e.status === 'draft' || e.status === 'pending').length;
    if (draftsCount > 0) {
      list.push(`${draftsCount} draft proposal${draftsCount > 1 ? 's' : ''} ready for review`);
    } else {
      list.push('All proposals and drafts up to date');
    }

    return list;
  }, [deals, emails, calendarEvents]);

  // Dynamic Nexus Noticed alerts
  const nexusNoticedAlerts = useMemo(() => {
    const list: { label: string; value: string; desc: string; badge: string; color: string }[] = [];

    // 1. Chat Activity
    const msgCount = Object.values(teamMessages || {}).flat().length + Object.values(channelMessages || {}).flat().length;
    list.push({
      label: 'Team Chat Activity',
      value: msgCount > 0 ? `Team chat active` : `No chat activity`,
      desc: msgCount > 0 ? `${msgCount} messages exchanged this week` : `No messages exchanged yet`,
      badge: msgCount > 20 ? '+35%' : msgCount > 0 ? '+10%' : '0%',
      color: msgCount > 0 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    });

    // 2. Customer Followup
    const received = (emails || []).filter(e => e.status === 'received');
    if (received.length > 0) {
      list.push({
        label: 'Customer Followup',
        value: `Inbound customer activity`,
        desc: `Last email received ${format(new Date(received[0].createdAt), 'MMM d')}`,
        badge: 'Active',
        color: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      });
    } else {
      list.push({
        label: 'Customer Followup',
        value: `Inbox fully sorted`,
        desc: `All customer emails addressed`,
        badge: 'Sorted',
        color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      });
    }

    // 3. Calendar Check
    const tomorrow = addDays(new Date(), 1);
    const tomorrowEvents = (calendarEvents || []).filter(e => {
      try {
        return isSameDay(parseISO(e.date), tomorrow);
      } catch {
        return isSameDay(new Date(e.date), tomorrow);
      }
    });
    list.push({
      label: 'Scheduling',
      value: tomorrowEvents.length > 0 ? `${tomorrowEvents.length} events tomorrow` : 'Schedule clear tomorrow',
      desc: tomorrowEvents.length > 1 ? 'Check for double bookings' : 'No conflicts detected',
      badge: tomorrowEvents.length > 1 ? 'Conflicts' : 'Clear',
      color: tomorrowEvents.length > 1 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'
    });

    // 4. Document / Proposals
    const drafts = (emails || []).filter(e => e.status === 'draft');
    list.push({
      label: 'Proposal Status',
      value: drafts.length > 0 ? `${drafts.length} drafts in progress` : 'All proposals sent',
      desc: drafts.length > 0 ? 'Review details in AI Inbox' : 'No outstanding draft tasks',
      badge: drafts.length > 0 ? 'Drafts' : 'Complete',
      color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
    });

    return list;
  }, [emails, calendarEvents, teamMessages, channelMessages]);

  // Dynamic AI Activity Feed
  const dynamicActivityFeed = useMemo(() => {
    const feed: { time: string; title: string; desc: string; date: Date }[] = [];

    // 1. Completed AI Action Inbox items
    (aiInbox || []).filter(item => item.status === 'completed').forEach(item => {
      feed.push({
        time: format(new Date(item.createdAt), 'h:mm a'),
        title: `Nexus executed: ${item.title}`,
        desc: item.description,
        date: new Date(item.createdAt)
      });
    });

    // 2. Uploaded documents
    (documents || []).forEach(doc => {
      feed.push({
        time: format(new Date(doc.uploadedAt), 'h:mm a'),
        title: `Nexus indexed: ${doc.title}`,
        desc: `File "${doc.title}" (${doc.type.toUpperCase()}) parsed and structured.`,
        date: new Date(doc.uploadedAt)
      });
    });

    // 3. Sent or Received Emails
    (emails || []).forEach(email => {
      feed.push({
        time: format(new Date(email.createdAt), 'h:mm a'),
        title: email.status === 'sent' ? `Email sent to ${email.toName || email.to}` : `Inbound email from ${email.fromName || email.from || 'Client'}`,
        desc: `Subject: "${email.subject}"`,
        date: new Date(email.createdAt)
      });
    });

    // 4. Tasks updated / created
    (tasks || []).filter(t => !t.tags.includes('time-log')).forEach(task => {
      const taskDate = new Date(task.updatedAt || task.createdAt);
      feed.push({
        time: format(taskDate, 'h:mm a'),
        title: `Task status: ${task.status.toUpperCase()}`,
        desc: `"${task.title}" updated. Priority: ${task.priority.toUpperCase()}`,
        date: taskDate
      });
    });

    if (feed.length === 0) {
      return [
        { time: 'Active', title: 'Nexus monitoring active', desc: 'AI is listening for workspace events in real-time.' }
      ];
    }

    // Sort by date descending
    return feed
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 4)
      .map(({ time, title, desc }) => ({ time, title, desc }));
  }, [aiInbox, documents, emails, tasks]);

  // Derived Calculations
  const today = new Date();
  const isAdmin = isAdminLevelRole(user?.role);
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

  // Visual Analytics Parsers
  const { totalMinutes, totalTimeLogsCount } = useMemo(() => {
    const logs = tasks.filter(t => t.tags.includes('time-log'));
    let sum = 0;
    logs.forEach(log => {
      const parts = log.description.split(':').map(Number);
      if (parts.length === 2) {
        sum += parts[0] * 60 + parts[1];
      } else if (parts.length === 1 && !isNaN(parts[0])) {
        sum += parts[0];
      }
    });
    return { totalMinutes: sum, totalTimeLogsCount: logs.length };
  }, [tasks]);

  const formattedTotalTime = useMemo(() => {
    if (totalMinutes === 0) return '0h 0m';
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs}h ${mins}m`;
  }, [totalMinutes]);

  const { completedTasksCount, activeTasksCount, taskCompletionRate } = useMemo(() => {
    const activeTasks = tasks.filter(t => !t.tags.includes('time-log'));
    const completed = activeTasks.filter(t => t.status === 'done').length;
    const total = activeTasks.length;
    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { completedTasksCount: completed, activeTasksCount: total, taskCompletionRate: rate };
  }, [tasks]);

  const totalAiUsageRequests = useMemo(() => {
    if (!aiUsage || aiUsage.length === 0) return 0;
    return aiUsage.reduce((acc, curr) => acc + curr.requests, 0);
  }, [aiUsage]);

  const timeData = useMemo(() => {
    const logs = tasks.filter(t => t.tags.includes('time-log'));
    if (logs.length === 0) {
      return [
        { name: 'Mon', minutes: 45 },
        { name: 'Tue', minutes: 120 },
        { name: 'Wed', minutes: 90 },
        { name: 'Thu', minutes: 60 },
        { name: 'Fri', minutes: 180 },
        { name: 'Sat', minutes: 30 },
        { name: 'Sun', minutes: 0 }];
    }
    const groups: Record<string, number> = {};
    logs.forEach(log => {
      const taskName = log.title.replace('Time Log: ', '').trim() || 'Active Task';
      const parts = log.description.split(':').map(Number);
      let minutes = 0;
      if (parts.length === 2) {
        minutes = parts[0] * 60 + parts[1];
      } else if (parts.length === 1 && !isNaN(parts[0])) {
        minutes = parts[0];
      } else {
        minutes = 30;
      }
      groups[taskName] = (groups[taskName] || 0) + minutes;
    });

    return Object.entries(groups).map(([name, val]) => ({
      name: name.length > 10 ? name.substring(0, 10) + '...' : name,
      minutes: val
    })).slice(0, 7);
  }, [tasks]);

  const taskStatusData = useMemo(() => {
    const counts: Record<string, number> = { todo: 0, in_progress: 0, review: 0, done: 0, backlog: 0 };
    const activeTasks = tasks.filter(t => !t.tags.includes('time-log'));
    
    activeTasks.forEach(t => {
      if (counts[t.status] !== undefined) {
        counts[t.status]++;
      }
    });

    const total = activeTasks.length;
    if (total === 0) {
      return [
        { name: 'To Do', value: 4, color: '#64748b' },
        { name: 'In Progress', value: 3, color: '#0071e3' },
        { name: 'In Review', value: 2, color: '#a855f7' },
        { name: 'Completed', value: 8, color: '#10b981' }
      ];
    }

    return [
      { name: 'To Do', value: counts.todo, color: '#64748b' },
      { name: 'In Progress', value: counts.in_progress, color: '#0071e3' },
      { name: 'In Review', value: counts.review, color: '#a855f7' },
      { name: 'Completed', value: counts.done, color: '#10b981' }
    ];
  }, [tasks]);

  const aiUsageData = useMemo(() => {
    if (!aiUsage || aiUsage.length === 0) {
      return [
        { day: 'Mon', requests: 4 },
        { day: 'Tue', requests: 12 },
        { day: 'Wed', requests: 8 },
        { day: 'Thu', requests: 15 },
        { day: 'Fri', requests: 22 },
        { day: 'Sat', requests: 7 },
        { day: 'Sun', requests: 10 }];
    }
    return aiUsage.map(entry => {
      try {
        const dayName = format(parseISO(entry.date), 'EEE');
        return { day: dayName, requests: entry.requests };
      } catch {
        return { day: entry.date, requests: entry.requests };
      }
    }).slice(-7);
  }, [aiUsage]);

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

  // Helper/Handlers Declarations
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

  const fetchBriefingText = async (force = false) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const cachedDate = localStorage.getItem('nexus_briefing_date');
    const cachedText = localStorage.getItem('nexus_briefing_text');
    const dismissed = localStorage.getItem('nexus_briefing_dismissed') === todayStr;

    if (dismissed && !force) {
      setIsBriefingDismissed(true);
    }

    if (!force && cachedDate === todayStr && cachedText) {
      setBriefingText(cachedText);
      return;
    }

    setBriefingLoading(true);
    try {
      const res = await fetch('/api/dashboard/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: tasks,
          calendarEvents: calendarEvents,
          notifications: notifications,
          workspaceId: workspace?.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      
      localStorage.setItem('nexus_briefing_date', todayStr);
      localStorage.setItem('nexus_briefing_text', data.text);
      localStorage.removeItem('nexus_briefing_dismissed');
      setBriefingText(data.text);
      setIsBriefingDismissed(false);
    } catch (e) {
      console.warn('Briefing generator offline, using local fallback:', e);
      const todayStrFriendly = format(new Date(), 'EEEE');
      const fallback = `Welcome back! Today is ${todayStrFriendly}. You have ${pendingTasksCount} priority tasks and ${upcomingMeetingsCount} events scheduled for today. Keep up the great work!`;
      setBriefingText(fallback);
    } finally {
      setBriefingLoading(false);
    }
  };

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

  const nav = (page: string) => {
    (page as any);
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

  const handleCopyTimesheetsSql = () => {
    if (loggedTimesheets.length === 0) {
      toast.error('No timesheets logged yet');
      return;
    }
    const sql = loggedTimesheets.map(log => {
      const escapedTitle = log.title.replace(/'/g, "''");
      const escapedDesc = log.description.replace(/'/g, "''");
      const assigneeJson = log.assignee ? `'${JSON.stringify(log.assignee).replace(/'/g, "''")}'` : 'NULL';
      const subtasksJson = `'${JSON.stringify(log.subtasks || []).replace(/'/g, "''")}'`;
      const tagsSql = log.tags.length > 0 ? `ARRAY[${log.tags.map(t => `'${t.replace(/'/g, "''")}'`).join(', ')}]` : 'NULL';
      return `INSERT INTO tasks (id, title, description, status, priority, assignee, due_date, tags, subtasks, created_at, updated_at)
VALUES ('${log.id}', '${escapedTitle}', '${escapedDesc}', '${log.status}', '${log.priority}', ${assigneeJson}, '${log.dueDate}', ${tagsSql}, ${subtasksJson}, '${log.createdAt}', '${log.createdAt}');`;
    }).join('\n\n');

    navigator.clipboard.writeText(sql);
    toast.success('Timesheet SQL copied to clipboard!');
  };

  const handleCopyDocumentsSql = () => {
    if (documents.length === 0) {
      toast.error('No documents uploaded yet');
      return;
    }
    const sql = documents.slice(0, 4).map(doc => {
      const escapedTitle = doc.title.replace(/'/g, "''");
      const escapedSummary = (doc.summary || '').replace(/'/g, "''");
      const escapedContent = (doc.content || '').replace(/'/g, "''");
      const uploadedByJson = doc.uploadedBy ? `'${JSON.stringify(doc.uploadedBy).replace(/'/g, "''")}'` : 'NULL';
      
      const keyPointsSql = doc.keyPoints.length > 0 ? `ARRAY[${doc.keyPoints.map(kp => `'${kp.replace(/'/g, "''")}'`).join(', ')}]` : 'NULL';
      const peopleSql = doc.extractedPeople.length > 0 ? `ARRAY[${doc.extractedPeople.map(p => `'${p.replace(/'/g, "''")}'`).join(', ')}]` : 'NULL';
      const orgsSql = doc.extractedOrganizations.length > 0 ? `ARRAY[${doc.extractedOrganizations.map(o => `'${o.replace(/'/g, "''")}'`).join(', ')}]` : 'NULL';
      const tagsSql = doc.tags.length > 0 ? `ARRAY[${doc.tags.map(t => `'${t.replace(/'/g, "''")}'`).join(', ')}]` : 'NULL';
      
      const tasksJson = `'${JSON.stringify(doc.extractedTasks || []).replace(/'/g, "''")}'`;
      const deadlinesJson = `'${JSON.stringify(doc.extractedDeadlines || []).replace(/'/g, "''")}'`;

      return `INSERT INTO documents (id, title, type, size, uploaded_at, uploaded_by, summary, content, key_points, extracted_tasks, extracted_deadlines, extracted_people, extracted_organizations, tags, thumbnail, processing_status)
VALUES ('${doc.id}', '${escapedTitle}', '${doc.type}', '${doc.size}', '${doc.uploadedAt}', ${uploadedByJson}, '${escapedSummary}', '${escapedContent}', ${keyPointsSql}, ${tasksJson}, ${deadlinesJson}, ${peopleSql}, ${orgsSql}, ${tagsSql}, '${doc.thumbnail}', '${doc.processingStatus}');`;
    }).join('\n\n');

    navigator.clipboard.writeText(sql);
    toast.success('Documents SQL copied to clipboard!');
  };

  const handleCopyLoginActivitiesSql = () => {
    if (loginActivities.length === 0) {
      toast.error('No login activities logged yet');
      return;
    }
    const sql = loginActivities.slice(0, 6).map(log => {
      const escapedName = log.userName.replace(/'/g, "''");
      const escapedRole = log.userRole.replace(/'/g, "''");
      const escapedDevice = log.device.replace(/'/g, "''");
      return `INSERT INTO login_activities (id, user_id, user_name, user_role, timestamp, ip_address, device)
VALUES ('${log.id}', '${log.userId}', '${escapedName}', '${escapedRole}', '${log.timestamp}', '${log.ipAddress}', '${escapedDevice}');`;
    }).join('\n\n');

    navigator.clipboard.writeText(sql);
    toast.success('Login activities SQL copied to clipboard!');
  };

  // Effects
  useEffect(() => {
    
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 17) setGreeting('Good afternoon');
    else if (hour >= 17) setGreeting('Good evening');
  }, []);

  useEffect(() => {
    if (workspace && activeTab === 'overview') {
      fetchBriefingText();
    }
  }, [activeTab, workspace]);

  // Conditional early return for workspace creation/join flow
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

      {/* Proactive AI Insights Panel ("Nexus noticed") */}
      <motion.div 
        variants={item} 
        className="border border-indigo-500/20 bg-indigo-500/[0.02] dark:border-indigo-500/30 dark:bg-indigo-950/10 rounded-2xl p-5 flex flex-col gap-3 shadow-none relative"
      >
        <div className="absolute right-4 top-4 opacity-10 shrink-0">
          <Sparkles className="w-8 h-8 text-indigo-500" />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-mono">
            Nexus Noticed
          </h3>
        </div>
        
        <p className="text-[11px] text-muted-foreground leading-normal">
          AI monitored active workspace operations and detected the following attention items:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-1">
          {nexusNoticedAlerts.map((alert, idx) => (
            <div key={idx} className="bg-card border border-border/80 hover:border-indigo-500/20 rounded-xl p-3.5 transition-all flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-muted-foreground">{alert.label}</span>
                <span className={cn("text-[8px] font-bold px-1 rounded-sm border", alert.color)}>{alert.badge}</span>
              </div>
              <p className="text-xs font-bold text-foreground">{alert.value}</p>
              <span className="text-[9.5px] text-muted-foreground">{alert.desc}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tab Switcher */}
      <div className="flex justify-start border-b border-border/40 pb-2">
        <div className="flex p-0.5 bg-black/[0.04] dark:bg-white/[0.04] rounded-full border border-black/[0.03] dark:border-white/[0.05] relative select-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              "relative px-4 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-all duration-200 cursor-pointer",
              activeTab === 'overview'
                ? "bg-white dark:bg-neutral-800 text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={cn(
              "relative px-4 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-all duration-200 cursor-pointer",
              activeTab === 'analytics'
                ? "bg-white dark:bg-neutral-800 text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Analytics & Insights
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Main Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left 2/3 */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          
          {/* Morning AI Briefing Widget */}
          {!isBriefingDismissed && (
            <motion.div 
              initial={{ opacity: 0, y: -4 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="border border-border rounded-2xl p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 bg-gradient-to-br from-indigo-500/[0.03] to-purple-500/[0.03] dark:from-indigo-950/5 dark:to-purple-950/5 relative overflow-hidden group shadow-none"
            >
              {/* Left visual border accent */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#0071e3] to-[#8b5cf6]" />
              
              <div className="flex gap-4 items-start flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/10">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="min-w-0 flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-500 font-mono">Nexus AI Briefing</h4>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-foreground">{greeting}, {user?.name || 'Raj'}.</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Here's your morning AI briefing:</p>
                    {briefingLoading ? (
                      <div className="mt-3 space-y-2 animate-pulse max-w-xl">
                        <div className="h-3 bg-muted rounded w-5/6"></div>
                        <div className="h-3 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-foreground leading-relaxed whitespace-pre-wrap select-text max-w-2xl font-medium prose prose-sm dark:prose-invert">
                        {briefingText}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 shrink-0 ml-auto md:ml-0 self-end md:self-stretch justify-between">
                <Button 
                  onClick={() => nav('ai-inbox')}
                  className="bg-indigo-600 hover:bg-indigo-600/90 text-white text-xs font-bold h-8 px-4 rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Inbox className="w-3.5 h-3.5" /> Review Actions
                </Button>
                <div className="flex gap-1.5">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      setIsBriefingDismissed(true);
                      const todayStr = format(new Date(), 'yyyy-MM-dd');
                      localStorage.setItem('nexus_briefing_dismissed', todayStr);
                    }}
                    className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                    title="Dismiss Briefing"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

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
            <div 
              className="border border-border rounded-lg p-4 flex flex-col bg-card"
              data-tutorial="objectives"
            >
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
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Logged Timesheets
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyTimesheetsSql}
                  className="h-7 text-[10px] text-muted-foreground hover:text-foreground gap-1 border border-border/40 hover:bg-accent/40 font-semibold px-2 cursor-pointer transition-all"
                  title="Copy SQL inserts for logged timesheets"
                >
                  Copy SQL
                </Button>
              </div>
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
          
            {/* AI Activity Feed */}
            <div className="border border-border rounded-lg p-4 bg-card flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  AI activity feed
                </h3>
                <Badge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 text-[9px] uppercase font-bold">Active</Badge>
              </div>
              
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                Recent automatic operations completed in the background:
              </p>

              <div className="relative border-l border-border pl-4 ml-2.5 mt-2 space-y-4 text-xs">
                {dynamicActivityFeed.map((act, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-[22.5px] top-0.5 w-4 h-4 rounded-full bg-indigo-500/10 border-2 border-indigo-500 flex items-center justify-center bg-background">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground font-mono">{act.time}</span>
                      <span className="font-semibold text-foreground">{act.title}</span>
                      <p className="text-[10px] text-muted-foreground">{act.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          {/* Quick Actions */}
          <div className="border border-border rounded-lg p-4 bg-card">
            <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Upload PDF', icon: CloudUpload, page: 'documents' },
                { label: 'Add Task', icon: CheckSquare, page: 'tasks' },
                { label: 'Write Email', icon: Mail, page: 'emails' },
                { label: 'New Chat', icon: Sparkles, page: 'chat' }].map(action => (
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
            <div className="p-4 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Recent Documents
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyDocumentsSql}
                className="h-7 text-[10px] text-muted-foreground hover:text-foreground gap-1 border border-border/40 hover:bg-accent/40 font-semibold px-2 cursor-pointer transition-all"
                title="Copy SQL inserts for recent documents"
              >
                Copy SQL
              </Button>
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
                      {doc.thumbnail && (doc.thumbnail.startsWith('http') || doc.thumbnail.startsWith('/')) ? (
                        <img src={doc.thumbnail} className="w-4 h-4 object-contain" alt="" />
                      ) : doc.thumbnail ? (
                        <span>{doc.thumbnail}</span>
                      ) : (
                        <img src={getDocumentFavicon(doc.title)} className="w-4 h-4 object-contain" alt="" />
                      )}
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <ShieldAlert className="w-4 h-4 text-indigo-500" />
                Teammate Login Activities (Audit Logs)
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyLoginActivitiesSql}
                className="h-7 text-[10px] text-muted-foreground hover:text-foreground gap-1 border border-border/40 hover:bg-accent/40 font-semibold px-2 cursor-pointer transition-all"
                title="Copy SQL inserts for login activities"
              >
                Copy SQL
              </Button>
            </div>
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
      </>
      )}

      {activeTab === 'analytics' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-6"
        >
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-border rounded-2xl p-5 bg-card flex flex-col gap-1.5 shadow-none">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Focus Time Tracked</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight">{formattedTotalTime}</span>
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Logged across {totalTimeLogsCount} task sessions</span>
            </div>

            <div className="border border-border rounded-2xl p-5 bg-card flex flex-col gap-1.5 shadow-none">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Task Completion Rate</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight">{taskCompletionRate}%</span>
                <Check className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{completedTasksCount} of {activeTasksCount} tasks completed</span>
            </div>

            <div className="border border-border rounded-2xl p-5 bg-card flex flex-col gap-1.5 shadow-none">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">AI Copilot Requests</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight">{totalAiUsageRequests}</span>
                <Sparkles className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Daily requests quota tracking active</span>
            </div>
          </div>

          {/* Charts Section */}
          <DashboardCharts
            timeData={timeData}
            taskStatusData={taskStatusData}
            activeTasksCount={activeTasksCount}
            aiUsageData={aiUsageData}
            totalAiUsageRequests={totalAiUsageRequests}
          />
        </motion.div>
      )}
    </div>
  );
}
