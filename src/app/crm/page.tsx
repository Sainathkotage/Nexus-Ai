'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useWorkspace } from '@/lib/store';
import { Deal } from '@/types';
import { 
  BarChart3, Plus, Search, DollarSign, TrendingUp, Briefcase, 
  Trash2, ArrowRight, User, Settings, Check, X, AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

type Stage = Deal['stage'];

const STAGES: { id: Stage; label: string; color: string; bg: string }[] = [
  { id: 'lead', label: 'Lead', color: 'border-t-zinc-400 dark:border-t-zinc-600', bg: 'bg-zinc-50 dark:bg-zinc-950/20' },
  { id: 'contacted', label: 'Contacted', color: 'border-t-blue-500', bg: 'bg-blue-50/20 dark:bg-blue-950/10' },
  { id: 'proposal', label: 'Proposal', color: 'border-t-amber-500', bg: 'bg-amber-50/20 dark:bg-amber-950/10' },
  { id: 'negotiation', label: 'Negotiation', color: 'border-t-purple-500', bg: 'bg-purple-50/20 dark:bg-purple-950/10' },
  { id: 'won', label: 'Won', color: 'border-t-emerald-500', bg: 'bg-emerald-50/20 dark:bg-emerald-950/10' },
  { id: 'lost', label: 'Lost', color: 'border-t-red-500', bg: 'bg-red-50/20 dark:bg-red-950/10' },
];

export default function CRMPage() {
  const { setActivePage, deals: storeDeals, updateDealStage } = useWorkspace();
  
  // Custom local state wrapper for adds/deletes
  const [localDeals, setLocalDeals] = useState<Deal[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);
  
  // Dialog settings
  const [isAddDealOpen, setIsAddDealOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newValue, setNewValue] = useState<number>(0);
  const [newStage, setNewStage] = useState<Stage>('lead');

  useEffect(() => {
    setActivePage('crm');
  }, [setActivePage]);

  // Sync from store or load local storage cache
  useEffect(() => {
    const cached = localStorage.getItem('nexus_deals');
    if (cached) {
      try {
        setLocalDeals(JSON.parse(cached));
      } catch (e) {
        setLocalDeals(storeDeals);
      }
    } else {
      setLocalDeals(storeDeals);
    }
  }, [storeDeals]);

  // Commit changes locally and cache
  const commitDeals = (updated: Deal[]) => {
    setLocalDeals(updated);
    localStorage.setItem('nexus_deals', JSON.stringify(updated));
  };

  const handleUpdateStage = (dealId: string, stage: Stage) => {
    updateDealStage(dealId, stage); // update in global state
    const updated = localDeals.map(d => d.id === dealId ? { ...d, stage } : d);
    commitDeals(updated);
    toast.success(`Deal stage updated to ${stage}`);
  };

  const handleAddDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCompany.trim() || newValue <= 0) {
      toast.error('All deal parameters are required');
      return;
    }

    const newDeal: Deal = {
      id: `deal-${Date.now()}`,
      title: newTitle,
      company: newCompany,
      value: newValue,
      stage: newStage
    };

    const updated = [...localDeals, newDeal];
    commitDeals(updated);

    setNewTitle('');
    setNewCompany('');
    setNewValue(0);
    setNewStage('lead');
    setIsAddDealOpen(false);
    toast.success('CRM Deal added successfully');
  };

  const handleDeleteDeal = (id: string) => {
    if (confirm('Are you sure you want to delete this CRM deal?')) {
      const updated = localDeals.filter(d => d.id !== id);
      commitDeals(updated);
      toast.info('Deal removed from pipeline');
    }
  };

  // Filter deals
  const filteredDeals = useMemo(() => {
    return localDeals.filter(d => 
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.company.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [localDeals, searchQuery]);

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

    const avgDeal = filteredDeals.length > 0 
      ? Math.round(filteredDeals.reduce((sum, d) => sum + d.value, 0) / filteredDeals.length) 
      : 0;

    return { pipelineValue, wonValue, winRate, avgDeal };
  }, [filteredDeals]);

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden text-foreground">
      
      {/* Header */}
      <div className="p-4 md:p-6 shrink-0 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
            CRM Pipeline & BI Dashboard
          </h1>
          <p className="text-xs text-muted-foreground">Manage accounts, forecast bookings, and analyze pipeline metrics.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setIsAddDealOpen(true)}
            size="sm"
            className="bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 shadow-sm gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Deal
          </Button>
        </div>
      </div>

      {/* BI KPI Metrics Grid */}
      <div className="px-4 md:px-6 py-4 shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4 border-b border-border bg-muted/10">
        
        {/* KPI 1 */}
        <div className="bg-card border border-border/80 rounded-xl p-3 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active Pipeline</span>
            <span className="text-sm font-bold font-mono text-foreground">${stats.pipelineValue.toLocaleString()}</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-card border border-border/80 rounded-xl p-3 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Revenue Won</span>
            <span className="text-sm font-bold font-mono text-foreground">${stats.wonValue.toLocaleString()}</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-card border border-border/80 rounded-xl p-3 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Win Rate (Closed)</span>
            <span className="text-sm font-bold font-mono text-foreground">{stats.winRate}%</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-card border border-border/80 rounded-xl p-3 flex items-center gap-3 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Avg Deal Size</span>
            <span className="text-sm font-bold font-mono text-foreground">${stats.avgDeal.toLocaleString()}</span>
          </div>
        </div>

      </div>

      {/* Filter Row */}
      <div className="px-4 md:px-6 py-2.5 shrink-0 border-b border-border/60 bg-muted/5 flex items-center gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            className="w-full bg-card pl-8 pr-3 py-1.5 border border-border/80 rounded-md text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            placeholder="Search deals by title or account..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="flex-1 overflow-hidden p-4 md:p-6">
        <div className="h-full flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
          {STAGES.map(column => {
            const stageDeals = filteredDeals.filter(d => d.stage === column.id);
            const totalVal = stageDeals.reduce((sum, d) => sum + d.value, 0);

            return (
              <div key={column.id} className="flex flex-col w-[260px] shrink-0 h-full">
                {/* Column Header */}
                <div className={cn(
                  "flex flex-col p-3 border-b border-border/60 border-t-2 rounded-t-lg shrink-0",
                  column.color, column.bg
                )}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground uppercase tracking-wider">{column.label}</span>
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
                    "flex-1 bg-muted/5 border border-border border-t-0 rounded-b-lg p-2 overflow-y-auto flex flex-col gap-2.5 transition-colors duration-200",
                    dragOverStage === column.id && "bg-primary/5 border-dashed border-primary/30"
                  )}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={() => setDragOverStage(column.id)}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dealId = e.dataTransfer.getData('text/plain');
                    if (dealId) {
                      handleUpdateStage(dealId, column.id);
                    }
                    setDragOverStage(null);
                  }}
                >
                  <AnimatePresence>
                    {stageDeals.map(deal => (
                      <motion.div
                        key={deal.id}
                        layoutId={deal.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        draggable="true"
                        onDragStart={(e: any) => {
                          e.dataTransfer.setData('text/plain', deal.id);
                        }}
                        className="bg-card border border-border hover:border-primary/20 rounded-lg p-3 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all flex flex-col gap-1.5 relative group"
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-xs text-foreground truncate max-w-[170px]" title={deal.title}>{deal.title}</h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDeal(deal.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 rounded transition-opacity shrink-0"
                            title="Delete Deal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <User className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{deal.company}</span>
                        </div>

                        <div className="flex items-center justify-between pt-1 mt-1 border-t border-border/20">
                          <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            ${deal.value.toLocaleString()}
                          </span>

                          {/* Navigation buttons */}
                          <div className="flex items-center gap-0.5 bg-background border border-border rounded p-0.5 shadow-sm">
                            {column.id !== 'lead' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const idx = STAGES.findIndex(s => s.id === column.id);
                                  handleUpdateStage(deal.id, STAGES[idx-1].id);
                                }}
                                className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                            )}
                            {column.id !== 'lost' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const idx = STAGES.findIndex(s => s.id === column.id);
                                  handleUpdateStage(deal.id, STAGES[idx+1].id);
                                }}
                                className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {stageDeals.length === 0 && (
                    <div className="p-6 text-center border border-dashed border-border rounded-lg text-[10px] text-muted-foreground opacity-55">
                      Empty stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ADD DEAL DIALOG */}
      <Dialog open={isAddDealOpen} onOpenChange={setIsAddDealOpen}>
        <DialogContent className="sm:max-w-md bg-background border border-border shadow-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add CRM Deal Opportunity</DialogTitle>
            <DialogDescription className="text-xs">Introduce a new business account or lead to the pipeline.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddDeal} className="flex flex-col gap-4 py-2 text-xs">
            <div className="flex flex-col gap-1.5">
              <Label className="uppercase font-semibold text-muted-foreground text-[10px]">Deal Name *</Label>
              <Input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Acme Corp Enterprise Contract"
                className="w-full text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="uppercase font-semibold text-muted-foreground text-[10px]">Account Company *</Label>
              <Input
                type="text"
                value={newCompany}
                onChange={e => setNewCompany(e.target.value)}
                placeholder="e.g. Acme Corporation"
                className="w-full text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="uppercase font-semibold text-muted-foreground text-[10px]">Deal Value ($) *</Label>
                <Input
                  type="number"
                  value={newValue || ''}
                  onChange={e => setNewValue(Number(e.target.value))}
                  placeholder="e.g. 50000"
                  className="w-full text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="uppercase font-semibold text-muted-foreground text-[10px]">Pipeline Stage</Label>
                <select
                  value={newStage}
                  onChange={e => setNewStage(e.target.value as Stage)}
                  className="w-full bg-card border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
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

            <DialogFooter className="mt-2 flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsAddDealOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                className="bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 shadow-sm"
              >
                Insert Deal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
