'use client';

import React from 'react';
import { 
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, 
  PieChart, Pie, AreaChart, Area 
} from 'recharts';
import { 
  Clock, CheckSquare, Sparkles 
} from 'lucide-react';
import { 
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig 
} from '@/components/ui/chart';

const timeChartConfig = {
  minutes: {
    label: 'Minutes Logged',
    color: 'hsl(var(--primary))',
  }
} satisfies ChartConfig;

const taskChartConfig = {
  todo: { label: 'To Do', color: '#64748b' },
  in_progress: { label: 'In Progress', color: '#0071e3' },
  review: { label: 'In Review', color: '#a855f7' },
  done: { label: 'Completed', color: '#10b981' }
} satisfies ChartConfig;

const aiChartConfig = {
  requests: {
    label: 'AI Requests',
    color: '#a855f7',
  }
} satisfies ChartConfig;

interface DashboardChartsProps {
  timeData: any[];
  taskStatusData: any[];
  activeTasksCount: number;
  aiUsageData: any[];
  totalAiUsageRequests: number;
}

export default function DashboardCharts({
  timeData,
  taskStatusData,
  activeTasksCount,
  aiUsageData,
  totalAiUsageRequests
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Chart 1: Time Logged */}
      <div className="border border-border rounded-2xl p-5 bg-card flex flex-col gap-4 shadow-none">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Focus Time Distribution
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Tracked minutes categorized by work items and timer sessions.</p>
        </div>
        
        <ChartContainer config={timeChartConfig} className="h-[220px] w-full">
          <BarChart data={timeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={8} />
            <YAxis axisLine={false} tickLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="minutes" fill="var(--color-minutes)" radius={4} />
          </BarChart>
        </ChartContainer>
      </div>

      {/* Chart 2: Task Completion Status */}
      <div className="border border-border rounded-2xl p-5 bg-card flex flex-col gap-4 shadow-none">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <CheckSquare className="w-4 h-4 text-muted-foreground" />
            Task Status Breakdown
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Summary of task distribution across the Kanban workspace.</p>
        </div>

        <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-6 min-h-0">
          <div className="relative w-full max-w-[170px] aspect-square flex items-center justify-center shrink-0">
            <ChartContainer config={taskChartConfig} className="h-[160px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={taskStatusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  cornerRadius={3}
                >
                  {taskStatusData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            {/* Center Text inside Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold tracking-tight">{activeTasksCount}</span>
              <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-semibold">Active Tasks</span>
            </div>
          </div>

          {/* Custom Legend layout to save space and align beautifully */}
          <div className="flex flex-col gap-2 flex-1 w-full font-medium text-[11px] text-muted-foreground">
            {taskStatusData.map((item, idx) => {
              const percent = activeTasksCount === 0 ? 0 : Math.round((item.value / activeTasksCount) * 100);
              return (
                <div key={idx} className="flex items-center justify-between border-b border-border/40 pb-1.5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-foreground font-semibold">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold">
                    <span>{item.value}</span>
                    <span className="text-muted-foreground/60">({percent}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chart 3: AI Credits Quota Area Chart */}
      <div className="border border-border rounded-2xl p-5 bg-card flex flex-col gap-4 lg:col-span-2 shadow-none">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            AI Assistant Credits & Quota Usage
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Daily API credit request counts tracked for organizational resource optimization.</p>
        </div>

        <ChartContainer config={aiChartConfig} className="h-[220px] w-full">
          <AreaChart data={aiUsageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-requests)" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="var(--color-requests)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tickMargin={8} />
            <YAxis axisLine={false} tickLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area 
              type="monotone" 
              dataKey="requests" 
              stroke="var(--color-requests)" 
              strokeWidth={2} 
              fillOpacity={1} 
              fill="url(#colorRequests)" 
            />
          </AreaChart>
        </ChartContainer>
      </div>

    </div>
  );
}
