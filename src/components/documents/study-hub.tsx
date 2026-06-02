'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/store';
import { DocumentFile } from '@/types';
import { 
  Play, Pause, RotateCcw, Shuffle, Sparkles, Check, X, ArrowRight, 
  Lightbulb, Volume2, HelpCircle, FileText, Calendar, Layout, User, 
  Mic, Brain, Search, Award, RefreshCw, ChevronRight, ListCollapse,
  ChevronsUpDown, Info, CheckCircle2, AlertCircle, Eye, ArrowLeft,
  Settings, Columns, Grid3X3, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface StudyHubProps {
  document: DocumentFile;
}

type StudyFormat = 'infographic' | 'podcast' | 'video-overview' | 'flashcards' | 'mindmap' | 'quiz' | 'table';

export function StudyHub({ document }: StudyHubProps) {
  const { workspace } = useWorkspace();
  const [activeFormat, setActiveFormat] = useState<StudyFormat | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  
  // Local cache of generated materials
  const [studyData, setStudyData] = useState<Record<string, any>>({});

  useEffect(() => {
    // Load existing cached files for this document
    const data: Record<string, any> = {};
    const formats: StudyFormat[] = ['infographic', 'podcast', 'video-overview', 'flashcards', 'mindmap', 'quiz', 'table'];
    
    formats.forEach(f => {
      const cached = localStorage.getItem(`nexus_study_${document.id}_${f}`);
      if (cached) {
        try {
          data[f] = JSON.parse(cached);
        } catch (e) {
          console.error(e);
        }
      }
    });
    setStudyData(data);
  }, [document.id]);

  const handleGenerate = async (format: StudyFormat) => {
    setLoading(true);
    setLoadingStep('Analyzing document context...');
    
    const steps = [
      'Structuring intelligence modules...',
      'Synthesizing study models...',
      'Compiling interactive visual frames...',
      'Finalizing study suite...'
    ];
    
    let currentStepIdx = 0;
    const interval = setInterval(() => {
      if (currentStepIdx < steps.length) {
        setLoadingStep(steps[currentStepIdx]);
        currentStepIdx++;
      }
    }, 1500);

    try {
      const response = await fetch('/api/study/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentTitle: document.title,
          documentContent: document.content || document.summary,
          format,
          workspaceId: workspace?.id
        })
      });

      clearInterval(interval);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to generate study materials');
      }

      const generated = await response.json();
      
      // Save to state and cache
      localStorage.setItem(`nexus_study_${document.id}_${format}`, JSON.stringify(generated));
      setStudyData(prev => ({ ...prev, [format]: generated }));
      toast.success(`${format.replace('-', ' ')} generated successfully!`);
    } catch (e: any) {
      clearInterval(interval);
      toast.error(e.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = (format: StudyFormat) => {
    if (confirm(`Are you sure you want to regenerate this ${format.replace('-', ' ')}?`)) {
      localStorage.removeItem(`nexus_study_${document.id}_${format}`);
      setStudyData(prev => {
        const copy = { ...prev };
        delete copy[format];
        return copy;
      });
      handleGenerate(format);
    }
  };

  const formatCards = [
    { id: 'mindmap' as StudyFormat, title: 'Concept Mindmap', desc: 'Interactive concept map tree connecting document topics and definitions.', icon: Brain, color: 'text-purple-500 bg-purple-500/10' },
    { id: 'podcast' as StudyFormat, title: 'Audio Podcast', desc: 'Engaging, multi-speaker conversational summary discussion using browser voices.', icon: Mic, color: 'text-amber-500 bg-amber-500/10' },
    { id: 'video-overview' as StudyFormat, title: 'Video Slideshow', desc: 'Self-playing visual slides overview with synchronized audio narration voice.', icon: Play, color: 'text-red-500 bg-red-500/10' },
    { id: 'infographic' as StudyFormat, title: 'Creative Infographics', desc: 'Visual structured data dashboards, statistics summaries, and steps lists.', icon: Layout, color: 'text-emerald-500 bg-emerald-500/10' },
    { id: 'flashcards' as StudyFormat, title: 'Study Flashcards', desc: 'Dual-sided flip cards designed to practice key vocabulary and statements.', icon: BookOpen, color: 'text-blue-500 bg-blue-500/10' },
    { id: 'quiz' as StudyFormat, title: 'Practice Quizzes', desc: 'Multiple-choice mock exams with immediate score checks and explanations.', icon: HelpCircle, color: 'text-indigo-500 bg-indigo-500/10' },
    { id: 'table' as StudyFormat, title: 'Extracted Tables', desc: 'Quantitative details, properties grids, and timeline entities comparison.', icon: Grid3X3, color: 'text-pink-500 bg-pink-500/10' },
  ];

  if (activeFormat) {
    const data = studyData[activeFormat];
    return (
      <div className="flex flex-col h-full bg-background relative text-foreground">
        {/* Sub-Header */}
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0 bg-muted/10">
          <Button variant="ghost" size="sm" onClick={() => setActiveFormat(null)} className="gap-1.5 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Study Grid
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Format: {activeFormat.replace('-', ' ')}</span>
            {data && (
              <Button variant="outline" size="sm" onClick={() => handleReset(activeFormat)} className="h-7 text-[10px] gap-1 px-2 border-dashed">
                <RefreshCw className="w-3 h-3" /> Regenerate
              </Button>
            )}
          </div>
        </div>

        {/* Workspace Display Area */}
        <div className="flex-1 overflow-auto p-4 md:p-6 min-h-0">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-card/40 border border-border/80 rounded-2xl backdrop-blur-sm shadow-inner min-h-[350px]">
              <div className="relative flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <Sparkles className="w-6 h-6 text-indigo-500 absolute animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-foreground">Generating study resources</h3>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-sm animate-pulse">{loadingStep}</p>
            </div>
          ) : !data ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-card/30 border border-dashed border-border rounded-2xl min-h-[350px] gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/5 text-indigo-500 flex items-center justify-center">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="max-w-sm">
                <h3 className="text-base font-bold text-foreground capitalize">Generate {activeFormat.replace('-', ' ')}</h3>
                <p className="text-xs text-muted-foreground mt-1">Transform your document into {activeFormat === 'podcast' ? 'an audio discussion' : activeFormat === 'video-overview' ? 'a visual presentation' : 'interactive study materials'} using Gemini AI.</p>
              </div>
              <Button 
                onClick={() => handleGenerate(activeFormat)}
                className="bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 shadow-sm text-xs font-semibold gap-1.5 px-4 h-9"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Generate Material
              </Button>
            </div>
          ) : (
            <div className="h-full">
              {activeFormat === 'infographic' && <InfographicView data={data} />}
              {activeFormat === 'podcast' && <PodcastView data={data} />}
              {activeFormat === 'video-overview' && <VideoOverviewView data={data} />}
              {activeFormat === 'flashcards' && <FlashcardsView data={data} />}
              {activeFormat === 'quiz' && <QuizView data={data} />}
              {activeFormat === 'mindmap' && <MindmapView data={data} />}
              {activeFormat === 'table' && <TableView data={data} />}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          Study Hub Studio
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">Generate, study, and listen to structured visual layouts of your research document.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {formatCards.map(card => {
          const isGenerated = !!studyData[card.id];
          const Icon = card.icon;
          return (
            <div 
              key={card.id}
              onClick={() => setActiveFormat(card.id)}
              className="bg-card border border-border hover:border-primary/20 rounded-xl p-4 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all flex flex-col gap-3 group relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", card.color)}>
                  <Icon className="w-5 h-5" />
                </div>

                {isGenerated ? (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] uppercase font-bold border-0">
                    Ready
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground/60 text-[9px] border-dashed uppercase font-bold">
                    Generate
                  </Badge>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                  {card.title}
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                </h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{card.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 1. INFOGRAPHICS VIEW ───────────────────────────────────────
function InfographicView({ data }: { data: any }) {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="text-center p-4 bg-muted/10 border border-border rounded-xl">
        <h2 className="text-xl font-bold text-foreground">{data.title || 'Infographic'}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{data.subtitle}</p>
      </div>

      {/* Metrics Row */}
      {data.metrics && data.metrics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.metrics.map((m: any, i: number) => (
            <div key={i} className="bg-card border border-border/80 rounded-xl p-3.5 text-center flex flex-col items-center justify-center shadow-xs">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">{m.label}</span>
              <span className="text-xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400">{m.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Highlights Grid */}
      {data.highlights && data.highlights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.highlights.map((hl: any, i: number) => (
            <div key={i} className="bg-card border border-border/80 rounded-xl p-4 shadow-xs relative overflow-hidden flex flex-col gap-2">
              <div className="w-2.5 h-full bg-indigo-500 absolute left-0 top-0" />
              <h4 className="font-bold text-xs pl-1.5 text-foreground">{hl.title}</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed pl-1.5">{hl.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Steps Visual Timeline */}
      {data.timeline && data.timeline.length > 0 && (
        <div className="flex flex-col gap-3 border border-border rounded-xl p-4 bg-card">
          <h3 className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2">Process Timeline / Key Stages</h3>
          <div className="relative border-l border-border/60 pl-6 flex flex-col gap-5 py-2">
            {data.timeline.map((item: any, i: number) => (
              <div key={i} className="relative group">
                {/* Visual Bullet */}
                <div className="absolute -left-[30px] top-0.5 w-4 h-4 rounded-full bg-background border-2 border-indigo-500 flex items-center justify-center text-[8px] font-bold text-indigo-500">
                  {i + 1}
                </div>
                <div className="flex flex-col gap-0.5 text-xs">
                  <span className="text-[9px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider font-mono">{item.step}</span>
                  <h4 className="font-bold text-foreground leading-snug">{item.title}</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 2. AUDIO PODCAST VIEW ──────────────────────────────────────
function PodcastView({ data }: { data: any }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const turns = data.episodes || [];
  const turnRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakTurn = (index: number) => {
    if (index >= turns.length) {
      setIsPlaying(false);
      setCurrentIndex(-1);
      toast.success('Podcast episode completed!');
      return;
    }

    setCurrentIndex(index);
    const turn = turns[index];
    
    // Auto-scroll speaking turn into view
    turnRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const utterance = new SpeechSynthesisUtterance(turn.text);
    utteranceRef.current = utterance;

    // Pick voices based on speaker role
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const voices = window.speechSynthesis.getVoices();
      if (turn.speaker === 'Host') {
        // Host: lower pitch, normal speed
        utterance.pitch = 0.95;
        utterance.rate = 0.95;
        const hostVoice = voices.find(v => v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('microsoft'));
        if (hostVoice) utterance.voice = hostVoice;
      } else {
        // Expert: slightly higher pitch, slightly faster
        utterance.pitch = 1.05;
        utterance.rate = 1.02;
        const expertVoice = voices.find(v => v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('hazel') || v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('en-us'));
        if (expertVoice) utterance.voice = expertVoice;
      }
    }

    utterance.onend = () => {
      speakTurn(index + 1);
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted') {
        console.error('TTS error:', e);
        setIsPlaying(false);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      const startFrom = currentIndex === -1 ? 0 : currentIndex;
      speakTurn(startFrom);
    }
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentIndex(-1);
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 h-full">
      {/* Podcast Banner Player Controls */}
      <div className="p-5 bg-card border border-border rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 ring-4 ring-amber-500/5">
            <Mic className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-bold text-sm text-foreground">{data.title || 'Conversational Podcast'}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{data.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handlePlayPause} className="bg-amber-500 hover:bg-amber-600 text-white rounded-full h-10 w-10 flex items-center justify-center p-0">
            {isPlaying ? <Pause className="w-4.5 h-4.5" /> : <Play className="w-4.5 h-4.5 fill-current" />}
          </Button>
          {(isPlaying || currentIndex !== -1) && (
            <Button variant="ghost" size="icon" onClick={handleStop} className="h-10 w-10 text-muted-foreground hover:text-foreground">
              <RotateCcw className="w-4.5 h-4.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Transcript script scrolling container */}
      <ScrollArea className="flex-1 bg-muted/10 border border-border/80 rounded-xl p-4 min-h-[300px]">
        <div className="flex flex-col gap-4 py-2">
          {turns.map((turn: any, i: number) => {
            const isSpeaking = i === currentIndex;
            const isHost = turn.speaker === 'Host';
            return (
              <div 
                key={i} 
                ref={el => { turnRefs.current[i] = el; }}
                className={cn(
                  "p-3 rounded-lg border max-w-[85%] flex flex-col gap-1 transition-all duration-300",
                  isSpeaking ? "border-amber-400 bg-amber-500/5 shadow-sm scale-[1.01]" : "border-border bg-card",
                  isHost ? "self-start" : "self-end border-indigo-500/10 bg-indigo-500/5"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {isHost ? (
                    <Mic className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <Brain className="w-3.5 h-3.5 text-indigo-500" />
                  )}
                  <span className={cn("text-[10px] uppercase font-bold tracking-wider", isHost ? "text-amber-600" : "text-indigo-600")}>
                    {turn.speaker}
                  </span>
                </div>
                <p className="text-xs text-foreground leading-relaxed leading-snug">{turn.text}</p>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── 3. VIDEO SLIDESHOW VIEW ──────────────────────────────────
function VideoOverviewView({ data }: { data: any }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const slides = data.slides || [];

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const playSlide = (idx: number) => {
    if (idx >= slides.length) {
      setIsPlaying(false);
      setSlideIndex(0);
      toast.success('Video Overview completed!');
      return;
    }

    setSlideIndex(idx);
    const slide = slides[idx];
    
    const utterance = new SpeechSynthesisUtterance(slide.narration);
    utteranceRef.current = utterance;
    
    utterance.pitch = 1.0;
    utterance.rate = 1.0;

    utterance.onend = () => {
      setTimeout(() => {
        playSlide(idx + 1);
      }, 1000);
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted') {
        setIsPlaying(false);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playSlide(slideIndex);
    }
  };

  const handleNext = () => {
    window.speechSynthesis.cancel();
    const nextIdx = (slideIndex + 1) % slides.length;
    setSlideIndex(nextIdx);
    if (isPlaying) {
      playSlide(nextIdx);
    }
  };

  const handlePrev = () => {
    window.speechSynthesis.cancel();
    const prevIdx = (slideIndex - 1 + slides.length) % slides.length;
    setSlideIndex(prevIdx);
    if (isPlaying) {
      playSlide(prevIdx);
    }
  };

  const activeSlide = slides[slideIndex] || null;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="text-center">
        <h3 className="font-bold text-sm">{data.title || 'Video Slide Overview'}</h3>
      </div>

      {/* Slide Visual Display Area */}
      {activeSlide && (
        <div className="bg-[#191919] dark:bg-black text-[#e3e3e2] rounded-xl border border-zinc-800 shadow-2xl relative overflow-hidden flex flex-col h-[340px] p-6 selection:bg-zinc-700/50">
          <div className="flex justify-between items-start text-[10px] text-zinc-500 font-mono tracking-wider shrink-0 pb-3 border-b border-zinc-900">
            <span>SLIDE {slideIndex + 1} OF {slides.length}</span>
            <span>NEXUS AI VIDEO PLAYER</span>
          </div>

          <div className="flex-1 flex gap-4 items-center justify-between min-h-0 pt-4">
            {/* Left Content list */}
            <div className="flex-1 flex flex-col gap-3 min-w-0 pr-4">
              <h2 className="text-lg font-bold tracking-tight text-white leading-tight">{activeSlide.slideTitle}</h2>
              <div className="flex flex-col gap-2">
                {activeSlide.bulletPoints?.map((pt: string, i: number) => (
                  <div key={i} className="flex gap-2 items-start text-xs">
                    <span className="text-indigo-500 font-bold shrink-0 mt-0.5">•</span>
                    <span className="text-zinc-300 leading-snug">{pt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Graphic placeholder-free Dynamic SVG */}
            <div className="w-1/3 bg-zinc-900/50 border border-zinc-800 rounded-lg h-full flex items-center justify-center p-3 relative select-none">
              {activeSlide.illustrationType === 'chart' && (
                <svg viewBox="0 0 100 100" className="w-full h-full text-indigo-500 max-w-[90px]">
                  <rect x="15" y="60" width="15" height="25" fill="currentColor" rx="2" className="animate-pulse" />
                  <rect x="42" y="40" width="15" height="45" fill="currentColor" rx="2" />
                  <rect x="70" y="20" width="15" height="65" fill="currentColor" rx="2" />
                  <line x1="5" y1="85" x2="95" y2="85" stroke="#373737" strokeWidth="2" />
                </svg>
              )}
              {activeSlide.illustrationType === 'timeline' && (
                <svg viewBox="0 0 100 100" className="w-full h-full text-emerald-500 max-w-[90px]">
                  <circle cx="20" cy="50" r="8" fill="currentColor" />
                  <circle cx="50" cy="50" r="8" fill="currentColor" />
                  <circle cx="80" cy="50" r="8" fill="currentColor" />
                  <line x1="28" y1="50" x2="42" y2="50" stroke="#373737" strokeWidth="2" />
                  <line x1="58" y1="50" x2="72" y2="50" stroke="#373737" strokeWidth="2" />
                </svg>
              )}
              {activeSlide.illustrationType === 'dashboard' && (
                <svg viewBox="0 0 100 100" className="w-full h-full text-purple-500 max-w-[90px]">
                  <circle cx="50" cy="50" r="30" fill="none" stroke="#222" strokeWidth="8" />
                  <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray="140 180" className="animate-spin" style={{ animationDuration: '6s' }} />
                  <text x="50" y="55" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold" fontFamily="monospace">AI</text>
                </svg>
              )}
              {(!activeSlide.illustrationType || activeSlide.illustrationType === 'list') && (
                <svg viewBox="0 0 100 100" className="w-full h-full text-amber-500 max-w-[90px]">
                  <rect x="15" y="20" width="70" height="10" fill="currentColor" rx="1" />
                  <rect x="15" y="45" width="70" height="10" fill="currentColor" rx="1" />
                  <rect x="15" y="70" width="70" height="10" fill="currentColor" rx="1" />
                </svg>
              )}
            </div>
          </div>

          {/* Synced Voice Narration Subtitles */}
          <div className="h-10 mt-3 border-t border-zinc-900 pt-2 text-[10px] text-zinc-400 italic flex items-center justify-center shrink-0">
            {isPlaying ? (
              <span className="flex items-center gap-1.5"><Volume2 className="w-3 h-3 text-indigo-500 shrink-0" /> "{activeSlide.narration}"</span>
            ) : (
              <span>Overview narration paused. Click Play to start speech.</span>
            )}
          </div>
        </div>
      )}

      {/* Video Bar Controls */}
      <div className="flex items-center justify-between px-2 text-xs">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrev} className="h-8 text-xs font-semibold">Prev</Button>
          <Button variant="outline" size="sm" onClick={handleNext} className="h-8 text-xs font-semibold">Next</Button>
        </div>

        <Button onClick={handlePlayPause} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center gap-1.5 px-4 h-9 font-semibold text-xs shadow-md">
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          {isPlaying ? 'Pause Overview' : 'Play Video Overview'}
        </Button>
      </div>
    </div>
  );
}

// ── 4. FLASHCARDS VIEW ───────────────────────────────────────
function FlashcardsView({ data }: { data: any }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [deck, setDeck] = useState<any[]>([]);

  useEffect(() => {
    if (data.flashcards) {
      setDeck(data.flashcards.map((card: any, idx: number) => ({
        ...card,
        id: idx,
        mastered: false
      })));
    }
  }, [data.flashcards]);

  const activeCard = deck[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((currentIndex + 1) % deck.length);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((currentIndex - 1 + deck.length) % deck.length);
    }, 150);
  };

  const handleToggleMastered = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeck(prev => prev.map((card, idx) => 
      idx === currentIndex ? { ...card, mastered: !card.mastered } : card
    ));
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setDeck(prev => [...prev].sort(() => Math.random() - 0.5));
      setCurrentIndex(0);
      toast.success('Flashcard deck shuffled!');
    }, 150);
  };

  const handleReset = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setDeck(data.flashcards.map((card: any, idx: number) => ({
        ...card,
        id: idx,
        mastered: false
      })));
      setCurrentIndex(0);
      toast.success('Study progress reset.');
    }, 150);
  };

  const masteredCount = deck.filter(c => c.mastered).length;

  return (
    <div className="max-w-md mx-auto flex flex-col gap-5">
      {/* Progress metrics */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted/30 border border-border px-3.5 py-1.5 rounded-lg">
        <span className="font-semibold">PROGRESS: {currentIndex + 1} / {deck.length} CARDS</span>
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{masteredCount} MASTERED</span>
      </div>

      {/* Double Sided Flipped Card */}
      {activeCard && (
        <div 
          onClick={() => setIsFlipped(!isFlipped)}
          className="h-[250px] [perspective:1000px] cursor-pointer group"
        >
          <div className={cn(
            "w-full h-full relative [transform-style:preserve-3d] transition-transform duration-500 border border-border/80 shadow-md rounded-2xl p-6 bg-card flex flex-col items-center justify-center text-center select-none hover:shadow-lg",
            isFlipped && "[transform:rotateY(180deg)] border-indigo-500/30 bg-indigo-500/[0.02]"
          )}>
            
            {/* Front Side (Question) */}
            <div className="absolute inset-0 [backface-visibility:hidden] flex flex-col items-center justify-center p-6 text-center gap-3">
              <span className="text-[10px] uppercase font-extrabold text-muted-foreground tracking-wider bg-muted/60 border border-border px-2 py-0.5 rounded">Question Card</span>
              <p className="text-sm font-bold text-foreground leading-relaxed leading-snug px-3">{activeCard.question}</p>
              <span className="text-[9px] text-muted-foreground/60 italic flex items-center gap-1 mt-2"><Eye className="w-3.5 h-3.5" /> Tap to reveal answer</span>
            </div>

            {/* Back Side (Answer) */}
            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col items-center justify-center p-6 text-center gap-3">
              <span className="text-[10px] uppercase font-extrabold text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">Answer Key</span>
              <p className="text-xs text-foreground leading-relaxed leading-snug font-medium px-3">{activeCard.answer}</p>
              
              {/* Master toggle */}
              <button 
                onClick={handleToggleMastered}
                className={cn(
                  "mt-3 text-[10px] font-bold border rounded-full px-3 py-1 flex items-center gap-1 transition-all",
                  activeCard.mastered 
                    ? "bg-emerald-500 text-white border-emerald-500" 
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <Check className="w-3 h-3" /> {activeCard.mastered ? 'Mastered' : 'Mark as Mastered'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleShuffle} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted" title="Shuffle deck">
            <Shuffle className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleReset} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted" title="Reset cards">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrev} className="h-8 font-semibold">Prev</Button>
          <Button variant="outline" size="sm" onClick={handleNext} className="h-8 font-semibold">Next</Button>
        </div>
      </div>
    </div>
  );
}

// ── 5. PRACTICE QUIZ VIEW ────────────────────────────────────
function QuizView({ data }: { data: any }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const questions = data.questions || [];
  const activeQuestion = questions[currentIndex];

  const handleOptionClick = (idx: number) => {
    if (answered) return;
    setSelectedOption(idx);
    setAnswered(true);
    if (idx === activeQuestion.answerIndex) {
      setScore(prev => prev + 1);
      toast.success('Correct answer!');
    } else {
      toast.error('Incorrect choice.');
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setAnswered(false);
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setFinished(true);
    }
  };

  const handleRetake = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setAnswered(false);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    const passed = score >= Math.ceil(questions.length / 2);
    return (
      <div className="max-w-md mx-auto text-center p-6 bg-card border border-border rounded-2xl shadow-md flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center mb-1">
          <Award className="w-8 h-8" />
        </div>

        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-bold text-foreground">Quiz Practice Completed!</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Evaluation performance checklist result:</p>
        </div>

        <div className="flex flex-col items-center border border-border rounded-xl p-4 bg-muted/10 w-full font-mono text-center mt-2">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Your Score</span>
          <span className="text-3xl font-extrabold text-foreground">{score} / {questions.length}</span>
          <span className={cn("text-[9px] uppercase font-bold mt-2", passed ? "text-emerald-600" : "text-red-500")}>
            {passed ? 'Passed - Great Job! ✅' : 'Failed - Try Reviewing Again ❌'}
          </span>
        </div>

        <Button onClick={handleRetake} className="mt-3 bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 h-9 px-5 text-xs font-bold gap-1.5 shadow-sm">
          <RefreshCw className="w-3.5 h-3.5" /> Retake Quiz
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto flex flex-col gap-5">
      <div className="flex justify-between text-[11px] text-muted-foreground bg-muted/20 border border-border px-3.5 py-1.5 rounded-lg font-semibold uppercase tracking-wider">
        <span>Question {currentIndex + 1} of {questions.length}</span>
        <span>Score: {score}</span>
      </div>

      {activeQuestion && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col gap-4">
          <h3 className="text-sm font-bold text-foreground leading-relaxed leading-snug">{activeQuestion.question}</h3>

          <div className="flex flex-col gap-2.5">
            {activeQuestion.options.map((opt: string, i: number) => {
              const isSelected = selectedOption === i;
              const isCorrect = activeQuestion.answerIndex === i;
              
              let optClass = "w-full border border-border text-left px-3 py-2.5 rounded-lg text-xs leading-normal hover:bg-muted/40 transition-colors flex items-center justify-between";
              
              if (answered) {
                if (isCorrect) {
                  optClass = "w-full border border-emerald-500 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between";
                } else if (isSelected) {
                  optClass = "w-full border border-red-500 bg-red-500/5 text-red-700 dark:text-red-400 text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between";
                } else {
                  optClass = "w-full border border-border opacity-50 text-left px-3 py-2.5 rounded-lg text-xs flex items-center justify-between cursor-not-allowed";
                }
              }

              return (
                <button 
                  key={i} 
                  onClick={() => handleOptionClick(i)} 
                  disabled={answered}
                  className={optClass}
                >
                  <span>{opt}</span>
                  {answered && isCorrect && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  {answered && isSelected && !isCorrect && <X className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Explanation reveal */}
          {answered && (
            <div className="border border-border/80 bg-muted/10 p-3 rounded-lg flex flex-col gap-1 text-[11px] leading-relaxed text-muted-foreground mt-1">
              <span className="font-bold flex items-center gap-1 text-foreground"><Info className="w-3.5 h-3.5 text-indigo-500" /> Explanation</span>
              <p>{activeQuestion.explanation}</p>
            </div>
          )}

          {answered && (
            <div className="flex justify-end pt-1">
              <Button onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1 px-4 h-8">
                {currentIndex + 1 === questions.length ? 'Finish' : 'Next Question'} <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 6. INTERACTIVE MINDMAP VIEW ───────────────────────────────
function MindmapView({ data }: { data: any }) {
  // Collapsed node IDs state
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Flatten the tree into rendering nodes and paths
  const layoutedData = useMemo(() => {
    let index = { count: 0 };
    
    function layout(node: any, depth = 0): any {
      const currentY = index.count * 64 + 40;
      const isCollapsed = !!collapsedIds[node.id];
      const hasChildren = node.children && node.children.length > 0;

      const layoutedNode = {
        id: node.id,
        label: node.label,
        x: depth * 200 + 40,
        y: currentY,
        collapsed: isCollapsed,
        hasChildren,
        children: [] as any[]
      };

      if (hasChildren && !isCollapsed) {
        node.children.forEach((child: any, i: number) => {
          if (i > 0) index.count++;
          layoutedNode.children.push(layout(child, depth + 1));
        });
      }

      return layoutedNode;
    }

    const tree = layout(data);
    const nodes: any[] = [];
    const paths: any[] = [];

    function traverse(node: any) {
      nodes.push({ id: node.id, label: node.label, x: node.x, y: node.y, collapsed: node.collapsed, hasChildren: node.hasChildren });
      node.children.forEach((child: any) => {
        // Draw path connecting parent-child: horizontal cubic-bezier curves
        const pathData = `M ${node.x + 130} ${node.y + 15} C ${node.x + 175} ${node.y + 15}, ${child.x - 45} ${child.y + 15}, ${child.x} ${child.y + 15}`;
        paths.push({ from: node.id, to: child.id, path: pathData });
        traverse(child);
      });
    }

    traverse(tree);
    const height = Math.max(index.count * 64 + 100, 300);

    return { nodes, paths, height };
  }, [data, collapsedIds]);

  return (
    <div className="flex flex-col gap-3 h-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground border border-border bg-card rounded-lg px-3 py-1.5">
        <span className="font-semibold uppercase flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> Interactive mindmap</span>
        <span>Click node badge triggers collapse toggles</span>
      </div>

      <div className="border border-border/80 rounded-xl bg-card overflow-auto max-h-[450px]">
        <svg 
          width="800" 
          height={layoutedData.height} 
          className="bg-muted/5 dark:bg-zinc-950/20 font-sans select-none"
        >
          {/* Connector Paths */}
          {layoutedData.paths.map((p, idx) => (
            <path
              key={idx}
              d={p.path}
              fill="none"
              stroke="#cbd5e1"
              className="dark:stroke-zinc-800"
              strokeWidth="2.5"
            />
          ))}

          {/* Map Node Badges */}
          {layoutedData.nodes.map((n, idx) => (
            <g 
              key={idx} 
              transform={`translate(${n.x}, ${n.y})`}
              className="group cursor-pointer"
            >
              {/* Inner card border */}
              <rect
                x="0"
                y="0"
                width="140"
                height="30"
                rx="6"
                className={cn(
                  "fill-white dark:fill-zinc-900 stroke-border hover:stroke-indigo-500 transition-colors shadow-sm",
                  n.id === 'root' && "stroke-indigo-500 bg-indigo-500/5",
                  n.collapsed && "stroke-amber-400"
                )}
                strokeWidth="1.5"
              />
              
              <text
                x="12"
                y="18"
                fontSize="10"
                fontWeight={n.id === 'root' ? 'bold' : 'normal'}
                className="fill-foreground"
              >
                {n.label.length > 20 ? n.label.slice(0, 18) + '...' : n.label}
              </text>

              {/* Collapse state toggle triggers */}
              {n.hasChildren && (
                <g 
                  transform="translate(130, 8)"
                  onClick={(e) => toggleCollapse(n.id, e)}
                  className="cursor-pointer"
                >
                  <circle
                    cx="5"
                    cy="7"
                    r="5"
                    className={cn(
                      "fill-muted hover:fill-indigo-500 hover:text-white stroke-border",
                      n.collapsed ? "fill-amber-500 text-white" : "text-muted-foreground"
                    )}
                    strokeWidth="1"
                  />
                  <text
                    x="2.5"
                    y="10"
                    fontSize="8.5"
                    fontWeight="bold"
                    className="fill-current pointer-events-none"
                  >
                    {n.collapsed ? '+' : '-'}
                  </text>
                </g>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ── 7. DATA TABLES VIEW ──────────────────────────────────────
function TableView({ data }: { data: any }) {
  const [search, setSearch] = useState('');
  const headers = data.headers || [];
  const rows = data.rows || [];

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    return rows.filter((row: any) => 
      headers.some((h: string) => 
        String(row[h] || '').toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [rows, headers, search]);

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4">
      {/* Search toolbar */}
      <div className="relative max-w-xs shrink-0">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/60" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter table rows..."
          className="w-full pl-8 pr-3 py-1.5 border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/40 text-foreground bg-card"
        />
      </div>

      {/* Grid container */}
      <div className="border border-border/80 rounded-xl bg-card overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs select-none">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              {headers.map((h: string, i: number) => (
                <th key={i} className="p-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredRows.map((row: any, rIdx: number) => (
              <tr key={rIdx} className="hover:bg-muted/10 transition-colors">
                {headers.map((h: string, cIdx: number) => (
                  <td key={cIdx} className="p-3 leading-relaxed text-foreground/80 font-medium">
                    {row[h] !== undefined ? String(row[h]) : '-'}
                  </td>
                ))}
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={headers.length || 1} className="p-8 text-center text-muted-foreground italic text-xs">
                  No records matching search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
