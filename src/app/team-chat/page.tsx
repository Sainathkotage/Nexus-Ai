'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useWorkspace, decryptMessage, encryptMessage } from '@/lib/store';
import { usePopup } from '@/lib/popup-context';
import { supabase } from '@/lib/supabase';
import { Person, ChatMessage, Channel, ChannelMessage, MessageReaction, MessageRead } from '@/types';
import { 
  Send, Users, MessageSquare, Clock, ShieldCheck, Check, CheckCheck, 
  Search, Circle, MessageCircle, Hash, ChevronRight, X,
  Paperclip, Phone, Video, Lock, Unlock, Mic, MicOff,
  VideoOff, Shield, PhoneOff, Star, Pin, Smile, Trash2, Edit3,
  Sparkles, FileText, ArrowRight, ArrowLeft, Bell, Volume2, AlertCircle, Plus, Folder, UserPlus,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
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
    setActivePage,
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
    clearMentionBadge
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
  const [transcripts, setTranscripts] = useState<Array<{ senderName: string; text: string; timestamp: string }>>([]);
  
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

  // Sync call state ref for listener callbacks
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // Sync transcription settings to storage
  useEffect(() => {
    localStorage.setItem('nexus_enable_transcription', enableSTT.toString());
    enableSTTRef.current = enableSTT;
    if (callStateRef.current && callStateRef.current.status === 'connected') {
      if (enableSTT) {
        startTranscription();
      } else {
        stopTranscription();
      }
    }
  }, [enableSTT]);

  useEffect(() => {
    localStorage.setItem('nexus_auto_save_transcripts', autoSaveTranscripts.toString());
  }, [autoSaveTranscripts]);

  const startTranscription = () => {
    if (typeof window === 'undefined') return;
    if (!enableSTTRef.current) return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition is not supported in this browser.");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isRecognitionActiveRef.current = true;
    };

    recognition.onend = () => {
      isRecognitionActiveRef.current = false;
      // Restart if call is connected
      if (callStateRef.current && callStateRef.current.status === 'connected' && enableSTTRef.current) {
        try {
          recognition.start();
        } catch (e) {}
      }
    };

    recognition.onerror = (event: any) => {
      console.error("SpeechRecognition error:", event.error);
      if (event.error === 'not-allowed') {
        toast.error("Microphone permission denied for captions.");
        setEnableSTT(false);
      }
    };

    let lastFinalText = '';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const text = finalTranscript || interimTranscript;
      if (!text.trim()) return;

      const now = format(new Date(), 'HH:mm:ss');
      
      setTranscripts(prev => {
        const list = [...prev];
        const lastIdx = list.map(e => e.senderName).lastIndexOf('You');
        
        if (lastIdx !== -1 && list[lastIdx].text === lastFinalText) {
          list[lastIdx] = { senderName: 'You', text: text.trim(), timestamp: now };
        } else {
          list.push({ senderName: 'You', text: text.trim(), timestamp: now });
        }
        
        if (finalTranscript) {
          lastFinalText = text.trim();
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
            data: { text: text.trim(), timestamp: now, isFinal: !!finalTranscript }
          }
        });
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error("Error starting SpeechRecognition:", e);
    }
  };

  const stopTranscription = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    isRecognitionActiveRef.current = false;
  };

  const downloadTranscript = () => {
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
    
    const blob = new Blob([docContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexus_transcript_${partnerName.replace(/\s+/g, '_')}_${dateStr}.txt`;
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
    setActivePage('team-chat');
    clearMentionBadge();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [setActivePage, clearMentionBadge]);

  // Scroll to bottom on message/thread updates
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [teamMessages, channelMessages, activeChat]);

  useEffect(() => {
    if (activeThreadMessageId) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [channelMessages, activeThreadMessageId]);

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
        if (payload.targetUserId !== user.id) return;

        const { signalType, fromUserId, data } = payload;

        switch (signalType) {
          case 'offer':
            const caller = allUsersRef.current.find(u => u.id === fromUserId);
            if (caller) {
              setIncomingCallOffer(data);
              setActiveCallPartnerId(fromUserId);
              setCallState({
                isActive: true,
                type: 'audio',
                status: 'ringing',
                friend: caller,
              });
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
            // Partner sent real-time local transcript updates
            const partnerName = callStateRef.current?.friend?.name || 'Partner';
            const partnerNow = data.timestamp || format(new Date(), 'HH:mm:ss');
            
            setTranscripts(prev => {
              const list = [...prev];
              const lastIdx = list.map(e => e.senderName).lastIndexOf(partnerName);
              
              if (lastIdx !== -1) {
                list[lastIdx] = { senderName: partnerName, text: data.text, timestamp: partnerNow };
              } else {
                list.push({ senderName: partnerName, text: data.text, timestamp: partnerNow });
              }
              return list;
            });
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
        const [, senderName, originalText, remainingText] = match;
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
          emoji: emojiStr,
        };
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

    if (transcripts.length > 0) {
      try {
        const historyStr = localStorage.getItem('nexus_transcripts_archive');
        const history = historyStr ? JSON.parse(historyStr) : [];
        const partnerName = callStateRef.current?.friend?.name || 'Teammate';
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

    setTranscripts([]);

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    setRemoteStream(null);
    setShowDiagnostics(false);
    setCallState(null);
    setIncomingCallOffer(null);
    setActiveCallPartnerId(null);
    setIsAudioMuted(false);
    setIsVideoMuted(false);
    iceCandidatesQueue.current = [];
  };

  const endCall = () => {
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
        <ScrollArea className="flex-1 py-2 text-xs">
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
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center">
                      <span className="text-[9px] font-bold text-white">{getInitials(friend.name)}</span>
                    </div>
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
                    <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                      <span className="text-[9px] font-bold text-muted-foreground">{getInitials(friend.name)}</span>
                    </div>
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
          <div className="h-14 border-b border-border/50 bg-background/50 px-4 md:px-6 flex items-center shrink-0 gap-2 w-full">
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
                    <div className={cn(
                      "w-8.5 h-8.5 rounded-full flex items-center justify-center",
                      getTeammateStatus(activeFriend.id) !== 'offline' ? 'bg-gradient-to-br from-indigo-400 to-violet-500' : 'bg-zinc-200 dark:bg-zinc-800'
                    )}>
                      <span className={`text-[10px] font-bold ${getTeammateStatus(activeFriend.id) !== 'offline' ? 'text-white' : 'text-muted-foreground'}`}>{getInitials(activeFriend.name)}</span>
                    </div>
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
          <ScrollArea className="flex-1 p-6 relative">
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
                      <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 mt-0.5">
                        {getInitials(activeFriend.name)}
                      </div>
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
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                      {getInitials(msg.sender.name)}
                    </div>
                    
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
              <ScrollArea className="flex-1 p-4">
                <div className="flex flex-col gap-4">
                  
                  {/* Root Message Box */}
                  <div className="p-3 bg-background border border-border/60 rounded-xl flex gap-3 items-start group">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                      {getInitials(activeThreadMessage.sender.name)}
                    </div>
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
                            <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5">
                              {getInitials(reply.sender.name)}
                            </div>
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
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-[8px] font-bold text-white">
                            {getInitials(msg.sender.name)}
                          </div>
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
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold mb-3 shadow-lg relative">
                              {getInitials(callState.friend.name)}
                              <span className="absolute bottom-0 right-1 w-4 h-4 bg-emerald-500 border border-zinc-900 rounded-full flex items-center justify-center">
                                <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                              </span>
                            </div>
                            <span className="text-sm font-semibold">{callState.friend.name}</span>
                          </>
                        )}

                        {/* Speech Caption Overlay on Call Feed */}
                        {enableSTT && transcripts.length > 0 && (
                          <div className="absolute bottom-20 left-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-zinc-800/80 max-w-md mx-auto text-center animate-in fade-in slide-in-from-bottom-2 duration-200 shadow-xl pointer-events-none select-none z-10">
                            <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-indigo-400 block mb-0.5">
                              {transcripts[transcripts.length - 1].senderName}
                            </span>
                            <p className="text-[11px] text-zinc-200 leading-normal font-medium">
                              "{transcripts[transcripts.length - 1].text}"
                            </p>
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

                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-6">
                      <div className="relative">
                        <div className="absolute -inset-4 rounded-full bg-indigo-500/15 animate-ping duration-1000" />
                        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-3xl font-bold text-white shadow-2xl relative z-10">
                          {getInitials(callState.friend.name)}
                        </div>
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
                  <div className="flex items-center gap-6 mb-2 shrink-0">
                    <Button
                      type="button"
                      onClick={toggleAudioMute}
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-zinc-800 transition-colors",
                        isAudioMuted ? "bg-red-600 text-white hover:bg-red-700" : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
                      )}
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
                      >
                        {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                      </Button>
                    )}

                    <Button
                      type="button"
                      onClick={endCall}
                      className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg border border-red-500/20 transition-colors"
                    >
                      <PhoneOff className="w-5 h-5" />
                    </Button>
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
