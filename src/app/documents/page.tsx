'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/lib/store';
import { motion } from 'motion/react';
import { FileText, Search, Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentCard } from '@/components/documents/document-card';
import { DocumentDetail } from '@/components/documents/document-detail';
import { UploadZone } from '@/components/documents/upload-zone';
import { cn } from '@/lib/utils';

const typeFilters = ['all', 'pdf', 'txt', 'meeting', 'research'] as const;

export default function DocumentsPage() {
  const { setActivePage, documents, selectedDocumentId, setSelectedDocumentId } = useWorkspace();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    setActivePage('documents');
  }, [setActivePage]);

  const selectedDocument = documents.find(d => d.id === selectedDocumentId) || null;

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
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
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="p-6 md:p-8 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground">{documents.length} documents in workspace</p>
        </div>
        
        <Button 
          onClick={() => setUploadOpen(true)}
          className="bg-foreground text-background hover:opacity-90 gap-2 shrink-0 h-8 text-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Upload
        </Button>
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
        {filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium mb-1">No documents found</h3>
            <p className="text-sm text-muted-foreground mb-4">Upload your first document to get started</p>
            <Button onClick={() => setUploadOpen(true)} variant="outline" size="sm" className="gap-2">
              <Plus className="w-3.5 h-3.5" /> Upload Document
            </Button>
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

      {/* Document Detail Sheet */}
      {selectedDocument && (
        <DocumentDetail 
          document={selectedDocument} 
          onClose={() => setSelectedDocumentId(null)} 
        />
      )}

      {/* Upload Dialog */}
      <UploadZone open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
