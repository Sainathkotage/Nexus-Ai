'use client';

import React, { useState, useEffect } from 'react';
import { useWorkspace } from '@/lib/store';
import { useTutorial } from '@/lib/tutorial-context';
import { 
  PanelLeft, PanelRight, Search, Bell, Sun, Moon, 
  ChevronRight, Menu, Star, MoreHorizontal, Play, Check, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function TopBar() {
  const { 
    toggleLeftSidebar, 
    toggleRightSidebar, 
    theme, 
    toggleTheme,
    activePage,
    leftSidebarOpen,
    isOnline,
    userStatus,
    setUserStatus,
    activeTimerTask,
    isTimerRunning,
    timerElapsed,
    startTimer,
    pauseTimer,
    resetTimer,
    logTimer,
    notifications,
    markNotificationsAsRead,
    reviewJoinRequest
  } = useWorkspace();

  const { trackInteractiveAction } = useTutorial();

  const [time, setTime] = useState('');
  const [localTaskName, setLocalTaskName] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const hasUnread = (notifications || []).some(n => !n.read);
 
  useEffect(() => {
    const update = () => setTime(format(new Date(), 'h:mm a'));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeTimerTask) {
      setLocalTaskName('');
    } else {
      setLocalTaskName(activeTimerTask);
    }
  }, [activeTimerTask]);

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const pageNames: Record<string, string> = {
    dashboard: 'Dashboard',
    documents: 'Documents',
    chat: 'AI Chat',
    'team-chat': 'Team Chat',
    whiteboard: 'Whiteboard',
    crm: 'CRM Deals',
    tasks: 'Tasks',
    calendar: 'Calendar',
    emails: 'Emails',
    settings: 'Settings',
    'ai-handover': 'AI Handover',
  };

  return (
    <header className="h-11 border-b border-white/10 dark:border-white/5 bg-background/45 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-20 shrink-0">
      
      {/* Left side */}
      <div className="flex items-center gap-1.5">
        {!leftSidebarOpen && (
          <Button variant="ghost" size="icon" className="w-7 h-7 rounded-sm" onClick={toggleLeftSidebar}>
            <Menu className="w-4 h-4 text-muted-foreground" />
          </Button>
        )}
        {leftSidebarOpen && (
          <Button variant="ghost" size="icon" className="w-7 h-7 rounded-sm" onClick={toggleLeftSidebar}>
            <PanelLeft className="w-4 h-4 text-muted-foreground" />
          </Button>
        )}
        
        <div className="flex items-center text-sm ml-1">
          <span className="text-muted-foreground">Nexus AI</span>
          <ChevronRight className="w-3 h-3 mx-1 text-muted-foreground/40" />
          <span className="font-medium text-foreground">
            {pageNames[activePage] || activePage}
          </span>
          {!isOnline && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-muted border border-border px-1.5 py-0.5 rounded text-muted-foreground font-medium ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Offline
            </span>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-0.5">
        {/* Global Time Tracker Widget */}
        <div 
          className="hidden sm:flex items-center gap-1.5 bg-black/5 dark:bg-white/5 border border-border/40 rounded-full px-3 py-0.5 mr-2 text-[10px] font-semibold text-muted-foreground transition-apple"
          data-tutorial="time-tracker"
        >
          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Track time..."
            value={localTaskName}
            onChange={(e) => setLocalTaskName(e.target.value)}
            disabled={isTimerRunning}
            className="bg-transparent border-none text-[10px] w-20 focus:outline-none placeholder:text-muted-foreground/50 text-foreground"
          />
          <span className="font-mono text-[9px] w-9 text-center bg-background/50 border border-border/30 rounded py-0.2 shrink-0">
            {formatElapsed(timerElapsed)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="w-5 h-5 p-0 hover:bg-accent rounded-sm shrink-0"
            onClick={() => {
              if (isTimerRunning) {
                pauseTimer();
              } else {
                startTimer(localTaskName || 'Active Task');
                trackInteractiveAction('start_timer');
              }
            }}
          >
            {isTimerRunning ? (
              <span className="w-1.5 h-1.5 bg-foreground rounded-sm" />
            ) : (
              <Play className="w-2 h-2 text-foreground fill-current" />
            )}
          </Button>
          {timerElapsed > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5 p-0 hover:bg-emerald-500/10 text-emerald-600 rounded-sm shrink-0"
              onClick={() => logTimer(localTaskName)}
              title="Log logged work to tasks"
            >
              <Check className="w-3 h-3" />
            </Button>
          )}
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 text-xs font-semibold px-2 flex items-center gap-1.5 hover:bg-accent/80 transition-colors mr-1"
          onClick={() => setUserStatus(userStatus === 'online' ? 'offline' : 'online')}
          title={`Click to go ${userStatus === 'online' ? 'Offline' : 'Online'}`}
        >
          <span className={`w-2 h-2 rounded-full ${userStatus === 'online' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
          <span className="text-[10px] text-muted-foreground capitalize hidden sm:inline">{userStatus}</span>
        </Button>

        <span className="text-xs text-muted-foreground mr-2 hidden md:block font-mono">{time}</span>
        
        <Button variant="ghost" size="icon" className="w-7 h-7 rounded-sm" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </Button>
        
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-7 h-7 rounded-sm relative"
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) {
                markNotificationsAsRead();
              }
            }}
          >
            <Bell className="w-3.5 h-3.5" />
            {hasUnread && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            )}
          </Button>

          {showNotifications && (
            <div className="absolute right-0 top-9 w-80 glass shadow-2xl rounded-2xl p-4 z-50 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-1.5 shrink-0">
                <span className="text-xs font-bold text-foreground">Updates & Mentions</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNotifications(false);
                  }}
                  className="text-[10px] text-muted-foreground hover:text-foreground font-semibold"
                >
                  Close
                </button>
              </div>
              <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto pr-1">
                {(notifications || []).length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-6">No new updates</div>
                ) : (
                  (notifications || []).map((notif) => (
                    <div 
                      key={notif.id}
                      className={cn(
                        "p-2.5 rounded-md border text-left text-xs transition-colors flex flex-col gap-1",
                        notif.read ? "bg-background border-border/40 text-muted-foreground" : "bg-muted/40 border-indigo-500/20 text-foreground font-medium"
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-foreground">{notif.title || notif.senderName || 'Notification'}</span>
                        <span className="text-[8px] text-muted-foreground/60 font-mono">
                          {format(new Date(notif.timestamp), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-[10px] leading-normal">{notif.message}</p>
                      {notif.type === 'join_request' && notif.requestId && !notif.read && (
                        <div className="flex items-center gap-1.5 mt-1.5 border-t border-border/50 pt-1.5 justify-end">
                          <NotificationActionButtons notif={notif} reviewJoinRequest={reviewJoinRequest} />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="w-px h-4 bg-border mx-1" />
        
        <Button variant="ghost" size="icon" className="w-7 h-7 rounded-sm" onClick={toggleRightSidebar}>
          <PanelRight className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      </div>
    </header>
  );
}

function NotificationActionButtons({ notif, reviewJoinRequest }: { notif: any; reviewJoinRequest: any }) {
  const [loading, setLoading] = useState<'approving' | 'rejecting' | null>(null);

  const handleReview = async (e: React.MouseEvent, status: 'approved' | 'rejected') => {
    e.stopPropagation();
    setLoading(status === 'approved' ? 'approving' : 'rejecting');
    const success = await reviewJoinRequest(notif.requestId, status);
    if (!success) {
      setLoading(null);
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        disabled={loading !== null}
        onClick={(e) => handleReview(e, 'rejected')}
        variant="ghost"
        className="h-6 px-2 text-[9px] hover:bg-red-500/10 text-red-500 hover:text-red-400 font-semibold"
      >
        {loading === 'rejecting' ? (
          <div className="w-3 h-3 rounded-full border border-red-500 border-t-transparent animate-spin" />
        ) : (
          'Reject'
        )}
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={loading !== null}
        onClick={(e) => handleReview(e, 'approved')}
        className="h-6 px-2 text-[9px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
      >
        {loading === 'approving' ? (
          <div className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" />
        ) : (
          'Approve'
        )}
      </Button>
    </>
  );
}
