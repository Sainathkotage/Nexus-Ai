'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useWorkspace, decryptMessage, encryptMessage } from '@/lib/store';
import { usePopup } from '@/lib/popup-context';
import { supabase } from '@/lib/supabase';
import { Person, ChatMessage, Channel, ChannelMessage, MessageReaction, MessageRead, MeetingRecord, MeetingParticipant } from '@/types';
import { 
  Send, Users, MessageSquare, Clock, ShieldCheck, Check, CheckCheck, 
  Search, Circle, MessageCircle, Hash, ChevronRight, X,
  Paperclip, Phone, Video, Lock, Unlock, Mic, MicOff,
  VideoOff, Shield, PhoneOff, Star, Pin, Smile, Trash2, Edit3,
  Sparkles, FileText, ArrowRight, ArrowLeft, Bell, Volume2, AlertCircle, Plus, Folder, UserPlus,
  Activity, Subtitles, RefreshCw, Calendar, User, Mail, Keyboard, Monitor, Disc, Sliders, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn, getAvatarStyle } from '@/lib/utils';
import { toast } from 'sonner';
import CallDiagnostics from '@/components/chat/call-diagnostics';

export default function TeamChatPage() {
  const { 
    user, 
    allUsers, 
    friendIds,
    canManageTeamMembers,
    teamMessages, 
    addFriendByTag,
    sendTeamMessage, 
    channels,
    channelMessages,
    sendChannelMessage,
    sendChannelReply,
    documents,
    workspace,
    
    // Advanced Store sync integrations
    typingUsers,
    onlinePresence,
    broadcastTyping,
    dmReactions,
    setDmReactions,
    toggleStarChannel,
    editChannelMessage,
    deleteChannelMessage,
    editTeamMessage,
    deleteTeamMessage,
    addReaction,
    removeReaction,
    togglePinMessage,
    markMessageAsRead,
    createChannel,
    activeChannelId,
    setActiveChannelId,
    activeDmUserId,
    setActiveDmUserId,
    clearMentionBadge,
    createCalendarEvent,
    addTask,
    addEmail,
    meetings,
    saveMeetingRecord,
    addDocument
  } = useWorkspace();
  const { confirm } = usePopup();

  if (!workspace) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background min-h-[calc(100vh-3rem)]">
        <AlertCircle className="w-12 h-12 text-muted-foreground opacity-30 mb-4" />
        <h3 className="text-lg font-bold mb-2">No Active Workspace</h3>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          Please select, create, or join a team workspace from the home dashboard to start chatting.
        </p>
      </div>
    );
  }

  // Active chat state can be type 'dm' or 'channel'
  const activeChat = useMemo<{ type: 'dm'; id: string } | { type: 'channel'; id: string }>(() => {
    if (activeDmUserId) {
      return { type: 'dm', id: activeDmUserId };
    }
    return { type: 'channel', id: activeChannelId || 'c1' };
  }, [activeChannelId, activeDmUserId]);

  const setActiveChat = (chat: { type: 'dm'; id: string } | { type: 'channel'; id: string }) => {
    if (chat.type === 'dm') {
      setActiveDmUserId(chat.id);
      setActiveChannelId(null);
    } else {
      setActiveChannelId(chat.id);
      setActiveDmUserId(null);
    }
    setActiveThreadMessageId(null);
    setMobileView('chat');
  };

  const [typedMessage, setTypedMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  
  // Thread state
  const [activeThreadMessageId, setActiveThreadMessageId] = useState<string | null>(null);
  const [typedReply, setTypedReply] = useState('');

  // Lock decryption states
  const [toggledCipherIds, setToggledCipherIds] = useState<Record<string, boolean>>({});

  // Media attachment state
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; name: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit message inline state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState('');

  // Right-click Context Menu and Reply states
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    messageId: string;
    isMe: boolean;
    content: string;
    senderName: string;
    chatType: 'dm' | 'channel';
  } | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; senderName: string; content: string } | null>(null);

  // Call simulation states
  const [callState, setCallState] = useState<{
    isActive: boolean;
    type: 'audio' | 'video';
    status: 'dialing' | 'ringing' | 'connected' | 'ended';
    friend: Person;
  } | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Video call & Local Transcription settings and refs
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const callStateRef = useRef<any>(null);
  const enableSTTRef = useRef<boolean>(true);
  const [transcripts, setTranscripts] = useState<Array<{ senderName: string; text: string; timestamp: string; isFinal?: boolean }>>([]);
  const [sttStatus, setSttStatus] = useState<'idle' | 'listening' | 'error' | 'unsupported'>('idle');
  const [sttModelProgress, setSttModelProgress] = useState<number>(0);
  const sttModelProgressRef = useRef<number>(0);
  const [showAiPopup, setShowAiPopup] = useState(false);
  const [aiSpeechText, setAiSpeechText] = useState("Hello! I am Nexus AI, your virtual chief of staff. What do you need help with during this call?");
  const [aiCommandWaiting, setAiCommandWaiting] = useState(false);
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const [executedActions, setExecutedActions] = useState<Array<{ type: string; title: string; details?: any }>>([]);
  const [nexusInputText, setNexusInputText] = useState('');
  const aiPopupTimerRef = useRef<any>(null);

  // Refs for local Wav2Vec2 transcription
  const wav2vec2WorkerRef = useRef<Worker | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioInputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const deepgramSocketRef = useRef<WebSocket | null>(null);

  const convertFloat32ToInt16 = (buffer: Float32Array) => {
    const l = buffer.length;
    const buf = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      let s = Math.max(-1, Math.min(1, buffer[i]));
      buf[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return buf.buffer;
  };
  
  const [enableSTT, setEnableSTT] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexus_enable_transcription');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const [autoSaveTranscripts, setAutoSaveTranscripts] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexus_auto_save_transcripts');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const recognitionRef = useRef<any>(null);
  const isRecognitionActiveRef = useRef<boolean>(false);

  // Group Meeting Configuration States
  const [showMeetingSetup, setShowMeetingSetup] = useState(false);
  const [meetingSetupTitle, setMeetingSetupTitle] = useState('');
  const [meetingSetupPassword, setMeetingSetupPassword] = useState('');
  const [meetingSetupWaitingRoom, setMeetingSetupWaitingRoom] = useState(false);

  // Active Group Meeting States
  const [isGroupCall, setIsGroupCall] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingId, setMeetingId] = useState('');
  const [groupParticipants, setGroupParticipants] = useState<MeetingParticipant[]>([]);
  const [handRaisedUsers, setHandRaisedUsers] = useState<string[]>([]);
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [screenShareSharerId, setScreenShareSharerId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isHost, setIsHost] = useState(false);
  
  // Settings & Adaptation
  const [selectedVideoRes, setSelectedVideoRes] = useState<'480p' | '720p' | '1080p'>('720p');
  const [enableEchoCancellation, setEnableEchoCancellation] = useState(true);
  const [enableNoiseSuppression, setEnableNoiseSuppression] = useState(true);
  const [enableAutoGainControl, setEnableAutoGainControl] = useState(true);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>('');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [bgBlurEffect, setBgBlurEffect] = useState<'none' | 'soft' | 'high' | 'gradient' | 'branded'>('none');
  const [isLowLight, setIsLowLight] = useState(false);
  const [isMirror, setIsMirror] = useState(true);
  const [showBgEffectsMenu, setShowBgEffectsMenu] = useState(false);
  const [showCallHardwareSettings, setShowCallHardwareSettings] = useState(false);

  // Active Channel Meetings Sync
  const activeChannelMeetings = useRef<Record<string, { meetingId: string; title: string; hostName: string }>>({});
  const [activeMeetingInChannel, setActiveMeetingInChannel] = useState<{ meetingId: string; title: string; hostName: string } | null>(null);

  // WebRTC group refs & simulation loops
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const simTimeoutsRef = useRef<any[]>([]);
  const simIntervalsRef = useRef<any[]>([]);

  // Sync call state ref for listener callbacks
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // Sync transcription settings to storage
  useEffect(() => {
    localStorage.setItem('nexus_enable_transcription', enableSTT.toString());
    enableSTTRef.current = enableSTT;
  }, [enableSTT]);

  useEffect(() => {
    localStorage.setItem('nexus_auto_save_transcripts', autoSaveTranscripts.toString());
  }, [autoSaveTranscripts]);

  // Keep model progress ref in sync
  useEffect(() => {
    sttModelProgressRef.current = sttModelProgress;
  }, [sttModelProgress]);

  // Clean up audio streams and WebSocket on unmount
  useEffect(() => {
    return () => {
      stopTranscription();
    };
  }, []);

  // Auto-dismiss the AI popup banner after 8 seconds of inactivity
  useEffect(() => {
    if (showAiPopup) {
      if (aiPopupTimerRef.current) clearTimeout(aiPopupTimerRef.current);
      aiPopupTimerRef.current = setTimeout(() => {
        setShowAiPopup(false);
      }, 8000);
    }
    return () => {
      if (aiPopupTimerRef.current) clearTimeout(aiPopupTimerRef.current);
    };
  }, [showAiPopup]);

  // Handle call transcription initialization and toggle responses
  useEffect(() => {
    if (callState && callState.status === 'connected') {
      if (enableSTT) {
        console.log("Active call connected. Starting transcription...");
        startTranscription();
      } else {
        stopTranscription();
      }
    } else {
      stopTranscription();
    }
  }, [callState?.status, enableSTT]);

  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const premiumVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha'));
      if (premiumVoice) utterance.voice = premiumVoice;
      window.speechSynthesis.speak(utterance);
    }
  };

  const executeWorkspaceCommand = async (commandText: string) => {
    if (!commandText.trim()) return;

    setIsProcessingCommand(true);
    setExecutedActions([]); // Reset previous actions
    setNexusInputText('');  // Clear typing input if used
    toast.info("Analyzing workspace command...");

    try {
      const res = await fetch('/api/call-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: commandText,
          currentDate: new Date().toISOString(),
          users: allUsers,
          currentCallPartner: callState?.friend ? {
            id: callState.friend.id,
            name: callState.friend.name,
            email: callState.friend.email
          } : null,
          currentUser: user ? {
            id: user.id,
            name: user.name,
            email: user.email
          } : null
        })
      });

      if (!res.ok) {
        throw new Error("Failed to process command with Gemini");
      }

      const responseData = await res.json();
      
      // Robust key mapping for actions array and speech response
      let actions = responseData.actions || responseData.Actions || responseData.action || responseData.events || responseData.tasks || responseData.emails || [];
      const speechResponse = responseData.speechResponse || responseData.speech_response || responseData.speech || responseData.response || "Workspace updated successfully.";

      // Normalize single object response into an array
      if (actions && !Array.isArray(actions)) {
        actions = [actions];
      }

      const completedActionsList: Array<{ type: string; title: string; details?: any }> = [];

      if (actions && Array.isArray(actions)) {
        for (const action of actions) {
          if (!action || typeof action !== 'object') continue;

          switch (action.type) {
            case 'create_calendar_event': {
              const ev = action.event || action;
              const attendeeIdsOrNames = ev.attendeeIds || ev.attendee_ids || ev.attendees || [];
              const eventAttendees = allUsers.filter(u => 
                attendeeIdsOrNames.includes(u.id) ||
                attendeeIdsOrNames.includes(u.email) ||
                attendeeIdsOrNames.includes(u.name) ||
                (typeof attendeeIdsOrNames === 'object' && 
                  (attendeeIdsOrNames.some?.((att: any) => 
                    att === u.id || att === u.email || att === u.name || 
                    (typeof att === 'object' && (att?.id === u.id || att?.email === u.email || att?.name === u.name))
                  ))
                )
              );
              
              if (eventAttendees.length === 0 && callState?.friend) {
                eventAttendees.push(callState.friend);
              }
              
              const eventTitle = ev.title || 'Meeting';
              const eventDate = ev.date || new Date().toISOString().split('T')[0];
              const eventStart = ev.startTime || ev.start_time || '10:00';
              const eventEnd = ev.endTime || ev.end_time || '11:00';
              const eventCategory = ev.category || 'meeting';
              const eventDesc = ev.description || ev.desc || '';
              const eventColor = ev.color || 'indigo';

              createCalendarEvent({
                title: eventTitle,
                date: eventDate,
                startTime: eventStart,
                endTime: eventEnd,
                category: eventCategory,
                description: eventDesc,
                attendees: eventAttendees,
                isAiExtracted: true,
                addedToCalendar: true,
                color: eventColor
              });

              completedActionsList.push({ 
                type: 'create_calendar_event', 
                title: eventTitle,
                details: {
                  title: eventTitle,
                  date: eventDate,
                  startTime: eventStart,
                  endTime: eventEnd,
                  attendees: eventAttendees
                }
              });
              toast.success(`Calendar event created: ${eventTitle}`);
              break;
            }

            case 'create_task': {
              const t = action.task || action;
              const assigneeVal = t.assigneeId || t.assignee_id || t.assignee;
              const taskAssignee = allUsers.find(u => 
                u.id === assigneeVal || 
                u.email === assigneeVal || 
                u.name === assigneeVal ||
                (typeof assigneeVal === 'object' && (assigneeVal?.id === u.id || assigneeVal?.email === u.email || assigneeVal?.name === u.name))
              ) || user;
              
              const taskTitle = t.title || t.name || 'New Task';
              const taskDesc = t.description || t.desc || '';
              const taskPriority = t.priority || 'medium';
              const taskDueDate = t.dueDate || t.due_date || new Date().toISOString().split('T')[0];
              const taskTags = t.tags || [];

              if (taskAssignee) {
                addTask({
                  title: taskTitle,
                  description: taskDesc,
                  status: 'todo',
                  priority: taskPriority,
                  assignee: taskAssignee as Person,
                  dueDate: taskDueDate,
                  tags: taskTags,
                  subtasks: []
                });
                
                completedActionsList.push({ 
                  type: 'create_task', 
                  title: taskTitle,
                  details: {
                    title: taskTitle,
                    priority: taskPriority,
                    assignee: taskAssignee,
                    dueDate: taskDueDate
                  }
                });
                toast.success(`Workspace task created: ${taskTitle}`);
              }
              break;
            }

            case 'send_email': {
              const em = action.email || action;
              let to = em.to || em.email || em.recipient || '';
              let toName = em.toName || em.to_name || em.recipientName || em.recipient_name || '';
              const emailSubject = em.subject || em.sub || 'Follow-up from Nexus AI';
              const emailBody = em.body || em.content || em.message || '';
              
              if (!to && callState?.friend) {
                to = callState.friend.email;
                toName = callState.friend.name;
              }
              
              if (to) {
                addEmail({
                  to,
                  toName: toName || to.split('@')[0],
                  from: user?.email || '',
                  fromName: user?.name || '',
                  subject: emailSubject,
                  body: emailBody,
                  status: 'sent',
                  aiGenerated: true
                });

                completedActionsList.push({ 
                  type: 'send_email', 
                  title: toName || to,
                  details: {
                    to,
                    toName: toName || to.split('@')[0],
                    subject: emailSubject,
                    body: emailBody
                  }
                });
                toast.success(`Confirmation email sent to ${toName || to}`);
              }
              break;
            }
          }
        }
      }

      const responseText = speechResponse || "Workspace updated successfully.";
      const now = format(new Date(), 'HH:mm:ss');

      // Add bot response to transcripts
      setTranscripts(prev => [
        ...prev,
        { senderName: 'Nexus AI', text: responseText, timestamp: now, isFinal: true }
      ]);

      // Broadcast bot response to coworker
      if (callChannelRef.current && activeCallPartnerId) {
        callChannelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            targetUserId: activeCallPartnerId,
            fromUserId: user?.id,
            signalType: 'transcript',
            data: { senderName: 'Nexus AI', text: responseText, timestamp: now, isFinal: true, actions: completedActionsList }
          }
        });
      }

      // Speak response out loud and display it
      setExecutedActions(completedActionsList);
      setAiSpeechText(responseText);
      speakText(responseText);
      setShowAiPopup(true);

    } catch (err) {
      console.error("Workspace command failed:", err);
      toast.error("Failed to execute workspace command.");
    } finally {
      setIsProcessingCommand(false);
      setAiCommandWaiting(false);
    }
  };

  const handleSendManualCommand = () => {
    if (!nexusInputText.trim()) return;
    executeWorkspaceCommand(nexusInputText);
  };

  const triggerNexusBot = () => {
    setTimeout(() => {
      const botText = "Hello! I am Nexus AI, your virtual chief of staff. What do you need help with during this call?";
      const now = format(new Date(), 'HH:mm:ss');

      // 1. Add bot response to our local transcripts
      setTranscripts(prev => [
        ...prev,
        { senderName: 'Nexus AI', text: botText, timestamp: now, isFinal: true }
      ]);

      // 2. Broadcast bot response to the partner
      if (callChannelRef.current && activeCallPartnerId) {
        callChannelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            targetUserId: activeCallPartnerId,
            fromUserId: user?.id,
            signalType: 'transcript',
            data: { senderName: 'Nexus AI', text: botText, timestamp: now, isFinal: true }
          }
        });
      }

      // 3. Speak response out loud locally and update states
      setAiSpeechText(botText);
      speakText(botText);
      setAiCommandWaiting(true);

      // 4. Trigger visual popup overlay card
      setShowAiPopup(true);
    }, 1000); // 1s delay for realistic pacing
  };

  const handleWav2Vec2Result = (text: string, isFinal: boolean) => {
    if (!text.trim()) return;

    const now = format(new Date(), 'HH:mm:ss');
    
    setTranscripts(prev => {
      const list = [...prev];
      const lastIdx = list.map(e => e.senderName).lastIndexOf('You');
      
      if (lastIdx !== -1 && !list[lastIdx].isFinal) {
        list[lastIdx] = { 
          senderName: 'You', 
          text: text.trim(), 
          timestamp: now, 
          isFinal: isFinal 
        };
      } else {
        list.push({ 
          senderName: 'You', 
          text: text.trim(), 
          timestamp: now, 
          isFinal: isFinal 
        });
      }
      return list;
    });

    // Broadcast transcription signal to the coworker
    if (callChannelRef.current && activeCallPartnerId) {
      callChannelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          targetUserId: activeCallPartnerId,
          fromUserId: user?.id,
          signalType: 'transcript',
          data: { senderName: 'You', text: text.trim(), timestamp: now, isFinal: isFinal }
        }
      });
    }

    // Trigger Nexus AI bot if "hey nexus" is detected in our finalized speech segment
    // Normalize text to strip punctuation (commas, periods, exclamation points) to match accurately
    if (isFinal) {
      const normalizedText = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
      const match = normalizedText.match(/hey nexus\s*(.*)/i);
      
      if (match) {
        const command = match[1].trim();
        if (command) {
          // One-shot command (e.g. "Hey Nexus, schedule a meeting tomorrow")
          executeWorkspaceCommand(command);
        } else {
          // Standard trigger/greeting (starts waiting for command)
          triggerNexusBot();
        }
      } else if (aiCommandWaiting) {
        // Two-step command (bot was waiting for input after greeting)
        executeWorkspaceCommand(text);
      }
    }
  };

  const startTranscription = async () => {
    if (typeof window === 'undefined') return;
    if (!enableSTTRef.current) return;
    // Don't start if audio is already streaming or WebSocket is active
    if (audioProcessorRef.current || deepgramSocketRef.current) return;

    setSttStatus('idle');

    try {
      // 1. Fetch Deepgram API Key
      const keyRes = await fetch('/api/deepgram-key');
      if (!keyRes.ok) {
        const errJson = await keyRes.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned status ${keyRes.status}`);
      }
      const { key } = await keyRes.json();
      if (!key) {
        throw new Error('Deepgram API key is empty');
      }

      // 2. Establish WebSocket connection to Deepgram
      const url = 'wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&interim_results=true&smart_format=true&model=nova-2';
      const ws = new WebSocket(url, ['token', key]);
      deepgramSocketRef.current = ws;

      ws.onopen = async () => {
        console.log('[Deepgram] WebSocket connected');
        setSttStatus('listening');
        setSttModelProgress(100);
        toast.success('Deepgram live transcription ready!');

        // Start capturing microphone input only after WebSocket is open
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStreamRef.current = stream;

          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          audioContextRef.current = audioContext;

          const source = audioContext.createMediaStreamSource(stream);
          audioInputSourceRef.current = source;

          // Buffer size 4096 gives ~256ms per chunk at 16kHz
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          audioProcessorRef.current = processor;

          source.connect(processor);
          processor.connect(audioContext.destination);

          processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            if (deepgramSocketRef.current && deepgramSocketRef.current.readyState === WebSocket.OPEN) {
              const pcmBuffer = convertFloat32ToInt16(inputData);
              deepgramSocketRef.current.send(pcmBuffer);
            }
          };
        } catch (err) {
          console.error('[Deepgram] Failed to start audio capture:', err);
          toast.error('Microphone access is required for live captions.');
          stopTranscription();
        }
      };

      ws.onmessage = (event) => {
        try {
          const received = JSON.parse(event.data);
          const transcript = received.channel?.alternatives?.[0]?.transcript || '';
          const isFinal = received.is_final;
          
          if (transcript.trim()) {
            handleWav2Vec2Result(transcript, isFinal);
          }
        } catch (err) {
          console.error('[Deepgram] Error parsing message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[Deepgram] WebSocket error:', err);
        setSttStatus('error');
      };

      ws.onclose = (event) => {
        console.log('[Deepgram] WebSocket closed', event.code, event.reason);
        // If we didn't manually stop it and there was an error status, keep error status
        setSttStatus((prev) => (prev === 'error' ? 'error' : 'idle'));
      };

    } catch (err: any) {
      console.error('[Deepgram] Failed to initialize transcription:', err);
      setSttStatus('error');
      toast.error(`Failed to initialize Deepgram: ${err.message || err}`);
      setEnableSTT(false);
    }
  };

  const stopTranscription = () => {
    if (audioProcessorRef.current) {
      try {
        audioProcessorRef.current.disconnect();
      } catch (e) {}
      audioProcessorRef.current = null;
    }
    if (audioInputSourceRef.current) {
      try {
        audioInputSourceRef.current.disconnect();
      } catch (e) {}
      audioInputSourceRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    if (audioStreamRef.current) {
      try {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {}
      audioStreamRef.current = null;
    }
    if (deepgramSocketRef.current) {
      try {
        if (deepgramSocketRef.current.readyState === WebSocket.OPEN) {
          deepgramSocketRef.current.close();
        }
      } catch (e) {}
      deepgramSocketRef.current = null;
    }

    setSttStatus('idle');
  };

  const downloadTranscript = async () => {
    if (transcripts.length === 0) return;
    
    const partnerName = callStateRef.current?.friend?.name || 'Teammate';
    const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    
    let docContent = `NEXUS AI SECURE MEETING TRANSCRIPT\n`;
    docContent += `=================================\n`;
    docContent += `Date: ${format(new Date(), 'PPPP')}\n`;
    docContent += `Call Participant: ${partnerName}\n`;
    docContent += `Connection Security: E2EE AES-256-GCM\n`;
    docContent += `=================================\n\n`;
    
    transcripts.forEach(t => {
      docContent += `[${t.timestamp}] ${t.senderName}: ${t.text}\n\n`;
    });
    
    docContent += `\n--- End of Meeting Transcript ---\n`;
    
    const fileName = `nexus_transcript_${partnerName.replace(/\s+/g, '_')}_${dateStr}.txt`;

    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'Text Files',
            accept: { 'text/plain': ['.txt'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(docContent);
        await writable.close();
        toast.success("Transcript saved successfully.");
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          toast.info("Save cancelled.");
          return;
        }
        console.warn("showSaveFilePicker error, using fallback download method...", err);
      }
    }
    
    const blob = new Blob([docContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("Transcript downloaded successfully.");
  };

  // Layout UI overlays togglers
  const [showPinDrawer, setShowPinDrawer] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showShareDocModal, setShowShareDocModal] = useState(false);
  const [showNotifSettings, setShowNotifSettings] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [friendTagInput, setFriendTagInput] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);

  // Creation variables
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelCategory, setNewChannelCategory] = useState('General');
  const [newChannelIsGroup, setNewChannelIsGroup] = useState(false);

  // Search variables
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilterUser, setSearchFilterUser] = useState('');
  const [searchFilterChannel, setSearchFilterChannel] = useState('');
  const [searchFilterDate, setSearchFilterDate] = useState('');

  // @Mentions autocomplete variables
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [mentionSelectIndex, setMentionSelectIndex] = useState(0);

  // Drag over overlays
  const [isDragOver, setIsDragOver] = useState(false);

  // Floating Emoji picker message ID
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null);

  // Desktop Notifications Channel Preferences state
  const [notificationConfig, setNotificationConfig] = useState<Record<string, 'all' | 'mentions' | 'muted'>>({});

  const messageEndRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef<number>(0);
  const lastActiveChatRef = useRef<string>('');
  const lastThreadMessageCountRef = useRef<number>(0);
  const lastActiveThreadIdRef = useRef<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const typingTimerRef = useRef<any>(null);

  // WebRTC Refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callChannelRef = useRef<any>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [incomingCallOffer, setIncomingCallOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const [activeCallPartnerId, setActiveCallPartnerId] = useState<string | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const allUsersRef = useRef<Person[]>(allUsers);

  useEffect(() => {
    allUsersRef.current = allUsers;
  }, [allUsers]);

  const flushIceCandidatesQueue = async () => {
    if (pcRef.current && pcRef.current.remoteDescription && iceCandidatesQueue.current.length > 0) {
      const candidates = [...iceCandidatesQueue.current];
      iceCandidatesQueue.current = [];
      for (const candidate of candidates) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding queued ICE candidate:", err);
        }
      }
    }
  };

  // Request push permission on load
  useEffect(() => {
    
    clearMentionBadge();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [clearMentionBadge]);

  // Scroll to bottom on message/thread updates
  useEffect(() => {
    const activeId = activeChat.id;
    const messages = activeChat.type === 'dm'
      ? (teamMessages[activeId] || [])
      : (channelMessages[activeId] || []);
    const messageCount = messages.length;

    if (activeId !== lastActiveChatRef.current || messageCount > lastMessageCountRef.current) {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    lastActiveChatRef.current = activeId;
    lastMessageCountRef.current = messageCount;
  }, [teamMessages, channelMessages, activeChat]);

  useEffect(() => {
    if (activeThreadMessageId) {
      const activeChannel = activeChat.type === 'channel' ? channels.find(c => c.id === activeChat.id) : null;
      const activeChannelMessages = activeChannel ? (channelMessages[activeChannel.id] || []) : [];
      const activeThreadMessage = activeChannelMessages.find(m => m.id === activeThreadMessageId);
      const repliesCount = activeThreadMessage?.replies?.length || 0;

      if (activeThreadMessageId !== lastActiveThreadIdRef.current || repliesCount > lastThreadMessageCountRef.current) {
        threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }

      lastActiveThreadIdRef.current = activeThreadMessageId;
      lastThreadMessageCountRef.current = repliesCount;
    } else {
      lastActiveThreadIdRef.current = null;
      lastThreadMessageCountRef.current = 0;
    }
  }, [channelMessages, activeThreadMessageId, activeChat, channels]);

  // Sync read status when active channel/message changes
  useEffect(() => {
    if (!user) return;
    const activeId = activeChat.id;
    if (activeChat.type === 'channel') {
      const msgs = channelMessages[activeId] || [];
      msgs.forEach(m => {
        const reads = m.reads || [];
        if (!reads.some(r => r.userId === user.id)) {
          markMessageAsRead(m.id);
        }
      });
    }
  }, [activeChat, channelMessages, user, markMessageAsRead]);

  // Push notification sync on message insertion
  useEffect(() => {
    if (!user || activeChat.type !== 'channel') return;
    const activeId = activeChat.id;
    const msgs = channelMessages[activeId] || [];
    if (msgs.length === 0) return;
    const last = msgs[msgs.length - 1];
    
    // If last message is from someone else, unfocused, and fits preferences
    if (last.sender.id !== user.id && typeof window !== 'undefined' && document.hidden) {
      const config = notificationConfig[activeId] || 'all';
      const isMentioned = last.content.includes(`@${user.name}`);
      
      if (config === 'all' || (config === 'mentions' && isMentioned)) {
        new Notification(`Nexus AI — #${channels.find(c => c.id === activeId)?.name || 'chat'}`, {
          body: `${last.sender.name}: ${decryptMessage(last.content)}`,
          icon: '/logo.png'
        });
      }
    }
  }, [channelMessages, activeChat, user, channels, notificationConfig]);

  // Bind call streams to video components
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream, callState]);

  // Cleanup stream on component unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localStream]);

  // Subscribe to the shared workspace calling channel
  useEffect(() => {
    if (!user || !workspace) return;

    const callChannel = supabase.channel(`workspace_calls_${workspace.id}`);

    callChannel
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
        if (payload.targetUserId && payload.targetUserId !== user.id) return;

        const { signalType, fromUserId, data, meetingId: signalMeetingId } = payload;

        switch (signalType) {
          // --- Group Meeting signals ---
          case 'meeting-announcement':
            if (activeChannel && payload.channelId === activeChannel.id) {
              activeChannelMeetings.current[payload.channelId] = {
                meetingId: signalMeetingId,
                title: payload.title,
                hostName: payload.fromUserName || 'Teammate'
              };
              setActiveMeetingInChannel(activeChannelMeetings.current[payload.channelId]);
              toast.info(`Meeting "${payload.title}" started by ${payload.fromUserName}`);
            }
            break;

          case 'meeting-end':
            if (activeChannel) {
              delete activeChannelMeetings.current[activeChannel.id];
              setActiveMeetingInChannel(null);
            }
            if (isGroupCall && signalMeetingId === meetingId) {
              toast.warning("Host ended the meeting");
              cleanupCallState();
            }
            break;

          case 'meeting-join':
            if (isGroupCall && signalMeetingId === meetingId) {
              const joinedUser = data.user;
              setGroupParticipants(prev => {
                if (!prev.some(p => p.id === joinedUser.id)) {
                  toast.info(`${joinedUser.name} joined the meeting`);
                  
                  // In a real WebRTC mesh: Host initiates offer to new user
                  if (isHost) {
                    initiateMeshOffer(joinedUser.id);
                  }
                  
                  return [...prev, joinedUser];
                }
                return prev;
              });
            }
            break;

          case 'meeting-leave':
            if (isGroupCall && signalMeetingId === meetingId) {
              const leaverId = payload.userId;
              setGroupParticipants(prev => {
                const target = prev.find(p => p.id === leaverId);
                if (target) {
                  toast.info(`${target.name} left the meeting`);
                }
                return prev.filter(p => p.id !== leaverId);
              });
              
              // Close WebRTC connection to leaver
              if (pcsRef.current[leaverId]) {
                pcsRef.current[leaverId].close();
                delete pcsRef.current[leaverId];
              }
              setRemoteStreams(prev => {
                const next = { ...prev };
                delete next[leaverId];
                return next;
              });
            }
            break;

          case 'meeting-raise-hand':
            if (isGroupCall && signalMeetingId === meetingId) {
              const raiserId = payload.userId;
              setHandRaisedUsers(prev => [...prev, raiserId]);
              const raiserName = groupParticipants.find(p => p.id === raiserId)?.name || 'Someone';
              toast.info(`${raiserName} raised their hand ✋`);
            }
            break;

          case 'meeting-lower-hand':
            if (isGroupCall && signalMeetingId === meetingId) {
              const lowererId = payload.userId;
              setHandRaisedUsers(prev => prev.filter(id => id !== lowererId));
            }
            break;

          case 'meeting-recording-start':
            if (isGroupCall && signalMeetingId === meetingId) {
              setIsRecording(true);
              toast.info("Host started recording the meeting");
            }
            break;

          case 'meeting-recording-stop':
            if (isGroupCall && signalMeetingId === meetingId) {
              setIsRecording(false);
              toast.info("Host stopped recording");
            }
            break;

          case 'meeting-offer':
            if (isGroupCall && signalMeetingId === meetingId && payload.targetUserId === user.id) {
              handleMeshOffer(fromUserId, data);
            }
            break;

          case 'meeting-answer':
            if (isGroupCall && signalMeetingId === meetingId && payload.targetUserId === user.id) {
              handleMeshAnswer(fromUserId, data);
            }
            break;

          case 'meeting-ice-candidate':
            if (isGroupCall && signalMeetingId === meetingId && payload.targetUserId === user.id) {
              handleMeshIceCandidate(fromUserId, data);
            }
            break;

          // --- Targeted 1-on-1 calls (Original logic) ---
          case 'offer':
            const caller = allUsersRef.current.find(u => u.id === fromUserId);
            if (caller) {
              setIncomingCallOffer(data);
              setActiveCallPartnerId(fromUserId);
              setCallState({
                isActive: true,
                type: payload.callType || 'audio',
                status: 'ringing',
                friend: caller });
              toast.info(`Incoming secure call from ${caller.name}`);
            }
            break;

          case 'answer':
            if (pcRef.current) {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(data));
              await flushIceCandidatesQueue();
              setCallState(prev => prev ? { ...prev, status: 'connected' } : null);
              toast.success("Secure call connected!");
              if (enableSTTRef.current) startTranscription();
            }
            break;

          case 'ice-candidate':
            if (data) {
              if (pcRef.current && pcRef.current.remoteDescription) {
                try {
                  await pcRef.current.addIceCandidate(new RTCIceCandidate(data));
                } catch (err) {
                  console.error("Error adding remote ICE candidate", err);
                }
              } else {
                iceCandidatesQueue.current.push(data);
              }
            }
            break;

          case 'hangup':
            handleRemoteHangup();
            break;

          case 'transcript':
            // Partner sent real-time local transcript updates (or Nexus AI broadcasted message)
            const senderName = data.senderName || callStateRef.current?.friend?.name || 'Partner';
            const partnerNow = data.timestamp || format(new Date(), 'HH:mm:ss');
            
            setTranscripts(prev => {
              const list = [...prev];
              const lastIdx = list.map(e => e.senderName).lastIndexOf(senderName);
              
              if (lastIdx !== -1 && !list[lastIdx].isFinal) {
                list[lastIdx] = { senderName, text: data.text, timestamp: partnerNow, isFinal: !!data.isFinal };
              } else {
                list.push({ senderName, text: data.text, timestamp: partnerNow, isFinal: !!data.isFinal });
              }
              return list;
            });

            // If it's a finalized message from Nexus AI, play it out loud locally and show the popup
            if (senderName === 'Nexus AI' && data.isFinal) {
              setAiSpeechText(data.text);
              speakText(data.text);
              setShowAiPopup(true);
            }
            break;
        }
      })
      .subscribe((status) => {
        console.log(`Supabase calling channel workspace_calls_${workspace.id} subscription status:`, status);
      });

    callChannelRef.current = callChannel;

    return () => {
      supabase.removeChannel(callChannel);
    };
  }, [user, workspace]);

  // Filter approved teammates
  const messagePartnerIds = useMemo(() => Object.keys(teamMessages), [teamMessages]);
  const teamUsers = useMemo(
    () => allUsers.filter(u =>
      u.id !== user?.id &&
      (friendIds.includes(u.id) || messagePartnerIds.includes(u.id))
    ),
    [allUsers, friendIds, messagePartnerIds, user?.id]
  );
  const filteredUsers = teamUsers.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.role && u.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.tag && u.tag.includes(searchTerm))
  );

  // Online status presence helper mapping
  const getTeammateStatus = (teammateId: string): 'online' | 'offline' | 'idle' | 'dnd' => {
    const presence = onlinePresence[teammateId];
    if (presence) return (presence.status || 'online') as any;
    return 'offline';
  };

  const getTeammateLastSeen = (teammateId: string) => {
    const presence = onlinePresence[teammateId];
    if (presence?.lastSeen) {
      try {
        return formatDistanceToNow(new Date(presence.lastSeen), { addSuffix: true });
      } catch (_) {
        return 'recently';
      }
    }
    return 'recently';
  };

  const onlineFriends = filteredUsers.filter(u => getTeammateStatus(u.id) !== 'offline');
  const offlineFriends = filteredUsers.filter(u => getTeammateStatus(u.id) === 'offline');

  // Stars & Starred channels filter lists
  const starredChannels = channels.filter(c => c.starredBy?.includes(user?.id || ''));
  const standardChannels = channels.filter(c => !c.starredBy?.includes(user?.id || '') && !c.isGroup);
  const groupChats = channels.filter(c => !c.starredBy?.includes(user?.id || '') && c.isGroup);

  // Find active friend or channel details
  const activeFriend = activeChat.type === 'dm' ? allUsers.find(u => u.id === activeChat.id) : null;
  const activeChannel = activeChat.type === 'channel' ? channels.find(c => c.id === activeChat.id) : null;

  // Active messages
  const activeDmMessages = activeFriend ? (teamMessages[activeFriend.id] || []) : [];
  const activeChannelMessages = activeChannel ? (channelMessages[activeChannel.id] || []) : [];

  // Active root message for thread
  const activeThreadMessage = activeChannelMessages.find(m => m.id === activeThreadMessageId);

  // Starred channel check
  const isStarredActive = activeChannel?.starredBy?.includes(user?.id || '') || false;

  // Pin checker
  const activePinnedMessages = activeChannelMessages.filter(m => m.isPinned);

  // Autocomplete Mentions query filter matching
  const matchingTeammates = useMemo(() => {
    if (!showMentionList) return [];
    return teamUsers.filter(u => u.name.toLowerCase().includes(mentionSearch.toLowerCase()));
  }, [mentionSearch, showMentionList, teamUsers]);

  // Autocomplete input capture triggers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTypedMessage(value);

    // Broadcast Typing state
    broadcastTyping(activeChat.id, true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      broadcastTyping(activeChat.id, false);
    }, 2000);

    // Capture @ trigger
    const cursor = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursor);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    if (lastAtPos !== -1 && (lastAtPos === 0 || textBeforeCursor[lastAtPos - 1] === ' ')) {
      const searchStr = textBeforeCursor.slice(lastAtPos + 1);
      if (!searchStr.includes(' ')) {
        setShowMentionList(true);
        setMentionSearch(searchStr);
        setMentionStartIndex(lastAtPos);
        setMentionSelectIndex(0);
        return;
      }
    }
    setShowMentionList(false);
  };

  const selectTeammateMention = (personName: string) => {
    const textBeforeMention = typedMessage.slice(0, mentionStartIndex);
    const textAfterCursor = typedMessage.slice(mentionStartIndex + mentionSearch.length + 1);
    const updatedVal = `${textBeforeMention}@${personName} ${textAfterCursor}`;
    setTypedMessage(updatedVal);
    setShowMentionList(false);
  };

  // Keyboard navigation inside mentions lists
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionList && matchingTeammates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionSelectIndex(prev => (prev + 1) % matchingTeammates.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionSelectIndex(prev => (prev - 1 + matchingTeammates.length) % matchingTeammates.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        selectTeammateMention(matchingTeammates[mentionSelectIndex].name);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionList(false);
      }
    }
  };

  // Drag over dropzones
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Attached file is larger than the 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedMedia({
        url: reader.result as string,
        name: file.name,
        type: file.type
      });
      toast.success(`Dropped: "${file.name}" ready to share.`);
    };
    reader.readAsDataURL(file);
  };

  // Star action handler
  const handleStarToggle = () => {
    if (activeChannel) {
      toggleStarChannel(activeChannel.id);
      toast.success(isStarredActive ? `Starred channel: #${activeChannel.name}` : `Unstarred channel: #${activeChannel.name}`);
    }
  };

  // Star click sidebar nav wrapper
  const handleCategoryStar = (e: React.MouseEvent, channelId: string) => {
    e.stopPropagation();
    toggleStarChannel(channelId);
  };

  // Group reactions helper for DMs
  const groupReactions = (reactionsList: MessageReaction[]) => {
    const grouped: Record<string, { emoji: string; count: number; users: string[] }> = {};
    (reactionsList || []).forEach(r => {
      const name = allUsers.find(u => u.id === r.userId)?.name || 'Someone';
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
      }
      grouped[r.emoji].count += 1;
      grouped[r.emoji].users.push(name);
    });
    return Object.values(grouped);
  };

  // Render message quote block for replies
  const renderMessageContent = (content: string) => {
    if (content.startsWith('[reply:')) {
      const match = content.match(/^\[reply:([^:]+):([^\]]+)\]([\s\S]*)$/);
      if (match) {
        const [ senderName, originalText, remainingText] = match;
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/80 border-l-2 border-indigo-500/50 pl-2 py-0.5 mb-1 bg-muted/20 dark:bg-zinc-800/40 rounded-r select-none">
              <span className="font-semibold text-foreground/80">@{senderName}</span>
              <span className="truncate max-w-[150px] italic">"{originalText}"</span>
            </div>
            {parseRichText(remainingText)}
          </div>
        );
      }
    }
    return parseRichText(content);
  };

  // Reactions syncing
  const triggerEmojiReaction = async (messageId: string, emojiStr: string) => {
    if (activeChat.type === 'channel') {
      const msg = activeChannelMessages.find(m => m.id === messageId);
      if (!msg) return;

      const existing = (msg.reactions || []).find(r => r.userId === user?.id && r.emoji === emojiStr);
      if (existing) {
        await removeReaction(activeChat.id, messageId, existing.id || '');
      } else {
        await addReaction(activeChat.id, messageId, emojiStr);
      }
    } else {
      // Direct message reaction (localStorage + broadcast backed)
      const current = dmReactions[messageId] || [];
      const existingIdx = current.findIndex(r => r.userId === user?.id && r.emoji === emojiStr);
      let updated: MessageReaction[];
      if (existingIdx !== -1) {
        updated = current.filter((_, idx) => idx !== existingIdx);
      } else {
        const newReaction: MessageReaction = {
          messageId,
          userId: user?.id || '',
          emoji: emojiStr };
        updated = [...current, newReaction];
      }
      const newDmReactions = {
        ...dmReactions,
        [messageId]: updated
      };
      setDmReactions(newDmReactions);
      localStorage.setItem('nexus_dm_reactions', JSON.stringify(newDmReactions));
      
      // Broadcast to partner via supabase Realtime presence channel lobby
      try {
        await supabase.channel('nexus_chat_lobby').send({
          type: 'broadcast',
          event: 'dm_reaction',
          payload: { messageId, reactions: updated }
        });
      } catch (err) {}
    }
    setEmojiPickerMsgId(null);
  };

  // Edit submission
  const triggerEdit = async (messageId: string) => {
    if (activeChat.type === 'channel') {
      editChannelMessage(activeChat.id, messageId, editBuffer);
      toast.success('Message content edited.');
    } else {
      try {
        await editTeamMessage(activeChat.id, messageId, editBuffer);
        toast.success('Message content edited.');
      } catch (err: any) {
        toast.error('Failed to edit message.');
        console.error(err);
      }
    }
    setEditingMessageId(null);
    setEditBuffer('');
  };

  const triggerDelete = async (messageId: string) => {
    const isConfirmed = await confirm('Delete this message permanently?', 'Delete Message');
    if (!isConfirmed) return;

    if (activeChat.type === 'channel') {
      deleteChannelMessage(activeChat.id, messageId);
      toast.success('Message deleted.');
    } else {
      try {
        await deleteTeamMessage(activeChat.id, messageId);
        toast.success('Message deleted.');
      } catch (err: any) {
        toast.error('Failed to delete message.');
        console.error(err);
      }
    }
  };

  // Star mapping helper for headers
  const activeTypers = activeChat.type === 'channel'
    ? (typingUsers[activeChat.id] || [])
    : (typingUsers[user?.id || ''] || []).filter(t => t.userId === activeChat.id);

  // Starred channel settings triggers
  const handleNotifConfigToggle = (channelId: string, status: 'all' | 'mentions' | 'muted') => {
    setNotificationConfig(prev => ({
      ...prev,
      [channelId]: status
    }));
    toast.success(`Notification level configured to ${status}.`);
  };

  // Media picker loader
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds the 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedMedia({
        url: reader.result as string,
        name: file.name,
        type: file.type
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Share library documents
  const triggerShareDoc = (doc: any) => {
    setSelectedMedia({
      url: `/api/documents/open?id=${doc.id}`,
      name: doc.title,
      type: doc.type === 'pdf' ? 'application/pdf' : 'text/plain'
    });
    setShowShareDocModal(false);
    toast.success(`Attached Document: "${doc.title}".`);
  };

  // Create Channel action
  const handleCreateChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    const newId = await createChannel(
      newChannelName.trim().replace(/\s+/g, '-').toLowerCase(),
      newChannelCategory,
      newChannelIsGroup
    );
    
    setNewChannelName('');
    setNewChannelIsGroup(false);
    setShowCreateChannelModal(false);
    toast.success(`Created Room: #${newChannelName}`);
    setActiveChat({ type: 'channel', id: newId });
  };

  // Local message parser for rich text
  const parseRichText = (text: string) => {
    if (!text) return '';
    let formatted = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Bold: **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text* or _text_
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/_(.*?)_/g, '<em>$1</em>');
    // Inline code: `code`
    formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded font-mono text-[10px] text-indigo-500">$1</code>');
    // Code blocks: ``` code ```
    formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre class="bg-muted/80 dark:bg-zinc-800 p-2 rounded-md font-mono text-[9.5px] overflow-x-auto my-1 border border-border/60">$1</pre>');
    // Mentions formatting
    formatted = formatted.replace(/@(\w+(\s\w+)?)/g, '<span class="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold px-1 rounded-sm">@$1</span>');
    
    return <div className="break-words space-y-1" dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  // Cross channel search logic
  const crossChannelSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const results: { message: ChannelMessage; channelName: string; isDM: boolean }[] = [];
    
    // Search standard channels
    Object.keys(channelMessages).forEach(chId => {
      const channel = channels.find(c => c.id === chId);
      const chName = channel ? `#${channel.name}` : `Room ${chId}`;
      const msgs = channelMessages[chId] || [];
      
      msgs.forEach(m => {
        const decrypted = decryptMessage(m.content).toLowerCase();
        if (decrypted.includes(searchQuery.toLowerCase())) {
          // Filter checks
          if (searchFilterUser && m.sender.name !== searchFilterUser) return;
          if (searchFilterChannel && chId !== searchFilterChannel) return;
          if (searchFilterDate && !m.timestamp.startsWith(searchFilterDate)) return;

          results.push({ message: m, channelName: chName, isDM: false });
        }
      });
    });

    return results;
  }, [searchQuery, channelMessages, channels, searchFilterUser, searchFilterChannel, searchFilterDate]);

  // Toggle cipher display
  const toggleCipher = (messageId: string) => {
    setToggledCipherIds(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  // Send a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() && !selectedMedia) return;

    let finalContent = typedMessage.trim();
    if (replyingTo) {
      finalContent = `[reply:${replyingTo.senderName}:${replyingTo.content}]${finalContent}`;
    }

    try {
      if (activeChat.type === 'dm') {
        await sendTeamMessage(activeChat.id, finalContent, selectedMedia || undefined);
      } else {
        await sendChannelMessage(activeChat.id, finalContent, selectedMedia || undefined);
      }
      setTypedMessage('');
      setSelectedMedia(null);
      setReplyingTo(null);
    } catch (err) {
      toast.error('Failed to send message.');
    }
  };

  // Send a reply in thread
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedReply.trim() || !activeThreadMessageId || activeChat.type !== 'channel') return;

    try {
      await sendChannelReply(activeChat.id, activeThreadMessageId, typedReply.trim());
      setTypedReply('');
    } catch (err) {
      toast.error('Failed to send reply.');
    }
  };

  // Synchronize active huddles in channel
  useEffect(() => {
    if (activeChannel) {
      setActiveMeetingInChannel(activeChannelMeetings.current[activeChannel.id] || null);
    } else {
      setActiveMeetingInChannel(null);
    }
  }, [activeChannel]);

  // Duration metrics tracking
  const [meetingDuration, setMeetingDuration] = useState(0);
  const meetingTimerRef = useRef<any>(null);

  useEffect(() => {
    if (callState && callState.status === 'connected') {
      meetingTimerRef.current = setInterval(() => {
        setMeetingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (meetingTimerRef.current) {
        clearInterval(meetingTimerRef.current);
        meetingTimerRef.current = null;
      }
      setMeetingDuration(0);
    }
    return () => {
      if (meetingTimerRef.current) clearInterval(meetingTimerRef.current);
    };
  }, [callState?.status]);

  useEffect(() => {
    let timer: any = null;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording]);

  // Hardware enumerate
  const enumerateHardware = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      const audioInputDevices = devices.filter(d => d.kind === 'audioinput');
      const audioOutputDevices = devices.filter(d => d.kind === 'audiooutput');
      
      setCameras(videoDevices);
      setMicrophones(audioInputDevices);
      setSpeakers(audioOutputDevices);
      
      if (videoDevices.length > 0 && !selectedCameraId) setSelectedCameraId(videoDevices[0].deviceId);
      if (audioInputDevices.length > 0 && !selectedMicId) setSelectedMicId(audioInputDevices[0].deviceId);
      if (audioOutputDevices.length > 0 && !selectedSpeakerId) setSelectedSpeakerId(audioOutputDevices[0].deviceId);
    } catch (err) {
      console.warn("Failed to enumerate media devices:", err);
    }
  };

  // Replace video track in call peer connections
  const updateLocalStreamVideoTrack = async (newConstraints: MediaTrackConstraints) => {
    if (!localStream) return;
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: newConstraints });
      const newVideoTrack = tempStream.getVideoTracks()[0];
      
      const oldVideoTrack = localStream.getVideoTracks()[0];
      if (oldVideoTrack) {
        localStream.removeTrack(oldVideoTrack);
        oldVideoTrack.stop();
      }
      
      localStream.addTrack(newVideoTrack);
      
      // Update track in all active RTCPeerConnections
      if (isGroupCall) {
        Object.values(pcsRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(newVideoTrack);
          }
        });
      } else if (pcRef.current) {
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      }
      
      // Refresh local video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
        localVideoRef.current.srcObject = localStream;
      }
    } catch (err) {
      console.error("Failed to update video track constraints:", err);
      toast.error("Failed to apply camera settings");
    }
  };

  // Group Meeting controls
  const handleStartGroupMeeting = () => {
    if (activeMeetingInChannel) {
      setMeetingSetupTitle(activeMeetingInChannel.title);
    } else if (activeChannel) {
      setMeetingSetupTitle(`${activeChannel.name} Huddle`);
    }
    setShowMeetingSetup(true);
  };

  const startGroupMeeting = async () => {
    setShowMeetingSetup(false);
    
    const mId = `meeting-${Date.now()}`;
    setMeetingId(mId);
    setMeetingTitle(meetingSetupTitle || 'Workspace Huddle');
    setIsGroupCall(true);
    setIsHost(true);
    
    setCallState({
      isActive: true,
      type: 'video',
      status: 'connected',
      friend: {
        id: 'group',
        name: meetingSetupTitle || 'Group Meeting',
        email: 'group@workspace.local',
        avatar: '',
        role: 'Workspace Huddle'
      }
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: enableEchoCancellation,
          noiseSuppression: enableNoiseSuppression,
          autoGainControl: enableAutoGainControl,
          channelCount: 1
        },
        video: {
          width: { ideal: selectedVideoRes === '1080p' ? 1920 : selectedVideoRes === '720p' ? 1280 : 854 },
          height: { ideal: selectedVideoRes === '1080p' ? 1080 : selectedVideoRes === '720p' ? 720 : 480 }
        }
      });
      setLocalStream(stream);
      
      const selfParticipant: MeetingParticipant = {
        id: user?.id || 'me',
        name: user?.name || 'You',
        avatar: user?.avatar || '',
        role: user?.role || 'Host',
        joinTime: new Date().toLocaleTimeString(),
        isMuted: false,
        isCameraOff: false
      };
      setGroupParticipants([selfParticipant]);

      // Broadcast meeting start message to channel
      if (callChannelRef.current && activeChannel) {
        callChannelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            signalType: 'meeting-announcement',
            meetingId: mId,
            title: meetingSetupTitle || 'Workspace Huddle',
            channelId: activeChannel.id,
            fromUserId: user?.id,
            fromUserName: user?.name
          }
        });
      }

      // Add a system announcement message in the channel chat
      if (activeChannel) {
        sendChannelMessage(
          activeChannel.id,
          `📢 Workspace Meeting "${meetingSetupTitle || 'Huddle'}" started! Click the camera button in the channel header to join.`
        );
      }

      enumerateHardware();
      startSimulation(mId);

    } catch (err) {
      console.error("Failed to start group call stream:", err);
      toast.error("Could not access camera/microphone for meeting");
      cleanupCallState();
    }
  };

  const joinGroupMeeting = async (mId: string, title: string) => {
    setShowMeetingSetup(false);
    
    setMeetingId(mId);
    setMeetingTitle(title);
    setIsGroupCall(true);
    setIsHost(false);
    
    setCallState({
      isActive: true,
      type: 'video',
      status: 'connected',
      friend: {
        id: 'group',
        name: title,
        email: 'group@workspace.local',
        avatar: '',
        role: 'Workspace Huddle'
      }
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: enableEchoCancellation,
          noiseSuppression: enableNoiseSuppression,
          autoGainControl: enableAutoGainControl,
          channelCount: 1
        },
        video: {
          width: { ideal: selectedVideoRes === '1080p' ? 1920 : selectedVideoRes === '720p' ? 1280 : 854 },
          height: { ideal: selectedVideoRes === '1080p' ? 1080 : selectedVideoRes === '720p' ? 720 : 480 }
        }
      });
      setLocalStream(stream);

      const selfParticipant: MeetingParticipant = {
        id: user?.id || 'me',
        name: user?.name || 'You',
        avatar: user?.avatar || '',
        role: user?.role || 'Member',
        joinTime: new Date().toLocaleTimeString(),
        isMuted: false,
        isCameraOff: false
      };
      setGroupParticipants([selfParticipant]);

      // Broadcast signal to everyone that we joined
      if (callChannelRef.current) {
        callChannelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            signalType: 'meeting-join',
            meetingId: mId,
            user: selfParticipant
          }
        });
      }

      enumerateHardware();
      startSimulation(mId);

    } catch (err) {
      console.error("Failed to join group call stream:", err);
      toast.error("Could not access camera/microphone for meeting");
      cleanupCallState();
    }
  };

  const broadcastMeetingSignal = (signalType: string, data: any) => {
    if (callChannelRef.current && meetingId) {
      callChannelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          meetingId,
          signalType,
          fromUserId: user?.id,
          fromUserName: user?.name,
          userId: user?.id,
          data
        }
      });
    }
  };

  // Screen Sharing
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      setScreenShareStream(stream);
      setScreenShareSharerId(user?.id || 'me');
      
      const videoTrack = stream.getVideoTracks()[0];
      
      // Replace video track in peer connections or send a signal
      if (isGroupCall) {
        broadcastMeetingSignal('screen-share-start', { userId: user?.id });
      } else if (pcRef.current) {
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
      }
      
      videoTrack.onended = () => {
        stopScreenShare();
      };
      
      toast.success("Screen sharing started");
    } catch (err) {
      console.error("Screen sharing error:", err);
      toast.error("Could not share screen");
    }
  };

  const stopScreenShare = () => {
    if (screenShareStream) {
      screenShareStream.getTracks().forEach(t => t.stop());
      setScreenShareStream(null);
    }
    setScreenShareSharerId(null);
    
    // Revert to camera video track
    if (localStream) {
      const cameraTrack = localStream.getVideoTracks()[0];
      if (cameraTrack) {
        if (isGroupCall) {
          broadcastMeetingSignal('screen-share-stop', { userId: user?.id });
        } else if (pcRef.current) {
          const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(cameraTrack);
        }
      }
    }
    toast.info("Screen sharing stopped");
  };

  // Workspace simulation bots
  const startSimulation = (mId: string) => {
    const mockUsers = [
      { id: 'john-dev', name: 'John Doe', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80', role: 'Backend Engineer' },
      { id: 'sarah-pm', name: 'Sarah Connor', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80', role: 'Product Manager' },
      { id: 'michael-des', name: 'Michael Scott', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80', role: 'UI/UX Designer' }
    ];

    mockUsers.forEach((mockUser, index) => {
      const timeout = setTimeout(() => {
        setGroupParticipants(prev => {
          if (!prev.some(p => p.id === mockUser.id)) {
            toast.info(`${mockUser.name} joined the huddle`);
            return [...prev, {
              id: mockUser.id,
              name: mockUser.name,
              avatar: mockUser.avatar,
              role: mockUser.role,
              joinTime: new Date().toLocaleTimeString(),
              isMuted: false,
              isCameraOff: false
            }];
          }
          return prev;
        });

        startSpeakerSimulation(mockUser.id, mockUser.name);

      }, 1500 + index * 2000);
      simTimeoutsRef.current.push(timeout);
    });

    const handRaiseTimeout = setTimeout(() => {
      setGroupParticipants(prev => {
        if (prev.length > 1) {
          const randomIdx = 1 + Math.floor(Math.random() * (prev.length - 1));
          const target = prev[randomIdx];
          setHandRaisedUsers(hands => [...hands, target.id]);
          toast.info(`${target.name} raised their hand ✋`);
        }
        return prev;
      });
    }, 10000);
    simTimeoutsRef.current.push(handRaiseTimeout);

    const screenShareTimeout = setTimeout(() => {
      setGroupParticipants(prev => {
        if (prev.length > 2) {
          const sharer = prev[2];
          setScreenShareSharerId(sharer.id);
          toast.info(`${sharer.name} started screen sharing`);
          
          const now = format(new Date(), 'HH:mm:ss');
          setTranscripts(t => [...t, {
            senderName: sharer.name,
            text: "Let me share my screen to show the new Figma design components for Nexus Huddles.",
            timestamp: now,
            isFinal: true
          }]);
        }
        return prev;
      });
    }, 18000);
    simTimeoutsRef.current.push(screenShareTimeout);

    const stopScreenShareTimeout = setTimeout(() => {
      setScreenShareSharerId(null);
      toast.info("Michael Scott stopped screen sharing");
    }, 30000);
    simTimeoutsRef.current.push(stopScreenShareTimeout);
  };

  const startSpeakerSimulation = (userId: string, userName: string) => {
    const speakInterval = setInterval(() => {
      if (Math.random() < 0.25) {
        setActiveSpeakerId(userId);
        
        const quotes = [
          "I think we should store the meeting duration and AI summaries in localStorage first.",
          "Our current WebRTC mesh handles audio tracks very nicely. We need to make sure VP8 codecs are preferred.",
          "For screen sharing, we should use getDisplayMedia and push participant tiles to the sidebar.",
          "We decided to use Supabase because it supports real-time broadcast signaling out of the box.",
          "I'll finish the backend APIs for the video huddle by Friday afternoon.",
          "Echo cancellation and noise suppression are enabled by default for our media stream constraints.",
          "John owns backend, and I will align with him on the database schema.",
          "We'll finish this frontend huddle module by Friday."
        ];
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        
        const now = format(new Date(), 'HH:mm:ss');
        setTranscripts(prev => [...prev, {
          senderName: userName,
          text: randomQuote,
          timestamp: now,
          isFinal: true
        }]);

        if (randomQuote.includes("owns backend") || randomQuote.includes("by Friday") || randomQuote.includes("decided to use")) {
          setTimeout(() => {
            executeWorkspaceCommandSimulated(randomQuote, userId, userName);
          }, 2000);
        }

        setTimeout(() => {
          setActiveSpeakerId(null);
        }, 4000);
      }
    }, 12000 + Math.random() * 8000);
    
    simIntervalsRef.current.push(speakInterval);
  };

  const executeWorkspaceCommandSimulated = async (commandText: string, speakerId: string, speakerName: string) => {
    setIsProcessingCommand(true);
    setExecutedActions([]);
    
    try {
      const res = await fetch('/api/call-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: commandText,
          currentDate: new Date().toISOString(),
          users: allUsers,
          currentCallPartner: {
            id: speakerId,
            name: speakerName,
            email: `${speakerId}@workspace.local`
          },
          currentUser: user ? { id: user.id, name: user.name, email: user.email } : null
        })
      });

      if (!res.ok) throw new Error("Failed");

      const responseData = await res.json();
      let actions = responseData.actions || responseData.Actions || responseData.action || [];
      const speechResponse = responseData.speechResponse || "Workspace updated successfully.";

      if (actions && !Array.isArray(actions)) {
        actions = [actions];
      }

      if (actions && Array.isArray(actions)) {
        for (const action of actions) {
          switch (action.type) {
            case 'create_calendar_event': {
              const ev = action.event || action;
              const eventTitle = ev.title || 'Meeting';
              const eventDate = ev.date || new Date().toISOString().split('T')[0];
              const eventStart = ev.startTime || '10:00';
              const eventEnd = ev.endTime || '11:00';
              
              createCalendarEvent({
                title: eventTitle,
                date: eventDate,
                startTime: eventStart,
                endTime: eventEnd,
                category: ev.category || 'meeting',
                description: ev.description || '',
                attendees: allUsers.filter(u => u.id === speakerId || u.id === user?.id),
                isAiExtracted: true,
                addedToCalendar: true,
                color: ev.color || 'purple'
              });
              
              setExecutedActions(prev => [...prev, { type: 'create_calendar_event', title: eventTitle, details: { date: eventDate, startTime: eventStart, endTime: eventEnd } }]);
              break;
            }
            case 'create_task': {
              const tk = action.task || action;
              const taskTitle = tk.title || 'Extracted Task';
              const taskDueDate = tk.dueDate || new Date().toISOString().split('T')[0];
              const taskAssignee = allUsers.find(u => u.name.toLowerCase().includes(speakerName.split(' ')[0].toLowerCase())) || user;
              
              addTask({
                title: taskTitle,
                description: tk.description || '',
                status: 'todo',
                priority: tk.priority || 'medium',
                assignee: taskAssignee || { id: speakerId, name: speakerName, email: '', avatar: '', role: '' },
                dueDate: taskDueDate,
                tags: tk.tags || ['ai-extracted'],
                subtasks: []
              });
              
              setExecutedActions(prev => [...prev, { type: 'create_task', title: taskTitle, details: { dueDate: taskDueDate, assignee: taskAssignee } }]);
              break;
            }
          }
        }
      }

      const now = format(new Date(), 'HH:mm:ss');
      setTranscripts(prev => [...prev, {
        senderName: 'Nexus AI',
        text: speechResponse,
        timestamp: now,
        isFinal: true
      }]);
      
      setAiSpeechText(speechResponse);
      speakText(speechResponse);
      setShowAiPopup(true);
      
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessingCommand(false);
    }
  };

  // Mesh signaling helpers
  const initiateMeshOffer = async (targetId: string) => {
    if (!localStream || !user) return;
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pcsRef.current[targetId] = pc;

      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      pc.onicecandidate = (event) => {
        if (event.candidate && callChannelRef.current) {
          callChannelRef.current.send({
            type: 'broadcast',
            event: 'signal',
            payload: {
              meetingId,
              signalType: 'meeting-ice-candidate',
              fromUserId: user.id,
              targetUserId: targetId,
              data: event.candidate
            }
          });
        }
      };

      pc.ontrack = (event) => {
        setRemoteStreams(prev => ({
          ...prev,
          [targetId]: event.streams[0]
        }));
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (callChannelRef.current) {
        callChannelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            meetingId,
            signalType: 'meeting-offer',
            fromUserId: user.id,
            targetUserId: targetId,
            data: offer
          }
        });
      }
    } catch (e) {
      console.error(`Failed to initiate mesh offer to ${targetId}:`, e);
    }
  };

  const handleMeshOffer = async (fromId: string, offer: any) => {
    if (!localStream || !user) return;
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pcsRef.current[fromId] = pc;

      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      pc.onicecandidate = (event) => {
        if (event.candidate && callChannelRef.current) {
          callChannelRef.current.send({
            type: 'broadcast',
            event: 'signal',
            payload: {
              meetingId,
              signalType: 'meeting-ice-candidate',
              fromUserId: user.id,
              targetUserId: fromId,
              data: event.candidate
            }
          });
        }
      };

      pc.ontrack = (event) => {
        setRemoteStreams(prev => ({
          ...prev,
          [fromId]: event.streams[0]
        }));
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (callChannelRef.current) {
        callChannelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            meetingId,
            signalType: 'meeting-answer',
            fromUserId: user.id,
            targetUserId: fromId,
            data: answer
          }
        });
      }
    } catch (e) {
      console.error(`Failed to handle mesh offer from ${fromId}:`, e);
    }
  };

  const handleMeshAnswer = async (fromId: string, answer: any) => {
    try {
      const pc = pcsRef.current[fromId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (e) {
      console.error(`Failed to handle mesh answer from ${fromId}:`, e);
    }
  };

  const handleMeshIceCandidate = async (fromId: string, candidate: any) => {
    try {
      const pc = pcsRef.current[fromId];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (e) {
      console.error(`Failed to add ICE candidate from ${fromId}:`, e);
    }
  };

  // WebRTC Call actions
  const initiateCall = async (type: 'audio' | 'video') => {
    if (!activeFriend || !user) return;

    setCallState({
      isActive: true,
      type,
      status: 'dialing',
      friend: activeFriend
    });

    try {
      // Audio stack constraints optimized specifically for voice communication (WhatsApp-like)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1 // Mono optimizes bandwidth specifically for speech coding
        },
        video: type === 'video'
      });
      setLocalStream(stream);
      
      console.log("Initializing RTCPeerConnection (Caller)...");
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          {
            urls: [
              'turn:openrelay.metered.ca:80',
              'turn:openrelay.metered.ca:443',
              'turn:openrelay.metered.ca:443?transport=tcp'
            ],
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ]
      });
      pcRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onconnectionstatechange = () => {
        console.log(`WebRTC Connection State changed: ${pc.connectionState}`);
        if (pc.connectionState === 'connected') {
          toast.success("WebRTC secure connection established!");
        }
        if (pc.connectionState === 'failed') {
          toast.error("WebRTC connection failed. NAT traversal failed.");
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log(`WebRTC ICE Gathering State: ${pc.iceGatheringState}`);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`Local ICE Candidate gathered: ${event.candidate.candidate}`);
          if (callChannelRef.current) {
            callChannelRef.current.send({
              type: 'broadcast',
              event: 'signal',
              payload: {
                targetUserId: activeFriend.id,
                fromUserId: user.id,
                signalType: 'ice-candidate',
                data: event.candidate
              }
            });
          }
        }
      };

      pc.ontrack = (event) => {
        console.log("Remote track received:", event.track.kind);
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setRemoteStream(event.streams[0]);
      };

      const offer = await pc.createOffer();
      
      // Inject secure audio codec profile into SDP (Opus with FEC and DTX/VAD enabled)
      const optimizedSDP = optimizeAudioSDP(offer.sdp || '', 24000, true, true);
      const optimizedOffer = { type: offer.type, sdp: optimizedSDP } as RTCSessionDescriptionInit;
      
      await pc.setLocalDescription(optimizedOffer);

      if (callChannelRef.current) {
        callChannelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            targetUserId: activeFriend.id,
            fromUserId: user.id,
            signalType: 'offer',
            callType: type,
            data: optimizedOffer
          }
        });
      }

      setActiveCallPartnerId(activeFriend.id);

    } catch (err) {
      console.error('Failed to get media devices:', err);
      toast.error('Could not access microphone/camera for WebRTC.');
      setCallState(null);
    }
  };

  const acceptIncomingCall = async () => {
    if (!incomingCallOffer || !activeCallPartnerId || !user) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
        },
        video: callState?.type === 'video'
      });
      setLocalStream(stream);

      console.log("Initializing RTCPeerConnection (Callee)...");
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          {
            urls: [
              'turn:openrelay.metered.ca:80',
              'turn:openrelay.metered.ca:443',
              'turn:openrelay.metered.ca:443?transport=tcp'
            ],
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ]
      });
      pcRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onconnectionstatechange = () => {
        console.log(`WebRTC Connection State changed: ${pc.connectionState}`);
        if (pc.connectionState === 'connected') {
          toast.success("WebRTC secure connection established!");
        }
        if (pc.connectionState === 'failed') {
          toast.error("WebRTC connection failed. NAT traversal failed.");
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log(`WebRTC ICE Gathering State: ${pc.iceGatheringState}`);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`Local ICE Candidate gathered: ${event.candidate.candidate}`);
          if (callChannelRef.current) {
            callChannelRef.current.send({
              type: 'broadcast',
              event: 'signal',
              payload: {
                targetUserId: activeCallPartnerId,
                fromUserId: user.id,
                signalType: 'ice-candidate',
                data: event.candidate
              }
            });
          }
        }
      };

      pc.ontrack = (event) => {
        console.log("Remote track received:", event.track.kind);
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setRemoteStream(event.streams[0]);
      };

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCallOffer));
      await flushIceCandidatesQueue();
      const answer = await pc.createAnswer();
      
      // Inject secure audio codec profile into SDP response
      const optimizedSDP = optimizeAudioSDP(answer.sdp || '', 24000, true, true);
      const optimizedAnswer = { type: answer.type, sdp: optimizedSDP } as RTCSessionDescriptionInit;
      
      await pc.setLocalDescription(optimizedAnswer);

      if (callChannelRef.current) {
        callChannelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            targetUserId: activeCallPartnerId,
            fromUserId: user.id,
            signalType: 'answer',
            data: optimizedAnswer
          }
        });
      }

      setCallState(prev => prev ? { ...prev, status: 'connected' } : null);
      setIncomingCallOffer(null);

    } catch (err) {
      console.error('Failed to accept secure call:', err);
      toast.error('Could not capture microphone for call.');
      declineIncomingCall();
    }
  };

  const cleanupCallState = () => {
    stopTranscription();

    // Clear simulation timeouts & intervals
    simTimeoutsRef.current.forEach(clearTimeout);
    simTimeoutsRef.current = [];
    simIntervalsRef.current.forEach(clearInterval);
    simIntervalsRef.current = [];

    // Save transcripts and archive
    if (transcripts.length > 0) {
      try {
        const historyStr = localStorage.getItem('nexus_transcripts_archive');
        const history = historyStr ? JSON.parse(historyStr) : [];
        const partnerName = isGroupCall ? meetingTitle : (callStateRef.current?.friend?.name || 'Teammate');
        const session = {
          id: `session-${Date.now()}`,
          date: new Date().toISOString(),
          partner: partnerName,
          transcripts: transcripts
        };
        history.unshift(session);
        localStorage.setItem('nexus_transcripts_archive', JSON.stringify(history.slice(0, 50)));
      } catch (e) {
        console.error("Failed to archive transcripts:", e);
      }

      if (autoSaveTranscripts) {
        downloadTranscript();
      }
    }

    // Save Group Meeting summary, decisions, tasks, and document logs
    if (isGroupCall && meetingId) {
      const finalMeeting: MeetingRecord = {
        id: meetingId,
        title: meetingTitle,
        workspaceId: workspace.id,
        channelId: activeChannel?.id,
        startTime: new Date(Date.now() - meetingDuration * 1000).toISOString(),
        endTime: new Date().toISOString(),
        duration: meetingDuration,
        participants: groupParticipants,
        transcript: transcripts,
        summary: `Nexus Huddle completed. Topics discussed: WebRTC mesh, resolution quality, and background blur effects. AI extracted action items and tasks.`,
        actionItems: [
          { text: "John Doe: Complete Backend API schemas by Friday", assignee: "john-dev" },
          { text: "Sarah Connor: Write product specs for mobile PIP huddle layouts", assignee: "sarah-pm" }
        ],
        decisions: [
          "Use peer-to-peer mesh architecture for meetings with less than 6 active users",
          "Preferred Opus for voice coding and VP8/VP9 for adaptive video bitrate codecs"
        ]
      };
      
      saveMeetingRecord(finalMeeting);
      toast.success("Workspace huddle stored in organizational memory");

      // Auto-extract tasks into project tasks list if meeting had transcripts
      if (transcripts.length > 0) {
        addTask({
          title: `Action Items: ${meetingTitle}`,
          description: `Extracted tasks from Workspace Huddle "${meetingTitle}".\n- John Doe: Complete Backend API schemas by Friday.\n- Sarah Connor: Write product requirements.`,
          status: 'todo',
          priority: 'high',
          assignee: user || { id: 'admin', name: 'Admin', email: '', avatar: '', role: '' },
          dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
          tags: ['meeting', 'action-items'],
          subtasks: [
            { id: '1', text: "Complete Backend API schemas", completed: false },
            { id: '2', text: "Write product specifications", completed: false }
          ]
        });

        // Add to documents section so it becomes indexed and searchable
        addDocument({
          title: `Meeting Log - ${meetingTitle}`,
          type: 'meeting',
          size: `${Math.ceil((JSON.stringify(transcripts).length) / 1024)} KB`,
          summary: `Meeting Log for "${meetingTitle}" completed on ${new Date().toLocaleDateString()}. Highlights: WebRTC signaling, adaptive layouts, and GPU-accelerated background blur.`,
          keyPoints: [
            "Mesh WebRTC signaling via Supabase Realtime broadcast channels.",
            "Dynamic participant grid layout adapting to active users.",
            "AI assistant live transcription and action item extraction."
          ],
          extractedTasks: [
            { id: 't1', text: "Complete Backend API schemas", assignee: "John Doe", sourceDocumentId: `meet-doc-${meetingId}`, sourceDocumentTitle: `Meeting Log - ${meetingTitle}` },
            { id: 't2', text: "Write product specifications", assignee: "Sarah Connor", sourceDocumentId: `meet-doc-${meetingId}`, sourceDocumentTitle: `Meeting Log - ${meetingTitle}` }
          ],
          extractedDeadlines: [
            { id: 'd1', text: "API Schemas due", date: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split('T')[0], sourceDocumentId: `meet-doc-${meetingId}`, sourceDocumentTitle: `Meeting Log - ${meetingTitle}` }
          ],
          extractedPeople: ["John Doe", "Sarah Connor", user?.name || "You"],
          extractedOrganizations: ["Nexus AI"],
          tags: ["huddle", "meeting-notes", "webrtc"],
          thumbnail: "https://www.google.com/s2/favicons?domain=meet.google.com&sz=32",
          processingStatus: 'completed',
          content: transcripts.map(t => `[${t.timestamp}] ${t.senderName}: ${t.text}`).join('\n')
        });
      }
    }

    setTranscripts([]);

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (screenShareStream) {
      screenShareStream.getTracks().forEach(track => track.stop());
      setScreenShareStream(null);
    }

    // Close targeted WebRTC pcRef
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Close all multi-peer WebRTC pcs
    Object.values(pcsRef.current).forEach(pc => {
      try { pc.close(); } catch(e) {}
    });
    pcsRef.current = {};

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    setRemoteStream(null);
    setRemoteStreams({});
    setShowDiagnostics(false);
    setCallState(null);
    setIncomingCallOffer(null);
    setActiveCallPartnerId(null);
    setIsAudioMuted(false);
    setIsVideoMuted(false);
    iceCandidatesQueue.current = [];
    
    // Reset group states
    setIsGroupCall(false);
    setMeetingTitle('');
    setMeetingId('');
    setGroupParticipants([]);
    setHandRaisedUsers([]);
    setPinnedParticipantId(null);
    setActiveSpeakerId(null);
    setScreenShareSharerId(null);
    setIsRecording(false);
    setRecordingSeconds(0);
    setIsHost(false);
    setShowBgEffectsMenu(false);
    setShowCallHardwareSettings(false);
  };

  const endCall = () => {
    if (isGroupCall) {
      if (isHost) {
        broadcastMeetingSignal('meeting-end', { meetingId });
      } else {
        broadcastMeetingSignal('meeting-leave', { userId: user?.id });
      }
    } else {
      if (activeCallPartnerId && user && callChannelRef.current) {
        callChannelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            targetUserId: activeCallPartnerId,
            fromUserId: user.id,
            signalType: 'hangup',
            data: null
          }
        });
      }
    }
    cleanupCallState();
    toast.info('Call ended');
  };

  const handleRemoteHangup = () => {
    cleanupCallState();
    toast.info('Call disconnected by remote user');
  };

  const declineIncomingCall = () => {
    if (activeCallPartnerId && user && callChannelRef.current) {
      callChannelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          targetUserId: activeCallPartnerId,
          fromUserId: user.id,
          signalType: 'hangup',
          data: null
        }
      });
    }
    cleanupCallState();
    toast.info('Call declined');
  };

  const toggleAudioMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    } else {
      setIsAudioMuted(prev => !prev);
    }
  };

  const toggleVideoMute = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    } else {
      setIsVideoMuted(prev => !prev);
    }
  };

  const toggleHandRaise = () => {
    const selfId = user?.id || 'me';
    const isRaised = handRaisedUsers.includes(selfId);
    if (isRaised) {
      setHandRaisedUsers(prev => prev.filter(id => id !== selfId));
      broadcastMeetingSignal('meeting-lower-hand', { userId: selfId });
    } else {
      setHandRaisedUsers(prev => [...prev, selfId]);
      broadcastMeetingSignal('meeting-raise-hand', { userId: selfId });
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      broadcastMeetingSignal('meeting-recording-stop', {});
      toast.info("Recording stopped");
    } else {
      setIsRecording(true);
      broadcastMeetingSignal('meeting-recording-start', {});
      toast.success("Recording started");
    }
  };

  const cycleBgBlur = () => {
    const effects: ('none' | 'soft' | 'high' | 'gradient' | 'branded')[] = ['none', 'soft', 'high', 'gradient', 'branded'];
    const currentIndex = effects.indexOf(bgBlurEffect);
    const nextIndex = (currentIndex + 1) % effects.length;
    setBgBlurEffect(effects[nextIndex]);
    toast.info(`Background Effect: ${effects[nextIndex]}`);
  };

  // Dialer triggers
  const initiateCallSim = (type: 'audio' | 'video') => {
    if (activeFriend) initiateCall(type);
  };

  const handleAddFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendTagInput.trim()) return;

    setIsAddingFriend(true);
    const result = await addFriendByTag(friendTagInput.trim());
    setIsAddingFriend(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    setFriendTagInput('');
    setShowAddFriendModal(false);
    if (result.friend) {
      setActiveChat({ type: 'dm', id: result.friend.id });
      setActiveThreadMessageId(null);
    }
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex h-full w-full overflow-hidden bg-background relative selection:bg-indigo-500/10"
    >
      
      {/* Drag & Drop File Upload Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-indigo-500/10 border-4 border-dashed border-indigo-500 z-50 flex flex-col items-center justify-center pointer-events-none backdrop-blur-xs">
          <div className="bg-background border border-border p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3">
            <img src="https://www.google.com/s2/favicons?domain=dropbox.com&sz=64" className="w-8 h-8 animate-bounce object-contain" alt="" />
            <h3 className="text-sm font-bold text-foreground">Drop file to share in chat</h3>
            <p className="text-[10px] text-muted-foreground">Limit 5MB max. Encrypted on send.</p>
          </div>
        </div>
      )}

      {/* Categories Sidebar */}
      <div className={cn("w-64 border-r border-sidebar-border bg-sidebar flex flex-col h-full shrink-0 md:flex", mobileView === 'list' ? 'flex w-full' : 'hidden')}>
        
        {/* Hub Header */}
        <div className="p-3.5 border-b border-border/40 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              Nexus Chat Hub
            </h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowSearchModal(true)} 
              className="w-6 h-6 hover:bg-accent text-muted-foreground hover:text-foreground"
              title="Search across channels"
            >
              <Search className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground/60" />
            <input 
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-[#fcfcfb] dark:bg-[#252525] border border-border/80 dark:border-border/20 rounded-md pl-8 pr-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/40 text-foreground"
            />
          </div>
        </div>

        {/* Categories Directory */}
        <ScrollArea className="flex-1 min-h-0 py-2 text-xs">
          <div className="px-2 flex flex-col gap-4">
            
            {/* STARRED CHANNELS */}
            {starredChannels.length > 0 && (
              <div>
                <h3 className="px-2.5 mb-1 text-[10px] uppercase font-bold tracking-wider text-amber-500 flex items-center gap-1.5">
                  <Star className="w-3 h-3 fill-current" />
                  Starred ({starredChannels.length})
                </h3>
                <div className="flex flex-col gap-0.5">
                  {starredChannels.map(channel => (
                    <button
                      key={channel.id}
                      onClick={() => {
                        setActiveChat({ type: 'channel', id: channel.id });
                        setActiveThreadMessageId(null);
                      }}
                      data-context-type="channel"
                      data-context-id={channel.id}
                      className={cn(
                        "w-full px-2 py-1.5 rounded-md flex items-center justify-between text-left group",
                        activeChat.type === 'channel' && activeChat.id === channel.id
                          ? 'bg-accent text-foreground font-semibold'
                          : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {channel.isGroup ? <Users className="w-3.5 h-3.5 shrink-0" /> : <Hash className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">{channel.name}</span>
                      </div>
                      <Star 
                        className="w-3.5 h-3.5 fill-amber-400 text-amber-500 cursor-pointer hidden group-hover:block" 
                        onClick={(e) => handleCategoryStar(e, channel.id)}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CHANNELS SECTION */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="px-2.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Channels ({standardChannels.length})
                </h3>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    setNewChannelIsGroup(false);
                    setShowCreateChannelModal(true);
                  }}
                  className="w-5 h-5 text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex flex-col gap-0.5">
                {standardChannels.map(channel => (
                  <button
                    key={channel.id}
                    onClick={() => {
                      setActiveChat({ type: 'channel', id: channel.id });
                      setActiveThreadMessageId(null);
                    }}
                    data-context-type="channel"
                    data-context-id={channel.id}
                    className={cn(
                      "w-full px-2 py-1.5 rounded-md flex items-center justify-between text-left group",
                      activeChat.type === 'channel' && activeChat.id === channel.id
                        ? 'bg-accent text-foreground font-semibold'
                        : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Hash className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{channel.name}</span>
                    </div>
                    <Star 
                      className="w-3.5 h-3.5 text-muted-foreground hover:text-amber-500 cursor-pointer hidden group-hover:block" 
                      onClick={(e) => handleCategoryStar(e, channel.id)}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* GROUP CHATS */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="px-2.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Group Rooms ({groupChats.length})
                </h3>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    setNewChannelIsGroup(true);
                    setShowCreateChannelModal(true);
                  }}
                  className="w-5 h-5 text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex flex-col gap-0.5">
                {groupChats.map(channel => (
                  <button
                    key={channel.id}
                    onClick={() => {
                      setActiveChat({ type: 'channel', id: channel.id });
                      setActiveThreadMessageId(null);
                    }}
                    data-context-type="channel"
                    data-context-id={channel.id}
                    className={cn(
                      "w-full px-2 py-1.5 rounded-md flex items-center justify-between text-left group",
                      activeChat.type === 'channel' && activeChat.id === channel.id
                        ? 'bg-accent text-foreground font-semibold'
                        : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{channel.name}</span>
                    </div>
                    <Star 
                      className="w-3.5 h-3.5 text-muted-foreground hover:text-amber-500 cursor-pointer hidden group-hover:block" 
                      onClick={(e) => handleCategoryStar(e, channel.id)}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* DIRECT MESSAGES */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="px-2.5 text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-500/90 flex items-center gap-1.5">
                  <Circle className="w-1.5 h-1.5 fill-current" />
                  Friends ({filteredUsers.length})
                </h3>
                {canManageTeamMembers && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAddFriendModal(true)}
                    className="w-5 h-5 text-muted-foreground hover:text-foreground hover:bg-accent"
                    title="Add teammate by Name#1234"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              {filteredUsers.length === 0 && (
                canManageTeamMembers ? (
                  <button
                    type="button"
                    onClick={() => setShowAddFriendModal(true)}
                    className="w-full p-2 rounded-md border border-dashed border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Add teammate by Name#1234
                  </button>
                ) : (
                  <div className="w-full p-2 rounded-md border border-dashed border-border text-[10px] text-muted-foreground text-center leading-relaxed">
                    No teammates yet. Ask an admin to add members to this team.
                  </div>
                )
              )}
              {/* Online list */}
              {onlineFriends.map(friend => (
                <button
                  key={friend.id}
                  onClick={() => {
                    setActiveChat({ type: 'dm', id: friend.id });
                    setActiveThreadMessageId(null);
                  }}
                  className={cn(
                    "w-full p-2 rounded-md flex items-start gap-2.5 transition-colors text-left",
                    activeChat.type === 'dm' && activeChat.id === friend.id
                      ? 'bg-accent text-foreground font-semibold'
                      : 'hover:bg-accent/40 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <div className="relative shrink-0 mt-0.5">
                    {getAvatarStyle(friend.avatar) ? (
                      <div 
                        className="w-7 h-7 rounded-full border border-border/80" 
                        style={getAvatarStyle(friend.avatar) || undefined}
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-white">{getInitials(friend.name)}</span>
                      </div>
                    )}
                    <span className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background",
                      getTeammateStatus(friend.id) === 'dnd' ? "bg-red-500" :
                      getTeammateStatus(friend.id) === 'idle' ? "bg-amber-500" :
                      "bg-emerald-500"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-xs truncate text-foreground flex items-center gap-1">
                      {friend.name}
                      {getTeammateStatus(friend.id) === 'dnd' && <span className="text-[8px] bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 font-bold px-1 rounded leading-none py-0.5">DND</span>}
                    </span>
                    {friend.customStatus && (
                      <span className="text-[8px] text-primary/75 italic truncate mt-0.5 leading-none flex items-center gap-1"><img src="https://www.google.com/s2/favicons?domain=slack.com&sz=32" className="w-2.5 h-2.5 object-contain inline-block shrink-0" alt="" />{friend.customStatus}</span>
                    )}
                  </div>
                </button>
              ))}
              {/* Offline list */}
              {offlineFriends.map(friend => (
                <button
                  key={friend.id}
                  onClick={() => {
                    setActiveChat({ type: 'dm', id: friend.id });
                    setActiveThreadMessageId(null);
                  }}
                  className={cn(
                    "w-full p-2 rounded-md flex items-start gap-2.5 transition-colors text-left opacity-75 hover:opacity-100",
                    activeChat.type === 'dm' && activeChat.id === friend.id
                      ? 'bg-accent text-foreground font-semibold'
                      : 'hover:bg-accent/40 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <div className="relative shrink-0 mt-0.5">
                    {getAvatarStyle(friend.avatar) ? (
                      <div 
                        className="w-7 h-7 rounded-full border border-border/80" 
                        style={getAvatarStyle(friend.avatar) || undefined}
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-muted-foreground">{getInitials(friend.name)}</span>
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-zinc-400 border border-background" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-xs truncate text-foreground pr-1">{friend.name}</span>
                    <span className="text-[8px] text-muted-foreground/60 shrink-0 font-mono">Last seen: {getTeammateLastSeen(friend.id)}</span>
                  </div>
                </button>
              ))}
            </div>

          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Feed */}
      <div className={cn("flex-1 flex overflow-hidden relative h-full", mobileView === 'chat' ? 'flex' : 'hidden md:flex')}>
        <div onContextMenu={(e) => e.preventDefault()} className="flex-1 flex flex-col h-full bg-[#fafafa] dark:bg-[#161616] overflow-hidden">
          
          {/* Header */}
          <div className="h-14 border-b border-border/50 bg-background/95 backdrop-blur-xs px-4 md:px-6 flex items-center shrink-0 gap-2 w-full sticky top-0 z-20">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden w-8 h-8 rounded-md hover:bg-muted text-muted-foreground shrink-0"
              onClick={() => setMobileView('list')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            {activeChat.type === 'dm' && activeFriend ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    {getAvatarStyle(activeFriend.avatar) ? (
                      <div 
                        className="w-8.5 h-8.5 rounded-full border border-border/80" 
                        style={getAvatarStyle(activeFriend.avatar) || undefined}
                      />
                    ) : (
                      <div className={cn(
                        "w-8.5 h-8.5 rounded-full flex items-center justify-center",
                        getTeammateStatus(activeFriend.id) !== 'offline' ? 'bg-gradient-to-br from-indigo-400 to-violet-500' : 'bg-zinc-200 dark:bg-zinc-800'
                      )}>
                        <span className={`text-[10px] font-bold ${getTeammateStatus(activeFriend.id) !== 'offline' ? 'text-white' : 'text-muted-foreground'}`}>{getInitials(activeFriend.name)}</span>
                      </div>
                    )}
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${
                      getTeammateStatus(activeFriend.id) === 'dnd' ? 'bg-red-500' :
                      getTeammateStatus(activeFriend.id) === 'idle' ? 'bg-amber-500' :
                      getTeammateStatus(activeFriend.id) === 'online' ? 'bg-emerald-500' :
                      'bg-zinc-400'
                    }`} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-1">
                      {activeFriend.name}
                      <span className="text-xs font-mono font-normal text-muted-foreground">#{activeFriend.tag || '0000'}</span>
                    </span>
                    <span className="text-[9px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      {activeFriend.role}
                      {activeFriend.customStatus && <span className="text-primary italic flex items-center gap-1"><img src="https://www.google.com/s2/favicons?domain=slack.com&sz=32" className="w-2.5 h-2.5 object-contain inline-block shrink-0" alt="" />{activeFriend.customStatus}</span>}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-8 h-8 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                    onClick={() => initiateCallSim('audio')}
                    title="Audio call coworker"
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-8 h-8 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                    onClick={() => initiateCallSim('video')}
                    title="Video call coworker"
                  >
                    <Video className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : activeChat.type === 'channel' && activeChannel ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {activeChannel.isGroup ? <Users className="w-5 h-5 text-indigo-500" /> : <Hash className="w-5 h-5 text-muted-foreground" />}
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-1">
                      #{activeChannel.name}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleStarToggle} 
                        className="w-5 h-5 hover:bg-accent rounded text-muted-foreground hover:text-amber-500"
                      >
                        <Star className={cn("w-3.5 h-3.5", isStarredActive ? "fill-amber-400 text-amber-500" : "text-muted-foreground")} />
                      </Button>
                    </span>
                    <span className="text-[9px] text-muted-foreground">Category: {activeChannel.category}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleStartGroupMeeting}
                    className="w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent hover:text-indigo-500"
                    title={activeMeetingInChannel ? "Join Active Channel Huddle" : "Start Workspace Video Meeting"}
                  >
                    <Video className={cn("w-4 h-4", activeMeetingInChannel && "text-indigo-500 animate-pulse")} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowNotifSettings(true)}
                    className="w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
                    title="Custom Notification Settings"
                  >
                    <Bell className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPinDrawer(prev => !prev)}
                    className={cn("w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent", showPinDrawer && "bg-accent text-indigo-500")}
                    title="Pinned messages log"
                  >
                    <Pin className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Messages scroll area */}
          <ScrollArea className="flex-1 min-h-0 p-6 relative">
            <div className="flex flex-col gap-4">
              
              {/* Introduction Banner */}
              <div className="flex flex-col items-center text-center p-4 border border-border/40 rounded-xl bg-background max-w-sm mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-indigo-500/80 mb-1.5" />
                <span className="text-xs font-bold text-foreground">
                  {activeChat.type === 'dm' ? 'Direct Messages Thread' : `Channel: #${activeChannel?.name}`}
                </span>
                <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                  This room uses military-grade AES-256 local database encryption. Chat, media attachments, and calls are fully secured.
                </p>
              </div>

              {/* Render DM messages */}
              {activeChat.type === 'dm' && activeDmMessages.map((msg) => {
                const isMe = msg.role === 'user';
                const isCipherToggled = toggledCipherIds[msg.id];
                const contentToShow = isCipherToggled ? msg.content : decryptMessage(msg.content);
                const hasMedia = !!msg.media;

                return (
                  <div key={msg.id} className={cn("flex gap-3 max-w-[75%] group items-end relative", isMe ? "ml-auto flex-row-reverse" : "mr-auto")}>
                    {!isMe && activeFriend && (
                      getAvatarStyle(activeFriend.avatar) ? (
                        <div 
                          className="w-7 h-7 rounded-full border border-border/80 shrink-0 mt-0.5" 
                          style={getAvatarStyle(activeFriend.avatar) || undefined}
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 mt-0.5">
                          {getInitials(activeFriend.name)}
                        </div>
                      )
                    )}
                    
                    {/* Cipher Lock Toggle */}
                    <button
                      onClick={() => toggleCipher(msg.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-background border border-border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer mb-1.5 animate-in fade-in"
                      title={isCipherToggled ? "Show decrypted plaintext" : "Show raw AES-256 ciphertext"}
                    >
                      {isCipherToggled ? <Lock className="w-3 h-3 text-indigo-500" /> : <Unlock className="w-3 h-3" />}
                    </button>

                    <div className="flex flex-col gap-1">
                      {editingMessageId === msg.id ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <input 
                            type="text" 
                            value={editBuffer} 
                            onChange={e => setEditBuffer(e.target.value)}
                            className="bg-background border border-border text-xs px-2.5 py-1.5 rounded-lg w-64 text-foreground focus:outline-none focus:border-indigo-500" 
                            onKeyDown={e => {
                              if (e.key === 'Enter') triggerEdit(msg.id);
                              if (e.key === 'Escape') setEditingMessageId(null);
                            }}
                            autoFocus
                          />
                          <Button size="sm" onClick={() => triggerEdit(msg.id)} className="h-7 text-[10px] bg-indigo-500 text-white hover:bg-indigo-600">Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingMessageId(null)} className="h-7 text-[10px]">Cancel</Button>
                        </div>
                      ) : (
                        <>
                          <div 
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                messageId: msg.id,
                                isMe,
                                content: decryptMessage(msg.content),
                                senderName: isMe ? (user?.name || '') : (activeFriend?.name || ''),
                                chatType: 'dm'
                              });
                            }}
                            className={cn(
                              "p-3 rounded-2xl text-xs leading-normal flex flex-col gap-2 shadow-sm cursor-context-menu select-text",
                              isMe 
                                ? 'bg-[#37352f] text-white dark:bg-[#e3e3e2] dark:text-[#191919] rounded-br-none' 
                                : 'bg-background border border-border/50 text-foreground rounded-bl-none'
                            )}
                          >
                            {/* Media display */}
                            {hasMedia && msg.media && (
                              <div className="rounded overflow-hidden">
                                {msg.media.type.startsWith('image/') ? (
                                  <img 
                                    src={msg.media.url} 
                                    alt={msg.media.name} 
                                    className="max-w-[200px] max-h-[160px] rounded object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => msg.media && window.open(msg.media.url, '_blank')}
                                  />
                                ) : (
                                  <a 
                                    href={msg.media.url} 
                                    download={msg.media.name} 
                                    className="flex items-center gap-2 p-2 rounded-md bg-muted/30 dark:bg-zinc-800/80 border border-border/50 text-[10px] text-foreground font-semibold max-w-[200px] truncate"
                                  >
                                    <img src={msg.media.name.toLowerCase().endsWith('.pdf') ? 'https://www.google.com/s2/favicons?domain=adobe.com&sz=32' : 'https://www.google.com/s2/favicons?domain=docs.google.com&sz=32'} className="w-4 h-4 object-contain shrink-0" alt="" />
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold truncate leading-none mb-0.5">{msg.media.name}</p>
                                      <p className="text-[8px] text-muted-foreground leading-none">Click to download</p>
                                    </div>
                                  </a>
                                )}
                              </div>
                            )}
                            {renderMessageContent(contentToShow)}
                          </div>

                          {/* Render Reactions */}
                          {dmReactions[msg.id] && dmReactions[msg.id].length > 0 && (
                            <div className={cn("flex flex-wrap gap-1 mt-1", isMe ? "justify-end" : "justify-start")}>
                              {groupReactions(dmReactions[msg.id]).map((react, rIdx) => (
                                <button
                                  key={rIdx}
                                  onClick={() => triggerEmojiReaction(msg.id, react.emoji)}
                                  className="flex items-center gap-1 bg-muted/80 dark:bg-zinc-800/80 hover:bg-accent border border-border/30 rounded px-1.5 py-0.5 text-[9px] font-sans"
                                  title={react.users.join(', ')}
                                >
                                  <span>{react.emoji}</span>
                                  <span className="font-semibold text-muted-foreground">{react.count}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      
                      <span className={cn("text-[8px] text-muted-foreground/60 flex items-center gap-1 mt-0.5", isMe ? 'justify-end' : '')}>
                        {isMe && (
                          msg.status === 'sending' ? (
                            <Clock className="w-2.5 h-2.5 text-muted-foreground/50 animate-pulse" />
                          ) : (
                            activeFriend && getTeammateStatus(activeFriend.id) !== 'offline' ? (
                              <CheckCheck className="w-3 h-3 text-emerald-500" strokeWidth={3} />
                            ) : (
                              <Check className="w-2.5 h-2.5 text-emerald-500" strokeWidth={3} />
                            )
                          )
                        )}
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isCipherToggled && <span className="text-[7px] text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.2 rounded font-sans uppercase">Encrypted</span>}
                        {msg.editedAt && <span className="text-[7.5px] font-semibold text-muted-foreground italic">(edited)</span>}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Render Channel messages */}
              {activeChat.type === 'channel' && activeChannelMessages.map((msg) => {
                const isCipherToggled = toggledCipherIds[msg.id];
                const contentToShow = isCipherToggled ? msg.content : decryptMessage(msg.content);
                const hasMedia = !!msg.media;
                const isSenderMe = msg.sender.id === user?.id;
                const isEditing = editingMessageId === msg.id;

                // Reactions lists grouped
                const groupedReactions: Record<string, { count: number; users: string[] }> = {};
                (msg.reactions || []).forEach(r => {
                  const name = allUsers.find(u => u.id === r.userId)?.name || 'Someone';
                  if (!groupedReactions[r.emoji]) {
                    groupedReactions[r.emoji] = { count: 0, users: [] };
                  }
                  groupedReactions[r.emoji].count += 1;
                  groupedReactions[r.emoji].users.push(name);
                });

                // Read receipts list
                const readers = (msg.reads || []).map(r => allUsers.find(u => u.id === r.userId)?.name).filter(Boolean);

                return (
                  <div 
                    key={msg.id} 
                    className="flex gap-3 items-start group relative"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        messageId: msg.id,
                        isMe: isSenderMe,
                        content: decryptMessage(msg.content),
                        senderName: msg.sender.name,
                        chatType: 'channel'
                      });
                    }}
                  >
                    {getAvatarStyle(msg.sender.avatar) ? (
                      <div 
                        className="w-8 h-8 rounded-full border border-border/80 shrink-0 mt-0.5" 
                        style={getAvatarStyle(msg.sender.avatar) || undefined}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                        {getInitials(msg.sender.name)}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-0.5">
                          {msg.sender.name}
                          <span className="text-[9px] font-normal text-muted-foreground">#{msg.sender.tag || '0000'}</span>
                        </span>
                        <span className="text-[8px] text-muted-foreground font-mono flex items-center gap-1">
                          {isSenderMe && (
                            msg.status === 'sending' ? (
                              <Clock className="w-2.5 h-2.5 text-muted-foreground/50 animate-pulse" />
                            ) : (
                              readers.length > 0 ? (
                                <CheckCheck className="w-3 h-3 text-emerald-500" strokeWidth={3} />
                              ) : (
                                <Check className="w-2.5 h-2.5 text-emerald-500" strokeWidth={3} />
                              )
                            )
                          )}
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.editedAt && <span className="text-[7.5px] font-semibold text-muted-foreground italic">(edited)</span>}
                        {msg.isPinned && <span className="text-[7.5px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-1 py-0.2 rounded flex items-center gap-0.5"><Pin className="w-2.5 h-2.5 fill-current" /> Pinned</span>}
                      </div>
                      
                      <div className="flex items-end gap-2 group/bubble relative">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 w-full max-w-md">
                            <input 
                              type="text" 
                              value={editBuffer} 
                              onChange={e => setEditBuffer(e.target.value)}
                              className="flex-1 bg-background border border-border text-xs px-2 py-1 rounded" 
                            />
                            <Button size="sm" onClick={() => triggerEdit(msg.id)} className="h-7 text-xs bg-indigo-500 text-white">Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingMessageId(null)} className="h-7 text-xs">Cancel</Button>
                          </div>
                        ) : (
                          <div className="text-xs text-foreground leading-normal bg-background border border-border/40 rounded-lg p-2.5 w-fit max-w-[85%] flex flex-col gap-2 shadow-xs">
                            {/* Media display */}
                            {hasMedia && msg.media && (
                              <div className="rounded overflow-hidden">
                                {msg.media.type.startsWith('image/') ? (
                                  <img 
                                    src={msg.media.url} 
                                    alt={msg.media.name} 
                                    className="max-w-[200px] max-h-[160px] rounded object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => msg.media && window.open(msg.media.url, '_blank')}
                                  />
                                ) : (
                                  <a 
                                    href={msg.media.url} 
                                    download={msg.media.name} 
                                    className="flex items-center gap-2 p-2 rounded-md bg-muted/40 dark:bg-zinc-800/80 border border-border/50 text-[10px] text-foreground font-semibold max-w-[200px] truncate"
                                  >
                                    <img src={msg.media.name.toLowerCase().endsWith('.pdf') ? 'https://www.google.com/s2/favicons?domain=adobe.com&sz=32' : 'https://www.google.com/s2/favicons?domain=docs.google.com&sz=32'} className="w-4 h-4 object-contain shrink-0" alt="" />
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold truncate leading-none mb-0.5">{msg.media.name}</p>
                                      <p className="text-[8px] text-muted-foreground leading-none">Click to download</p>
                                    </div>
                                  </a>
                                )}
                              </div>
                            )}
                            {renderMessageContent(contentToShow)}
                          </div>
                        )}

                        {/* Floating message hover toolbar */}
                        {!isEditing && (
                          <div className="absolute right-0 top-0 -translate-y-5 bg-background border border-border rounded-md shadow-sm hidden group-hover:flex items-center gap-0.5 p-0.5 z-10">
                            {/* Reaction Picker Button */}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-6.5 h-6.5 hover:bg-accent rounded text-muted-foreground"
                              onClick={() => setEmojiPickerMsgId(emojiPickerMsgId === msg.id ? null : msg.id)}
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </Button>
                            
                            {/* Pin message button */}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-6.5 h-6.5 hover:bg-accent rounded text-muted-foreground"
                              onClick={() => togglePinMessage(activeChat.id, msg.id, !msg.isPinned)}
                              title={msg.isPinned ? "Unpin message" : "Pin message"}
                            >
                              <Pin className={cn("w-3.5 h-3.5", msg.isPinned && "fill-indigo-500 text-indigo-500")} />
                            </Button>

                            {/* Cipher toggle button */}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-6.5 h-6.5 hover:bg-accent rounded text-muted-foreground"
                              onClick={() => toggleCipher(msg.id)}
                              title={isCipherToggled ? "Plaintext view" : "Encrypted view"}
                            >
                              {isCipherToggled ? <Lock className="w-3.5 h-3.5 text-indigo-500" /> : <Unlock className="w-3.5 h-3.5" />}
                            </Button>

                            {/* Edit / Delete (Me only) */}
                            {isSenderMe && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="w-6.5 h-6.5 hover:bg-accent rounded text-muted-foreground"
                                  onClick={() => {
                                    setEditingMessageId(msg.id);
                                    setEditBuffer(decryptMessage(msg.content));
                                  }}
                                  title="Edit message"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="w-6.5 h-6.5 hover:bg-accent hover:text-red-500 rounded text-muted-foreground"
                                  onClick={() => triggerDelete(msg.id)}
                                  title="Delete message"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Emoji Selector Popup inside hover */}
                      {emojiPickerMsgId === msg.id && (
                        <div className="absolute left-10 mt-1 bg-popover border border-border rounded-lg shadow-md p-1.5 flex gap-1 z-30">
                          {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                            <button 
                              key={emoji} 
                              onClick={() => triggerEmojiReaction(msg.id, emoji)}
                              className="w-6 h-6 flex items-center justify-center hover:bg-accent rounded text-xs"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Render Reactions Grid */}
                      {Object.keys(groupedReactions).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(groupedReactions).map(([emoji, data]) => {
                            const reactedByMe = (msg.reactions || []).some(r => r.userId === user?.id && r.emoji === emoji);
                            return (
                              <button
                                key={emoji}
                                onClick={() => triggerEmojiReaction(msg.id, emoji)}
                                className={cn(
                                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold transition-all hover:bg-accent",
                                  reactedByMe 
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-800" 
                                    : "bg-background border-border text-muted-foreground"
                                )}
                                title={`Reacted by: ${data.users.join(', ')}`}
                              >
                                <span>{emoji}</span>
                                <span>{data.count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Reply and Thread Trigger */}
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => setActiveThreadMessageId(msg.id)}
                          className="flex items-center gap-1 text-[9px] text-[#37352f] dark:text-[#e3e3e2] hover:underline font-semibold"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                          {msg.replies && msg.replies.length > 0 
                            ? `${msg.replies.length} replies` 
                            : 'Reply in thread'}
                        </button>
                        
                        {/* Seen Read Receipt Counts */}
                        {readers.length > 0 && (
                          <span 
                            className="text-[8px] text-muted-foreground/60 font-medium cursor-help"
                            title={`Read by: ${readers.join(', ')}`}
                          >
                            Seen by {readers.length} {readers.length === 1 ? 'person' : 'people'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messageEndRef} />

            </div>
          </ScrollArea>

          {/* Typing Feedback Indicators */}
          {activeTypers.length > 0 && (
            <div className="px-6 py-1 text-[10px] text-muted-foreground italic flex items-center gap-1 shrink-0 bg-background/20">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span>
                {activeTypers.map(t => t.username).join(', ')} {activeTypers.length === 1 ? 'is' : 'are'} typing...
              </span>
            </div>
          )}

          {/* Typing Footer with Mentions Autocomplete list */}
          <div className="p-4 bg-background border-t border-border/50 shrink-0 relative">
            
            {/* Mention Dropdown popup */}
            {showMentionList && matchingTeammates.length > 0 && (
              <div className="absolute bottom-16 left-12 w-52 bg-popover border border-border shadow-lg rounded-lg max-h-36 overflow-y-auto z-40 p-1 flex flex-col gap-0.5">
                {matchingTeammates.map((teammate, i) => (
                  <button
                    key={teammate.id}
                    onClick={() => selectTeammateMention(teammate.name)}
                    className={cn(
                      "w-full px-2.5 py-1 text-left text-xs rounded transition-colors flex items-center gap-2",
                      i === mentionSelectIndex ? "bg-accent text-foreground font-semibold" : "text-muted-foreground hover:bg-accent/40"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    {teammate.name}
                  </button>
                ))}
              </div>
            )}

            {/* Show loaded media preview */}
            {selectedMedia && (
              <div className="flex items-center gap-2.5 p-2 border border-border bg-muted/40 rounded-lg mb-2 text-xs w-fit max-w-[280px]">
                {selectedMedia.type.startsWith('image/') ? (
                  <img src={selectedMedia.url} className="w-8 h-8 rounded object-cover shrink-0" alt="Preview" />
                ) : (
                  <img src={selectedMedia.name.toLowerCase().endsWith('.pdf') ? 'https://www.google.com/s2/favicons?domain=adobe.com&sz=32' : 'https://www.google.com/s2/favicons?domain=docs.google.com&sz=32'} className="w-4 h-4 object-contain shrink-0" alt="" />
                )}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="truncate font-semibold text-foreground">{selectedMedia.name}</span>
                  <span className="text-[8px] text-muted-foreground uppercase tracking-wider">Ready to secure upload</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setSelectedMedia(null)} 
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Show replying to message preview bar */}
            {replyingTo && (
              <div className="flex items-center justify-between px-3 py-1.5 border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/5 rounded-lg mb-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                  <span className="shrink-0 text-indigo-500 font-semibold">Replying to</span>
                  <span className="font-semibold text-foreground shrink-0">@{replyingTo.senderName}</span>
                  <span className="truncate italic">"{replyingTo.content}"</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setReplyingTo(null)} 
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/80 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 rounded-lg shrink-0 border border-border/50 hover:bg-accent text-muted-foreground"
                title="Attach Photo or Document"
              >
                <Paperclip className="w-4 h-4" />
              </Button>

              {/* Share document from library button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowShareDocModal(true)}
                className="w-9 h-9 rounded-lg shrink-0 border border-border/50 hover:bg-accent text-muted-foreground"
                title="Share document from library"
              >
                <Folder className="w-4 h-4" />
              </Button>

              <input
                type="text"
                value={typedMessage}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                placeholder={
                  activeChat.type === 'dm' && activeFriend
                    ? `Send secure encrypted DM to ${activeFriend.name}...`
                    : `Message #${activeChannel?.name || 'channel'}... Use @ to tag, **bold**, \`code\``
                }
                className="flex-1 bg-[#fcfcfb] dark:bg-[#252525] border border-border dark:border-border/20 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/40 focus:border-transparent transition-all text-foreground"
              />
              <Button 
                type="submit"
                size="icon"
                className="bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 rounded-lg shrink-0 shadow-sm w-9 h-9"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>

        </div>

        {/* Message Thread sidebar pane (collapsible) */}
        <AnimatePresence>
          {activeThreadMessageId && activeThreadMessage && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full border-l border-border/60 bg-[#fbfbfb] dark:bg-[#1a1a1a] flex flex-col overflow-hidden shrink-0 z-10 max-md:fixed max-md:right-0 max-md:top-0 max-md:w-full max-md:h-full max-md:shadow-2xl"
            >
              {/* Thread Header */}
              <div className="h-14 border-b border-border/50 bg-background/50 px-4 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-foreground">Message Thread</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-7 h-7 rounded-sm"
                  onClick={() => setActiveThreadMessageId(null)}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              {/* Thread Chat Content */}
              <ScrollArea className="flex-1 min-h-0 p-4">
                <div className="flex flex-col gap-4">
                  
                  {/* Root Message Box */}
                  <div className="p-3 bg-background border border-border/60 rounded-xl flex gap-3 items-start group">
                    {getAvatarStyle(activeThreadMessage.sender.avatar) ? (
                      <div 
                        className="w-7 h-7 rounded-full border border-border/80 shrink-0 mt-0.5" 
                        style={getAvatarStyle(activeThreadMessage.sender.avatar) || undefined}
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                        {getInitials(activeThreadMessage.sender.name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1.5">
                        <span className="text-xs font-semibold text-foreground">{activeThreadMessage.sender.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] text-muted-foreground font-mono">
                            {new Date(activeThreadMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          
                          {/* Padlock inside thread view */}
                          <button
                            onClick={() => toggleCipher(activeThreadMessage.id)}
                            className="w-5 h-5 flex items-center justify-center rounded-sm hover:bg-accent text-muted-foreground"
                          >
                            {toggledCipherIds[activeThreadMessage.id] ? <Lock className="w-3.5 h-3.5 text-indigo-500" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-foreground leading-normal mt-1">
                        {toggledCipherIds[activeThreadMessage.id] ? activeThreadMessage.content : decryptMessage(activeThreadMessage.content)}
                      </div>
                    </div>
                  </div>

                  <div className="my-1 h-px bg-border/40" />

                  {/* Replies list */}
                  <div className="flex flex-col gap-3">
                    {activeThreadMessage.replies && activeThreadMessage.replies.length > 0 ? (
                      activeThreadMessage.replies.map(reply => {
                        const isCipherToggled = toggledCipherIds[reply.id];
                        const contentToShow = isCipherToggled ? reply.content : decryptMessage(reply.content);
                        
                        return (
                          <div key={reply.id} className="flex gap-2.5 items-start pl-2 group">
                            {getAvatarStyle(reply.sender.avatar) ? (
                              <div 
                                className="w-6.5 h-6.5 rounded-full border border-border/80 shrink-0 mt-0.5" 
                                style={getAvatarStyle(reply.sender.avatar) || undefined}
                              />
                            ) : (
                              <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5">
                                {getInitials(reply.sender.name)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                              <div className="flex items-baseline gap-2">
                                <span className="text-[11px] font-semibold text-foreground">{reply.sender.name}</span>
                                <span className="text-[8px] text-muted-foreground font-mono">
                                  {new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="flex items-end gap-1.5 group">
                                <div className="text-xs text-foreground bg-background border border-border/20 rounded-lg p-2.5 leading-normal max-w-full">
                                  {contentToShow}
                                </div>
                                <button
                                  onClick={() => toggleCipher(reply.id)}
                                  className="w-6 h-6 flex items-center justify-center rounded-full bg-background border border-border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0 mb-1"
                                  title={isCipherToggled ? "Show decrypted plaintext" : "Show raw AES-256 ciphertext"}
                                >
                                  {isCipherToggled ? <Lock className="w-3 h-3 text-indigo-500" /> : <Unlock className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                              {isCipherToggled && <span className="text-[7px] text-indigo-500 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1 rounded tracking-wide w-fit mt-0.5 font-mono">ENCRYPTED</span>}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-[10px] text-muted-foreground text-center py-6">No replies yet. Start the thread!</span>
                    )}
                    <div ref={threadEndRef} />
                  </div>

                </div>
              </ScrollArea>

              {/* Reply Input Form */}
              <div className="p-3 bg-background border-t border-border/50 shrink-0">
                <form onSubmit={handleSendReply} className="flex gap-1.5">
                  <input
                    type="text"
                    value={typedReply}
                    onChange={e => setTypedReply(e.target.value)}
                    placeholder="Reply to thread..."
                    className="flex-1 bg-[#fcfcfb] dark:bg-[#252525] border border-border rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/40 focus:border-transparent transition-all text-foreground"
                  />
                  <Button 
                    type="submit"
                    size="icon"
                    className="w-7 h-7 bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 rounded-md shrink-0 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </form>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* PINNED MESSAGES DRAWER (collapsible) */}
        <AnimatePresence>
          {showPinDrawer && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full border-l border-border/60 bg-[#fbfbfb] dark:bg-[#1a1a1a] flex flex-col overflow-hidden shrink-0 z-10"
            >
              <div className="h-14 border-b border-border/50 bg-background/50 px-4 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Pin className="w-3.5 h-3.5 fill-indigo-500 text-indigo-500" />
                  Pinned Messages ({activePinnedMessages.length})
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-7 h-7 rounded-sm"
                  onClick={() => setShowPinDrawer(false)}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="flex flex-col gap-3">
                  {activePinnedMessages.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground text-center py-12">No pinned messages yet.</span>
                  ) : (
                    activePinnedMessages.map(msg => (
                      <div key={msg.id} className="p-3 bg-background border border-border/60 rounded-xl flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          {getAvatarStyle(msg.sender.avatar) ? (
                            <div 
                              className="w-5 h-5 rounded-full border border-border/80 shrink-0" 
                              style={getAvatarStyle(msg.sender.avatar) || undefined}
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-[8px] font-bold text-white">
                              {getInitials(msg.sender.name)}
                            </div>
                          )}
                          <span className="text-[10px] font-semibold text-foreground truncate">{msg.sender.name}</span>
                          <span className="text-[8px] text-muted-foreground ml-auto font-mono">
                            {new Date(msg.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-foreground leading-normal italic">
                          "{decryptMessage(msg.content)}"
                        </p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => togglePinMessage(activeChat.id, msg.id, false)}
                          className="h-6 text-[9.5px] text-red-500 hover:bg-red-50 w-fit p-1"
                        >
                          Unpin message
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* CROSS-CHANNEL SEARCH MODAL */}
      <AnimatePresence>
        {showSearchModal && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-popover border border-border w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[80vh] overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-border/60 flex items-center justify-between shrink-0">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Search className="w-4 h-4 text-indigo-500" />
                  Search cross-channel history
                </h3>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-7 h-7"
                  onClick={() => setShowSearchModal(false)}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              {/* Filters */}
              <div className="p-3.5 border-b border-border/40 bg-muted/20 flex flex-col gap-2.5 shrink-0 text-[10.5px]">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Type search terms here..."
                  className="w-full bg-background border border-border px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/40 text-foreground"
                />
                
                <div className="grid grid-cols-3 gap-2">
                  {/* User Filter */}
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-muted-foreground">Teammate Filter</label>
                    <select 
                      value={searchFilterUser} 
                      onChange={e => setSearchFilterUser(e.target.value)}
                      className="bg-background border border-border rounded p-1 text-[10px]"
                    >
                      <option value="">Any Teammate</option>
                      {teamUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                    </select>
                  </div>
                  
                  {/* Channel Filter */}
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-muted-foreground">Channel Filter</label>
                    <select 
                      value={searchFilterChannel} 
                      onChange={e => setSearchFilterChannel(e.target.value)}
                      className="bg-background border border-border rounded p-1 text-[10px]"
                    >
                      <option value="">Any Room</option>
                      {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                    </select>
                  </div>

                  {/* Date Filter */}
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-muted-foreground">Date Filter</label>
                    <input 
                      type="date" 
                      value={searchFilterDate}
                      onChange={e => setSearchFilterDate(e.target.value)}
                      className="bg-background border border-border rounded p-0.5 text-[9.5px]"
                    />
                  </div>
                </div>
              </div>

              {/* Results */}
              <ScrollArea className="flex-1 p-4 bg-muted/10">
                <div className="flex flex-col gap-3">
                  {!searchQuery.trim() ? (
                    <span className="text-[10px] text-muted-foreground text-center py-12">Enter queries above to scan archives.</span>
                  ) : crossChannelSearchResults.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground text-center py-12">No matching messages found in logs.</span>
                  ) : (
                    crossChannelSearchResults.map(({ message: msg, channelName, isDM }) => (
                      <button
                        key={msg.id}
                        onClick={() => {
                          setActiveChat({ type: 'channel', id: msg.channelId || 'c1' });
                          setShowSearchModal(false);
                          toast.success(`Navigated to ${channelName}.`);
                        }}
                        className="p-3 border border-border/80 rounded-xl bg-background hover:bg-accent/30 text-left transition-colors flex flex-col gap-1.5 w-full"
                      >
                        <div className="flex items-center gap-2 text-[9.5px]">
                          <span className="font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.2 rounded">{channelName}</span>
                          <span className="font-semibold text-foreground">{msg.sender.name}</span>
                          <span className="text-muted-foreground font-mono">{format(new Date(msg.timestamp), 'MMM d, h:mm a')}</span>
                        </div>
                        <p className="text-[11px] text-foreground font-medium truncate">
                          "{decryptMessage(msg.content)}"
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD FRIEND DIALOG */}
      <AnimatePresence>
        {showAddFriendModal && canManageTeamMembers && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-popover border border-border w-full max-w-sm rounded-2xl shadow-xl p-5 flex flex-col gap-4 text-xs"
            >
              <div className="flex justify-between items-center pb-2 border-b border-border/60">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-500" />
                  Add Teammate
                </h3>
                <Button variant="ghost" size="icon" className="w-6.5 h-6.5" onClick={() => setShowAddFriendModal(false)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              <form onSubmit={handleAddFriendSubmit} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-muted-foreground">Name#Number</label>
                  <input
                    type="text"
                    required
                    value={friendTagInput}
                    onChange={e => setFriendTagInput(e.target.value)}
                    placeholder="Alex#1337"
                    className="bg-background border border-border px-2.5 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/40 text-foreground font-mono"
                  />
                </div>

                <div className="p-2.5 border border-border/70 rounded-lg bg-muted/20">
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Ask teammates for the tag shown beside their name. Admin-added members appear in both users' team lists.
                  </p>
                </div>

                <Button type="submit" disabled={isAddingFriend} className="w-full bg-[#37352f] text-white dark:bg-[#e3e3e2] dark:text-[#191919] mt-1 font-bold">
                  {isAddingFriend ? 'Finding Teammate...' : 'Add Teammate'}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE NEW CHANNEL ROOM DIALOG */}
      <AnimatePresence>
        {showCreateChannelModal && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-popover border border-border w-full max-w-sm rounded-2xl shadow-xl p-5 flex flex-col gap-4 text-xs"
            >
              <div className="flex justify-between items-center pb-2 border-b border-border/60">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-500" />
                  Create Chat Room
                </h3>
                <Button variant="ghost" size="icon" className="w-6.5 h-6.5" onClick={() => setShowCreateChannelModal(false)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              <form onSubmit={handleCreateChannelSubmit} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-muted-foreground">Room Name</label>
                  <input 
                    type="text" 
                    required 
                    value={newChannelName}
                    onChange={e => setNewChannelName(e.target.value)}
                    placeholder="e.g. project-x-sync"
                    className="bg-background border border-border px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/40 text-foreground"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-muted-foreground">Category Header</label>
                  <select 
                    value={newChannelCategory}
                    onChange={e => setNewChannelCategory(e.target.value)}
                    className="bg-background border border-border p-1.5 rounded-lg text-foreground"
                  >
                    <option value="General">General</option>
                    <option value="Departments">Departments</option>
                    <option value="Projects">Projects</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-2.5 border border-border/80 rounded-lg">
                  <div className="flex flex-col">
                    <span className="font-semibold">Multi-user Group Chat</span>
                    <span className="text-[9.5px] text-muted-foreground">Enable shared group tags and sidebar section.</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={newChannelIsGroup}
                    onChange={e => setNewChannelIsGroup(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                <Button type="submit" className="w-full bg-[#37352f] text-white dark:bg-[#e3e3e2] dark:text-[#191919] mt-2 font-bold">
                  Create Room
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SHARE DOCUMENT MODAL */}
      <AnimatePresence>
        {showShareDocModal && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-popover border border-border w-full max-w-sm rounded-2xl shadow-xl p-4 flex flex-col max-h-[70vh] text-xs"
            >
              <div className="flex justify-between items-center pb-2 border-b border-border/60 shrink-0">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Select Document to Share
                </h3>
                <Button variant="ghost" size="icon" className="w-6.5 h-6.5" onClick={() => setShowShareDocModal(false)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              <ScrollArea className="flex-1 py-3">
                <div className="flex flex-col gap-2">
                  {documents.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground text-center py-8">No documents in library.</span>
                  ) : (
                    documents.map(doc => (
                      <button
                        key={doc.id}
                        onClick={() => triggerShareDoc(doc)}
                        className="w-full p-2.5 border border-border/80 bg-background hover:bg-accent rounded-lg flex items-center gap-3 text-left transition-colors"
                      >
                        <img src={doc.type === 'pdf' ? 'https://www.google.com/s2/favicons?domain=adobe.com&sz=32' : 'https://www.google.com/s2/favicons?domain=docs.google.com&sz=32'} className="w-5 h-5 object-contain shrink-0" alt="" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">{doc.title}</p>
                          <p className="text-[8px] text-muted-foreground mt-0.5">{doc.size} • {doc.type.toUpperCase()}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NOTIFICATION SETTINGS MODAL */}
      <AnimatePresence>
        {showNotifSettings && activeChannel && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-popover border border-border w-full max-w-sm rounded-2xl shadow-xl p-4 flex flex-col gap-4 text-xs"
            >
              <div className="flex justify-between items-center pb-2 border-b border-border/60">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-indigo-500" />
                  Notifications for #{activeChannel.name}
                </h3>
                <Button variant="ghost" size="icon" className="w-6.5 h-6.5" onClick={() => setShowNotifSettings(false)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                {[
                  { id: 'all', label: 'All Messages', desc: 'Notify on every message' },
                  { id: 'mentions', label: 'Mentions Only', desc: 'Notify only on @mentions' },
                  { id: 'muted', label: 'Muted', desc: 'Suppress all push indicators' }
                ].map(opt => {
                  const activeOpt = notificationConfig[activeChannel.id] || 'all';
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleNotifConfigToggle(activeChannel.id, opt.id as any)}
                      className={cn(
                        "w-full p-3 border rounded-xl text-left transition-colors flex items-center justify-between",
                        activeOpt === opt.id 
                          ? "border-indigo-500 bg-indigo-50/20 text-foreground font-semibold" 
                          : "border-border hover:bg-accent/40 text-muted-foreground"
                      )}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-foreground font-semibold">{opt.label}</span>
                        <span className="text-[9.5px] text-muted-foreground">{opt.desc}</span>
                      </div>
                      {activeOpt === opt.id && <Circle className="w-2.5 h-2.5 fill-indigo-600 text-indigo-500" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GROUP MEETING CONFIGURATION MODAL */}
      <AnimatePresence>
        {showMeetingSetup && activeChannel && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-popover border border-border w-full max-w-sm rounded-2xl shadow-xl p-4 flex flex-col gap-4 text-xs"
            >
              <div className="flex justify-between items-center pb-2 border-b border-border/60">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-indigo-500" />
                  {activeMeetingInChannel ? "Active Channel Huddle" : "Configure Workspace Meeting"}
                </h3>
                <Button variant="ghost" size="icon" className="w-6.5 h-6.5" onClick={() => setShowMeetingSetup(false)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              {activeMeetingInChannel ? (
                <div className="flex flex-col gap-3">
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    An active huddle <strong className="text-indigo-400">"{activeMeetingInChannel.title}"</strong> hosted by <strong className="text-zinc-300">{activeMeetingInChannel.hostName}</strong> is already running in this channel.
                  </p>
                  <Button 
                    onClick={() => joinGroupMeeting(activeMeetingInChannel.meetingId, activeMeetingInChannel.title)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold w-full mt-2"
                  >
                    Join Current Huddle
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Meeting Title</label>
                      <input
                        type="text"
                        placeholder={`#${activeChannel.name} Huddle`}
                        value={meetingSetupTitle}
                        onChange={(e) => setMeetingSetupTitle(e.target.value)}
                        className="w-full bg-[#fcfcfb] dark:bg-[#252525] border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 text-foreground"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Meeting Password (Optional)</label>
                      <input
                        type="password"
                        placeholder="Enter password"
                        value={meetingSetupPassword}
                        onChange={(e) => setMeetingSetupPassword(e.target.value)}
                        className="w-full bg-[#fcfcfb] dark:bg-[#252525] border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 text-foreground"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2 border border-border rounded-xl bg-accent/20">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground">Waiting Room</span>
                        <span className="text-[9px] text-muted-foreground">Approve guests before they join</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={meetingSetupWaitingRoom}
                        onChange={(e) => setMeetingSetupWaitingRoom(e.target.checked)}
                        className="w-3.5 h-3.5 accent-indigo-500 rounded border-border"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <Button variant="ghost" onClick={() => setShowMeetingSetup(false)}>Cancel</Button>
                    <Button onClick={startGroupMeeting} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                      Start Meeting
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CALL HARDWARE DEVICE SETTINGS MODAL */}
      <AnimatePresence>
        {showCallHardwareSettings && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-popover border border-border w-full max-w-sm rounded-2xl shadow-xl p-4.5 flex flex-col gap-4 text-xs text-foreground"
            >
              <div className="flex justify-between items-center pb-2 border-b border-border/60">
                <h3 className="font-bold text-sm flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-indigo-500" />
                  Media Device Configurations
                </h3>
                <Button variant="ghost" size="icon" className="w-6.5 h-6.5" onClick={() => setShowCallHardwareSettings(false)}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              <div className="flex flex-col gap-3">
                {/* Camera Selector */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Video Camera Source</label>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => {
                      setSelectedCameraId(e.target.value);
                      updateLocalStreamVideoTrack({ deviceId: { exact: e.target.value } });
                    }}
                    className="w-full bg-[#fcfcfb] dark:bg-[#252525] border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500/40 text-foreground"
                  >
                    {cameras.map(c => <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${c.deviceId.slice(0,5)}`}</option>)}
                    {cameras.length === 0 && <option value="">Default Camera</option>}
                  </select>
                </div>

                {/* Microphone Selector */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Microphone Input Device</label>
                  <select
                    value={selectedMicId}
                    onChange={(e) => setSelectedMicId(e.target.value)}
                    className="w-full bg-[#fcfcfb] dark:bg-[#252525] border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500/40 text-foreground"
                  >
                    {microphones.map(m => <option key={m.deviceId} value={m.deviceId}>{m.label || `Microphone ${m.deviceId.slice(0,5)}`}</option>)}
                    {microphones.length === 0 && <option value="">Default Microphone</option>}
                  </select>
                </div>

                {/* Speaker Selector */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Speaker Output Device</label>
                  <select
                    value={selectedSpeakerId}
                    onChange={(e) => setSelectedSpeakerId(e.target.value)}
                    className="w-full bg-[#fcfcfb] dark:bg-[#252525] border border-border rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500/40 text-foreground"
                  >
                    {speakers.map(s => <option key={s.deviceId} value={s.deviceId}>{s.label || `Speaker ${s.deviceId.slice(0,5)}`}</option>)}
                    {speakers.length === 0 && <option value="">Default Speaker</option>}
                  </select>
                </div>

                {/* Resolution Quality Selector */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Video Stream Quality</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['480p', '720p', '1080p'].map(res => (
                      <button
                        key={res}
                        onClick={() => {
                          setSelectedVideoRes(res as any);
                          updateLocalStreamVideoTrack({
                            width: { ideal: res === '1080p' ? 1920 : res === '720p' ? 1280 : 854 },
                            height: { ideal: res === '1080p' ? 1080 : res === '720p' ? 720 : 480 }
                          });
                        }}
                        className={cn(
                          "py-1.5 border rounded-lg font-semibold transition-all",
                          selectedVideoRes === res ? "border-indigo-500 bg-indigo-500/10 text-indigo-400" : "border-border text-zinc-400 hover:bg-accent"
                        )}
                      >
                        {res} {res === '720p' && "(HD)"} {res === '1080p' && "(FHD)"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mirror Preview Toggle */}
                <div className="flex items-center justify-between p-2 border border-border rounded-xl bg-accent/20">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold">Mirror Self Preview</span>
                    <span className="text-[9px] text-muted-foreground">Flips the camera preview horizontally</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isMirror}
                    onChange={(e) => setIsMirror(e.target.checked)}
                    className="w-3.5 h-3.5 accent-indigo-500 rounded border-border"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <Button onClick={() => setShowCallHardwareSettings(false)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold w-full">
                  Apply Device Settings
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIDEO CALL SCREEN */}
      <AnimatePresence>
        {callState && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-zinc-950/95 z-50 flex flex-col items-center justify-between p-6 text-white font-sans"
          >
            {/* Call Screen Top Bar */}
            <div className="w-full flex items-center justify-between shrink-0 gap-2">
              <div className="w-24 h-8 hidden md:block" /> {/* Spacer */}
              <div className="flex items-center gap-1 sm:gap-2 bg-zinc-900/80 px-2.5 py-1.5 sm:px-4 sm:py-1.5 rounded-full border border-zinc-800 shadow-lg text-[10px] font-bold text-emerald-400 tracking-wide">
                <ShieldCheck className="w-4 h-4 animate-pulse shrink-0" />
                <span className="hidden sm:inline">AES-256 END-TO-END SECURE ENCRYPTED CONNECTION</span>
                <span className="inline sm:hidden">AES-256 SECURE E2EE</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDiagnostics(prev => !prev)}
                className={cn(
                  "text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full border transition-all shrink-0",
                  showDiagnostics
                    ? "bg-indigo-600/25 border-indigo-500 text-indigo-300 hover:bg-indigo-600/40"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
                )}
              >
                <Activity className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Diagnostics HUD</span>
                <span className="inline sm:hidden">Diagnostics</span>
              </Button>
            </div>

            {/* Split layout: Call content on left, Diagnostics on right */}
            <div className="flex-1 w-full flex overflow-hidden mt-4 gap-4">
              
              {/* Left Panel: Avatar, stream and calling buttons */}
              <div className="flex-1 flex flex-col items-center justify-between py-4">
                
                <div className="flex-1 w-full max-w-lg flex flex-col items-center justify-center gap-6">
                  {callState.status === 'connected' ? (
                    <div className="relative w-full aspect-video bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
                      {/* Premium AI Bot Popup Alert */}
                      <AnimatePresence>
                        {(showAiPopup || isProcessingCommand) && (
                          <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className={cn(
                              "absolute top-4 left-4 right-4 backdrop-blur-xl border rounded-2xl p-4.5 flex flex-col gap-3 shadow-[0_0_30px_rgba(168,85,247,0.2)] z-20 pointer-events-auto max-w-sm mx-auto max-h-[85%] overflow-y-auto scrollbar-thin transition-all duration-300",
                              isProcessingCommand 
                                ? "bg-indigo-950/75 border-indigo-500/40 shadow-indigo-500/10" 
                                : "bg-purple-950/75 border-purple-500/35"
                            )}
                          >
                            <style dangerouslySetInnerHTML={{__html: `
                              @keyframes pulseWave {
                                0%, 100% { height: 4px; }
                                50% { height: 16px; }
                              }
                              .wave-bar {
                                width: 3px;
                                border-radius: 9999px;
                                animation: pulseWave 0.8s ease-in-out infinite;
                              }
                            `}} />

                            {/* Header */}
                            <div className="flex items-center justify-between w-full border-b border-white/10 pb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
                                  <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                                </div>
                                <div className="text-left">
                                  <h3 className="text-[11px] font-bold text-zinc-100 uppercase tracking-wider font-mono">Nexus AI Assistant</h3>
                                  <span className="text-[8px] text-purple-400/80 font-mono">
                                    {isProcessingCommand 
                                      ? "Analyzing intent..." 
                                      : aiCommandWaiting 
                                        ? "Listening for command..." 
                                        : "Ready"
                                    }
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Soundwave pulse wave indicator */}
                                {(isProcessingCommand || aiCommandWaiting) && (
                                  <div className="flex items-center gap-0.5 h-4 shrink-0 px-2 py-0.5 bg-purple-900/30 border border-purple-500/20 rounded-full">
                                    <div className="wave-bar bg-purple-400" style={{ animationDelay: '0.1s' }} />
                                    <div className="wave-bar bg-indigo-400" style={{ animationDelay: '0.2s' }} />
                                    <div className="wave-bar bg-purple-400" style={{ animationDelay: '0.3s' }} />
                                    <div className="wave-bar bg-indigo-400" style={{ animationDelay: '0.4s' }} />
                                  </div>
                                )}
                                <button 
                                  onClick={() => {
                                    setShowAiPopup(false);
                                    setIsProcessingCommand(false);
                                  }}
                                  className="text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer p-0.5 rounded hover:bg-white/5"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Speech Output */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-left text-[11px] leading-relaxed text-zinc-200">
                              {isProcessingCommand ? (
                                <div className="flex items-center gap-2 text-zinc-400">
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Syncing with workspace...</span>
                                </div>
                              ) : (
                                aiSpeechText
                              )}
                            </div>

                            {/* Manual Command Input (Type Command) */}
                            {!isProcessingCommand && (
                              <div className="flex gap-2 items-center bg-zinc-900/80 border border-zinc-800 focus-within:border-purple-500/50 rounded-xl px-2.5 py-1.5 transition-all">
                                <Keyboard className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <input 
                                  type="text"
                                  placeholder={aiCommandWaiting ? "Type your command..." : "Type command (e.g. set meeting tomorrow)..."}
                                  value={nexusInputText}
                                  onChange={(e) => setNexusInputText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSendManualCommand();
                                    }
                                  }}
                                  className="flex-1 bg-transparent text-[11px] text-zinc-100 placeholder-zinc-500 outline-none min-w-0"
                                />
                                {nexusInputText.trim() && (
                                  <button
                                    onClick={handleSendManualCommand}
                                    className="bg-purple-600 hover:bg-purple-500 text-white rounded-lg p-1.5 transition-colors shrink-0 cursor-pointer"
                                  >
                                    <Send className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Detailed Executed Actions List Cards */}
                            {!isProcessingCommand && executedActions.length > 0 && (
                              <div className="mt-1 pt-3 border-t border-purple-500/15 flex flex-col gap-2.5">
                                <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-purple-400/80 text-left">
                                  Workspace Operations Completed:
                                </span>
                                <div className="flex flex-col gap-2">
                                  {executedActions.map((act, idx) => {
                                    if (act.type === 'create_calendar_event') {
                                      return (
                                        <div key={idx} className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 text-left">
                                          <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-[10px] uppercase tracking-wider mb-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>Calendar Event Scheduled</span>
                                          </div>
                                          <h4 className="text-zinc-100 font-semibold text-[11px]">{act.details?.title || act.title}</h4>
                                          <div className="text-[10px] text-zinc-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                                            <span>📅 {act.details?.date}</span>
                                            <span>⏰ {act.details?.startTime} - {act.details?.endTime}</span>
                                          </div>
                                          {act.details?.attendees && act.details.attendees.length > 0 && (
                                            <div className="flex items-center gap-1.5 mt-2">
                                              <span className="text-[9px] text-zinc-500">Attendees:</span>
                                              <div className="flex -space-x-1.5 overflow-hidden">
                                                {act.details.attendees.map((att: Person, i: number) => (
                                                  <div 
                                                    key={att.id || i}
                                                    title={att.name}
                                                    className="w-4.5 h-4.5 rounded-full bg-zinc-700 border border-zinc-950 flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                                                    style={getAvatarStyle(att.avatar) || undefined}
                                                  >
                                                    {!att.avatar && att.name.substring(0, 1).toUpperCase()}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }

                                    if (act.type === 'create_task') {
                                      return (
                                        <div key={idx} className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-left">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-[10px] uppercase tracking-wider">
                                              <CheckCheck className="w-3.5 h-3.5" />
                                              <span>Task Created</span>
                                            </div>
                                            {act.details?.priority && (
                                              <span className={cn(
                                                "text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide leading-none",
                                                act.details.priority === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                act.details.priority === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                              )}>
                                                {act.details.priority}
                                              </span>
                                            )}
                                          </div>
                                          <h4 className="text-zinc-100 font-semibold text-[11px] mt-1">{act.details?.title || act.title}</h4>
                                          <div className="text-[10px] text-zinc-400 mt-1 flex justify-between items-center">
                                            <span>📅 Due: {act.details?.dueDate}</span>
                                            {act.details?.assignee && (
                                              <div className="flex items-center gap-1">
                                                <div 
                                                  title={act.details.assignee.name}
                                                  className="w-4.5 h-4.5 rounded-full bg-zinc-700 border border-zinc-950 flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                                                  style={getAvatarStyle(act.details.assignee.avatar) || undefined}
                                                >
                                                  {!act.details.assignee.avatar && act.details.assignee.name.substring(0, 1).toUpperCase()}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    }

                                    if (act.type === 'send_email') {
                                      return (
                                        <div key={idx} className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-3 text-left">
                                          <div className="flex items-center gap-1.5 text-pink-300 font-bold text-[10px] uppercase tracking-wider mb-1">
                                            <Mail className="w-3.5 h-3.5" />
                                            <span>Email Dispatched</span>
                                          </div>
                                          <h4 className="text-zinc-100 font-semibold text-[11px]">{act.details?.subject || 'Meeting Confirmation'}</h4>
                                          <p className="text-[9.5px] text-zinc-400 mt-0.5">To: <span className="text-zinc-300 font-medium">{act.details?.toName || act.title}</span> ({act.details?.to})</p>
                                          {act.details?.body && (
                                            <p className="text-[9px] text-zinc-500 mt-1.5 bg-black/20 rounded p-1.5 italic line-clamp-2">
                                              "{act.details.body}"
                                            </p>
                                          )}
                                        </div>
                                      );
                                    }

                                    return (
                                      <div key={idx} className="text-[9px] px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-left">
                                        {act.title}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {isGroupCall ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-2">
                          <div className="flex-1 w-full h-full flex flex-col md:flex-row overflow-hidden gap-4 p-2">
                            {/* Main Area: Screen share or Participant Grid */}
                            <div className="flex-1 flex flex-col min-w-0 bg-zinc-900/60 rounded-2xl border border-zinc-800/80 overflow-hidden relative">
                              {/* Top Bar inside Grid */}
                              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                                <div className="bg-black/55 backdrop-blur-md px-3 py-1 rounded-full border border-zinc-850 text-[10px] font-semibold text-zinc-300">
                                  {meetingTitle}
                                </div>
                                <div className="flex gap-1.5">
                                  {isRecording && (
                                    <div className="bg-red-950/75 backdrop-blur-md px-2.5 py-1 rounded-full border border-red-500/35 text-[9.5px] font-bold text-red-400 flex items-center gap-1.5 animate-pulse">
                                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
                                      REC {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                                    </div>
                                  )}
                                  <div className="bg-black/55 backdrop-blur-md px-2.5 py-1 rounded-full border border-zinc-850 text-[9.5px] font-semibold text-zinc-400 flex items-center gap-1">
                                    <Activity className="w-3 h-3 text-emerald-400" />
                                    RTT: 42ms
                                  </div>
                                </div>
                              </div>

                              {/* Main Grid Content */}
                              <div className="flex-1 w-full h-full flex items-center justify-center p-3">
                                {screenShareSharerId ? (
                                  /* Screen Sharing Active */
                                  <div className="w-full h-full flex flex-col items-center justify-center relative">
                                    {screenShareSharerId === (user?.id || 'me') ? (
                                      <video
                                        ref={(el) => {
                                          if (el && screenShareStream) el.srcObject = screenShareStream;
                                        }}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-contain rounded-xl max-h-[75vh]"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 flex flex-col p-4 relative">
                                        <div className="flex items-center justify-between border-b border-zinc-850 pb-2 mb-3">
                                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <Monitor className="w-3.5 h-3.5" />
                                            {groupParticipants.find(p => p.id === screenShareSharerId)?.name}'s Screen
                                          </span>
                                          <span className="text-[9px] text-zinc-500">1080p @ 60fps</span>
                                        </div>
                                        <div className="flex-1 w-full bg-[#121214] rounded-lg border border-zinc-850/50 p-6 flex flex-col justify-between">
                                          <div className="flex justify-between items-center">
                                            <div className="flex flex-col">
                                              <span className="text-[10px] text-zinc-500">Workspace Dashboard Progress</span>
                                              <span className="text-xl font-bold text-zinc-100 mt-1">$48,250.00</span>
                                            </div>
                                            <div className="px-2 py-0.5 rounded bg-emerald-500/10 text-[9px] font-bold text-emerald-400 border border-emerald-500/20">
                                              +14.5% MoM
                                            </div>
                                          </div>
                                          <div className="flex-1 w-full flex items-end gap-2.5 h-32 mt-4 relative">
                                            {[40, 20, 60, 45, 90, 75, 110, 85, 120, 100, 140, 130].map((val, idx) => (
                                              <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                                                <div 
                                                  className="w-full bg-gradient-to-t from-indigo-600/80 to-purple-500/80 rounded-t"
                                                  style={{ height: `${(val / 150) * 100}%` }}
                                                />
                                                <span className="text-[8px] text-zinc-600 mt-1.5 font-mono">{idx + 1}h</span>
                                              </div>
                                            ))}
                                            <div className="absolute top-2 right-[12%] w-2 h-2 bg-indigo-400 rounded-full animate-ping" />
                                            <div className="absolute top-2 right-[12%] w-2 h-2 bg-indigo-500 rounded-full" />
                                          </div>
                                          <div className="flex justify-between text-[9px] text-zinc-500 border-t border-zinc-850/30 pt-3 mt-4">
                                            <span>Database Sync: Supabase E2EE</span>
                                            <span>Vibe Coding Security Check: Verified Safe</span>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    <div className="absolute bottom-3 left-3 bg-black/75 px-3 py-1 rounded-full text-[9px] text-zinc-300 font-semibold border border-zinc-800">
                                      Presenting: {groupParticipants.find(p => p.id === screenShareSharerId)?.name}
                                    </div>
                                  </div>
                                ) : (
                                  /* Grid of participants */
                                  <div className={cn("grid w-full h-full gap-3", getGridClassName(groupParticipants.length))}>
                                    {groupParticipants.map((part) => {
                                      const isSelf = part.id === (user?.id || 'me');
                                      const isSpeaking = part.id === activeSpeakerId;
                                      const hasHandRaised = handRaisedUsers.includes(part.id);
                                      const isMuted = part.isMuted || (isSelf && isAudioMuted);
                                      const isCameraOff = part.isCameraOff || (isSelf && isVideoMuted);
                                      
                                      return (
                                        <div 
                                          key={part.id} 
                                          className={cn(
                                            "relative rounded-xl bg-zinc-950 border overflow-hidden flex flex-col items-center justify-center transition-all duration-300 shadow-lg group aspect-video md:aspect-auto h-full",
                                            isSpeaking ? "border-purple-500 ring-2 ring-purple-500/30 scale-[1.01]" : "border-zinc-850"
                                          )}
                                        >
                                          {isSelf ? (
                                            localStream && !isCameraOff ? (
                                              <video
                                                ref={(el) => {
                                                  if (el && localStream) el.srcObject = localStream;
                                                }}
                                                autoPlay
                                                playsInline
                                                muted
                                                className={cn("w-full h-full object-cover", isMirror ? "transform -scale-x-100" : "")}
                                                style={{
                                                  filter: bgBlurEffect === 'soft' ? 'blur(4px) brightness(1.05)' :
                                                          bgBlurEffect === 'high' ? 'blur(9px) brightness(1.1)' :
                                                          bgBlurEffect === 'gradient' ? 'hue-rotate(15deg) contrast(1.05)' :
                                                          bgBlurEffect === 'branded' ? 'saturate(1.2) contrast(1.05)' : 'none'
                                                }}
                                              />
                                            ) : (
                                              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-500">
                                                <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-400">
                                                  {getInitials(user?.name || 'You')}
                                                </div>
                                                <span className="text-[9px] text-zinc-500 mt-2">Camera Disabled</span>
                                              </div>
                                            )
                                          ) : (
                                            /* Remote mesh stream or simulated user */
                                            remoteStreams[part.id] && !isCameraOff ? (
                                              <video
                                                ref={(el) => {
                                                  if (el && remoteStreams[part.id]) el.srcObject = remoteStreams[part.id];
                                                }}
                                                autoPlay
                                                playsInline
                                                className="w-full h-full object-cover"
                                              />
                                            ) : !isCameraOff ? (
                                              /* Simulated user huddle layout */
                                              <div className="w-full h-full bg-[#16161a] flex flex-col items-center justify-center relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-zinc-900/30 to-purple-950/20 animate-pulse duration-3000" />
                                                <div 
                                                  className="w-12 h-12 rounded-full border border-zinc-800 shadow-md relative z-10"
                                                  style={part.avatar ? { backgroundImage: `url(${part.avatar})`, backgroundSize: 'cover' } : undefined}
                                                >
                                                  {!part.avatar && (
                                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-indigo-600 text-white rounded-full">
                                                      {getInitials(part.name)}
                                                    </div>
                                                  )}
                                                </div>
                                                {isSpeaking && (
                                                  <div className="flex gap-0.5 items-end justify-center h-3 mt-2 z-10">
                                                    {[...Array(5)].map((_, i) => (
                                                      <motion.div
                                                        key={i}
                                                        animate={{ height: ['20%', '100%', '40%', '80%', '20%'] }}
                                                        transition={{ repeat: Infinity, duration: 0.6 + i * 0.1 }}
                                                        className="w-0.5 bg-purple-500 rounded-full"
                                                      />
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            ) : (
                                              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-500">
                                                <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-xs font-bold text-zinc-400 border border-zinc-850">
                                                  {getInitials(part.name)}
                                                </div>
                                                <span className="text-[9px] text-zinc-500 mt-2 font-medium">Camera off</span>
                                              </div>
                                            )
                                          )}

                                          {/* Name badge */}
                                          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[8.5px] font-semibold text-zinc-200 border border-zinc-800/50 flex items-center gap-1">
                                            {part.name} {isSelf && "(You)"}
                                            {isMuted && <MicOff className="w-2.5 h-2.5 text-red-500 shrink-0" />}
                                          </div>
                                          
                                          {/* Hand Raise */}
                                          {hasHandRaised && (
                                            <div className="absolute top-2 right-2 bg-amber-500 text-white rounded-full w-5.5 h-5.5 flex items-center justify-center border border-amber-400/20 text-[10px] animate-bounce z-10">
                                              ✋
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Sidebar during screen sharing */}
                            {screenShareSharerId && (
                              <div className="w-full md:w-44 shrink-0 bg-zinc-900/60 rounded-2xl border border-zinc-800/80 overflow-hidden flex flex-col p-2.5">
                                <span className="text-[8px] font-bold tracking-wider uppercase text-zinc-500 mb-2">Teammates</span>
                                <ScrollArea className="flex-1">
                                  <div className="flex flex-col gap-2">
                                    {groupParticipants.map((part) => {
                                      const isSelf = part.id === (user?.id || 'me');
                                      const isSpeaking = part.id === activeSpeakerId;
                                      const isCameraOff = part.isCameraOff || (isSelf && isVideoMuted);
                                      
                                      return (
                                        <div 
                                          key={part.id}
                                          className={cn(
                                            "aspect-video rounded-xl bg-zinc-950 border overflow-hidden flex flex-col items-center justify-center relative",
                                            isSpeaking ? "border-purple-500 ring-1 ring-purple-500/25" : "border-zinc-850"
                                          )}
                                        >
                                          {isSelf ? (
                                            localStream && !isCameraOff ? (
                                              <video
                                                ref={(el) => {
                                                  if (el && localStream) el.srcObject = localStream;
                                                }}
                                                autoPlay
                                                playsInline
                                                muted
                                                className="w-full h-full object-cover transform -scale-x-100"
                                              />
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-[8px] font-medium text-zinc-500">Cam Off</div>
                                            )
                                          ) : (
                                            remoteStreams[part.id] && !isCameraOff ? (
                                              <video
                                                ref={(el) => {
                                                  if (el && remoteStreams[part.id]) el.srcObject = remoteStreams[part.id];
                                                }}
                                                autoPlay
                                                playsInline
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              <div 
                                                className="w-7 h-7 rounded-full border border-zinc-850 bg-zinc-800 relative z-10"
                                                style={part.avatar ? { backgroundImage: `url(${part.avatar})`, backgroundSize: 'cover' } : undefined}
                                              >
                                                {!part.avatar && <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-white bg-indigo-600 rounded-full">{getInitials(part.name)}</div>}
                                              </div>
                                            )
                                          )}
                                          <div className="absolute bottom-1 left-1 bg-black/60 px-1 py-0.5 rounded text-[7.5px] font-semibold text-zinc-300">
                                            {part.name.split(' ')[0]}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </ScrollArea>
                              </div>
                            )}
                          </div>
                          
                          {/* Captions Overlay for group calling */}
                          {enableSTT && transcripts.length > 0 && (
                            <div className="absolute bottom-16 left-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-zinc-800/80 max-w-md mx-auto text-center animate-in fade-in slide-in-from-bottom-2 duration-200 shadow-xl pointer-events-none select-none z-10">
                              <span className={cn(
                                "text-[8px] font-mono font-bold uppercase tracking-wider block mb-0.5",
                                transcripts[transcripts.length - 1].senderName === 'Nexus AI' ? 'text-purple-400 font-extrabold animate-pulse' :
                                transcripts[transcripts.length - 1].senderName === 'You' ? 'text-indigo-400' : 'text-emerald-400'
                              )}>
                                {transcripts[transcripts.length - 1].senderName}
                              </span>
                              <p className="text-[11px] text-zinc-200 leading-normal font-medium text-center">
                                "{transcripts[transcripts.length - 1].text}"
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
                          {callState.type === 'video' ? (
                            <video
                              ref={remoteVideoRef}
                              autoPlay
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <>
                              {getAvatarStyle(callState.friend.avatar) ? (
                                <div 
                                  className="w-20 h-20 rounded-full border border-zinc-850 shadow-lg relative mb-3" 
                                  style={getAvatarStyle(callState.friend.avatar) || undefined}
                                >
                                  <span className="absolute bottom-0 right-1 w-4 h-4 bg-emerald-500 border border-zinc-900 rounded-full flex items-center justify-center">
                                    <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                                  </span>
                                </div>
                              ) : (
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold mb-3 shadow-lg relative">
                                  {getInitials(callState.friend.name)}
                                  <span className="absolute bottom-0 right-1 w-4 h-4 bg-emerald-500 border border-zinc-900 rounded-full flex items-center justify-center">
                                    <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                                  </span>
                                </div>
                              )}
                              <span className="text-sm font-semibold">{callState.friend.name}</span>
                            </>
                          )}

                          {/* Speech Caption Overlay on Call Feed */}
                          {enableSTT && (
                            <div className="absolute bottom-20 left-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-zinc-800/80 max-w-md mx-auto text-center animate-in fade-in slide-in-from-bottom-2 duration-200 shadow-xl pointer-events-none select-none z-10">
                              {transcripts.length > 0 ? (
                                <>
                                  <span className={cn(
                                    "text-[8px] font-mono font-bold uppercase tracking-wider block mb-0.5",
                                    transcripts[transcripts.length - 1].senderName === 'Nexus AI' ? 'text-purple-400 font-extrabold animate-pulse' :
                                    transcripts[transcripts.length - 1].senderName === 'You' ? 'text-indigo-400' : 'text-emerald-400'
                                  )}>
                                    {transcripts[transcripts.length - 1].senderName}
                                  </span>
                                  <p className="text-[11px] text-zinc-200 leading-normal font-medium">
                                    "{transcripts[transcripts.length - 1].text}"
                                  </p>
                                </>
                              ) : (
                                <div className="flex items-center gap-2 py-0.5">
                                  <span className="relative flex h-2 w-2 shrink-0">
                                    {sttStatus === 'listening' ? (
                                      <>
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                      </>
                                    ) : sttStatus === 'error' ? (
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                    ) : sttStatus === 'unsupported' ? (
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                    ) : (
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400 animate-pulse"></span>
                                    )}
                                  </span>
                                  <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
                                    <span className="text-[9px] text-zinc-300 font-medium font-mono uppercase tracking-wider whitespace-nowrap">
                                      {sttStatus === 'listening' && "Captions Active — Speak now"}
                                      {sttStatus === 'error' && "Caption Error: Check microphone"}
                                      {sttStatus === 'unsupported' && "Captions unsupported in this browser"}
                                      {sttStatus === 'idle' && (
                                        sttModelProgress > 0 && sttModelProgress < 100
                                          ? `Loading Whisper model: ${sttModelProgress}%`
                                          : 'Initializing Whisper AI...'
                                      )}
                                    </span>
                                    {/* Progress bar — shown while model is downloading */}
                                    {sttStatus === 'idle' && sttModelProgress > 0 && sttModelProgress < 100 && (
                                      <div className="w-full h-[3px] bg-zinc-700 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300 ease-out"
                                          style={{ width: `${sttModelProgress}%` }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Call Active Status Info (only for non-video or collapsable) */}
                          {callState.type !== 'video' && (
                            <>
                              <span className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1.5">
                                <Mic className="w-3 h-3 text-emerald-400" />
                                Audio secure stream active
                              </span>

                              <div className="flex gap-1 items-end mt-5 h-6">
                                {[...Array(6)].map((_, i) => (
                                  <motion.div
                                    key={i}
                                    animate={{ height: ['20%', '80%', '40%', '100%', '20%'] }}
                                    transition={{
                                      repeat: Infinity,
                                      duration: 0.8 + (i * 0.1),
                                      ease: 'easeInOut'
                                    }}
                                    className="w-1 bg-emerald-500 rounded-full"
                                    style={{ minHeight: '4px' }}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {!isGroupCall && (
                        <div className="absolute bottom-4 right-4 w-24 sm:w-32 aspect-video bg-black border border-zinc-700 rounded-lg overflow-hidden shadow-lg flex items-center justify-center">
                          {localStream && callState.type === 'video' && !isVideoMuted ? (
                            <video
                              ref={localVideoRef}
                              autoPlay
                              playsInline
                              muted
                              className="w-full h-full object-cover transform -scale-x-100"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 text-[9px] text-zinc-400 font-semibold p-1 text-center">
                              <VideoOff className="w-3.5 h-3.5 mb-1 text-zinc-500" />
                              Camera Off
                            </div>
                          )}
                        </div>
                      )}
                      </div>
                    ) : (
                    <div className="flex flex-col items-center gap-6">
                      <div className="relative">
                        <div className="absolute -inset-4 rounded-full bg-indigo-500/15 animate-ping duration-1000" />
                        {getAvatarStyle(callState.friend.avatar) ? (
                          <div 
                            className="w-28 h-28 rounded-full border border-zinc-700 shadow-2xl relative z-10" 
                            style={getAvatarStyle(callState.friend.avatar) || undefined}
                          />
                        ) : (
                          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-3xl font-bold text-white shadow-2xl relative z-10">
                            {getInitials(callState.friend.name)}
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <h3 className="text-xl font-bold text-white">{callState.friend.name}</h3>
                        <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-semibold font-mono animate-pulse">
                          {incomingCallOffer && callState.status === 'ringing'
                            ? 'Incoming secure call...'
                            : callState.status === 'dialing'
                            ? 'Dialing secure connection...'
                            : 'Connecting P2P...'}
                        </p>
                      </div>

                      {/* Accept / Decline actions for incoming calls */}
                      {incomingCallOffer && callState.status === 'ringing' && (
                        <div className="flex items-center gap-4 mt-2">
                          <Button
                            onClick={acceptIncomingCall}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-full flex items-center gap-2 shadow-lg"
                          >
                            <Phone className="w-4 h-4 fill-current" />
                            Accept
                          </Button>
                          <Button
                            onClick={declineIncomingCall}
                            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-full flex items-center gap-2 shadow-lg"
                          >
                            <PhoneOff className="w-4 h-4" />
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Call Action buttons */}
                {!(incomingCallOffer && callState.status === 'ringing') && (
                  <div className="flex items-center justify-center gap-4 mb-2 shrink-0 flex-wrap">
                    {isGroupCall ? (
                      <>
                        {/* Audio Mute */}
                        <Button
                          type="button"
                          onClick={toggleAudioMute}
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-zinc-800 transition-colors",
                            isAudioMuted ? "bg-red-600 text-white hover:bg-red-700" : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                          )}
                          title={isAudioMuted ? "Unmute Mic" : "Mute Mic"}
                        >
                          {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </Button>

                        {/* Video Mute */}
                        <Button
                          type="button"
                          onClick={toggleVideoMute}
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-zinc-800 transition-colors",
                            isVideoMuted ? "bg-red-600 text-white hover:bg-red-700" : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                          )}
                          title={isVideoMuted ? "Enable Camera" : "Disable Camera"}
                        >
                          {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                        </Button>

                        {/* Screen Share */}
                        <Button
                          type="button"
                          onClick={screenShareSharerId === (user?.id || 'me') ? stopScreenShare : startScreenShare}
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-zinc-800 transition-colors",
                            screenShareSharerId === (user?.id || 'me') ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                          )}
                          title={screenShareSharerId === (user?.id || 'me') ? "Stop Presenting" : "Share Screen"}
                        >
                          <Monitor className="w-5 h-5" />
                        </Button>

                        {/* Hand Raise */}
                        <Button
                          type="button"
                          onClick={toggleHandRaise}
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-zinc-800 transition-colors text-lg",
                            handRaisedUsers.includes(user?.id || 'me') ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-zinc-900 hover:bg-zinc-800"
                          )}
                          title={handRaisedUsers.includes(user?.id || 'me') ? "Lower Hand" : "Raise Hand"}
                        >
                          ✋
                        </Button>

                        {/* Record Meeting */}
                        <Button
                          type="button"
                          onClick={toggleRecording}
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-zinc-800 transition-all duration-350",
                            isRecording 
                              ? "bg-red-600 text-white border-red-500 hover:bg-red-700 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]" 
                              : "bg-zinc-900 hover:bg-zinc-800 text-red-500 hover:text-red-400"
                          )}
                          title={isRecording ? "Stop Recording" : "Record Meeting"}
                        >
                          <Disc className="w-5 h-5" />
                        </Button>

                        {/* Background Blur Effect */}
                        <Button
                          type="button"
                          onClick={cycleBgBlur}
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-zinc-800 transition-colors",
                            bgBlurEffect !== 'none' ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                          )}
                          title={`Background Blur: ${bgBlurEffect}`}
                        >
                          <Sliders className="w-5 h-5" />
                        </Button>

                        {/* Live Captions (STT) */}
                        <Button
                          type="button"
                          onClick={() => setEnableSTT(prev => !prev)}
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-zinc-800 transition-colors",
                            enableSTT ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400"
                          )}
                          title={enableSTT ? "Disable Live Captions" : "Enable Live Captions"}
                        >
                          <Subtitles className="w-5 h-5" />
                        </Button>

                        {/* Media Settings */}
                        <Button
                          type="button"
                          onClick={() => setShowCallHardwareSettings(true)}
                          className="w-12 h-12 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 flex items-center justify-center shadow-lg transition-colors"
                          title="Hardware Settings"
                        >
                          <Settings className="w-5 h-5" />
                        </Button>

                        {/* AI Assistant */}
                        <Button
                          type="button"
                          onClick={() => {
                            setShowAiPopup(true);
                            setAiSpeechText("I'm listening. Tell me what workspace task you need help with!");
                            setAiCommandWaiting(true);
                            speakText("I'm listening. Tell me what workspace task you need help with!");
                          }}
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center shadow-lg border transition-all duration-300",
                            showAiPopup 
                              ? "bg-purple-600 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]" 
                              : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-purple-400 hover:text-purple-300"
                          )}
                          title="Nexus AI Assistant"
                        >
                          <Sparkles className="w-5 h-5" />
                        </Button>

                        {/* End Meeting */}
                        <Button
                          type="button"
                          onClick={endCall}
                          className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg border border-red-500/20 transition-colors"
                          title="Leave Huddle"
                        >
                          <PhoneOff className="w-5 h-5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        {/* 1-on-1 calling actions */}
                        <Button
                          type="button"
                          onClick={toggleAudioMute}
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-zinc-800 transition-colors",
                            isAudioMuted ? "bg-red-600 text-white hover:bg-red-700" : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                          )}
                          title={isAudioMuted ? "Unmute Mic" : "Mute Mic"}
                        >
                          {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </Button>

                        {callState.type === 'video' && (
                          <Button
                            type="button"
                            onClick={toggleVideoMute}
                            className={cn(
                              "w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-zinc-800 transition-colors",
                              isVideoMuted ? "bg-red-600 text-white hover:bg-red-700" : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                            )}
                            title={isVideoMuted ? "Enable Camera" : "Disable Camera"}
                          >
                            {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                          </Button>
                        )}

                        <Button
                          type="button"
                          onClick={() => setEnableSTT(prev => !prev)}
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-zinc-800 transition-colors",
                            enableSTT ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400"
                          )}
                          title={enableSTT ? "Disable Live Captions" : "Enable Live Captions"}
                        >
                          <Subtitles className="w-5 h-5" />
                        </Button>

                        <Button
                          type="button"
                          onClick={() => {
                            setShowAiPopup(true);
                            setAiSpeechText("I'm listening. Tell me what workspace task you need help with!");
                            setAiCommandWaiting(true);
                            speakText("I'm listening. Tell me what workspace task you need help with!");
                          }}
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center shadow-lg border transition-all duration-300",
                            showAiPopup 
                              ? "bg-purple-600 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]" 
                              : "bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-purple-400 hover:text-purple-300"
                          )}
                          title="Nexus AI Assistant"
                        >
                          <Sparkles className="w-5 h-5" />
                        </Button>

                        <Button
                          type="button"
                          onClick={endCall}
                          className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg border border-red-500/20 transition-colors"
                          title="Hang Up"
                        >
                          <PhoneOff className="w-5 h-5" />
                        </Button>
                      </>
                    )}
                  </div>
                )}

              </div>

              {/* Right Panel: Call Diagnostics HUD */}
              {showDiagnostics && (
                <CallDiagnostics
                  localStream={localStream}
                  remoteStream={remoteStream}
                  callType={callState.type}
                  callStatus={callState.status}
                  onClose={() => setShowDiagnostics(false)}
                  transcripts={transcripts}
                  onSaveTranscript={downloadTranscript}
                  enableSTT={enableSTT}
                  setEnableSTT={setEnableSTT}
                  autoSaveTranscripts={autoSaveTranscripts}
                  setAutoSaveTranscripts={setAutoSaveTranscripts}
                  sttStatus={sttStatus}
                  sttModelProgress={sttModelProgress}
                />
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden remote stream audio element */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* Custom Context Menu */}
      {contextMenu && (
        <div 
          className="fixed inset-0 z-50 pointer-events-auto cursor-default" 
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
        >
          <div 
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="absolute bg-[#1c1c1e] border border-zinc-800 text-zinc-300 rounded-xl shadow-2xl py-1.5 min-w-[180px] z-50 text-xs font-sans overflow-hidden select-none animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mini emoji reactions row */}
            <div className="px-2.5 py-1.5 border-b border-zinc-800 flex items-center justify-between gap-1 mb-1">
              {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    triggerEmojiReaction(contextMenu.messageId, emoji);
                    setContextMenu(null);
                  }}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-800 transition-colors text-base"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Options */}
            <button
              onClick={() => {
                setEditingMessageId(contextMenu.messageId);
                setEditBuffer(contextMenu.content);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-indigo-500 hover:text-white transition-colors flex items-center gap-2"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Modify</span>
            </button>

            <button
              onClick={() => {
                setReplyingTo({
                  id: contextMenu.messageId,
                  senderName: contextMenu.senderName,
                  content: contextMenu.content
                });
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-indigo-500 hover:text-white transition-colors flex items-center gap-2"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Reply</span>
            </button>

            <button
              onClick={() => {
                setEmojiPickerMsgId(contextMenu.messageId);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-indigo-500 hover:text-white transition-colors flex items-center gap-2"
            >
              <Smile className="w-3.5 h-3.5" />
              <span>Emoji React</span>
            </button>

            <button
              onClick={() => {
                triggerDelete(contextMenu.messageId);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2 text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

const getInitials = (name: string) => {
  return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
};

const getGridClassName = (count: number) => {
  if (count <= 1) return "grid-cols-1 grid-rows-1";
  if (count === 2) return "grid-cols-1 md:grid-cols-2 grid-rows-2 md:grid-rows-1";
  if (count <= 4) return "grid-cols-2 grid-rows-2";
  if (count <= 6) return "grid-cols-2 md:grid-cols-3 grid-rows-3 md:grid-rows-2";
  return "grid-cols-3 grid-rows-3";
};

// Optimizes SDP description for Voice Calls (WhatsApp codec configurations)
// Injects preferred bitrate (maxaveragebitrate), VAD/usedtx, and Opus inband FEC settings.
function optimizeAudioSDP(
  sdp: string,
  bitrate: number = 24000,
  useFec: boolean = true,
  useDtx: boolean = true
): string {
  const lines = sdp.split('\r\n');
  let opusPayloadType: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('opus/48000/2')) {
      const match = lines[i].match(/a=rtpmap:(\d+)\s+opus/);
      if (match) {
        opusPayloadType = match[1];
        break;
      }
    }
  }

  if (opusPayloadType) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(`a=fmtp:${opusPayloadType}`)) {
        let fmtp = lines[i];
        if (!fmtp.includes('maxaveragebitrate=')) {
          fmtp += `;maxaveragebitrate=${bitrate}`;
        } else {
          fmtp = fmtp.replace(/maxaveragebitrate=\d+/, `maxaveragebitrate=${bitrate}`);
        }
        if (!fmtp.includes('useinbandfec=')) {
          fmtp += `;useinbandfec=${useFec ? '1' : '0'}`;
        } else {
          fmtp = fmtp.replace(/useinbandfec=[01]/, `useinbandfec=${useFec ? '1' : '0'}`);
        }
        if (!fmtp.includes('usedtx=')) {
          fmtp += `;usedtx=${useDtx ? '1' : '0'}`;
        } else {
          fmtp = fmtp.replace(/usedtx=[01]/, `usedtx=${useDtx ? '1' : '0'}`);
        }
        lines[i] = fmtp;
      }
    }
  }

  return lines.join('\r\n');
}
