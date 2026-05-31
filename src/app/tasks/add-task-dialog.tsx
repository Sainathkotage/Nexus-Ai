// components/tasks/add-task-dialog.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, UserPlus } from 'lucide-react';
import { Task, TaskStatus, Priority, Person } from '@/types';

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTask: (task: Omit<Task, 'id'>) => void;
}

// Mock team members
const TEAM_MEMBERS: Person[] = [
  { id: 'p1', name: 'Sarah Chen', email: 'sarah@nexus.ai', avatar: '', role: 'Product Lead', status: 'online' },
  { id: 'p2', name: 'Marcus Johnson', email: 'marcus@nexus.ai', avatar: '', role: 'Engineering Manager', status: 'online' },
  { id: 'p3', name: 'Elena Rodriguez', email: 'elena@nexus.ai', avatar: '', role: 'Design Director', status: 'offline' },
  { id: 'p4', name: 'Alex Kim', email: 'alex@nexus.ai', avatar: '', role: 'Senior Developer', status: 'online' },
];

export function AddTaskDialog({ open, onOpenChange, onAddTask }: AddTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<Priority>('medium');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [assignee, setAssignee] = useState<Person>(TEAM_MEMBERS[0]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart;
    setDescription(value);
    setCursorPosition(position);

    // Check for @ mentions
    const textBeforeCursor = value.substring(0, position);
    const match = textBeforeCursor.match(/@(\w*)$/);
    
    if (match) {
      setShowMentions(true);
      setMentionQuery(match[1]);
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
  };

  const insertMention = (member: typeof TEAM_MEMBERS[0]) => {
    const textBeforeCursor = description.substring(0, cursorPosition);
    const textAfterCursor = description.substring(cursorPosition);
    const mentionStart = textBeforeCursor.lastIndexOf('@');
    
    const newDescription = 
      description.substring(0, mentionStart) + 
      `@${member.name} ` + 
      textAfterCursor;
    
    setDescription(newDescription);
    
    // Set assignee
    setAssignee(member);
    
    setShowMentions(false);
    setMentionQuery('');
    
    // Focus back on textarea
    setTimeout(() => {
      descriptionRef.current?.focus();
    }, 0);
  };

  const filteredMembers = TEAM_MEMBERS.filter(member =>
    member.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const removeAssignee = () => {
    setAssignee(TEAM_MEMBERS[0]);
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    onAddTask({
      title,
      description,
      status,
      priority,
      tags,
      assignee,
      dueDate: new Date().toISOString(), // You can add a date picker
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subtasks: [],
    });

    // Reset form
    setTitle('');
    setDescription('');
    setStatus('todo');
    setPriority('medium');
    setTags([]);
    setAssignee(TEAM_MEMBERS[0]);
    setTagInput('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description with @mentions */}
          <div className="space-y-2 relative">
            <Label htmlFor="description">Description</Label>
            <Textarea
              ref={descriptionRef}
              id="description"
              placeholder="Enter task description... Use @ to mention team members"
              value={description}
              onChange={handleDescriptionChange}
              rows={4}
              className="resize-none"
            />
            
            {/* Mention Dropdown */}
            {showMentions && filteredMembers.length > 0 && (
              <div className="absolute z-50 w-64 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => insertMention(member)}
                    className="w-full px-3 py-2 text-left hover:bg-accent text-sm flex flex-col"
                  >
                    <span className="font-medium">{member.name}</span>
                    <span className="text-xs text-muted-foreground">{member.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Add tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button type="button" onClick={addTag} variant="outline" size="sm">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Assignee */}
          {assignee && (
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1">
                  <UserPlus className="w-3 h-3" />
                  {assignee.name}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={removeAssignee}
                  />
                </Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}