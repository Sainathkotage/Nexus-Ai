'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Sliders, ShieldCheck, ShieldAlert, Cpu, Network, Info, 
  HelpCircle, Volume2, Mic, CheckCircle, AlertTriangle, Play, RefreshCw, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface CallDiagnosticsProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callType: 'audio' | 'video';
  callStatus: 'connected' | 'dialing' | 'ringing' | 'ended';
  onClose: () => void;
  transcripts: Array<{ senderName: string; text: string; timestamp: string }>;
  onSaveTranscript: () => void;
  enableSTT: boolean;
  setEnableSTT: (val: boolean) => void;
  autoSaveTranscripts: boolean;
  setAutoSaveTranscripts: (val: boolean) => void;
}

type NetworkProfileType = 'fibre' | 'lte' | '3g' | '2g';

export default function CallDiagnostics({
  localStream,
  remoteStream,
  callType,
  callStatus,
  onClose,
  transcripts,
  onSaveTranscript,
  enableSTT,
  setEnableSTT,
  autoSaveTranscripts,
  setAutoSaveTranscripts
}: CallDiagnosticsProps) {
  const [networkProfile, setNetworkProfile] = useState<NetworkProfileType>('fibre');
  const [activeTab, setActiveTab] = useState<'metrics' | 'pipeline' | 'transcripts'>('metrics');
  
  // Waveform VAD states
  const [isSpeakingLocal, setIsSpeakingLocal] = useState(false);
  const [isSpeakingRemote, setIsSpeakingRemote] = useState(false);
  
  // Live fluctuating stats state
  const [liveStats, setLiveStats] = useState({
    bitrate: 32.0,
    rtt: 18,
    packetLoss: 0.01,
    jitter: 2,
    mos: 4.88,
  });

  // Hover description state for pipeline flowchart
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);

  // Web Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const localSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const remoteSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const remoteAnalyserRef = useRef<AnalyserNode | null>(null);
  
  // Canvas Refs
  const localCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const remoteCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Profile-specific stats configurations
  const profileConfigs = {
    fibre: { baseBitrate: 32.0, baseRtt: 18, baseLoss: 0.01, baseJitter: 2, baseMos: 4.88 },
    lte: { baseBitrate: 24.0, baseRtt: 42, baseLoss: 0.8, baseJitter: 6, baseMos: 4.42 },
    '3g': { baseBitrate: 16.0, baseRtt: 135, baseLoss: 5.2, baseJitter: 18, baseMos: 3.25 },
    '2g': { baseBitrate: 8.0, baseRtt: 380, baseLoss: 18.5, baseJitter: 45, baseMos: 1.95 },
  };

  // 1. Live fluctuating stats updater
  useEffect(() => {
    if (callStatus !== 'connected') return;

    const timer = setInterval(() => {
      const config = profileConfigs[networkProfile];
      // Add slight realistic random fluctuations
      const bitrateFluct = (Math.random() - 0.5) * 0.8;
      const rttFluct = Math.floor((Math.random() - 0.5) * 4);
      const lossFluct = (Math.random() - 0.5) * 0.15;
      const jitterFluct = Math.floor((Math.random() - 0.5) * 2);
      
      const targetBitrate = Math.max(5.5, Math.min(48, config.baseBitrate + bitrateFluct));
      const targetRtt = Math.max(5, config.baseRtt + rttFluct);
      const targetLoss = Math.max(0, config.baseLoss + lossFluct);
      const targetJitter = Math.max(1, config.baseJitter + jitterFluct);
      
      // Calculate dynamic MOS based on loss and latency
      // Standard E-Model simplification for voice quality
      let calculatedMos = 4.5 - (targetLoss * 0.12) - (targetRtt * 0.005);
      if (calculatedMos > 4.9) calculatedMos = 4.9;
      if (calculatedMos < 1.0) calculatedMos = 1.0;

      setLiveStats({
        bitrate: parseFloat(targetBitrate.toFixed(1)),
        rtt: targetRtt,
        packetLoss: parseFloat(targetLoss.toFixed(2)),
        jitter: targetJitter,
        mos: parseFloat(calculatedMos.toFixed(2)),
      });
    }, 1200);

    return () => clearInterval(timer);
  }, [networkProfile, callStatus]);

  // Sync initial stats when profile changes
  useEffect(() => {
    const config = profileConfigs[networkProfile];
    setLiveStats({
      bitrate: config.baseBitrate,
      rtt: config.baseRtt,
      packetLoss: config.baseLoss,
      jitter: config.baseJitter,
      mos: config.baseMos,
    });
  }, [networkProfile]);

  // 2. Web Audio Analyser setup
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Create single AudioContext
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;

    // Setup local mic stream analysis
    if (localStream && localStream.getAudioTracks().length > 0) {
      try {
        if (localSourceRef.current) localSourceRef.current.disconnect();
        const source = ctx.createMediaStreamSource(localStream);
        localSourceRef.current = source;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        localAnalyserRef.current = analyser;
        source.connect(analyser);
      } catch (err) {
        console.warn("Failed to create local audio source analysis", err);
      }
    } else {
      localAnalyserRef.current = null;
    }

    // Setup remote speaker stream analysis
    if (remoteStream && remoteStream.getAudioTracks().length > 0) {
      try {
        if (remoteSourceRef.current) remoteSourceRef.current.disconnect();
        const source = ctx.createMediaStreamSource(remoteStream);
        remoteSourceRef.current = source;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        remoteAnalyserRef.current = analyser;
        source.connect(analyser);
      } catch (err) {
        console.warn("Failed to create remote audio source analysis", err);
      }
    } else {
      remoteAnalyserRef.current = null;
    }

    // Handle audio context suspension rules
    if (ctx.state === 'suspended') {
      const resume = () => {
        ctx.resume();
        window.removeEventListener('click', resume);
      };
      window.addEventListener('click', resume);
    }
  }, [localStream, remoteStream]);

  // Close context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, []);

  // 3. Canvas animation loop
  useEffect(() => {
    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);

      const renderWave = (
        analyser: AnalyserNode | null,
        canvas: HTMLCanvasElement | null,
        color: string,
        isLocal: boolean
      ) => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Draw background grid lines
        ctx.strokeStyle = 'rgba(63, 63, 70, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        for (let x = 40; x < w; x += 40) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
        }
        ctx.stroke();

        const bufferLength = analyser ? analyser.frequencyBinCount : 64;
        const dataArray = new Uint8Array(bufferLength);
        let hasSignal = false;

        if (analyser && callStatus === 'connected') {
          analyser.getByteTimeDomainData(dataArray);
          // Check for active amplitude signal
          for (let i = 0; i < bufferLength; i++) {
            if (Math.abs(dataArray[i] - 128) > 4) {
              hasSignal = true;
              break;
            }
          }
        } else {
          // Simulated signal depending on call status and network condition
          const time = Date.now() * 0.005;
          const config = profileConfigs[networkProfile];

          for (let i = 0; i < bufferLength; i++) {
            if (callStatus === 'connected') {
              // Simulate dynamic voice packet bursts
              const speakCycle = Math.sin(time * 0.04 + (isLocal ? 0 : Math.PI));
              const isSpeakingSim = speakCycle > 0.25;
              
              if (isSpeakingSim) {
                // Speech signal: CELT/SILK synthesis
                const noiseFactor = networkProfile === '2g' ? 0.3 : 0.02; // add distortion for bad network
                const noise = (Math.random() - 0.5) * 45 * noiseFactor;
                const waveVal = Math.sin(i * 0.12 + time) * 32 * Math.sin(i * Math.PI / bufferLength);
                dataArray[i] = 128 + waveVal + noise;
                hasSignal = true;
              } else {
                // Comfort Noise / quiet static
                dataArray[i] = 128 + (Math.random() - 0.5) * 1.5;
              }
            } else if (callStatus === 'dialing' || callStatus === 'ringing') {
              // Sine wave ringtone simulation
              dataArray[i] = 128 + Math.sin(i * 0.06 + time * 1.8) * 12 * Math.sin(i * Math.PI / bufferLength);
            } else {
              dataArray[i] = 128;
            }
          }
        }

        // Draw waveform path
        ctx.lineWidth = 2.0;
        ctx.strokeStyle = color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = color;
        ctx.beginPath();

        const sliceWidth = w / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * h) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset glow

        // Update speaker status state
        if (isLocal) {
          setIsSpeakingLocal(hasSignal);
        } else {
          setIsSpeakingRemote(hasSignal);
        }
      };

      // Draw both channels: Local (Indigo) and Remote (Emerald)
      renderWave(localAnalyserRef.current, localCanvasRef.current, '#818cf8', true);
      renderWave(remoteAnalyserRef.current, remoteCanvasRef.current, '#34d399', false);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [callStatus, networkProfile]);

  // Helper to get MOS badge styling
  const getMosStyle = (mos: number) => {
    if (mos >= 4.0) return { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', label: 'Excellent', icon: CheckCircle };
    if (mos >= 3.0) return { bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400', label: 'Fair/Degraded', icon: AlertTriangle };
    return { bg: 'bg-red-500/10 border-red-500/20 text-red-400', label: 'Robotic/Poor', icon: ShieldAlert };
  };

  const mosMeta = getMosStyle(liveStats.mos);

  // Pipeline descriptions glossary
  const pipelineGlossary: Record<string, string> = {
    mic: "Microphone Capture: Hardware input retrieves raw 48kHz audio frames from your system device.",
    aec: "Acoustic Echo Cancellation (AEC): Adaptive NLMS filter cancels out audio leaks from your speakers feeding back into the microphone, preventing partner hearing their own echo.",
    ns: "Noise Suppression (NS): Spectral subtraction removes stationary ambient noises like air conditioners, key clicks, and traffic background hums.",
    agc: "Automatic Gain Control (AGC): Normalizes amplitude levels dynamically, boosting quiet whispers and padding shouting voices to reference thresholds.",
    vad: "Voice Activity Detection (VAD): Constant energy/entropy analysis checks if you're speaking. If silent, it halts stream sending and instructs receiver to play comfort noise, saving ~50% bandwidth.",
    opus: "Opus Codec Encoder: Compresses voice data using SILK mode (optimized for 6-32kbps speech). Automatically packets forward error correction (FEC) frames.",
    srtp: "SRTP Encryption: AES-256-GCM encrypts every audio RTP payload. Secure DTLS negotiation generates keys during setup. Private and unreadable by servers.",
    udp: "UDP network socket transmits RTP packets immediately. Prioritizes low latency over guaranteed delivery—late packets are dropped to avoid buffering delays.",
    remote_udp: "Receives UDP packets containing SRTP audio. Performs network socket parsing and filters packet duplicate headers.",
    remote_srtp: "Decrypts incoming SRTP payload in real-time, verifying AES-256 integrity tags.",
    jb: "Adaptive Jitter Buffer: Briefly queues incoming audio packets to smooth out irregular network arrivals (jitter) and reorders packets that arrive out of order.",
    plc: "Packet Loss Concealment (PLC): If a packet is lost, PLC runs Opus waveform substitution/extrapolation to blend the missing gap smoothly with Comfort Noise.",
    remote_opus: "Opus Decoder: Uncompresses speech frames back to linear PCM audio, merging FEC recovery frames if predecessor packet was dropped.",
    speaker: "Speaker Output: Digital-to-analog converter renders PCM voice stream to audio hardware for playback."
  };

  return (
    <div className="flex flex-col h-full bg-[#111113] border-l border-zinc-800 text-zinc-300 w-80 md:w-96 select-none shrink-0 font-sans shadow-2xl relative overflow-hidden backdrop-blur-md">
      
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/40 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span className="text-sm font-bold text-white tracking-wide uppercase">Secure Calling HUD</span>
        </div>
        <button 
          onClick={onClose} 
          className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded hover:bg-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Network Simulator Profiles */}
      <div className="p-3 border-b border-zinc-800/80 bg-zinc-950/40 shrink-0">
        <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 flex items-center gap-1.5 mb-2">
          <Sliders className="w-3 h-3 text-indigo-400" />
          Simulated Network Profile
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {(['fibre', 'lte', '3g', '2g'] as NetworkProfileType[]).map((prof) => (
            <button
              key={prof}
              onClick={() => setNetworkProfile(prof)}
              className={cn(
                "py-1.5 text-[10px] font-mono font-bold uppercase border rounded-md transition-all",
                networkProfile === prof
                  ? 'bg-indigo-600/25 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-500/10'
                  : 'bg-zinc-900/30 border-zinc-800 text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-400'
              )}
            >
              {prof === 'fibre' ? 'Fibre' : prof.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex border-b border-zinc-800/80 text-[11px] font-bold tracking-wide uppercase shrink-0">
        <button
          onClick={() => setActiveTab('metrics')}
          className={cn(
            "flex-1 py-2.5 text-center transition-all border-b-2",
            activeTab === 'metrics'
              ? 'border-indigo-500 text-white bg-zinc-900/20'
              : 'border-transparent text-zinc-500 hover:text-zinc-400'
          )}
        >
          Metrics
        </button>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={cn(
            "flex-1 py-2.5 text-center transition-all border-b-2",
            activeTab === 'pipeline'
              ? 'border-indigo-500 text-white bg-zinc-900/20'
              : 'border-transparent text-zinc-500 hover:text-zinc-400'
          )}
        >
          Pipeline
        </button>
        <button
          onClick={() => setActiveTab('transcripts')}
          className={cn(
            "flex-1 py-2.5 text-center transition-all border-b-2",
            activeTab === 'transcripts'
              ? 'border-indigo-500 text-white bg-zinc-900/20'
              : 'border-transparent text-zinc-500 hover:text-zinc-400'
          )}
        >
          Transcripts
        </button>
      </div>

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {activeTab === 'metrics' && (
          <>
            {/* MOS Opinion Score Dashboard */}
            <div className={cn("p-4 border rounded-xl flex items-center justify-between transition-colors", mosMeta.bg)}>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">Call Quality MOS Score</span>
                <span className="text-2xl font-bold font-mono text-white flex items-baseline gap-1.5">
                  {callStatus === 'connected' ? liveStats.mos : '0.00'}
                  <span className="text-xs font-normal opacity-50">/ 5.0</span>
                </span>
                <span className="text-[9px] font-semibold">{mosMeta.label} Opinion Rating</span>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <mosMeta.icon className="w-8 h-8 opacity-85 shrink-0" />
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-black/45 border border-zinc-800">
                  {networkProfile === '2g' ? 'Robotic Audio' : networkProfile === '3g' ? 'Adaptive Bitrate' : 'HD Opus'}
                </span>
              </div>
            </div>

            {/* Audio Waveform Canvas Visualizers */}
            <div className="space-y-3">
              <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-3 shadow-inner">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Microphone Input (Tx)</span>
                  </div>
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded-sm transition-all",
                    isSpeakingLocal 
                      ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                      : "bg-zinc-900 text-zinc-500"
                  )}>
                    {isSpeakingLocal ? "SPEAKING" : "SILENT (CNG)"}
                  </span>
                </div>
                <canvas 
                  ref={localCanvasRef} 
                  width={320} 
                  height={54} 
                  className="w-full h-[54px] rounded-lg bg-zinc-900/40 border border-zinc-900/60"
                />
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-3 shadow-inner">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Speaker Output (Rx)</span>
                  </div>
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded-sm transition-all",
                    isSpeakingRemote 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                      : "bg-zinc-900 text-zinc-500"
                  )}>
                    {isSpeakingRemote ? "SPEAKING" : "SILENT"}
                  </span>
                </div>
                <canvas 
                  ref={remoteCanvasRef} 
                  width={320} 
                  height={54} 
                  className="w-full h-[54px] rounded-lg bg-zinc-900/40 border border-zinc-900/60"
                />
              </div>
            </div>

            {/* Connection Metrics Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              
              <div className="bg-zinc-900/35 border border-zinc-800/50 p-2.5 rounded-lg">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Audio Bitrate</span>
                <span className="font-mono text-sm font-semibold text-white">
                  {callStatus === 'connected' ? `${liveStats.bitrate} kbps` : '0.0 kbps'}
                </span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">Adaptive Codec Rate</span>
              </div>

              <div className="bg-zinc-900/35 border border-zinc-800/50 p-2.5 rounded-lg">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Round Trip Time (RTT)</span>
                <span className="font-mono text-sm font-semibold text-white">
                  {callStatus === 'connected' ? `${liveStats.rtt} ms` : '--'}
                </span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">Network Latency</span>
              </div>

              <div className="bg-zinc-900/35 border border-zinc-800/50 p-2.5 rounded-lg">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Packet Loss Rate</span>
                <span className={cn(
                  "font-mono text-sm font-semibold block",
                  liveStats.packetLoss > 5.0 ? 'text-red-400' : liveStats.packetLoss > 1.0 ? 'text-amber-400' : 'text-emerald-400'
                )}>
                  {callStatus === 'connected' ? `${liveStats.packetLoss}%` : '0.00%'}
                </span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">Unordered packet drops</span>
              </div>

              <div className="bg-zinc-900/35 border border-zinc-800/50 p-2.5 rounded-lg">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Jitter</span>
                <span className="font-mono text-sm font-semibold text-white">
                  {callStatus === 'connected' ? `${liveStats.jitter} ms` : '0 ms'}
                </span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">Packet Arrival Delta</span>
              </div>
              
              <div className="bg-zinc-900/35 border border-zinc-800/50 p-2.5 rounded-lg">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Forward Error Corr.</span>
                <span className={cn(
                  "text-[10px] font-bold block",
                  networkProfile === 'fibre' ? 'text-zinc-500' : 'text-indigo-400'
                )}>
                  {callStatus === 'connected' 
                    ? networkProfile === 'fibre' 
                      ? 'INACTIVE' 
                      : networkProfile === 'lte' 
                      ? 'ACTIVE (LOW)' 
                      : 'ACTIVE (HIGH)' 
                    : 'INACTIVE'}
                </span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">Opus Inband FEC</span>
              </div>

              <div className="bg-zinc-900/35 border border-zinc-800/50 p-2.5 rounded-lg">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Loss Concealment</span>
                <span className={cn(
                  "text-[10px] font-bold block",
                  networkProfile === 'fibre' || networkProfile === 'lte' ? 'text-zinc-500' : 'text-amber-400'
                )}>
                  {callStatus === 'connected'
                    ? networkProfile === 'fibre' || networkProfile === 'lte'
                      ? 'INACTIVE'
                      : 'ACTIVE (PLC)'
                    : 'INACTIVE'}
                </span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">Waveform Substitution</span>
              </div>
            </div>

            {/* Encryption and Security verification */}
            <div className="bg-zinc-950/45 border border-zinc-800 rounded-xl p-3 flex gap-3 items-center">
              <ShieldCheck className="w-9 h-9 text-emerald-400 shrink-0 opacity-80" />
              <div className="flex flex-col text-[10px] gap-0.5">
                <span className="font-bold text-white">End-to-End Cryptography</span>
                <span className="text-zinc-400 leading-relaxed">
                  Call payloads encrypted with **AES-256-GCM**. Peer key negotiated via DTLS handshake. Codec optimized for maximum privacy.
                </span>
              </div>
            </div>
          </>
        )}

        {activeTab === 'pipeline' && (
          <>
            {/* AUDIO PIPELINE DIAGRAM */}
            <div className="space-y-4">
              
              {/* Sender side */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider px-1">
                  Sender Pipeline (Your Phone)
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  {[
                    { id: 'mic', label: '1. MIC CAPTURE', active: localStream !== null },
                    { id: 'aec', label: '2. ECHO CANCEL', active: callStatus === 'connected' },
                    { id: 'ns', label: '3. NOISE SUPP.', active: callStatus === 'connected' },
                    { id: 'agc', label: '4. GAIN CONTROL', active: callStatus === 'connected' },
                    { id: 'vad', label: '5. VOICE DETECTION', active: callStatus === 'connected', pulse: isSpeakingLocal },
                    { id: 'opus', label: '6. OPUS ENCODER', active: callStatus === 'connected' },
                    { id: 'srtp', label: '7. SRTP ENCRYPT', active: callStatus === 'connected' },
                    { id: 'udp', label: '8. UDP TRANSMIT', active: callStatus === 'connected' },
                  ].map((block) => (
                    <div
                      key={block.id}
                      onMouseEnter={() => setHoveredBlock(block.id)}
                      onMouseLeave={() => setHoveredBlock(null)}
                      className={cn(
                        "p-2 border rounded-lg transition-all cursor-help flex flex-col justify-center",
                        block.pulse 
                          ? "bg-indigo-500/10 border-indigo-400 text-indigo-300 shadow-md shadow-indigo-500/5"
                          : block.active
                          ? "bg-zinc-900/50 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                          : "bg-zinc-950/20 border-zinc-800 text-zinc-600"
                      )}
                    >
                      <span className="font-bold block truncate">{block.label}</span>
                      <span className="text-[8px] opacity-60 mt-0.5">
                        {block.id === 'vad' && block.pulse ? 'STREAMING ACTIVE' : block.id === 'vad' ? 'COMFORT NOISE' : 'ACTIVE'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Receiver side */}
              <div className="space-y-2 pt-2">
                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider px-1">
                  Receiver Pipeline (Coworker)
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  {[
                    { id: 'remote_udp', label: '1. UDP RECEIVER', active: callStatus === 'connected' },
                    { id: 'remote_srtp', label: '2. SRTP DECRYPT', active: callStatus === 'connected' },
                    { id: 'jb', label: '3. JITTER BUFFER', active: callStatus === 'connected' },
                    { id: 'plc', label: '4. ERROR CONCEAL', active: callStatus === 'connected' && (networkProfile === '3g' || networkProfile === '2g') },
                    { id: 'remote_opus', label: '5. OPUS DECODER', active: callStatus === 'connected' },
                    { id: 'speaker', label: '6. SPEAKER OUT', active: callStatus === 'connected', pulse: isSpeakingRemote },
                  ].map((block) => (
                    <div
                      key={block.id}
                      onMouseEnter={() => setHoveredBlock(block.id)}
                      onMouseLeave={() => setHoveredBlock(null)}
                      className={cn(
                        "p-2 border rounded-lg transition-all cursor-help flex flex-col justify-center",
                        block.pulse
                          ? "bg-emerald-500/10 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/5"
                          : block.active
                          ? "bg-zinc-900/50 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                          : "bg-zinc-950/20 border-zinc-800 text-zinc-600"
                      )}
                    >
                      <span className="font-bold block truncate">{block.label}</span>
                      <span className="text-[8px] opacity-60 mt-0.5">
                        {block.id === 'plc' && block.active ? 'CORRECTING LOSS' : 'ACTIVE'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detail Box */}
              <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 min-h-[90px] flex gap-2">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1 text-[10px]">
                  <span className="font-bold text-white">
                    {hoveredBlock 
                      ? hoveredBlock.toUpperCase().replace('_', ' ') + ' MODULE' 
                      : 'HOVER MODULE FOR DETAILS'}
                  </span>
                  <p className="text-zinc-400 leading-relaxed font-normal">
                    {hoveredBlock 
                      ? pipelineGlossary[hoveredBlock] 
                      : 'Hover over any box in the Sender or Receiver pipelines above to view its technical function in our secure WebRTC audio architecture.'}
                  </p>
                </div>
              </div>

            </div>
          </>
        )}

        {activeTab === 'transcripts' && (
          <div className="flex flex-col h-full gap-4 pb-4">
            
            {/* Live Captions Toggle Card */}
            <div className="bg-zinc-950/45 border border-zinc-800 rounded-xl p-3 space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white">Enable Live Captions (STT)</span>
                  <span className="text-[9px] text-zinc-400">Transcribe voice locally using browser recognition</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableSTT(!enableSTT)}
                  className={cn(
                    "w-10 h-5.5 rounded-full p-0.5 transition-colors relative flex items-center shrink-0",
                    enableSTT ? "bg-indigo-600 justify-end" : "bg-zinc-800 justify-start"
                  )}
                >
                  <motion.div layout className="w-4.5 h-4.5 bg-white rounded-full shadow-md" />
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-zinc-800/80 pt-2.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white">Auto-Save Transcript</span>
                  <span className="text-[9px] text-zinc-400">Automatically download transcript file on hangup</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoSaveTranscripts(!autoSaveTranscripts)}
                  className={cn(
                    "w-10 h-5.5 rounded-full p-0.5 transition-colors relative flex items-center shrink-0",
                    autoSaveTranscripts ? "bg-indigo-600 justify-end" : "bg-zinc-800 justify-start"
                  )}
                >
                  <motion.div layout className="w-4.5 h-4.5 bg-white rounded-full shadow-md" />
                </button>
              </div>
            </div>

            {/* Transcript Logs */}
            <div className="flex-1 min-h-[160px] bg-zinc-950/60 border border-zinc-900 rounded-xl p-3 flex flex-col overflow-hidden shadow-inner">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-zinc-900 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Live Captions Stream</span>
                {transcripts.length > 0 && (
                  <Button
                    type="button"
                    onClick={onSaveTranscript}
                    className="h-5.5 text-[8.5px] px-2 bg-indigo-600 hover:bg-indigo-700 font-mono text-white rounded flex items-center gap-1"
                  >
                    Download .TXT
                  </Button>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
                {transcripts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <Info className="w-6 h-6 text-zinc-600 mb-2" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">No Transcriptions Yet</span>
                    <p className="text-[9px] text-zinc-500 mt-1 max-w-[200px] leading-relaxed">
                      {enableSTT 
                        ? "Start speaking! Your local speech recognition will transcribe your call dialogue in real-time."
                        : "Live captions are disabled. Toggle the switch above to enable voice-to-text processing."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {transcripts.map((entry, idx) => (
                      <div key={idx} className="flex flex-col gap-0.5 border-l-2 border-indigo-500 pl-2 py-0.5">
                        <div className="flex items-center justify-between text-[8px] font-mono font-bold text-zinc-500 select-none">
                          <span className={cn(entry.senderName === 'You' ? 'text-indigo-400' : 'text-emerald-400')}>{entry.senderName.toUpperCase()}</span>
                          <span>{entry.timestamp}</span>
                        </div>
                        <p className="text-[10.5px] text-zinc-300 leading-relaxed break-words font-medium">
                          {entry.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Footer statistics readout */}
      <div className="p-3 bg-zinc-950/80 border-t border-zinc-800 flex justify-between items-center text-[10px] font-mono font-bold text-zinc-500 shrink-0 select-none">
        <span>UDP P2P: CONNECTED</span>
        <span>FEC: {networkProfile === 'fibre' ? '0%' : networkProfile === 'lte' ? '10%' : '30%'} REDUNDANCY</span>
      </div>

    </div>
  );
}
