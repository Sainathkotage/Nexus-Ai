'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/lib/store';
import { motion } from 'motion/react';
import { FileText, Search, Plus, Filter, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DocumentCard } from '@/components/documents/document-card';
import { DocumentDetail } from '@/components/documents/document-detail';
import { NotebookWorkspace } from '@/components/documents/notebook-workspace';
import { UploadZone } from '@/components/documents/upload-zone';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const typeFilters = ['all', 'documents', 'photos', 'text'] as const;

export default function DocumentsPage() {
  const { 
    documents, selectedDocumentId, setSelectedDocumentId, user,
    addTask, addDocument, deleteDocument, isAppLoading 
  } = useWorkspace();

  // Find a document with extracted tasks or any document to convert notes
  const notesDoc = documents.find(d => d.extractedTasks && d.extractedTasks.length > 0);
  const targetNotesDoc = notesDoc || (documents.length > 0 ? documents[0] : null);

  const handleConvertNotes = () => {
    if (!targetNotesDoc) {
      toast.info('No documents available to extract tasks. Upload a document first.');
      return;
    }

    const tasksToCreate: string[] = targetNotesDoc.extractedTasks && targetNotesDoc.extractedTasks.length > 0
      ? targetNotesDoc.extractedTasks.map(t => typeof t === 'string' ? t : (t as any).text || 'Unnamed task')
      : [`Review ${targetNotesDoc.title}`, `Discuss ${targetNotesDoc.title} with stakeholders`, `Implement feedback from ${targetNotesDoc.title}`];

    toast.promise(
      new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            tasksToCreate.forEach(tTitle => {
              addTask({
                title: tTitle,
                description: `Extracted dynamically by Nexus AI from "${targetNotesDoc.title}"`,
                status: 'todo',
                priority: 'medium',
                dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                tags: ['ai-extracted', 'documents'],
                subtasks: [],
                assignee: user || { id: 'unknown', name: 'User', email: '', avatar: '', role: 'Member' }
              });
            });
            resolve(true);
          } catch (e) {
            reject(e);
          }
        }, 1500);
      }),
      {
        loading: `Scanning "${targetNotesDoc.title}" for tasks...`,
        success: `Extracted and created ${tasksToCreate.length} tasks in the Tasks tab!`,
        error: 'Task extraction error.'
      }
    );
  };

  const handleGeneratePlan = () => {
    toast.promise(
      new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            addDocument({
              title: 'Nexus AI Project Plan',
              type: 'pdf',
              size: '15 KB',
              summary: 'Structured project deliverables plan generated dynamically by Nexus AI based on the current workspace context.',
              keyPoints: ['Phase 1: Foundation setup & repository audit', 'Phase 2: Database schemas, models, and indexing', 'Phase 3: Final validation & automated testing'],
              extractedTasks: [
                {
                  id: 'task-gen-1',
                  text: 'Verify env variables',
                  sourceDocumentId: 'nexus-ai-project-plan',
                  sourceDocumentTitle: 'Nexus AI Project Plan'
                },
                {
                  id: 'task-gen-2',
                  text: 'Review database indexes',
                  sourceDocumentId: 'nexus-ai-project-plan',
                  sourceDocumentTitle: 'Nexus AI Project Plan'
                },
                {
                  id: 'task-gen-3',
                  text: 'Run typechecking script',
                  sourceDocumentId: 'nexus-ai-project-plan',
                  sourceDocumentTitle: 'Nexus AI Project Plan'
                }
              ],
              extractedDeadlines: [],
              extractedPeople: [],
              extractedOrganizations: [],
              tags: ['ai-generated', 'project-plan'],
              content: 'Phase 1: Foundation setup & repository audit...\nPhase 2: Database schemas, models, and indexing...\nPhase 3: Final validation & automated testing...',
              thumbnail: 'https://www.google.com/s2/favicons?domain=docs.google.com&sz=32',
              processingStatus: 'completed'
            });
            resolve(true);
          } catch (e) {
            reject(e);
          }
        }, 1800);
      }),
      {
        loading: 'Generating structured project plan...',
        success: 'Project Plan document generated and saved in documents!',
        error: 'Generation error.'
      }
    );
  };
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const isGuest = user?.role === 'Guest';

  

  useEffect(() => {
    if (selectedDocumentId === 'new') {
      setUploadOpen(true);
    } else if (selectedDocumentId === null && uploadOpen) {
      setUploadOpen(false);
    }
  }, [selectedDocumentId]);

  const handleCloseUpload = (open: boolean) => {
    setUploadOpen(open);
    if (!open && selectedDocumentId === 'new') {
      setSelectedDocumentId(null);
    }
  };

  const userDocuments = documents;
  const selectedDocument = userDocuments.find(d => d.id === selectedDocumentId) || null;

  const handleDeleteAll = async () => {
    if (window.confirm("Are you sure you want to delete all documents in this workspace? This action cannot be undone.")) {
      const docIds = userDocuments.map(d => d.id);
      for (const id of docIds) {
        deleteDocument(id);
      }
      toast.success("All documents deleted successfully!");
    }
  };

  if (selectedDocument) {
    return (
      <NotebookWorkspace 
        document={selectedDocument}
        onClose={() => setSelectedDocumentId(null)}
      />
    );
  }

  const filteredDocuments = userDocuments.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesType = true;
    const docTypeLower = doc.type?.toLowerCase() || '';
    
    if (typeFilter === 'documents') {
      matchesType = ['pdf', 'docx', 'xlsx', 'xls', 'doc', 'ppt', 'pptx', 'keynote', 'pages', 'numbers'].includes(docTypeLower);
    } else if (typeFilter === 'photos') {
      matchesType = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'heic', 'tiff', 'bmp'].includes(docTypeLower);
    } else if (typeFilter === 'text') {
      matchesType = ['txt', 'md', 'html', 'json', 'xml', 'csv', 'meeting', 'research'].includes(docTypeLower);
    }
    
    return matchesSearch && matchesType;
  });


  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.04 } }
  };

  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex flex-col h-full w-full" data-tutorial="documents-container">
      {/* Header */}
      <div className="p-6 md:p-8 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground">{userDocuments.length} documents in this workspace</p>
        </div>
        
        <div className="flex items-center gap-2">
          {userDocuments.length > 0 && !isGuest && (
            <Button 
              onClick={handleDeleteAll}
              variant="destructive"
              className="gap-2 shrink-0 h-8 text-sm cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete All
            </Button>
          )}

          {!isGuest ? (
            <Button 
              onClick={() => setUploadOpen(true)}
              className="bg-foreground text-background hover:opacity-90 gap-2 shrink-0 h-8 text-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Upload
            </Button>
          ) : (
            <Badge variant="outline" className="text-muted-foreground text-[10px] py-1 border-dashed">
              View-only Guest Access
            </Badge>
          )}
        </div>
      </div>

      {/* AI Suggestions Widget */}
      <div className="mx-6 md:mx-8 mt-4 p-4 border border-indigo-500/20 bg-indigo-500/[0.01] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-500 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">AI Document Suggestions</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">Nexus analyzed your documents and suggests these actions:</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleConvertNotes}
            className="bg-card border border-border hover:border-indigo-500/30 text-foreground text-[10.5px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            • {targetNotesDoc ? `Convert "${targetNotesDoc.title}" notes into tasks` : 'Convert notes into tasks'}
          </button>
          <button
            onClick={handleGeneratePlan}
            className="bg-card border border-border hover:border-indigo-500/30 text-foreground text-[10.5px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            • Generate project plan
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 md:px-8 py-3 shrink-0 flex flex-wrap items-center gap-3 border-b border-border">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <input
            type="text"
            className="block w-full pl-9 pr-3 py-1.5 border border-border rounded-md bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-1">
          {typeFilters.map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md transition-colors capitalize",
                typeFilter === type
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 md:p-8">
        {isAppLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-muted/40 border border-border/60 p-5 flex flex-col justify-between">
                <div className="flex flex-col gap-2.5">
                  <div className="h-4 bg-muted-foreground/15 rounded-md w-3/4" />
                  <div className="h-3 bg-muted-foreground/10 rounded-md w-1/2" />
                  <div className="space-y-1.5 mt-2">
                    <div className="h-2 bg-muted-foreground/10 rounded-md w-full" />
                    <div className="h-2 bg-muted-foreground/10 rounded-md w-11/12" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                  <div className="h-3 bg-muted-foreground/10 rounded-md w-1/4" />
                  <div className="h-4 bg-muted-foreground/10 rounded-full w-12" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 max-w-xl mx-auto select-none">
            <div className="relative mb-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-500/10">
                <FileText className="w-6 h-6 animate-pulse" />
              </div>
              <div className="absolute -inset-1 rounded-2xl bg-indigo-500/10 blur-md -z-10 animate-pulse" />
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 leading-tight">No Documents Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-8 max-w-sm leading-relaxed">
              Consolidate your knowledge base. Select an action below to draft a new note or ask Nexus to summarize.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left text-xs mb-8">
              <button
                type="button"
                onClick={() => {
                  addDocument({
                    title: `Meeting Notes — ${format(new Date(), 'MMM d, yyyy')}`,
                    type: 'meeting',
                    size: 1024,
                    summary: 'Minutes of meeting sync. Priorities discussed: Q3 goals realignment and sprint task assignees.',
                    content: 'Topic: Weekly Sync\n\nAttending: Team\n\nDecisions:\n1. Realign goals for Q3\n2. Add sprint tasks for designers.',
                    tags: ['Meeting', 'Sync'],
                    processingStatus: 'completed'
                  });
                  toast.success('Meeting note created!');
                }}
                className="p-4 border border-border bg-card hover:bg-muted/40 rounded-xl text-left transition-all hover:-translate-y-0.5 shadow-sm font-sans flex flex-col gap-1.5 cursor-pointer text-foreground"
              >
                <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Start a meeting note
                </span>
                <span className="text-[10px] text-slate-400">Instantly draft a structured template.</span>
              </button>

              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="p-4 border border-border bg-card hover:bg-muted/40 rounded-xl text-left transition-all hover:-translate-y-0.5 shadow-sm font-sans flex flex-col gap-1.5 cursor-pointer text-foreground"
              >
                <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Upload a PDF / Text file
                </span>
                <span className="text-[10px] text-slate-400">Analyze contracts, memos, or spec sheets.</span>
              </button>

              <button
                type="button"
                onClick={handleGeneratePlan}
                className="p-4 border border-border bg-card hover:bg-muted/40 rounded-xl text-left transition-all hover:-translate-y-0.5 shadow-sm font-sans flex flex-col gap-1.5 cursor-pointer sm:col-span-2 text-foreground"
              >
                <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Ask Nexus to draft guidelines
                </span>
                <span className="text-[10px] text-slate-400 font-sans">Draft a complete strategy and product wiki guidelines using AI.</span>
              </button>
            </div>
            
            {isGuest && (
              <p className="text-[10px] text-muted-foreground font-medium">Ask a team admin to upload documents to this workspace.</p>
            )}
          </div>
        ) : (
          <motion.div 
            variants={container} 
            initial="hidden" 
            animate="show" 
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {filteredDocuments.map(doc => (
              <motion.div key={doc.id} variants={item}>
                <DocumentCard 
                  document={doc} 
                  onClick={() => setSelectedDocumentId(doc.id)} 
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Upload Dialog */}
      <UploadZone open={uploadOpen} onOpenChange={handleCloseUpload} />
    </div>
  );
}
