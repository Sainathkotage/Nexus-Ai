// components/tasks/kanban-board.tsx
'use client';

import React from 'react';
import { Task, TaskStatus } from '@/types';
import { TaskCard } from './task-card';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTaskCard } from './sortable-task-card';
import { useState } from 'react';
import { createPortal } from 'react-dom';

interface KanbanBoardProps {
  tasks: Task[];
  onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
}

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'todo', title: 'To Do', color: 'bg-slate-100 dark:bg-slate-800' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-100 dark:bg-blue-900/20' },
  { id: 'done', title: 'Done', color: 'bg-green-100 dark:bg-green-900/20' },
];

export function KanbanBoard({ tasks, onMoveTask, onDeleteTask }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveTask(null);
      return;
    }

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    // Check if dropped over a column
    if (COLUMNS.some(col => col.id === newStatus)) {
      onMoveTask(taskId, newStatus);
    }

    setActiveTask(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full overflow-x-auto">
        <div className="inline-flex gap-4 h-full min-w-full pb-4">
          {COLUMNS.map((column) => {
            const columnTasks = tasks.filter(task => task.status === column.id);
            
            return (
              <SortableContext
                key={column.id}
                items={columnTasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col w-80 shrink-0 h-full">
                  {/* Column Header */}
                  <div className={`p-3 rounded-t-lg ${column.color} border border-border`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">{column.title}</h3>
                      <span className="text-xs bg-background px-2 py-0.5 rounded-full">
                        {columnTasks.length}
                      </span>
                    </div>
                  </div>

                  {/* Drop Zone */}
                  <div 
                    className="flex-1 p-3 space-y-3 bg-muted/30 rounded-b-lg border border-t-0 border-border overflow-y-auto min-h-[200px]"
                    data-column={column.id}
                  >
                    {columnTasks.map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        onMove={onMoveTask}
                        onDelete={onDeleteTask}
                      />
                    ))}
                    {columnTasks.length === 0 && (
                      <div className="text-center text-muted-foreground text-sm py-8">
                        Drop tasks here
                      </div>
                    )}
                  </div>
                </div>
              </SortableContext>
            );
          })}
        </div>
      </div>

      {/* Drag Overlay */}
      {typeof window !== 'undefined' && createPortal(
        <DragOverlay>
          {activeTask && (
            <div className="rotate-3 opacity-80">
              <TaskCard 
                task={activeTask} 
                onMove={onMoveTask}
                onDelete={onDeleteTask}
              />
            </div>
          )}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}