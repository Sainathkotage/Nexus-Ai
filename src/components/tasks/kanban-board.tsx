'use client';

import React from 'react';
import { Task, TaskStatus } from '@/types';
import { TaskCard } from './task-card';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KanbanBoardProps {
  tasks: Task[];
  onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
}

const columns: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'backlog', label: 'Backlog', color: 'border-t-gray-500' },
  { id: 'todo', label: 'To Do', color: 'border-t-blue-500' },
  { id: 'in-progress', label: 'In Progress', color: 'border-t-amber-500' },
  { id: 'review', label: 'In Review', color: 'border-t-purple-500' },
  { id: 'done', label: 'Done', color: 'border-t-emerald-500' },
];

export function KanbanBoard({ tasks, onMoveTask }: KanbanBoardProps) {
  return (
    <div className="flex h-full gap-4 overflow-x-auto pb-4 px-1">
      {columns.map((column) => {
        const columnTasks = tasks.filter((t) => t.status === column.id);

        return (
          <div key={column.id} className="flex flex-col w-[320px] shrink-0 h-full max-h-full">
            
            {/* Column Header */}
            <div className={cn(
              "flex items-center justify-between p-3 bg-muted/30 rounded-t-xl border border-b-0 border-border border-t-4 mb-0",
              column.color
            )}>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">{column.label}</h3>
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  {columnTasks.length}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="w-6 h-6 rounded-md hover:bg-muted text-muted-foreground">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Column Body */}
            <div className="flex-1 bg-muted/10 border border-border rounded-b-xl p-3 overflow-y-auto flex flex-col gap-3">
              <AnimatePresence>
                {columnTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layoutId={task.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TaskCard task={task} onMove={onMoveTask} />
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {columnTasks.length === 0 && (
                <div className="h-24 border-2 border-dashed border-border rounded-xl flex items-center justify-center opacity-50">
                  <span className="text-xs font-medium text-muted-foreground">No tasks</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
