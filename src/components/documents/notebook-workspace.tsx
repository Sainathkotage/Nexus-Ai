'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useWorkspace, encryptMessage, decryptMessage } from '@/lib/store';
import { DocumentFile } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Sparkles, Download, Share2, Trash2, Users, Calendar, 
  Clock, AlignLeft, FileText, Brain, HelpCircle, Grid3X3, MessageSquare, 
  Send, RefreshCw, Check, X, ChevronRight, ChevronLeft, Search, Award, Info, 
  BookOpen, ChevronDown, BookMarked, Globe, Lightbulb, User, Copy, Quote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface NotebookWorkspaceProps {
  document: DocumentFile;
  onClose: () => void;
}

type TabType = 'resources' | 'practice' | 'tables' | 'chat';
type ResourceFormat = 'faq' | 'briefing' | 'study-guide' | 'timeline';

export function NotebookWorkspace({ document, onClose }: NotebookWorkspaceProps) {
  const { deleteDocument, workspace, user } = useWorkspace();
  const [activeTab, setActiveTab] = useState<TabType>('resources');
  
  // Left side state
  const [leftTab, setLeftTab] = useState<'text' | 'entities'>('text');
  const [highlightedText, setHighlightedText] = useState<string | null>(null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const textContainerRef = useRef<HTMLDivElement>(null);

  // AI resource state
  const [activeResource, setActiveResource] = useState<ResourceFormat | null>(null);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [studyData, setStudyData] = useState<Record<string, any>>({});
  
  // Key insights auto-generation on mount if empty
  const [insights, setInsights] = useState<string[]>(document.keyPoints || []);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Focused Chat state
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string; timestamp: Date }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Load resources & chat from localStorage
  useEffect(() => {
    const cachedData: Record<string, any> = {};
    const formats: string[] = ['faq', 'briefing', 'study-guide', 'timeline', 'insights', 'flashcards', 'quiz', 'table'];
    
    formats.forEach(f => {
      const cached = localStorage.getItem(`nexus_study_${document.id}_${f}`);
      if (cached) {
        try {
          cachedData[f] = JSON.parse(cached);
        } catch (e) {
          console.error(e);
        }
      }
    });
    setStudyData(cachedData);

    if (cachedData['insights']?.insights) {
      setInsights(cachedData['insights'].insights);
    } else if (document.keyPoints && document.keyPoints.length > 0) {
      setInsights(document.keyPoints);
    } else {
      // Auto-trigger insights generation if empty
      generateInsights();
    }

    // Load Chat history
    const cachedChat = localStorage.getItem(`nexus_chat_${document.id}`);
    if (cachedChat) {
      try {
        const decrypted = decryptMessage(cachedChat);
        setChatMessages(JSON.parse(decrypted).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      } catch (e) {
        // Fallback for unencrypted chats
        try {
          setChatMessages(JSON.parse(cachedChat).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
        } catch (err) {
          console.error(err);
        }
      }
    } else {
      // Initial greeting message
      setChatMessages([
        {
          role: 'assistant',
          content: `Hi! I've loaded "${document.title}". You can ask me questions specifically about this document, request summaries, or have me extract details. Any direct quotes from the text inside double quotes can be clicked to highlight the text in the source reader!`,
          timestamp: new Date()
        }
      ]);
    }
  }, [document.id]);

  // Scroll to bottom of chat when new message is added
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Generate Key Insights
  const generateInsights = async () => {
    if (insightsLoading) return;
    setInsightsLoading(true);
    try {
      const response = await fetch('/api/study/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentTitle: document.title,
          documentContent: document.content || document.summary,
          format: 'insights',
          workspaceId: workspace?.id
        })
      });
      if (!response.ok) throw new Error('Failed to generate insights');
      const data = await response.json();
      if (data.insights) {
        setInsights(data.insights);
        localStorage.setItem(`nexus_study_${document.id}_insights`, JSON.stringify(data));
      }
    } catch (err) {
      console.error('Error generating key insights:', err);
    } finally {
      setInsightsLoading(false);
    }
  };

  // Generate FAQ / Briefing / Study Guide / Timeline
  const handleGenerateResource = async (formatType: ResourceFormat) => {
    if (resourceLoading) return;
    setResourceLoading(true);
    setActiveResource(formatType);
    setLoadingStep('Ingesting document structures...');

    const steps = [
      'Deconstructing text vectors...',
      'Synthesizing structural insights...',
      'Assembling responsive markdown nodes...',
      'Finalizing resources...'
    ];
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        setLoadingStep(steps[stepIdx]);
        stepIdx++;
      }
    }, 1200);

    try {
      const response = await fetch('/api/study/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentTitle: document.title,
          documentContent: document.content || document.summary,
          format: formatType,
          workspaceId: workspace?.id
        })
      });
      clearInterval(interval);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Failed to generate ${formatType}`);
      }

      const generated = await response.json();
      localStorage.setItem(`nexus_study_${document.id}_${formatType}`, JSON.stringify(generated));
      setStudyData(prev => ({ ...prev, [formatType]: generated }));
      toast.success(`${formatType.toUpperCase().replace('-', ' ')} generated successfully!`);
    } catch (e: any) {
      clearInterval(interval);
      toast.error(e.message || 'Generation failed');
    } finally {
      setResourceLoading(false);
    }
  };

  // Focused Document Chat submit
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = { role: 'user' as const, content: chatInput, timestamp: new Date() };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          documentContext: document.content || document.summary,
          workspaceId: workspace?.id
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to get chat response');
      }

      const data = await response.json();
      const assistantMsg = { role: 'assistant' as const, content: data.text, timestamp: new Date() };
      const finalMessages = [...updatedMessages, assistantMsg];
      setChatMessages(finalMessages);
      localStorage.setItem(`nexus_chat_${document.id}`, encryptMessage(JSON.stringify(finalMessages)));
    } catch (e: any) {
      toast.error(e.message || 'Chat error');
    } finally {
      setChatLoading(false);
    }
  };

  const clearChatHistory = () => {
    if (confirm('Clear chat history for this document?')) {
      const initial = [
        {
          role: 'assistant' as const,
          content: `Chat history cleared. What would you like to know about "${document.title}"?`,
          timestamp: new Date()
        }
      ];
      setChatMessages(initial);
      localStorage.removeItem(`nexus_chat_${document.id}`);
    }
  };

  // Citation highlight helper
  const handleQuoteClick = (quote: string) => {
    // Standardize quotation matching
    const sanitizedQuote = quote.replace(/^[“"'\s]+|[”"'\s]+$/g, '').trim();
    if (!sanitizedQuote || sanitizedQuote.length < 5) return;

    setLeftTab('text');
    setHighlightedText(sanitizedQuote);

    // Scroll to text marked node
    setTimeout(() => {
      const element = window.document.getElementById('doc-highlight-node');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        toast.info('Source cited paragraph highlighted', { duration: 1500 });
      } else {
        toast.error('Unable to highlight exact match in text.');
      }
    }, 150);
  };

  // Renders the raw document text with possible interactive highlights
  const renderSourceContent = () => {
    const rawText = document.content || document.summary || 'No source content found.';
    if (!highlightedText) {
      return <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{rawText}</div>;
    }

    const index = rawText.toLowerCase().indexOf(highlightedText.toLowerCase());
    if (index === -1) {
      return <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{rawText}</div>;
    }

    const before = rawText.substring(0, index);
    const match = rawText.substring(index, index + highlightedText.length);
    const after = rawText.substring(index + highlightedText.length);

    return (
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
        {before}
        <mark 
          id="doc-highlight-node" 
          className="bg-yellow-200 dark:bg-yellow-900/50 text-foreground px-1 py-0.5 rounded font-medium border-b border-yellow-500 shadow-sm animate-pulse"
        >
          {match}
        </mark>
        {after}
      </div>
    );
  };

  // Chat text parser to detect double quotes and make them clickable citations
  const renderChatTextWithQuotes = (text: string) => {
    // Regex for matching content inside quotes
    const quoteRegex = /"([^"]+)"|“([^”]+)”/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = quoteRegex.exec(text)) !== null) {
      const fullQuote = match[0];
      const innerText = match[1] || match[2];
      const matchIndex = match.index;

      // Add text before the quote
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }

      // Check if this quote is a valid substring in the document content
      const sourceText = document.content || document.summary || '';
      const isSub = sourceText.toLowerCase().includes(innerText.toLowerCase()) && innerText.length > 5;

      if (isSub) {
        parts.push(
          <span 
            key={matchIndex}
            onClick={() => handleQuoteClick(innerText)}
            className="cursor-pointer border-b border-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-medium px-1 rounded inline-flex items-center gap-0.5 transition-colors group"
            title="Click to view quote source citation"
          >
            <Quote className="w-2.5 h-2.5 inline shrink-0" />
            {fullQuote}
          </span>
        );
      } else {
        parts.push(fullQuote);
      }

      lastIndex = quoteRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative border border-border/40">
      
      {/* Top Header Control Bar */}
      <div className="h-14 border-b border-border/80 px-6 shrink-0 flex items-center justify-between bg-card/60 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose} 
            className="hover:bg-accent/40 rounded-lg text-muted-foreground hover:text-foreground gap-1.5 h-9"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Notebook Sources</span>
          </Button>
          <Separator orientation="vertical" className="h-4 bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-xl">{document.thumbnail}</span>
            <span className="font-semibold text-sm max-w-[280px] truncate leading-none">{document.title}</span>
            <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider py-0.5 px-2">
              {document.type}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Action buttons */}
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive border-border/60"
            onClick={() => {
              if (confirm('Are you sure you want to delete this document from your workspace?')) {
                deleteDocument(document.id);
                onClose();
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 border-border/60" onClick={() => {
            navigator.clipboard.writeText(document.content || document.summary);
            toast.success('Document text copied to clipboard!');
          }}>
            <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 border-border/60" onClick={() => {
            const blob = new Blob([document.content || document.summary], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = window.document.createElement('a');
            link.href = url;
            link.download = `${document.title.replace(/\s+/g, '_')}_raw.txt`;
            link.click();
            URL.revokeObjectURL(url);
          }}>
            <Download className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </Button>
        </div>
      </div>

      {/* Main Split Body */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-muted/5">
        
        {/* LEFT SOURCE PANEL (40% width) */}
        <div 
          className={cn(
            "border-r border-border flex flex-col bg-card/25 overflow-hidden transition-all duration-300",
            leftPanelCollapsed ? "w-0 border-r-0" : "w-[40%]"
          )}
        >
          
          {/* Header tabs for left panel */}
          <div className="h-11 border-b border-border/80 px-4 shrink-0 flex items-center justify-between bg-card/40">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <button 
                onClick={() => setLeftTab('text')}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-colors",
                  leftTab === 'text' 
                    ? "bg-foreground/5 text-foreground font-bold shadow-inner" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Document Source Text
              </button>
              <button 
                onClick={() => setLeftTab('entities')}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-colors",
                  leftTab === 'entities' 
                    ? "bg-foreground/5 text-foreground font-bold shadow-inner" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Entities & Details
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {highlightedText && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setHighlightedText(null)}
                  className="text-[10px] text-muted-foreground hover:text-foreground h-6 px-1.5"
                >
                  Clear Highlight
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLeftPanelCollapsed(true)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-md"
                title="Collapse Source Panel"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div 
            ref={textContainerRef}
            className="flex-1 overflow-y-auto p-6 custom-scrollbar scroll-smooth"
          >
            <div>
              {leftTab === 'text' ? (
                <div className="prose dark:prose-invert max-w-none prose-sm leading-relaxed">
                  <div className="mb-4 text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>Uploaded {format(new Date(document.uploadedAt), 'MMM d, yyyy') || 'recently'}</span>
                    <span>•</span>
                    <span>{document.size}</span>
                    <span>•</span>
                    <span>By {document.uploadedBy?.name || 'You'}</span>
                  </div>
                  {renderSourceContent()}
                </div>
              ) : (
                <div className="flex flex-col gap-6 text-xs">
                  <div>
                    <h3 className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-3 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Mentioned People
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {document.extractedPeople.length > 0 ? (
                        document.extractedPeople.map((person, i) => (
                          <Badge key={i} variant="secondary" className="px-2.5 py-1 text-xs rounded-md">
                            {person}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground italic">No specific individuals detected.</span>
                      )}
                    </div>
                  </div>

                  <Separator className="bg-border/60" />

                  <div>
                    <h3 className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-3 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" /> Organizations & Companies
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {document.extractedOrganizations.length > 0 ? (
                        document.extractedOrganizations.map((org, i) => (
                          <Badge key={i} variant="outline" className="px-2.5 py-1 text-xs rounded-md border-border/80">
                            {org}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground italic">No organizations or firms detected.</span>
                      )}
                    </div>
                  </div>

                  {document.extractedDeadlines.length > 0 && (
                    <>
                      <Separator className="bg-border/60" />
                      <div>
                        <h3 className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-3 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" /> Extracted Dates & Deadlines
                        </h3>
                        <div className="flex flex-col gap-2">
                          {document.extractedDeadlines.map((dl, i) => (
                            <div key={i} className="flex justify-between items-center bg-card/65 p-2 rounded-lg border border-border/50">
                              <span className="font-medium text-foreground/80">{dl.text}</span>
                              <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-[10px]">
                                {format(new Date(dl.date), 'MMM d, yyyy')}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT WORKSPACE PANEL (60% width) */}
        <div 
          className={cn(
            "flex flex-col bg-background overflow-hidden relative transition-all duration-300",
            leftPanelCollapsed ? "w-full" : "w-[60%]"
          )}
        >
          
          {/* Main Navigation Tabs */}
          <div className="h-12 border-b border-border px-6 shrink-0 flex items-center justify-between bg-card/40 backdrop-blur-md">
            <div className="flex items-center gap-3 h-full">
              {leftPanelCollapsed && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLeftPanelCollapsed(false)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-md self-center mr-2 shrink-0"
                  title="Expand Source Panel"
                >
                  <ChevronRight className="w-4 h-4 animate-pulse" />
                </Button>
              )}
              <div className="flex space-x-6 h-full items-end">
                {(['resources', 'practice', 'tables', 'chat'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "h-12 pb-3 px-1 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-all relative capitalize",
                      activeTab === tab
                        ? "border-primary text-foreground font-bold"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab === 'resources' && <Sparkles className="w-3.5 h-3.5 text-indigo-500" />}
                    {tab === 'practice' && <HelpCircle className="w-3.5 h-3.5 text-amber-500" />}
                    {tab === 'tables' && <Grid3X3 className="w-3.5 h-3.5 text-emerald-500" />}
                    {tab === 'chat' && <MessageSquare className="w-3.5 h-3.5 text-blue-500" />}
                    <span>{tab === 'resources' ? 'Study Guide' : tab === 'practice' ? 'Practice Hub' : tab === 'tables' ? 'Extracted Tables' : 'Focused Chat'}</span>
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'chat' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearChatHistory}
                className="text-[10px] text-muted-foreground hover:bg-destructive/5 hover:text-destructive h-7 px-2"
              >
                Clear Chat
              </Button>
            )}
          </div>

          {/* RIGHT PANEL CONTENT SCROLLER */}
          <div className="flex-1 overflow-hidden relative min-h-0">
            <AnimatePresence mode="wait">
              
              {/* TAB 1: STUDY GUIDE & RESOURCES */}
              {activeTab === 'resources' && (
                <motion.div 
                  key="resources"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="h-full flex flex-col overflow-y-auto custom-scrollbar p-6 md:p-8"
                >
                  <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
                    
                    {/* Summary Card */}
                    <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm bg-gradient-to-br from-indigo-500/[0.02] to-transparent">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                          <AlignLeft className="w-4 h-4" />
                        </div>
                        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Executive Summary</h2>
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed leading-snug">
                        {document.summary || "Generating summary..."}
                      </p>
                    </div>

                    {/* Key Insights Card */}
                    <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
                            <Lightbulb className="w-4 h-4" />
                          </div>
                          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Key Insights</h2>
                        </div>
                        {insightsLoading && <div className="w-3.5 h-3.5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />}
                      </div>

                      <div className="flex flex-col gap-2.5">
                        {insightsLoading && insights.length === 0 ? (
                          <div className="text-xs text-muted-foreground animate-pulse py-2">Synthesizing key insights from document...</div>
                        ) : (
                          insights.map((insight, idx) => (
                            <div key={idx} className="flex gap-3 bg-muted/20 p-3 rounded-xl border border-border/40 hover:border-border transition-colors">
                              <span className="w-5 h-5 rounded-full bg-primary/5 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                                {idx + 1}
                              </span>
                              <p className="text-xs text-foreground/80 leading-relaxed font-medium">{insight}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Interactive Resource Generator Buttons */}
                    <div className="flex flex-col gap-3">
                      <div>
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Notebook AI Document Generators</h3>
                        <p className="text-[10px] text-muted-foreground">Select a format to construct custom learning resources in real time:</p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { id: 'faq' as ResourceFormat, title: 'FAQ Sheet', desc: 'Q&A sheet', icon: HelpCircle, color: 'hover:border-blue-500/40 hover:bg-blue-500/[0.02] text-blue-500 bg-blue-500/10' },
                          { id: 'briefing' as ResourceFormat, title: 'Briefing Doc', desc: 'Executive brief', icon: BookMarked, color: 'hover:border-purple-500/40 hover:bg-purple-500/[0.02] text-purple-500 bg-purple-500/10' },
                          { id: 'study-guide' as ResourceFormat, title: 'Study Guide', desc: 'Core modules', icon: Brain, color: 'hover:border-emerald-500/40 hover:bg-emerald-500/[0.02] text-emerald-500 bg-emerald-500/10' },
                          { id: 'timeline' as ResourceFormat, title: 'Timeline', desc: 'Chronology tracker', icon: Clock, color: 'hover:border-amber-500/40 hover:bg-amber-500/[0.02] text-amber-500 bg-amber-500/10' }
                        ].map(g => {
                          const isGenerated = !!studyData[g.id];
                          const Icon = g.icon;
                          const isActive = activeResource === g.id;

                          return (
                            <button
                              key={g.id}
                              disabled={resourceLoading}
                              onClick={() => {
                                if (isGenerated) {
                                  setActiveResource(g.id);
                                } else {
                                  handleGenerateResource(g.id);
                                }
                              }}
                              className={cn(
                                "flex flex-col gap-2 p-3 text-left border rounded-xl transition-all h-24 relative overflow-hidden group shadow-xs bg-card",
                                isActive ? "border-primary ring-1 ring-primary" : "border-border/80",
                                resourceLoading ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:-translate-y-0.5",
                                g.color
                              )}
                            >
                              <div className="flex justify-between items-start w-full">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-background/50">
                                  <Icon className="w-4.5 h-4.5" />
                                </div>
                                {isGenerated && (
                                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0">
                                    Ready
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-foreground leading-tight">{g.title}</span>
                                <span className="text-[10px] text-muted-foreground truncate">{g.desc}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* RESOURCE VIEWER BLOCK */}
                    {activeResource && (
                      <div className="border border-border/80 rounded-2xl bg-card overflow-hidden shadow-md flex flex-col min-h-[300px]">
                        
                        {/* Resource header */}
                        <div className="h-12 border-b border-border px-5 bg-card/60 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                              Resource: {activeResource.replace('-', ' ')}
                            </span>
                            {studyData[activeResource] && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  if (confirm(`Regenerate this ${activeResource.replace('-', ' ')} resource?`)) {
                                    handleGenerateResource(activeResource);
                                  }
                                }}
                                className="h-6 text-[9px] px-1.5 border-dashed"
                              >
                                <RefreshCw className="w-2.5 h-2.5 mr-1" /> Re-AI
                              </Button>
                            )}
                          </div>
                          
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                            onClick={() => setActiveResource(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Resource contents */}
                        <div className="p-6">
                          {resourceLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                              <div className="relative flex items-center justify-center mb-4">
                                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                                <Sparkles className="w-5 h-5 text-indigo-500 absolute animate-pulse" />
                              </div>
                              <span className="text-xs font-bold text-foreground">Generating Workspace Assets...</span>
                              <span className="text-[10px] text-muted-foreground mt-1 animate-pulse">{loadingStep}</span>
                            </div>
                          ) : !studyData[activeResource] ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-xs italic">
                              Resource not initialized. Click generator above to prompt.
                            </div>
                          ) : (
                            <div className="animate-fade-in">
                              
                              {/* FAQ Viewer */}
                              {activeResource === 'faq' && (
                                <div className="flex flex-col gap-4 text-xs">
                                  {studyData['faq'].questions?.map((item: any, i: number) => (
                                    <div key={i} className="flex flex-col gap-1.5 border border-border/40 p-4 rounded-xl bg-muted/10">
                                      <h4 className="font-bold text-foreground flex gap-1.5 items-start">
                                        <span className="text-indigo-500 font-extrabold">Q:</span>
                                        <span>{item.q}</span>
                                      </h4>
                                      <p className="text-muted-foreground leading-relaxed pl-5 leading-snug">{item.a}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Briefing Doc Viewer */}
                              {activeResource === 'briefing' && (
                                <div className="flex flex-col gap-4 text-xs leading-relaxed">
                                  <div className="border-b border-border/60 pb-3">
                                    <h3 className="text-sm font-extrabold text-foreground">{studyData['briefing'].title}</h3>
                                    <p className="text-muted-foreground text-[11px] mt-1">{studyData['briefing'].context}</p>
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-foreground mb-2 flex items-center gap-1.5">
                                      <Check className="w-4 h-4 text-emerald-500" /> Key Takeaways Checklist
                                    </h4>
                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-1">
                                      {studyData['briefing'].keyTakeaways?.map((item: string, i: number) => (
                                        <li key={i} className="flex gap-2 items-start bg-muted/10 p-2.5 rounded-lg border border-border/40">
                                          <div className="w-4 h-4 rounded-full border border-border flex items-center justify-center shrink-0 text-[10px] text-muted-foreground font-bold">
                                            {i + 1}
                                          </div>
                                          <span className="text-[11px] leading-snug text-foreground/80">{item}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-foreground mb-2">Executive Briefing Overview</h4>
                                    <p className="bg-muted/10 p-4 rounded-xl text-muted-foreground border border-border/40 whitespace-pre-line text-justify leading-snug">
                                      {studyData['briefing'].executiveBrief}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Study Guide Viewer */}
                              {activeResource === 'study-guide' && (
                                <div className="flex flex-col gap-5 text-xs">
                                  {studyData['study-guide'].topics?.map((t: any, i: number) => (
                                    <div key={i} className="border border-border/60 rounded-xl p-4 flex flex-col gap-3 bg-card shadow-xs">
                                      <div>
                                        <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] border-0 mb-1">
                                          Module {i + 1}
                                        </Badge>
                                        <h4 className="font-bold text-sm text-foreground">{t.topic}</h4>
                                        <p className="text-muted-foreground text-[11px] mt-1 italic">{t.summary}</p>
                                      </div>
                                      <Separator className="bg-border/60" />
                                      <div>
                                        <h5 className="font-bold text-[10px] uppercase tracking-wider text-foreground/80 mb-2">Detailed Study Points:</h5>
                                        <ul className="space-y-1.5 list-disc pl-4 text-muted-foreground leading-relaxed">
                                          {t.details?.map((det: string, j: number) => (
                                            <li key={j}>{det}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Timeline Viewer */}
                              {activeResource === 'timeline' && (
                                <div className="border border-border/80 rounded-xl p-6 bg-muted/15 flex flex-col gap-4">
                                  <div className="relative border-l-2 border-indigo-500/30 pl-6 flex flex-col gap-6 py-2">
                                    {studyData['timeline'].events?.map((ev: any, i: number) => (
                                      <div key={i} className="relative">
                                        <div className="absolute -left-[32px] top-1.5 w-3.5 h-3.5 rounded-full bg-background border-2 border-indigo-500" />
                                        <div className="flex flex-col gap-0.5 text-xs">
                                          <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono border-0 w-fit">
                                            {ev.date}
                                          </Badge>
                                          <h4 className="font-bold text-foreground text-sm mt-1">{ev.event}</h4>
                                          <p className="text-muted-foreground leading-relaxed text-[11px] mt-1.5 bg-card/65 p-2 rounded border border-border/40">
                                            {ev.description}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                </motion.div>
              )}

              {/* TAB 2: PRACTICE HUB (FLASHCARDS & QUIZZES) */}
              {activeTab === 'practice' && (
                <motion.div 
                  key="practice"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="h-full overflow-y-auto custom-scrollbar p-6 md:p-8"
                >
                  <div className="max-w-4xl mx-auto w-full">
                    {/* Render practice hub panels directly inline */}
                    <PracticeHubSection document={document} workspaceId={workspace?.id} />
                  </div>
                </motion.div>
              )}

              {/* TAB 3: EXTRACTED TABLES */}
              {activeTab === 'tables' && (
                <motion.div 
                  key="tables"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="h-full overflow-y-auto custom-scrollbar p-6 md:p-8"
                >
                  <div className="max-w-4xl mx-auto w-full">
                    <TableSection document={document} workspaceId={workspace?.id} />
                  </div>
                </motion.div>
              )}

              {/* TAB 4: FOCUSED CHAT */}
              {activeTab === 'chat' && (
                <motion.div 
                  key="chat"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="h-full flex flex-col"
                >
                  <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 space-y-4">
                    {chatMessages.map((msg, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "flex gap-3 text-xs max-w-[85%] rounded-2xl p-4 shadow-xs border",
                          msg.role === 'user' 
                            ? "ml-auto bg-foreground text-background border-transparent" 
                            : "bg-card border-border/80 text-foreground"
                        )}
                      >
                        <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                          <span className={cn("text-[9px] font-bold uppercase tracking-wider", msg.role === 'user' ? "text-background/60" : "text-muted-foreground")}>
                            {msg.role === 'user' ? (user?.name || 'You') : 'Nexus AI'}
                          </span>
                          <div className="leading-relaxed whitespace-pre-wrap leading-snug break-words">
                            {msg.role === 'user' ? msg.content : renderChatTextWithQuotes(msg.content)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex gap-3 text-xs max-w-[80%] rounded-2xl p-4 bg-card border border-border/80 text-foreground">
                        <div className="flex-1 flex flex-col gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Nexus AI</span>
                          <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                            <span>Reading source context...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatScrollRef} />
                  </div>

                  {/* Chat input box */}
                  <form onSubmit={handleSendChatMessage} className="p-4 border-t border-border bg-card flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Ask questions referencing the source document text... (e.g. Find any dates in page 1)"
                      disabled={chatLoading}
                      className="flex-1 px-4 py-2 border border-border rounded-xl text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary/45 disabled:opacity-50"
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      disabled={!chatInput.trim() || chatLoading}
                      className="rounded-xl h-9 w-9 bg-foreground text-background hover:opacity-90 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </form>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── PRACTICE HUB INTERNAL COMPONENT ─────────────────────────────
function PracticeHubSection({ document, workspaceId }: { document: DocumentFile; workspaceId?: string }) {
  const [subTab, setSubTab] = useState<'cards' | 'quiz'>('cards');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [practiceData, setPracticeData] = useState<any>(null);

  // Load from cache
  useEffect(() => {
    const cached = localStorage.getItem(`nexus_study_${document.id}_${subTab === 'cards' ? 'flashcards' : 'quiz'}`);
    if (cached) {
      try {
        setPracticeData(JSON.parse(cached));
      } catch (e) {
        console.error(e);
      }
    } else {
      setPracticeData(null);
    }
  }, [document.id, subTab]);

  const handleGenerate = async () => {
    setLoading(true);
    setLoadingStep('Reviewing semantic targets...');
    const formatType = subTab === 'cards' ? 'flashcards' : 'quiz';

    const steps = [
      'Compiling practice assets...',
      'Validating knowledge targets...',
      'Finalizing practice nodes...'
    ];
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < steps.length) {
        setLoadingStep(steps[idx]);
        idx++;
      }
    }, 1200);

    try {
      const response = await fetch('/api/study/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentTitle: document.title,
          documentContent: document.content || document.summary,
          format: formatType,
          workspaceId
        })
      });
      clearInterval(interval);

      if (!response.ok) throw new Error('Generation failed');
      const data = await response.json();
      localStorage.setItem(`nexus_study_${document.id}_${formatType}`, JSON.stringify(data));
      setPracticeData(data);
      toast.success('Practice assets generated!');
    } catch (e: any) {
      clearInterval(interval);
      toast.error('Failed to generate practice asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none">
      <div className="flex justify-between items-center bg-card border border-border/80 p-3 rounded-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('cards')}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
              subTab === 'cards' ? "bg-foreground/5 text-foreground font-bold shadow-inner" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Study Flashcards
          </button>
          <button
            onClick={() => setSubTab('quiz')}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
              subTab === 'quiz' ? "bg-foreground/5 text-foreground font-bold shadow-inner" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Comprehension Quiz
          </button>
        </div>

        {practiceData && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              if (confirm('Regenerate these practice items?')) handleGenerate();
            }}
            className="h-6 text-[9px] border-dashed"
          >
            <RefreshCw className="w-2.5 h-2.5 mr-1" /> Regenerate
          </Button>
        )}
      </div>

      <div className="min-h-[350px]">
        {loading ? (
          <div className="h-72 border border-border rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-card shadow-inner">
            <div className="relative flex items-center justify-center mb-4">
              <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              <Brain className="w-5 h-5 text-indigo-500 absolute animate-pulse" />
            </div>
            <h3 className="text-xs font-bold text-foreground">Assembling practice module...</h3>
            <p className="text-[10px] text-muted-foreground mt-1.5 animate-pulse">{loadingStep}</p>
          </div>
        ) : !practiceData ? (
          <div className="h-72 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-card gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/5 text-amber-500 flex items-center justify-center">
              {subTab === 'cards' ? <BookOpen className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
            </div>
            <div className="max-w-xs">
              <h3 className="text-xs font-bold text-foreground capitalize">Initialize {subTab === 'cards' ? 'Flashcards' : 'Quiz'}</h3>
              <p className="text-[10px] text-muted-foreground mt-1">AI will crawl document nodes to structure tailored review modules.</p>
            </div>
            <Button onClick={handleGenerate} className="bg-foreground text-background text-[11px] font-bold gap-1 px-4 h-8">
              <Sparkles className="w-3 h-3" /> Generate Module
            </Button>
          </div>
        ) : (
          <div>
            {subTab === 'cards' ? (
              <FlashcardsSubView data={practiceData} />
            ) : (
              <QuizSubView data={practiceData} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// FLASHCARDS SUBVIEW
function FlashcardsSubView({ data }: { data: any }) {
  const [deck, setDeck] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (data.flashcards) {
      setDeck(data.flashcards.map((c: any) => ({ ...c, mastered: false })));
      setCurrentIndex(0);
      setFlipped(false);
    }
  }, [data]);

  if (deck.length === 0) return null;

  const activeCard = deck[currentIndex];

  const handleToggleMastered = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...deck];
    updated[currentIndex].mastered = !updated[currentIndex].mastered;
    setDeck(updated);
    toast.success(updated[currentIndex].mastered ? 'Card marked as Mastered!' : 'Card returned to deck');
  };

  const handleNext = () => {
    setFlipped(false);
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % deck.length);
    }, 150);
  };

  const handlePrev = () => {
    setFlipped(false);
    setTimeout(() => {
      setCurrentIndex(prev => (prev - 1 + deck.length) % deck.length);
    }, 150);
  };

  const handleShuffle = () => {
    setFlipped(false);
    setTimeout(() => {
      setDeck(prev => [...prev].sort(() => Math.random() - 0.5));
      setCurrentIndex(0);
    }, 150);
  };

  const masteredCount = deck.filter(c => c.mastered).length;

  return (
    <div className="max-w-md mx-auto flex flex-col gap-4">
      <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-card px-4 py-2 border rounded-xl">
        <span>Card {currentIndex + 1} of {deck.length}</span>
        <span className="text-emerald-500">Mastered: {masteredCount} / {deck.length}</span>
      </div>

      {/* Flashing Flip Card Container */}
      <div 
        onClick={() => setFlipped(!flipped)}
        className="w-full h-56 cursor-pointer [perspective:1000px]"
      >
        <div 
          className={cn(
            "relative w-full h-full duration-500 [transform-style:preserve-3d] border border-border/80 rounded-2xl shadow-sm bg-card transition-transform",
            flipped && "[transform:rotateY(180deg)]"
          )}
        >
          {/* Front side */}
          <div className="absolute inset-0 [backface-visibility:hidden] p-6 flex flex-col items-center justify-center text-center gap-3">
            <span className="text-[9px] uppercase font-extrabold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              Question
            </span>
            <p className="text-xs font-semibold text-foreground px-4 leading-relaxed leading-snug">{activeCard.question}</p>
            <span className="text-[9px] text-muted-foreground/80 mt-2 animate-pulse">Click card to reveal answer</span>
          </div>

          {/* Back side */}
          <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] p-6 flex flex-col items-center justify-center text-center gap-3">
            <span className="text-[9px] uppercase font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Answer
            </span>
            <p className="text-xs text-foreground font-medium px-4 leading-relaxed leading-snug">{activeCard.answer}</p>
            
            <button 
              onClick={handleToggleMastered}
              className={cn(
                "mt-4 text-[10px] font-bold border rounded-full px-3 py-1 flex items-center gap-1 transition-all",
                activeCard.mastered 
                  ? "bg-emerald-500 text-white border-emerald-500" 
                  : "bg-background border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <Check className="w-3 h-3" /> {activeCard.mastered ? 'Mastered' : 'Mark as Mastered'}
            </button>
          </div>
        </div>
      </div>

      {/* Control row */}
      <div className="flex justify-between items-center">
        <Button variant="ghost" size="sm" onClick={handleShuffle} className="h-8 text-xs text-muted-foreground gap-1">
          Shuffle
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrev} className="h-8 text-xs font-semibold px-3">
            Prev
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext} className="h-8 text-xs font-semibold px-3">
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

// QUIZ SUBVIEW
function QuizSubView({ data }: { data: any }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const questions = data.questions || [];
  const activeQuestion = questions[currentIndex];

  const handleOptionClick = (idx: number) => {
    if (answered) return;
    setSelectedOption(idx);
    setAnswered(true);
    if (idx === activeQuestion.answerIndex) {
      setScore(prev => prev + 1);
      toast.success('Correct answer!');
    } else {
      toast.error('Incorrect choice.');
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setAnswered(false);
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setFinished(true);
    }
  };

  const handleRetake = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setAnswered(false);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    const passed = score >= Math.ceil(questions.length / 2);
    return (
      <div className="max-w-md mx-auto text-center p-6 bg-card border border-border rounded-2xl shadow-sm flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
          <Award className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Quiz Practice Complete!</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
            SCORE: {score} / {questions.length}
          </p>
        </div>

        <div className={cn("text-xs font-bold px-3 py-1.5 rounded-full", passed ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20")}>
          {passed ? 'PASSED ✅' : 'FAILED ❌'}
        </div>

        <Button onClick={handleRetake} className="bg-foreground text-background h-8 px-4 text-xs font-bold gap-1 mt-2">
          Retake Quiz
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto flex flex-col gap-4">
      <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground bg-card border px-3 py-1.5 rounded-xl uppercase tracking-wider">
        <span>Question {currentIndex + 1} of {questions.length}</span>
        <span>Score: {score}</span>
      </div>

      {activeQuestion && (
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
          <h3 className="text-xs font-semibold text-foreground leading-relaxed leading-snug">{activeQuestion.question}</h3>

          <div className="flex flex-col gap-2">
            {activeQuestion.options.map((opt: string, i: number) => {
              const isSelected = selectedOption === i;
              const isCorrect = activeQuestion.answerIndex === i;
              
              let optClass = "w-full border border-border/80 text-left px-3.5 py-2.5 rounded-xl text-xs hover:bg-muted/40 transition-colors flex items-center justify-between";
              
              if (answered) {
                if (isCorrect) {
                  optClass = "w-full border border-emerald-500 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between";
                } else if (isSelected) {
                  optClass = "w-full border border-red-500 bg-red-500/5 text-red-700 dark:text-red-400 text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between";
                } else {
                  optClass = "w-full border border-border opacity-50 text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between cursor-not-allowed";
                }
              }

              return (
                <button 
                  key={i} 
                  onClick={() => handleOptionClick(i)} 
                  disabled={answered}
                  className={optClass}
                >
                  <span>{opt}</span>
                  {answered && isCorrect && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  {answered && isSelected && !isCorrect && <X className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                </button>
              );
            })}
          </div>

          {answered && (
            <div className="border border-border/85 bg-muted/10 p-3.5 rounded-xl flex flex-col gap-1 text-[11px] leading-relaxed text-muted-foreground mt-1">
              <span className="font-bold flex items-center gap-1 text-foreground"><Info className="w-3.5 h-3.5 text-indigo-500" /> Explanation</span>
              <p className="leading-snug">{activeQuestion.explanation}</p>
            </div>
          )}

          {answered && (
            <div className="flex justify-end mt-1">
              <Button onClick={handleNext} className="bg-foreground text-background text-xs font-bold gap-1 px-4 h-8">
                {currentIndex + 1 === questions.length ? 'Finish' : 'Next'} <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── TABLE EXTRACTOR SECTION ──────────────────────────────────
function TableSection({ document, workspaceId }: { document: DocumentFile; workspaceId?: string }) {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [tableData, setTableData] = useState<any>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const cached = localStorage.getItem(`nexus_study_${document.id}_table`);
    if (cached) {
      try {
        setTableData(JSON.parse(cached));
      } catch (e) {
        console.error(e);
      }
    }
  }, [document.id]);

  const handleGenerate = async () => {
    setLoading(true);
    setLoadingStep('Aggregating fact values...');

    try {
      const response = await fetch('/api/study/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentTitle: document.title,
          documentContent: document.content || document.summary,
          format: 'table',
          workspaceId
        })
      });

      if (!response.ok) throw new Error('Extraction failed');
      const data = await response.json();
      localStorage.setItem(`nexus_study_${document.id}_table`, JSON.stringify(data));
      setTableData(data);
      toast.success('Extracted properties grid compiled!');
    } catch (e) {
      toast.error('Failed to extract tables');
    } finally {
      setLoading(false);
    }
  };

  const headers = tableData?.headers || [];
  const rows = tableData?.rows || [];

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    return rows.filter((row: any) => 
      headers.some((h: string) => 
        String(row[h] || '').toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [rows, headers, search]);

  return (
    <div className="flex flex-col gap-4 select-none">
      {tableData && (
        <div className="flex justify-between items-center gap-3">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search table rows..."
              className="w-full pl-8 pr-3 py-1.5 border border-border rounded-xl text-xs bg-card focus:outline-none"
            />
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              if (confirm('Regenerate the extracted tables?')) handleGenerate();
            }}
            className="h-8 text-xs border-dashed"
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Re-Extract
          </Button>
        </div>
      )}

      {loading ? (
        <div className="h-72 border border-border rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-card shadow-inner">
          <div className="relative flex items-center justify-center mb-4">
            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <Grid3X3 className="w-5 h-5 text-indigo-500 absolute animate-pulse" />
          </div>
          <h3 className="text-xs font-bold text-foreground">Mapping document indices...</h3>
          <p className="text-[10px] text-muted-foreground mt-1.5 animate-pulse">{loadingStep}</p>
        </div>
      ) : !tableData ? (
        <div className="h-72 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-card gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/5 text-emerald-500 flex items-center justify-center">
            <Grid3X3 className="w-6 h-6" />
          </div>
          <div className="max-w-xs">
            <h3 className="text-xs font-bold text-foreground">Extracted Properties Grid</h3>
            <p className="text-[10px] text-muted-foreground mt-1">Crawl statistical details, comparative parameters, and entities mapping in tabular layout.</p>
          </div>
          <Button onClick={handleGenerate} className="bg-foreground text-background text-[11px] font-bold gap-1 px-4 h-8">
            <Sparkles className="w-3 h-3" /> Compile Properties Grid
          </Button>
        </div>
      ) : (
        <div className="border border-border/80 rounded-2xl bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  {headers.map((h: string, i: number) => (
                    <th key={i} className="p-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRows.map((row: any, rIdx: number) => (
                  <tr key={rIdx} className="hover:bg-muted/10 transition-colors">
                    {headers.map((h: string, cIdx: number) => (
                      <td key={cIdx} className="p-3 text-foreground/80 leading-relaxed font-medium">
                        {row[h] !== undefined ? String(row[h]) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={headers.length || 1} className="p-8 text-center text-muted-foreground italic text-xs">
                      No matching records.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
