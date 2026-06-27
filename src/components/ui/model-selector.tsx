'use client';

import React from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
import { FREE_MODELS_REGISTRY } from '@/lib/ai/model-registry';

interface ModelSelectorProps {
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  className?: string;
}

export function ModelSelector({ selectedModelId, onModelChange, className = '' }: ModelSelectorProps) {
  const selectedModel = FREE_MODELS_REGISTRY.find(m => m.id === selectedModelId) || FREE_MODELS_REGISTRY[0];

  return (
    <div className={`relative inline-block ${className}`}>
      <div className="flex items-center gap-1.5 bg-zinc-950/40 border border-white/5 hover:border-purple-500/30 transition-all rounded-lg px-2.5 py-1 text-3xs font-semibold text-foreground/75 hover:text-white cursor-pointer relative group">
        <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
        <span className="truncate max-w-[120px]">{selectedModel.name}</span>
        <ChevronDown className="w-3 h-3 text-foreground/40 shrink-0 group-hover:text-foreground/70 transition-colors" />

        {/* Dropdown list */}
        <select
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          value={selectedModelId}
          onChange={(e) => onModelChange(e.target.value)}
        >
          {FREE_MODELS_REGISTRY.map((model) => (
            <option 
              key={model.id} 
              value={model.id}
              className="bg-zinc-900 text-zinc-100 text-xs py-2"
            >
              {model.name} ({model.provider})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
