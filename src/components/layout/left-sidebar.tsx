'use client';

import React from 'react';
import { useWorkspaceNavigation, useWorkspaceUser, useWorkspaceData, useWorkspaceActions } from '@/lib/store';
import { PageId } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, LayoutDashboard, FileText, MessageSquare, 
  CheckSquare, Calendar, Mail, Settings, Plus, Search,
  ChevronDown, Users, Check, LogOut, Palette, BarChart3, Smile, Inbox, Briefcase, Video
} from 'lucide-react';
import { cn, getWorkspaceFavicon, getAvatarStyle } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navItems: { id: PageId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'ai-inbox', label: 'AI Inbox', icon: Inbox },
  { id: 'ai-handover', label: 'AI Handover', icon: Briefcase },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'chat', label: 'AI Chat', icon: MessageSquare },
  { id: 'team-chat', label: 'Team Chat', icon: Users },
  { id: 'whiteboard', label: 'Whiteboard', icon: Palette },
  { id: 'crm', label: 'CRM Deals', icon: BarChart3 },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'emails', label: 'Emails', icon: Mail },
  { id: 'calls', label: 'Video Rooms', icon: Video },
];

interface LeftSidebarProps {
  onOpenSearch?: () => void;
}

export function LeftSidebar({ onOpenSearch }: LeftSidebarProps) {
  const { leftSidebarOpen } = useWorkspaceNavigation();
  const { 
    user, userStatus, setUserStatus, logout, customStatus, setCustomStatus, dnd, setDnd 
  } = useWorkspaceUser();
  const { 
    workspace, myWorkspaces, mentionBadgeCount, aiInbox 
  } = useWorkspaceData();
  const { 
    setWorkspace, switchWorkspace, clearMentionBadge 
  } = useWorkspaceActions();

  const router = useRouter();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = React.useState(false);

  const activePage = React.useMemo(() => {
    if (pathname === '/') return 'dashboard';
    const firstSegment = pathname.split('/')[1];
    return (firstSegment || 'dashboard') as PageId;
  }, [pathname]);

  const handleNavClick = (id: PageId) => {
    if (id === 'team-chat') {
      clearMentionBadge();
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
  };

  if (!leftSidebarOpen) return null;

  return (
    <motion.div 
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 240, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="h-[calc(100vh-1.5rem)] my-3 ml-3 mr-1.5 rounded-2xl border border-sidebar-border/40 glass flex flex-col overflow-hidden shrink-0 max-lg:fixed max-lg:left-0 max-lg:top-0 max-lg:z-30 max-lg:shadow-2xl shadow-notion"
      data-tutorial="left-sidebar"
    >
      {/* Workspace Header */}
      <div className="h-12 flex items-center px-3 shrink-0 relative">
        <button 
          onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
          className="flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-accent/60 transition-colors w-full text-left"
        >
          <img src={getWorkspaceFavicon(workspace ? workspace.name : '')} className="w-5 h-5 object-contain rounded shrink-0" alt="Logo" />
          <span className="text-sm font-semibold text-foreground truncate">
            {workspace ? workspace.name : 'Select Workspace'}
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground ml-auto shrink-0" />
        </button>

        {/* Workspace Dropdown Panel */}
        <AnimatePresence>
          {showWorkspaceDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className="absolute top-12 left-2 right-2 glass shadow-xl rounded-xl p-2 flex flex-col gap-1 z-50 text-sm"
            >
              <div className="px-2 py-1 border-b border-border pb-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                Your Workspaces
              </div>
              <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                {myWorkspaces.map((ws: any) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      switchWorkspace(ws.id);
                      setShowWorkspaceDropdown(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-1.5 rounded text-left text-xs transition-colors w-full",
                      workspace?.id === ws.id 
                        ? "bg-accent text-foreground font-semibold" 
                        : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                    )}
                  >
                    <img src={getWorkspaceFavicon(ws.name)} className="w-3.5 h-3.5 object-contain rounded shrink-0" alt="" />
                    <span className="truncate flex-1">{ws.name}</span>
                    {workspace?.id === ws.id && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                ))}
                {myWorkspaces.length === 0 && (
                  <div className="px-2 py-3 text-center text-xs text-muted-foreground italic">
                    No active teams.
                  </div>
                )}
              </div>
              <div className="h-px bg-border my-0.5" />
              <button
                onClick={() => {
                  setWorkspace(null);
                  router.push('/');
                  setShowWorkspaceDropdown(false);
                }}
                className="flex items-center gap-2 px-2 py-1.5 text-left text-xs text-indigo-500 hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 rounded w-full font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>+ Create or Join Team</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search */}
      <div className="px-2 mb-1">
        <button 
          onClick={onOpenSearch}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent/60 transition-colors w-full"
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">Search</span>
          <span className="text-[10px] font-mono bg-muted px-1 py-0.5 rounded text-muted-foreground border border-border">⌘K</span>
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-1 px-2 flex flex-col gap-0.5 overflow-y-auto">
        <div className="px-2 pt-3 pb-1.5">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Workspace</span>
        </div>
        
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.id === 'dashboard' ? '/' : `/${item.id}`}
            onClick={() => handleNavClick(item.id)}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-sm w-full text-left relative transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
              activePage === item.id 
                ? "bg-accent/60 text-primary font-bold border-l-2 border-primary rounded-l-none pl-3" 
                : "text-muted-foreground hover:bg-accent/20 hover:text-foreground"
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="truncate flex-1">{item.label}</span>
            {item.id === 'team-chat' && mentionBadgeCount > 0 && activePage !== 'team-chat' && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            )}
            {item.id === 'ai-inbox' && aiInbox.filter((x: any) => x.status === 'pending').length > 0 && (
              <span className="bg-indigo-500 text-white text-[9.5px] font-extrabold px-1.5 py-0.2 rounded-full shrink-0 font-mono">
                {aiInbox.filter((x: any) => x.status === 'pending').length}
              </span>
            )}
          </Link>
        ))}

        <div className="my-2 h-px bg-border mx-1" />

        <Link
          href="/settings"
          onClick={() => handleNavClick('settings')}
          className={cn(
            "flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-sm w-full text-left relative transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
            activePage === 'settings'
              ? "bg-accent/60 text-primary font-bold border-l-2 border-primary rounded-l-none pl-3" 
              : "text-muted-foreground hover:bg-accent/20 hover:text-foreground"
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </Link>
      </div>

      {/* Bottom */}
      <div className="p-2 flex flex-col gap-1 mt-auto border-t border-border relative">

        {/* User Menu Overlay */}
        <AnimatePresence>
          {showUserMenu && user && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className="absolute bottom-14 left-2 right-2 glass shadow-xl rounded-xl p-2.5 flex flex-col gap-1.5 z-50 text-sm"
            >
              <div className="px-2 py-1 border-b border-border pb-1.5">
                <span className="font-semibold text-foreground text-xs block truncate">{user.name}#{user.tag || '0000'}</span>
                <span className="text-[10px] text-muted-foreground block truncate mt-0.5">{user.role}</span>
              </div>

              {/* Status input */}
              <div className="px-2 py-0.5 flex flex-col gap-1 mb-1 border-b border-border pb-2">
                <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Custom Status</span>
                <div className="relative flex items-center">
                  <Smile className="absolute left-1.5 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={customStatus}
                    onChange={(e) => setCustomStatus(e.target.value)}
                    placeholder="What's your status?"
                    className="w-full bg-[#fcfcfb] dark:bg-[#252525] border border-border rounded px-1.5 py-1 text-[10px] pl-6 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => {
                    setUserStatus('online');
                    setShowUserMenu(false);
                  }}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent text-left text-xs text-foreground w-full"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="flex-1">Online</span>
                  {userStatus === 'online' && !dnd && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
                
                <button
                  onClick={() => {
                    setUserStatus('offline');
                    setShowUserMenu(false);
                  }}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent text-left text-xs text-foreground w-full"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 shrink-0" />
                  <span className="flex-1">Offline</span>
                  {userStatus === 'offline' && !dnd && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>

                <button
                  onClick={() => {
                    setDnd(!dnd);
                  }}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent text-left text-xs text-foreground w-full"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                  <span className="flex-1">Do Not Disturb</span>
                  {dnd && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              </div>

              <div className="h-px bg-border my-0.5" />

              <button
                onClick={() => {
                  logout();
                  setShowUserMenu(false);
                }}
                className="flex items-center gap-2 px-2 py-1 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded w-full"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Sign Out</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {user && (
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 px-2 py-1.5 overflow-hidden hover:bg-accent/60 rounded-md transition-colors w-full text-left"
          >
            <div className="relative shrink-0">
              {getAvatarStyle(user.avatar) ? (
                <div 
                  className="w-6 h-6 rounded-full border border-border/80" 
                  style={getAvatarStyle(user.avatar) || undefined}
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white">{getInitials(user.name)}</span>
                </div>
              )}
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-background ${
                dnd ? 'bg-red-500' : userStatus === 'online' ? 'bg-emerald-500' : 'bg-zinc-400'
              }`} />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold leading-none truncate text-foreground flex items-center gap-1">
                {user.name}
                <span className="text-[9px] font-normal text-muted-foreground">#{user.tag || '0000'}</span>
              </span>
              <div className="flex flex-col mt-0.5 gap-0.5">
                <span className="text-[9px] text-muted-foreground truncate leading-none">{user.role}</span>
                {user.customStatus && (
                  <span className="text-[8px] text-primary/80 font-medium truncate italic leading-none flex items-center gap-1" title={user.customStatus}>
                    <img src="https://www.google.com/s2/favicons?domain=slack.com&sz=32" className="w-2.5 h-2.5 object-contain" alt="" />
                    {user.customStatus}
                  </span>
                )}
              </div>
            </div>
          </button>
        )}
      </div>
    </motion.div>
  );
}
