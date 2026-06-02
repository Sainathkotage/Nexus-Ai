'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '@/lib/store';
import { 
  FileText, CheckSquare, Briefcase, Calendar, 
  Trash2, Settings, Sparkles, MessageSquare, Star
} from 'lucide-react';
import { toast } from 'sonner';

export function CustomContextMenu() {
  const { 
    deleteTask, deleteDocument, deleteDeal, deleteCalendarEvent,
    toggleStarChannel, setActivePage, setCommandPaletteOpen, 
    channels, documents, calendarEvents,
    setSelectedTaskId, setSelectedDealId, setSelectedDocumentId,
    setActiveChannelId, setActiveDmUserId, setSelectedDate
  } = useWorkspace();

  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [context, setContext] = useState<{ type: string; id: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Find closest element with data-context-type attribute
      let target = e.target as HTMLElement | null;
      let foundContext = null;

      while (target && target !== document.body) {
        const type = target.getAttribute('data-context-type');
        const id = target.getAttribute('data-context-id');
        if (type && id) {
          foundContext = { type, id };
          break;
        }
        target = target.parentElement;
      }

      e.preventDefault();
      setContext(foundContext);
      setPosition({ x: e.clientX, y: e.clientY });
      setVisible(true);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };

    const handleScroll = () => {
      setVisible(false);
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  if (!visible) return null;

  // Reposition menu if it goes off-screen
  let posX = position.x;
  let posY = position.y;
  if (typeof window !== 'undefined') {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const menuW = 180;
    const menuH = 220;

    if (posX + menuW > screenW) posX = screenW - menuW - 10;
    if (posY + menuH > screenH) posY = screenH - menuH - 10;
  }

  // Handle actions
  const handleAction = async (action: string) => {
    setVisible(false);
    if (!context) {
      // Global actions
      if (action === 'add-task') {
        setSelectedTaskId('new');
        setActivePage('tasks');
      } else if (action === 'add-doc') {
        setSelectedDocumentId('new');
        setActivePage('documents');
      } else if (action === 'add-deal') {
        setSelectedDealId('new');
        setActivePage('crm');
      } else if (action === 'settings') {
        setActivePage('settings');
      }
      return;
    }

    const { type, id } = context;

    try {
      if (type === 'task') {
        if (action === 'delete') {
          deleteTask(id);
          toast.success('Task deleted successfully');
        } else if (action === 'comment') {
          setSelectedTaskId(id);
          setActivePage('tasks');
        }
      } else if (type === 'document') {
        if (action === 'delete') {
          deleteDocument(id);
          toast.success('Document deleted successfully');
        } else if (action === 'summarize') {
          const doc = documents.find(d => d.id === id);
          localStorage.setItem('nexus_pending_action', JSON.stringify({
            documentId: id,
            prompt: `Please summarize the document: "${doc?.title || 'Selected file'}"`
          }));
          setActivePage('chat');
        } else if (action === 'open') {
          setSelectedDocumentId(id);
          setActivePage('documents');
        }
      } else if (type === 'deal') {
        if (action === 'delete') {
          await deleteDeal(id);
          toast.success('Deal deleted successfully');
        } else if (action === 'open') {
          setActivePage('crm');
        }
      } else if (type === 'event') {
        if (action === 'delete') {
          deleteCalendarEvent(id);
          toast.success('Calendar event deleted successfully');
        } else if (action === 'open') {
          const ev = calendarEvents.find(e => e.id === id);
          if (ev && ev.date) {
            setSelectedDate(new Date(ev.date));
          }
          setActivePage('calendar');
        }
      } else if (type === 'channel') {
        if (action === 'star') {
          toggleStarChannel(id);
          const ch = channels.find(c => c.id === id);
          toast.success(ch?.starredBy ? 'Channel unstarred' : 'Channel starred');
        } else if (action === 'open') {
          setActiveChannelId(id);
          setActiveDmUserId(null);
          setActivePage('team-chat');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    }
  };

  const itemClass = "w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] text-foreground font-medium rounded transition-colors text-left cursor-pointer";

  return (
    <div 
      ref={menuRef}
      style={{ top: posY, left: posX }}
      className="fixed z-[9999] bg-white/95 dark:bg-[#1c1c1c]/95 border border-border/80 dark:border-border/30 shadow-lg rounded-xl p-1 w-[180px] backdrop-blur-sm select-none"
    >
      {context ? (
        <div className="flex flex-col">
          <div className="px-2.5 py-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider select-none border-b border-border/40 pb-1 mb-1">
            {context.type} options
          </div>

          {context.type === 'task' && (
            <>
              <button onClick={() => handleAction('comment')} className={itemClass}>
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                <span>Open Task Details</span>
              </button>
              <button onClick={() => handleAction('delete')} className={`${itemClass} hover:text-red-600 dark:hover:text-red-400`}>
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>Delete Task</span>
              </button>
            </>
          )}

          {context.type === 'document' && (
            <>
              <button onClick={() => handleAction('open')} className={itemClass}>
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span>Open Document</span>
              </button>
              <button onClick={() => handleAction('summarize')} className={itemClass}>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Summarize with AI</span>
              </button>
              <button onClick={() => handleAction('delete')} className={`${itemClass} hover:text-red-600 dark:hover:text-red-400`}>
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>Delete File</span>
              </button>
            </>
          )}

          {context.type === 'deal' && (
            <>
              <button onClick={() => handleAction('open')} className={itemClass}>
                <Briefcase className="w-3.5 h-3.5 text-purple-500" />
                <span>Open CRM Board</span>
              </button>
              <button onClick={() => handleAction('delete')} className={`${itemClass} hover:text-red-600 dark:hover:text-red-400`}>
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>Delete Deal</span>
              </button>
            </>
          )}

          {context.type === 'event' && (
            <>
              <button onClick={() => handleAction('open')} className={itemClass}>
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>Open in Calendar</span>
              </button>
              <button onClick={() => handleAction('delete')} className={`${itemClass} hover:text-red-600 dark:hover:text-red-400`}>
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>Delete Event</span>
              </button>
            </>
          )}

          {context.type === 'channel' && (
            <>
              <button onClick={() => handleAction('open')} className={itemClass}>
                <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                <span>Open Channel</span>
              </button>
              <button onClick={() => handleAction('star')} className={itemClass}>
                <Star className="w-3.5 h-3.5 text-yellow-500" />
                <span>Star / Unstar</span>
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="px-2.5 py-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider select-none border-b border-border/40 pb-1 mb-1">
            Global shortcuts
          </div>
          <button onClick={() => handleAction('add-task')} className={itemClass}>
            <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
            <span>Create Task</span>
          </button>
          <button onClick={() => handleAction('add-doc')} className={itemClass}>
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span>Upload Document</span>
          </button>
          <button onClick={() => handleAction('add-deal')} className={itemClass}>
            <Briefcase className="w-3.5 h-3.5 text-purple-500" />
            <span>Add CRM Deal</span>
          </button>
          <div className="border-t border-border/40 my-1" />
          <button onClick={() => handleAction('settings')} className={itemClass}>
            <Settings className="w-3.5 h-3.5 text-zinc-500" />
            <span>Go to Settings</span>
          </button>
        </div>
      )}
    </div>
  );
}
