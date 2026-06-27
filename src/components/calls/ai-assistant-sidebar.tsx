'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, X, Pin, Mic, MicOff, Send, Trash2, Square,
  Volume2, VolumeX, Loader2, CheckSquare, Plus, AlertCircle, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/lib/store';
import { toast } from 'sonner';
import { ModelSelector } from '@/components/ui/model-selector';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface AiAssistantSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isPinned: boolean;
  onPinToggle: (pinned: boolean) => void;
  liveTranscript: Array<{ senderName: string; text: string; timestamp: string }>;
  meetingTitle: string;
  roomId: string;
  isMicListening: boolean;
  onMicToggle: () => void;
  spokenQuery?: string;
  spokenQuerySubmit?: string;
  width: number;
  onWidthChange: (w: number) => void;
}

export function AiAssistantSidebar({
  isOpen,
  onClose,
  isPinned,
  onPinToggle,
  liveTranscript,
  meetingTitle,
  roomId,
  isMicListening,
  onMicToggle,
  spokenQuery = '',
  spokenQuerySubmit = '',
  width,
  onWidthChange
}: AiAssistantSidebarProps) {
  const { user, workspace, documents, tasks, calendarEvents, addTask, selectedModelId, setSelectedModelId } = useWorkspace();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `### Hello, I'm Nexus AI!
I am joined as a live participant in this call. I can listen for commands, analyze the transcript, or help you manage your workspace.

Try asking me:
- *"Who is in this meeting?"*
- *"Summarize our discussion so far."*
- *"Create a high priority task to review this implementation tomorrow."*`
    }
  ]);
  
  const [inputVal, setInputVal] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const ttsSpokenIndexRef = useRef<number>(0);

  // Synchronize live speech to input value
  useEffect(() => {
    if (spokenQuery) {
      setInputVal(spokenQuery);
    }
  }, [spokenQuery]);

  // Handle final speech submission
  useEffect(() => {
    if (spokenQuerySubmit) {
      handleSendMessage(spokenQuerySubmit);
    }
  }, [spokenQuerySubmit]);

  // Resize handler
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = window.innerWidth - moveEvent.clientX;
      if (newWidth >= 380 && newWidth <= 650) {
        onWidthChange(newWidth);
      }
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Scroll to bottom on messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Handle TTS streaming speech
  useEffect(() => {
    if (!isTtsEnabled || typeof window === 'undefined') return;

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant') return;

    const text = lastMsg.content;
    const spokenIndex = ttsSpokenIndexRef.current;
    
    // Split sentences using boundaries (. ! ?) followed by whitespace
    const sentenceBoundary = /[.!?]\s+/g;
    const textToProcess = text.slice(spokenIndex);
    let match;
    let lastMatchIndex = 0;

    while ((match = sentenceBoundary.exec(textToProcess)) !== null) {
      const sentence = textToProcess.slice(lastMatchIndex, match.index + 1).trim();
      if (sentence.length > 3) {
        speakText(sentence);
      }
      lastMatchIndex = match.index + match[0].length;
    }

    ttsSpokenIndexRef.current = spokenIndex + lastMatchIndex;

    // Speak remaining content if streaming has finished
    if (!isStreaming && ttsSpokenIndexRef.current < text.length) {
      const remaining = text.slice(ttsSpokenIndexRef.current).trim();
      if (remaining.length > 1) {
        speakText(remaining);
      }
      ttsSpokenIndexRef.current = text.length;
    }
  }, [messages, isStreaming, isTtsEnabled]);

  const speakText = (text: string) => {
    // Strip markdown formatting before speaking
    const cleanText = text
      .replace(/[*_`#\-]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Reset TTS pointer
    ttsSpokenIndexRef.current = 0;
    if (isTtsEnabled) {
      window.speechSynthesis.cancel();
    }

    const newUserMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, newUserMessage]);
    setInputVal('');
    setIsThinking(true);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const contextPayload = {
        meetingTitle,
        workspaceName: workspace?.name || 'My Workspace',
        participants: [], // Will be filled with active call participants
        liveTranscript,
        documents: documents || [],
        tasks: tasks || [],
        calendarEvents: calendarEvents || []
      };

      const response = await fetch('/api/calls/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, newUserMessage],
          context: contextPayload,
          modelId: selectedModelId
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server error');
      }

      setIsThinking(false);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          assistantResponse += chunk;

          setMessages(prev => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') {
              last.content = assistantResponse;
            }
            return next;
          });
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        toast.info('Response generation stopped');
      } else {
        console.error('[AI Assistant Error]:', err);
        toast.error(err.message || 'Chat request failed');
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: `*Error generating response: ${err.message || 'Server error'}*` }
        ]);
      }
      setIsThinking(false);
    } finally {
      setIsStreaming(false);
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.role === 'assistant') {
          delete last.isStreaming;
        }
        return next;
      });
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (isTtsEnabled) {
      window.speechSynthesis.cancel();
    }
    setIsStreaming(false);
    setIsThinking(false);
  };

  const handleClearChat = () => {
    handleStopGeneration();
    setMessages([
      {
        role: 'assistant',
        content: `### Hello, I'm Nexus AI!
Workspace chat history cleared. Ready for your next command or question.`
      }
    ]);
    ttsSpokenIndexRef.current = 0;
  };

  const handleCreateTask = async (title: string, priority: string, dueDate: string) => {
    try {
      const priorityFormatted = (priority.toLowerCase() === 'high' || priority.toLowerCase() === 'medium' || priority.toLowerCase() === 'low') 
        ? priority.toLowerCase() as 'high' | 'medium' | 'low' 
        : 'medium';

      await addTask({
        title,
        priority: priorityFormatted,
        dueDate: dueDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        status: 'todo',
        tags: ['nexus-ai', 'meeting-action'],
        description: `Auto-extracted action item from meeting "${meetingTitle}"`,
        assignee: user || { id: 'unknown', name: 'Unassigned', email: '', avatar: '', role: 'Member' },
        subtasks: []
      });
      toast.success(`Task "${title}" created successfully!`);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to create task from card');
    }
  };

  // Advanced inline parser supporting custom markdown formatting & interactive cards
  const renderMessageContent = (content: string) => {
    // 1. Escape HTML
    let html = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 2. Parse Task Card block specifically
    const taskRegex = /```task\s*\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIdx = 0;
    let match;

    while ((match = taskRegex.exec(html)) !== null) {
      const preText = html.slice(lastIdx, match.index);
      if (preText) {
        parts.push(<span key={`text-${lastIdx}`} dangerouslySetInnerHTML={{ __html: parseBasicMarkdown(preText) }} />);
      }

      const taskContent = match[1];
      const titleMatch = taskContent.match(/Title:\s*(.*)/i);
      const priorityMatch = taskContent.match(/Priority:\s*(.*)/i);
      const dateMatch = taskContent.match(/Due Date:\s*(.*)/i);

      const title = titleMatch ? titleMatch[1].trim() : 'New Action Item';
      const priority = priorityMatch ? priorityMatch[1].trim() : 'Medium';
      const dueDate = dateMatch ? dateMatch[1].trim() : '';

      parts.push(
        <div key={`task-${match.index}`} className="my-4 p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-all duration-300">
          <div className="flex justify-between items-start mb-2 gap-2">
            <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
              {title}
            </h4>
            <span className={`px-2 py-0.5 rounded-full text-2xs uppercase font-bold tracking-wider shrink-0 ${
              priority.toLowerCase() === 'high' ? 'bg-red-500/20 text-red-400' :
              priority.toLowerCase() === 'medium' ? 'bg-amber-500/20 text-amber-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>{priority}</span>
          </div>
          {dueDate && (
            <p className="text-2xs text-foreground/50 mb-3 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-purple-400/60" /> Due: {dueDate}
            </p>
          )}
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full text-2xs h-7 hover:bg-purple-500 hover:text-white border-purple-500/20"
            onClick={() => handleCreateTask(title, priority, dueDate)}
          >
            <Plus className="w-3 h-3 mr-1" />
            Add to Tasks
          </Button>
        </div>
      );

      lastIdx = taskRegex.lastIndex;
    }

    const postText = html.slice(lastIdx);
    if (postText) {
      parts.push(<span key={`text-${lastIdx}`} dangerouslySetInnerHTML={{ __html: parseBasicMarkdown(postText) }} />);
    }

    return <div className="space-y-1.5 text-xs text-foreground/90 leading-relaxed font-sans">{parts}</div>;
  };

  const parseBasicMarkdown = (text: string) => {
    let parsed = text;
    // Code blocks
    parsed = parsed.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre class="bg-zinc-950/80 text-zinc-200 p-3.5 rounded-lg font-mono text-2xs overflow-x-auto my-3 border border-white/5 select-all"><code class="language-${lang}">${code.trim()}</code></pre>`;
    });
    // Inline code
    parsed = parsed.replace(/`([^`\n]+)`/g, '<code class="bg-zinc-800 px-1 py-0.5 rounded font-mono text-2xs border border-white/5 text-purple-300">$1</code>');
    // Headers
    parsed = parsed.replace(/^### (.*?)$/gm, '<h3 class="text-xs font-bold mt-4 mb-1 text-purple-400 uppercase tracking-wider">$1</h3>');
    parsed = parsed.replace(/^## (.*?)$/gm, '<h2 class="text-sm font-bold mt-5 mb-2 text-foreground border-b border-white/5 pb-1">$1</h2>');
    parsed = parsed.replace(/^# (.*?)$/gm, '<h1 class="text-base font-bold mt-6 mb-2.5 text-foreground">$1</h1>');
    // Bold
    parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');
    // Bullet lists
    parsed = parsed.replace(/^\s*-\s+(.*?)$/gm, '<li class="ml-4 list-disc text-xs my-0.5 text-foreground/90">$1</li>');

    // Split by double newlines to make paragraphs
    const blocks = parsed.split(/\n{2,}/);
    return blocks.map(block => {
      if (block.startsWith('<pre') || block.startsWith('<li') || block.startsWith('<h')) return block;
      return `<p class="my-1.5 leading-relaxed">${block.replace(/\n/g, '<br />')}</p>`;
    }).join('');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed top-0 right-0 h-full flex z-50 pointer-events-none"
      style={{ width: `${width}px` }}
    >
      {/* Invisible Resize Drag Handle on the left border */}
      <div 
        className="w-1.5 h-full cursor-col-resize hover:bg-purple-500/50 transition-colors pointer-events-auto shrink-0 z-50"
        onMouseDown={handleMouseDown}
      />

      {/* Main Sidebar Panel */}
      <div className="w-full h-full bg-zinc-900 border-l border-white/5 flex flex-col pointer-events-auto relative shadow-2xl">
        {/* Header */}
        <div className="h-16 px-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center relative">
              <Sparkles className="w-4 h-4 text-purple-400" />
              {isStreaming && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-purple-500 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-xs text-white flex items-center gap-2">
                Nexus AI
                {isMicListening && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </h3>
              <p className="text-3xs text-foreground/50 uppercase tracking-wider">
                {isMicListening ? 'Listening' : isThinking ? 'Thinking' : isStreaming ? 'Streaming' : 'Dormant'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* AI Model Selector */}
            <ModelSelector 
              selectedModelId={selectedModelId}
              onModelChange={setSelectedModelId}
              className="mr-1"
            />

            {/* TTS Toggle Button */}
            <Button
              size="icon"
              variant="ghost"
              className={`w-8 h-8 rounded-lg text-foreground/75 hover:text-white ${isTtsEnabled ? 'bg-purple-500/10 text-purple-400' : ''}`}
              onClick={() => {
                setIsTtsEnabled(!isTtsEnabled);
                if (isTtsEnabled) window.speechSynthesis.cancel();
              }}
              title="Toggle Text-to-Speech Response"
            >
              {isTtsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>

            {/* Pin Toggle Button */}
            <Button
              size="icon"
              variant="ghost"
              className={`w-8 h-8 rounded-lg text-foreground/75 hover:text-white ${isPinned ? 'bg-purple-500/10 text-purple-400 rotate-45' : ''}`}
              onClick={() => onPinToggle(!isPinned)}
              title="Pin Sidebar (shrunk layout)"
            >
              <Pin className="w-4 h-4" />
            </Button>

            {/* Close Button */}
            <Button
              size="icon"
              variant="ghost"
              className="w-8 h-8 rounded-lg text-foreground/75 hover:text-white hover:bg-white/5"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div 
              key={index}
              className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
            >
              <div className={`px-3 py-2.5 rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-purple-500 text-white rounded-tr-sm' 
                  : 'bg-zinc-800/60 text-zinc-100 rounded-tl-sm border border-white/5'
              }`}>
                {msg.role === 'user' ? (
                  <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  renderMessageContent(msg.content)
                )}
              </div>
              <span className="text-[9px] text-foreground/45 mt-1 px-1">
                {msg.role === 'user' ? 'You' : 'Nexus AI'}
              </span>
            </div>
          ))}
          
          {isThinking && (
            <div className="flex items-center gap-2 text-foreground/50 py-1 pl-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
              <span className="text-2xs font-medium tracking-wide">Nexus is thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer controls */}
        <div className="p-3 border-t border-white/5 bg-zinc-950/20 space-y-2 shrink-0">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputVal);
            }}
            className="flex items-center gap-2 bg-zinc-900 border border-white/5 rounded-xl px-2 py-1.5 focus-within:border-purple-500/40 transition-colors"
          >
            {/* Microphone Activation Toggle */}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={`w-8 h-8 rounded-lg shrink-0 ${
                isMicListening ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'text-foreground/70 hover:text-white'
              }`}
              onClick={onMicToggle}
              title={isMicListening ? 'Mute AI Voice Input' : 'Listen with AI'}
            >
              {isMicListening ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
            </Button>

            {/* Input field */}
            <input
              type="text"
              placeholder={isMicListening ? "Listening..." : "Ask Nexus AI..."}
              className="flex-1 min-w-0 bg-transparent text-xs text-white border-0 focus:outline-none focus:ring-0 placeholder-foreground/45 py-1 px-1"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              disabled={isMicListening}
            />

            {/* Send button */}
            <Button
              type="submit"
              size="icon"
              className="w-8 h-8 rounded-lg bg-purple-500 hover:bg-purple-600 text-white shrink-0"
              disabled={!inputVal.trim() || isStreaming || isMicListening}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>

          {/* Assistant Action Triggers */}
          <div className="flex items-center justify-between text-2xs px-1 text-foreground/45">
            <button 
              type="button"
              onClick={handleClearChat}
              className="hover:text-red-400 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Conversation
            </button>

            {isStreaming && (
              <button 
                type="button"
                onClick={handleStopGeneration}
                className="text-red-400 hover:text-red-300 font-medium transition-colors flex items-center gap-1"
              >
                <Square className="w-3 h-3 fill-red-400/10" />
                Stop Generation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
