'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { 
  Palette, Type, Square, Circle as CircleIcon, StickyNote, 
  MousePointer, Eraser, Download, Trash2, ArrowRight, Plus, 
  ChevronRight, ZoomIn, ZoomOut, Maximize2, Pen, Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Tool = 'select' | 'sticky' | 'rect' | 'circle' | 'text' | 'draw';

interface BoardElement {
  id: string;
  type: 'sticky' | 'rect' | 'circle' | 'text' | 'path' | 'image';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  points?: { x: number; y: number }[]; // for freehand path
}

const COLOR_PALETTE = [
  { name: 'Yellow', bg: 'bg-yellow-100 dark:bg-yellow-950/40', border: 'border-yellow-300 dark:border-yellow-800', hex: '#fef08a', strokeHex: '#ca8a04' },
  { name: 'Blue', bg: 'bg-blue-100 dark:bg-blue-950/40', border: 'border-blue-300 dark:border-blue-800', hex: '#bfdbfe', strokeHex: '#2563eb' },
  { name: 'Pink', bg: 'bg-pink-100 dark:bg-pink-950/40', border: 'border-pink-300 dark:border-pink-800', hex: '#fbcfe8', strokeHex: '#db2777' },
  { name: 'Green', bg: 'bg-green-100 dark:bg-green-950/40', border: 'border-green-300 dark:border-green-800', hex: '#bbf7d0', strokeHex: '#16a34a' },
  { name: 'Purple', bg: 'bg-purple-100 dark:bg-purple-950/40', border: 'border-purple-300 dark:border-purple-800', hex: '#e9d5ff', strokeHex: '#7c3aed' },
  { name: 'Dark', bg: 'bg-zinc-200 dark:bg-zinc-800/40', border: 'border-zinc-400 dark:border-zinc-700', hex: '#27272a', strokeHex: '#09090b' },
];

export default function WhiteboardPage() {
  const { setActivePage } = useWorkspace();
  const [tool, setTool] = useState<Tool>('select');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
  
  // Whiteboard items state
  const [elements, setElements] = useState<BoardElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Interaction tracking state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Canvas bounds reference
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const newElId = `el-${Date.now()}`;
      const newEl: BoardElement = {
        id: newElId,
        type: 'image',
        x: 200,
        y: 150,
        width: 300,
        height: 220,
        text: dataUrl,
        color: ''
      };

      const updated = [...elements, newEl];
      saveBoard(updated);
      setSelectedElementId(newElId);
      setTool('select');
      toast.success(`Loaded image: ${file.name}`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  useEffect(() => {
    setActivePage('whiteboard');
    
    // Load board from local storage if available
    const saved = localStorage.getItem('nexus_whiteboard_elements');
    if (saved) {
      try {
        setElements(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse whiteboard elements', e);
      }
    }
  }, [setActivePage]);

  // Sync to local storage
  const saveBoard = (newElements: BoardElement[]) => {
    setElements(newElements);
    localStorage.setItem('nexus_whiteboard_elements', JSON.stringify(newElements));
  };

  // Convert client cursor coordinate to local SVG coordinate
  const getSvgCoords = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getSvgCoords(e);
    
    // 1. Draw freehand tool
    if (tool === 'draw') {
      setIsDrawing(true);
      setCurrentPath([coords]);
      return;
    }

    // 2. Select tool
    if (tool === 'select') {
      // Find element clicked (reverse order to get topmost element first)
      const target = [...elements].reverse().find(el => {
        if (el.type === 'path') return false; // paths drag support is complex
        const w = el.width || 100;
        const h = el.height || 100;
        return coords.x >= el.x && coords.x <= el.x + w && coords.y >= el.y && coords.y <= el.y + h;
      });

      if (target) {
        setSelectedElementId(target.id);
        setIsDragging(true);
        setDragOffset({
          x: coords.x - target.x,
          y: coords.y - target.y
        });
      } else {
        setSelectedElementId(null);
      }
      return;
    }

    // 3. Adding shapes / stickies
    const newElId = `el-${Date.now()}`;
    let newEl: BoardElement | null = null;

    if (tool === 'sticky') {
      newEl = {
        id: newElId,
        type: 'sticky',
        x: coords.x - 75,
        y: coords.y - 75,
        width: 150,
        height: 150,
        text: 'Double click to edit status note',
        color: selectedColor.hex
      };
    } else if (tool === 'rect') {
      newEl = {
        id: newElId,
        type: 'rect',
        x: coords.x - 60,
        y: coords.y - 45,
        width: 120,
        height: 90,
        text: '',
        color: selectedColor.hex
      };
    } else if (tool === 'circle') {
      newEl = {
        id: newElId,
        type: 'circle',
        x: coords.x - 50,
        y: coords.y - 50,
        width: 100,
        height: 100,
        text: '',
        color: selectedColor.hex
      };
    } else if (tool === 'text') {
      newEl = {
        id: newElId,
        type: 'text',
        x: coords.x,
        y: coords.y,
        width: 150,
        height: 40,
        text: 'Text Label',
        color: '#000000'
      };
    }

    if (newEl) {
      const updated = [...elements, newEl];
      saveBoard(updated);
      setSelectedElementId(newElId);
      setTool('select'); // Switch to select to allow editing/dragging
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getSvgCoords(e);

    if (isDrawing && tool === 'draw') {
      setCurrentPath(prev => [...prev, coords]);
    }

    if (isDragging && selectedElementId && tool === 'select') {
      const updated = elements.map(el => {
        if (el.id === selectedElementId) {
          return {
            ...el,
            x: coords.x - dragOffset.x,
            y: coords.y - dragOffset.y
          };
        }
        return el;
      });
      setElements(updated); // temporary update during drag
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && tool === 'draw' && currentPath.length > 1) {
      const newPathEl: BoardElement = {
        id: `el-${Date.now()}`,
        type: 'path',
        x: 0,
        y: 0,
        points: currentPath,
        color: selectedColor.strokeHex
      };
      saveBoard([...elements, newPathEl]);
    }
    setIsDrawing(false);
    setCurrentPath([]);

    if (isDragging) {
      setIsDragging(false);
      saveBoard(elements); // commit drag offsets to local storage
    }
  };

  // Modify text of stickies/text notes
  const handleDoubleClick = (id: string, text?: string) => {
    const newText = prompt('Edit element label:', text || '');
    if (newText !== null) {
      const updated = elements.map(el => {
        if (el.id === id) {
          return { ...el, text: newText };
        }
        return el;
      });
      saveBoard(updated);
    }
  };

  const deleteSelected = () => {
    if (selectedElementId) {
      const updated = elements.filter(el => el.id !== selectedElementId);
      saveBoard(updated);
      setSelectedElementId(null);
      toast.info('Deleted whiteboard element');
    }
  };

  const clearCanvas = () => {
    if (confirm('Clear entire whiteboard canvas?')) {
      saveBoard([]);
      setSelectedElementId(null);
      toast.success('Canvas cleared');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#fbfbfa] dark:bg-[#191919] overflow-hidden text-foreground">
      
      {/* Header Panel */}
      <div className="p-4 border-b border-border bg-card shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Palette className="w-5 h-5 text-muted-foreground" />
            Whiteboard Canvas
          </h1>
          <p className="text-xs text-muted-foreground">Collaborative interactive board for sticky maps, architecture specs, and mockups.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={clearCanvas} className="gap-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 border-red-200">
            <Trash2 className="w-3.5 h-3.5" /> Clear Board
          </Button>
        </div>
      </div>

      {/* Primary Whiteboard Panel */}
      <div className="flex-1 relative overflow-hidden flex select-none">
        
        {/* Floating Toolbar */}
        <div className="absolute left-6 top-6 bg-card border border-border shadow-lg rounded-xl p-2.5 flex flex-col gap-2 z-10 shrink-0 max-w-[50px] items-center">
          <button
            onClick={() => { setTool('select'); setSelectedElementId(null); }}
            className={cn("p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground", tool === 'select' && "bg-primary/10 text-primary hover:bg-primary/20")}
            title="Select & Move (V)"
          >
            <MousePointer className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setTool('sticky')}
            className={cn("p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground", tool === 'sticky' && "bg-primary/10 text-primary hover:bg-primary/20")}
            title="Sticky Note (S)"
          >
            <StickyNote className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setTool('rect')}
            className={cn("p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground", tool === 'rect' && "bg-primary/10 text-primary hover:bg-primary/20")}
            title="Rectangle (R)"
          >
            <Square className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setTool('circle')}
            className={cn("p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground", tool === 'circle' && "bg-primary/10 text-primary hover:bg-primary/20")}
            title="Circle (C)"
          >
            <CircleIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setTool('text')}
            className={cn("p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground", tool === 'text' && "bg-primary/10 text-primary hover:bg-primary/20")}
            title="Label Text (T)"
          >
            <Type className="w-4 h-4" />
          </button>

          <button
            onClick={() => setTool('draw')}
            className={cn("p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground", tool === 'draw' && "bg-primary/10 text-primary hover:bg-primary/20")}
            title="Freehand Pen (P)"
          >
            <Pen className="w-4 h-4" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Insert Local Image File"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />

          <div className="h-px bg-border w-full my-1.5" />

          {selectedElementId && (
            <button
              onClick={deleteSelected}
              className="p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 transition-colors"
              title="Delete Selected Element"
            >
              <Eraser className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Color Palette Selector */}
        <div className="absolute right-6 top-6 bg-card border border-border shadow-lg rounded-xl p-2.5 flex items-center gap-1.5 z-10 shrink-0">
          <span className="text-[10px] text-muted-foreground font-bold uppercase mr-1">Color:</span>
          {COLOR_PALETTE.map((pal, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedColor(pal);
                if (selectedElementId) {
                  const updated = elements.map(el => 
                    el.id === selectedElementId ? { ...el, color: pal.hex } : el
                  );
                  saveBoard(updated);
                }
              }}
              className={cn(
                "w-5 h-5 rounded-full border border-border shrink-0 hover:scale-105 transition-transform",
                selectedColor.name === pal.name && "ring-2 ring-primary ring-offset-2 dark:ring-offset-[#191919]"
              )}
              style={{ backgroundColor: pal.hex }}
              title={pal.name}
            />
          ))}
        </div>

        {/* Info panel at bottom */}
        <div className="absolute bottom-6 left-6 bg-card border border-border px-3 py-1.5 shadow-md rounded-lg text-[10px] text-muted-foreground z-10 flex gap-4">
          <span>💡 Select a shape tool, then click to place.</span>
          <span>🖱️ Click & drag in Select mode to move notes.</span>
          <span>✏️ Double click to edit texts.</span>
        </div>

        {/* Interactive SVG Canvas */}
        <svg
          ref={svgRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="flex-1 w-full h-full bg-[#faf9f6] dark:bg-[#1f1f1e] cursor-crosshair"
          style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
        >
          {/* Background Grid Pattern */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth="1" className="dark:stroke-white/5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Render Elements */}
          {elements.map((el) => {
            const isSelected = selectedElementId === el.id;

            // Freehand Path Render
            if (el.type === 'path' && el.points) {
              const d = el.points.reduce(
                (acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
                ''
              );
              return (
                <path
                  key={el.id}
                  d={d}
                  fill="none"
                  stroke={el.color}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn("transition-all", isSelected && "stroke-primary")}
                  onClick={(e) => {
                    if (tool === 'select') {
                      e.stopPropagation();
                      setSelectedElementId(el.id);
                    }
                  }}
                />
              );
            }

            // Rect shape render
            if (el.type === 'rect') {
              return (
                <g key={el.id}>
                  <rect
                    x={el.x}
                    y={el.y}
                    width={el.width || 120}
                    height={el.height || 90}
                    rx="4"
                    fill={el.color}
                    fillOpacity="0.85"
                    stroke={isSelected ? '#6366f1' : 'rgba(0,0,0,0.1)'}
                    strokeWidth={isSelected ? '2.5' : '1'}
                    className="cursor-pointer transition-shadow"
                  />
                  {el.text && (
                    <text
                      x={el.x + (el.width || 120) / 2}
                      y={el.y + (el.height || 90) / 2 + 4}
                      textAnchor="middle"
                      className="text-xs font-semibold select-none fill-slate-800"
                    >
                      {el.text}
                    </text>
                  )}
                </g>
              );
            }

            // Circle shape render
            if (el.type === 'circle') {
              const radius = (el.width || 100) / 2;
              return (
                <g key={el.id}>
                  <circle
                    cx={el.x + radius}
                    cy={el.y + radius}
                    r={radius}
                    fill={el.color}
                    fillOpacity="0.85"
                    stroke={isSelected ? '#6366f1' : 'rgba(0,0,0,0.1)'}
                    strokeWidth={isSelected ? '2.5' : '1'}
                    className="cursor-pointer"
                  />
                  {el.text && (
                    <text
                      x={el.x + radius}
                      y={el.y + radius + 4}
                      textAnchor="middle"
                      className="text-xs font-semibold select-none fill-slate-800"
                    >
                      {el.text}
                    </text>
                  )}
                </g>
              );
            }

            // Text Label Render
            if (el.type === 'text') {
              return (
                <g key={el.id}>
                  {isSelected && (
                    <rect
                      x={el.x - 4}
                      y={el.y - 14}
                      width={(el.width || 150) + 8}
                      height={24}
                      fill="none"
                      stroke="#6366f1"
                      strokeDasharray="3 3"
                      strokeWidth="1.5"
                    />
                  )}
                  <text
                    x={el.x}
                    y={el.y}
                    onDoubleClick={() => handleDoubleClick(el.id, el.text)}
                    className="text-sm font-bold cursor-text select-none fill-foreground"
                  >
                    {el.text || 'Label'}
                  </text>
                </g>
              );
            }

            // Image Render
            if (el.type === 'image') {
              return (
                <g key={el.id}>
                  <image
                    href={el.text}
                    x={el.x}
                    y={el.y}
                    width={el.width || 200}
                    height={el.height || 150}
                    preserveAspectRatio="xMidYMid meet"
                    className="cursor-move"
                    onClick={(e) => {
                      if (tool === 'select') {
                        e.stopPropagation();
                        setSelectedElementId(el.id);
                      }
                    }}
                  />
                  {isSelected && (
                    <rect
                      x={el.x - 4}
                      y={el.y - 4}
                      width={(el.width || 200) + 8}
                      height={(el.height || 150) + 8}
                      fill="none"
                      stroke="#6366f1"
                      strokeDasharray="3 3"
                      strokeWidth="1.5"
                    />
                  )}
                </g>
              );
            }

            // Sticky Note Render
            return (
              <g key={el.id} onDoubleClick={() => handleDoubleClick(el.id, el.text)}>
                {/* Visual shadow block */}
                <rect
                  x={el.x + 3}
                  y={el.y + 3}
                  width={el.width || 150}
                  height={el.height || 150}
                  fill="rgba(0,0,0,0.05)"
                  rx="6"
                />
                <rect
                  x={el.x}
                  y={el.y}
                  width={el.width || 150}
                  height={el.height || 150}
                  fill={el.color}
                  rx="6"
                  stroke={isSelected ? '#6366f1' : 'rgba(0,0,0,0.06)'}
                  strokeWidth={isSelected ? '2.5' : '1'}
                  className="cursor-move"
                />
                
                {/* Note title bar */}
                <rect
                  x={el.x}
                  y={el.y}
                  width={el.width || 150}
                  height="12"
                  fill="rgba(0,0,0,0.03)"
                  rx="6"
                />

                {/* Centered wrap-around text block */}
                <foreignObject
                  x={el.x + 8}
                  y={el.y + 16}
                  width={(el.width || 150) - 16}
                  height={(el.height || 150) - 24}
                  className="pointer-events-none"
                >
                  <div className="w-full h-full text-slate-800 text-[10px] font-semibold leading-relaxed overflow-hidden text-center flex items-center justify-center p-1 font-sans">
                    {el.text}
                  </div>
                </foreignObject>
              </g>
            );
          })}

          {/* Current Drawing Path Preview */}
          {isDrawing && currentPath.length > 1 && (
            <path
              d={currentPath.reduce(
                (acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
                ''
              )}
              fill="none"
              stroke={selectedColor.strokeHex}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-70"
            />
          )}
        </svg>
      </div>

    </div>
  );
}
