'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/lib/store';
import { usePopup } from '@/lib/popup-context';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, Search, Star, Send, Inbox, Edit3, 
  Trash2, AlertCircle, Sparkles, Check, ChevronRight, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Email } from '@/types';

export default function EmailsPage() {
  const { 
    emails, 
    addEmail, 
    editEmail, 
    deleteEmail, 
    updateEmailStatus,
    inboundEmailAddress,
    isSyncingEmails,
    syncInboundEmails,
    user } = useWorkspace();
  const { confirm } = usePopup();

  const [activeTab, setActiveTab] = useState<'inbox' | 'drafts' | 'sent'>('inbox');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  
  // Modals state
  const [composeOpen, setComposeOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  
  // AI Compose inputs
  const [aiPrompt, setAiPrompt] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);

  // Edit draft inputs
  const [editToName, setEditToName] = useState('');
  const [editToEmail, setEditToEmail] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');

  const [replyToEmail, setReplyToEmail] = useState<Email | null>(null);

  const handleReplyClick = (email: Email) => {
    setReplyToEmail(email);
    setAiPrompt(`Write a professional reply to ${email.fromName || email.from} regarding: "${email.subject}". Address their points.`);
    setComposeOpen(true);
  };

  

  // Set the first available email in the active tab as selected by default
  useEffect(() => {
    const activeEmails = emails.filter(e => {
      if (activeTab === 'drafts') return e.status === 'draft' || e.status === 'pending';
      if (activeTab === 'sent') return e.status === 'sent';
      if (activeTab === 'inbox') return e.status === 'received';
      return false;
    });

    if (activeEmails.length > 0) {
      // Keep selection if it's already in the filtered list, else select first
      const exists = activeEmails.some(e => e.id === selectedEmailId);
      if (!exists) setSelectedEmailId(activeEmails[0].id);
    } else {
      setSelectedEmailId(null);
    }
  }, [emails, activeTab]);

  const filteredEmails = emails.filter(e => {
    if (activeTab === 'drafts') return e.status === 'draft' || e.status === 'pending';
    if (activeTab === 'sent') return e.status === 'sent';
    if (activeTab === 'inbox') return e.status === 'received';
    return false;
  });

  const selectedEmail = emails.find(e => e.id === selectedEmailId);

  // Initialize edit fields
  const handleOpenEdit = () => {
    if (!selectedEmail) return;
    setEditToName(selectedEmail.toName);
    setEditToEmail(selectedEmail.to);
    setEditSubject(selectedEmail.subject);
    setEditBody(selectedEmail.body);
    setEditOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmail) return;

    editEmail(selectedEmail.id, {
      toName: editToName,
      to: editToEmail,
      subject: editSubject,
      body: editBody
    });

    setEditOpen(false);
    toast.success('Draft updated successfully');
  };

  const handleApproveSend = () => {
    if (!selectedEmail) return;
    updateEmailStatus(selectedEmail.id, 'sent');
    toast.success(`Approved and sent to ${selectedEmail.toName}`);
  };

  const handleDelete = async () => {
    if (!selectedEmail) return;
    const isConfirmed = await confirm('Are you sure you want to discard this email draft?', 'Discard Draft');
    if (isConfirmed) {
      const currentId = selectedEmail.id;
      deleteEmail(currentId);
      setSelectedEmailId(null);
      toast.success('Email draft discarded');
    }
  };

  const handleAiCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setIsDrafting(true);
    try {
      const systemPrompt = 'You are an AI Email Assistant. Generate a professional email based on the instruction. The output MUST be a JSON object inside markdown code block with exactly 4 fields: {"toName": "Name of recipient", "toEmail": "recipient@email.com", "subject": "Subject of the email", "body": "Body of the email"}. Do not include greetings in headers, keep it strictly in the JSON fields. If recipient details are missing, invent a suitable corporate name and email.';
      
      const messages = [
        {
          role: 'system',
          content: replyToEmail
            ? `${systemPrompt}\n\nYou are writing a reply to the following email:\nFrom: ${replyToEmail.fromName} <${replyToEmail.from}>\nSubject: ${replyToEmail.subject}\nContent:\n${replyToEmail.body}\n\nMake sure to set "toName" to "${replyToEmail.fromName || ''}", "toEmail" to "${replyToEmail.from || ''}", and "subject" to "Re: ${replyToEmail.subject}".`
            : systemPrompt
        },
        {
          role: 'user',
          content: aiPrompt
        }
      ];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }) });

      if (!response.ok) {
        let errorMsg = 'AI failed to write email';
        try {
          const errData = await response.json();
          if (errData?.error) {
            errorMsg = errData.error;
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }

      const data = await response.json();
      
      // Extract JSON from response
      const rawText = data.text;
      const cleanJsonText = rawText.trim().replace(/^```json/i, '').replace(/^```/, '').trim();
      const defaultTo = user?.email ?? '';
      const defaultToName = user?.name ?? '';
      let emailObj = {
        toName: defaultToName,
        to: defaultTo,
        subject: 'Draft Email',
        body: cleanJsonText
      };

      try {
        const parsed = JSON.parse(cleanJsonText);
        emailObj = {
          toName: parsed.toName || defaultToName,
          to: parsed.toEmail || defaultTo,
          subject: parsed.subject || 'Draft Email',
          body: parsed.body || ''
        };
      } catch (err) {
        console.warn('JSON parsing failed, fell back to raw message body:', err);
      }

      addEmail({
        to: emailObj.to,
        toName: emailObj.toName,
        subject: emailObj.subject,
        body: emailObj.body,
        status: 'draft',
        aiGenerated: true,
        sourcePrompt: aiPrompt
      });

      setAiPrompt('');
      setComposeOpen(false);
      setIsDrafting(false);
      setReplyToEmail(null);
      toast.success('AI draft created!');
    } catch (error: any) {
      console.error(error);
      setIsDrafting(false);
      toast.error(error?.message || 'Failed to generate email with AI');
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      
      {/* Left Sidebar - Mailboxes */}
      <div className="w-56 border-r border-border bg-sidebar hidden lg:flex flex-col h-full shrink-0">
        <div className="p-6">
          <Button 
            onClick={() => setComposeOpen(true)}
            className="w-full bg-foreground text-background hover:opacity-90 gap-2 h-8 text-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Compose
          </Button>
        </div>

        {inboundEmailAddress && (
          <div className="mx-6 mb-4 p-3 rounded-lg bg-muted/40 border border-border/50 flex flex-col gap-1.5 text-left">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Your Inbound Mailbox</span>
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs truncate font-mono select-all text-foreground" title={inboundEmailAddress}>
                {inboundEmailAddress}
              </span>
              <button
                type="button"
                className="text-[10px] text-primary hover:underline ml-1 shrink-0 font-medium bg-transparent border-0 cursor-pointer"
                onClick={() => {
                  navigator.clipboard.writeText(inboundEmailAddress);
                  toast.success('Inbound address copied!');
                }}
              >
                Copy
              </button>
            </div>
            <button
              type="button"
              onClick={syncInboundEmails}
              disabled={isSyncingEmails}
              className="text-[10px] text-muted-foreground hover:text-foreground text-left flex items-center gap-1 font-medium mt-1 bg-transparent border-0 cursor-pointer"
            >
              <img src="https://www.google.com/s2/favicons?domain=mail.tm&sz=32" className={cn("w-3.5 h-3.5 object-contain inline-block", isSyncingEmails && "animate-spin")} alt="" />
              {isSyncingEmails ? 'Syncing...' : 'Sync Emails'}
            </button>
          </div>
        )}
        
        <nav className="flex-1 px-4 flex flex-col gap-1">
          <Button 
            variant={activeTab === 'inbox' ? 'secondary' : 'ghost'} 
            className="justify-start gap-3 w-full relative"
            onClick={() => setActiveTab('inbox')}
          >
            <Inbox className="w-4 h-4 text-muted-foreground" />
            Inbox
            <Badge variant="outline" className="absolute right-2 bg-muted text-foreground text-[10px] h-5 px-1.5 rounded-full border-border/40">
              {emails.filter(e => e.status === 'received').length}
            </Badge>
          </Button>
          <Button 
            variant={activeTab === 'drafts' ? 'secondary' : 'ghost'} 
            className="justify-start gap-3 w-full relative"
            onClick={() => setActiveTab('drafts')}
          >
            <Edit3 className="w-4 h-4 text-muted-foreground" />
            AI Drafts
            <Badge variant="default" className="absolute right-2 bg-primary text-primary-foreground text-[10px] h-5 px-1.5 rounded-full">
              {emails.filter(e => e.status === 'draft' || e.status === 'pending').length}
            </Badge>
          </Button>
          <Button 
            variant={activeTab === 'sent' ? 'secondary' : 'ghost'} 
            className="justify-start gap-3 w-full"
            onClick={() => setActiveTab('sent')}
          >
            <Send className="w-4 h-4 text-muted-foreground" />
            Sent
          </Button>
        </nav>

        {/* AI Suggestions widget */}
        <div className="mt-auto p-4 border-t border-border bg-muted/10 flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-500">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI suggests:</span>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                setActiveTab('inbox');
                const unansweredCount = emails.filter(e => e.status === 'received').length;
                toast.success(`Analyzing inbox: ${unansweredCount} unanswered email${unansweredCount !== 1 ? 's' : ''} require${unansweredCount === 1 ? 's' : ''} attention`);
              }}
              className="w-full text-left bg-card hover:bg-muted border border-border p-2 rounded-lg text-[10px] leading-normal font-semibold transition-colors cursor-pointer"
            >
              • Reply to {emails.filter(e => e.status === 'received').length} unanswered email{emails.filter(e => e.status === 'received').length !== 1 ? 's' : ''}
            </button>
            <button
              onClick={() => {
                const unanswered = emails.filter(e => e.status === 'received');
                const summaryText = unanswered.length > 0 
                  ? `Inbox summarized: ${unanswered.map(e => e.subject).slice(0, 2).map(s => `"${s}"`).join(' & ')} require replies.`
                  : 'Inbox summarized: No unanswered emails pending.';
                toast.promise(
                  new Promise(resolve => setTimeout(resolve, 1500)),
                  {
                    loading: 'Summarizing inbox content...',
                    success: summaryText,
                    error: 'Error summarizing.'
                  }
                );
              }}
              className="w-full text-left bg-card hover:bg-muted border border-border p-2 rounded-lg text-[10px] leading-normal font-semibold transition-colors cursor-pointer"
            >
              • Summarize inbox
            </button>
          </div>
        </div>
      </div>

      {/* Middle Column - Email List */}
      <div className="w-full md:w-80 border-r border-border/80 bg-background flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold capitalize text-xs text-muted-foreground uppercase tracking-wider">
              {activeTab === 'drafts' ? 'AI Generated Drafts' : activeTab === 'inbox' ? 'Inbox' : activeTab}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              disabled={isSyncingEmails}
              onClick={syncInboundEmails}
              className="w-6 h-6 rounded hover:bg-muted text-muted-foreground"
              title="Refresh Mailbox"
            >
              <img src="https://www.google.com/s2/favicons?domain=mail.tm&sz=32" className={cn("w-4 h-4 object-contain inline-block", isSyncingEmails && "animate-spin")} alt="" />
            </Button>
          </div>
          
          {activeTab === 'inbox' && inboundEmailAddress && (
            <div className="mb-3 px-2.5 py-1.5 rounded bg-muted/40 border border-border/40 flex justify-between items-center text-[10px] text-muted-foreground">
              <span className="truncate font-mono select-all" title="Your private inbox address">
                {inboundEmailAddress}
              </span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(inboundEmailAddress);
                  toast.success('Inbound address copied!');
                }}
                className="text-primary font-medium hover:underline ml-2 shrink-0 bg-transparent border-0 cursor-pointer"
              >
                Copy
              </button>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search emails..." 
              className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-border/60 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredEmails.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Inbox className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-xs">No emails in {activeTab}</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredEmails.map(email => (
                <button
                  key={email.id}
                  onClick={() => setSelectedEmailId(email.id)}
                  className={cn(
                    "p-4 text-left border-b border-border/40 transition-all hover:bg-muted/30",
                    selectedEmailId === email.id ? "bg-muted border-l-2 border-l-[#37352f] dark:border-l-[#e3e3e2]" : "border-l-2 border-l-transparent"
                  )}
                >
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <span className="font-semibold truncate text-xs text-foreground">
                      {email.status === 'received' ? (email.fromName || email.from) : email.toName}
                    </span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {format(new Date(email.createdAt), 'MMM d')}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold truncate mb-1 text-foreground">{email.subject}</h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {email.body}
                  </p>
                  
                  {email.status === 'draft' && (
                    <div className="mt-2 flex items-center gap-1 text-[9px] text-amber-600 font-semibold bg-amber-50 dark:bg-amber-950/20 w-fit px-2 py-0.5 rounded border border-amber-200/20">
                      <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                      Awaiting Review
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Email Detail */}
      <div className="flex-1 bg-background flex flex-col h-full hidden md:flex relative overflow-hidden">
        {selectedEmail ? (
          <>
            {/* Action Bar */}
            <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleDelete}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-8 h-8 rounded-md"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button variant="ghost" size="icon" className="text-muted-foreground w-8 h-8 rounded-md hover:bg-muted">
                  <Star className="w-4 h-4" />
                </Button>
              </div>
              
              {selectedEmail.status === 'draft' && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleOpenEdit} className="gap-2 border-border/80 text-xs">
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Draft
                  </Button>
                  <Button 
                    onClick={handleApproveSend}
                    size="sm"
                    className="bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 shadow-sm gap-2 text-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Approve & Send
                  </Button>
                </div>
              )}

              {selectedEmail.status === 'received' && (
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => handleReplyClick(selectedEmail)}
                    size="sm"
                    className="bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 shadow-sm gap-2 text-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Reply with AI
                  </Button>
                </div>
              )}
            </div>

            {/* Email Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-[#fcfcfc] dark:bg-[#1f1f1f]">
              <div className="max-w-2xl mx-auto flex flex-col gap-6">
                
                {selectedEmail.status === 'draft' && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/20 rounded-xl p-4 flex items-start gap-3 text-amber-700 dark:text-amber-400">
                    <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                    <div className="flex flex-col gap-0.5 text-xs leading-relaxed">
                      <span className="font-semibold text-sm">AI-Generated Email Draft</span>
                      <span>This message was generated using contextual workspace documents. Please verify contents before final release. <strong>Nexus AI does not autonomously dispatch emails.</strong></span>
                    </div>
                  </div>
                )}

                {selectedEmail.status === 'received' && (
                  <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/20 rounded-xl p-4 flex items-start gap-3 text-indigo-700 dark:text-indigo-400">
                    <Mail className="w-5 h-5 mt-0.5 shrink-0" />
                    <div className="flex flex-col gap-0.5 text-xs leading-relaxed">
                      <span className="font-semibold text-sm">Received Real-world Email</span>
                      <span>This email was received live via your inbound mailbox address. You can click <strong>Reply with AI</strong> to draft a response using Nexus AI.</span>
                    </div>
                  </div>
                )}

                <h1 className="text-xl font-bold tracking-tight text-foreground">{selectedEmail.subject}</h1>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-border">
                      <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-xs">
                        {selectedEmail.status === 'received' 
                          ? (selectedEmail.fromName || 'External User').split(' ').map((n: string) => n[0]).join('')
                          : selectedEmail.toName.split(' ').map((n: string) => n[0]).join('')
                        }
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-xs text-foreground">
                        {selectedEmail.status === 'received' 
                          ? `From: ${selectedEmail.fromName || 'External User'}`
                          : `To: ${selectedEmail.toName}`
                        }
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {selectedEmail.status === 'received' ? selectedEmail.from : selectedEmail.to}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(selectedEmail.createdAt), 'MMM d, yyyy, h:mm a')}
                  </span>
                </div>

                <Separator className="border-border/60" />

                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap leading-relaxed text-xs md:text-sm text-foreground bg-background p-6 rounded-lg border border-border/40">
                    {selectedEmail.body}
                  </div>
                </div>

                {selectedEmail.sourcePrompt && (
                  <div className="text-[10px] text-muted-foreground italic border-l-2 border-border/80 pl-3 py-1 bg-muted/20 rounded-r-md">
                    Prompt source: "{selectedEmail.sourcePrompt}"
                  </div>
                )}
                
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-[#fcfcfc] dark:bg-[#1f1f1f]">
            <Mail className="w-12 h-12 mb-4 opacity-15" />
            <p className="text-xs">Select a drafted or sent email thread to review details.</p>
          </div>
        )}
      </div>

      {/* AI COMPOSE MODAL DIALOG */}
      <Dialog open={composeOpen} onOpenChange={(open) => {
        setComposeOpen(open);
        if (!open) {
          setReplyToEmail(null);
          setAiPrompt('');
        }
      }}>
        <DialogContent className="sm:max-w-md bg-background border border-border/60 shadow-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
              {replyToEmail ? 'Draft AI Reply' : 'Compose Draft with AI'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {replyToEmail 
                ? `Drafting a response to ${replyToEmail.fromName || replyToEmail.from}.` 
                : 'Provide prompts referencing specific dates, documents, or people. AI will structure it.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {replyToEmail && (
            <div className="mb-2 p-2.5 rounded bg-muted/50 border border-border text-[11px] text-muted-foreground truncate">
              <strong>Replying to:</strong> {replyToEmail.subject}
            </div>
          )}
          
          <form onSubmit={handleAiCompose} className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Instruction Prompt</label>
              <textarea 
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="e.g. Thank the client for the review and propose a follow-up meeting next week"
                rows={4}
                required
                className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            <DialogFooter className="mt-2 flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setComposeOpen(false)}>Cancel</Button>
              <Button 
                type="submit"
                disabled={isDrafting}
                className="bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 shadow-sm gap-1.5"
              >
                {isDrafting ? 'Drafting...' : 'Draft Email'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT DRAFT MODAL DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg bg-background border border-border/60 shadow-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Edit Draft Email</DialogTitle>
            <DialogDescription className="text-xs">Adjust recipient information, subject details, or message body details.</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSaveEdit} className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">To Name</label>
                <input 
                  type="text"
                  value={editToName}
                  onChange={e => setEditToName(e.target.value)}
                  required
                  className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Recipient Email</label>
                <input 
                  type="email"
                  value={editToEmail}
                  onChange={e => setEditToEmail(e.target.value)}
                  required
                  className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Subject</label>
              <input 
                type="text"
                value={editSubject}
                onChange={e => setEditSubject(e.target.value)}
                required
                className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Message Content</label>
              <textarea 
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
                rows={10}
                required
                className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none font-sans"
              />
            </div>

            <DialogFooter className="mt-2 flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button 
                type="submit"
                className="bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 shadow-sm"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
