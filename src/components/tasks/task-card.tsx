'use client';

import React from 'react';
import { Task, TaskStatus } from '@/types';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Clock, FileText, ChevronRight, ChevronLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface TaskCardProps {
  task: Task;
  onMove?: (taskId: string, newStatus: TaskStatus) => void;
}

export function TaskCard({ task, onMove }: TaskCardProps) {
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-primary';
    }
  };

  const statusOrder: TaskStatus[] = ['backlog', 'todo', 'in-progress', 'review', 'done'];
  const currentIndex = statusOrder.indexOf(task.status);
  
  const prevStatus = currentIndex > 0 ? statusOrder[currentIndex - 1] : null;
  const nextStatus = currentIndex < statusOrder.length - 1 ? statusOrder[currentIndex + 1] : null;

  const isOverdue = task.dueDate ? new Date(task.dueDate) < new Date() && task.status !== 'done' : false;

  return (
    <div className="group relative glass rounded-xl p-4 shadow-notion hover:shadow-lg transition-apple hover:-translate-y-0.5 flex flex-col gap-3">
      
      {/* Priority & Title */}
      <div className="flex items-start gap-2">
        <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", getPriorityColor(task.priority))} />
        <h4 className="font-medium text-sm leading-snug">{task.title}</h4>
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-4">
          {task.tags.map((tag, i) => (
            <span key={i} className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer (Avatar, Date, Source) */}
      <div className="flex items-center justify-between pt-2 mt-auto pl-4">
        <div className="flex items-center gap-2">
          {task.assignee ? (
            <Avatar className="w-5 h-5 border border-border">
              <AvatarImage src={task.assignee.avatar} />
              <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{task.assignee.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-5 h-5 rounded-full border border-dashed border-border flex items-center justify-center bg-muted/50">
              <span className="text-[8px] text-muted-foreground">?</span>
            </div>
          )}
          
          {task.dueDate && (
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-sm",
              isOverdue ? "bg-red-500/10 text-red-600" : "text-muted-foreground bg-muted/50"
            )}>
              <Clock className="w-3 h-3" />
              {format(new Date(task.dueDate), 'MMM d')}
            </div>
          )}
        </div>

        {task.sourceDocument && (
          <div className="flex flex-col gap-1 items-end">
             <div className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center" title={`Linked to: ${task.sourceDocument.title}`}>
              <FileText className="w-3 h-3" />
            </div>
          </div>
        )}
      </div>

      {/* Hover Action Buttons */}
      {onMove && (
        <div className="absolute inset-y-0 right-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity pr-2">
          <div className="flex flex-col gap-1 bg-background/80 backdrop-blur-sm p-1 rounded-lg border border-border shadow-sm">
            {prevStatus && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-6 h-6 rounded-md hover:bg-muted"
                onClick={() => onMove(task.id, prevStatus)}
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
            )}
            {nextStatus && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-6 h-6 rounded-md hover:bg-muted"
                onClick={() => onMove(task.id, nextStatus)}
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
