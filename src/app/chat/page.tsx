'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useWorkspace } from '@/lib/store';
import { usePopup } from '@/lib/popup-context';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Plus, Send, Sparkles, Paperclip, Trash2, FileText, CheckCircle2, ChevronRight, Check, Menu, Mic
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/components/chat/chat-message';
import { SuggestedPrompts } from '@/components/chat/suggested-prompts';
import { toast } from 'sonner';

export default function ChatPage() {
  const { 
    conversations, 
    activeConversationId, 
    setActiveConversationId,
    addMessage,
    createConversation,
    deleteConversation,
    documents,
    user,
    workspace,
    trackAiUsage,
    allUsers,
    createCalendarEvent,
    addTask,
    addEmail
  } = useWorkspace();
  const { confirm } = usePopup();
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Record<string, boolean>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userDocuments = useMemo(
    () => documents.filter(doc => !user || doc.uploadedBy?.id === user.id || doc.uploadedBy?.email === user.email),
    [documents, user]
  );

  useEffect(() => {
    
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    }
  }, []);

  // Default select all documents on load
  useEffect(() => {
    if (userDocuments.length > 0 && Object.keys(selectedDocs).length === 0) {
      const initial: Record<string, boolean> = {};
      userDocuments.forEach(doc => {
        initial[doc.id] = true;
      });
      setSelectedDocs(initial);
    }
  }, [userDocuments, selectedDocs]);

  // Handle pending AI document actions from details view
  useEffect(() => {
    const pending = localStorage.getItem('nexus_pending_action');
    if (pending && userDocuments.length > 0) {
      try {
        const { documentId, prompt } = JSON.parse(pending);
        
        // Select ONLY the targeted document for context
        const nextDocs: Record<string, boolean> = {};
        userDocuments.forEach(doc => {
          nextDocs[doc.id] = doc.id === documentId;
        });
        setSelectedDocs(nextDocs);
        
        // Trigger prompt submission
        handleSend(prompt);
        localStorage.removeItem('nexus_pending_action');
      } catch (e) {
        console.error('Pending action error:', e);
      }
    }
  }, [userDocuments, activeConversationId]);

  const activeConversation = conversations.find(c => c.id === activeConversationId) || conversations[0];
  const isEmpty = !activeConversation || activeConversation.messages.length === 0;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages, isTyping]);

  const handleSend = async (text: string = inputValue) => {
    if (!text.trim()) return;

    let targetConvo = activeConversation;
    // Create new conversation on the fly if none exists
    if (!targetConvo) {
      const newTitle = text.slice(0, 30) + (text.length > 30 ? '...' : '');
      const newId = createConversation(newTitle);
      targetConvo = conversations.find(c => c.id === newId) || {
        id: newId,
        title: newTitle,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString() };
    }

    // Add user message locally
    const newUserMessage = {
      role: 'user' as const,
      content: text };
    
    addMessage(targetConvo.id, newUserMessage);
    setInputValue('');
    setIsTyping(true);

    try {
      const usage = await trackAiUsage();
      if (!usage.ok) {
        setIsTyping(false);
        addMessage(targetConvo.id, {
          role: 'assistant',
          content: usage.message });
        return;
      }

      // Gather messaging history
      const messageHistory = [
        ...targetConvo.messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: text }
      ];

      // Build context string from checked documents
      const activeDocs = userDocuments.filter(d => selectedDocs[d.id]);
      const documentContext = activeDocs
        .filter(d => d.content && d.content.trim().length > 0)
        .map(d => `Document Title: ${d.title}\nContent:\n${d.content}`)
        .join('\n\n---\n\n');

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messageHistory,
          documentContext,
          workspaceId: workspace?.id,
          users: allUsers,
          currentUser: user ? { id: user.id, name: user.name, email: user.email } : null,
          currentDate: new Date().toISOString()
        }) });

      if (!response.ok) {
        let errorMsg = 'Failed to fetch AI response';
        try {
          const errData = await response.json();
          if (errData?.error) {
            errorMsg = errData.error;
          }
        } catch (_) {}

        setIsTyping(false);
        addMessage(targetConvo.id, {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${errorMsg}. Please check your API key configuration in your .env.local file or your internet connection.` });
        return;
      }

      const data = await response.json();
      setIsTyping(false);

      // Execute workspace actions returned by the AI
      if (data.actions && Array.isArray(data.actions)) {
        for (const action of data.actions) {
          if (!action || typeof action !== 'object') continue;

          const actionType = action.type || action.action;
          switch (actionType) {
            case 'create_calendar_event': {
              const ev = action.event || action;
              const attendeeIdsOrNames = ev.attendeeIds || ev.attendee_ids || ev.attendees || [];
              const eventAttendees = allUsers.filter(u => 
                attendeeIdsOrNames.includes(u.id) ||
                attendeeIdsOrNames.includes(u.email) ||
                attendeeIdsOrNames.includes(u.name)
              );
              
              const eventTitle = ev.title || 'Meeting';
              const eventDate = ev.date || new Date().toISOString().split('T')[0];
              const eventStart = ev.startTime || ev.start_time || '10:00';
              const eventEnd = ev.endTime || ev.end_time || '11:00';
              const eventCategory = ev.category || 'meeting';
              const eventDesc = ev.description || ev.desc || '';
              const eventColor = ev.color || 'indigo';

              createCalendarEvent({
                title: eventTitle,
                date: eventDate,
                startTime: eventStart,
                endTime: eventEnd,
                category: eventCategory,
                description: eventDesc,
                attendees: eventAttendees,
                isAiExtracted: true,
                addedToCalendar: true,
                color: eventColor
              });
              toast.success(`Calendar event created: ${eventTitle}`);
              break;
            }
            case 'create_task': {
              const t = action.task || action;
              const taskTitle = t.title || t.name || 'New Task';
              const taskDesc = t.description || t.desc || '';
              const taskPriority = t.priority || 'medium';
              const taskDueDate = t.dueDate || t.due_date || new Date().toISOString().split('T')[0];
              const taskTags = t.tags || [];
              const assigneeVal = t.assigneeId || t.assignee_id || t.assignee;
              
              const taskAssignee = allUsers.find(u => 
                u.id === assigneeVal || 
                u.email === assigneeVal || 
                u.name === assigneeVal ||
                (typeof assigneeVal === 'object' && (assigneeVal?.id === u.id || assigneeVal?.email === u.email || assigneeVal?.name === u.name))
              ) || user;

              addTask({
                title: taskTitle,
                description: taskDesc,
                status: 'todo',
                priority: taskPriority,
                assignee: taskAssignee as any,
                dueDate: taskDueDate,
                tags: taskTags,
                subtasks: []
              });
              toast.success(`Workspace task created: ${taskTitle}`);
              break;
            }
            case 'send_email': {
              const em = action.email || action;
              const emailTo = em.to || em.email || em.recipient || '';
              const emailToName = em.toName || em.to_name || em.recipientName || em.recipient_name || '';
              const emailSubject = em.subject || em.sub || 'Follow-up from Nexus AI';
              const emailBody = em.body || em.content || em.message || '';

              if (emailTo) {
                addEmail({
                  to: emailTo,
                  toName: emailToName || emailTo.split('@')[0],
                  from: user?.email || '',
                  fromName: user?.name || '',
                  subject: emailSubject,
                  body: emailBody,
                  status: 'sent',
                  aiGenerated: true
                });
                toast.success(`Confirmation email sent to ${emailToName || emailTo}`);
              }
              break;
            }
          }
        }
      }

      // Extract citation files for rendering chips
      const sources = activeDocs
        .filter(d => text.toLowerCase().includes(d.title.toLowerCase()) || data.text.toLowerCase().includes(d.title.toLowerCase()))
        .map(d => ({
          documentId: d.id,
          documentTitle: d.title,
          excerpt: d.summary,
          relevance: 1
        }));

      addMessage(targetConvo.id, {
        role: 'assistant',
        content: data.text,
        ...(sources.length > 0 ? { sources } : {})
      });

    } catch (error: any) {
      console.error('Chat error:', error);
      setIsTyping(false);
      addMessage(targetConvo.id, {
        role: 'assistant',
        content: `Sorry, I encountered a connection or network error: ${error?.message || 'Unknown error'}. Please verify that your dev server is running and connected.` });
    }
  };

  const handleModifyResponse = async (messageId: string, type: 'shorter' | 'longer' | 'simpler' | 'professional') => {
    if (!activeConversation) return;

    let promptInstruction = '';
    switch (type) {
      case 'shorter':
        promptInstruction = 'Please rewrite your previous response to be shorter and more concise.';
        break;
      case 'longer':
        promptInstruction = 'Please rewrite your previous response to be longer, explaining with more depth.';
        break;
      case 'simpler':
        promptInstruction = 'Please rewrite your previous response using simpler, easier-to-understand language.';
        break;
      case 'professional':
        promptInstruction = 'Please rewrite your previous response using a highly professional and formal business tone.';
        break;
    }

    handleSend(promptInstruction);
  };

  const handleCreateChat = () => {
    const id = createConversation(`Chat ${format(new Date(), 'MMM d, h:mm a')}`);
    toast.success('New conversation started');
  };

  const handleDeleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const isConfirmed = await confirm('Are you sure you want to delete this conversation?', 'Delete Conversation');
    if (isConfirmed) {
      deleteConversation(id);
      toast.success('Conversation deleted');
    }
  };

  const toggleDocSelection = (docId: string) => {
    setSelectedDocs(prev => ({
      ...prev,
      [docId]: !prev[docId]
    }));
  };

  const selectAllDocs = () => {
    const allSelected = userDocuments.every(d => selectedDocs[d.id]);
    const next: Record<string, boolean> = {};
    userDocuments.forEach(d => {
      next[d.id] = !allSelected;
    });
    setSelectedDocs(next);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-transparent relative">
      
      {/* Backdrop for mobile */}
      {!sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-20 md:hidden" 
          onClick={() => setSidebarCollapsed(true)} 
        />
      )}
      
      {/* Collapsible Left Sidebar - Chat Manager & Active Context */}
      <AnimatePresence initial={false}>
        {!sidebarCollapsed && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="border-r border-border/40 bg-sidebar/20 backdrop-blur-md flex flex-col h-full shrink-0 overflow-hidden max-md:fixed max-md:left-0 max-md:top-0 max-md:h-full max-md:z-30 max-md:shadow-2xl"
          >
            
            {/* Conversations Header */}
            <div className="p-4 border-b border-border/60 flex items-center justify-between shrink-0">
              <h2 className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-foreground/80" />
                Conversations
              </h2>
              <Button variant="ghost" size="icon" onClick={handleCreateChat} className="w-7 h-7 rounded-md hover:bg-muted">
                <Plus className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </Button>
            </div>
            
            {/* Conversations List */}
            <div className="h-[40%] border-b border-border/60 overflow-y-auto scrollbar-thin">
              <div className="p-2 flex flex-col gap-0.5">
                {conversations.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No conversations yet.
                  </div>
                ) : (
                  conversations.map(conv => (
                    <div
                      key={conv.id}
                      onClick={() => setActiveConversationId(conv.id)}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer group",
                        activeConversationId === conv.id 
                          ? "bg-muted text-foreground font-medium" 
                          : "hover:bg-muted/40 text-muted-foreground"
                      )}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1 pr-1">
                        <span className={cn(
                          "font-medium text-xs truncate",
                          activeConversationId === conv.id ? "text-foreground font-semibold" : "text-foreground/80"
                        )}>
                          {conv.title}
                        </span>
                        {conv.messages.length > 0 && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            {conv.messages[conv.messages.length - 1].content}
                          </span>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => handleDeleteChat(e, conv.id)} 
                        className="w-6 h-6 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sources Checklist Header */}
            <div className="p-4 border-b border-border/60 flex items-center justify-between shrink-0">
              <h2 className="font-semibold text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-foreground/80" />
                AI Context Sources
              </h2>
              {userDocuments.length > 0 && (
                <Button variant="link" onClick={selectAllDocs} className="h-auto p-0 text-[10px] text-muted-foreground hover:text-foreground hover:no-underline">
                  {userDocuments.every(d => selectedDocs[d.id]) ? 'Deselect' : 'Select All'}
                </Button>
              )}
            </div>

            {/* Sources Checklist List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <div className="p-3 flex flex-col gap-1.5">
                {userDocuments.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No documents. Upload files in Documents page first.
                  </div>
                ) : (
                  userDocuments.map(doc => {
                    const isChecked = !!selectedDocs[doc.id];
                    return (
                      <div 
                        key={doc.id}
                        onClick={() => toggleDocSelection(doc.id)}
                        className={cn(
                          "flex items-center gap-2.5 p-2 rounded-lg border transition-all cursor-pointer bg-background",
                          isChecked ? "border-primary/20 bg-primary/5" : "border-border/40 hover:bg-muted/30"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0",
                          isChecked ? "bg-primary border-primary text-primary-foreground" : "border-border/80"
                        )}>
                          {isChecked && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-semibold truncate leading-tight text-foreground">{doc.title}</span>
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{doc.type}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-h-0 relative bg-transparent overflow-hidden">
        
        {/* Header - Collapsible Toggle & Active Info */}
        <div className="h-12 border-b border-border flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-8 h-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex"
            >
              <Menu className="w-4 h-4" />
            </Button>
            <h2 className="font-semibold text-sm leading-none">{activeConversation?.title || 'Nexus AI Workspace Assistant'}</h2>
          </div>
          <div className="text-[10px] text-muted-foreground font-semibold bg-muted/40 px-2.5 py-1 rounded-full border border-border/40">
            Context sources active: {userDocuments.filter(d => selectedDocs[d.id]).length}
          </div>
        </div>

        {/* Conversation Message Space */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 pt-6 pb-36 scrollbar-thin">
          {isEmpty ? (
            <div className="h-full flex flex-col items-center justify-center pt-16 pb-8">
              
              {/* Nexus AI Title Greeting with animated-style visual colors */}
              <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-center mb-1 flex items-center justify-center gap-1.5">
                <span className="bg-gradient-to-r from-[#4285f4] via-[#9b72cb] via-[#d96570] to-[#4285f4] bg-clip-text text-transparent">
                  Hello, {user?.name || 'there'}.
                </span>
              </h1>
              
              <p className="text-muted-foreground text-xl md:text-2xl font-medium text-center mb-10">
                How can I help you today?
              </p>
              
              <SuggestedPrompts onSelect={handleSend} />
            </div>
          ) : (
            <div className="flex flex-col gap-8 max-w-3xl mx-auto py-4">
              {activeConversation.messages.map(msg => (
                <ChatMessage 
                  key={msg.id} 
                  message={msg} 
                  onModify={(type) => handleModifyResponse(msg.id, type)}
                />
              ))}
              
              {isTyping && (
                <ChatMessage 
                  message={{
                    id: 'typing',
                    role: 'assistant',
                    content: 'Analyzing checked documents and typing...',
                    timestamp: new Date().toISOString(),
                    isStreaming: true
                  }} 
                />
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Centered Floating Pill Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-background via-background/80 to-transparent shrink-0 z-10">
          <div className="max-w-3xl mx-auto relative group">
            
            {/* Attachment Button */}
            <div className="absolute inset-y-0 left-4 flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => toast.info('To manage attachments, use the AI Context checklist on the left sidebar.')}
                className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                title="Add attachment"
              >
                <Paperclip className="w-4.5 h-4.5" />
              </Button>
            </div>
            
            {/* Pill input */}
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask a question about your documents..."
              className="w-full glass shadow-lg rounded-full py-4 pl-14 pr-24 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              data-tutorial="chat-input"
            />
            
            {/* Decorative Microphone & Send Action Buttons */}
            <div className="absolute inset-y-0 right-2.5 flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon"
                className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                title="Use microphone"
              >
                <Mic className="w-4.5 h-4.5" />
              </Button>
              
              <Button 
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isTyping}
                size="icon"
                className={cn(
                  "w-8 h-8 rounded-full transition-all duration-300",
                  inputValue.trim() 
                    ? "bg-foreground text-background hover:opacity-90" 
                    : "bg-transparent text-muted-foreground hover:bg-muted"
                )}
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="text-center mt-2.5">
            <span className="text-[10px] text-muted-foreground font-semibold">Nexus AI may display inaccurate info, including about people, so double-check its responses.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
