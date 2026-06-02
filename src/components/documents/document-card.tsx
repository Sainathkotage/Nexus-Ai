'use client';

import React from 'react';
import { DocumentFile } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface DocumentCardProps {
  document: DocumentFile;
  onClick: () => void;
}

export function DocumentCard({ document, onClick }: DocumentCardProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pdf': return 'bg-red-50 dark:bg-red-950/20';
      case 'docx': return 'bg-blue-50 dark:bg-blue-950/20';
      case 'txt': return 'bg-gray-50 dark:bg-gray-800/30';
      case 'meeting': return 'bg-purple-50 dark:bg-purple-950/20';
      case 'research': return 'bg-green-50 dark:bg-green-950/20';
      default: return 'bg-muted';
    }
  };
  return (
    <div
      onClick={onClick}
      data-context-type="document"
      data-context-id={document.id}
      className="group cursor-pointer rounded-lg border border-border bg-card p-4 hover:bg-accent/20 transition-all duration-150 flex flex-col gap-3"
    >
      {/* Top */}
      <div className="flex justify-between items-start">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-lg", getTypeColor(document.type))}>
          {document.thumbnail}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {document.type}
          </span>
        </div>
      </div>

      {/* Title & Summary */}
      <div className="flex flex-col gap-1.5 flex-1">
        <h3 className="text-sm font-medium line-clamp-2 leading-snug group-hover:text-foreground">
          {document.title}
        </h3>
        
        {document.processingStatus === 'processing' ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Processing...</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {document.summary}
          </p>
        )}
      </div>

      {/* Tags */}
      {document.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {document.tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
          {document.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{document.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center shrink-0">
            <span className="text-[7px] font-bold text-white">{document.uploadedBy.name.split(' ').map(n=>n[0]).join('')}</span>
          </div>
          <span className="text-[11px] text-muted-foreground">{document.uploadedBy.name.split(' ')[0]}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {format(new Date(document.uploadedAt), 'MMM d')}
        </span>
      </div>
    </div>
  );
}
