'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useWorkspace } from '@/lib/store';
import { supabase } from '@/lib/supabase';

import dynamic from 'next/dynamic';
import '@excalidraw/excalidraw/index.css';

const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw),
  { ssr: false }
);

export default function WhiteboardPage() {
  const { setActivePage, workspace, user, theme } = useWorkspace();
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [initialElements, setInitialElements] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const channelRef = useRef<any>(null);
  const elementsRef = useRef<any[]>([]);
  const lastBroadcastRef = useRef<string>('');
  const debounceTimeoutRef = useRef<any>(null);

  // Set active page
  useEffect(() => {
    setActivePage('whiteboard');
    
    // Load initial elements on mount from localStorage
    const saved = localStorage.getItem('nexus_whiteboard_elements');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setInitialElements(parsed);
        elementsRef.current = parsed;
        lastBroadcastRef.current = saved;
      } catch (e) {
        console.error('Failed to parse whiteboard elements', e);
      }
    }
    setIsInitialized(true);
  }, [setActivePage]);

  // Sync elements ref for real-time listener access
  const updateElementsRef = (elements: any[]) => {
    elementsRef.current = elements;
  };

  // Realtime Channel Sync
  useEffect(() => {
    if (!workspace || !isInitialized) return;
    
    const channelName = `whiteboard-${workspace.id}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'whiteboard-update' }, ({ payload }) => {
        if (payload && payload.senderId !== user?.id) {
          if (payload.elements && excalidrawAPI) {
            // Apply updates
            excalidrawAPI.updateScene({
              elements: payload.elements
            });
            updateElementsRef(payload.elements);
            localStorage.setItem('nexus_whiteboard_elements', JSON.stringify(payload.elements));
            lastBroadcastRef.current = JSON.stringify(payload.elements);
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
  }, [workspace, user?.id, excalidrawAPI, isInitialized]);

  const broadcastElements = (elementsList: readonly any[]) => {
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

  // Handle changes from Excalidraw
  const onChange = (elements: readonly any[]) => {
    updateElementsRef(elements as any[]);
    const serialize = JSON.stringify(elements);
    localStorage.setItem('nexus_whiteboard_elements', serialize);

    // Debounce broadcasting to Supabase to prevent flooding the channel
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (serialize !== lastBroadcastRef.current) {
        lastBroadcastRef.current = serialize;
        broadcastElements(elements);
      }
    }, 500);
  };

  return (
    <div className="h-full w-full bg-[#fbfbfa] dark:bg-[#191919] overflow-hidden text-foreground">
      {isInitialized && (
        <Excalidraw
          initialData={{
            elements: initialElements,
            appState: { theme }
          }}
          theme={theme}
          onChange={onChange}
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
        />
      )}
    </div>
  );
}
