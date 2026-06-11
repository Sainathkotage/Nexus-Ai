'use client';

import React, { useState } from 'react';
import { ChatMessage as ChatMessageType } from '@/types';
import { motion } from 'motion/react';
import { 
  FileText, Check, ThumbsUp, ThumbsDown, Copy, 
  SlidersHorizontal, Minimize2, Maximize2, Smile, Briefcase
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/store';
import { toast } from 'sonner';

interface ChatMessageProps {
  message: ChatMessageType;
  onModify?: (type: 'shorter' | 'longer' | 'simpler' | 'professional') => void;
}

export function ChatMessage({ message, onModify }: ChatMessageProps) {
  const { user } = useWorkspace();
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Simple markdown renderer for basic formatting
  const renderText = (text: string) => {
    // 1. Escape HTML to prevent XSS
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 2. Code blocks: ```lang \n code \n ```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre class="bg-[#1e1e1e] text-[#d4d4d4] p-4 rounded-lg font-mono text-xs overflow-x-auto my-3 border border-zinc-800 relative select-all"><code class="language-${lang}">${code.trim()}</code></pre>`;
    });

    // 3. Inline code: `code`
    html = html.replace(/`([^`\n]+)`/g, '<code class="bg-[#f0f0f0] dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-xs border border-border/80 text-foreground">$1</code>');

    // 4. Headers: #, ##, ###
    html = html.replace(/^### (.*?)$/gm, '<h3 class="text-xs font-bold mt-4 mb-1.5 text-foreground uppercase tracking-wider">$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2 class="text-sm font-bold mt-5 mb-2.5 text-foreground border-b border-border/40 pb-1">$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1 class="text-base font-bold mt-6 mb-3 text-foreground">$1</h1>');

    // 5. Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');

    // 6. Bullet lists
    html = html.replace(/^\s*-\s+(.*?)$/gm, '<li class="ml-5 list-disc text-sm pl-0.5 my-1 text-foreground/90">$1</li>');

    // 7. Paragraph blocks (split by double newlines)
    const blocks = html.split(/\n{2,}/);
    const parsedBlocks = blocks.map(block => {
      // If it is a code block, list item, or header, don't wrap in p tag to prevent invalid HTML nesting
      if (block.startsWith('<pre') || block.startsWith('<li') || block.startsWith('<h')) {
        return block;
      }
      return `<p class="my-2 leading-relaxed">${block.replace(/\n/g, '<br />')}</p>`;
    });

    return <div dangerouslySetInnerHTML={{ __html: parsedBlocks.join('') }} className="space-y-1.5 text-sm text-foreground/90 leading-relaxed font-sans" />;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLike = () => {
    setLiked(!liked);
    if (disliked) setDisliked(false);
    if (!liked) toast.success('Thanks for the feedback!');
  };

  const handleDislike = () => {
    setDisliked(!disliked);
    if (liked) setLiked(false);
    if (!disliked) toast.success('Thanks for the feedback!');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex w-full gap-4 max-w-3xl mx-auto items-start",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar / Logo */}
      <div className="shrink-0 mt-0.5">
        {isUser ? (
          <Avatar className="w-8 h-8 rounded-full border border-border shadow-sm">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="text-[10px] bg-muted text-foreground font-bold">
              {(user?.name ?? 'U').split(' ').map((n: string) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted/20 dark:bg-muted/10 flex items-center justify-center border border-border/40 shadow-sm shrink-0">
            {/* Nexus AI double sparkle gradient logo */}
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
              <path d="M12 2Q12 12 22 12Q12 12 12 22Q12 12 2 12Q12 12 12 2Z" fill="url(#nexus-gradient)" />
              <path d="M19 5Q19 8 22 8Q19 8 19 11Q19 8 16 8Q19 8 19 5Z" fill="url(#nexus-gradient)" />
              <defs>
                <linearGradient id="nexus-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9b72cb" />
                  <stop offset="50%" stopColor="#4285f4" />
                  <stop offset="100%" stopColor="#d96570" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}
      </div>

      {/* Message Content Bubble */}
      <div className={cn("flex flex-col gap-1 min-w-0 flex-1", isUser ? "items-end" : "items-start")}>
        
        {/* Username & timestamp */}
        <div className="flex items-center gap-2 mb-0.5 text-[10px] text-muted-foreground font-medium">
          <span>{isUser ? 'You' : 'Nexus AI'}</span>
          <span>•</span>
          <span>{format(new Date(message.timestamp), 'h:mm a')}</span>
        </div>

        {/* Message bubble */}
        <div className={cn(
          "w-fit max-w-[90%] leading-relaxed text-sm whitespace-pre-wrap font-sans transition-all",
          isUser 
            ? "bg-accent/35 text-foreground p-3.5 px-4 rounded-2xl rounded-tr-sm border border-primary/20 backdrop-blur-sm shadow-sm" 
            : "glass text-foreground p-3.5 px-4 rounded-2xl rounded-tl-sm shadow-sm"
        )}>
          {renderText(message.content)}
          
          {message.isStreaming && (
            <span className="inline-block w-2.5 h-4 bg-primary ml-1 animate-pulse align-middle" />
          )}
        </div>

        {/* Source Citations */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {message.sources.map((source, i) => (
              <button 
                key={i}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border/40 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-all group"
                title={source.excerpt}
              >
                <FileText className="w-3 h-3 text-muted-foreground/80 group-hover:text-foreground" />
                <span className="font-medium truncate max-w-[130px]">{source.documentTitle}</span>
              </button>
            ))}
          </div>
        )}

        {/* Action Toolbar */}
        {!isUser && !message.isStreaming && (
          <div className="flex items-center gap-1 mt-2 text-muted-foreground/75 relative">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLike} 
              className={cn("w-7 h-7 rounded-full hover:bg-muted/50 transition-all", liked && "text-blue-500 bg-blue-500/5")}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleDislike} 
              className={cn("w-7 h-7 rounded-full hover:bg-muted/50 transition-all", disliked && "text-red-500 bg-red-500/5")}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleCopy} 
              className="w-7 h-7 rounded-full hover:bg-muted/50 transition-all"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>

            {onModify && (
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={cn("w-7 h-7 rounded-full hover:bg-muted/50 transition-all", menuOpen && "bg-muted")}
                  title="Modify response"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </Button>
                
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                    <div className="absolute left-0 bottom-8 z-40 glass shadow-2xl rounded-xl p-1.5 flex flex-col gap-0.5 min-w-[150px] animate-in fade-in slide-in-from-bottom-2 duration-150">
                      <div className="px-2 py-1 text-[9px] uppercase tracking-wider font-semibold text-muted-foreground border-b border-border/40 mb-1">
                        Modify Response
                      </div>
                      <button 
                        onClick={() => { onModify('shorter'); setMenuOpen(false); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-muted text-foreground transition-all"
                      >
                        <Minimize2 className="w-3.5 h-3.5 text-muted-foreground" /> Shorter
                      </button>
                      <button 
                        onClick={() => { onModify('longer'); setMenuOpen(false); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-muted text-foreground transition-all"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" /> Longer
                      </button>
                      <button 
                        onClick={() => { onModify('simpler'); setMenuOpen(false); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-muted text-foreground transition-all"
                      >
                        <Smile className="w-3.5 h-3.5 text-muted-foreground" /> Simpler
                      </button>
                      <button 
                        onClick={() => { onModify('professional'); setMenuOpen(false); }}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-muted text-foreground transition-all"
                      >
                        <Briefcase className="w-3.5 h-3.5 text-muted-foreground" /> Professional
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </motion.div>
  );
}
