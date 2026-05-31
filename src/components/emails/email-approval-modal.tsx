'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Send, Pencil, X, Sparkles, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Email } from '@/types';

interface EmailApprovalModalProps {
  email: Email | null;
  onClose: () => void;
  onSend: (emailId: string) => void;
  onEdit: (emailId: string) => void;
}

export function EmailApprovalModal({
  email,
  onClose,
  onSend,
  onEdit,
}: EmailApprovalModalProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  if (!email) return null;

  const handleSend = () => {
    setShowSuccess(true);
    setTimeout(() => {
      onSend(email.id);
      setShowSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <Dialog open={!!email} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center gap-3 py-10"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
              >
                <CheckCircle2 className="size-14 text-emerald-500" />
              </motion.div>
              <p className="text-base font-semibold text-foreground">Email Sent Successfully!</p>
              <p className="text-sm text-muted-foreground">
                Your email to {email.toName} has been sent.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header */}
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950">
                    <Mail className="size-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  Preview Email
                </DialogTitle>
                <DialogDescription>
                  Review the email before sending
                </DialogDescription>
              </DialogHeader>

              {/* Email fields */}
              <div className="mt-4 space-y-3">
                {/* To */}
                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">To</span>
                  <p className="text-sm text-foreground">
                    {email.toName}{' '}
                    <span className="text-muted-foreground">&lt;{email.to}&gt;</span>
                  </p>
                </div>

                {/* Subject */}
                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">Subject</span>
                  <p className="text-sm font-medium text-foreground">{email.subject}</p>
                </div>

                {/* Body */}
                <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Message
                  </span>
                  <div className="max-h-56 overflow-y-auto">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                      {email.body}
                    </p>
                  </div>
                </div>

                {/* Source prompt */}
                {email.aiGenerated && email.sourcePrompt && (
                  <div className="flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50/50 px-3 py-2 dark:border-violet-800 dark:bg-violet-950/30">
                    <Sparkles className="mt-0.5 size-3.5 shrink-0 text-violet-500" />
                    <div>
                      <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
                        AI Prompt
                      </span>
                      <p className="text-sm italic text-violet-600/80 dark:text-violet-400/80">
                        &ldquo;{email.sourcePrompt}&rdquo;
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-5 flex items-center gap-2">
                <Button
                  onClick={handleSend}
                  className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  <Send className="size-3.5" />
                  Send Email
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onEdit(email.id)}
                  className="gap-1.5"
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
                <Button variant="ghost" onClick={onClose} className="ml-auto gap-1.5">
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
