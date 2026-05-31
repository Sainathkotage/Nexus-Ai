'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/lib/store';
import { 
  format, isSameDay, isSameMonth, addDays, startOfWeek, endOfWeek, 
  eachDayOfInterval, startOfMonth, endOfMonth, addMonths, subMonths 
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Calendar as CalendarIcon, Clock, Users, Video, ChevronLeft, ChevronRight, 
  Plus, Sparkles, Check, Play, Tag, MapPin, AlignLeft, CalendarCheck
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { CalendarEvent } from '@/types';

export default function CalendarPage() {
  const { 
    setActivePage, 
    calendarEvents, 
    selectedDate, 
    setSelectedDate, 
    addEventToCalendar, 
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent
  } = useWorkspace();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month');
  const [eventModalOpen, setEventModalOpen] = useState(false);

  // New Event Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'meeting' | 'deadline' | 'reminder' | 'event'>('meeting');
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newStartTime, setNewStartTime] = useState('10:00');
  const [newEndTime, setNewEndTime] = useState('11:00');
  const [newDescription, setNewDescription] = useState('');

  // Edit Event Form State
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<'meeting' | 'deadline' | 'reminder' | 'event'>('meeting');
  const [editDate, setEditDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [editStartTime, setEditStartTime] = useState('10:00');
  const [editEndTime, setEditEndTime] = useState('11:00');
  const [editDescription, setEditDescription] = useState('');

  // Sync editing form fields with editingEvent state
  useEffect(() => {
    if (editingEvent) {
      setEditTitle(editingEvent.title);
      setEditCategory(editingEvent.category === 'ai-extracted' ? 'event' : editingEvent.category as any);
      setEditDate(editingEvent.date);
      setEditStartTime(editingEvent.startTime);
      setEditEndTime(editingEvent.endTime);
      setEditDescription(editingEvent.description || '');
    }
  }, [editingEvent]);

  const handleUpdateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    if (!editTitle.trim()) {
      toast.error('Event title is required');
      return;
    }

    const getCategoryColor = (cat: string) => {
      switch (cat) {
        case 'meeting': return '#6366f1';
        case 'deadline': return '#ef4444';
        case 'reminder': return '#f59e0b';
        default: return '#71717a';
      }
    };

    updateCalendarEvent(editingEvent.id, {
      title: editTitle,
      category: editCategory as any,
      date: editDate,
      startTime: editStartTime,
      endTime: editEndTime,
      description: editDescription,
      color: getCategoryColor(editCategory),
      addedToCalendar: true
    });

    setEditingEvent(null);
    toast.success('Event updated successfully');
  };

  const handleDeleteEvent = () => {
    if (!editingEvent) return;
    deleteCalendarEvent(editingEvent.id);
    setEditingEvent(null);
    toast.success('Event deleted successfully');
  };

  useEffect(() => {
    setActivePage('calendar');
  }, [setActivePage]);

  // Sync date form field with selectedDate state
  useEffect(() => {
    setNewDate(format(selectedDate, 'yyyy-MM-dd'));
  }, [selectedDate]);

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentMonth(now);
    setSelectedDate(now);
  };

  // Generate days for Month View grid (Monday start)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // Generate days for Week View (centered around selectedDate)
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getEventBgColor = (category: string) => {
    switch (category) {
      case 'meeting': return 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900';
      case 'deadline': return 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900';
      case 'reminder': return 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900';
      default: return 'bg-gray-50 dark:bg-gray-950/20 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-900';
    }
  };

  const getEventDotColor = (category: string) => {
    switch (category) {
      case 'meeting': return 'bg-blue-500';
      case 'deadline': return 'bg-red-500';
      case 'reminder': return 'bg-amber-500';
      default: return 'bg-zinc-500';
    }
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Event title is required');
      return;
    }

    const getCategoryColor = (cat: string) => {
      switch (cat) {
        case 'meeting': return '#6366f1';
        case 'deadline': return '#ef4444';
        case 'reminder': return '#f59e0b';
        default: return '#71717a';
      }
    };

    createCalendarEvent({
      title: newTitle,
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      category: newCategory,
      description: newDescription,
      isAiExtracted: false,
      addedToCalendar: true,
      attendees: [],
      color: getCategoryColor(newCategory),
    });

    setNewTitle('');
    setNewDescription('');
    setEventModalOpen(false);
    toast.success('Event scheduled successfully');
  };

  const handleAddAiEvent = (eventId: string, title: string) => {
    addEventToCalendar(eventId);
    toast.success(`"${title}" confirmed and added to calendar`);
  };

  // Filter events for the selected date
  const selectedDateEvents = calendarEvents
    .filter(e => isSameDay(new Date(e.date), selectedDate))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      
      {/* Main Calendar View Column */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        
        {/* Navigation & View Selection Header */}
        <div className="p-4 md:p-6 border-b border-border flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-muted-foreground" />
              {viewMode === 'agenda' ? 'Agenda Schedule' : format(currentMonth, 'MMMM yyyy')}
            </h1>
            
            {viewMode !== 'agenda' && (
              <div className="flex items-center gap-0.5 border border-border/60 rounded-md bg-muted/40 p-0.5">
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={handlePrevMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold px-2" onClick={handleToday}>
                  Today
                </Button>
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={handleNextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex border border-border/60 rounded-md bg-muted/40 p-0.5 text-xs">
              <button 
                onClick={() => setViewMode('month')}
                className={cn("px-3 py-1 rounded-sm font-medium transition-all", viewMode === 'month' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                Month
              </button>
              <button 
                onClick={() => setViewMode('week')}
                className={cn("px-3 py-1 rounded-sm font-medium transition-all", viewMode === 'week' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                Week
              </button>
              <button 
                onClick={() => setViewMode('agenda')}
                className={cn("px-3 py-1 rounded-sm font-medium transition-all", viewMode === 'agenda' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                Agenda
              </button>
            </div>

            <Button 
              size="sm" 
              onClick={() => setEventModalOpen(true)}
              className="bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 shadow-sm gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Event
            </Button>
          </div>
        </div>

        {/* Calendar Body */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <AnimatePresence mode="wait">
            
            {/* MONTH VIEW */}
            {viewMode === 'month' && (
              <motion.div 
                key="month"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full min-h-[500px] flex flex-col gap-1"
              >
                {/* Days of Week Header */}
                <div className="grid grid-cols-7 text-center font-semibold text-xs text-muted-foreground border-b border-border/40 pb-2 mb-1">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
                
                {/* Monthly Days Grid */}
                <div className="grid grid-cols-7 grid-rows-6 flex-1 gap-1">
                  {monthDays.map((day, idx) => {
                    const isToday = isSameDay(day, new Date());
                    const isSelected = isSameDay(day, selectedDate);
                    const inCurrentMonth = isSameMonth(day, currentMonth);
                    const dayEvents = calendarEvents.filter(e => e.addedToCalendar && isSameDay(new Date(e.date), day));

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedDate(day);
                          if (!inCurrentMonth) setCurrentMonth(day);
                        }}
                        className={cn(
                          "border border-border/40 rounded-lg p-2 flex flex-col gap-1.5 min-h-[70px] transition-all cursor-pointer bg-background hover:bg-muted/10",
                          !inCurrentMonth && "opacity-40",
                          isSelected && "border-primary/40 ring-1 ring-primary/10"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
                            isToday && "bg-[#37352f] text-white dark:bg-[#e3e3e2] dark:text-[#191919]"
                          )}>
                            {day.getDate()}
                          </span>
                          
                          {/* Unconfirmed AI Extracted Badge indicator */}
                          {calendarEvents.some(e => !e.addedToCalendar && isSameDay(new Date(e.date), day)) && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="AI Suggested Event Pending Approval" />
                          )}
                        </div>

                        {/* Event Pills List */}
                        <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[70px] scrollbar-none">
                          {dayEvents.map(event => (
                            <div
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingEvent(event);
                              }}
                              className={cn(
                                "text-[9px] font-semibold py-0.5 px-1.5 rounded truncate border border-transparent cursor-pointer hover:brightness-95 dark:hover:brightness-110 transition-all",
                                getEventBgColor(event.category)
                              )}
                              title={event.title}
                            >
                              {event.startTime} {event.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* WEEK VIEW */}
            {viewMode === 'week' && (
              <motion.div 
                key="week"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full flex flex-col"
              >
                <div className="grid grid-cols-7 border-b border-border/60 pb-3 mb-4">
                  {weekDays.map((day, idx) => {
                    const isToday = isSameDay(day, new Date());
                    const isSelected = isSameDay(day, selectedDate);
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-2 rounded-lg cursor-pointer transition-all hover:bg-muted/30",
                          isSelected && "bg-muted/40"
                        )}
                      >
                        <span className="text-xs text-muted-foreground font-semibold uppercase">{format(day, 'EEE')}</span>
                        <span className={cn(
                          "w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold",
                          isToday && "bg-[#37352f] text-white dark:bg-[#e3e3e2] dark:text-[#191919]"
                        )}>
                          {day.getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-7 flex-1 min-h-[400px] gap-2">
                  {weekDays.map((day, idx) => {
                    const dayEvents = calendarEvents.filter(e => isSameDay(new Date(e.date), day));
                    return (
                      <div key={idx} className="border border-border/40 rounded-lg p-3 bg-muted/5 flex flex-col gap-2">
                        {dayEvents.map(event => (
                          <div 
                            key={event.id}
                            onClick={() => setEditingEvent(event)}
                            className={cn(
                              "p-3 rounded-lg border flex flex-col gap-1.5 text-xs relative cursor-pointer hover:shadow-sm transition-all",
                              getEventBgColor(event.category),
                              !event.addedToCalendar && "border-dashed border-amber-500 bg-amber-50/20"
                            )}
                          >
                            {!event.addedToCalendar && (
                              <div className="absolute top-1.5 right-1.5 flex gap-1 items-center text-[8px] bg-amber-500 text-white font-bold px-1.5 rounded-full uppercase scale-90">
                                Suggestion
                              </div>
                            )}
                            <span className="font-bold truncate leading-tight pr-8">{event.title}</span>
                            <span className="text-[10px] opacity-80 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {event.startTime} - {event.endTime}
                            </span>
                            {event.category === 'meeting' && event.addedToCalendar && (
                              <Badge variant="outline" className="w-fit text-[8px] tracking-wide border-current/20 py-0 px-1 bg-background/40 gap-0.5">
                                <Video className="w-2.5 h-2.5" /> Live
                              </Badge>
                            )}
                          </div>
                        ))}
                        {dayEvents.length === 0 && (
                          <span className="text-[10px] text-muted-foreground text-center py-6">No events</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* AGENDA VIEW */}
            {viewMode === 'agenda' && (
              <motion.div 
                key="agenda"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-3xl mx-auto flex flex-col gap-6"
              >
                {calendarEvents
                  .filter(e => e.addedToCalendar)
                  .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((event, idx) => (
                    <div 
                      key={event.id}
                      onClick={() => {
                        setSelectedDate(new Date(event.date));
                        setEditingEvent(event);
                      }}
                      className="flex gap-4 p-4 rounded-xl border border-border/60 hover:bg-muted/10 cursor-pointer bg-background transition-all"
                    >
                      <div className="w-12 h-12 rounded-lg bg-muted flex flex-col items-center justify-center font-bold shrink-0">
                        <span className="text-[10px] uppercase text-muted-foreground leading-none">{format(new Date(event.date), 'MMM')}</span>
                        <span className="text-base leading-none mt-1">{format(new Date(event.date), 'dd')}</span>
                      </div>
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <span className="font-semibold text-sm text-foreground truncate">{event.title}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> {event.startTime} - {event.endTime}
                        </span>
                        {event.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{event.description}</p>}
                      </div>
                      <Badge variant="outline" className={cn("h-fit py-0.5 px-2 rounded-full border-0 text-[10px]", getEventBgColor(event.category))}>
                        {event.category}
                      </Badge>
                    </div>
                  ))}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

      {/* Right Sidebar - Daily Agenda & AI Suggester */}
      <div className="w-80 border-l border-border/80 bg-muted/10 hidden lg:flex flex-col h-full shrink-0">
        
        {/* Selected Date Header */}
        <div className="p-4 md:p-6 border-b border-border/60 flex flex-col gap-1 shrink-0 bg-background/50">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{format(selectedDate, 'EEEE')}</span>
          <span className="text-lg font-bold text-foreground">{format(selectedDate, 'MMMM d, yyyy')}</span>
        </div>

        {/* Daily Schedule List */}
        <ScrollArea className="flex-1">
          <div className="p-4 flex flex-col gap-4">
            
            {/* AI Suggested Event section */}
            {calendarEvents.filter(e => !e.addedToCalendar && isSameDay(new Date(e.date), selectedDate)).map(event => (
              <div 
                key={event.id}
                className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col gap-3"
              >
                <div className="flex gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0 animate-pulse" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">AI Extracted Event Suggestion</span>
                    <span className="text-sm font-semibold text-foreground leading-tight">{event.title}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {event.startTime} - {event.endTime}
                    </span>
                    {event.sourceDocument && (
                      <span className="text-[10px] text-muted-foreground">Source: {event.sourceDocument.title}</span>
                    )}
                  </div>
                </div>
                
                <Button 
                  onClick={() => handleAddAiEvent(event.id, event.title)}
                  className="w-full text-xs h-8 bg-amber-500 hover:bg-amber-600 text-white font-medium gap-1.5"
                >
                  <CalendarCheck className="w-4 h-4" /> Confirm & Add
                </Button>
              </div>
            ))}

            {/* General Events list */}
            <div className="flex flex-col gap-2.5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Scheduled Events</h3>
              
              {selectedDateEvents.filter(e => e.addedToCalendar).length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl">
                  No events scheduled for this day.
                </div>
              ) : (
                selectedDateEvents.filter(e => e.addedToCalendar).map(event => (
                  <div 
                    key={event.id}
                    onClick={() => setEditingEvent(event)}
                    className="p-3.5 rounded-xl border border-border/40 bg-background flex flex-col gap-2.5 hover:shadow-sm cursor-pointer hover:border-primary/20 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-foreground leading-tight">{event.title}</span>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0 mt-1",
                        getEventDotColor(event.category)
                      )} />
                    </div>

                    <div className="flex flex-col gap-1 text-[10px] text-muted-foreground font-medium">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> {event.startTime} - {event.endTime}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" /> {event.location}
                        </span>
                      )}
                    </div>

                    {event.attendees && event.attendees.length > 0 && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border/20">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <div className="flex -space-x-1">
                          {event.attendees.map((at, idx) => (
                            <Avatar key={idx} className="w-4 h-4 border border-background">
                              <AvatarFallback className="text-[6px] bg-primary/10 text-primary">{at.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      </div>
                    )}

                    {event.category === 'meeting' && (
                      <Button variant="outline" className="w-full h-7 text-[10px] hover:bg-primary/5 hover:text-primary gap-1">
                        <Video className="w-3 h-3" /> Join Virtual Meeting
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>

          </div>
        </ScrollArea>
      </div>

      {/* EVENT CREATION MODAL DIALOG */}
      <Dialog open={eventModalOpen} onOpenChange={setEventModalOpen}>
        <DialogContent className="sm:max-w-md bg-background border border-border/60 shadow-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">New Calendar Event</DialogTitle>
            <DialogDescription className="text-xs">Schedule meetings, milestones, or deadlines for your team.</DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateEvent} className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Title</label>
              <input 
                type="text" 
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Project Sync meeting"
                className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Category</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as any)}
                  className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="meeting">Meeting</option>
                  <option value="deadline">Deadline</option>
                  <option value="reminder">Reminder</option>
                  <option value="event">General Event</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Date</label>
                <input 
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Start Time</label>
                <input 
                  type="time" 
                  value={newStartTime}
                  onChange={e => setNewStartTime(e.target.value)}
                  className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">End Time</label>
                <input 
                  type="time" 
                  value={newEndTime}
                  onChange={e => setNewEndTime(e.target.value)}
                  className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
              <textarea 
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Details or notes about the event..."
                rows={3}
                className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            <DialogFooter className="mt-2 flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setEventModalOpen(false)}>Cancel</Button>
              <Button 
                type="submit"
                className="bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 shadow-sm"
              >
                Schedule Event
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EVENT EDIT/DELETE MODAL DIALOG */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="sm:max-w-md bg-background border border-border/60 shadow-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Edit Calendar Event</DialogTitle>
            <DialogDescription className="text-xs">Modify the details of your scheduled event or remove it.</DialogDescription>
          </DialogHeader>
          
          {editingEvent && (
            <form onSubmit={handleUpdateEvent} className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Title</label>
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="e.g. Project Sync meeting"
                  className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Category</label>
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value as any)}
                    className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="meeting">Meeting</option>
                    <option value="deadline">Deadline</option>
                    <option value="reminder">Reminder</option>
                    <option value="event">General Event</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Date</label>
                  <input 
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Start Time</label>
                  <input 
                    type="time" 
                    value={editStartTime}
                    onChange={e => setEditStartTime(e.target.value)}
                    className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">End Time</label>
                  <input 
                    type="time" 
                    value={editEndTime}
                    onChange={e => setEditEndTime(e.target.value)}
                    className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
                <textarea 
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  placeholder="Details or notes about the event..."
                  rows={3}
                  className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <DialogFooter className="mt-2 flex flex-row justify-between items-center w-full gap-2">
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={handleDeleteEvent}
                  className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
                >
                  Delete Event
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setEditingEvent(null)}>Cancel</Button>
                  <Button 
                    type="submit"
                    className="bg-[#37352f] hover:bg-[#37352f]/90 text-white dark:bg-[#e3e3e2] dark:text-[#191919] dark:hover:bg-[#e3e3e2]/90 shadow-sm"
                  >
                    Save Changes
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
