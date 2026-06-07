'use client';

import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PopupState {
  isOpen: boolean;
  type: 'alert' | 'confirm' | 'prompt';
  title: string;
  message: string;
  defaultValue: string;
  inputValue: string;
}

interface PopupContextType {
  alert: (message: string, title?: string) => Promise<void>;
  confirm: (message: string, title?: string) => Promise<boolean>;
  prompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export function PopupProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PopupState>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    defaultValue: '',
    inputValue: '',
  });

  const resolveRef = useRef<((val?: any) => void) | null>(null);

  const showAlert = (message: string, title = 'Notification') => {
    return new Promise<void>((resolve) => {
      resolveRef.current = resolve;
      setState({
        isOpen: true,
        type: 'alert',
        title,
        message,
        defaultValue: '',
        inputValue: '',
      });
    });
  };

  const showConfirm = (message: string, title = 'Confirm Action') => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        defaultValue: '',
        inputValue: '',
      });
    });
  };

  const showPrompt = (message: string, defaultValue = '', title = 'Input Required') => {
    return new Promise<string | null>((resolve) => {
      resolveRef.current = resolve;
      setState({
        isOpen: true,
        type: 'prompt',
        title,
        message,
        defaultValue,
        inputValue: defaultValue,
      });
    });
  };

  const handleCancel = () => {
    setState((prev) => ({ ...prev, isOpen: false }));
    if (resolveRef.current) {
      if (state.type === 'confirm') resolveRef.current(false);
      else if (state.type === 'prompt') resolveRef.current(null);
      else resolveRef.current();
    }
  };

  const handleOk = () => {
    setState((prev) => ({ ...prev, isOpen: false }));
    if (resolveRef.current) {
      if (state.type === 'confirm') resolveRef.current(true);
      else if (state.type === 'prompt') resolveRef.current(state.inputValue);
      else resolveRef.current();
    }
  };

  return (
    <PopupContext.Provider value={{ alert: showAlert, confirm: showConfirm, prompt: showPrompt }}>
      {children}
      <Dialog open={state.isOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="sm:max-w-md bg-background border border-border shadow-lg rounded-xl p-6 font-sans text-xs">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-sm font-bold text-foreground capitalize">
              {state.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {state.message}
            </DialogDescription>
          </DialogHeader>

          {state.type === 'prompt' && (
            <div className="py-4">
              <Input
                type="text"
                value={state.inputValue}
                onChange={(e) => setState((prev) => ({ ...prev, inputValue: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleOk();
                  }
                }}
                className="w-full text-xs h-9 bg-muted/40 border-border"
                autoFocus
              />
            </div>
          )}

          <DialogFooter className="mt-6 flex items-center justify-end gap-2 sm:space-x-0">
            {state.type !== 'alert' && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="h-8 text-xs font-bold border-border"
              >
                Cancel
              </Button>
            )}
            <Button
              type="button"
              onClick={handleOk}
              className="h-8 text-xs font-bold bg-primary text-primary-foreground hover:opacity-90"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PopupContext.Provider>
  );
}

export function usePopup() {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopup must be used within a PopupProvider');
  }
  return context;
}
