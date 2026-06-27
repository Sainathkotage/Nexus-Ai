'use client';

import React, { useState, useMemo } from 'react';
import { useWorkspace } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { 
  Video, Users, Calendar, Plus, PhoneCall, Check, X, Clock, ArrowRight, VideoOff 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function CallsDashboard() {
  const router = useRouter();
  const { 
    user, allUsers, calendarEvents, createCalendarEvent, friendIds 
  } = useWorkspace();

  const [roomCode, setRoomCode] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  
  // Schedule meeting form state
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [meetingDesc, setMeetingDesc] = useState('');

  // 1. Host Instant Call
  const handleHostInstantCall = () => {
    // Generate a clean room code like meet-abc-defg
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const segment1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const segment2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const code = `meet-${segment1}-${segment2}`;
    
    toast.success(`Creating room: ${code}`);
    router.push(`/calls/${code}`);
  };

  // 2. Join Call with Code
  const handleJoinCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      toast.error('Please enter a valid room code.');
      return;
    }
    
    // Normalize code (lowercase, trim)
    const normalized = roomCode.trim().toLowerCase();
    router.push(`/calls/${normalized}`);
  };

  // 3. Initiate Private Call with Teammate
  const handleTeammateCall = (teammateId: string) => {
    if (!user) return;
    // Private room ID sorted alphabetically to ensure both land in same room
    const sortedIds = [user.id, teammateId].sort();
    const code = `private-${sortedIds[0]}-${sortedIds[1]}`;
    
    toast.success('Initiating secure private line...');
    router.push(`/calls/${code}?type=private&partner=${teammateId}`);
  };

  // 4. Schedule Meeting
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim()) {
      toast.error('Please enter a meeting title.');
      return;
    }

    const meetingRoomId = `meet-${Math.random().toString(36).substring(2, 11)}`;

    try {
      await createCalendarEvent({
        title: `Video Meeting: ${meetingTitle}`,
        description: `${meetingDesc ? meetingDesc + '\n\n' : ''}Room Code: ${meetingRoomId}\nJoin directly via: ${window.location.origin}/calls/${meetingRoomId}`,
        date: meetingDate,
        startTime,
        endTime,
        category: 'work',
        attendees: [],
        color: '#a855f7', // Purple category color
        addedToCalendar: true
      });

      toast.success('Video meeting scheduled and added to calendar!');
      setShowScheduleModal(false);
      
      // Clear form
      setMeetingTitle('');
      setMeetingDesc('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to schedule video meeting.');
    }
  };

  // Filter scheduled meetings from Calendar Events
  const upcomingMeetings = useMemo(() => {
    return calendarEvents
      .filter(ev => 
        ev.title.toLowerCase().includes('meeting') || 
        ev.title.toLowerCase().includes('call') ||
        ev.description?.toLowerCase().includes('room code:')
      )
      .map(ev => {
        // Extract room code if in description
        const match = ev.description?.match(/room code:\s*(meet-[a-z0-9-]+)/i);
        const code = match ? match[1] : null;
        return { ...ev, extractedCode: code };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [calendarEvents]);

  // Teammates list
  const teammates = useMemo(() => {
    return allUsers.filter(u => u.id !== user?.id && friendIds.includes(u.id));
  }, [allUsers, user?.id, friendIds]);

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-5xl mx-auto w-full animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Video className="w-6 h-6 text-indigo-500" />
            Nexus Rooms
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Secure peer-to-peer video conferencing and workspace calls.</p>
        </div>
        <Button onClick={() => setShowScheduleModal(true)} className="flex items-center gap-2 rounded-full">
          <Calendar className="w-4 h-4" />
          <span>Schedule Meeting</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Host Meeting Card */}
        <div className="border border-border rounded-2xl p-6 bg-card flex flex-col justify-between shadow-none relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-300" />
          <div className="space-y-4 relative">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Host Instant Call</h3>
              <p className="text-xs text-muted-foreground mt-1">Start a secure virtual room immediately. Share the generated link or room code to invite teammates.</p>
            </div>
          </div>
          <Button onClick={handleHostInstantCall} className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700">
            Host Call
          </Button>
        </div>

        {/* Join Meeting Card */}
        <div className="border border-border rounded-2xl p-6 bg-card flex flex-col justify-between shadow-none relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all duration-300" />
          <div className="space-y-4 relative">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Join with Code</h3>
              <p className="text-xs text-muted-foreground mt-1">Enter a meeting code or invitation link below to connect with active participants.</p>
            </div>
          </div>
          <form onSubmit={handleJoinCall} className="mt-6 flex gap-2">
            <Input 
              placeholder="e.g. meet-abc-defg" 
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="secondary">
              Join
            </Button>
          </form>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Scheduled Calls List */}
        <div className="lg:col-span-2 border border-border rounded-2xl p-5 bg-card flex flex-col gap-4 shadow-none">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Upcoming Video Meetings
          </h3>

          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
            {upcomingMeetings.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Calendar className="w-8 h-8 opacity-40" />
                <span className="text-xs">No video calls scheduled</span>
              </div>
            ) : (
              upcomingMeetings.map((meeting) => (
                <div key={meeting.id} className="flex justify-between items-center p-3 rounded-xl border bg-muted/30 hover:bg-muted/60 transition-colors">
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-foreground truncate max-w-md">{meeting.title.replace('Video Meeting: ', '')}</h4>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {meeting.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {meeting.startTime} - {meeting.endTime}
                      </span>
                    </div>
                  </div>
                  {meeting.extractedCode ? (
                    <Button 
                      onClick={() => router.push(`/calls/${meeting.extractedCode}`)}
                      size="sm" 
                      className="text-[11px] rounded-full h-8"
                    >
                      Join Meeting
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic">No code link</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Teammates Call List */}
        <div className="border border-border rounded-2xl p-5 bg-card flex flex-col gap-4 shadow-none">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <PhoneCall className="w-4 h-4 text-muted-foreground" />
            Direct Video Lines
          </h3>

          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
            {teammates.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                No active team contacts
              </div>
            ) : (
              teammates.map((teammate) => (
                <div key={teammate.id} className="flex justify-between items-center p-2.5 rounded-xl border bg-background/50 hover:bg-accent/40 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 text-xs font-bold font-mono">
                      {teammate.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-foreground truncate">{teammate.name}</h4>
                      <p className="text-[9px] text-muted-foreground truncate">{teammate.role || 'Teammate'}</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleTeammateCall(teammate.id)}
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 rounded-full"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Schedule Meeting Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border rounded-2xl w-full max-w-md p-6 relative shadow-2xl flex flex-col gap-4 text-foreground"
            >
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground rounded-full p-1 hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                  Schedule Video Room
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Creates a scheduled conference room and adds it to your calendar.</p>
              </div>

              <form onSubmit={handleScheduleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Meeting Title</label>
                  <Input 
                    required 
                    placeholder="e.g. Sprint Planning Call" 
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-semibold">Date</label>
                    <Input 
                      type="date" 
                      required 
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Start Time</label>
                    <Input 
                      type="time" 
                      required 
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">End Time</label>
                    <Input 
                      type="time" 
                      required 
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Description (Optional)</label>
                  <textarea 
                    placeholder="e.g. Weekly review of task updates and release roadmap." 
                    value={meetingDesc}
                    onChange={(e) => setMeetingDesc(e.target.value)}
                    className="w-full text-xs min-h-[70px] bg-background border border-input rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t mt-4">
                  <Button type="button" variant="outline" onClick={() => setShowScheduleModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Schedule Room
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
