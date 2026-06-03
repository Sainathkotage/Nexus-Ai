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

interface UploadZoneProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadZone({ open, onOpenChange }: UploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
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
      
      const newDocId = `doc-${Date.now()}`;
      const newDoc: DocumentFile = {
        id: newDocId,
        title: data.filename,
        type: data.filename.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt',
        size: `${(data.size / 1024 / 1024).toFixed(2)} MB`,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user ?? { id: 'unknown', name: 'User', email: '', avatar: '', role: 'Member' },
        summary: data.analysis?.summary || 'Newly uploaded document.',
        keyPoints: data.analysis?.keyPoints || ['Document uploaded successfully.'],
        extractedTasks: (data.analysis?.tasks || []).map((t: any, i: number) => ({
          id: `et-${Date.now()}-${i}`,
          text: t.text,
          deadline: t.deadline || undefined,
          assignee: t.assignee || undefined,
          sourceDocumentId: newDocId,
          sourceDocumentTitle: data.filename,
        })),
        extractedDeadlines: (data.analysis?.deadlines || []).map((d: any, i: number) => ({
          id: `ed-${Date.now()}-${i}`,
          text: d.text,
          date: d.date,
          sourceDocumentId: newDocId,
          sourceDocumentTitle: data.filename,
        })),
        extractedPeople: data.analysis?.people || [],
        extractedOrganizations: data.analysis?.organizations || [],
        tags: data.analysis?.tags || ['uploaded'],
        thumbnail: data.filename.toLowerCase().endsWith('.pdf') ? '📋' : '📄',
        processingStatus: 'completed',
        content: data.text,
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
