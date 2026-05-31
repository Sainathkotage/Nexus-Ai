'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useWorkspace } from '@/lib/store';
import { Task, TaskStatus } from '@/types';
import { ArrowUpDown, ArrowUp, ArrowDown, Calendar, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Status config ───────────────────────────────────────────
const STATUS_CONFIG: Record<TaskStatus, { label: string; className: string }> = {
  backlog: { label: 'Backlog', className: 'bg-gray-100 text-gray-700' },
  todo: { label: 'Todo', className: 'bg-blue-100 text-blue-700' },
  'in-progress': { label: 'In Progress', className: 'bg-amber-100 text-amber-700' },
  review: { label: 'Review', className: 'bg-purple-100 text-purple-700' },
  done: { label: 'Done', className: 'bg-emerald-100 text-emerald-700' },
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-gray-400',
};

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

type SortKey = 'priority' | 'title' | 'status' | 'assignee' | 'dueDate';
type SortDir = 'asc' | 'desc';

export default function ListView() {
  const { tasks, moveTask } = useWorkspace();
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'priority':
          cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'status': {
          const statusOrder: TaskStatus[] = ['backlog', 'todo', 'in-progress', 'review', 'done'];
          cmp = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
          break;
        }
        case 'assignee':
          cmp = a.assignee.name.localeCompare(b.assignee.name);
          break;
        case 'dueDate':
          cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [tasks, sortKey, sortDir]);

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-foreground" />
    ) : (
      <ArrowDown className="h-3 w-3 text-foreground" />
    );
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDueDateColor = (dateStr: string) => {
    const now = new Date();
    const due = new Date(dateStr);
    const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return 'text-red-600';
    if (daysUntil <= 3) return 'text-amber-600';
    return 'text-muted-foreground';
  };

  const columns: { key: SortKey; label: string; width: string }[] = [
    { key: 'priority', label: '', width: 'w-10' },
    { key: 'title', label: 'Title', width: 'flex-1 min-w-[200px]' },
    { key: 'status', label: 'Status', width: 'w-[120px]' },
    { key: 'assignee', label: 'Assignee', width: 'w-[160px]' },
    { key: 'dueDate', label: 'Due Date', width: 'w-[120px]' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-border/60 bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60 bg-muted/30">
        {columns.map((col) => (
          <button
            key={col.key}
            onClick={() => handleSort(col.key)}
            className={cn(
              'flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors select-none',
              col.width
            )}
          >
            {col.label}
            <SortIcon columnKey={col.key} />
          </button>
        ))}
        {/* Tags column header (not sortable) */}
        <div className="w-[150px] text-xs font-medium text-muted-foreground">Tags</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/40">
        <AnimatePresence mode="popLayout">
          {sortedTasks.map((task, idx) => (
            <TaskRow
              key={task.id}
              task={task}
              index={idx}
              getInitials={getInitials}
              formatDate={formatDate}
              getDueDateColor={getDueDateColor}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function TaskRow({
  task,
  index,
  getInitials,
  formatDate,
  getDueDateColor,
}: {
  task: Task;
  index: number;
  getInitials: (name: string) => string;
  formatDate: (date: string) => string;
  getDueDateColor: (date: string) => string;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, delay: index * 0.02 }}
      className="flex items-center gap-2 px-4 py-3 hover:bg-muted/30 transition-colors cursor-default group"
    >
      {/* Priority Dot */}
      <div className="w-10 flex justify-center">
        <div className={cn('h-2.5 w-2.5 rounded-full', PRIORITY_COLORS[task.priority])} />
      </div>

      {/* Title */}
      <div className="flex-1 min-w-[200px]">
        <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
        {task.sourceDocument && (
          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
            <FileText className="h-2.5 w-2.5" />
            <span className="truncate max-w-[180px]">{task.sourceDocument.title}</span>
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="w-[120px]">
        <span
          className={cn(
            'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium',
            STATUS_CONFIG[task.status].className
          )}
        >
          {STATUS_CONFIG[task.status].label}
        </span>
      </div>

      {/* Assignee */}
      <div className="w-[160px] flex items-center gap-2">
        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-foreground border border-border text-[10px] font-semibold shrink-0">
          {getInitials(task.assignee.name)}
        </div>
        <span className="text-sm text-foreground truncate">{task.assignee.name}</span>
      </div>

      {/* Due Date */}
      <div className={cn('w-[120px] flex items-center gap-1 text-sm', getDueDateColor(task.dueDate))}>
        <Calendar className="h-3.5 w-3.5" />
        <span>{formatDate(task.dueDate)}</span>
      </div>

      {/* Tags */}
      <div className="w-[150px] flex flex-wrap gap-1">
        {task.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
          >
            {tag}
          </span>
        ))}
        {task.tags.length > 2 && (
          <span className="text-[10px] text-muted-foreground">+{task.tags.length - 2}</span>
        )}
      </div>
    </motion.div>
  );
}
