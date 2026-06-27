'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useWorkspace } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, PhoneOff, 
  Copy, Check, Info, Settings, ShieldCheck, Activity 
} from 'lucide-react';
import CallDiagnostics from '@/components/chat/call-diagnostics';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { AnimatePresence } from 'motion/react';

// Public STUN and free TURN servers configuration
const iceConfig = {
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
};

export default function MeetingRoom() {
  const { roomId } = useParams() as { roomId: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const { user, allUsers } = useWorkspace();
  
  // Media streams state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  
  // Audio / Video control states
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // Sidebar / Diagnostics HUD state
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Room participants list
  const [participants, setParticipants] = useState<Array<{ id: string; name: string; role?: string }>>([]);
  
  // Call duration state
  const [callDuration, setCallDuration] = useState(0);

  // WebRTC Peer Connections mapping
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const roomChannelRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Track if this user is the "initiator" or host (first to join the room)
  const [isHost, setIsHost] = useState(false);

  // 1. Initial local media stream setup
  useEffect(() => {
    if (!user) return;

    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1
          },
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }
        });
        
        setLocalStream(stream);
        localStreamRef.current = stream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Initialize Signaling Channel once local media is ready
        initSignalingChannel(stream);
      } catch (err) {
        console.error('Failed to access media devices:', err);
        toast.error('Could not access microphone/camera. Joining audio-only or view-only.');
        // Fallback to audio-only if video fails
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setLocalStream(audioStream);
          localStreamRef.current = audioStream;
          initSignalingChannel(audioStream);
        } catch (audioErr) {
          console.error('Audio-only fallback failed:', audioErr);
          toast.error('Failed to access any audio devices.');
          initSignalingChannel(null);
        }
      }
    };

    setupMedia();

    // Setup Call Duration timer
    const durationInterval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(durationInterval);
      cleanupConnection();
    };
  }, [roomId, user]);

  // Clean up all local tracks and connections on unmount
  const cleanupConnection = () => {
    // Stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Close and delete peer connections
    Object.keys(pcsRef.current).forEach(peerId => {
      pcsRef.current[peerId].close();
    });
    pcsRef.current = {};

    // Remove Supabase Realtime channel
    if (roomChannelRef.current) {
      // Notify other peers we are leaving
      roomChannelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          signalType: 'meeting-leave',
          meetingId: roomId,
          userId: user?.id
        }
      });
      supabase.removeChannel(roomChannelRef.current);
    }
  };

  // Copy Room Link to clipboard
  const handleCopyLink = () => {
    const link = `${window.location.origin}/calls/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(true);
    toast.success('Room link copied!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // 2. Signaling over Supabase Broadcast Channel
  const initSignalingChannel = (stream: MediaStream | null) => {
    if (!user) return;

    // Create channel specific to this Room ID
    const roomChannel = supabase.channel(`room_call_${roomId}`);
    roomChannelRef.current = roomChannel;

    roomChannel
      .on('broadcast', { event: 'signal' }, async ({ payload }: { payload: any }) => {
        // Ignore signals targeted to other peers
        if (payload.targetUserId && payload.targetUserId !== user.id) return;
        
        const { signalType, fromUserId, data } = payload;
        
        switch (signalType) {
          case 'meeting-join':
            // Another peer has joined our room
            const joinedUser = data.user;
            setParticipants(prev => {
              if (!prev.some(p => p.id === joinedUser.id)) {
                toast.info(`${joinedUser.name} joined`);
                
                // Existing peer (us) initiates WebRTC offer to new peer
                initiatePeerConnection(joinedUser.id, stream, true);
                
                return [...prev, joinedUser];
              }
              return prev;
            });
            break;

          case 'meeting-leave':
            // A peer has left
            const leaverId = payload.userId;
            setParticipants(prev => {
              const target = prev.find(p => p.id === leaverId);
              if (target) {
                toast.info(`${target.name} left`);
              }
              return prev.filter(p => p.id !== leaverId);
            });

            // Close peer connection
            if (pcsRef.current[leaverId]) {
              pcsRef.current[leaverId].close();
              delete pcsRef.current[leaverId];
            }
            setRemoteStreams(prev => {
              const next = { ...prev };
              delete next[leaverId];
              return next;
            });
            break;

          case 'meeting-offer':
            // Received offer from peer, answer it
            if (payload.targetUserId === user.id) {
              handlePeerOffer(fromUserId, data, stream);
            }
            break;

          case 'meeting-answer':
            // Received answer from peer, set remote desc
            if (payload.targetUserId === user.id) {
              handlePeerAnswer(fromUserId, data);
            }
            break;

          case 'meeting-ice-candidate':
            // Received ICE candidate from peer
            if (payload.targetUserId === user.id) {
              handlePeerIceCandidate(fromUserId, data);
            }
            break;
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          // Tell everyone in the room we just joined
          roomChannel.send({
            type: 'broadcast',
            event: 'signal',
            payload: {
              signalType: 'meeting-join',
              meetingId: roomId,
              fromUserId: user.id,
              data: {
                user: {
                  id: user.id,
                  name: user.name,
                  role: user.role
                }
              }
            }
          });
        }
      });
  };

  // 3. WebRTC Peer Connection Core (Caller Side)
  const initiatePeerConnection = async (targetId: string, stream: MediaStream | null, isInitiator: boolean) => {
    if (!user) return;
    
    try {
      const pc = new RTCPeerConnection(iceConfig);
      pcsRef.current[targetId] = pc;

      // Add local stream tracks to connection
      if (stream) {
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      }

      // Handle local ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && roomChannelRef.current) {
          roomChannelRef.current.send({
            type: 'broadcast',
            event: 'signal',
            payload: {
              signalType: 'meeting-ice-candidate',
              meetingId: roomId,
              fromUserId: user.id,
              targetUserId: targetId,
              data: event.candidate
            }
          });
        }
      };

      // Receive remote stream tracks
      pc.ontrack = (event) => {
        setRemoteStreams(prev => ({
          ...prev,
          [targetId]: event.streams[0]
        }));
      };

      // If initiator, generate SDP Offer
      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        if (roomChannelRef.current) {
          roomChannelRef.current.send({
            type: 'broadcast',
            event: 'signal',
            payload: {
              signalType: 'meeting-offer',
              meetingId: roomId,
              fromUserId: user.id,
              targetUserId: targetId,
              data: offer
            }
          });
        }
      }
    } catch (e) {
      console.error(`Failed to initialize peer connection to ${targetId}:`, e);
    }
  };

  // 4. WebRTC Peer Connection Core (Callee Side)
  const handlePeerOffer = async (fromId: string, offer: any, stream: MediaStream | null) => {
    if (!user) return;

    try {
      // Initialize peer connection without initiating offer
      await initiatePeerConnection(fromId, stream, false);
      const pc = pcsRef.current[fromId];

      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Send answer back to Caller
        if (roomChannelRef.current) {
          roomChannelRef.current.send({
            type: 'broadcast',
            event: 'signal',
            payload: {
              signalType: 'meeting-answer',
              meetingId: roomId,
              fromUserId: user.id,
              targetUserId: fromId,
              data: answer
            }
          });
        }
      }
    } catch (e) {
      console.error(`Failed to handle peer offer from ${fromId}:`, e);
    }
  };

  const handlePeerAnswer = async (fromId: string, answer: any) => {
    const pc = pcsRef.current[fromId];
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (e) {
        console.error(`Failed to set remote description for ${fromId}:`, e);
      }
    }
  };

  const handlePeerIceCandidate = async (fromId: string, candidate: any) => {
    const pc = pcsRef.current[fromId];
    if (pc && candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error(`Failed to add ICE candidate from ${fromId}:`, e);
      }
    }
  };

  // 5. Active Call Audio/Video Controls
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
        toast.info(audioTrack.enabled ? 'Microphone unmuted' : 'Microphone muted');
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
        toast.info(videoTrack.enabled ? 'Camera turned on' : 'Camera turned off');
      }
    }
  };

  // 6. Native Screen Share Implementation
  const toggleScreenShare = async () => {
    if (!localStreamRef.current) return;

    if (isScreenSharing) {
      // Stop screen sharing and revert to camera video track
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const cameraTrack = cameraStream.getVideoTracks()[0];
        
        // Swap tracks in all active peer connections
        Object.keys(pcsRef.current).forEach(async (peerId) => {
          const pc = pcsRef.current[peerId];
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(cameraTrack);
          }
        });

        // Update local video track
        const localVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (localVideoTrack) {
          localStreamRef.current.removeTrack(localVideoTrack);
          localVideoTrack.stop();
        }
        localStreamRef.current.addTrack(cameraTrack);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

        setIsScreenSharing(false);
        toast.success('Stopped sharing screen');
      } catch (e) {
        console.error(e);
        toast.error('Failed to access camera.');
      }
    } else {
      // Start Screen Capture
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' } as any,
          audio: false
        });
        const screenTrack = screenStream.getVideoTracks()[0];

        // Swap tracks in all active peer connections
        Object.keys(pcsRef.current).forEach(async (peerId) => {
          const pc = pcsRef.current[peerId];
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(screenTrack);
          }
        });

        // Update local video track
        const localVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (localVideoTrack) {
          localStreamRef.current.removeTrack(localVideoTrack);
          localVideoTrack.stop();
        }
        localStreamRef.current.addTrack(screenTrack);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

        setIsScreenSharing(true);
        toast.success('Sharing screen');

        // Handle user clicking "Stop Sharing" on system chrome
        screenTrack.onended = () => {
          setIsScreenSharing(true); // Call toggle again to revert
          toggleScreenShare();
        };
      } catch (e) {
        console.error(e);
        toast.error('Screen sharing cancelled or unsupported.');
      }
    }
  };

  // Leave room action
  const handleLeaveRoom = () => {
    cleanupConnection();
    toast.info('Left meeting room.');
    router.push('/calls');
  };

  // Format Duration into mm:ss
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Convert streams list into grid array (combines local & remote)
  const gridStreams = useMemo(() => {
    const list = [];
    
    // Add local stream first
    if (localStream) {
      list.push({
        id: 'local',
        name: `${user?.name || 'Me'} (You)`,
        stream: localStream,
        isLocal: true,
        muted: isAudioMuted,
        videoMuted: isVideoMuted
      });
    }

    // Add remote streams
    Object.keys(remoteStreams).forEach(peerId => {
      const peerName = allUsers.find(u => u.id === peerId)?.name || 'Remote Teammate';
      list.push({
        id: peerId,
        name: peerName,
        stream: remoteStreams[peerId],
        isLocal: false,
        muted: false,
        videoMuted: false
      });
    });

    return list;
  }, [localStream, remoteStreams, isAudioMuted, isVideoMuted, allUsers, user]);

  // Determine grid columns count based on streams size
  const gridColumnsClass = useMemo(() => {
    const count = gridStreams.length;
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    return 'grid-cols-2 lg:grid-cols-3';
  }, [gridStreams]);

  // First remote stream to pass to Diagnostics HUD
  const firstRemoteStream = useMemo(() => {
    const keys = Object.keys(remoteStreams);
    return keys.length > 0 ? remoteStreams[keys[0]] : null;
  }, [remoteStreams]);

  return (
    <div className="relative flex h-[calc(100vh-1.5rem)] my-3 mr-3 ml-1.5 rounded-2xl border border-border/40 glass flex-col bg-zinc-950 text-white overflow-hidden shrink-0">
      
      {/* Top Header Room Bar */}
      <div className="flex h-14 items-center justify-between border-b border-white/5 bg-zinc-900/60 px-6 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-semibold tracking-wider font-mono uppercase bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20">LIVE</span>
          <span className="text-xs font-semibold text-zinc-300 font-mono">{formatDuration(callDuration)}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-400 font-mono select-all bg-black/40 px-3 py-1 rounded border border-white/5">{roomId}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleCopyLink} 
            className="w-7 h-7 rounded-md text-zinc-400 hover:text-white hover:bg-white/5"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0 relative">
        
        {/* Main Video View Grid */}
        <div className={cn("grid flex-1 gap-4 p-6 overflow-y-auto align-middle justify-center", gridColumnsClass)}>
          {gridStreams.map((item) => (
            <div key={item.id} className="relative aspect-video rounded-2xl overflow-hidden border border-white/5 bg-zinc-900 flex items-center justify-center shadow-2xl">
              {item.videoMuted ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-lg font-bold">
                    {item.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs text-zinc-500 flex items-center gap-1.5 font-medium">
                    <VideoOff className="w-3.5 h-3.5" /> Camera Off
                  </span>
                </div>
              ) : (
                <VideoFeed stream={item.stream} isLocal={item.isLocal} />
              )}
              
              <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded-full text-[10px] text-zinc-300 border border-white/5 font-semibold">
                {item.name}
              </div>

              {item.muted && (
                <div className="absolute top-3 right-3 bg-red-500/20 text-red-400 border border-red-500/30 p-1.5 rounded-full">
                  <MicOff className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Collapsible Diagnostics HUD Panel */}
        <AnimatePresence>
          {showDiagnostics && (
            <div className="w-[380px] border-l border-white/5 bg-zinc-900/40 backdrop-blur-lg flex flex-col h-full z-10 shrink-0">
              <CallDiagnostics 
                localStream={localStream}
                remoteStream={firstRemoteStream}
                callType="video"
                callStatus="connected"
                onClose={() => setShowDiagnostics(false)}
                transcripts={[]}
                onSaveTranscript={() => {}}
                enableSTT={false}
                setEnableSTT={() => {}}
                autoSaveTranscripts={false}
                setAutoSaveTranscripts={() => {}}
              />
            </div>
          )}
        </AnimatePresence>

      </div>

      {/* Controller Dock */}
      <div className="flex h-20 items-center justify-center gap-4 border-t border-white/5 bg-zinc-900/80 px-6 shrink-0 backdrop-blur-md z-10">
        
        {/* Toggle Audio Button */}
        <Button 
          variant={isAudioMuted ? 'destructive' : 'secondary'} 
          size="icon" 
          onClick={toggleAudio}
          className={cn("w-10 h-10 rounded-full", isAudioMuted ? "bg-red-600 hover:bg-red-700" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white")}
        >
          {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>

        {/* Toggle Video Button */}
        <Button 
          variant={isVideoMuted ? 'destructive' : 'secondary'} 
          size="icon" 
          onClick={toggleVideo}
          className={cn("w-10 h-10 rounded-full", isVideoMuted ? "bg-red-600 hover:bg-red-700" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white")}
        >
          {isVideoMuted ? <VideoOff className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
        </Button>

        {/* Share Screen Button */}
        <Button 
          variant="secondary" 
          size="icon" 
          onClick={toggleScreenShare}
          className={cn("w-10 h-10 rounded-full", isScreenSharing ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white")}
        >
          <Monitor className="w-4 h-4" />
        </Button>

        {/* Diagnostics Toggle Button */}
        <Button 
          variant="secondary" 
          size="icon" 
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className={cn("w-10 h-10 rounded-full", showDiagnostics ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white")}
        >
          <Activity className="w-4 h-4" />
        </Button>

        {/* Leave Meeting Room Button */}
        <Button variant="destructive" onClick={handleLeaveRoom} className="flex gap-2 items-center rounded-full px-5 h-10 font-bold bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/10">
          <PhoneOff className="w-4 h-4" />
          <span>Leave Room</span>
        </Button>
      </div>

    </div>
  );
}

// Inner helper component to manage video tag reference and autoplay binding safely
function VideoFeed({ stream, isLocal }: { stream: MediaStream; isLocal: boolean }) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={isLocal}
      className={cn("w-full h-full object-cover", isLocal && "scale-x-[-1]")} // Mirror local video feed
    />
  );
}
