'use client';

import { motion } from 'motion/react';
import { Mail, Sparkles, Clock, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Email } from '@/types';

interface EmailCardProps {
  email: Email;
  onReview: (email: Email) => void;
}

const statusConfig: Record<Email['status'], { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  },
  sent: {
    label: 'Sent',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  },
  received: {
    label: 'Received',
    className: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  },
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function EmailCard({ email, onReview }: EmailCardProps) {
  const status = statusConfig[email.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="group relative rounded-xl border border-border/60 bg-card p-4 transition-shadow hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20"
    >
      {/* Top row: status + AI badge + time */}
      <div className="mb-3 flex items-center gap-2">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
          {status.label}
        </span>

        {email.aiGenerated && (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600 dark:bg-violet-950 dark:text-violet-400">
            <Sparkles className="size-3" />
            AI Generated
          </span>
        )}

        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" />
          {formatRelativeTime(email.createdAt)}
        </span>
      </div>

      {/* Recipient */}
      <div className="mb-1.5 flex items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-foreground">
          {email.toName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{email.toName}</p>
          <p className="truncate text-xs text-muted-foreground">{email.to}</p>
        </div>
      </div>

      {/* Subject */}
      <h3 className="mb-1.5 text-sm font-semibold text-foreground leading-snug">
        {email.subject}
      </h3>

      {/* Body preview */}
      <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {email.body.replace(/\\n/g, ' ')}
      </p>

      {/* Footer actions */}
      {email.status !== 'sent' && (
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReview(email)}
            className="gap-1.5 text-xs"
          >
            <Eye className="size-3.5" />
            Review
          </Button>
        </div>
      )}
    </motion.div>
  );
}
