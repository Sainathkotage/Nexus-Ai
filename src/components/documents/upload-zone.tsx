'use client';

import React, { useState, useRef } from 'react';
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { CloudUpload, CheckCircle2, File, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useWorkspace } from '@/lib/store';
import { DocumentFile } from '@/types';
import { usePopup } from '@/lib/popup-context';
import { cn, getDocumentFavicon } from '@/lib/utils';

interface UploadZoneProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadZone({ open, onOpenChange }: UploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [visibility, setVisibility] = useState<'private' | 'shared'>('shared');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addDocument, user } = useWorkspace();
  const { alert } = usePopup();

  const processFile = async (file: File) => {
    const isPDF = file.name.toLowerCase().endsWith('.pdf');
    const isTXT = file.name.toLowerCase().endsWith('.txt');
    if (!isPDF && !isTXT) {
      await alert('Unsupported file type. Please upload a PDF or TXT file.');
      return;
    }

    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      await alert('File is too large. Maximum size allowed is 15MB.');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('visibility', visibility);
      if (user) {
        formData.append('userId', user.id);
        formData.append('userName', user.name);
        formData.append('userEmail', user.email);
        formData.append('userRole', user.role);
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      
      const data = await res.json();
      const dbRecord = data.dbRecord;
      
      const newDoc: DocumentFile = {
        id: dbRecord.id,
        title: dbRecord.title,
        type: dbRecord.type,
        size: dbRecord.size,
        uploadedAt: dbRecord.uploaded_at,
        uploadedBy: dbRecord.uploaded_by,
        summary: dbRecord.summary || 'Processing document...',
        keyPoints: dbRecord.key_points || ['No key points extracted yet.'],
        extractedTasks: (dbRecord.extracted_tasks || []).map((t: any, i: number) => ({
          id: `et-${dbRecord.id}-${i}`,
          text: t.text,
          deadline: t.deadline || undefined,
          assignee: t.assignee || undefined,
          sourceDocumentId: dbRecord.id,
          sourceDocumentTitle: dbRecord.title,
        })),
        extractedDeadlines: (dbRecord.extracted_deadlines || []).map((d: any, i: number) => ({
          id: `ed-${dbRecord.id}-${i}`,
          text: d.text,
          date: d.date,
          sourceDocumentId: dbRecord.id,
          sourceDocumentTitle: dbRecord.title,
        })),
        extractedPeople: dbRecord.extracted_people || [],
        extractedOrganizations: dbRecord.extracted_organizations || [],
        tags: dbRecord.tags || ['processing'],
        thumbnail: dbRecord.thumbnail || getDocumentFavicon(dbRecord.title),
        processingStatus: dbRecord.processing_status || 'processing',
        content: dbRecord.content || data.text,
        visibility: visibility,
      };
      
      addDocument(newDoc);
      setIsUploading(false);
      setIsSuccess(true);
      
      setTimeout(() => {
        setIsSuccess(false);
        onOpenChange(false);
      }, 1200);

    } catch (error) {
      console.error(error);
      setIsUploading(false);
      await alert('Upload failed. Please try again.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border border-border shadow-notion rounded-xl">
        <div className="p-6">
          <DialogHeader className="mb-5">
            <DialogTitle className="text-base font-semibold">Upload Document</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Nexus AI will extract text and analyze your document.
            </DialogDescription>
          </DialogHeader>

          {/* Visibility Toggle Switch */}
          <div className="flex items-center justify-between border border-border p-3 rounded-lg mb-4 bg-muted/20">
            <div className="flex flex-col gap-0.5 select-none">
              <span className="text-xs font-semibold text-foreground">Document Access</span>
              <span className="text-[10px] text-muted-foreground">Decide who can view this document</span>
            </div>
            <div className="flex bg-muted p-0.5 rounded-md border border-border">
              <button
                type="button"
                onClick={() => setVisibility('shared')}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold rounded-sm transition-all cursor-pointer",
                  visibility === 'shared' 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Shared
              </button>
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-bold rounded-sm transition-all cursor-pointer",
                  visibility === 'private' 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Private
              </button>
            </div>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".pdf,.txt" 
            onChange={handleFileChange} 
          />

          <div 
            onClick={() => !isUploading && !isSuccess && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`
              relative border border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-all
              ${isUploading || isSuccess 
                ? 'border-border bg-muted/30' 
                : dragOver 
                  ? 'border-foreground/40 bg-accent/50' 
                  : 'border-border hover:border-foreground/30 hover:bg-accent/20 cursor-pointer'
              }
            `}
          >
            {isUploading ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                <div>
                  <h3 className="text-sm font-medium">Uploading & analyzing...</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">This may take a moment</p>
                </div>
              </motion.div>
            ) : isSuccess ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <h3 className="text-sm font-medium">Upload complete</h3>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <CloudUpload className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-medium">Drop files here or click to browse</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">PDF and TXT files, up to 15MB</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
