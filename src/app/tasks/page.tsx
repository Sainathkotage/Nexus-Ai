'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useWorkspace } from '@/lib/store';
import { Task, TaskStatus, Priority, Person } from '@/types';
import { 
  CheckSquare, LayoutGrid, List, Plus, Search, X, MoreVertical, 
  Trash2, Calendar, UserPlus, GripVertical, Clock, Info, ShieldAlert,
  ArrowRight, DollarSign, Activity, ChevronLeft, ChevronRight, BarChart2,
  Paperclip, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { format, isSameDay, addMonths, subMonths, eachDayOfInterval, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'backlog', title: 'Backlog', color: 'border-t-gray-400 dark:border-t-gray-600' },
  { id: 'todo', title: 'To Do', color: 'border-t-blue-500' },
  { id: 'in-progress', title: 'In Progress', color: 'border-t-amber-500' },
  { id: 'review', title: 'In Review', color: 'border-t-purple-500' },
  { id: 'done', title: 'Done', color: 'border-t-emerald-500' }];

const priorityColors: Record<Priority, string> = {
  low: 'border border-stone-200 text-stone-600 bg-stone-50/50 dark:border-stone-800 dark:text-stone-400 dark:bg-stone-900/20',
  medium: 'border border-amber-200 text-amber-700 bg-amber-50/40 dark:border-amber-900/20 dark:text-amber-500 dark:bg-amber-950/15',
  high: 'border border-orange-200 text-orange-700 bg-orange-50/40 dark:border-orange-900/20 dark:text-orange-500 dark:bg-orange-950/15',
  urgent: 'border border-red-200 text-red-700 bg-red-50/40 dark:border-red-900/20 dark:text-red-500 dark:bg-red-950/15'
};

export default function TasksPage() {
  const { 
    tasks, 
    moveTask, 
    addTask, 
    deleteTask, 
    updateTask, 
    allUsers,
    user,
    selectedTaskId,
    setSelectedTaskId
  } = useWorkspace();

  const [view, setView] = useState<'board' | 'list' | 'timeline' | 'workload'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const isGuest = user?.role === 'Guest';
  
  // Dialog controls
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  
  const selectedTask = useMemo(() => {
    if (!selectedTaskId || selectedTaskId === 'new') return null;
    return tasks.find(t => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  const setSelectedTask = (
    taskOrFn: Task | null | ((prev: Task | null) => Task | null)
  ) => {
    if (typeof taskOrFn === 'function') {
      const nextTask = taskOrFn(selectedTask);
      setSelectedTaskId(nextTask ? nextTask.id : null);
    } else {
      setSelectedTaskId(taskOrFn ? taskOrFn.id : null);
    }
  };

  useEffect(() => {
    if (selectedTaskId === 'new') {
      setIsAddTaskOpen(true);
    } else if (selectedTaskId === null && isAddTaskOpen) {
      setIsAddTaskOpen(false);
    }
  }, [selectedTaskId]);

  const handleCloseAddTask = () => {
    setIsAddTaskOpen(false);
    if (selectedTaskId === 'new') {
      setSelectedTaskId(null);
    }
  };

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState<TaskStatus>('todo');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newAssigneeId, setNewAssigneeId] = useState<string>('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newTagsString, setNewTagsString] = useState('');
  const [newBudget, setNewBudget] = useState<number>(0);
  const [newTimeEstimate, setNewTimeEstimate] = useState<number>(0);

  // Timeline view state
  const [timelineMonth, setTimelineMonth] = useState(new Date());
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  

  // Filter tasks based on query
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.assignee && t.assignee.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [tasks, searchQuery]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Task title is required');
      return;
    }

    const assignee = allUsers.find(u => u.id === newAssigneeId) || allUsers[0];

    addTask({
      title: newTitle,
      description: newDescription,
      status: newStatus,
      priority: newPriority,
      assignee,
      dueDate: newDueDate || new Date().toISOString().split('T')[0],
      tags: newTagsString.split(',').map(s => s.trim()).filter(Boolean),
      subtasks: [],
      budget: newBudget > 0 ? newBudget : undefined,
      timeEstimate: newTimeEstimate > 0 ? newTimeEstimate : undefined,
      dependencies: { blocks: [], blockedBy: [] }
    });

    // Reset fields
    setNewTitle('');
    setNewDescription('');
    setNewStatus('todo');
    setNewPriority('medium');
    setNewAssigneeId('');
    setNewDueDate('');
    setNewTagsString('');
    setNewBudget(0);
    setNewTimeEstimate(0);
    setIsAddTaskOpen(false);
    toast.success('Task created successfully');
  };

  const handleUpdateTaskDetail = (updatedFields: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>) => {
    if (!selectedTask) return;
    updateTask(selectedTask.id, updatedFields);
    setSelectedTask(prev => prev ? { ...prev, ...updatedFields } : null);
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden text-foreground">
      
      {/* Header bar */}
      <div className="p-4 md:p-6 shrink-0 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-muted-foreground" />
            Tasks Planner
          </h1>
          <p className="text-xs text-muted-foreground">
            {tasks.length} total tasks · {tasks.filter(t => t.status === 'in-progress').length} in progress · {tasks.filter(t => t.status === 'done').length} completed
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isGuest ? (
            <Button 
              onClick={() => setIsAddTaskOpen(true)}
              size="sm"
              className="bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 shadow-sm gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Task
            </Button>
          ) : (
            <Badge variant="outline" className="text-muted-foreground border-dashed text-[10px] py-1.5 px-2">
              View-only Guest Access
            </Badge>
          )}

          {/* Custom Tabs */}
          <div className="flex border border-border/60 rounded-md bg-muted/40 p-0.5 text-xs font-semibold">
            <button 
              onClick={() => setView('board')}
              className={cn("px-2.5 py-1 rounded-sm transition-all flex items-center gap-1.5", view === 'board' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </button>
            <button 
              onClick={() => setView('list')}
              className={cn("px-2.5 py-1 rounded-sm transition-all flex items-center gap-1.5", view === 'list' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button 
              onClick={() => setView('timeline')}
              className={cn("px-2.5 py-1 rounded-sm transition-all flex items-center gap-1.5", view === 'timeline' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <Calendar className="w-3.5 h-3.5" /> Timeline
            </button>
            <button 
              onClick={() => setView('workload')}
              className={cn("px-2.5 py-1 rounded-sm transition-all flex items-center gap-1.5", view === 'workload' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <Activity className="w-3.5 h-3.5" /> Workload
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-4 md:px-6 py-2.5 shrink-0 border-b border-border/60 bg-muted/10 flex items-center gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            className="w-full bg-card pl-8 pr-3 py-1.5 border border-border/80 rounded-md text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            placeholder="Search tasks by title, tag, or assignee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Primary Workspace Panels */}
      <div className="flex-1 overflow-hidden p-4 md:p-6">
        <AnimatePresence mode="wait">
          {tasks.length === 0 ? (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="h-full flex flex-col items-center justify-center text-center p-8 bg-card border border-border/80 rounded-2xl max-w-xl mx-auto shadow-sm select-none"
            >
              <div className="relative mb-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-500/10">
                  <CheckSquare className="w-6 h-6 animate-pulse" />
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-indigo-500/10 blur-md -z-10 animate-pulse" />
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                No Tasks Created Yet
              </h3>
              
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-8 max-w-sm leading-relaxed">
                Let your AI Chief of Staff help you map your priorities. Type a task title below to instantly register it, or click a suggestion.
              </p>

              {/* Suggestions */}
              <div className="flex flex-col gap-2.5 w-full mb-8 text-left">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">AI Suggestions</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      addTask({ title: 'Schedule project kickoff sync', status: 'todo', priority: 'medium', dueDate: new Date().toISOString().split('T')[0] });
                      toast.success('Suggested task added!');
                    }}
                    className="p-3 border border-border bg-background hover:bg-muted/40 rounded-xl text-left font-sans transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
                  >
                    • Schedule project kickoff sync
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      addTask({ title: 'Review sprint deliverables', status: 'todo', priority: 'high', dueDate: new Date().toISOString().split('T')[0] });
                      toast.success('Suggested task added!');
                    }}
                    className="p-3 border border-border bg-background hover:bg-muted/40 rounded-xl text-left font-sans transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
                  >
                    • Review sprint deliverables
                  </button>
                </div>
              </div>

              {/* Fast task creation input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const input = form.elements.namedItem('taskTitle') as HTMLInputElement;
                  if (input.value.trim()) {
                    addTask({ title: input.value.trim(), status: 'todo', priority: 'medium', dueDate: new Date().toISOString().split('T')[0] });
                    input.value = '';
                    toast.success('Task created!');
                  }
                }}
                className="w-full flex gap-2"
              >
                <input
                  name="taskTitle"
                  type="text"
                  placeholder="Create task instantly (e.g. Draft Q3 overview)..."
                  className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-foreground"
                />
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-xl border-0 cursor-pointer font-bold flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4 mr-1 text-white" /> Add
                </Button>
              </form>
            </motion.div>
          ) : (
            <>
              {/* BOARD VIEW */}
              {view === 'board' && (
            <motion.div 
              key="board" 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full flex gap-4 overflow-x-auto pb-2 scrollbar-thin"
              data-tutorial="tasks-board"
            >
              {COLUMNS.map(column => {
                const columnTasks = filteredTasks.filter(t => t.status === column.id);
                return (
                  <div key={column.id} className="flex flex-col w-[280px] shrink-0 h-full">
                    <div className={cn(
                      "flex items-center justify-between p-2.5 border-b border-border/60 border-t-2 bg-muted/10 rounded-t-lg",
                      column.color
                    )}>
                      <span className="font-semibold text-xs text-foreground uppercase tracking-wider">{column.title}</span>
                      <span className="text-[10px] bg-muted border border-border px-1.5 py-0.5 rounded-full font-bold text-muted-foreground">
                        {columnTasks.length}
                      </span>
                    </div>

                    <div 
                      className={cn(
                        "flex-1 bg-muted/5 border border-border border-t-0 rounded-b-lg p-2 overflow-y-auto flex flex-col gap-2.5 transition-colors duration-200",
                        dragOverColumn === column.id && "bg-primary/5 border-dashed border-primary/30"
                      )}
                      onDragOver={(e) => e.preventDefault()}
                      onDragEnter={() => !isGuest && setDragOverColumn(column.id)}
                      onDragLeave={() => !isGuest && setDragOverColumn(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (isGuest) return;
                        const taskId = e.dataTransfer.getData('text/plain');
                        if (taskId) {
                          moveTask(taskId, column.id);
                          toast.success(`Task moved to ${column.title}`);
                        }
                        setDragOverColumn(null);
                      }}
                    >
                      {columnTasks.map(task => (
                        <div
                          key={task.id}
                          draggable={!isGuest ? "true" : "false"}
                          onDragStart={(e) => {
                            if (isGuest) {
                              e.preventDefault();
                              return;
                            }
                            e.dataTransfer.setData('text/plain', task.id);
                          }}
                          onClick={() => setSelectedTask(task)}
                          data-context-type="task"
                          data-context-id={task.id}
                          className="bg-card border border-border/80 hover:border-primary/45 hover:scale-[1.015] hover:shadow-md rounded-xl p-3.5 cursor-grab active:cursor-grabbing transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col gap-2 relative group shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="font-medium text-xs text-foreground leading-snug break-words flex-1">{task.title}</h4>
                            <Badge variant="outline" className={cn("text-[9px] scale-90 border-0 uppercase font-bold py-0 px-1 shrink-0", priorityColors[task.priority])}>
                              {task.priority}
                            </Badge>
                          </div>

                          {task.description && (
                            <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {task.tags.map((tag, idx) => (
                                <span key={idx} className="text-[9px] bg-muted/60 text-muted-foreground px-1 py-0.2 rounded border border-border/40">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-border/20 mt-1">
                            <div className="flex items-center gap-1.5">
                              {task.assignee ? (
                                <Avatar className="w-4 h-4 border border-border shrink-0">
                                  <AvatarFallback className="text-[7px] bg-primary/10 text-primary font-bold">
                                    {task.assignee.name.split(' ').map(n=>n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <UserPlus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              )}
                              <span className="text-[9px] text-muted-foreground truncate max-w-[100px]">{task.assignee?.name}</span>
                            </div>

                            {task.dueDate && (
                              <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {format(parseISO(task.dueDate), 'MMM d')}
                              </span>
                            )}
                          </div>

                          {/* Quick movement selectors */}
                          {!isGuest && (
                            <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-0.5 bg-background border border-border rounded shadow-md p-0.5 z-10">
                              {column.id !== 'backlog' && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const idx = COLUMNS.findIndex(c => c.id === column.id);
                                    moveTask(task.id, COLUMNS[idx-1].id);
                                  }}
                                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                  title="Move left"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {column.id !== 'done' && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const idx = COLUMNS.findIndex(c => c.id === column.id);
                                    moveTask(task.id, COLUMNS[idx+1].id);
                                  }}
                                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                  title="Move right"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {columnTasks.length === 0 && (
                        <div className="p-8 text-center border border-dashed border-border rounded-lg text-xs text-muted-foreground opacity-55">
                          No tasks
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* LIST VIEW */}
          {view === 'list' && (
            <motion.div 
              key="list" 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full overflow-y-auto border border-border/80 rounded-xl bg-card"
            >
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    <th className="p-3 w-10">Priority</th>
                    <th className="p-3">Task Title</th>
                    <th className="p-3 w-32">Status</th>
                    <th className="p-3 w-40">Assignee</th>
                    <th className="p-3 w-32">Due Date</th>
                    <th className="p-3 w-36">Budget</th>
                    <th className="p-3 w-28">Est. Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredTasks.map(task => (
                    <tr 
                      key={task.id} 
                      onClick={() => setSelectedTask(task)}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="p-3">
                        <span className={cn("inline-block w-2 h-2 rounded-full", 
                          task.priority === 'urgent' ? 'bg-red-500' :
                          task.priority === 'high' ? 'bg-orange-500' :
                          task.priority === 'medium' ? 'bg-amber-500' : 'bg-stone-400'
                        )} />
                      </td>
                      <td className="p-3 font-medium text-foreground">
                        <div>
                          {task.title}
                          {task.tags && task.tags.length > 0 && (
                            <div className="inline-flex gap-1.5 ml-2.5">
                              {task.tags.map((tag, idx) => (
                                <span key={idx} className="text-[9px] bg-muted/80 text-muted-foreground px-1 py-0.2 rounded font-normal border border-border/40">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[9px] capitalize border-border font-semibold">
                          {task.status.replace('-', ' ')}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {task.assignee ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="w-4 h-4 border border-border">
                              <AvatarFallback className="text-[7px] font-bold bg-primary/10 text-primary">
                                {task.assignee.name.split(' ').map(n=>n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate max-w-[120px]">{task.assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {task.dueDate ? format(parseISO(task.dueDate), 'MMM d, yyyy') : '-'}
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">
                        {task.budget ? `$${task.budget.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">
                        {task.timeEstimate ? `${task.timeEstimate} hrs` : '-'}
                      </td>
                    </tr>
                  ))}

                  {filteredTasks.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground italic">
                        No tasks matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </motion.div>
          )}

          {/* TIMELINE VIEW (GANTT STYLE) */}
          {view === 'timeline' && (
            <motion.div 
              key="timeline" 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full flex flex-col border border-border rounded-xl bg-card overflow-hidden"
            >
              {/* Timeline Header (Month Navigator) */}
              <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Gantt Project Timeline — {format(timelineMonth, 'MMMM yyyy')}
                </h3>
                <div className="flex items-center gap-1 bg-background border border-border/80 rounded p-0.5">
                  <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setTimelineMonth(prev => subMonths(prev, 1))}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] font-semibold px-2" onClick={() => setTimelineMonth(new Date())}>
                    Today
                  </Button>
                  <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setTimelineMonth(prev => addMonths(prev, 1))}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Timeline Grid Container */}
              <div className="flex-1 overflow-auto flex">
                
                {/* Left Task Sidebar (Sticky column) */}
                <div className="w-64 border-r border-border shrink-0 flex flex-col bg-background z-10">
                  <div className="h-9 border-b border-border bg-muted/40 p-2 text-[10px] font-bold text-muted-foreground uppercase flex items-center">
                    Task Title
                  </div>
                  <div className="flex-1 divide-y divide-border">
                    {filteredTasks.map(task => (
                      <div 
                        key={task.id} 
                        onClick={() => setSelectedTask(task)}
                        className="h-10 px-2.5 flex items-center justify-between hover:bg-muted/40 cursor-pointer transition-colors"
                      >
                        <span className="font-medium text-xs truncate mr-2" title={task.title}>{task.title}</span>
                        {task.assignee && (
                          <Avatar className="w-4.5 h-4.5 border border-border shrink-0">
                            <AvatarFallback className="text-[7px] font-bold bg-primary/10 text-primary">
                              {task.assignee.name.split(' ').map(n=>n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                    {filteredTasks.length === 0 && (
                      <div className="p-4 text-center text-xs text-muted-foreground italic">No tasks</div>
                    )}
                  </div>
                </div>

                {/* Right Calendar Grid area */}
                <div className="flex-1 flex flex-col min-w-[700px]">
                  
                  {/* Calendar Days Header */}
                  <div className="h-9 border-b border-border bg-muted/40 flex shrink-0">
                    {eachDayOfInterval({
                      start: startOfMonth(timelineMonth),
                      end: endOfMonth(timelineMonth)
                    }).map((day, idx) => {
                      const isToday = isSameDay(day, new Date());
                      return (
                        <div 
                          key={idx} 
                          className={cn(
                            "flex-1 border-r border-border/40 text-[9px] flex flex-col items-center justify-center font-bold text-muted-foreground min-w-[30px]",
                            isToday && "bg-primary/5 text-primary"
                          )}
                        >
                          <span>{format(day, 'd')}</span>
                          <span className="text-[7px] uppercase font-normal">{format(day, 'E').charAt(0)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Calendar Days Grid Rows */}
                  <div className="flex-1 divide-y divide-border">
                    {filteredTasks.map(task => {
                      const days = eachDayOfInterval({
                        start: startOfMonth(timelineMonth),
                        end: endOfMonth(timelineMonth)
                      });

                      // Construct the bar boundaries
                      let taskStart = task.createdAt ? parseISO(task.createdAt) : new Date();
                      let taskEnd = task.dueDate ? parseISO(task.dueDate) : new Date();

                      if (taskStart > taskEnd) {
                        taskStart = new Date(taskEnd);
                        taskStart.setDate(taskStart.getDate() - 3);
                      }

                      return (
                        <div key={task.id} className="h-10 relative flex">
                          {/* Render cells */}
                          {days.map((day, idx) => {
                            const isToday = isSameDay(day, new Date());
                            const isWithin = isWithinInterval(day, { start: taskStart, end: taskEnd });
                            
                            // Calculate column spans or render directly into cellular positions
                            return (
                              <div 
                                key={idx} 
                                className={cn(
                                  "flex-1 border-r border-border/20 min-w-[30px] h-full flex items-center justify-center",
                                  isToday && "bg-primary/5"
                                )}
                              >
                                {isWithin && (
                                  <div 
                                    onClick={() => setSelectedTask(task)}
                                    className={cn(
                                      "h-4 w-full cursor-pointer hover:opacity-90 transition-all rounded",
                                      task.priority === 'urgent' ? 'bg-red-500/80 border border-red-500' :
                                      task.priority === 'high' ? 'bg-orange-500/80 border border-orange-500' :
                                      task.priority === 'medium' ? 'bg-amber-500/80 border border-amber-500' :
                                      'bg-stone-400/80 border border-stone-400'
                                    )}
                                    title={`${task.title} (Due: ${task.dueDate})`}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                </div>

              </div>
            </motion.div>
          )}

          {/* WORKLOAD VIEW */}
          {view === 'workload' && (
            <motion.div 
              key="workload" 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full overflow-y-auto"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
                {allUsers.map(user => {
                  const activeTasks = tasks.filter(t => t.assignee && t.assignee.id === user.id && t.status !== 'done');
                  const count = activeTasks.length;
                  
                  // Capacity settings (Max target: 5 active tasks)
                  const MAX_CAPACITY = 5;
                  const percent = Math.min((count / MAX_CAPACITY) * 100, 100);
                  
                  // Determine load status
                  const isOverloaded = count > MAX_CAPACITY;
                  const isHeavy = count === MAX_CAPACITY || count === MAX_CAPACITY - 1;
                  
                  return (
                    <div 
                      key={user.id} 
                      className="bg-card border border-border/80 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4"
                    >
                      {/* User details & capacity status */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 border border-border">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                              {user.name.split(' ').map(n=>n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-foreground">{user.name}</span>
                            <span className="text-[10px] text-muted-foreground">{user.role}</span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <span className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded-full border",
                            isOverloaded ? "bg-red-500/10 text-red-600 border-red-500/20" :
                            isHeavy ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                            "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          )}>
                            {count} / {MAX_CAPACITY} Active Tasks
                          </span>
                          <span className="block text-[8px] text-muted-foreground mt-1 uppercase font-bold tracking-wider flex items-center justify-end gap-1">
                            {isOverloaded ? 'Overloaded' : isHeavy ? 'Near capacity' : 'Available'}
                            <img src="https://www.google.com/s2/favicons?domain=asana.com&sz=32" className="w-2.5 h-2.5 object-contain" alt="" />
                          </span>
                        </div>
                      </div>

                      {/* Workload meter progress bar */}
                      <div className="space-y-1">
                        <div className="h-2 w-full bg-muted border border-border/50 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              isOverloaded ? "bg-red-500" : isHeavy ? "bg-amber-500" : "bg-emerald-500"
                            )}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-muted-foreground font-semibold">
                          <span>0 Tasks</span>
                          <span>Max Cap: {MAX_CAPACITY} Tasks</span>
                        </div>
                      </div>

                      {/* Assigned Tasks list */}
                      <div className="mt-1 flex flex-col gap-2">
                        <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Active Tasks</h4>
                        {activeTasks.map(task => (
                          <div 
                            key={task.id}
                            onClick={() => setSelectedTask(task)}
                            className="p-2 border border-border/60 hover:border-primary/20 rounded bg-muted/10 hover:bg-muted/20 cursor-pointer flex items-center justify-between text-xs transition-colors"
                          >
                            <span className="font-semibold text-foreground truncate max-w-[200px]" title={task.title}>{task.title}</span>
                            <Badge variant="outline" className={cn("text-[8px] scale-90 border-0 uppercase py-0 px-1.5 shrink-0 font-bold", priorityColors[task.priority])}>
                              {task.priority}
                            </Badge>
                          </div>
                        ))}
                        {activeTasks.length === 0 && (
                          <span className="text-[10px] text-muted-foreground italic text-center py-4">No active tasks assigned</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
          </>
          )}
        </AnimatePresence>
      </div>

      {/* CREATE TASK DIALOG */}
      <Dialog open={isAddTaskOpen} onOpenChange={handleCloseAddTask}>
        <DialogContent className="sm:max-w-[500px] bg-background border border-border/80 shadow-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Create New Task</DialogTitle>
            <DialogDescription className="text-xs">Add a new action item to the planner workspace.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddTask} className="flex flex-col gap-4 py-2 text-xs">
            <div className="flex flex-col gap-1.5">
              <Label className="uppercase font-semibold text-muted-foreground text-[10px]">Title *</Label>
              <Input 
                type="text" 
                value={newTitle} 
                onChange={e => setNewTitle(e.target.value)} 
                placeholder="e.g. Plan Q3 budget changes"
                className="w-full text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="uppercase font-semibold text-muted-foreground text-[10px]">Description</Label>
              <Textarea 
                value={newDescription} 
                onChange={e => setNewDescription(e.target.value)} 
                placeholder="Details about task objectives..."
                rows={3}
                className="w-full text-xs resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="uppercase font-semibold text-muted-foreground text-[10px]">Status</Label>
                <select 
                  value={newStatus} 
                  onChange={e => setNewStatus(e.target.value as TaskStatus)} 
                  className="w-full bg-card border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="backlog">Backlog</option>
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="uppercase font-semibold text-muted-foreground text-[10px]">Priority</Label>
                <select 
                  value={newPriority} 
                  onChange={e => setNewPriority(e.target.value as Priority)} 
                  className="w-full bg-card border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="uppercase font-semibold text-muted-foreground text-[10px]">Assignee</Label>
                <select 
                  value={newAssigneeId} 
                  onChange={e => setNewAssigneeId(e.target.value)} 
                  className="w-full bg-card border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select teammate</option>
                  {allUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="uppercase font-semibold text-muted-foreground text-[10px]">Due Date</Label>
                <Input 
                  type="date" 
                  value={newDueDate} 
                  onChange={e => setNewDueDate(e.target.value)} 
                  className="w-full text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="uppercase font-semibold text-muted-foreground text-[10px]">Budget ($)</Label>
                <Input 
                  type="number" 
                  value={newBudget || ''} 
                  onChange={e => setNewBudget(Number(e.target.value))} 
                  placeholder="e.g. 5000"
                  className="w-full text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="uppercase font-semibold text-muted-foreground text-[10px]">Estimate (Hours)</Label>
                <Input 
                  type="number" 
                  value={newTimeEstimate || ''} 
                  onChange={e => setNewTimeEstimate(Number(e.target.value))} 
                  placeholder="e.g. 12"
                  className="w-full text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="uppercase font-semibold text-muted-foreground text-[10px]">Tags (comma separated)</Label>
              <Input 
                type="text" 
                value={newTagsString} 
                onChange={e => setNewTagsString(e.target.value)} 
                placeholder="e.g. marketing, digital, design"
                className="w-full text-xs"
              />
            </div>

            <DialogFooter className="mt-2 flex gap-2">
              <Button type="button" variant="ghost" onClick={handleCloseAddTask}>Cancel</Button>
              <Button 
                type="submit" 
                className="bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 shadow-sm"
              >
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* TASK DETAILS / EDIT DIALOG */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-[600px] bg-background border border-border shadow-lg rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between w-full">
              <span>Task Settings</span>
              {selectedTask && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    deleteTask(selectedTask.id);
                    setSelectedTask(null);
                    toast.success('Task deleted successfully');
                  }}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 w-8 h-8 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">Examine advanced configurations, log metrics, or link blockers.</DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="flex flex-col gap-5 py-2 text-xs">
              
              {/* Title & Description */}
              <div className="flex flex-col gap-3">
                <input 
                  type="text"
                  value={selectedTask.title}
                  onChange={(e) => handleUpdateTaskDetail({ title: e.target.value })}
                  className="text-base font-bold bg-transparent border-0 border-b border-transparent hover:border-border/60 focus:border-primary/60 w-full focus:outline-none py-1 text-foreground"
                />
                
                <div className="flex flex-col gap-1">
                  <Label className="uppercase font-semibold text-muted-foreground text-[9px]">Description</Label>
                  <textarea
                    value={selectedTask.description || ''}
                    onChange={(e) => handleUpdateTaskDetail({ description: e.target.value })}
                    rows={3}
                    placeholder="Details about task objectives..."
                    className="w-full bg-card border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary text-xs resize-none text-foreground"
                  />
                </div>
              </div>

              {/* Status, Priority, Assignee, Due Date */}
              <div className="grid grid-cols-2 gap-4 border-y border-border/40 py-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="uppercase font-semibold text-muted-foreground text-[9px] flex items-center gap-1"><Activity className="w-3 h-3 text-muted-foreground" /> Status</Label>
                  <select 
                    value={selectedTask.status} 
                    onChange={e => handleUpdateTaskDetail({ status: e.target.value as TaskStatus })} 
                    className="w-full bg-card border border-border rounded px-2.5 py-1.5 focus:outline-none text-foreground"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">In Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="uppercase font-semibold text-muted-foreground text-[9px] flex items-center gap-1"><BarChart2 className="w-3 h-3 text-muted-foreground" /> Priority</Label>
                  <select 
                    value={selectedTask.priority} 
                    onChange={e => handleUpdateTaskDetail({ priority: e.target.value as Priority })} 
                    className="w-full bg-card border border-border rounded px-2.5 py-1.5 focus:outline-none text-foreground"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="uppercase font-semibold text-muted-foreground text-[9px] flex items-center gap-1"><UserPlus className="w-3 h-3 text-muted-foreground" /> Assignee</Label>
                  <select 
                    value={selectedTask.assignee?.id || ''} 
                    onChange={e => {
                      const foundUser = allUsers.find(u => u.id === e.target.value);
                      if (foundUser) handleUpdateTaskDetail({ assignee: foundUser });
                    }} 
                    className="w-full bg-card border border-border rounded px-2.5 py-1.5 focus:outline-none text-foreground"
                  >
                    {allUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="uppercase font-semibold text-muted-foreground text-[9px] flex items-center gap-1"><Calendar className="w-3 h-3 text-muted-foreground" /> Due Date</Label>
                  <input
                    type="date"
                    value={selectedTask.dueDate || ''}
                    onChange={(e) => handleUpdateTaskDetail({ dueDate: e.target.value })}
                    className="w-full bg-card border border-border rounded px-2.5 py-1.5 focus:outline-none text-foreground"
                  />
                </div>
              </div>

              {/* Advanced metrics section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 bg-muted/10 border border-border/60 rounded-lg p-3">
                  <span className="uppercase font-bold text-muted-foreground text-[9px] flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-muted-foreground" /> Budget Limit
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-muted-foreground font-semibold">$</span>
                    <input 
                      type="number"
                      value={selectedTask.budget || 0}
                      onChange={(e) => handleUpdateTaskDetail({ budget: Number(e.target.value) })}
                      className="bg-transparent border-0 border-b border-transparent hover:border-border/60 focus:border-primary/60 focus:outline-none font-mono font-bold w-full text-foreground"
                      placeholder="No budget"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 bg-muted/10 border border-border/60 rounded-lg p-3">
                  <span className="uppercase font-bold text-muted-foreground text-[9px] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Time Estimate
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    <input 
                      type="number"
                      value={selectedTask.timeEstimate || 0}
                      onChange={(e) => handleUpdateTaskDetail({ timeEstimate: Number(e.target.value) })}
                      className="bg-transparent border-0 border-b border-transparent hover:border-border/60 focus:border-primary/60 focus:outline-none font-mono font-bold w-full text-foreground"
                      placeholder="Estimate hours"
                    />
                    <span className="text-muted-foreground text-[10px]">Hours</span>
                  </div>
                </div>
              </div>

              {/* Subtasks Checklist */}
              <div className="flex flex-col gap-2">
                <Label className="uppercase font-bold text-muted-foreground text-[9px] flex items-center gap-1">
                  <CheckSquare className="w-3.5 h-3.5 text-muted-foreground" /> Subtasks Checklist
                </Label>
                
                <div className="flex flex-col gap-2 bg-muted/5 border border-border rounded-lg p-3">
                  {selectedTask.subtasks && selectedTask.subtasks.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={sub.completed}
                          onChange={(e) => {
                            const updated = selectedTask.subtasks.map(s => 
                              s.id === sub.id ? { ...s, completed: e.target.checked } : s
                            );
                            handleUpdateTaskDetail({ subtasks: updated });
                          }}
                          className="w-3.5 h-3.5 rounded bg-card border-border"
                        />
                        <span className={cn("text-xs", sub.completed && "line-through text-muted-foreground")}>
                          {sub.text}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          const updated = selectedTask.subtasks.filter(s => s.id !== sub.id);
                          handleUpdateTaskDetail({ subtasks: updated });
                        }}
                        className="text-muted-foreground hover:text-red-500 p-0.5 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add subtask input */}
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      placeholder="Add subtask details..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          const newSub = {
                            id: `sub-${Date.now()}`,
                            text: e.currentTarget.value.trim(),
                            completed: false
                          };
                          const updated = [...(selectedTask.subtasks || []), newSub];
                          handleUpdateTaskDetail({ subtasks: updated });
                          e.currentTarget.value = '';
                        }
                      }}
                      className="w-full bg-card border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Task Block Dependencies */}
              <div className="flex flex-col gap-2 border-t border-border/40 pt-4">
                <Label className="uppercase font-bold text-muted-foreground text-[9px] flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground" /> Task Dependencies
                </Label>
                
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Blocks block */}
                  <div className="flex flex-col gap-1.5 bg-muted/10 border border-border/40 rounded p-2.5">
                    <span className="font-bold text-[10px] text-foreground">Blocks</span>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const currBlocks = selectedTask.dependencies?.blocks || [];
                        if (!currBlocks.includes(val)) {
                          handleUpdateTaskDetail({
                            dependencies: {
                              blocks: [...currBlocks, val],
                              blockedBy: selectedTask.dependencies?.blockedBy || []
                            }
                          });
                        }
                        e.target.value = '';
                      }}
                      className="bg-card border border-border rounded px-2 py-1 mt-1 text-[10px] text-foreground"
                    >
                      <option value="">Add task to block list...</option>
                      {tasks.filter(t => t.id !== selectedTask.id).map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                    
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedTask.dependencies?.blocks?.map(blockId => {
                        const target = tasks.find(t => t.id === blockId);
                        return (
                          <Badge key={blockId} variant="secondary" className="text-[9px] gap-1 px-1.5 py-0.5">
                            {target ? target.title : 'Task'}
                            <X 
                              className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-foreground" 
                              onClick={() => {
                                handleUpdateTaskDetail({
                                  dependencies: {
                                    blocks: (selectedTask.dependencies?.blocks || []).filter(id => id !== blockId),
                                    blockedBy: selectedTask.dependencies?.blockedBy || []
                                  }
                                });
                              }}
                            />
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  {/* Blocked by block */}
                  <div className="flex flex-col gap-1.5 bg-muted/10 border border-border/40 rounded p-2.5">
                    <span className="font-bold text-[10px] text-foreground">Blocked By</span>
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const currBlockedBy = selectedTask.dependencies?.blockedBy || [];
                        if (!currBlockedBy.includes(val)) {
                          handleUpdateTaskDetail({
                            dependencies: {
                              blocks: selectedTask.dependencies?.blocks || [],
                              blockedBy: [...currBlockedBy, val]
                            }
                          });
                        }
                        e.target.value = '';
                      }}
                      className="bg-card border border-border rounded px-2 py-1 mt-1 text-[10px] text-foreground"
                    >
                      <option value="">Add blocker task...</option>
                      {tasks.filter(t => t.id !== selectedTask.id).map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedTask.dependencies?.blockedBy?.map(blockerId => {
                        const target = tasks.find(t => t.id === blockerId);
                        return (
                          <Badge key={blockerId} variant="secondary" className="text-[9px] gap-1 px-1.5 py-0.5">
                            {target ? target.title : 'Task'}
                            <X 
                              className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-foreground" 
                              onClick={() => {
                                handleUpdateTaskDetail({
                                  dependencies: {
                                    blocks: selectedTask.dependencies?.blocks || [],
                                    blockedBy: (selectedTask.dependencies?.blockedBy || []).filter(id => id !== blockerId)
                                  }
                                });
                              }}
                            />
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>

              {/* Close Button */}
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={() => setSelectedTask(null)}
                  className="bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 shadow-sm text-xs px-4"
                >
                  Done
                </Button>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}