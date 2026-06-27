'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useWorkspace } from '@/lib/store';
import { usePopup } from '@/lib/popup-context';
import { Deal, CalendarEvent, Email } from '@/types';
import { 
  BarChart3, Plus, Search, DollarSign, TrendingUp, Briefcase, 
  Trash2, ArrowRight, User, Settings, Check, X, AlertCircle, ChevronLeft, ChevronRight,
  Sparkles, Calendar as CalendarIcon, Mail as MailIcon, Sliders, Clock, UserCheck, Activity,
  ArrowDown, Send, Lock, FileText, LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

type Stage = Deal['stage'];

const STAGES: { id: Stage; label: string; color: string; bg: string }[] = [
  { id: 'lead', label: 'Lead', color: 'border-t-zinc-400 dark:border-t-zinc-600', bg: 'bg-zinc-50 dark:bg-zinc-950/20' },
  { id: 'contacted', label: 'Contacted', color: 'border-t-blue-500', bg: 'bg-blue-50/20 dark:bg-blue-950/10' },
  { id: 'proposal', label: 'Proposal', color: 'border-t-amber-500', bg: 'bg-amber-50/20 dark:bg-amber-950/10' },
  { id: 'negotiation', label: 'Negotiation', color: 'border-t-purple-500', bg: 'bg-purple-50/20 dark:bg-purple-950/10' },
  { id: 'won', label: 'Won', color: 'border-t-emerald-500', bg: 'bg-emerald-50/20 dark:bg-emerald-950/10' },
  { id: 'lost', label: 'Lost', color: 'border-t-red-500', bg: 'bg-red-50/20 dark:bg-red-950/10' }];

export default function CRMPage() {
  const { 
    deals, updateDealStage, addDeal, deleteDeal, 
    selectedDealId, setSelectedDealId, syncDeals, user, emails, calendarEvents, workspace,
    addEmail, addNotification
  } = useWorkspace();
  const { confirm } = usePopup();
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'my'>('all');
  const [drillDownStage, setDrillDownStage] = useState<Stage | null>(null);
  const [showStaleOnly, setShowStaleOnly] = useState(false);
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);

  // Mobile Swipe Column Layout
  const [mobileActiveColumn, setMobileActiveColumn] = useState<Stage>('lead');

  // Dashboard customization state
  const [showDashboardConfig, setShowDashboardConfig] = useState(false);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [widgets, setWidgets] = useState([
    { id: 'funnel', title: 'Funnel & Win/Loss Analysis', visible: true },
    { id: 'forecast', title: 'AI Forecast & Weighted Pipeline', visible: true },
    { id: 'rotting', title: 'Rotting Deals & Stale Alerts', visible: true },
    { id: 'reports', title: 'Scheduled Automated Reports', visible: true }]);

  // Dialog states
  const [isAddDealOpen, setIsAddDealOpen] = useState(false);
  const [detailDeal, setDetailDeal] = useState<Deal | null>(null);

  // Add deal form inputs
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newValue, setNewValue] = useState<number>(0);
  const [newStage, setNewStage] = useState<Stage>('lead');
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Report scheduler inputs
  const [reportType, setReportType] = useState('pipeline_summary');
  const [reportFrequency, setReportFrequency] = useState('weekly_monday');

  const isGuest = user?.role === 'Guest';

  // Real-time Pipeline Channel Subscription
  useEffect(() => {
    
    if (!workspace) return;
    
    const channelName = `crm-${workspace.id}`;
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'crm-update' }, ({ payload }) => {
        if (payload && payload.senderId !== user?.id) {
          if (payload.deals) {
            syncDeals(payload.deals);
          }
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to CRM channel: ${channelName}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspace, user?.id, syncDeals]);

  const broadcastDeals = (updatedDeals: Deal[]) => {
    if (channelRef.current && user) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'crm-update',
        payload: {
          deals: updatedDeals,
          senderId: user.id
        }
      });
    }
  };

  useEffect(() => {
    if (selectedDealId === 'new') {
      setIsAddDealOpen(true);
    } else if (selectedDealId && selectedDealId !== 'new') {
      const found = deals.find(d => d.id === selectedDealId);
      if (found) setDetailDeal(found);
    }
  }, [selectedDealId, deals]);

  const handleCloseAddDeal = () => {
    setIsAddDealOpen(false);
    if (selectedDealId === 'new') {
      setSelectedDealId(null);
    }
  };

  const handleCloseDetailDeal = () => {
    setDetailDeal(null);
    if (selectedDealId && selectedDealId !== 'new') {
      setSelectedDealId(null);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
      if (e.deltaY !== 0) {
        e.preventDefault();
        scrollContainerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  const handleUpdateStage = async (dealId: string, stage: Stage) => {
    if (isGuest) {
      toast.warning('Guest account: Read-only access');
      return;
    }
    await updateDealStage(dealId, stage);
    const updated = deals.map(d => d.id === dealId ? { ...d, stage, stageUpdatedAt: new Date().toISOString() } : d);
    broadcastDeals(updated);
    toast.success(`Deal stage updated to ${stage}`);
  };

  const handleAddDealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      toast.error('Permission denied: Guests cannot add deals');
      return;
    }
    if (!newTitle.trim() || !newCompany.trim() || newValue <= 0) {
      toast.error('Deal Name, Company, and Value are required');
      return;
    }

    const newDeal: Deal = {
      id: `deal-${Date.now()}`,
      title: newTitle,
      company: newCompany,
      value: newValue,
      stage: newStage,
      score: Math.floor(Math.random() * 40) + 60, // AI Score allocation
      forecastCategory: newValue > 150000 ? 'commit' : newValue > 75000 ? 'best_case' : 'pipeline',
      stageUpdatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      primaryContactName: newContactName || 'Unknown Contact',
      primaryContactEmail: newContactEmail || `sales@${newCompany.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company'}.com`,
      ownerId: user?.id || 'user-admin',
      ownerName: user?.name || 'Sainath Kotage',
      notes: newNotes
    };

    await addDeal(newDeal);
    broadcastDeals([...deals, newDeal]);

    setNewTitle('');
    setNewCompany('');
    setNewValue(0);
    setNewStage('lead');
    setNewContactName('');
    setNewContactEmail('');
    setNewNotes('');
    handleCloseAddDeal();
    toast.success('CRM Deal Opportunity added successfully');
  };

  const handleDeleteDealClick = async (id: string) => {
    if (isGuest) {
      toast.error('Permission denied: Guests cannot delete deals');
      return;
    }
    const isConfirmed = await confirm('Are you sure you want to delete this CRM deal?', 'Delete CRM Deal');
    if (isConfirmed) {
      await deleteDeal(id);
      const updated = deals.filter(d => d.id !== id);
      broadcastDeals(updated);
      toast.info('Deal removed from pipeline');
      handleCloseDetailDeal();
    }
  };

  // Helper to detect rotting deals (no stage update for > 7 days)
  const isDealRotting = (deal: Deal) => {
    if (!deal.stageUpdatedAt) return false;
    if (deal.stage === 'won' || deal.stage === 'lost') return false;
    const updatedAt = new Date(deal.stageUpdatedAt).getTime();
    const difference = Date.now() - updatedAt;
    return difference > 7 * 24 * 60 * 60 * 1000; // 7 days
  };

  // Filter deals based on search, owner, drill-down stage, and stale status
  const filteredDeals = useMemo(() => {
    return deals.filter(d => {
      const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            d.company.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesOwner = ownerFilter === 'all' || d.ownerId === user?.id;
      const matchesDrillDown = !drillDownStage || d.stage === drillDownStage;
      const matchesStale = !showStaleOnly || isDealRotting(d);

      return matchesSearch && matchesOwner && matchesDrillDown && matchesStale;
    });
  }, [deals, searchQuery, ownerFilter, drillDownStage, showStaleOnly, user]);

  // Rotting counts
  const rottingDealsCount = useMemo(() => {
    return deals.filter(isDealRotting).length;
  }, [deals]);

  // BI Calculations
  const stats = useMemo(() => {
    const pipelineValue = filteredDeals
      .filter(d => d.stage !== 'won' && d.stage !== 'lost')
      .reduce((sum, d) => sum + d.value, 0);

    const wonValue = filteredDeals
      .filter(d => d.stage === 'won')
      .reduce((sum, d) => sum + d.value, 0);

    const lostCount = filteredDeals.filter(d => d.stage === 'lost').length;
    const wonCount = filteredDeals.filter(d => d.stage === 'won').length;
    const totalClosed = wonCount + lostCount;
    const winRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;

    // AI Weighted Pipeline value: value * score%
    const expectedValue = filteredDeals
      .filter(d => d.stage !== 'won' && d.stage !== 'lost')
      .reduce((sum, d) => sum + (d.value * (d.score || 70) / 100), 0);

    return { pipelineValue, wonValue, winRate, expectedValue };
  }, [filteredDeals]);

  // Widget custom drag-and-drop handlers
  const handleWidgetDragStart = (id: string) => {
    setDraggedWidgetId(id);
  };

  const handleWidgetDrop = (targetId: string) => {
    if (!draggedWidgetId || draggedWidgetId === targetId) return;
    const fromIndex = widgets.findIndex(w => w.id === draggedWidgetId);
    const toIndex = widgets.findIndex(w => w.id === targetId);
    
    const reordered = [...widgets];
    const [removed] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, removed);
    
    setWidgets(reordered);
    setDraggedWidgetId(null);
  };

  // Trigger Report
  const handleTriggerReport = () => {
    const totalPipeline = deals.reduce((sum, d) => sum + d.value, 0);
    const stageCounts = STAGES.map(s => {
      const cnt = deals.filter(d => d.stage === s.id).length;
      return `${s.label}: ${cnt}`;
    }).join(', ');

    const reportTitle = reportType === 'pipeline_summary' ? 'Weekly Pipeline Digest' 
      : reportType === 'forecasting_report' ? 'AI Forecast Report' 
      : 'Stale Deals Summary';

    const reportContent = `Hi ${user?.name || 'there'},\n\nHere is your requested CRM ${reportTitle} (${reportFrequency}):\n\n- **Total Pipeline Value:** $${totalPipeline.toLocaleString()}\n- **Opportunity Counts:** ${stageCounts}\n\nNexus AI has compiled this report dynamically from live CRM workspace data.\n\nBest regards,\nNexus AI`;

    toast.promise(
      new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            if (addEmail) {
              addEmail({
                to: user?.email || 'user@workspace.com',
                toName: user?.name || 'User',
                subject: `AI Report: ${reportTitle}`,
                body: reportContent,
                status: 'received',
                aiGenerated: true
              });
            }
            if (addNotification) {
              addNotification({
                senderName: 'Nexus AI',
                title: 'New Report Generated',
                message: `CRM ${reportTitle} has been compiled and emailed.`,
                type: 'system'
              });
            }
            resolve(true);
          } catch (e) {
            reject(e);
          }
        }, 1500);
      }),
      {
        loading: 'Compiling CRM analytics pipeline data...',
        success: `${reportTitle} compiled and delivered to your inbox!`,
        error: 'Reporting service error.'
      }
    );
  };

  // Scanned Linked Emails & Calendar Events inside Deal Detail
  const linkedEmails = useMemo(() => {
    if (!detailDeal || !detailDeal.primaryContactEmail) return [];
    const contactEmail = detailDeal.primaryContactEmail.toLowerCase();
    const domain = contactEmail.split('@')[1];
    return emails.filter(e => 
      e.to.toLowerCase().includes(contactEmail) ||
      e.to.toLowerCase().includes(domain) ||
      (e.from && e.from.toLowerCase().includes(contactEmail)) ||
      (e.from && e.from.toLowerCase().includes(domain))
    );
  }, [detailDeal, emails]);

  const linkedEvents = useMemo(() => {
    if (!detailDeal) return [];
    const searchTerms = [detailDeal.company.toLowerCase(), detailDeal.title.toLowerCase()];
    if (detailDeal.primaryContactName) searchTerms.push(detailDeal.primaryContactName.toLowerCase());
    return calendarEvents.filter(e => 
      searchTerms.some(term => 
        e.title.toLowerCase().includes(term) || 
        e.description.toLowerCase().includes(term)
      )
    );
  }, [detailDeal, calendarEvents]);

  // Funnel widget details
  const funnelStagesData = useMemo(() => {
    const sequence: Stage[] = ['lead', 'contacted', 'proposal', 'negotiation', 'won'];
    const totalMax = filteredDeals.length || 1;
    return sequence.map((stg) => {
      const count = filteredDeals.filter(d => d.stage === stg).length;
      const value = filteredDeals.filter(d => d.stage === stg).reduce((sum, d) => sum + d.value, 0);
      const percentage = Math.round((count / totalMax) * 100);
      return { stage: stg, count, value, percentage };
    });
  }, [filteredDeals]);

  // AI Forecasting data
  const forecastData = useMemo(() => {
    const commitVal = filteredDeals.filter(d => d.forecastCategory === 'commit').reduce((sum, d) => sum + d.value, 0);
    const bestCaseVal = filteredDeals.filter(d => d.forecastCategory === 'best_case').reduce((sum, d) => sum + d.value, 0);
    const pipelineVal = filteredDeals.filter(d => d.forecastCategory === 'pipeline').reduce((sum, d) => sum + d.value, 0);
    return { commitVal, bestCaseVal, pipelineVal };
  }, [filteredDeals]);

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden text-foreground select-none">
      
      {/* Role Banner */}
      {isGuest && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 py-1.5 px-4 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between z-10">
          <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Read-Only Guest View Mode: Edits are locked</span>
          <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-[9px] uppercase font-bold bg-amber-500/5">Guest</Badge>
        </div>
      )}

      {/* Header */}
      <div className="p-4 shrink-0 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            CRM Pipeline & AI forecasting
          </h1>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">Manage accounts, forecast bookings, and analyze pipeline metrics.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setShowDashboardConfig(!showDashboardConfig)}
            className="h-8 text-[11px] font-semibold gap-1 border-dashed cursor-pointer"
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Customize Layout
          </Button>
          <Button 
            onClick={() => {
              if (isGuest) {
                toast.error('Action locked for guests');
              } else {
                setIsAddDealOpen(true);
              }
            }}
            disabled={isGuest}
            size="sm"
            className="bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 h-8 text-[11px] font-bold gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Deal
          </Button>
        </div>
      </div>

      {/* Dashboard Customization Tray */}
      {showDashboardConfig && (
        <div className="mx-4 mt-4 p-4 border border-dashed border-border rounded-2xl bg-muted/20 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-foreground">Configure CRM Dashboard Builder</h3>
            <Button size="sm" variant="ghost" className="h-6 text-[9px]" onClick={() => setShowDashboardConfig(false)}>Done</Button>
          </div>
          <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">
            Drag and drop custom items below to rearrange analysis widgets. Toggle checkboxes to hide components.
          </p>
          <div className="flex flex-wrap gap-2.5 mt-1">
            {widgets.map((w, idx) => (
              <div 
                key={w.id}
                draggable
                onDragStart={() => handleWidgetDragStart(w.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleWidgetDrop(w.id)}
                className="flex items-center gap-2 bg-card border border-border/80 hover:border-indigo-500/30 rounded-xl px-3 py-1.5 cursor-grab active:cursor-grabbing text-[11px] font-bold text-foreground"
              >
                <Sliders className="w-3 h-3 text-muted-foreground shrink-0" />
                <input 
                  type="checkbox" 
                  checked={w.visible} 
                  onChange={(e) => {
                    const next = [...widgets];
                    next[idx].visible = e.target.checked;
                    setWidgets(next);
                  }}
                  className="rounded border-border text-primary focus:ring-primary w-3 h-3 shrink-0 cursor-pointer"
                />
                <span>{w.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard Analytics Panel */}
      <div className="px-4 py-4 shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-border bg-muted/10">
        {widgets.filter(w => w.visible).map(w => {
          if (w.id === 'funnel') {
            return (
              <div key={w.id} className="bg-card border border-border rounded-xl p-3 shadow-xs flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Win/Loss Funnel Analysis</span>
                  <span className="text-[9px] text-muted-foreground">Click stage to filter board</span>
                </div>
                <div className="flex flex-col gap-1.5 justify-center flex-1">
                  {funnelStagesData.map((item) => (
                    <button
                      key={item.stage}
                      onClick={() => setDrillDownStage(drillDownStage === item.stage ? null : item.stage)}
                      className={cn(
                        "w-full flex items-center justify-between px-2 py-1 rounded text-[10px] font-medium transition-all text-left",
                        drillDownStage === item.stage ? "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20" : "hover:bg-muted"
                      )}
                    >
                      <span className="capitalize w-16">{item.stage}</span>
                      <div className="flex-1 max-w-[140px] bg-muted h-2 rounded-full overflow-hidden mx-3">
                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${item.percentage}%` }} />
                      </div>
                      <span className="font-bold text-foreground w-8 text-right font-mono">{item.count}</span>
                      <span className="font-bold text-muted-foreground w-16 text-right font-mono">${item.value.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          }

          if (w.id === 'forecast') {
            return (
              <div key={w.id} className="bg-card border border-border rounded-xl p-3 shadow-xs flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">AI Forecast & Expected Bookings</span>
                  <span className="text-[9px] text-indigo-500 font-semibold font-mono flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Weighted Expected: ${stats.expectedValue.toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 flex-1 items-center">
                  <div className="flex flex-col p-1.5 border border-border rounded bg-muted/10 text-center">
                    <span className="text-[8px] uppercase font-bold text-muted-foreground">Commit</span>
                    <span className="text-xs font-bold font-mono text-foreground">${forecastData.commitVal.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col p-1.5 border border-border rounded bg-muted/10 text-center">
                    <span className="text-[8px] uppercase font-bold text-muted-foreground">Best Case</span>
                    <span className="text-xs font-bold font-mono text-foreground">${forecastData.bestCaseVal.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col p-1.5 border border-border rounded bg-muted/10 text-center">
                    <span className="text-[8px] uppercase font-bold text-muted-foreground">Pipeline</span>
                    <span className="text-xs font-bold font-mono text-foreground">${forecastData.pipelineVal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          }

          if (w.id === 'rotting') {
            return (
              <div key={w.id} className="bg-card border border-border rounded-xl p-3 shadow-xs flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Stale / Rotting Deals Alerts</span>
                  {rottingDealsCount > 0 && (
                    <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] h-4 uppercase font-bold">
                      {rottingDealsCount} Rotting
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 mt-1.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-foreground">Stale deal rot tracker active</span>
                    <p className="text-[9px] text-muted-foreground leading-normal">
                      Opportunities with no stage updates for 7+ days require urgent follow-up.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowStaleOnly(!showStaleOnly)}
                    className={cn(
                      "h-7 text-[10px] shrink-0 font-semibold cursor-pointer",
                      showStaleOnly && "bg-red-500/10 text-red-500 border-red-500/30"
                    )}
                  >
                    {showStaleOnly ? "Showing Stale Only" : "Filter Stale Opportunities"}
                  </Button>
                </div>
              </div>
            );
          }

          if (w.id === 'reports') {
            return (
              <div key={w.id} className="bg-card border border-border rounded-xl p-3 shadow-xs flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Scheduled Automated Reports</span>
                  <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-semibold">Nexus AI active</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="flex-1 bg-background border border-border rounded px-2 py-1 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="pipeline_summary">Weekly Pipeline Digest</option>
                    <option value="forecasting_report">AI Forecast Report</option>
                    <option value="rotting_alerts">Stale Deals Summary</option>
                  </select>
                  <select
                    value={reportFrequency}
                    onChange={(e) => setReportFrequency(e.target.value)}
                    className="flex-1 bg-background border border-border rounded px-2 py-1 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="weekly_monday">Every Monday at 9 AM</option>
                    <option value="monthly_first">First of Month</option>
                    <option value="daily_digest">Daily Summary digest</option>
                  </select>
                  <Button
                    size="sm"
                    onClick={handleTriggerReport}
                    className="h-7 text-[10px] bg-indigo-600 hover:bg-indigo-600/90 text-white font-semibold cursor-pointer"
                  >
                    Email Report
                  </Button>
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* KPI Stats Row */}
      <div className="px-4 py-3 shrink-0 flex flex-wrap gap-3 border-b border-border bg-muted/10 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 py-1 text-xs">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Pipeline Value:</span>
            <span className="font-bold text-foreground font-mono">${stats.pipelineValue.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 py-1 text-xs">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Revenue Won:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">${stats.wonValue.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 py-1 text-xs">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Expected Win Rate:</span>
            <span className="font-bold text-purple-600 dark:text-purple-400 font-mono">{stats.winRate}%</span>
          </div>
        </div>

        {/* Filter controls / resets */}
        <div className="flex items-center gap-2">
          {(drillDownStage || showStaleOnly) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDrillDownStage(null);
                setShowStaleOnly(false);
              }}
              className="h-7 text-[9px] font-bold text-red-500 border-red-500/20 hover:bg-red-500/5 cursor-pointer"
            >
              Clear Active Filters
            </Button>
          )}

          <div className="flex items-center border border-border rounded-lg p-0.5 bg-card shrink-0">
            <button
              onClick={() => setOwnerFilter('all')}
              className={cn(
                "px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer",
                ownerFilter === 'all' ? "bg-muted text-foreground" : "text-muted-foreground"
              )}
            >
              All Deals
            </button>
            <button
              onClick={() => setOwnerFilter('my')}
              className={cn(
                "px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer",
                ownerFilter === 'my' ? "bg-muted text-foreground" : "text-muted-foreground"
              )}
            >
              My Deals
            </button>
          </div>
        </div>
      </div>

      {/* Filter Row / Search */}
      <div className="px-4 py-2.5 shrink-0 border-b border-border/60 bg-muted/5 flex items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            className="w-full bg-card pl-8 pr-3 py-1.5 border border-border/80 rounded-md text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            placeholder="Search deals by title, contact name or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Mobile active column swipe indicator */}
        <div className="flex lg:hidden items-center gap-1">
          <Button 
            size="icon" 
            variant="outline" 
            className="h-7 w-7 rounded-full cursor-pointer"
            onClick={() => {
              const idx = STAGES.findIndex(s => s.id === mobileActiveColumn);
              if (idx > 0) setMobileActiveColumn(STAGES[idx - 1].id);
            }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[10px] font-bold text-foreground uppercase tracking-wide px-2 bg-muted rounded border py-1.5">
            {mobileActiveColumn}
          </span>
          <Button 
            size="icon" 
            variant="outline" 
            className="h-7 w-7 rounded-full cursor-pointer"
            onClick={() => {
              const idx = STAGES.findIndex(s => s.id === mobileActiveColumn);
              if (idx < STAGES.length - 1) setMobileActiveColumn(STAGES[idx + 1].id);
            }}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* AI Suggested Actions Banner */}
      <div className="mx-4 mt-1 mb-2 p-4 border border-indigo-500/20 bg-indigo-500/[0.01] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-500 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">Suggested CRM Actions</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">Nexus analyzed deal health and suggests these follow-ups:</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2.5">
          {deals.filter(d => d.stage !== 'won' && d.stage !== 'lost').slice(0, 3).map((deal, idx) => {
            const colors = ['bg-amber-500', 'bg-indigo-500', 'bg-emerald-500'];
            const color = colors[idx % colors.length];
            let label = `Follow up with ${deal.company}`;
            if (deal.stage === 'proposal' || deal.stage === 'negotiation') {
              label = `Send proposal reminder to ${deal.company}`;
            } else if (deal.stage === 'contacted') {
              label = `Schedule demo with ${deal.primaryContactName || deal.company}`;
            }
            return (
              <button
                key={deal.id}
                onClick={() => {
                  setSelectedDealId(deal.id);
                  toast.success(`Opening ${deal.title}`);
                }}
                className="bg-card border border-border hover:border-indigo-500/30 text-foreground text-[10.5px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", color)} />
                {label}
              </button>
            );
          })}
          {deals.filter(d => d.stage !== 'won' && d.stage !== 'lost').length === 0 && (
            <span className="text-[10px] text-muted-foreground italic">Add active deals to get AI suggested actions.</span>
          )}
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="p-4">
        {/* Desktop View */}
        <div 
          className="hidden lg:grid grid-cols-3 gap-6 pb-4"
        >
          {STAGES.map(column => {
            const stageDeals = filteredDeals.filter(d => d.stage === column.id);
            const totalVal = stageDeals.reduce((sum, d) => sum + d.value, 0);

            return (
              <div key={column.id} className="flex flex-col w-full min-h-[300px]">
                {/* Column Header */}
                <div className={cn(
                  "flex flex-col p-3 border-b border-border/60 border-t-2 rounded-t-xl shrink-0",
                  column.color, column.bg
                )}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground uppercase tracking-wider">{column.label}</span>
                    <span className="text-[9px] bg-muted border border-border px-1.5 py-0.2 rounded font-bold text-muted-foreground">
                      {stageDeals.length}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground font-bold mt-1">
                    Total: ${totalVal.toLocaleString()}
                  </span>
                </div>

                {/* Column Body Cards */}
                <div 
                  className={cn(
                    "flex-1 bg-muted/5 border border-border border-t-0 rounded-b-xl p-2 flex flex-col gap-2.5 transition-colors duration-200",
                    dragOverStage === column.id && "bg-indigo-500/5 border-dashed border-indigo-500/30"
                  )}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={() => !isGuest && setDragOverStage(column.id)}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (isGuest) return;
                    const dealId = e.dataTransfer.getData('text/plain');
                    if (dealId) {
                      handleUpdateStage(dealId, column.id);
                    }
                    setDragOverStage(null);
                  }}
                >
                  <AnimatePresence>
                    {stageDeals.map(deal => {
                      const rotting = isDealRotting(deal);
                      return (
                        <motion.div
                          key={deal.id}
                          layoutId={deal.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          draggable={!isGuest}
                          onDragStart={(e: any) => {
                            if (isGuest) {
                              e.preventDefault();
                              return;
                            }
                            e.dataTransfer.setData('text/plain', deal.id);
                          }}
                          onClick={() => setDetailDeal(deal)}
                          data-context-type="deal"
                          data-context-id={deal.id}
                          className={cn(
                            "bg-card border hover:border-indigo-500/20 rounded-xl p-3 shadow-xs cursor-grab active:cursor-grabbing transition-all flex flex-col gap-1.5 relative group select-none",
                            rotting && "border-red-500/40 bg-red-500/[0.02] shadow-sm hover:border-red-500/60"
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <h4 className="font-bold text-xs text-foreground truncate max-w-[170px]" title={deal.title}>{deal.title}</h4>
                            {!isGuest && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDealClick(deal.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 rounded transition-opacity shrink-0"
                                title="Delete Deal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-muted-foreground leading-normal">
                            <div className="flex items-center gap-1 truncate">
                              <User className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="truncate font-semibold">{deal.company}</span>
                            </div>
                            <span className="text-[9px] text-muted-foreground italic shrink-0">By {deal.ownerName?.split(' ')[0]}</span>
                          </div>

                          {/* AI Score Badge & Value */}
                          <div className="flex items-center justify-between pt-1 mt-1 border-t border-border/20">
                            <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                              ${deal.value.toLocaleString()}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {rotting && (
                                <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[8px] font-bold uppercase py-0 px-1">
                                  Stale
                                </Badge>
                              )}
                              
                              {/* AI score rating */}
                              {deal.score && (
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-[8px] py-0 px-1 font-bold uppercase",
                                    deal.score >= 80 ? "text-emerald-600 bg-emerald-500/5 border-emerald-500/20" :
                                    deal.score >= 50 ? "text-amber-600 bg-amber-500/5 border-amber-500/20" :
                                    "text-red-500 bg-red-500/5 border-red-500/20"
                                  )}
                                >
                                  {deal.score}% AI Match
                                </Badge>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {stageDeals.length === 0 && (
                    <div className="p-8 text-center border border-dashed border-border rounded-xl text-[10px] text-muted-foreground opacity-55">
                      Empty Pipeline Stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Swipe View Column */}
        <div className="lg:hidden flex flex-col h-full w-full">
          {STAGES.filter(c => c.id === mobileActiveColumn).map(column => {
            const stageDeals = filteredDeals.filter(d => d.stage === column.id);
            const totalVal = stageDeals.reduce((sum, d) => sum + d.value, 0);
            return (
              <div key={column.id} className="flex flex-col w-full h-full">
                <div className={cn(
                  "flex flex-col p-3.5 border-b border-border/60 border-t-2 rounded-t-xl shrink-0",
                  column.color, column.bg
                )}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-foreground uppercase tracking-wider">{column.label}</span>
                    <span className="text-[10px] bg-muted border border-border px-2 py-0.5 rounded font-bold text-muted-foreground font-mono">
                      {stageDeals.length} opportunity
                    </span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground font-bold mt-1">
                    Value: ${totalVal.toLocaleString()}
                  </span>
                </div>

                <div className="flex-1 bg-muted/5 border border-border border-t-0 rounded-b-xl p-2.5 flex flex-col gap-3">
                  {stageDeals.map(deal => (
                    <div
                      key={deal.id}
                      onClick={() => setDetailDeal(deal)}
                      className={cn(
                        "bg-card border border-border hover:border-indigo-500/20 rounded-xl p-3.5 flex flex-col gap-2.5 relative shadow-xs",
                        isDealRotting(deal) && "border-red-500/40 bg-red-500/[0.02]"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-bold text-sm text-foreground truncate max-w-[200px]">{deal.title}</h4>
                        <Badge 
                          variant="outline"
                          className={cn(
                            "text-[8px] font-bold uppercase",
                            (deal.score || 70) >= 80 ? "text-emerald-500 border-emerald-500/20" : "text-amber-500 border-amber-500/20"
                          )}
                        >
                          {deal.score || 70}% AI Match
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-semibold">{deal.company}</span>
                        <span className="font-bold font-mono text-emerald-600">${deal.value.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                  {stageDeals.length === 0 && (
                    <div className="p-12 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground italic">
                      No opportunities in this stage.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* ADD DEAL DIALOG */}
      <Dialog open={isAddDealOpen} onOpenChange={handleCloseAddDeal}>
        <DialogContent className="sm:max-w-md bg-background border border-border shadow-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-indigo-500" /> Introduce Business Opportunity</DialogTitle>
            <DialogDescription className="text-[11px] text-muted-foreground">Introduce a new business account or lead to the pipeline.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddDealSubmit} className="flex flex-col gap-3.5 py-1 text-xs">
            <div className="flex flex-col gap-1">
              <Label className="uppercase font-bold text-muted-foreground text-[9px] tracking-wider">Deal Opportunity Name *</Label>
              <Input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Acme Corp Enterprise Contract"
                className="w-full text-xs h-8.5 rounded-lg"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="uppercase font-bold text-muted-foreground text-[9px] tracking-wider">Account Company *</Label>
              <Input
                type="text"
                value={newCompany}
                onChange={e => setNewCompany(e.target.value)}
                placeholder="e.g. Acme Corporation"
                className="w-full text-xs h-8.5 rounded-lg"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label className="uppercase font-bold text-muted-foreground text-[9px] tracking-wider">Deal Value ($) *</Label>
                <Input
                  type="number"
                  value={newValue || ''}
                  onChange={e => setNewValue(Number(e.target.value))}
                  placeholder="e.g. 150000"
                  className="w-full text-xs h-8.5 rounded-lg"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="uppercase font-bold text-muted-foreground text-[9px] tracking-wider">Pipeline Stage</Label>
                <select
                  value={newStage}
                  onChange={e => setNewStage(e.target.value as Stage)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground h-8.5"
                >
                  <option value="lead">Lead</option>
                  <option value="contacted">Contacted</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label className="uppercase font-bold text-muted-foreground text-[9px] tracking-wider">Primary Contact Name</Label>
                <Input
                  type="text"
                  value={newContactName}
                  onChange={e => setNewContactName(e.target.value)}
                  placeholder="e.g. Pepper Potts"
                  className="w-full text-xs h-8.5 rounded-lg"
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="uppercase font-bold text-muted-foreground text-[9px] tracking-wider">Primary Contact Email</Label>
                <Input
                  type="email"
                  value={newContactEmail}
                  onChange={e => setNewContactEmail(e.target.value)}
                  placeholder="e.g. pepper@stark.com"
                  className="w-full text-xs h-8.5 rounded-lg"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="uppercase font-bold text-muted-foreground text-[9px] tracking-wider">Opportunity Notes</Label>
              <textarea
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                placeholder="Include initial contract constraints, next steps, or deal history details."
                className="w-full bg-card border border-border rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground h-16 resize-none"
              />
            </div>

            <DialogFooter className="mt-2.5 flex gap-2 justify-end">
              <Button type="button" size="sm" variant="ghost" onClick={handleCloseAddDeal}>Cancel</Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 shadow-sm"
              >
                Insert Opportunity
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DEAL DETAIL MODAL WITH NATIVE EMAIL/CALENDAR INNER SYNC */}
      <Dialog open={!!detailDeal} onOpenChange={(open) => !open && handleCloseDetailDeal()}>
        <DialogContent className="sm:max-w-lg md:max-w-xl bg-background border border-border shadow-lg rounded-xl p-0 flex flex-col overflow-hidden max-h-[90vh]">
          {detailDeal && (
            <>
              {/* Header */}
              <div className="p-6 border-b border-border bg-muted/20 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="uppercase text-[9px] font-bold tracking-wider rounded-sm text-indigo-600 bg-indigo-500/5 border-indigo-500/20">
                    Stage: {detailDeal.stage}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    {detailDeal.score && (
                      <Badge className={cn("text-[9px] py-0.5 px-2 font-bold", detailDeal.score >= 80 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20")}>
                        AI Score: {detailDeal.score}%
                      </Badge>
                    )}
                    {detailDeal.forecastCategory && (
                      <Badge variant="secondary" className="text-[9px] py-0.5 px-2 uppercase font-bold tracking-wider">
                        Forecast: {detailDeal.forecastCategory.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <DialogTitle className="text-base font-extrabold text-foreground mt-1 leading-tight">
                  {detailDeal.title}
                </DialogTitle>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold">{detailDeal.company}</span>
                  <span className="font-bold text-emerald-600 font-mono text-sm">${detailDeal.value.toLocaleString()}</span>
                </div>
              </div>

              {/* Scrollable details */}
              <div className="p-6 overflow-y-auto flex flex-col gap-5 text-xs flex-1 custom-scrollbar">
                
                {/* Contact and Ownership metadata */}
                <div className="grid grid-cols-2 gap-4 bg-muted/20 p-3 rounded-xl border border-border">
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold">Primary Contact</span>
                    <span className="font-bold text-foreground">{detailDeal.primaryContactName || 'Unknown Contact'}</span>
                    <span className="text-[10px] text-muted-foreground font-mono truncate">{detailDeal.primaryContactEmail || 'No Email'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold">Deal Owner</span>
                    <span className="font-bold text-foreground flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      {detailDeal.ownerName || 'Sainath Kotage'}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">ID: {detailDeal.ownerId || 'admin'}</span>
                  </div>
                </div>

                {/* Stale deal warnings */}
                {isDealRotting(detailDeal) && (
                  <div className="bg-red-500/5 border border-red-500/20 p-3.5 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-red-600 dark:text-red-400">Warning: Stale Deal Detected</span>
                      <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">
                        This opportunity has been stuck in the <strong>{detailDeal.stage}</strong> stage for over 7 days. Expected action: follow up with the primary contact immediately.
                      </p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Deal History & Notes</span>
                  <p className="p-3 bg-muted/10 border border-border rounded-xl text-[11px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
                    {detailDeal.notes || 'No notes added to this deal yet.'}
                  </p>
                </div>

                {/* AI Recommendations */}
                <div className="bg-indigo-500/[0.03] border border-indigo-500/20 p-3.5 rounded-xl flex flex-col gap-1.5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500/20" />
                  </div>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                    AI Copilot Recommendation
                  </span>
                  <p className="text-[10.5px] text-muted-foreground leading-normal mt-0.5">
                    {detailDeal.stage === 'lead' ? 'Initial contact is highly recommended. AI recommends drafting an introduction email using the Stark template.' :
                     detailDeal.stage === 'contacted' ? 'Arrange a detailed security consulting meeting. Use the calendar widget to sync coordinates.' :
                     detailDeal.stage === 'proposal' ? 'Follow up on the sent proposal. Offer a 10% discount hook if not closed within 48 hours.' :
                     detailDeal.stage === 'negotiation' ? 'Contract review is in progress. Coordinate with legal to secure signatures and commit forecasting.' :
                     detailDeal.stage === 'won' ? 'Close completed. Onboard accounts and transition to Customer Success team.' :
                     'Review loss reasons and classify funnel drop-offs for future iterations.'}
                  </p>
                </div>

                {/* Native Mail Client Integration (Scanned Emails) */}
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                    <MailIcon className="w-3.5 h-3.5 text-indigo-500" /> Linked Mail Activity ({linkedEmails.length})
                  </span>
                  <div className="flex flex-col gap-2">
                    {linkedEmails.length === 0 ? (
                      <div className="p-3 text-center border border-dashed border-border rounded-xl text-[10px] text-muted-foreground italic bg-muted/5">
                        No synced emails found matching domain {detailDeal.primaryContactEmail?.split('@')[1] || ''}
                      </div>
                    ) : (
                      linkedEmails.map(e => (
                        <div key={e.id} className="p-2.5 border border-border bg-card rounded-xl flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[10.5px] truncate max-w-[170px]">{e.subject}</span>
                            <Badge variant="secondary" className="text-[8px] tracking-wide font-bold">{e.status}</Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 leading-normal">{e.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Native Calendar Sync (Linked Meetings) */}
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" /> Linked Meetings & Calendar ({linkedEvents.length})
                  </span>
                  <div className="flex flex-col gap-2">
                    {linkedEvents.length === 0 ? (
                      <div className="p-3 text-center border border-dashed border-border rounded-xl text-[10px] text-muted-foreground italic bg-muted/5">
                        No meetings scheduled matching account "{detailDeal.company}"
                      </div>
                    ) : (
                      linkedEvents.map(ev => (
                        <div key={ev.id} className="p-2.5 border border-border bg-card rounded-xl flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[10.5px] truncate max-w-[170px]">{ev.title}</span>
                            <span className="text-[9px] text-muted-foreground font-semibold">{ev.date} at {ev.startTime}</span>
                          </div>
                          {ev.description && <p className="text-[9px] text-muted-foreground line-clamp-1 mt-0.5">{ev.description}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-border bg-muted/20 flex gap-2 justify-between shrink-0">
                {!isGuest ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500/20 text-red-500 hover:bg-red-500/10 h-8 text-[11px] font-semibold cursor-pointer"
                    onClick={() => handleDeleteDealClick(detailDeal.id)}
                  >
                    Delete Opportunity
                  </Button>
                ) : (
                  <div />
                )}
                
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={handleCloseDetailDeal}>Close</Button>
                  {!isGuest && (
                    <select
                      value={detailDeal.stage}
                      onChange={(e) => handleUpdateStage(detailDeal.id, e.target.value as Stage)}
                      className="bg-card border border-border rounded-lg px-2.5 py-1 text-[11px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-8 cursor-pointer"
                    >
                      <option value="lead">Move to Lead</option>
                      <option value="contacted">Move to Contacted</option>
                      <option value="proposal">Move to Proposal</option>
                      <option value="negotiation">Move to Negotiation</option>
                      <option value="won">Move to Won</option>
                      <option value="lost">Move to Lost</option>
                    </select>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
