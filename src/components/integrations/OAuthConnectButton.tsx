'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, HelpCircle, AlertCircle, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Brand icons
const SlackIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="8" height="8" x="3" y="3" rx="1.5" />
    <path d="M14 3h7" />
    <path d="M21 3v7" />
    <rect width="8" height="8" x="13" y="13" rx="1.5" />
    <path d="M10 21H3" />
    <path d="M3 21v-7" />
  </svg>
);

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const NotionIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M7 7h10" />
    <path d="M7 12h10" />
    <path d="M7 17h10" />
  </svg>
);

interface OAuthConnectButtonProps {
  connectorId: 'slack' | 'github' | 'notion';
  workspaceId: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'xs';
}

export function OAuthConnectButton({
  connectorId,
  workspaceId,
  className,
  size = 'default'
}: OAuthConnectButtonProps) {
  const [loading, setLoading] = useState(false);

  const getBrandDetails = () => {
    switch (connectorId) {
      case 'slack':
        return {
          name: 'Slack',
          icon: <SlackIcon className="w-4 h-4 shrink-0 transition-transform group-hover/button:scale-110" />,
          colorClass: 'bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white shadow-[0_2px_8px_rgba(249,115,22,0.2)] hover:shadow-[0_4px_12px_rgba(249,115,22,0.4)]',
          permissions: ['Read public channel history', 'Read shared files', 'Post messages to channels']
        };
      case 'github':
        return {
          name: 'GitHub',
          icon: <GithubIcon className="w-4 h-4 shrink-0 transition-transform group-hover/button:scale-110" />,
          colorClass: 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)]',
          permissions: ['Access commit histories', 'Read issues & pull requests', 'Sync codebase structure']
        };
      case 'notion':
        return {
          name: 'Notion',
          icon: <NotionIcon className="w-4 h-4 shrink-0 transition-transform group-hover/button:scale-110" />,
          colorClass: 'bg-slate-700 hover:bg-slate-800 text-white shadow-[0_2px_8px_rgba(71,85,105,0.2)] hover:shadow-[0_4px_12px_rgba(71,85,105,0.4)]',
          permissions: ['Index selected workspaces', 'Read pages & databases', 'Extract document content']
        };
    }
  };

  const brand = getBrandDetails();

  const handleConnect = () => {
    setLoading(true);
    // Redirect to the OAuth Start API route
    window.location.href = `/api/integrations/oauth/start?connector=${connectorId}&workspace=${workspaceId}`;
  };

  return (
    <Button
      onClick={handleConnect}
      disabled={loading || !workspaceId}
      size={size}
      className={cn(
        "font-semibold tracking-wide border-0 transition-all duration-300 relative overflow-hidden group/btn hover:scale-[1.02] active:scale-[0.98]",
        brand.colorClass,
        className
      )}
    >
      <span className="flex items-center gap-2 relative z-10">
        {brand.icon}
        <span>{loading ? 'Redirecting...' : `Connect with ${brand.name}`}</span>
        {!loading && <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />}
      </span>
      {/* Background glass shine effect */}
      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
    </Button>
  );
}
