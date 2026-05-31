import express from 'express';
import cors from 'cors';
import db from './db';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/people', async (req, res) => {
  await db.read();
  res.json(db.data.people);
});
app.get('/api/currentUser', async (req, res) => {
  await db.read();
  res.json(db.data.currentUser);
});
app.get('/api/documents', async (req, res) => {
  await db.read();
  res.json(db.data.documents);
});
app.get('/api/tasks', async (req, res) => {
  await db.read();
  res.json(db.data.tasks);
});
app.get('/api/calendarEvents', async (req, res) => {
  await db.read();
  res.json(db.data.calendarEvents);
});
app.get('/api/emails', async (req, res) => {
  await db.read();
  res.json(db.data.emails);
});
app.get('/api/conversations', async (req, res) => {
  await db.read();
  res.json(db.data.conversations);
});
app.get('/api/aiInsights', async (req, res) => {
  await db.read();
  res.json(db.data.aiInsights);
});
app.get('/api/dashboardStats', async (req, res) => {
  await db.read();
  res.json(db.data.dashboardStats);
});
app.get('/api/projectProgress', async (req, res) => {
  await db.read();
  res.json(db.data.projectProgress);
});
app.get('/api/teamWorkload', async (req, res) => {
  await db.read();
  res.json(db.data.teamWorkload);
});
app.get('/api/knowledgeGraphData', async (req, res) => {
  await db.read();
  res.json(db.data.knowledgeGraphData);
});
app.get('/api/recentActivity', async (req, res) => {
  await db.read();
  res.json(db.data.recentActivity);
});
app.get('/api/suggestedPrompts', async (req, res) => {
  await db.read();
  res.json(db.data.suggestedPrompts);
});

// Add a new document
app.post('/api/documents', async (req, res) => {
  await db.read();
  const newDocument = { ...req.body, id: uuidv4() };
  db.data.documents.unshift(newDocument);
  await db.write();
  res.json(newDocument);
});

// Update a task
app.put('/api/tasks/:id', async (req, res) => {
  await db.read();
  const { id } = req.params;
  const { newStatus } = req.body;
  const task = db.data.tasks.find((t) => t.id === id);
  if (task) {
    task.status = newStatus;
    task.updatedAt = new Date().toISOString();
    await db.write();
    res.json(task);
  } else {
    res.status(404).json({ message: 'Task not found' });
  }
});

// Update an email
app.put('/api/emails/:id', async (req, res) => {
  await db.read();
  const { id } = req.params;
  const { status } = req.body;
  const email = db.data.emails.find((e) => e.id === id);
  if (email) {
    email.status = status;
    if (status === 'sent') {
      email.sentAt = new Date().toISOString();
    }
    await db.write();
    res.json(email);
  } else {
    res.status(404).json({ message: 'Email not found' });
  }
});

// Add a message to a conversation
app.post('/api/conversations/:id/messages', async (req, res) => {
  await db.read();
  const { id } = req.params;
  const message = { ...req.body, id: uuidv4() };
  const conversation = db.data.conversations.find((c) => c.id === id);
  if (conversation) {
    conversation.messages.push(message);
    conversation.updatedAt = new Date().toISOString();
    await db.write();
    res.json(message);
  } else {
    res.status(404).json({ message: 'Conversation not found' });
  }
});

// Update a calendar event
app.put('/api/calendarEvents/:id', async (req, res) => {
  await db.read();
  const { id } = req.params;
  const { addedToCalendar } = req.body;
  const event = db.data.calendarEvents.find((e) => e.id === id);
  if (event) {
    event.addedToCalendar = addedToCalendar;
    await db.write();
    res.json(event);
  } else {
    res.status(404).json({ message: 'Event not found' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
