'use client';

import React from 'react';
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle 
} from '@/components/ui/sheet';
import { StudyHub } from './study-hub';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DocumentFile } from '@/types';
import { format } from 'date-fns';
import { 
  FileText, CheckSquare, Users, Sparkles, Clock, 
  AlignLeft, Download, Share2, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useWorkspace } from '@/lib/store';

interface DocumentDetailProps {
  document: DocumentFile | null;
  onClose: () => void;
}

export function DocumentDetail({ document, onClose }: DocumentDetailProps) {
  const { deleteDocument, setActivePage } = useWorkspace();

  const handleAiAction = (action: string) => {
    if (!document) return;
    localStorage.setItem('nexus_pending_action', JSON.stringify({
      documentId: document.id,
      prompt: action
    }));
    setActivePage('chat');
    onClose();
  };

  if (!document) return null;

  return (
    <Sheet open={!!document} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl p-0 flex flex-col h-full border-l border-border bg-background">
        
        {/* Header Section */}
        <div className="p-6 pb-4 shrink-0 flex flex-col gap-4 border-b border-border bg-muted/20">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-primary/10">
                {document.thumbnail}
              </div>
              <div className="flex flex-col gap-1">
                <SheetTitle className="text-xl font-bold leading-tight">{document.title}</SheetTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="uppercase text-[10px] font-bold tracking-wider rounded-sm">
                    {document.type}
                  </Badge>
                  <span>•</span>
                  <span>{document.size}</span>
                  <span>•</span>
                  <span>{format(new Date(document.uploadedAt), 'MMM d, yyyy')}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors border-border"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this document?")) {
                    deleteDocument(document.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-border">
                <Share2 className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-border">
                <Download className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Uploaded by</span>
            <Avatar className="w-5 h-5">
              <AvatarImage src={document.uploadedBy.avatar} />
              <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{document.uploadedBy.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{document.uploadedBy.name}</span>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="summary" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 border-b border-border">
            <TabsList className="bg-transparent h-12 p-0 space-x-6">
              <TabsTrigger 
                value="summary" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-12"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Summary
              </TabsTrigger>
              <TabsTrigger 
                value="tasks" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-12"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Tasks ({document.extractedTasks.length})
              </TabsTrigger>
              <TabsTrigger 
                value="entities" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-12"
              >
                <Users className="w-4 h-4 mr-2" />
                People & Orgs
              </TabsTrigger>
              <TabsTrigger 
                value="content" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-12"
              >
                <AlignLeft className="w-4 h-4 mr-2" />
                Raw Text
              </TabsTrigger>
              <TabsTrigger 
                value="study" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-12"
              >
                <Sparkles className="w-4 h-4 mr-2 text-violet-500" />
                Study Hub
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-6">
            <div className="py-6 h-full">
              
              {/* Summary Tab */}
              <TabsContent value="summary" className="m-0 focus-visible:outline-none flex flex-col gap-8 h-full">
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <AlignLeft className="w-4 h-4" /> Executive Summary
                  </h3>
                  <p className="text-foreground leading-relaxed">
                    {document.summary}
                  </p>
                </section>

                <Separator />

                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Key Insights Extracted
                  </h3>
                  <div className="flex flex-col gap-3">
                    {document.keyPoints.map((point, i) => (
                      <div key={i} className="flex gap-3 bg-muted/30 p-3 rounded-lg border border-border">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-semibold text-xs">
                          {i + 1}
                        </div>
                        <span className="text-sm leading-snug">{point}</span>
                      </div>
                    ))}
                  </div>
                </section>
                
                {document.extractedDeadlines.length > 0 && (
                  <>
                    <Separator />
                    <section>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-red-500" /> Key Dates & Deadlines
                      </h3>
                      <div className="flex flex-col gap-2">
                        {document.extractedDeadlines.map((deadline, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
                            <span className="text-sm font-medium">{deadline.text}</span>
                            <Badge variant="outline" className="text-red-500 border-red-500/30 bg-red-500/5">
                              {format(new Date(deadline.date), 'MMM d, yyyy')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                )}

                <Separator className="my-6" />

                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" /> AI Document Actions
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Instantly query Nexus AI in the chat using this document as context:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      className="text-xs font-semibold gap-1.5 justify-start h-9 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all dark:hover:bg-indigo-950/20"
                      onClick={() => handleAiAction("Summarize this document and list the top key takeaways.")}
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                      Summarize
                    </Button>
                    <Button 
                      variant="outline" 
                      className="text-xs font-semibold gap-1.5 justify-start h-9 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all dark:hover:bg-red-950/20"
                      onClick={() => handleAiAction("Analyze this document and find any mistakes, errors, inconsistencies, or typos.")}
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      Find Mistakes
                    </Button>
                    <Button 
                      variant="outline" 
                      className="text-xs font-semibold gap-1.5 justify-start h-9 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all dark:hover:bg-emerald-950/20"
                      onClick={() => handleAiAction("Create a structured infographic plan and outline for this document, including charts and layout suggestions.")}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Make Infographic
                    </Button>
                    <Button 
                      variant="outline" 
                      className="text-xs font-semibold gap-1.5 justify-start h-9 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 transition-all dark:hover:bg-violet-950/20"
                      onClick={() => handleAiAction("Draft a professional email summarizing the key points of this document to send to the team.")}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Write Email
                    </Button>
                  </div>
                </section>
              </TabsContent>

              {/* Tasks Tab */}
              <TabsContent value="tasks" className="m-0 focus-visible:outline-none">
                {document.extractedTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <CheckSquare className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium">No tasks found</h3>
                    <p className="text-sm text-muted-foreground">AI didn't detect any action items in this document.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {document.extractedTasks.map((task) => (
                      <div key={task.id} className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card">
                        <input type="checkbox" className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                        <div className="flex flex-col gap-2 flex-1">
                          <span className="text-sm font-medium">{task.text}</span>
                          <div className="flex items-center gap-3 mt-1">
                            {task.assignee && (
                              <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                                <Avatar className="w-4 h-4">
                                  <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{task.assignee.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-medium">{task.assignee}</span>
                              </div>
                            )}
                            {task.deadline && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                                <Clock className="w-3 h-3" />
                                {format(new Date(task.deadline), 'MMM d')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Entities Tab */}
              <TabsContent value="entities" className="m-0 focus-visible:outline-none">
                <div className="flex flex-col gap-8">
                  <section>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Mentioned People</h3>
                    <div className="flex flex-wrap gap-2">
                      {document.extractedPeople.length > 0 ? document.extractedPeople.map((person, i) => (
                        <Badge key={i} variant="secondary" className="px-3 py-1.5 text-sm font-medium rounded-full">
                          {person}
                        </Badge>
                      )) : <span className="text-sm text-muted-foreground">None detected</span>}
                    </div>
                  </section>
                  
                  <Separator />
                  
                  <section>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Organizations & Companies</h3>
                    <div className="flex flex-wrap gap-2">
                      {document.extractedOrganizations.length > 0 ? document.extractedOrganizations.map((org, i) => (
                        <Badge key={i} variant="outline" className="px-3 py-1.5 text-sm font-medium rounded-full">
                          {org}
                        </Badge>
                      )) : <span className="text-sm text-muted-foreground">None detected</span>}
                    </div>
                  </section>
                </div>
              </TabsContent>

              {/* Raw Text Tab */}
              <TabsContent value="content" className="m-0 focus-visible:outline-none">
                <div className="bg-muted/30 p-4 rounded-lg border border-border font-mono text-sm leading-relaxed whitespace-pre-wrap">
                  {document.content || "Document content not available in preview."}
                </div>
              </TabsContent>

              {/* Study Hub Tab */}
              <TabsContent value="study" className="m-0 focus-visible:outline-none">
                <StudyHub document={document} />
              </TabsContent>

            </div>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
