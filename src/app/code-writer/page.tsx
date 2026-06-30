'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileCode, Folder, FolderOpen, Save, Sparkles, Send, RefreshCw, 
  ChevronRight, ChevronDown, Check, Code, ShieldAlert, Cpu, ArrowLeftRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export default function CodeWriterPage() {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({ 'src': true });
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  
  // AI Copilot States
  const [instruction, setInstruction] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // File tree retrieval
  async function loadFileTree() {
    setLoadingTree(true);
    try {
      const response = await fetch('/api/code-writer/files');
      if (!response.ok) throw new Error('Failed to load project files');
      const data = await response.json();
      setFileTree(data.files || []);
      
      // Auto-open first file if found
      const firstFile = findFirstFile(data.files || []);
      if (firstFile) {
        handleOpenFile(firstFile.path);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load project file directory');
    } finally {
      setLoadingTree(false);
    }
  }

  function findFirstFile(nodes: FileNode[]): FileNode | null {
    for (const node of nodes) {
      if (node.type === 'file') return node;
      if (node.children) {
        const found = findFirstFile(node.children);
        if (found) return found;
      }
    }
    return null;
  }

  useEffect(() => {
    loadFileTree();
  }, []);

  // Open a file
  async function handleOpenFile(pathStr: string) {
    setActiveFilePath(pathStr);
    setLoadingContent(true);
    setAiResult('');
    try {
      const response = await fetch(`/api/code-writer/files?path=${encodeURIComponent(pathStr)}`);
      if (!response.ok) throw new Error('Failed to read file');
      const data = await response.json();
      setFileContent(data.content || '');
      setOriginalContent(data.content || '');
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to open file: ${pathStr}`);
    } finally {
      setLoadingContent(false);
    }
  }

  // Save changes
  async function handleSaveFile() {
    if (!activeFilePath) return;
    setSaving(true);
    try {
      const response = await fetch('/api/code-writer/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeFilePath, content: fileContent })
      });
      if (!response.ok) throw new Error('Failed to save file changes');
      setOriginalContent(fileContent);
      toast.success('Changes saved successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  // Call Copilot AI
  async function handleAskAI() {
    if (!fileContent || !instruction) {
      toast.warning('Please select a file and enter instructions for the AI');
      return;
    }
    setGenerating(true);
    const toastId = toast.loading('AI Copilot is modifying code...');
    try {
      const ext = activeFilePath ? activeFilePath.split('.').pop() : 'ts';
      const response = await fetch('/api/code-writer/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: fileContent,
          instruction: instruction,
          language: ext === 'tsx' || ext === 'ts' ? 'TypeScript' : 'JavaScript'
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI generation failed');
      
      setAiResult(data.result);
      toast.success('AI generation complete! Review changes on the right.', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'AI request failed', { id: toastId });
    } finally {
      setGenerating(false);
    }
  }

  const handleApplyAI = () => {
    if (!aiResult) return;
    setFileContent(aiResult);
    setAiResult('');
    setInstruction('');
    toast.success('AI changes applied to editor. Save changes to write to file.');
  };

  // Toggle folder collapse
  const toggleFolder = (folderPath: string) => {
    setOpenFolders(prev => ({ ...prev, [folderPath]: !prev[folderPath] }));
  };

  // Render tree node recursively
  const renderNode = (node: FileNode, depth = 0) => {
    const isFolder = node.type === 'directory';
    const isOpen = openFolders[node.path];
    const isSelected = activeFilePath === node.path;

    return (
      <div key={node.path} className="select-none">
        <button
          onClick={() => isFolder ? toggleFolder(node.path) : handleOpenFile(node.path)}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          className={`w-full flex items-center gap-1.5 py-1 rounded text-xs transition-colors hover:bg-muted/40 cursor-pointer ${
            isSelected ? 'bg-primary/15 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {isFolder ? (
            <>
              {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              {isOpen ? <FolderOpen className="w-3.5 h-3.5 text-amber-500/80" /> : <Folder className="w-3.5 h-3.5 text-amber-500/80" />}
            </>
          ) : (
            <>
              <span className="w-3.5 h-3.5 shrink-0" />
              <FileCode className={`w-3.5 h-3.5 ${isSelected ? 'text-primary' : 'text-indigo-500/60'}`} />
            </>
          )}
          <span className="truncate">{node.name}</span>
        </button>

        {isFolder && isOpen && node.children && (
          <div className="flex flex-col">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const hasUnsavedChanges = fileContent !== originalContent;

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Header Banner */}
      <div className="border-b border-border/60 bg-card/30 backdrop-blur-md px-6 py-4.5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Code className="w-5 h-5 text-indigo-500" /> AI Code Writer
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Explore your repository, request automated refactoring, and modify source code directly.</p>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge className="bg-amber-500/10 text-amber-600 border-0 mr-2 py-0.5 animate-pulse font-semibold">
              Unsaved Changes
            </Badge>
          )}
          <Button 
            disabled={!activeFilePath || saving} 
            onClick={handleSaveFile} 
            size="sm" 
            className="h-8 gap-1.5 text-xs font-semibold cursor-pointer rounded-full"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save File
          </Button>
        </div>
      </div>

      {/* Main Workspace split panel */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Panel 1: File Explorer (Left) */}
        <div className="w-56 border-r border-border/60 flex flex-col bg-card/10 shrink-0">
          <div className="p-3 border-b border-border/40 shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Workspace files</span>
          </div>
          <div className="flex-1 overflow-auto p-2 flex flex-col gap-0.5">
            {loadingTree ? (
              <div className="p-4 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
                <span className="text-[10px] text-muted-foreground">Mapping folder tree...</span>
              </div>
            ) : fileTree.length === 0 ? (
              <div className="p-4 text-center text-3xs text-muted-foreground italic">
                No code files found in workspace root.
              </div>
            ) : (
              fileTree.map(node => renderNode(node))
            )}
          </div>
        </div>

        {/* Panel 2: Editor area (Center) */}
        <div className="flex-1 flex flex-col min-w-0 bg-code-editor-bg">
          {activeFilePath ? (
            <>
              {/* Filename Header */}
              <div className="bg-card/50 border-b border-border/40 px-4 py-2 flex items-center justify-between shrink-0">
                <span className="text-xs font-mono text-muted-foreground truncate font-semibold">{activeFilePath}</span>
                <span className="text-[10px] uppercase bg-muted px-2 py-0.5 rounded text-muted-foreground border border-border/30">
                  {activeFilePath.split('.').pop()}
                </span>
              </div>

              {/* Code TextArea */}
              <div className="flex-1 relative flex overflow-hidden">
                {loadingContent ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-3xs">
                    <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : (
                  <div className="flex-1 flex overflow-hidden">
                    {/* Line numbers bar */}
                    <div className="w-12 bg-muted/20 border-r border-border/30 py-4 font-mono text-[10px] text-muted-foreground/60 select-none text-right pr-3 leading-relaxed flex flex-col">
                      {Array.from({ length: Math.max(fileContent.split('\n').length, 1) }).map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                    {/* Textarea code container */}
                    <textarea
                      value={fileContent}
                      onChange={(e) => setFileContent(e.target.value)}
                      className="flex-1 p-4 font-mono text-xs text-foreground bg-transparent border-0 outline-none resize-none overflow-auto leading-relaxed select-text"
                      spellCheck="false"
                      style={{ tabSize: 2 }}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
              <FileCode className="w-10 h-10 text-muted-foreground/40" />
              <div>
                <h3 className="text-xs font-bold text-foreground">No file open</h3>
                <p className="text-3xs text-muted-foreground max-w-[200px] mt-0.5 leading-normal">
                  Select a code file from the left sidebar explorer to view or modify its contents.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Panel 3: AI Assistant / Copilot (Right) */}
        <div className="w-80 border-l border-border/60 flex flex-col bg-card/20 shrink-0">
          <div className="p-3 border-b border-border/40 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" /> AI Code Copilot
            </span>
          </div>

          <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
            {/* Input Instruction */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Instructions</label>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g. Optimize this query, Add basic error validation, Convert this helper into TypeScript format..."
                className="w-full h-24 p-3 border border-border/80 bg-background rounded-xl text-xs outline-none focus:border-indigo-500 resize-none leading-normal"
              />
            </div>

            {/* Submit Action */}
            <Button
              onClick={handleAskAI}
              disabled={generating || !activeFilePath || !instruction}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 cursor-pointer gap-1.5"
            >
              {generating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
              Generate Modifications
            </Button>

            {/* AI Results Block */}
            {aiResult && (
              <div className="flex-1 flex flex-col gap-3 min-h-[250px] border border-indigo-500/20 bg-indigo-500/5 rounded-2xl p-4.5">
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Generated Result
                  </span>
                  <Button
                    onClick={handleApplyAI}
                    size="xs"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] h-6 px-2.5 rounded-full font-semibold cursor-pointer"
                  >
                    Apply to Editor
                  </Button>
                </div>
                <div className="flex-1 overflow-auto bg-card border border-border/40 rounded-xl p-3">
                  <pre className="text-[10px] font-mono leading-relaxed select-text whitespace-pre-wrap">
                    {aiResult}
                  </pre>
                </div>
              </div>
            )}
            
            {!aiResult && (
              <div className="flex-1 border border-dashed border-border/60 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-muted-foreground gap-2">
                <ArrowLeftRight className="w-8 h-8 opacity-20" />
                <span className="text-3xs leading-relaxed max-w-[180px]">
                  Write an instruction above and generate improvements. Modified code will show here for your approval.
                </span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
