'use client';

import React, { useState } from 'react';
import { useWorkspace } from '@/lib/store';
import { useRouter } from 'next/navigation';
import {
  X, LogOut, Check, Smile, Clock, Play, ChevronDown,
  Wifi, WifiOff, BellOff, Building2,
} from 'lucide-react';
import { cn, getWorkspaceFavicon, getAvatarStyle } from '@/lib/utils';

interface MobileUserSheetProps {
  open: boolean;
  onClose: () => void;
}

export function MobileUserSheet({ open, onClose }: MobileUserSheetProps) {
  const {
    user,
    userStatus,
    setUserStatus,
    customStatus,
    setCustomStatus,
    dnd,
    setDnd,
    logout,
    workspace,
    myWorkspaces,
    switchWorkspace,
    isTimerRunning,
    timerElapsed,
    activeTimerTask,
    startTimer,
    pauseTimer,
    logTimer,
  } = useWorkspace();

  const router = useRouter();
  const [showWorkspaces, setShowWorkspaces] = useState(false);
  const [timerInput, setTimerInput] = useState(activeTimerTask || '');

  if (!open || !user) return null;

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n.charAt(0)).join('').toUpperCase().substring(0, 2);

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const statusOptions = [
    { id: 'online',  label: 'Online',          dot: '#22C55E', isDnd: false },
    { id: 'offline', label: 'Away',             dot: '#F59E0B', isDnd: false },
    { id: 'dnd',     label: 'Do Not Disturb',  dot: '#EF4444', isDnd: true  },
  ] as const;

  const currentStatus = dnd ? 'dnd' : userStatus;

  return (
    <>
      {/* Backdrop */}
      <div className="mob-sheet-overlay md:hidden" onClick={onClose} />

      {/* Sheet */}
      <div
        className="mob-sheet mob-sheet-enter md:hidden"
        style={{ maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Handle */}
        <div className="mob-sheet-handle" />

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 20,
            right: 16,
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
            zIndex: 1,
          }}
        >
          <X size={16} />
        </button>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 24 }}>

          {/* ── User Profile Header ─────────────────────── */}
          <div
            style={{
              padding: '20px 20px 16px',
              borderBottom: '1px solid var(--mob-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Avatar */}
              <div className="mob-avatar" style={{ width: 52, height: 52, fontSize: 18 }}>
                {getAvatarStyle(user.avatar) ? (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      ...(getAvatarStyle(user.avatar) as React.CSSProperties),
                    }}
                  />
                ) : (
                  <span>{getInitials(user.name)}</span>
                )}
                <span
                  className={cn('mob-status-dot', dnd ? 'dnd' : userStatus)}
                  style={{ width: 13, height: 13, border: '2.5px solid var(--mob-bg-elevated)' }}
                />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--mob-foreground)',
                    lineHeight: 1.2,
                  }}
                >
                  {user.name}
                  <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--mob-muted)', marginLeft: 4 }}>
                    #{user.tag || '0000'}
                  </span>
                </p>
                <p
                  style={{
                    margin: '3px 0 0',
                    fontSize: 12,
                    color: 'var(--mob-muted)',
                    textTransform: 'capitalize',
                  }}
                >
                  {user.role}
                </p>
                {user.customStatus && (
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: '#9B87FF', fontStyle: 'italic' }}>
                    {user.customStatus}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Workspace Switcher ──────────────────────── */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--mob-border)' }}>
            <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--mob-muted-dim)' }}>
              Workspace
            </p>
            <button
              onClick={() => setShowWorkspaces(!showWorkspaces)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--mob-border)',
                background: 'rgba(255,255,255,0.04)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {workspace ? (
                <img
                  src={getWorkspaceFavicon(workspace.name)}
                  style={{ width: 22, height: 22, objectFit: 'contain', borderRadius: 4, flexShrink: 0 }}
                  alt=""
                />
              ) : (
                <Building2 size={18} style={{ color: 'var(--mob-muted)', flexShrink: 0 }} />
              )}
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--mob-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {workspace ? workspace.name : 'Select Workspace'}
              </span>
              <ChevronDown
                size={16}
                style={{
                  color: 'var(--mob-muted)',
                  transform: showWorkspaces ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 200ms ease',
                  flexShrink: 0,
                }}
              />
            </button>

            {showWorkspaces && (
              <div
                style={{
                  marginTop: 8,
                  borderRadius: 10,
                  border: '1px solid var(--mob-border)',
                  background: 'rgba(255,255,255,0.03)',
                  overflow: 'hidden',
                }}
              >
                {myWorkspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      switchWorkspace(ws.id);
                      setShowWorkspaces(false);
                      onClose();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--mob-border)',
                      background: workspace?.id === ws.id ? 'var(--mob-accent-subtle)' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <img
                      src={getWorkspaceFavicon(ws.name)}
                      style={{ width: 18, height: 18, objectFit: 'contain', borderRadius: 3, flexShrink: 0 }}
                      alt=""
                    />
                    <span style={{ flex: 1, fontSize: 13, color: workspace?.id === ws.id ? 'var(--mob-accent-light)' : 'var(--mob-foreground)', fontWeight: workspace?.id === ws.id ? 600 : 400 }}>
                      {ws.name}
                    </span>
                    {workspace?.id === ws.id && (
                      <Check size={14} style={{ color: 'var(--mob-accent)', flexShrink: 0 }} />
                    )}
                  </button>
                ))}
                {myWorkspaces.length === 0 && (
                  <p style={{ padding: '12px 14px', fontSize: 12, color: 'var(--mob-muted)', margin: 0, fontStyle: 'italic' }}>
                    No active workspaces
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Status ─────────────────────────────────── */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--mob-border)' }}>
            <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--mob-muted-dim)' }}>
              Status
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {statusOptions.map((opt) => {
                const isSelected = currentStatus === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (opt.isDnd) {
                        setDnd(!dnd);
                      } else {
                        setDnd(false);
                        setUserStatus(opt.id === 'online' ? 'online' : 'offline');
                      }
                    }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      padding: '10px 6px',
                      borderRadius: 10,
                      border: `1px solid ${isSelected ? 'rgba(123,97,255,0.4)' : 'var(--mob-border)'}`,
                      background: isSelected ? 'var(--mob-accent-subtle)' : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: opt.dot,
                        boxShadow: isSelected ? `0 0 8px ${opt.dot}80` : 'none',
                      }}
                    />
                    <span style={{ fontSize: 10, fontWeight: 600, color: isSelected ? 'var(--mob-accent-light)' : 'var(--mob-muted)', textAlign: 'center', lineHeight: 1.2 }}>
                      {opt.label}
                    </span>
                    {isSelected && <Check size={11} style={{ color: 'var(--mob-accent)' }} />}
                  </button>
                );
              })}
            </div>

            {/* Custom status input */}
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid var(--mob-border)',
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              <Smile size={16} style={{ color: 'var(--mob-muted)', flexShrink: 0 }} />
              <input
                type="text"
                value={customStatus}
                onChange={(e) => setCustomStatus(e.target.value)}
                placeholder="Set a custom status…"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 13,
                  color: 'var(--mob-foreground)',
                }}
              />
            </div>
          </div>

          {/* ── Time Tracker ────────────────────────────── */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--mob-border)' }}>
            <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--mob-muted-dim)' }}>
              Time Tracker
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid var(--mob-border)',
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              <Clock size={16} style={{ color: 'var(--mob-muted)', flexShrink: 0 }} />
              <input
                type="text"
                value={timerInput}
                onChange={(e) => setTimerInput(e.target.value)}
                placeholder="What are you working on?"
                disabled={isTimerRunning}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 13,
                  color: 'var(--mob-foreground)',
                }}
              />
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 13,
                  fontWeight: 700,
                  color: isTimerRunning ? 'var(--mob-accent-light)' : 'var(--mob-muted)',
                  minWidth: 44,
                  textAlign: 'center',
                }}
              >
                {formatElapsed(timerElapsed)}
              </span>
              <button
                onClick={() => {
                  if (isTimerRunning) {
                    pauseTimer();
                  } else {
                    startTimer(timerInput || 'Active Task');
                  }
                }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: 'none',
                  background: isTimerRunning ? 'rgba(239,68,68,0.15)' : 'var(--mob-accent-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {isTimerRunning ? (
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: '#EF4444' }} />
                ) : (
                  <Play size={12} style={{ color: 'var(--mob-accent)', fill: 'var(--mob-accent)' }} />
                )}
              </button>
              {timerElapsed > 0 && (
                <button
                  onClick={() => logTimer(timerInput)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: 'none',
                    background: 'rgba(34,197,94,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <Check size={13} style={{ color: '#22C55E' }} />
                </button>
              )}
            </div>
          </div>

          {/* ── Sign Out ────────────────────────────────── */}
          <div style={{ padding: '16px 20px' }}>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '13px',
                borderRadius: 12,
                border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.08)',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                color: '#EF4444',
                transition: 'all 150ms ease',
              }}
            >
              <LogOut size={17} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
