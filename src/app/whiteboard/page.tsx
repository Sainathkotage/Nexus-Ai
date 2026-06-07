'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '@/lib/store';
import { usePopup } from '@/lib/popup-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { 
  Palette, Type, Square, Circle as CircleIcon, StickyNote, 
  MousePointer, Eraser, Download, Trash2, ArrowRight, Plus, 
  ChevronRight, ZoomIn, ZoomOut, Maximize2, Pen, Image as ImageIcon,
  Hand, Undo2, Redo2, Lock, Unlock, Diamond as DiamondIcon, Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Tool = 'select' | 'hand' | 'sticky' | 'rect' | 'circle' | 'diamond' | 'arrow' | 'line' | 'text' | 'draw' | 'eraser';

interface BoardElement {
  id: string;
  type: 'sticky' | 'rect' | 'circle' | 'diamond' | 'arrow' | 'line' | 'text' | 'path' | 'image';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  fillColor?: string;
  strokeWidth?: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  fillStyle?: 'transparent' | 'semi' | 'solid';
  points?: { x: number; y: number }[];
  isLocked?: boolean;
}

const COLOR_PALETTE = [
  { name: 'Yellow', hex: '#fef08a', strokeHex: '#ca8a04' },
  { name: 'Blue', hex: '#bfdbfe', strokeHex: '#2563eb' },
  { name: 'Pink', hex: '#fbcfe8', strokeHex: '#db2777' },
  { name: 'Green', hex: '#bbf7d0', strokeHex: '#16a34a' },
  { name: 'Purple', hex: '#e9d5ff', strokeHex: '#7c3aed' },
  { name: 'Dark', hex: '#e2e8f0', strokeHex: '#0f172a' },
  { name: 'Red', hex: '#fecaca', strokeHex: '#dc2626' },
];

export default function WhiteboardPage() {
  const { setActivePage, workspace, user } = useWorkspace();
  const { confirm, prompt } = usePopup();
  const [tool, setTool] = useState<Tool>('select');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[5]); // Default to Slate Dark
  
  // Custom properties defaults
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number>(2);
  const [currentStrokeStyle, setCurrentStrokeStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [currentFillStyle, setCurrentFillStyle] = useState<'transparent' | 'semi' | 'solid'>('semi');

  // Canvas State & History Stack
  const [elements, setElements] = useState<BoardElement[]>([]);
  const [history, setHistory] = useState<BoardElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Interaction Panning & Zooming
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Drawing tracking
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [drawingElementId, setDrawingElementId] = useState<string | null>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartCoords, setDragStartCoords] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Realtime Cursors and Syncing Refs
  const [peerCursors, setPeerCursors] = useState<Record<string, { x: number; y: number; name: string; timestamp: number }>>({});
  const channelRef = useRef<any>(null);
  const elementsRef = useRef<BoardElement[]>([]);
  const lastCursorBroadcastRef = useRef<number>(0);

  // Sync elements ref for real-time listener access
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  // Initialize
  useEffect(() => {
    setActivePage('whiteboard');
    const saved = localStorage.getItem('nexus_whiteboard_elements');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setElements(parsed);
        setHistory([parsed]);
        setHistoryIndex(0);
      } catch (e) {
        console.error('Failed to parse whiteboard elements', e);
      }
    }
  }, [setActivePage]);

  // Realtime Channel Sync
  useEffect(() => {
    if (!workspace) return;
    
    const channelName = `whiteboard-${workspace.id}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'whiteboard-update' }, ({ payload }) => {
        if (payload && payload.senderId !== user?.id) {
          if (payload.elements) {
            setElements(payload.elements);
            setHistory(prev => {
              const nextHistory = prev.slice(0, historyIndex + 1);
              nextHistory.push(payload.elements);
              return nextHistory;
            });
            setHistoryIndex(prev => prev + 1);
            localStorage.setItem('nexus_whiteboard_elements', JSON.stringify(payload.elements));
          }
        }
      })
      .on('broadcast', { event: 'whiteboard-request-state' }, ({ payload }) => {
        if (payload && payload.senderId !== user?.id) {
          channel.send({
            type: 'broadcast',
            event: 'whiteboard-update',
            payload: {
              elements: elementsRef.current,
              senderId: user?.id
            }
          });
        }
      })
      .on('broadcast', { event: 'whiteboard-cursor' }, ({ payload }) => {
        if (payload && payload.senderId !== user?.id) {
          setPeerCursors(prev => ({
            ...prev,
            [payload.senderId]: {
              x: payload.x,
              y: payload.y,
              name: payload.name,
              timestamp: Date.now()
            }
          }));
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to whiteboard channel: ${channelName}`);
          channel.send({
            type: 'broadcast',
            event: 'whiteboard-request-state',
            payload: {
              senderId: user?.id
            }
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspace, user?.id]);

  // Peer cursors timeout cleanup
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setPeerCursors(prev => {
        const clean: typeof prev = {};
        let changed = false;
        for (const [id, cursor] of Object.entries(prev)) {
          if (now - cursor.timestamp < 3000) {
            clean[id] = cursor;
          } else {
            changed = true;
          }
        }
        return changed ? clean : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const broadcastElements = (elementsList: BoardElement[]) => {
    if (channelRef.current && user) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'whiteboard-update',
        payload: {
          elements: elementsList,
          senderId: user.id
        }
      });
    }
  };

  // History & Storage Sync
  const pushHistory = (newElements: BoardElement[]) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newElements);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setElements(newElements);
    localStorage.setItem('nexus_whiteboard_elements', JSON.stringify(newElements));
    broadcastElements(newElements);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setElements(history[prevIndex]);
      setSelectedElementId(null);
      localStorage.setItem('nexus_whiteboard_elements', JSON.stringify(history[prevIndex]));
      broadcastElements(history[prevIndex]);
      toast.info('Undo change');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setElements(history[nextIndex]);
      setSelectedElementId(null);
      localStorage.setItem('nexus_whiteboard_elements', JSON.stringify(history[nextIndex]));
      broadcastElements(history[nextIndex]);
      toast.info('Redo change');
    }
  };

  // Coords computation taking zoom and pan offset into account
  const getSvgCoords = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - panOffset.x) / zoom,
      y: (e.clientY - rect.top - panOffset.y) / zoom
    };
  };

  // Image Upload handler
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
        x: (100 - panOffset.x) / zoom,
        y: (100 - panOffset.y) / zoom,
        width: 300,
        height: 220,
        text: dataUrl,
        color: '',
        isLocked: false
      };

      const updated = [...elements, newEl];
      pushHistory(updated);
      setSelectedElementId(newElId);
      setTool('select');
      toast.success(`Uploaded image: ${file.name}`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Interactions (Mouse handlers)
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getSvgCoords(e);
    
    // Space bar panning / hand tool pan start
    if (tool === 'hand' || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (tool === 'eraser') {
      const target = [...elements].reverse().find(el => {
        if (el.type === 'path' || el.type === 'line' || el.type === 'arrow') {
          if (!el.points) return false;
          const xs = el.points.map(p => p.x);
          const ys = el.points.map(p => p.y);
          return coords.x >= Math.min(...xs) - 10 && coords.x <= Math.max(...xs) + 10 &&
                 coords.y >= Math.min(...ys) - 10 && coords.y <= Math.max(...ys) + 10;
        }
        const w = el.width || 100;
        const h = el.height || 100;
        return coords.x >= el.x && coords.x <= el.x + w && coords.y >= el.y && coords.y <= el.y + h;
      });
      if (target) {
        const updated = elements.filter(el => el.id !== target.id);
        pushHistory(updated);
        toast.info('Erased element');
      }
      return;
    }

    if (tool === 'draw') {
      setIsDrawing(true);
      setCurrentPath([coords]);
      return;
    }

    if (tool === 'select') {
      const target = [...elements].reverse().find(el => {
        if (el.type === 'path') {
          if (!el.points) return false;
          const xs = el.points.map(p => p.x);
          const ys = el.points.map(p => p.y);
          return coords.x >= Math.min(...xs) && coords.x <= Math.max(...xs) &&
                 coords.y >= Math.min(...ys) && coords.y <= Math.max(...ys);
        }
        if (el.type === 'line' || el.type === 'arrow') {
          if (!el.points) return false;
          const [p1, p2] = el.points;
          return coords.x >= Math.min(p1.x, p2.x) - 10 && coords.x <= Math.max(p1.x, p2.x) + 10 &&
                 coords.y >= Math.min(p1.y, p2.y) - 10 && coords.y <= Math.max(p1.y, p2.y) + 10;
        }
        const w = el.width || 100;
        const h = el.height || 100;
        return coords.x >= el.x && coords.x <= el.x + w && coords.y >= el.y && coords.y <= el.y + h;
      });

      if (target) {
        setSelectedElementId(target.id);
        if (!target.isLocked) {
          setIsDragging(true);
          setDragStartCoords(coords);
        }
      } else {
        setSelectedElementId(null);
      }
      return;
    }

    // Creating element under click-and-drag drawing
    const newId = `el-${Date.now()}`;
    const newEl: BoardElement = {
      id: newId,
      type: tool as any,
      x: coords.x,
      y: coords.y,
      width: 0,
      height: 0,
      color: selectedColor.strokeHex,
      fillColor: selectedColor.hex,
      strokeWidth: currentStrokeWidth,
      strokeStyle: currentStrokeStyle,
      fillStyle: currentFillStyle,
      text: tool === 'sticky' ? 'Double click to edit status note' : tool === 'text' ? 'Type label here' : '',
      points: tool === 'line' || tool === 'arrow' ? [coords, coords] : undefined,
      isLocked: false
    };

    setElements(prev => [...prev, newEl]);
    setDrawingElementId(newId);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getSvgCoords(e);

    // Broadcast cursor position (throttle to ~50ms)
    const now = Date.now();
    if (now - lastCursorBroadcastRef.current > 50) {
      lastCursorBroadcastRef.current = now;
      if (channelRef.current && user) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'whiteboard-cursor',
          payload: {
            x: coords.x,
            y: coords.y,
            name: user.name,
            senderId: user.id
          }
        });
      }
    }

    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (isDrawing && tool === 'draw') {
      setCurrentPath(prev => [...prev, coords]);
      return;
    }

    if (drawingElementId) {
      setElements(prev => prev.map(el => {
        if (el.id === drawingElementId) {
          if (el.type === 'line' || el.type === 'arrow') {
            return { ...el, points: [el.points![0], coords] };
          }
          const dx = coords.x - el.x;
          const dy = coords.y - el.y;
          return {
            ...el,
            width: Math.abs(dx),
            height: Math.abs(dy),
            x: dx < 0 ? coords.x : el.x,
            y: dy < 0 ? coords.y : el.y
          };
        }
        return el;
      }));
      return;
    }

    if (isDragging && selectedElementId && tool === 'select') {
      const dx = coords.x - dragStartCoords.x;
      const dy = coords.y - dragStartCoords.y;
      setElements(prev => prev.map(el => {
        if (el.id === selectedElementId && !el.isLocked) {
          if (el.type === 'line' || el.type === 'arrow') {
            return {
              ...el,
              points: [
                { x: el.points![0].x + dx, y: el.points![0].y + dy },
                { x: el.points![1].x + dx, y: el.points![1].y + dy }
              ]
            };
          }
          if (el.type === 'path') {
            return {
              ...el,
              points: el.points!.map(p => ({ x: p.x + dx, y: p.y + dy }))
            };
          }
          return {
            ...el,
            x: el.x + dx,
            y: el.y + dy
          };
        }
        return el;
      }));
      setDragStartCoords(coords);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDrawing && tool === 'draw' && currentPath.length > 1) {
      const newPathEl: BoardElement = {
        id: `el-${Date.now()}`,
        type: 'path',
        x: 0,
        y: 0,
        points: currentPath,
        color: selectedColor.strokeHex,
        isLocked: false
      };
      pushHistory([...elements, newPathEl]);
      setIsDrawing(false);
      setCurrentPath([]);
      setTool('select');
      return;
    }

    if (drawingElementId) {
      const finalized = elements.map(el => {
        if (el.id === drawingElementId) {
          // If click without drag, create standard sizes
          if ((el.type === 'line' || el.type === 'arrow') && Math.hypot(el.points![1].x - el.points![0].x, el.points![1].y - el.points![0].y) < 5) {
            return { ...el, points: [el.points![0], { x: el.points![0].x + 100, y: el.points![0].y + 50 }] };
          }
          if (el.type !== 'line' && el.type !== 'arrow' && el.type !== 'path' && (el.width || 0) < 5 && (el.height || 0) < 5) {
            return {
              ...el,
              width: el.type === 'sticky' ? 150 : el.type === 'text' ? 150 : 100,
              height: el.type === 'sticky' ? 150 : el.type === 'text' ? 30 : 80
            };
          }
        }
        return el;
      });
      pushHistory(finalized);
      setDrawingElementId(null);
      setTool('select');
      return;
    }

    if (isDragging) {
      setIsDragging(false);
      pushHistory(elements);
    }
  };

  // Edit element labels (sticky/text nodes)
  const handleDoubleClick = async (id: string, text?: string) => {
    const el = elements.find(e => e.id === id);
    if (el?.isLocked) return;

    const newText = await prompt('Edit element label:', text || '', 'Edit Label');
    if (newText !== null) {
      const updated = elements.map(el => 
        el.id === id ? { ...el, text: newText } : el
      );
      pushHistory(updated);
    }
  };

  // Keyboard shortcut listener (Undo/Redo/Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          const el = elements.find(e => e.id === selectedElementId);
          if (el && !el.isLocked) {
            const updated = elements.filter(e => e.id !== selectedElementId);
            pushHistory(updated);
            setSelectedElementId(null);
            toast.info('Deleted element');
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, elements, selectedElementId]);

  // Clean Board
  const clearCanvas = async () => {
    const isConfirmed = await confirm('Clear entire whiteboard canvas?', 'Clear Canvas');
    if (isConfirmed) {
      pushHistory([]);
      setSelectedElementId(null);
      toast.success('Canvas cleared');
    }
  };

  // Update selected element property in-place
  const updateSelectedProperty = (key: string, value: any) => {
    if (!selectedElementId) return;
    const updated = elements.map(el => {
      if (el.id === selectedElementId) {
        return { ...el, [key]: value };
      }
      return el;
    });
    pushHistory(updated);
  };

  // Export board as SVG
  const handleExportSvg = () => {
    if (elements.length === 0) {
      toast.error('Canvas is empty');
      return;
    }
    
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 2000" width="100%" height="100%">`;
    svgContent += `<rect width="100%" height="100%" fill="#faf9f6" />`;
    
    elements.forEach(el => {
      const strokeDash = el.strokeStyle === 'dashed' ? 'stroke-dasharray="8 4"' : el.strokeStyle === 'dotted' ? 'stroke-dasharray="2 4"' : '';
      const opacity = el.fillStyle === 'transparent' ? '0' : el.fillStyle === 'semi' ? '0.25' : '1';
      const fillVal = el.fillStyle === 'transparent' ? 'none' : el.fillColor || el.color;

      if (el.type === 'path' && el.points) {
        const d = el.points.reduce((acc, p, idx) => idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
        svgContent += `<path d="${d}" fill="none" stroke="${el.color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />`;
      }
      if (el.type === 'rect') {
        svgContent += `<rect x="${el.x}" y="${el.y}" width="${el.width || 120}" height="${el.height || 90}" fill="${fillVal}" fill-opacity="${opacity}" stroke="${el.color}" stroke-width="${el.strokeWidth || 2}" rx="4" ${strokeDash} />`;
      }
      if (el.type === 'circle') {
        const radius = (el.width || 100) / 2;
        svgContent += `<circle cx="${el.x + radius}" cy="${el.y + radius}" r="${radius}" fill="${fillVal}" fill-opacity="${opacity}" stroke="${el.color}" stroke-width="${el.strokeWidth || 2}" ${strokeDash} />`;
      }
      if (el.type === 'diamond') {
        const w = el.width || 100;
        const h = el.height || 100;
        const d = `M ${el.x + w/2} ${el.y} L ${el.x + w} ${el.y + h/2} L ${el.x + w/2} ${el.y + h} L ${el.x} ${el.y + h/2} Z`;
        svgContent += `<path d="${d}" fill="${fillVal}" fill-opacity="${opacity}" stroke="${el.color}" stroke-width="${el.strokeWidth || 2}" ${strokeDash} />`;
      }
      if (el.type === 'line' && el.points) {
        const [p1, p2] = el.points;
        svgContent += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${el.color}" stroke-width="${el.strokeWidth || 2}" ${strokeDash} />`;
      }
      if (el.type === 'arrow' && el.points) {
        const [p1, p2] = el.points;
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const headLength = 12;
        const arrowAngle = Math.PI / 6;
        const x1 = p2.x - headLength * Math.cos(angle - arrowAngle);
        const y1 = p2.y - headLength * Math.sin(angle - arrowAngle);
        const x2 = p2.x - headLength * Math.cos(angle + arrowAngle);
        const y2 = p2.y - headLength * Math.sin(angle + arrowAngle);
        svgContent += `<path d="M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} M ${x1} ${y1} L ${p2.x} ${p2.y} L ${x2} ${y2}" fill="none" stroke="${el.color}" stroke-width="${el.strokeWidth || 2}" stroke-linecap="round" stroke-linejoin="round" ${strokeDash} />`;
      }
      if (el.type === 'text') {
        svgContent += `<text x="${el.x}" y="${el.y}" fill="${el.color}" font-family="sans-serif" font-size="14" font-weight="bold">${el.text || 'Label'}</text>`;
      }
      if (el.type === 'image') {
        svgContent += `<image href="${el.text}" x="${el.x}" y="${el.y}" width="${el.width || 200}" height="${el.height || 150}" />`;
      }
      if (el.type === 'sticky') {
        svgContent += `<rect x="${el.x}" y="${el.y}" width="${el.width || 150}" height="${el.height || 150}" fill="${el.color}" stroke="rgba(0,0,0,0.06)" stroke-width="1" rx="6" />`;
        svgContent += `<text x="${el.x + 75}" y="${el.y + 75}" fill="#1e293b" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="bold">${el.text || ''}</text>`;
      }
    });

    svgContent += `</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexus-whiteboard-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Whiteboard exported as SVG');
  };

  const selectedElement = selectedElementId ? elements.find(el => el.id === selectedElementId) : null;

  return (
    <div className="flex flex-col h-full w-full bg-[#fbfbfa] dark:bg-[#191919] overflow-hidden text-foreground">
      
      {/* Header Panel */}
      <div className="p-4 border-b border-border bg-card shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Palette className="w-5 h-5 text-muted-foreground" />
            Whiteboard Canvas
          </h1>
          <p className="text-xs text-muted-foreground font-medium">Interactive vector board with panning, zoom, lock selection, custom shapes, and export controls.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportSvg} className="gap-1.5 font-bold">
            <Download className="w-3.5 h-3.5" /> Export SVG
          </Button>
          <Button variant="outline" size="sm" onClick={clearCanvas} className="gap-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 border-red-200 font-bold">
            <Trash2 className="w-3.5 h-3.5" /> Clear Board
          </Button>
        </div>
      </div>

      {/* Primary Whiteboard Panel */}
      <div className="flex-1 relative overflow-hidden flex select-none">
        
        {/* Floating Toolbar (Excalidraw Style) */}
        <div className="absolute left-6 top-6 bg-card border border-border shadow-lg rounded-xl p-2.5 flex flex-col gap-2 z-10 shrink-0 items-center">
          <button
            onClick={() => { setTool('select'); setSelectedElementId(null); }}
            className={cn("p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer", tool === 'select' && "bg-primary/10 text-primary hover:bg-primary/20")}
            title="Select & Move (V)"
          >
            <MousePointer className="w-4 h-4" />
          </button>

          <button
            onClick={() => { setTool('hand'); setSelectedElementId(null); }}
            className={cn("p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer", tool === 'hand' && "bg-primary/10 text-primary hover:bg-primary/20")}
            title="Hand Panning (H)"
          >
            <Hand className="w-4 h-4" />
          </button>
          
          <div className="h-px bg-border w-full my-1" />

          <button
            onClick={() => setTool('rect')}
            className={cn("p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer", tool === 'rect' && "bg-primary/10 text-primary hover:bg-primary/20")}
            title="Rectangle (R)"
          >
            <Square className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setTool('circle')}
            className={cn("p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer", tool === 'circle' && "bg-primary/10 text-primary hover:bg-primary/20")}
            title="Circle (O)"
          >
            <CircleIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => setTool('diamond')}
            className={cn("p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer", tool === 'diamond' && "bg-primary/10 text-primary hover:bg-primary/20")}
            title="Diamond (D)"
          >
            <DiamondIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => setTool('arrow')}
            className={cn("p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer", tool === 'arrow' && "bg-primary/10 text-primary hover:bg-primary/20")}
            title="Arrow (A)"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setTool('line')}
            className={cn("p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer", tool === 'line' && "bg-primary/10 text-primary hover:bg-primary/20")}
            title="Line (L)"
          >
            <Minus className="w-4 h-4" />
          </button>

          <button
            onClick={() => setTool('draw')}
            className={cn("p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer", tool === 'draw' && "bg-primary/10 text-primary hover:bg-primary/20")}
            title="Freehand Pen (P)"
          >
            <Pen className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setTool('sticky')}
            className={cn("p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer", tool === 'sticky' && "bg-primary/10 text-primary hover:bg-primary/20")}
            title="Sticky Note (S)"
          >
            <StickyNote className="w-4 h-4" />
          </button>

          <button
            onClick={() => setTool('text')}
            className={cn("p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer", tool === 'text' && "bg-primary/10 text-primary hover:bg-primary/20")}
            title="Label Text (T)"
          >
            <Type className="w-4 h-4" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
            title="Insert Image (I)"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => setTool('eraser')}
            className={cn("p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer", tool === 'eraser' && "bg-primary/10 text-primary hover:bg-primary/20")}
            title="Eraser (E)"
          >
            <Eraser className="w-4 h-4" />
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
        </div>

        {/* Floating Custom Properties styling config panel */}
        {selectedElement && (
          <div className="absolute right-6 top-6 bg-card border border-border shadow-lg rounded-xl p-4.5 z-10 shrink-0 w-52 flex flex-col gap-4 font-sans text-xs">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Properties</span>
              <button 
                onClick={() => updateSelectedProperty('isLocked', !selectedElement.isLocked)}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={selectedElement.isLocked ? "Unlock Element" : "Lock Element"}
              >
                {selectedElement.isLocked ? <Lock className="w-3.5 h-3.5 text-amber-600" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Colors */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Color Palette:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {COLOR_PALETTE.map((pal, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedColor(pal);
                      updateSelectedProperty('color', pal.strokeHex);
                      updateSelectedProperty('fillColor', pal.hex);
                    }}
                    className={cn(
                      "w-4 h-4 rounded-full border border-border shrink-0 hover:scale-110 transition-transform cursor-pointer",
                      selectedElement.color === pal.strokeHex && "ring-1 ring-primary ring-offset-1 dark:ring-offset-background"
                    )}
                    style={{ backgroundColor: pal.hex }}
                    title={pal.name}
                  />
                ))}
              </div>
            </div>

            {/* Stroke Widths */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Stroke Width:</span>
              <div className="flex gap-1 bg-muted p-0.5 rounded-lg">
                {[
                  { label: 'Thin', val: 2 },
                  { label: 'Medium', val: 4 },
                  { label: 'Thick', val: 8 },
                ].map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => {
                      setCurrentStrokeWidth(opt.val);
                      updateSelectedProperty('strokeWidth', opt.val);
                    }}
                    className={cn(
                      "flex-1 text-[10px] py-1 text-center font-bold rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
                      (selectedElement.strokeWidth || 2) === opt.val && "bg-card text-foreground shadow-xs"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stroke Styles */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Stroke Style:</span>
              <div className="flex gap-1 bg-muted p-0.5 rounded-lg">
                {(['solid', 'dashed', 'dotted'] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => {
                      setCurrentStrokeStyle(opt);
                      updateSelectedProperty('strokeStyle', opt);
                    }}
                    className={cn(
                      "flex-1 text-[10px] py-1 text-center font-bold rounded-md text-muted-foreground hover:text-foreground capitalize transition-colors cursor-pointer",
                      (selectedElement.strokeStyle || 'solid') === opt && "bg-card text-foreground shadow-xs"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Fill Style */}
            {selectedElement.type !== 'line' && selectedElement.type !== 'arrow' && selectedElement.type !== 'path' && selectedElement.type !== 'text' && selectedElement.type !== 'image' && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Fill Style:</span>
                <div className="flex gap-1 bg-muted p-0.5 rounded-lg">
                  {(['transparent', 'semi', 'solid'] as const).map(opt => (
                    <button
                      key={opt}
                      onClick={() => {
                        setCurrentFillStyle(opt);
                        updateSelectedProperty('fillStyle', opt);
                      }}
                      className={cn(
                        "flex-1 text-[10px] py-1 text-center font-bold rounded-md text-muted-foreground hover:text-foreground capitalize transition-colors cursor-pointer",
                        (selectedElement.fillStyle || 'semi') === opt && "bg-card text-foreground shadow-xs"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Floating Zoom, Hand, & History controls (Bottom Left) */}
        <div className="absolute left-6 bottom-6 bg-card border border-border shadow-lg rounded-xl p-2.5 flex items-center gap-3 z-10 font-sans text-xs">
          {/* Zoom controls */}
          <div className="flex items-center gap-1.5 border-r border-border pr-3">
            <button 
              onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))} 
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-bold w-12 text-center text-muted-foreground">{Math.round(zoom * 100)}%</span>
            <button 
              onClick={() => setZoom(prev => Math.min(3, prev + 0.1))} 
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }} 
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer ml-1"
              title="Reset Zoom & Pan"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Undo / Redo controls */}
          <div className="flex items-center gap-1">
            <button 
              onClick={handleUndo} 
              disabled={historyIndex <= 0}
              className="p-1.5 hover:bg-muted disabled:opacity-30 rounded text-muted-foreground hover:text-foreground cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={handleRedo} 
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 hover:bg-muted disabled:opacity-30 rounded text-muted-foreground hover:text-foreground cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* SVG Interactive Drawing Canvas */}
        <svg
          ref={svgRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="flex-1 w-full h-full bg-[#faf9f6] dark:bg-[#1f1f1e]"
          style={{ cursor: tool === 'hand' ? 'grab' : tool === 'select' ? 'default' : 'crosshair' }}
        >
          {/* Grid definition */}
          <defs>
            <pattern id="canvas-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth="1" className="dark:stroke-white/5" />
            </pattern>
          </defs>
          
          {/* Main transformation group container */}
          <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
            
            {/* Infinite grid filling viewport */}
            <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#canvas-grid)" />

            {/* Elements render */}
            {elements.map(el => {
              const isSelected = selectedElementId === el.id;
              const strokeDash = el.strokeStyle === 'dashed' ? '8 4' : el.strokeStyle === 'dotted' ? '2 4' : undefined;
              const opacity = el.fillStyle === 'transparent' ? '0' : el.fillStyle === 'semi' ? '0.25' : '1';
              const fillVal = el.fillStyle === 'transparent' ? 'none' : el.fillColor || el.color;

              // Path element (freehand draw)
              if (el.type === 'path' && el.points) {
                const d = el.points.reduce((acc, p, idx) => idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
                return (
                  <path
                    key={el.id}
                    d={d}
                    fill="none"
                    stroke={el.color}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn("cursor-pointer", isSelected && "stroke-primary")}
                    onClick={(e) => {
                      if (tool === 'select') {
                        e.stopPropagation();
                        setSelectedElementId(el.id);
                      }
                    }}
                  />
                );
              }

              // Rect shapes
              if (el.type === 'rect') {
                return (
                  <g key={el.id}>
                    <rect
                      x={el.x}
                      y={el.y}
                      width={el.width || 120}
                      height={el.height || 90}
                      rx="4"
                      fill={fillVal}
                      fillOpacity={opacity}
                      stroke={isSelected ? '#6366f1' : el.color}
                      strokeWidth={isSelected ? '2.5' : (el.strokeWidth || 2)}
                      strokeDasharray={strokeDash}
                      className="cursor-pointer"
                      onClick={(e) => {
                        if (tool === 'select') {
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                        }
                      }}
                    />
                    {el.isLocked && (
                      <g transform={`translate(${el.x + 6}, ${el.y + 6}) scale(0.6)`}>
                        <rect width="18" height="18" fill="rgba(0,0,0,0.2)" rx="3" />
                        <Lock className="w-3.5 h-3.5 text-amber-600 p-0.5" />
                      </g>
                    )}
                  </g>
                );
              }

              // Circle shapes
              if (el.type === 'circle') {
                const r = (el.width || 100) / 2;
                return (
                  <g key={el.id}>
                    <circle
                      cx={el.x + r}
                      cy={el.y + r}
                      r={r}
                      fill={fillVal}
                      fillOpacity={opacity}
                      stroke={isSelected ? '#6366f1' : el.color}
                      strokeWidth={isSelected ? '2.5' : (el.strokeWidth || 2)}
                      strokeDasharray={strokeDash}
                      className="cursor-pointer"
                      onClick={(e) => {
                        if (tool === 'select') {
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                        }
                      }}
                    />
                    {el.isLocked && (
                      <g transform={`translate(${el.x + r - 9}, ${el.y + 6}) scale(0.6)`}>
                        <rect width="18" height="18" fill="rgba(0,0,0,0.2)" rx="3" />
                        <Lock className="w-3.5 h-3.5 text-amber-600 p-0.5" />
                      </g>
                    )}
                  </g>
                );
              }

              // Diamond shapes
              if (el.type === 'diamond') {
                const w = el.width || 100;
                const h = el.height || 100;
                const d = `M ${el.x + w/2} ${el.y} L ${el.x + w} ${el.y + h/2} L ${el.x + w/2} ${el.y + h} L ${el.x} ${el.y + h/2} Z`;
                return (
                  <g key={el.id}>
                    <path
                      d={d}
                      fill={fillVal}
                      fillOpacity={opacity}
                      stroke={isSelected ? '#6366f1' : el.color}
                      strokeWidth={isSelected ? '2.5' : (el.strokeWidth || 2)}
                      strokeDasharray={strokeDash}
                      className="cursor-pointer"
                      onClick={(e) => {
                        if (tool === 'select') {
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                        }
                      }}
                    />
                    {el.isLocked && (
                      <g transform={`translate(${el.x + w/2 - 9}, ${el.y + 6}) scale(0.6)`}>
                        <rect width="18" height="18" fill="rgba(0,0,0,0.2)" rx="3" />
                        <Lock className="w-3.5 h-3.5 text-amber-600 p-0.5" />
                      </g>
                    )}
                  </g>
                );
              }

              // Straight line shapes
              if (el.type === 'line' && el.points) {
                const [p1, p2] = el.points;
                return (
                  <g key={el.id}>
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={isSelected ? '#6366f1' : el.color}
                      strokeWidth={isSelected ? '2.5' : (el.strokeWidth || 2)}
                      strokeDasharray={strokeDash}
                      className="cursor-pointer"
                      onClick={(e) => {
                        if (tool === 'select') {
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                        }
                      }}
                    />
                  </g>
                );
              }

              // Directional arrows
              if (el.type === 'arrow' && el.points) {
                const [p1, p2] = el.points;
                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                const headLength = 12;
                const arrowAngle = Math.PI / 6;
                const x1 = p2.x - headLength * Math.cos(angle - arrowAngle);
                const y1 = p2.y - headLength * Math.sin(angle - arrowAngle);
                const x2 = p2.x - headLength * Math.cos(angle + arrowAngle);
                const y2 = p2.y - headLength * Math.sin(angle + arrowAngle);
                const d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} M ${x1} ${y1} L ${p2.x} ${p2.y} L ${x2} ${y2}`;
                return (
                  <g key={el.id}>
                    <path
                      d={d}
                      fill="none"
                      stroke={isSelected ? '#6366f1' : el.color}
                      strokeWidth={isSelected ? '2.5' : (el.strokeWidth || 2)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={strokeDash}
                      className="cursor-pointer"
                      onClick={(e) => {
                        if (tool === 'select') {
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                        }
                      }}
                    />
                  </g>
                );
              }

              // Text Labels
              if (el.type === 'text') {
                return (
                  <g key={el.id} onDoubleClick={() => handleDoubleClick(el.id, el.text)}>
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
                      fill={el.color}
                      className="text-sm font-bold cursor-text select-none font-sans"
                      onClick={(e) => {
                        if (tool === 'select') {
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                        }
                      }}
                    >
                      {el.text || 'Label Text'}
                    </text>
                  </g>
                );
              }

              // Local uploaded images
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

              // Sticky Notes
              if (el.type === 'sticky') {
                return (
                  <g key={el.id} onDoubleClick={() => handleDoubleClick(el.id, el.text)}>
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
                      onClick={(e) => {
                        if (tool === 'select') {
                          e.stopPropagation();
                          setSelectedElementId(el.id);
                        }
                      }}
                    />
                    <rect
                      x={el.x}
                      y={el.y}
                      width={el.width || 150}
                      height="12"
                      fill="rgba(0,0,0,0.03)"
                      rx="6"
                    />
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
              }

              return null;
            })}

            {/* Freehand Draw Path Preview */}
            {isDrawing && currentPath.length > 1 && (
              <path
                d={currentPath.reduce((acc, p, idx) => idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '')}
                fill="none"
                stroke={selectedColor.strokeHex}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-70"
              />
            )}

            {/* Render Peer Cursors */}
            {Object.entries(peerCursors).map(([id, cursor]) => (
              <g key={id} transform={`translate(${cursor.x}, ${cursor.y})`} className="pointer-events-none transition-all duration-75">
                <MousePointer className="w-4 h-4 text-indigo-500 fill-indigo-500 shrink-0" />
                <g transform="translate(10, 10)">
                  <rect 
                    width={cursor.name.length * 6 + 12} 
                    height="16" 
                    rx="3" 
                    className="fill-indigo-600 dark:fill-indigo-500 stroke-none" 
                  />
                  <text 
                    x="6" 
                    y="11" 
                    className="fill-white text-[9px] font-bold font-sans select-none"
                  >
                    {cursor.name}
                  </text>
                </g>
              </g>
            ))}

          </g>
        </svg>

        {/* Small tooltips bar */}
        <div className="absolute bottom-6 right-6 bg-card border border-border px-3 py-1.5 shadow-md rounded-lg text-[10px] text-muted-foreground z-10 flex gap-4 font-sans font-bold">
          <span className="flex items-center gap-1.5"><img src="https://www.google.com/s2/favicons?domain=figma.com&sz=32" className="w-3.5 h-3.5 object-contain" alt="" /> Select layout tools & drag on canvas to draw</span>
          <span className="flex items-center gap-1.5"><img src="https://www.google.com/s2/favicons?domain=figma.com&sz=32" className="w-3.5 h-3.5 object-contain" alt="" /> Hold Space & drag to pan canvas around</span>
          <span className="flex items-center gap-1.5"><img src="https://www.google.com/s2/favicons?domain=figma.com&sz=32" className="w-3.5 h-3.5 object-contain" alt="" /> Lock items to freeze position templates</span>
        </div>

      </div>

    </div>
  );
}
