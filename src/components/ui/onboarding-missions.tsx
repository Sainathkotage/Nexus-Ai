'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTutorial, ONBOARDING_MISSIONS } from '@/lib/tutorial-context';
import { useWorkspace } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, Circle, Sparkles, Send, Upload, UserPlus, 
  Settings, ArrowRight, Loader2, Plus, Play, Lock, Copy
} from 'lucide-react';
import { toast } from 'sonner';

export function OnboardingMissions() {
  const { completedMissions, completeMission, setOnboardingPhase } = useTutorial();
  const { addTask, addDocument, user } = useWorkspace();
  const [activeTab, setActiveTab] = useState<string>('task');

  // Mission 1 states: Task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskDesc, setTaskDesc] = useState('');
  const [createdTask, setCreatedTask] = useState<any>(null);

  // Mission 2 states: Chat
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'nexus'; text: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Mission 3 states: Document
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docSummary, setDocSummary] = useState<string | null>(null);

  // Mission 4 states: Invite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteSent, setInviteSent] = useState(false);

  // Mission 5 states: Automation
  const [trigger, setTrigger] = useState('task_created');
  const [action, setAction] = useState('summarize');
  const [automationSaved, setAutomationSaved] = useState(false);

  // Calculate overall progress percentage
  const progressPercent = Math.round((completedMissions.length / ONBOARDING_MISSIONS.length) * 100);

  // Handles: Task Creation Form Submission
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      const newTask = {
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        priority: taskPriority,
        status: 'todo' as const,
        tags: ['Onboarding'],
      };

      await addTask(newTask);
      setCreatedTask(newTask);
      completeMission('task');
      toast.success('Task created successfully! Check it out later on your board.');
    } catch (err) {
      toast.error('Could not create task. Please try again.');
    }
  };

  // Handles: Chat Prompt Submission
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = chatInput.trim();
    if (!prompt) return;

    setChatHistory((prev) => [...prev, { sender: 'user', text: prompt }]);
    setChatInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are Nexus AI, a helpful chief of staff assistant. Keep answers concise (under 2 sentences).',
            },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setChatHistory((prev) => [...prev, { sender: 'nexus', text: data.text || 'I am ready to help you manage tasks and meetings.' }]);
        completeMission('chat');
      } else {
        throw new Error();
      }
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        { sender: 'nexus', text: 'I am here! I have loaded your workspace guidelines. You can assign tasks and manage documents.' },
      ]);
      completeMission('chat');
    } finally {
      setIsTyping(false);
    }
  };

  // Handles: Document Selection & Summarization Simulation
  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocFile(file);
    setDocUploading(true);

    // Simulate analysis & extraction
    setTimeout(async () => {
      try {
        const textPreview = `Analysis of document "${file.name}" completed successfully. This file is classified under team guidelines. Key points extracted: (1) Initial action items mapped to main assignee. (2) Timelines updated on project boards.`;
        
        await addDocument({
          title: file.name,
          type: file.name.endsWith('.pdf') ? 'pdf' : 'text',
          size: file.size,
          summary: `Summary of ${file.name}: AI extracted core requirements and verified commitments. Key points: Review project deadlines and invite client for sync.`,
          content: textPreview,
          tags: ['Onboarding'],
          processingStatus: 'completed',
        });

        setDocSummary(
          `✓ Document parsed successfully!\n\nAI Summary: Key tasks extracted from "${file.name}". Proactive advice generated: Send introductory emails and schedule focus sessions.`
        );
        completeMission('document');
      } catch (err) {
        toast.error('Error synchronizing document to store.');
      } finally {
        setDocUploading(false);
      }
    }, 2000);
  };

  // Handles: Teammate Invite Simulation
  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const mockCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const link = `${window.location.origin}/invite/${mockCode}`;
    
    setInviteLink(link);
    setInviteSent(true);
    completeMission('invite');
  };

  // Handles: Automation Builder Submission
  const handleAutomationSave = (e: React.FormEvent) => {
    e.preventDefault();
    setAutomationSaved(true);
    completeMission('automation');
  };

  // Skip or celebrate redirect
  const handleFinish = () => {
    if (completedMissions.length === ONBOARDING_MISSIONS.length) {
      setOnboardingPhase('celebration');
    } else {
      toast.info('Complete all 5 missions to access your workspace celebration!');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row w-full h-[620px] bg-background border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative z-10 font-sans">
      
      {/* LEFT PANEL: Mission Selection list */}
      <div className="w-full lg:w-80 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col p-6 shrink-0 justify-between h-1/3 lg:h-full">
        <div className="flex flex-col gap-5">
          <div>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-1 font-mono">
              Onboarding Dashboard
            </span>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              Interactive Missions
            </h3>
          </div>

          {/* Progress gauge */}
          <div className="flex flex-col gap-2 bg-card border border-slate-200/50 dark:border-slate-800/60 p-4 rounded-xl shadow-sm">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Missions Complete</span>
              <span>{completedMissions.length} / {ONBOARDING_MISSIONS.length}</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-200/20">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Missions items */}
          <nav className="flex flex-col gap-1.5 overflow-y-auto max-h-[220px] lg:max-h-none">
            {ONBOARDING_MISSIONS.map((m, idx) => {
              const isCompleted = completedMissions.includes(m.id);
              const isActive = activeTab === m.id;

              return (
                <button
                  key={m.id}
                  onClick={() => setActiveTab(m.id)}
                  className={`w-full p-3 rounded-xl border text-left transition-all duration-200 flex items-center gap-3 group cursor-pointer ${
                    isActive
                      ? 'border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/10 text-indigo-700 dark:text-indigo-400 font-semibold shadow-sm'
                      : 'border-transparent hover:bg-slate-100/50 dark:hover:bg-slate-800/30 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300 dark:text-slate-700 group-hover:text-slate-400 shrink-0" />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs truncate font-bold">{m.title}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-medium block">
                      +{m.xp} XP
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Celebrate button at bottom */}
        {completedMissions.length === ONBOARDING_MISSIONS.length && (
          <Button
            onClick={handleFinish}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-2.5 rounded-xl shadow-lg border-0 cursor-pointer flex items-center justify-center gap-2 group mt-4"
          >
            <span>Finish Onboarding!</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        )}
      </div>

      {/* RIGHT PANEL: Sandbox Workspace */}
      <div className="flex-1 bg-card dark:bg-slate-950/30 p-6 flex flex-col justify-between overflow-y-auto h-2/3 lg:h-full">
        
        {/* Render Sandbox UI based on active tab */}
        <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full">
          <AnimatePresence mode="wait">
            
            {/* MISSION 1: Create Task */}
            {activeTab === 'task' && (
              <motion.div
                key="task"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-6"
              >
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                    <span>Create Your First Task</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                    Fill out the form below to register your first action item. Nexus AI maps these tasks onto your Kanban board.
                  </p>
                </div>

                {!createdTask ? (
                  <form onSubmit={handleTaskSubmit} className="flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-xl border border-slate-200/50 dark:border-slate-800/60 shadow-sm">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Task Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Schedule design sync with Sarah"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        required
                        className="bg-card border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Priority</label>
                        <select
                          value={taskPriority}
                          onChange={(e: any) => setTaskPriority(e.target.value)}
                          className="bg-card border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tags</label>
                        <input
                          type="text"
                          value="Onboarding"
                          disabled
                          className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description (Optional)</label>
                      <textarea
                        rows={2}
                        placeholder="Detail the instructions or dependencies..."
                        value={taskDesc}
                        onChange={(e) => setTaskDesc(e.target.value)}
                        className="bg-card border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                      />
                    </div>

                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-lg transition-colors border-0 cursor-pointer mt-1">
                      Create Task
                    </Button>
                  </form>
                ) : (
                  <div className="bg-green-500/5 border border-green-500/20 p-5 rounded-xl flex flex-col gap-3.5 text-left">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Task Completed!</span>
                    </div>
                    <div className="bg-card border border-slate-200 dark:border-slate-800 p-4 rounded-lg shadow-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{createdTask.title}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          createdTask.priority === 'high' ? 'bg-red-500/10 text-red-600' : 'bg-slate-500/10 text-slate-600'
                        }`}>
                          {createdTask.priority}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">{createdTask.description || 'No description provided.'}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* MISSION 2: Chat with AI */}
            {activeTab === 'chat' && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-4 h-full"
              >
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    <span>Consult your AI Chief of Staff</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                    Ask Nexus to draft templates, summarize calendar bookings, or index pending commitments.
                  </p>
                </div>

                {/* Simulated chat console */}
                <div className="flex-1 flex flex-col gap-3 min-h-[220px] max-h-[260px] overflow-y-auto border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 p-4 rounded-xl shadow-inner scrollbar-thin">
                  {chatHistory.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 p-4">
                      <Sparkles className="w-6 h-6 mb-2 text-indigo-400 animate-pulse" />
                      <span className="text-[10px] leading-relaxed max-w-[200px]">Send a quick query below or use the preset suggestions.</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5 text-xs">
                      {chatHistory.map((chat, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                            chat.sender === 'user'
                              ? 'bg-indigo-600 text-white self-end rounded-br-none shadow-sm'
                              : 'bg-card border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 self-start rounded-bl-none shadow-sm'
                          }`}
                        >
                          {chat.text}
                        </div>
                      ))}
                      {isTyping && (
                        <div className="bg-card border border-slate-200 dark:border-slate-800 p-3 rounded-xl rounded-bl-none self-start flex items-center gap-1 shrink-0 text-slate-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="text-[10px]">Thinking...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Suggested Prompts */}
                {chatHistory.length === 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setChatInput('What tasks are assigned to me for this sprint?')}
                      className="text-[10px] font-semibold border border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-900 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      "What tasks are assigned to me?"
                    </button>
                    <button
                      onClick={() => setChatInput('Draft an introduction email for my new project.')}
                      className="text-[10px] font-semibold border border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50 dark:hover:bg-slate-900 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      "Draft an intro email"
                    </button>
                  </div>
                )}

                {/* Chat input box */}
                <form onSubmit={handleChatSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask Nexus anything..."
                    className="flex-1 bg-card border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <Button type="submit" size="icon" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-2.5 cursor-pointer shrink-0 border-0 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </motion.div>
            )}

            {/* MISSION 3: Summarize Document */}
            {activeTab === 'document' && (
              <motion.div
                key="document"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-6"
              >
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Upload className="w-5 h-5 text-indigo-500" />
                    <span>Summarize a Document</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                    Upload any PDF, text, or markdown file. Nexus AI parses, indexes, and extracts key decisions/tasks automatically.
                  </p>
                </div>

                {!docSummary ? (
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 rounded-xl p-8 bg-slate-50/50 dark:bg-slate-900/10 cursor-pointer transition-colors relative">
                    <input
                      type="file"
                      accept=".pdf,.txt,.md"
                      onChange={handleDocUpload}
                      disabled={docUploading}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {docUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        <span className="text-xs text-slate-500 font-semibold animate-pulse">Parsing document contexts...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <Upload className="w-8 h-8 text-slate-400" />
                        <div className="flex flex-col text-center">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Choose a file or drag here</span>
                          <span className="text-[10px] text-slate-400 mt-1">PDF, TXT, or MD up to 10MB</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-indigo-500/5 border border-indigo-500/20 p-5 rounded-xl flex flex-col gap-3 text-left">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono">Analysis Complete</span>
                    <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-medium whitespace-pre-line bg-card border border-slate-200 dark:border-slate-800 p-4 rounded-lg shadow-sm">
                      {docSummary}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* MISSION 4: Invite Teammate */}
            {activeTab === 'invite' && (
              <motion.div
                key="invite"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-6"
              >
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-indigo-500" />
                    <span>Invite a Teammate</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                    Nexus works best in teams. Type an email address below to generate a workspace invite token link.
                  </p>
                </div>

                {!inviteSent ? (
                  <form onSubmit={handleInviteSubmit} className="flex gap-2 bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-xl border border-slate-200/50 dark:border-slate-800/60 shadow-sm items-end">
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Teammate's Email</label>
                      <input
                        type="email"
                        placeholder="colleague@yourcompany.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                        className="bg-card border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-lg transition-colors border-0 cursor-pointer">
                      Send Invite
                    </Button>
                  </form>
                ) : (
                  <div className="flex flex-col gap-4 bg-green-500/5 border border-green-500/20 p-5 rounded-xl">
                    <span className="text-xs font-bold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Invitation generated successfully!</span>
                    </span>
                    
                    <div className="flex items-center justify-between gap-2 bg-card border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg shadow-sm">
                      <span className="text-xs truncate font-mono select-all text-slate-600 dark:text-slate-400">{inviteLink}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inviteLink);
                          toast.success('Invite link copied!');
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1 shrink-0 bg-transparent border-0 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        Copy Link
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* MISSION 5: Automations */}
            {activeTab === 'automation' && (
              <motion.div
                key="automation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-6"
              >
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-indigo-500" />
                    <span>Build Your First Automation</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                    Design a trigger-action sequence to automate routine administrative updates and task assignments.
                  </p>
                </div>

                {!automationSaved ? (
                  <form onSubmit={handleAutomationSave} className="flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-xl border border-slate-200/50 dark:border-slate-800/60 shadow-sm">
                    
                    {/* TRIGGER select */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">IF THIS HAPPENS (TRIGGER)</label>
                      <select
                        value={trigger}
                        onChange={(e) => setTrigger(e.target.value)}
                        className="bg-card border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="task_created">A new task is created</option>
                        <option value="doc_uploaded">A document is uploaded</option>
                        <option value="email_received">An email is received</option>
                      </select>
                    </div>

                    {/* ACTION select */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">THEN DO THIS (ACTION)</label>
                      <select
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        className="bg-card border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="summarize">Have Nexus summarize and link to workspace</option>
                        <option value="alert">Send notification message to team huddle</option>
                        <option value="assign">Auto-assign based on roles guidelines</option>
                      </select>
                    </div>

                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded-lg transition-colors border-0 cursor-pointer mt-1">
                      Save Automation
                    </Button>
                  </form>
                ) : (
                  <div className="bg-indigo-500/5 border border-indigo-500/20 p-5 rounded-xl flex flex-col gap-3 text-left">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Automation Saved Successfully!</span>
                    </span>
                    <div className="bg-card border border-slate-200 dark:border-slate-800 p-4 rounded-lg shadow-sm text-xs font-medium text-slate-600 dark:text-slate-400 font-mono leading-relaxed">
                      IF: {trigger === 'task_created' ? 'Task Created' : trigger === 'doc_uploaded' ? 'Document Uploaded' : 'Email Received'}<br />
                      THEN: {action === 'summarize' ? 'Ask Nexus to summarize' : action === 'alert' ? 'Send team huddle alert' : 'Auto-assign to member'}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Persistant tip bar */}
        <div className="mt-8 border-t border-slate-100 dark:border-slate-800/80 pt-4 flex justify-between items-center">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Context tip: Complete tasks to earn badge rewards.</span>
          </span>

          <button
            onClick={() => setOnboardingPhase('done')}
            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors hover:underline bg-transparent border-0 cursor-pointer"
          >
            Skip Missions
          </button>
        </div>

      </div>

    </div>
  );
}
