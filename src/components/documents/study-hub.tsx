'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/store';
import { DocumentFile } from '@/types';
import { usePopup } from '@/lib/popup-context';
import { 
  Play, Pause, RotateCcw, Shuffle, Sparkles, Check, X, ArrowRight, 
  Lightbulb, Volume2, HelpCircle, FileText, Calendar, Layout, User, 
  Mic, Brain, Search, Award, RefreshCw, ChevronRight, ListCollapse,
  ChevronsUpDown, Info, CheckCircle2, AlertCircle, Eye, ArrowLeft,
  Settings, Columns, Grid3X3, BookOpen, Palette,
  ZoomIn, ZoomOut, Compass, PanelRightClose, PanelRightOpen, Loader2
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
  const { confirm } = usePopup();
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

  const handleReset = async (format: StudyFormat) => {
    if (await confirm(`Are you sure you want to regenerate this ${format.replace('-', ' ')}?`)) {
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
          <span className={cn("text-[9px] uppercase font-bold mt-2 flex items-center gap-1", passed ? "text-emerald-600" : "text-red-500")}>
            {passed ? 'Passed - Great Job!' : 'Failed - Try Reviewing Again'}
            <img src="https://www.google.com/s2/favicons?domain=quizlet.com&sz=32" className="w-3.5 h-3.5 object-contain" alt="" />
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
export function MindmapView({ 
  data, 
  document, 
  onQuoteClick 
}: { 
  data: any; 
  document?: any; 
  onQuoteClick?: (quote: string) => void;
}) {
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [nodeDetails, setNodeDetails] = useState<string>('');
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);

  // Zoom and pan states
  const [zoom, setZoom] = useState<number>(0.85);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 80, y: 40 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [tick, setTick] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Persistent physics coordinates across re-renders
  const nodesRef = useRef<Record<string, { x: number; y: number; vx: number; vy: number }>>({});

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // 1. Flatten hierarchical tree JSON into active nodes and links
  const { activeNodes, activeLinks } = useMemo(() => {
    const nodes: any[] = [];
    const links: any[] = [];
    
    if (!data || Object.keys(data).length === 0) {
      return { activeNodes: nodes, activeLinks: links };
    }

    // Normalize tree root to support wrapped structures from Gemini
    let rootNode = data;
    if (data && typeof data === 'object') {
      if (Array.isArray(data)) {
        rootNode = {
          id: 'root',
          label: 'Main Topic',
          children: data
        };
      } else {
        const hasDirectChildren = (obj: any) => {
          const childrenList = obj.children || obj.subtopics || obj.concepts || obj.nodes || obj.items;
          return Array.isArray(childrenList) && childrenList.length > 0;
        };

        if (!hasDirectChildren(data)) {
          // Look for a nested object/array that contains the actual tree
          const keys = Object.keys(data);
          for (const key of keys) {
            const val = data[key];
            if (val && typeof val === 'object') {
              if (Array.isArray(val) && val.length > 0 && (val[0].label || val[0].name || val[0].topic || hasDirectChildren(val[0]))) {
                rootNode = {
                  id: 'root',
                  label: key.charAt(0).toUpperCase() + key.slice(1),
                  children: val
                };
                break;
              } else if (!Array.isArray(val) && (hasDirectChildren(val) || val.label || val.name || val.topic)) {
                rootNode = val;
                break;
              }
            }
          }
        }
      }
    }

    function traverse(node: any, depth = 0, parentId?: string, relationship?: string) {
      const label = node.label || node.name || node.title || node.topic || 'Subtopic';
      const nodeId = node.id ? String(node.id) : `node-${depth}-${label.replace(/\s+/g, '-')}`;
      const description = node.description || '';
      const rel = node.relationship || relationship || '';
      const childrenList = node.children || node.subtopics || node.concepts || node.nodes || node.items;
      const hasChildren = Array.isArray(childrenList) && childrenList.length > 0;
      const collapsed = !!collapsedIds[nodeId];

      // Retrieve previous physics coordinates or initialize with offset
      const prevState = nodesRef.current[nodeId] || {
        x: 350 + depth * 150 + (Math.random() - 0.5) * 60,
        y: 200 + (nodes.length % 5) * 80 + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0
      };

      const physicsNode = {
        id: nodeId,
        label,
        description,
        relationship: rel,
        depth,
        x: prevState.x,
        y: prevState.y,
        vx: prevState.vx,
        vy: prevState.vy,
        hasChildren,
        collapsed,
        children: childrenList || []
      };

      nodes.push(physicsNode);
      nodesRef.current[nodeId] = prevState;

      if (parentId) {
        links.push({
          source: parentId,
          target: nodeId,
          relationship: rel
        });
      }

      if (hasChildren && !collapsed) {
        childrenList.forEach((child: any) => {
          traverse(child, depth + 1, nodeId, child.relationship);
        });
      }
    }

    traverse(rootNode);
    return { activeNodes: nodes, activeLinks: links };
  }, [data, collapsedIds]);

  // 2. Physics Simulation Loop (Coulomb repulsion, Hooke spring link tension, Gravity centering)
  useEffect(() => {
    if (activeNodes.length === 0) return;

    let animationFrameId: number;

    const runSimulation = () => {
      const kGravity = 0.035;
      const centerX = 380;
      const centerY = 220;

      const kRepulsion = 8500;
      const kLink = 0.05;
      const linkDistance = 140;
      const damping = 0.82;

      // Apply repulsion between all pairs of nodes (Coulomb force)
      for (let i = 0; i < activeNodes.length; i++) {
        const nodeA = activeNodes[i];
        for (let j = i + 1; j < activeNodes.length; j++) {
          const nodeB = activeNodes[j];
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distSq = dx * dx + dy * dy + 0.01;
          const dist = Math.sqrt(distSq);

          if (dist < 320) {
            const force = kRepulsion / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            nodeA.vx -= fx;
            nodeA.vy -= fy;
            nodeB.vx += fx;
            nodeB.vy += fy;
          }
        }
      }

      // Apply link spring forces
      activeLinks.forEach(link => {
        const sourceNode = activeNodes.find(n => n.id === link.source);
        const targetNode = activeNodes.find(n => n.id === link.target);

        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
          const displacement = dist - linkDistance;

          const force = kLink * displacement;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          sourceNode.vx += fx;
          sourceNode.vy += fy;
          targetNode.vx -= fx;
          targetNode.vy -= fy;
        }
      });

      // Apply gravity center-pulling and velocity translation
      activeNodes.forEach(node => {
        if (draggedNodeId === node.id) {
          node.x = dragCoordsRef.current.x;
          node.y = dragCoordsRef.current.y;
          node.vx = 0;
          node.vy = 0;
        } else {
          // Gravity pull
          node.vx += (centerX - node.x) * kGravity;
          node.vy += (centerY - node.y) * kGravity;

          // Apply velocity momentum
          node.x += node.vx;
          node.y += node.vy;

          // Apply friction damping
          node.vx *= damping;
          node.vy *= damping;
        }

        // Store back coordinates in persistent ref
        if (nodesRef.current[node.id]) {
          nodesRef.current[node.id].x = node.x;
          nodesRef.current[node.id].y = node.y;
          nodesRef.current[node.id].vx = node.vx;
          nodesRef.current[node.id].vy = node.vy;
        }
      });

      // Force React state update
      setTick(t => t + 1);

      animationFrameId = requestAnimationFrame(runSimulation);
    };

    animationFrameId = requestAnimationFrame(runSimulation);
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeNodes, activeLinks, draggedNodeId]);

  // 3. Zoom / Pan Canvas Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking canvas background
    if (e.target === containerRef.current || e.target === svgRef.current || (e.target as HTMLElement).id === 'grid-pattern') {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
    } else if (draggedNodeId) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        // Map page mouse coordinates to translated SVG coordinate workspace
        const mouseX = (e.clientX - rect.left - pan.x) / zoom;
        const mouseY = (e.clientY - rect.top - pan.y) / zoom;
        dragCoordsRef.current = { x: mouseX, y: mouseY };
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = 1.08;
    let nextZoom = zoom;
    if (e.deltaY < 0) {
      nextZoom = Math.min(zoom * factor, 2.5);
    } else {
      nextZoom = Math.max(zoom / factor, 0.45);
    }
    setZoom(nextZoom);
  };

  const handleResetView = () => {
    setZoom(0.85);
    setPan({ x: 80, y: 40 });
    // Reset velocities to settle graph
    Object.keys(nodesRef.current).forEach(id => {
      nodesRef.current[id].vx = 0;
      nodesRef.current[id].vy = 0;
    });
  };

  // 4. Node Dragging Handlers
  const handleNodeDragStart = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setDraggedNodeId(id);
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;
      dragCoordsRef.current = { x: mouseX, y: mouseY };
    }
  };

  const handleNodeClick = (node: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(node);
    setIsPanelOpen(true);
  };

  // 5. Real-Time Gemini detail RAG explanation fetching
  const fetchNodeExplanation = async (nodeLabel: string) => {
    setDetailLoading(true);
    setNodeDetails('');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Give a detailed explanation of the concept "${nodeLabel}". Relate it back to the core themes of the document. Quote 1 or 2 exact sentences from the document text inside double quotes to act as verifiable citations.`
            }
          ],
          documentContext: document?.content || document?.summary || '',
          workspaceId: document?.workspaceId
        })
      });

      if (!response.ok) throw new Error('Failed to retrieve concept details');
      const data = await response.json();
      setNodeDetails(data.text || 'No additional context generated.');
    } catch (err) {
      console.error(err);
      setNodeDetails('Failed to load deep AI analysis. Please check your network connection.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Auto-fetch explanation when node is selected
  useEffect(() => {
    if (selectedNode) {
      void fetchNodeExplanation(selectedNode.label);
    }
  }, [selectedNode]);

  // Clickable citation helper inside explanation text
  const renderTextSegmentWithQuotes = (text: string) => {
    if (typeof text !== 'string') return text;

    const quoteRegex = /"([^"]+)"|“([^”]+)”/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = quoteRegex.exec(text)) !== null) {
      const fullQuote = match[0];
      const innerText = match[1] || match[2];
      const matchIndex = match.index;

      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }

      if (onQuoteClick && innerText.length > 5) {
        parts.push(
          <span
            key={matchIndex}
            onClick={(e) => {
              e.stopPropagation();
              onQuoteClick(innerText);
            }}
            className="cursor-pointer border-b border-dashed border-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-medium px-1 rounded inline-flex items-center gap-0.5 transition-colors cursor-pointer select-text"
            title="Click to highlight citation in source"
          >
            <BookOpen className="w-2.5 h-2.5 inline shrink-0" />
            {fullQuote}
          </span>
        );
      } else {
        parts.push(fullQuote);
      }

      lastIndex = quoteRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  // Render markdown details with bullet points, bold text, and citations
  const renderDetailsMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      let content: React.ReactNode = line;

      // Bold text formatting
      const boldRegex = /\*\*([^*]+)\*\*/g;
      if (boldRegex.test(line)) {
        const parts = line.split(boldRegex);
        content = parts.map((part, index) => {
          if (index % 2 === 1) {
            return <strong key={index} className="font-bold text-foreground">{part}</strong>;
          }
          return renderTextSegmentWithQuotes(part);
        });
      } else {
        content = renderTextSegmentWithQuotes(line);
      }

      // Check if bullet point
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const cleanLine = line.replace(/^[-*]\s+/, '');
        return (
          <li key={i} className="list-disc ml-4 text-[11px] leading-relaxed text-muted-foreground mt-1 select-text">
            {boldRegex.test(cleanLine) ? (
              cleanLine.split(boldRegex).map((part, index) => 
                index % 2 === 1 ? <strong key={index} className="font-bold text-foreground">{part}</strong> : renderTextSegmentWithQuotes(part)
              )
            ) : renderTextSegmentWithQuotes(cleanLine)}
          </li>
        );
      }

      // Headers formatting
      if (line.trim().startsWith('###')) {
        return <h4 key={i} className="text-xs font-bold text-foreground mt-3 mb-1 uppercase tracking-wider select-text">{line.replace('###', '').trim()}</h4>;
      }
      if (line.trim().startsWith('##')) {
        return <h3 key={i} className="text-sm font-bold text-foreground mt-4 mb-2 select-text">{line.replace('##', '').trim()}</h3>;
      }

      if (!line.trim()) return <div key={i} className="h-2" />;

      return <p key={i} className="text-[11px] leading-relaxed text-muted-foreground mt-2 select-text">{content}</p>;
    });
  };

  // 6. Export Mindmap to Sticky Notes & Arrows on Whiteboard
  const handleExportToWhiteboard = () => {
    let existingElements: any[] = [];
    const saved = localStorage.getItem('nexus_whiteboard_elements');
    if (saved) {
      try {
        existingElements = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse whiteboard elements', e);
      }
    }

    const newElements: any[] = [];
    const idMap: Record<string, string> = {};
    const offsetX = 100;
    const offsetY = 100;

    activeNodes.forEach(n => {
      const whiteboardId = `el-mindmap-${n.id}-${Math.random().toString(36).substring(2, 6)}`;
      idMap[n.id] = whiteboardId;

      newElements.push({
        id: whiteboardId,
        type: 'sticky',
        x: n.x + offsetX,
        y: n.y + offsetY,
        width: 140,
        height: 60,
        text: String(n.label || 'Subtopic'),
        color: n.depth === 0 ? '#bfdbfe' : '#fef08a',
        fillColor: n.depth === 0 ? '#bfdbfe' : '#fef08a',
        isLocked: false
      });
    });

    activeLinks.forEach(l => {
      const fromId = idMap[l.source];
      const toId = idMap[l.target];
      const fromNode = activeNodes.find(n => n.id === l.source);
      const toNode = activeNodes.find(n => n.id === l.target);

      if (fromId && toId && fromNode && toNode) {
        newElements.push({
          id: `el-mindmap-arrow-${l.source}-${l.target}-${Math.random().toString(36).substring(2, 6)}`,
          type: 'arrow',
          x: 0,
          y: 0,
          points: [
            { x: fromNode.x + offsetX + 70, y: fromNode.y + offsetY + 30 },
            { x: toNode.x + offsetX + 70, y: toNode.y + offsetY + 30 }
          ],
          color: '#2563eb',
          strokeWidth: 2,
          strokeStyle: 'solid',
          isLocked: false
        });
      }
    });

    const merged = [...existingElements, ...newElements];
    localStorage.setItem('nexus_whiteboard_elements', JSON.stringify(merged));

    toast.success('Mindmap exported to whiteboard canvas!', {
      action: {
        label: 'View Board',
        onClick: () => {
          window.location.href = '/whiteboard';
        }
      }
    });
  };

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground text-xs font-semibold">
        No mindmap data found. Try generating.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-full max-w-4xl mx-auto relative select-none">
      
      {/* Mindmap Toolbar Controls */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground border border-border bg-card rounded-lg px-3 py-1.5 shrink-0 z-10">
        <span className="font-semibold uppercase flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" /> Force-Directed Mindmap
        </span>
        <div className="flex items-center gap-2.5">
          <Button 
            onClick={handleExportToWhiteboard} 
            size="sm" 
            variant="outline" 
            className="h-6 text-[9px] gap-1 border-dashed font-semibold hover:bg-indigo-500/10 hover:text-indigo-600 transition-colors shrink-0"
          >
            <Palette className="w-3 h-3 text-indigo-500 shrink-0" /> Export to Whiteboard
          </Button>
          <Button 
            onClick={handleResetView} 
            size="sm" 
            variant="outline" 
            className="h-6 text-[9px] gap-1 font-semibold shrink-0"
          >
            <Compass className="w-3 h-3 text-muted-foreground shrink-0" /> Recenter View
          </Button>
          <div className="flex items-center border border-border rounded-md px-1.5 py-0.5 gap-1.5 shrink-0 bg-background text-[9px]">
            <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.45))} className="hover:text-foreground"><ZoomOut className="w-3 h-3" /></button>
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(z + 0.1, 2.5))} className="hover:text-foreground"><ZoomIn className="w-3 h-3" /></button>
          </div>
        </div>
      </div>

      {/* Main Graph Viewport */}
      <div className="flex-1 flex gap-4 min-h-[460px] h-[460px] relative overflow-hidden">
        
        {/* Interactive Physics Canvas Container */}
        <div 
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="flex-1 border border-border/80 rounded-xl bg-card overflow-hidden relative cursor-grab active:grabbing"
        >
          {/* Subtle Grid dots background pattern */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.06]" id="grid-pattern" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

          {/* Transformation Wrapper (handles Pan & Zoom) */}
          <div 
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              width: '100%',
              height: '100%'
            }}
            className="absolute inset-0 pointer-events-none"
          >
            
            {/* SVG Link lines connection layer */}
            <svg ref={svgRef} className="absolute inset-0 w-[5000px] h-[5000px] overflow-visible pointer-events-none">
              <defs>
                <marker id="map-arrow" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#cbd5e1" className="dark:fill-zinc-800" />
                </marker>
              </defs>
              {activeLinks.map((link, idx) => {
                const source = activeNodes.find(n => n.id === link.source);
                const target = activeNodes.find(n => n.id === link.target);
                if (!source || !target) return null;

                // Center link points (offset node positions to center)
                const sourceX = source.x + 90;
                const sourceY = source.y + 25;
                const targetX = target.x + 90;
                const targetY = target.y + 25;

                // Bezier curve layout
                const pathData = `M ${sourceX} ${sourceY} C ${(sourceX + targetX) / 2} ${sourceY}, ${(sourceX + targetX) / 2} ${targetY}, ${targetX} ${targetY}`;

                return (
                  <g key={idx}>
                    <path
                      d={pathData}
                      fill="none"
                      stroke={source.depth === 0 ? "rgba(99, 102, 241, 0.4)" : "rgba(148, 163, 184, 0.35)"}
                      strokeWidth={source.depth === 0 ? "2.5" : "1.5"}
                      markerEnd="url(#map-arrow)"
                    />
                    {link.relationship && (
                      <g transform={`translate(${(sourceX + targetX) / 2}, ${(sourceY + targetY) / 2})`}>
                        <rect x="-22" y="-7" width="44" height="14" rx="3" fill="#fff" className="dark:fill-zinc-900 stroke-border/40" strokeWidth="0.5" />
                        <text
                          y="3"
                          fontSize="7"
                          textAnchor="middle"
                          className="fill-muted-foreground font-mono font-bold uppercase"
                        >
                          {link.relationship}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* HTML interactive Node Cards layer */}
            <div className="absolute inset-0 pointer-events-none w-[5000px] h-[5000px]">
              {activeNodes.map(node => {
                const isRoot = node.depth === 0;
                const isSub = node.depth === 1;
                const isSelected = selectedNode?.id === node.id;
                
                return (
                  <div
                    key={node.id}
                    style={{
                      position: 'absolute',
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      width: '180px',
                      pointerEvents: 'auto'
                    }}
                    onMouseDown={(e) => handleNodeDragStart(node.id, e)}
                    onClick={(e) => handleNodeClick(node, e)}
                    className={cn(
                      "p-3 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5 transition-all duration-200 cursor-grab active:cursor-grabbing flex flex-col gap-1.5",
                      isRoot && "border-indigo-500 ring-1 ring-indigo-500/10 bg-gradient-to-br from-indigo-500/[0.03] to-card",
                      isSub && "border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.01] to-card",
                      isSelected && "ring-2 ring-indigo-500 border-indigo-500 scale-102 shadow-md"
                    )}
                  >
                    {/* Node Title & relationship tag */}
                    <div className="flex justify-between items-start gap-1">
                      <span className={cn(
                        "text-[10.5px] font-bold leading-tight line-clamp-2 select-none",
                        isRoot && "text-indigo-600 dark:text-indigo-400 font-extrabold text-[11px]",
                        isSub && "text-foreground font-semibold"
                      )}>
                        {node.label}
                      </span>
                    </div>

                    {/* Node Summary Inline Snippet */}
                    {node.description && (
                      <p className="text-[9px] text-muted-foreground leading-normal line-clamp-2 font-medium">
                        {node.description}
                      </p>
                    )}

                    {/* Card Footer: depth status & collapse button */}
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[7.5px] text-muted-foreground/60 uppercase font-mono tracking-wider">
                        {isRoot ? 'Central' : `Depth ${node.depth}`}
                      </span>
                      {node.hasChildren && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCollapse(node.id, e);
                          }}
                          className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center border text-[9px] font-extrabold transition-colors hover:bg-indigo-500 hover:text-white cursor-pointer shrink-0",
                            node.collapsed 
                              ? "bg-amber-500 border-amber-500 text-white hover:bg-amber-600" 
                              : "border-border text-muted-foreground bg-muted/40"
                          )}
                        >
                          {node.collapsed ? `+` : '-'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* SIDE DETAIL PANEL (Sliding RAG citation drawer) */}
        {isPanelOpen && selectedNode && (
          <div className="w-[300px] shrink-0 border border-border bg-card rounded-xl p-5 flex flex-col gap-4 animate-in slide-in-from-right duration-200 shadow-lg relative z-20">
            
            {/* Header / close controls */}
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3 shrink-0">
              <div className="flex flex-col gap-0.5">
                <Badge variant="outline" className="text-[7.5px] uppercase font-mono tracking-wider w-fit bg-muted/50 text-muted-foreground border-border/80">
                  {selectedNode.depth === 0 ? 'Root Topic' : `Branch Node Level ${selectedNode.depth}`}
                </Badge>
                <h3 className="text-xs font-extrabold text-foreground leading-tight mt-1 select-text">
                  {selectedNode.label}
                </h3>
              </div>
              <button 
                onClick={() => setIsPanelOpen(false)}
                className="w-6 h-6 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-1">
              
              {/* Inline static summary */}
              {selectedNode.description && (
                <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-border bg-muted/15">
                  <span className="text-[9px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> Concept Summary</span>
                  <p className="text-[10px] text-muted-foreground leading-relaxed select-text">{selectedNode.description}</p>
                </div>
              )}

              {/* Gemini-Powered Grounded RAG Section */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> RAG Citation details
                </span>
                
                {detailLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    <span className="text-[10px] text-muted-foreground animate-pulse">Running grounded citation lookup...</span>
                  </div>
                ) : (
                  <div className="text-[10.5px] leading-relaxed text-muted-foreground border border-indigo-500/15 bg-indigo-500/[0.01] rounded-xl p-4">
                    {nodeDetails ? (
                      renderDetailsMarkdown(nodeDetails)
                    ) : (
                      <span className="italic">No details generated.</span>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Panel footer help note */}
            {onQuoteClick && (
              <div className="border-t border-border pt-2 text-[8px] text-muted-foreground flex gap-1 items-center shrink-0 leading-normal select-text">
                <BookOpen className="w-3 h-3 shrink-0 text-indigo-400" />
                <span>Double-quoted text can be clicked to highlight the exact citations in the source document page reader.</span>
              </div>
            )}
          </div>
        )}

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
