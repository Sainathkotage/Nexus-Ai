'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useWorkspace } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  Search, FileText, CheckSquare, Calendar, Mail,
  MessageSquare, Settings, LayoutDashboard, Plus,
  Sparkles, ArrowRight, Hash, Users
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandItem {
  id: string;
  label: string;
  icon: React.ElementType;
  hint?: string;
  group: string;
  action: () => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const { documents, tasks, setActivePage } = useWorkspace();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const navigate = useCallback((page: string, route: string) => {
    setActivePage(page as any);
    router.push(route);
    onOpenChange(false);
  }, [setActivePage, router, onOpenChange]);

  const allItems = useMemo<CommandItem[]>(() => {
    const navItems: CommandItem[] = [
      { id: 'nav-dashboard', label: 'Dashboard', icon: LayoutDashboard, hint: 'Home', group: 'Navigation', action: () => navigate('dashboard', '/') },
      { id: 'nav-documents', label: 'Documents', icon: FileText, hint: 'Files', group: 'Navigation', action: () => navigate('documents', '/documents') },
      { id: 'nav-chat', label: 'AI Chat', icon: MessageSquare, hint: 'Ask AI', group: 'Navigation', action: () => navigate('chat', '/chat') },
      { id: 'nav-team-chat', label: 'Team Chat', icon: Users, hint: 'Direct Messages', group: 'Navigation', action: () => navigate('team-chat', '/team-chat') },
      { id: 'nav-tasks', label: 'Tasks', icon: CheckSquare, hint: 'To-dos', group: 'Navigation', action: () => navigate('tasks', '/tasks') },
      { id: 'nav-calendar', label: 'Calendar', icon: Calendar, hint: 'Schedule', group: 'Navigation', action: () => navigate('calendar', '/calendar') },
      { id: 'nav-emails', label: 'Emails', icon: Mail, hint: 'Inbox', group: 'Navigation', action: () => navigate('emails', '/emails') },
      { id: 'nav-settings', label: 'Settings', icon: Settings, hint: 'Preferences', group: 'Navigation', action: () => navigate('settings', '/settings') },
    ];

    const actionItems: CommandItem[] = [
      { id: 'action-new-doc', label: 'Upload Document', icon: Plus, hint: 'PDF, TXT', group: 'Quick Actions', action: () => navigate('documents', '/documents') },
      { id: 'action-new-task', label: 'New Task', icon: Plus, hint: 'Create', group: 'Quick Actions', action: () => navigate('tasks', '/tasks') },
      { id: 'action-ask-ai', label: 'Ask AI Assistant', icon: Sparkles, hint: 'Chat', group: 'Quick Actions', action: () => navigate('chat', '/chat') },
      { id: 'action-new-email', label: 'Compose Email', icon: Mail, hint: 'Write', group: 'Quick Actions', action: () => navigate('emails', '/emails') },
    ];

    const docItems: CommandItem[] = documents.map(doc => ({
      id: `doc-${doc.id}`,
      label: doc.title,
      icon: FileText,
      hint: doc.type.toUpperCase(),
      group: 'Documents',
      action: () => navigate('documents', '/documents'),
    }));

    const taskItems: CommandItem[] = tasks.slice(0, 8).map(task => ({
      id: `task-${task.id}`,
      label: task.title,
      icon: CheckSquare,
      hint: task.status,
      group: 'Tasks',
      action: () => navigate('tasks', '/tasks'),
    }));

    return [...navItems, ...actionItems, ...docItems, ...taskItems];
  }, [documents, tasks, navigate]);

  const filtered = useMemo(() => {
    if (!query.trim()) {
      return allItems.filter(item => item.group === 'Navigation' || item.group === 'Quick Actions');
    }
    const q = query.toLowerCase();
    return allItems.filter(item => 
      item.label.toLowerCase().includes(q) || 
      item.hint?.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q)
    );
  }, [query, allItems]);

  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filtered.forEach(item => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    });
    return groups;
  }, [filtered]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-[560px] shadow-notion border-border overflow-hidden [&>button]:hidden">
        <div onKeyDown={handleKeyDown}>
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search or jump to..."
              className="flex-1 py-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              autoComplete="off"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-xs text-muted-foreground hover:text-foreground">
                Clear
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-[360px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No results found for &quot;{query}&quot;
              </div>
            ) : (
              Object.entries(grouped).map(([group, items]) => (
                <div key={group}>
                  <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                    {group}
                  </div>
                  {items.map((item) => {
                    const globalIndex = filtered.indexOf(item);
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={cn(
                          "w-full px-3 py-2 flex items-center gap-3 rounded-md mx-1 cursor-pointer text-left",
                          "transition-colors duration-75",
                          globalIndex === selectedIndex
                            ? "bg-accent text-foreground"
                            : "text-foreground hover:bg-accent/50"
                        )}
                        style={{ width: 'calc(100% - 8px)' }}
                      >
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate flex-1">{item.label}</span>
                        {item.hint && (
                          <span className="text-xs text-muted-foreground shrink-0">{item.hint}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border text-[11px] text-muted-foreground flex items-center gap-4">
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
            <span>esc Close</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
