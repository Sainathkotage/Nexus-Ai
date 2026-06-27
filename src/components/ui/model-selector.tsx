'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ChevronDown, Check } from 'lucide-react';
import { FREE_MODELS_REGISTRY } from '@/lib/ai/model-registry';

interface ModelSelectorProps {
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  className?: string;
}

export function ModelSelector({ selectedModelId, onModelChange, className = '' }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selectedModel = FREE_MODELS_REGISTRY.find(m => m.id === selectedModelId) || FREE_MODELS_REGISTRY[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (modelId: string) => {
    onModelChange(modelId);
    setIsOpen(false);
  };

  // Helper to determine model context limit label
  const getContextLabel = (length: number) => {
    if (length >= 1000000) return `${Math.round(length / 1000000)}M context`;
    return `${Math.round(length / 1000)}K context`;
  };

  // Helper for model capabilities badges
  const getBadgeStyle = (id: string) => {
    if (id.includes('gemini')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (id.includes('llama')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (id.includes('qwen')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-zinc-950/40 border border-white/5 hover:border-purple-500/40 active:bg-zinc-950/80 transition-all rounded-lg px-2.5 py-1 text-3xs font-semibold text-foreground/75 hover:text-white cursor-pointer select-none"
      >
        <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
        <span className="truncate max-w-[120px]">{selectedModel.name}</span>
        <ChevronDown className={`w-3 h-3 text-foreground/40 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Custom Dropdown Option List */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-64 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-1 flex flex-col gap-0.5">
            <div className="px-2 py-1.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
              Select AI Engine
            </div>
            
            {FREE_MODELS_REGISTRY.map((model) => {
              const isSelected = model.id === selectedModelId;
              return (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model.id)}
                  className={`flex items-center justify-between w-full text-left px-2.5 py-2 rounded-lg transition-all ${
                    isSelected 
                      ? 'bg-purple-500/10 border border-purple-500/20 text-white' 
                      : 'border border-transparent hover:bg-white/5 text-zinc-300 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-xs font-semibold tracking-wide">
                      {model.name}
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-0.5 leading-none">
                      {model.provider} • {getContextLabel(model.contextLength)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Capability indicator badge */}
                    <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full border ${getBadgeStyle(model.id)}`}>
                      {model.id.includes('qwen') ? 'Reasoning' : model.id.includes('gemini') ? 'Vision' : 'Text'}
                    </span>
                    
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
