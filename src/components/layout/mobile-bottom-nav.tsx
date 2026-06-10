'use client';

import React, { useState, useCallback } from 'react';
import { useWorkspace } from '@/lib/store';
import { PageId } from '@/types';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  CheckSquare,
  MoreHorizontal,
  FileText,
  Users,
  Palette,
  BarChart3,
  Calendar,
  Mail,
  Settings,
  Inbox,
  Briefcase,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Primary bottom nav tabs (5 items) ────────────────────
const PRIMARY_NAV: { id: PageId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard',  label: 'Home',  icon: LayoutDashboard },
  { id: 'chat',       label: 'Chat',  icon: MessageSquare  },
  // center slot is AI FAB
  { id: 'tasks',      label: 'Tasks', icon: CheckSquare    },
];

// ── Secondary nav items shown in "More" drawer ───────────
const MORE_NAV: { id: PageId; label: string; icon: React.ElementType }[] = [
  { id: 'ai-inbox',    label: 'AI Inbox',    icon: Inbox        },
  { id: 'ai-handover', label: 'AI Handover', icon: Briefcase    },
  { id: 'documents',   label: 'Documents',   icon: FileText     },
  { id: 'team-chat',   label: 'Team Chat',   icon: Users        },
  { id: 'whiteboard',  label: 'Whiteboard',  icon: Palette      },
  { id: 'crm',         label: 'CRM',         icon: BarChart3    },
  { id: 'calendar',    label: 'Calendar',    icon: Calendar     },
  { id: 'emails',      label: 'Emails',      icon: Mail         },
  { id: 'settings',    label: 'Settings',    icon: Settings     },
];

export function MobileBottomNav() {
  const {
    activePage,
    setActivePage,
    aiInbox,
    mentionBadgeCount,
    clearMentionBadge,
  } = useWorkspace();

  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleNav = useCallback(
    (id: PageId) => {
      setActivePage(id);
      if (id === 'team-chat') clearMentionBadge();
      router.push(id === 'dashboard' ? '/' : `/${id}`);
      setMoreOpen(false);
    },
    [setActivePage, clearMentionBadge, router],
  );

  const aiInboxPending = aiInbox.filter((x) => x.status === 'pending').length;

  // Determine if the active page is in the "more" group
  const isMoreActive = MORE_NAV.some((n) => n.id === activePage);

  return (
    <>
      {/* ── Bottom Nav Bar ───────────────────────────────── */}
      <nav className="mob-bottom-nav md:hidden" aria-label="Mobile navigation">
        {/* Home */}
        <button
          className={cn('mob-nav-item', activePage === 'dashboard' && 'active')}
          onClick={() => handleNav('dashboard')}
          aria-label="Home"
        >
          <LayoutDashboard size={22} strokeWidth={activePage === 'dashboard' ? 2.2 : 1.8} />
          <span className="mob-nav-label">Home</span>
          {activePage === 'dashboard' && <span className="mob-active-dot" />}
        </button>

        {/* Chat */}
        <button
          className={cn('mob-nav-item', activePage === 'chat' && 'active')}
          onClick={() => handleNav('chat')}
          aria-label="AI Chat"
        >
          <MessageSquare size={22} strokeWidth={activePage === 'chat' ? 2.2 : 1.8} />
          <span className="mob-nav-label">Chat</span>
          {activePage === 'chat' && <span className="mob-active-dot" />}
        </button>

        {/* Center AI FAB */}
        <div className="flex items-center justify-center flex-1">
          <button
            className="mob-fab"
            onClick={() => handleNav('ai-inbox')}
            aria-label="Open AI Inbox"
          >
            <Sparkles
              size={24}
              strokeWidth={2}
              style={{ color: '#fff', filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.5))' }}
            />
            {aiInboxPending > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  background: '#FF6B6B',
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 800,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                  border: '2px solid rgba(26,26,46,0.96)',
                  lineHeight: 1,
                }}
              >
                {aiInboxPending > 9 ? '9+' : aiInboxPending}
              </span>
            )}
          </button>
        </div>

        {/* Tasks */}
        <button
          className={cn('mob-nav-item', activePage === 'tasks' && 'active')}
          onClick={() => handleNav('tasks')}
          aria-label="Tasks"
        >
          <CheckSquare size={22} strokeWidth={activePage === 'tasks' ? 2.2 : 1.8} />
          <span className="mob-nav-label">Tasks</span>
          {activePage === 'tasks' && <span className="mob-active-dot" />}
        </button>

        {/* More */}
        <button
          className={cn('mob-nav-item', (moreOpen || isMoreActive) && 'active')}
          onClick={() => setMoreOpen(true)}
          aria-label="More"
        >
          <MoreHorizontal size={22} strokeWidth={1.8} />
          <span className="mob-nav-label">More</span>
          {(moreOpen || isMoreActive) && <span className="mob-active-dot" />}
          {/* Badge for team-chat mentions when not on it */}
          {mentionBadgeCount > 0 && activePage !== 'team-chat' && (
            <span className="mob-badge">{mentionBadgeCount > 9 ? '9+' : mentionBadgeCount}</span>
          )}
        </button>
      </nav>

      {/* ── "More" Bottom Sheet ──────────────────────────── */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="mob-sheet-overlay md:hidden"
            onClick={() => setMoreOpen(false)}
          />

          {/* Sheet */}
          <div
            className="mob-sheet mob-sheet-enter md:hidden"
            style={{ maxHeight: '80vh' }}
          >
            {/* Handle */}
            <div className="mob-sheet-handle" />

            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px 12px',
                borderBottom: '1px solid var(--mob-border)',
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--mob-foreground)',
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  All Sections
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--mob-muted)',
                    margin: '2px 0 0',
                  }}
                >
                  Navigate to any workspace area
                </p>
              </div>
              <button
                onClick={() => setMoreOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: '1px solid var(--mob-border)',
                  background: 'rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--mob-muted)',
                }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Nav Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                padding: '16px',
                overflowY: 'auto',
                maxHeight: 'calc(80vh - 100px)',
              }}
            >
              {MORE_NAV.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                const hasBadge =
                  (item.id === 'team-chat' && mentionBadgeCount > 0 && activePage !== 'team-chat') ||
                  (item.id === 'ai-inbox' && aiInboxPending > 0);
                const badgeCount =
                  item.id === 'team-chat' ? mentionBadgeCount : aiInboxPending;

                return (
                  <button
                    key={item.id}
                    className={cn('mob-grid-nav-item', isActive && 'active')}
                    onClick={() => handleNav(item.id)}
                    aria-label={item.label}
                    style={{ position: 'relative' }}
                  >
                    {/* Badge */}
                    {hasBadge && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          background: 'var(--mob-accent)',
                          color: '#fff',
                          fontSize: 9,
                          fontWeight: 800,
                          minWidth: 16,
                          height: 16,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 3px',
                          lineHeight: 1,
                        }}
                      >
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </span>
                    )}

                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: isActive
                          ? 'linear-gradient(135deg, rgba(123,97,255,0.25), rgba(155,94,255,0.15))'
                          : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isActive ? 'rgba(123,97,255,0.4)' : 'var(--mob-border)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 150ms ease',
                      }}
                    >
                      <Icon
                        size={20}
                        strokeWidth={isActive ? 2.2 : 1.7}
                        style={{
                          color: isActive ? 'var(--mob-accent-light)' : 'var(--mob-muted)',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        color: isActive ? 'var(--mob-accent-light)' : 'var(--mob-muted)',
                      }}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
