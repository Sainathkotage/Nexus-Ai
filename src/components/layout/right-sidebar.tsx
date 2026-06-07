'use client';

import React from 'react';
import { useWorkspace } from '@/lib/store';
import { motion } from 'motion/react';
import { 
  X, MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Person } from '@/types';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function RightSidebar() {
  const { rightSidebarOpen, toggleRightSidebar, allUsers, friendIds, teamMessages, user, setActivePage, onlinePresence } = useWorkspace();
  const router = useRouter();

  if (!rightSidebarOpen) return null;

  const messagePartnerIds = Object.keys(teamMessages);
  const teammates = allUsers.filter(u =>
    u.id !== user?.id &&
    (friendIds.includes(u.id) || messagePartnerIds.includes(u.id))
  );

  const getDetailedStatus = (member: Person) => {
    const presence = onlinePresence[member.id];
    if (!presence) return 'offline';

    const currentStatus = presence.status || 'online';

    if (member.customStatus?.toLowerCase().includes('meet') || member.customStatus?.toLowerCase().includes('meeting')) {
      return 'in-meet';
    }
    return currentStatus;
  };

  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'online':
        return { color: 'bg-emerald-500', label: 'Online', border: 'border-emerald-500' };
      case 'idle':
        return { color: 'bg-amber-500', label: 'Idle', border: 'border-amber-500' };
      case 'dnd':
        return { color: 'bg-red-500', label: 'Do Not Disturb', border: 'border-red-500' };
      case 'in-meet':
        return { color: 'bg-purple-500', label: 'In Meeting', border: 'border-purple-500' };
      case 'offline':
      default:
        return { color: 'bg-zinc-400', label: 'Offline', border: 'border-zinc-300' };
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
  };

  const handleTeammateClick = (memberId: string) => {
    setActivePage('team-chat');
    router.push('/team-chat');
  };

  const groups = {
    online: teammates.filter(t => getDetailedStatus(t) === 'online'),
    inMeet: teammates.filter(t => getDetailedStatus(t) === 'in-meet'),
    idle: teammates.filter(t => getDetailedStatus(t) === 'idle'),
    dnd: teammates.filter(t => getDetailedStatus(t) === 'dnd'),
    offline: teammates.filter(t => getDetailedStatus(t) === 'offline'),
  };

  const renderMember = (member: Person) => {
    const status = getDetailedStatus(member);
    const details = getStatusDetails(status);

    return (
      <div
        key={member.id}
        onClick={() => handleTeammateClick(member.id)}
        className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-accent/40 border border-transparent hover:border-border/40 transition-all cursor-pointer group"
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
            {getInitials(member.name)}
          </div>
          <span className={cn(
            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background flex items-center justify-center shrink-0",
            details.color
          )}>
            {status === 'dnd' && (
              <span className="w-1 h-0.5 bg-white rounded-full block" />
            )}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col">
          <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors flex items-center gap-1 leading-normal">
            {member.name}
            <span className="text-[9px] font-normal text-muted-foreground font-mono">#{member.tag || '0000'}</span>
          </span>
          <span className="text-[10px] text-muted-foreground truncate leading-none mt-0.5">{member.role}</span>
          {member.customStatus && (
            <span className="text-[9px] text-primary/80 font-medium truncate mt-1.5 italic leading-none flex items-center gap-1">
              <img src="https://www.google.com/s2/favicons?domain=slack.com&sz=32" className="w-2.5 h-2.5 object-contain" alt="" />
              {member.customStatus}
            </span>
          )}
        </div>

        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-auto" />
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 280, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="h-full border-l border-border bg-sidebar flex flex-col shrink-0 overflow-hidden max-lg:fixed max-lg:right-0 max-lg:top-0 max-lg:h-full max-lg:z-30 max-lg:shadow-2xl"
    >
      <div className="h-11 flex items-center justify-between px-3 border-b border-border shrink-0">
        <span className="text-sm font-semibold text-foreground">Team Members</span>
        <Button variant="ghost" size="icon" className="w-7 h-7 rounded-sm" onClick={toggleRightSidebar}>
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 flex flex-col gap-6">
          
          {/* Online Section */}
          {groups.online.length > 0 && (
            <section className="flex flex-col gap-1.5">
              <div className="px-1 pb-1 flex items-center gap-1.5 border-b border-border/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Online ({groups.online.length})</span>
              </div>
              <div className="flex flex-col gap-0.5 mt-1">
                {groups.online.map(renderMember)}
              </div>
            </section>
          )}

          {/* In Meeting Section */}
          {groups.inMeet.length > 0 && (
            <section className="flex flex-col gap-1.5">
              <div className="px-1 pb-1 flex items-center gap-1.5 border-b border-border/40">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">In Meeting ({groups.inMeet.length})</span>
              </div>
              <div className="flex flex-col gap-0.5 mt-1">
                {groups.inMeet.map(renderMember)}
              </div>
            </section>
          )}

          {/* Busy/DND Section */}
          {groups.dnd.length > 0 && (
            <section className="flex flex-col gap-1.5">
              <div className="px-1 pb-1 flex items-center gap-1.5 border-b border-border/40">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Do Not Disturb ({groups.dnd.length})</span>
              </div>
              <div className="flex flex-col gap-0.5 mt-1">
                {groups.dnd.map(renderMember)}
              </div>
            </section>
          )}

          {/* Idle Section */}
          {groups.idle.length > 0 && (
            <section className="flex flex-col gap-1.5">
              <div className="px-1 pb-1 flex items-center gap-1.5 border-b border-border/40">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Idle / Away ({groups.idle.length})</span>
              </div>
              <div className="flex flex-col gap-0.5 mt-1">
                {groups.idle.map(renderMember)}
              </div>
            </section>
          )}

          {/* Offline Section */}
          {groups.offline.length > 0 && (
            <section className="flex flex-col gap-1.5">
              <div className="px-1 pb-1 flex items-center gap-1.5 border-b border-border/40">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Offline ({groups.offline.length})</span>
              </div>
              <div className="flex flex-col gap-0.5 mt-1">
                {groups.offline.map(renderMember)}
              </div>
            </section>
          )}

          {teammates.length === 0 && (
            <div className="p-4 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground leading-relaxed">
              This team is empty until an admin adds members.
            </div>
          )}

        </div>
      </ScrollArea>
    </motion.div>
  );
}
