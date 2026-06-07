'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useWorkspace } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface TutorialStep {
  id: number;
  name: string;
  target: string;
  title: string;
  descriptionA: string;
  descriptionB: string;
  page: string;
  route: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  interactiveAction?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 0,
    name: 'welcome',
    target: '',
    title: 'Welcome to Nexus AI!',
    descriptionA: "Let's take a quick 2-minute tour of your new workspace. We'll show you how to manage tasks, leverage AI insights, and organize your calendar.",
    descriptionB: "Learn the essentials of Nexus AI in 7 quick steps! Let's get started with a quick interactive tour.",
    page: 'dashboard',
    route: '/',
    placement: 'bottom'
  },
  {
    id: 1,
    name: 'left-sidebar',
    target: '[data-tutorial="left-sidebar"]',
    title: 'Your Workspace Sidebar',
    descriptionA: 'This sidebar is your workspace control center. Switch between team workspaces, search anything using ⌘K, or navigate between your Documents, AI Chat, Team Chat, Tasks, and Calendar.',
    descriptionB: 'This is your navigation sidebar. Use it to jump between Dashboard, Tasks, Docs, AI Chat, and Settings.',
    page: 'dashboard',
    route: '/',
    placement: 'right'
  },
  {
    id: 2,
    name: 'ai-recommendation',
    target: '[data-tutorial="ai-recommendation"]',
    title: 'AI Recommendations',
    descriptionA: 'Here, your AI Copilot analyzes your documents, calendar events, and tasks to give you personalized, actionable suggestions and daily briefs.',
    descriptionB: 'Get daily summaries and smart advice from your AI Chief of Staff here on the dashboard.',
    page: 'dashboard',
    route: '/',
    placement: 'bottom'
  },
  {
    id: 3,
    name: 'time-tracker',
    target: '[data-tutorial="time-tracker"]',
    title: 'Interactive Time Tracker',
    descriptionA: 'Track your focus time. Type in a task and click the "Play" button in the top bar to try starting a focus timer right now! Starting the timer will automatically advance you to the next step.',
    descriptionB: "Let's try it: Click the 'Play' button on the time tracker in the top bar to start tracking your time and advance!",
    page: 'dashboard',
    route: '/',
    placement: 'bottom',
    interactiveAction: 'start_timer'
  },
  {
    id: 4,
    name: 'ai-chat',
    target: '[data-tutorial="chat-input"]',
    title: 'AI Chat Assistant',
    descriptionA: 'Need help writing an email, summarizing a document, or planning a project? Chat with your AI Chief of Staff directly. Ask questions and get instant answers here.',
    descriptionB: 'Type a message here to consult your AI assistant on any document, task, or email draft.',
    page: 'chat',
    route: '/chat',
    placement: 'top'
  },
  {
    id: 5,
    name: 'tasks-board',
    target: '[data-tutorial="tasks-board"]',
    title: 'Collaborative Task Board',
    descriptionA: 'Track your projects using Kanban, list, or calendar views. Drag and drop tasks to update their status, set priorities, and assign deadlines.',
    descriptionB: 'Manage your workload here. Try dragging tasks to update status or adding a new task to your list.',
    page: 'tasks',
    route: '/tasks',
    placement: 'top'
  },
  {
    id: 6,
    name: 'documents-container',
    target: '[data-tutorial="documents-container"]',
    title: 'Document Hub & Pages',
    descriptionA: 'Create rich documents, meeting notes, and team wikis. The AI can summarize or extract tasks from any uploaded document automatically.',
    descriptionB: 'Draft notes and wikis here. Drag in files to let AI automatically extract key details and tasks.',
    page: 'documents',
    route: '/documents',
    placement: 'top'
  },
  {
    id: 7,
    name: 'celebration',
    target: '',
    title: "You're All Set!",
    descriptionA: "Congratulations on completing the Nexus AI onboarding tour! You're ready to supercharge your productivity. You can relaunch this tour anytime from the settings or Help menu.",
    descriptionB: "Awesome job completing the onboarding tour! You're now ready to use Nexus AI to its fullest potential.",
    page: 'dashboard',
    route: '/',
    placement: 'bottom'
  }
];

export interface TutorialContextProps {
  isTutorialActive: boolean;
  currentStep: number;
  status: 'started' | 'paused' | 'completed' | 'skipped' | 'idle';
  abVariant: 'A' | 'B';
  completedSteps: number[];
  isPaused: boolean;
  loading: boolean;
  dbAvailable: boolean;
  showWelcome: boolean;
  showCelebration: boolean;
  startTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  pauseTutorial: () => void;
  resumeTutorial: () => void;
  restartTutorial: () => void;
  trackInteractiveAction: (actionType: string) => void;
  resetProgress: () => void;
  setAbVariantManually: (variant: 'A' | 'B') => void;
}

const TutorialContext = createContext<TutorialContextProps | undefined>(undefined);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const { user, activePage, setActivePage } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();

  // Basic States
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [status, setStatus] = useState<'started' | 'paused' | 'completed' | 'skipped' | 'idle'>('idle');
  const [abVariant, setAbVariant] = useState<'A' | 'B'>('A');
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dbAvailable, setDbAvailable] = useState<boolean>(true);
  
  // Modal Visibility States
  const [showWelcome, setShowWelcome] = useState<boolean>(false);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

  // Time metrics
  const stepStartTimeRef = useRef<number>(Date.now());
  const tourStartTimeRef = useRef<number>(Date.now());

  const isTutorialActive = status === 'started' && !showWelcome && !showCelebration;
  const isPaused = status === 'paused';

  // ── Helper: Safe Analytics Event logger ───────────────────────
  const logAnalyticsEvent = useCallback(async (
    eventName: string,
    stepIdx?: number,
    duration?: number,
    additionalMetadata: Record<string, any> = {}
  ) => {
    if (!user) return;

    const stepName = stepIdx !== undefined ? TUTORIAL_STEPS[stepIdx]?.name : undefined;
    const meta = {
      ab_variant: abVariant,
      device: typeof window !== 'undefined' ? (window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop') : 'unknown',
      screen_size: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
      ...additionalMetadata
    };

    console.log(`[Tutorial Analytics] ${eventName}:`, { stepIdx, stepName, duration, meta });

    try {
      const { error } = await supabase.from('tutorial_analytics_events').insert({
        user_id: user.id,
        event_name: eventName,
        step_index: stepIdx ?? null,
        step_name: stepName ?? null,
        duration: duration ?? null,
        metadata: meta
      });

      if (error) {
        // Fallback or ignore
        console.warn('Supabase analytics insert failed:', error.message);
      }
    } catch (e) {
      console.warn('Failed to insert analytics event in Supabase:', e);
    }
  }, [user, abVariant]);

  // ── Helper: Save progress to Database or LocalStorage ───────────
  const saveProgress = useCallback(async (
    newStep: number,
    newStatus: typeof status,
    newCompleted: number[],
    variantVal: 'A' | 'B'
  ) => {
    if (!user) return;

    // Save to LocalStorage first for instant updates & offline resiliency
    const storageObj = {
      currentStep: newStep,
      status: newStatus,
      completedSteps: newCompleted,
      abVariant: variantVal,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(`nexus_tutorial_${user.id}`, JSON.stringify(storageObj));

    try {
      const { error } = await supabase.from('user_tutorial_progress').upsert({
        user_id: user.id,
        current_step: newStep,
        status: newStatus,
        ab_variant: variantVal,
        completed_steps: newCompleted,
        updated_at: new Date().toISOString()
      });

      if (error) {
        setDbAvailable(false);
        console.warn('Supabase progress upsert failed, falling back to LocalStorage:', error.message);
      } else {
        setDbAvailable(true);
      }
    } catch (e) {
      setDbAvailable(false);
      console.warn('Supabase tutorial progress sync error, using LocalStorage fallback:', e);
    }
  }, [user]);

  // ── Load state from DB / LocalStorage on user change ─────────────
  useEffect(() => {
    async function loadProgress() {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      let localData: any = null;
      try {
        const cached = localStorage.getItem(`nexus_tutorial_${user.id}`);
        if (cached) {
          localData = JSON.parse(cached);
        }
      } catch (e) {
        console.warn('LocalStorage read error:', e);
      }

      try {
        const { data, error } = await supabase
          .from('user_tutorial_progress')
          .select('current_step, status, ab_variant, completed_steps')
          .eq('user_id', user.id)
          .single();

        if (error || !data) {
          // If not in DB, use local data if it exists
          if (localData) {
            setCurrentStep(localData.currentStep);
            setStatus(localData.status);
            setCompletedSteps(localData.completedSteps);
            setAbVariant(localData.abVariant);
            setDbAvailable(!error || error.code !== 'PGRST116'); // PGRST116 is row not found
          } else {
            // First time user! Assign random A/B test variant
            const chosenVariant = Math.random() < 0.5 ? 'A' : 'B';
            setAbVariant(chosenVariant);
            setCurrentStep(0);
            setStatus('idle');
            setCompletedSteps([]);
            setShowWelcome(true); // Trigger welcome modal automatically
          }
        } else {
          // Loaded successfully from DB
          setDbAvailable(true);
          setCurrentStep(data.current_step);
          setStatus(data.status as any);
          setCompletedSteps(data.completed_steps || []);
          setAbVariant(data.ab_variant as any);

          // If they are brand new and status is idle, show Welcome
          if (data.status === 'idle' && data.current_step === 0) {
            setShowWelcome(true);
          }
        }
      } catch (e) {
        setDbAvailable(false);
        console.warn('Failed to load progress from DB, using local caching:', e);
        if (localData) {
          setCurrentStep(localData.currentStep);
          setStatus(localData.status);
          setCompletedSteps(localData.completedSteps);
          setAbVariant(localData.abVariant);
        } else {
          const chosenVariant = Math.random() < 0.5 ? 'A' : 'B';
          setAbVariant(chosenVariant);
          setCurrentStep(0);
          setStatus('idle');
          setCompletedSteps([]);
          setShowWelcome(true);
        }
      } finally {
        setLoading(false);
      }
    }

    loadProgress();
  }, [user]);

  // ── Sync Navigation when currentStep changes ────────────────────
  useEffect(() => {
    if (status !== 'started' || showWelcome || showCelebration) return;

    const step = TUTORIAL_STEPS[currentStep];
    if (!step) return;

    // Check if route matches current step
    if (step.page && activePage !== step.page) {
      setActivePage(step.page as any);
      router.push(step.route);
    }
  }, [currentStep, status, activePage, setActivePage, router, showWelcome, showCelebration]);

  // ── State Mutators ──────────────────────────────────────────────

  const startTutorial = useCallback(() => {
    if (!user) return;
    setShowWelcome(false);
    setShowCelebration(false);
    setCurrentStep(1); // Welcome is 0, first highlight is 1
    setStatus('started');
    setCompletedSteps([]);
    stepStartTimeRef.current = Date.now();
    tourStartTimeRef.current = Date.now();

    void saveProgress(1, 'started', [], abVariant);
    void logAnalyticsEvent('tutorial_started');
  }, [user, abVariant, saveProgress, logAnalyticsEvent]);

  const nextStep = useCallback(() => {
    if (!user || status !== 'started') return;

    const now = Date.now();
    const duration = Math.floor((now - stepStartTimeRef.current) / 1000);
    stepStartTimeRef.current = now;

    // Log step completed
    void logAnalyticsEvent('tutorial_step_completed', currentStep, duration);

    const nextIdx = currentStep + 1;
    const nextCompleted = Array.from(new Set([...completedSteps, currentStep]));
    setCompletedSteps(nextCompleted);

    if (nextIdx >= TUTORIAL_STEPS.length - 1) {
      // Completed tutorial!
      setCurrentStep(TUTORIAL_STEPS.length - 1);
      setStatus('completed');
      setShowCelebration(true);

      const totalDuration = Math.floor((now - tourStartTimeRef.current) / 1000);
      void saveProgress(TUTORIAL_STEPS.length - 1, 'completed', nextCompleted, abVariant);
      void logAnalyticsEvent('tutorial_completed', TUTORIAL_STEPS.length - 1, totalDuration);
      toast.success('Workspace tour completed!', { icon: <img src="/favicon.ico" className="w-4 h-4 object-contain" alt="" /> });
    } else {
      // Move to next step
      setCurrentStep(nextIdx);
      void saveProgress(nextIdx, 'started', nextCompleted, abVariant);
    }
  }, [user, currentStep, completedSteps, status, abVariant, saveProgress, logAnalyticsEvent]);

  const prevStep = useCallback(() => {
    if (!user || status !== 'started' || currentStep <= 1) return;

    const prevIdx = currentStep - 1;
    setCurrentStep(prevIdx);
    stepStartTimeRef.current = Date.now();
    void saveProgress(prevIdx, 'started', completedSteps, abVariant);
  }, [user, currentStep, completedSteps, abVariant, saveProgress]);

  const skipTutorial = useCallback(() => {
    if (!user) return;

    const now = Date.now();
    const duration = Math.floor((now - tourStartTimeRef.current) / 1000);

    setStatus('skipped');
    setShowWelcome(false);
    setShowCelebration(false);

    void saveProgress(currentStep, 'skipped', completedSteps, abVariant);
    void logAnalyticsEvent('tutorial_skipped', currentStep, duration);
    toast('Tutorial skipped. You can restart it anytime from settings.', { icon: <img src="/favicon.ico" className="w-4 h-4 object-contain" alt="" /> });
  }, [user, currentStep, completedSteps, abVariant, saveProgress, logAnalyticsEvent]);

  const pauseTutorial = useCallback(() => {
    if (!user || status !== 'started') return;

    setStatus('paused');
    const now = Date.now();
    const duration = Math.floor((now - stepStartTimeRef.current) / 1000);

    void saveProgress(currentStep, 'paused', completedSteps, abVariant);
    void logAnalyticsEvent('tutorial_paused', currentStep, duration);
  }, [user, currentStep, completedSteps, status, abVariant, saveProgress, logAnalyticsEvent]);

  const resumeTutorial = useCallback(() => {
    if (!user || status !== 'paused') return;

    setStatus('started');
    stepStartTimeRef.current = Date.now();
    void saveProgress(currentStep, 'started', completedSteps, abVariant);
    void logAnalyticsEvent('tutorial_resumed', currentStep);
  }, [user, currentStep, completedSteps, status, abVariant, saveProgress, logAnalyticsEvent]);

  const restartTutorial = useCallback(() => {
    if (!user) return;

    setShowWelcome(false);
    setShowCelebration(false);
    setCurrentStep(1);
    setStatus('started');
    setCompletedSteps([]);
    stepStartTimeRef.current = Date.now();
    tourStartTimeRef.current = Date.now();

    void saveProgress(1, 'started', [], abVariant);
    void logAnalyticsEvent('tutorial_restarted');
    toast.info('Workspace tour restarted!');
  }, [user, abVariant, saveProgress, logAnalyticsEvent]);

  const trackInteractiveAction = useCallback((actionType: string) => {
    if (!user || status !== 'started') return;

    // Check if the current step matches the expected interactive action
    const step = TUTORIAL_STEPS[currentStep];
    if (step && step.interactiveAction === actionType) {
      console.log(`[Tutorial Interactive Action] Action: ${actionType} triggered at Step ${currentStep}`);
      void logAnalyticsEvent('interactive_action_taken', currentStep, undefined, { action_type: actionType });
      
      // Auto advance to next step after action
      toast.success('Nice job! Action completed.', { id: 'tutorial-action-toast' });
      nextStep();
    }
  }, [user, currentStep, status, logAnalyticsEvent, nextStep]);

  const resetProgress = useCallback(() => {
    if (!user) return;
    localStorage.removeItem(`nexus_tutorial_${user.id}`);
    setCurrentStep(0);
    setStatus('idle');
    setCompletedSteps([]);
    setShowWelcome(true);
    setShowCelebration(false);
    
    // Assign a new random A/B variant to simulate clean slate
    const chosenVariant = Math.random() < 0.5 ? 'A' : 'B';
    setAbVariant(chosenVariant);

    void saveProgress(0, 'idle', [], chosenVariant);
    toast.info('Tutorial progress cleared. Starting fresh!');
  }, [user, saveProgress]);

  const setAbVariantManually = useCallback((variant: 'A' | 'B') => {
    if (!user) return;
    setAbVariant(variant);
    void saveProgress(currentStep, status, completedSteps, variant);
    toast.success(`A/B Test Variant switched to: ${variant}`);
  }, [user, currentStep, status, completedSteps, saveProgress]);

  return (
    <TutorialContext.Provider
      value={{
        isTutorialActive,
        currentStep,
        status,
        abVariant,
        completedSteps,
        isPaused,
        loading,
        dbAvailable,
        showWelcome,
        showCelebration,
        startTutorial,
        nextStep,
        prevStep,
        skipTutorial,
        pauseTutorial,
        resumeTutorial,
        restartTutorial,
        trackInteractiveAction,
        resetProgress,
        setAbVariantManually
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}
