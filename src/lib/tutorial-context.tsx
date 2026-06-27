'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useWorkspace } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/posthog';
import { captureError } from '@/lib/sentry';

export type OnboardingPhase = 'welcome' | 'personalization' | 'workspace-setup' | 'missions' | 'celebration' | 'done';

export interface UserPersona {
  role: string;
  teamSize: string;
  goals: string[];
}

export interface OnboardingMission {
  id: string;
  title: string;
  description: string;
  xp: number;
}

export const ONBOARDING_MISSIONS: OnboardingMission[] = [
  {
    id: 'task',
    title: 'Create Your First Task',
    description: 'Type a task title, select a priority, and write it to your dashboard.',
    xp: 150,
  },
  {
    id: 'chat',
    title: 'Chat with Nexus AI',
    description: 'Consult your AI assistant on any prompt and receive an inline answer.',
    xp: 200,
  },
  {
    id: 'document',
    title: 'Summarize a Document',
    description: 'Upload a document or note and let AI automatically extract key details.',
    xp: 250,
  },
  {
    id: 'invite',
    title: 'Invite a Teammate',
    description: 'Send an invite link to collaborate and earn team productivity bonuses.',
    xp: 150,
  },
  {
    id: 'automation',
    title: 'Build an Automation',
    description: 'Set up an active trigger-action pair for continuous hands-free triaging.',
    xp: 250,
  },
];

export interface TutorialContextProps {
  // New Onboarding States
  onboardingPhase: OnboardingPhase;
  setOnboardingPhase: (phase: OnboardingPhase) => void;
  userPersona: UserPersona;
  setUserPersona: (persona: UserPersona) => void;
  completedMissions: string[];
  completeMission: (missionId: string) => void;

  // Backward Compatible Properties (Mocked or mapped)
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
  
  // Actions
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
  const { user } = useWorkspace();
  const router = useRouter();

  // Onboarding specific state
  const [onboardingPhase, setOnboardingPhase] = useState<OnboardingPhase>('welcome');
  const [userPersona, setUserPersona] = useState<UserPersona>({
    role: '',
    teamSize: '',
    goals: [],
  });
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);

  // Base state fields for backward compatibility
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [status, setStatus] = useState<TutorialContextProps['status']>('idle');
  const [abVariant, setAbVariant] = useState<'A' | 'B'>('A');
  const [loading, setLoading] = useState<boolean>(true);
  const [dbAvailable, setDbAvailable] = useState<boolean>(true);

  // Time metrics
  const phaseStartTimeRef = useRef<number>(Date.now());
  const tourStartTimeRef = useRef<number>(Date.now());

  const isTutorialActive = status === 'started' && onboardingPhase !== 'welcome' && onboardingPhase !== 'celebration' && onboardingPhase !== 'done';
  const isPaused = status === 'paused';
  const showWelcome = onboardingPhase === 'welcome';
  const showCelebration = onboardingPhase === 'celebration';

  // ── Helper: Safe Analytics Event logger ───────────────────────
  const logAnalyticsEvent = useCallback(async (
    eventName: string,
    stepIdx?: number,
    duration?: number,
    additionalMetadata: Record<string, any> = {}
  ) => {
    if (!user) return;

    const meta = {
      ab_variant: abVariant,
      device: typeof window !== 'undefined' ? (window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop') : 'unknown',
      screen_size: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
      onboarding_phase: onboardingPhase,
      role: userPersona.role,
      goals: userPersona.goals,
      completed_missions: completedMissions,
      ...additionalMetadata
    };

    console.log(`[Onboarding Analytics] ${eventName}:`, { stepIdx, duration, meta });

    trackEvent(eventName, {
      userId: user.id,
      stepIndex: stepIdx ?? null,
      duration: duration ?? null,
      ...meta
    });

    try {
      const { error } = await supabase.from('tutorial_analytics_events').insert({
        user_id: user.id,
        event_name: eventName,
        step_index: stepIdx ?? null,
        duration: duration ?? null,
        metadata: meta
      });

      if (error) {
        console.warn('Supabase analytics insert failed:', error.message);
        captureError(error, { context: 'supabase_analytics', eventName });
      }
    } catch (e) {
      console.warn('Failed to insert analytics event in Supabase:', e);
      captureError(e, { context: 'supabase_analytics_exception', eventName });
    }
  }, [user, abVariant, onboardingPhase, userPersona, completedMissions]);

  // ── Helper: Save progress to Database or LocalStorage ───────────
  const saveProgress = useCallback(async (
    newPhase: OnboardingPhase,
    newStatus: typeof status,
    newMissions: string[],
    persona: UserPersona,
    variantVal: 'A' | 'B'
  ) => {
    if (!user) return;

    const storageObj = {
      onboardingPhase: newPhase,
      status: newStatus,
      completedMissions: newMissions,
      userPersona: persona,
      abVariant: variantVal,
      currentStep: newPhase === 'done' ? 7 : (newPhase === 'welcome' ? 0 : 4),
      completedSteps: newMissions.length > 0 ? [1, 2] : [],
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(`nexus_tutorial_${user.id}`, JSON.stringify(storageObj));

    try {
      // First, get the current notification_settings value to preserve other settings
      const { data: profile } = await supabase
        .from('profiles')
        .select('notification_settings')
        .eq('id', user.id)
        .single();

      const currentSettings = profile?.notification_settings || {};
      const updatedSettings = {
        ...currentSettings,
        onboarding_progress: storageObj
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          notification_settings: updatedSettings
        })
        .eq('id', user.id);

      if (error) {
        setDbAvailable(false);
        console.warn('Supabase progress update failed, falling back to LocalStorage:', error.message);
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
          .from('profiles')
          .select('notification_settings')
          .eq('id', user.id)
          .single();

        if (error || !data) {
          if (localData) {
            setOnboardingPhase(localData.onboardingPhase || 'welcome');
            setStatus(localData.status || 'idle');
            setCompletedMissions(localData.completedMissions || []);
            setUserPersona(localData.userPersona || { role: '', teamSize: '', goals: [] });
            setAbVariant(localData.abVariant || 'A');
            setDbAvailable(!error || error.code !== 'PGRST116');
          } else {
            const chosenVariant = Math.random() < 0.5 ? 'A' : 'B';
            setAbVariant(chosenVariant);
            setOnboardingPhase('welcome');
            setStatus('idle');
            setCompletedMissions([]);
          }
        } else {
          setDbAvailable(true);
          const progress = data.notification_settings?.onboarding_progress;
          if (progress) {
            setOnboardingPhase(progress.onboardingPhase || 'welcome');
            setStatus(progress.status || 'idle');
            setCompletedMissions(progress.completedMissions || []);
            setUserPersona(progress.userPersona || { role: '', teamSize: '', goals: [] });
            setAbVariant(progress.abVariant || 'A');
          } else if (localData) {
            setOnboardingPhase(localData.onboardingPhase || 'welcome');
            setStatus(localData.status || 'idle');
            setCompletedMissions(localData.completedMissions || []);
            setUserPersona(localData.userPersona || { role: '', teamSize: '', goals: [] });
            setAbVariant(localData.abVariant || 'A');
          } else {
            const chosenVariant = Math.random() < 0.5 ? 'A' : 'B';
            setAbVariant(chosenVariant);
            setOnboardingPhase('welcome');
            setStatus('idle');
            setCompletedMissions([]);
          }
        }
      } catch (e) {
        setDbAvailable(false);
        console.warn('Failed to load progress from DB, using local caching:', e);
        if (localData) {
          setOnboardingPhase(localData.onboardingPhase || 'welcome');
          setStatus(localData.status || 'idle');
          setCompletedMissions(localData.completedMissions || []);
          setUserPersona(localData.userPersona || { role: '', teamSize: '', goals: [] });
          setAbVariant(localData.abVariant || 'A');
        } else {
          const chosenVariant = Math.random() < 0.5 ? 'A' : 'B';
          setAbVariant(chosenVariant);
          setOnboardingPhase('welcome');
          setStatus('idle');
          setCompletedMissions([]);
        }
      } finally {
        setLoading(false);
      }
    }

    loadProgress();
  }, [user]);

  const changePhase = useCallback((newPhase: OnboardingPhase) => {
    setOnboardingPhase(newPhase);
    const now = Date.now();
    const duration = Math.floor((now - phaseStartTimeRef.current) / 1000);
    phaseStartTimeRef.current = now;

    void logAnalyticsEvent('onboarding_phase_changed', undefined, duration, {
      from_phase: onboardingPhase,
      to_phase: newPhase,
    });

    let newStatus = status;
    if (newPhase === 'welcome') newStatus = 'idle';
    else if (newPhase === 'done') newStatus = 'completed';
    else if (status === 'idle') newStatus = 'started';

    setStatus(newStatus);
    void saveProgress(newPhase, newStatus, completedMissions, userPersona, abVariant);
  }, [onboardingPhase, status, completedMissions, userPersona, abVariant, logAnalyticsEvent, saveProgress]);

  const updatePersona = useCallback((persona: UserPersona) => {
    setUserPersona(persona);
    void saveProgress(onboardingPhase, status, completedMissions, persona, abVariant);
  }, [onboardingPhase, status, completedMissions, abVariant, saveProgress]);

  const completeMission = useCallback((missionId: string) => {
    if (completedMissions.includes(missionId)) return;

    const newMissions = [...completedMissions, missionId];
    setCompletedMissions(newMissions);

    const mission = ONBOARDING_MISSIONS.find(m => m.id === missionId);
    if (mission) {
      toast.success(`Mission Completed: ${mission.title}! (+${mission.xp} XP)`, {
        icon: '⚡',
      });
      void logAnalyticsEvent('onboarding_mission_completed', undefined, undefined, {
        mission_id: missionId,
        xp_earned: mission.xp,
      });
    }

    void saveProgress(onboardingPhase, status, newMissions, userPersona, abVariant);

    if (newMissions.length === ONBOARDING_MISSIONS.length) {
      setTimeout(() => {
        changePhase('celebration');
      }, 1200);
    }
  }, [completedMissions, onboardingPhase, status, userPersona, abVariant, logAnalyticsEvent, saveProgress, changePhase]);

  const startTutorial = useCallback(() => {
    phaseStartTimeRef.current = Date.now();
    tourStartTimeRef.current = Date.now();
    void logAnalyticsEvent('onboarding_started');
    changePhase('personalization');
  }, [changePhase, logAnalyticsEvent]);

  const nextStep = useCallback(() => {
    if (onboardingPhase === 'welcome') changePhase('personalization');
    else if (onboardingPhase === 'personalization') changePhase('workspace-setup');
    else if (onboardingPhase === 'workspace-setup') changePhase('missions');
    else if (onboardingPhase === 'missions') changePhase('celebration');
    else if (onboardingPhase === 'celebration') changePhase('done');
  }, [onboardingPhase, changePhase]);

  const prevStep = useCallback(() => {
    if (onboardingPhase === 'personalization') changePhase('welcome');
    else if (onboardingPhase === 'workspace-setup') changePhase('personalization');
    else if (onboardingPhase === 'missions') changePhase('workspace-setup');
    else if (onboardingPhase === 'celebration') changePhase('missions');
  }, [onboardingPhase, changePhase]);

  const skipTutorial = useCallback(() => {
    if (!user) return;
    const duration = Math.floor((Date.now() - tourStartTimeRef.current) / 1000);
    
    setStatus('skipped');
    setOnboardingPhase('done');
    
    void saveProgress('done', 'skipped', completedMissions, userPersona, abVariant);
    void logAnalyticsEvent('onboarding_skipped', undefined, duration);
    toast('Onboarding skipped. Access missions or guide from the Help Center.', {
      icon: '⚙️',
    });
  }, [user, completedMissions, userPersona, abVariant, saveProgress, logAnalyticsEvent]);

  const pauseTutorial = useCallback(() => {
    setStatus('paused');
    void saveProgress(onboardingPhase, 'paused', completedMissions, userPersona, abVariant);
    void logAnalyticsEvent('onboarding_paused');
  }, [onboardingPhase, completedMissions, userPersona, abVariant, saveProgress, logAnalyticsEvent]);

  const resumeTutorial = useCallback(() => {
    setStatus('started');
    void saveProgress(onboardingPhase, 'started', completedMissions, userPersona, abVariant);
    void logAnalyticsEvent('onboarding_resumed');
  }, [onboardingPhase, completedMissions, userPersona, abVariant, saveProgress, logAnalyticsEvent]);

  const restartTutorial = useCallback(() => {
    phaseStartTimeRef.current = Date.now();
    tourStartTimeRef.current = Date.now();
    setCompletedMissions([]);
    setUserPersona({ role: '', teamSize: '', goals: [] });
    changePhase('welcome');
    toast.info('Onboarding tour restarted!');
  }, [changePhase]);

  const trackInteractiveAction = useCallback((actionType: string) => {
    if (onboardingPhase !== 'missions') return;

    if (actionType === 'create_task') {
      completeMission('task');
    } else if (actionType === 'send_chat') {
      completeMission('chat');
    } else if (actionType === 'summarize_document') {
      completeMission('document');
    } else if (actionType === 'invite_member') {
      completeMission('invite');
    } else if (actionType === 'save_automation') {
      completeMission('automation');
    }
  }, [onboardingPhase, completeMission]);

  const resetProgress = useCallback(() => {
    if (!user) return;
    localStorage.removeItem(`nexus_tutorial_${user.id}`);
    
    setCompletedMissions([]);
    setUserPersona({ role: '', teamSize: '', goals: [] });
    setOnboardingPhase('welcome');
    setStatus('idle');

    const chosenVariant = Math.random() < 0.5 ? 'A' : 'B';
    setAbVariant(chosenVariant);

    void saveProgress('welcome', 'idle', [], { role: '', teamSize: '', goals: [] }, chosenVariant);
    toast.info('Onboarding state reset. Starting fresh!');
  }, [user, saveProgress]);

  const setAbVariantManually = useCallback((variant: 'A' | 'B') => {
    if (!user) return;
    setAbVariant(variant);
    void saveProgress(onboardingPhase, status, completedMissions, userPersona, variant);
    toast.success(`A/B Test Variant switched to: ${variant}`);
  }, [user, onboardingPhase, status, completedMissions, userPersona, saveProgress]);

  return (
    <TutorialContext.Provider
      value={{
        onboardingPhase,
        setOnboardingPhase: changePhase,
        userPersona,
        setUserPersona: updatePersona,
        completedMissions,
        completeMission,

        isTutorialActive,
        currentStep,
        status,
        abVariant,
        completedSteps: completedMissions.length > 0 ? [1, 2] : [],
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
        setAbVariantManually,
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
