import { NextResponse, after } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDocumentFavicon } from '@/lib/utils';

export async function POST(req: Request) {
  try {
    // Polyfill browser globals required by pdfjs-dist / napi-rs/canvas in Node.js
    if (typeof global.DOMMatrix === 'undefined') {
      try {
        // @ts-ignore
        const canvas = require('@napi-rs/canvas');
        // @ts-ignore
        global.DOMMatrix = canvas.DOMMatrix;
        // @ts-ignore
        global.ImageData = canvas.ImageData;
        // @ts-ignore
        global.Path2D = canvas.Path2D;
        // @ts-ignore
        global.DOMPoint = canvas.DOMPoint;
        // @ts-ignore
        global.DOMRect = canvas.DOMRect;
      } catch (canvasErr) {
        console.warn('Failed to load @napi-rs/canvas polyfills, using mock fallbacks:', canvasErr);
        // Provide mock classes to prevent ReferenceErrors in pdfjs-dist
        // @ts-ignore
        global.DOMMatrix = global.DOMMatrix || class DOMMatrix {};
        // @ts-ignore
        global.ImageData = global.ImageData || class ImageData {};
        // @ts-ignore
        global.Path2D = global.Path2D || class Path2D {};
        // @ts-ignore
        global.DOMPoint = global.DOMPoint || class DOMPoint {};
        // @ts-ignore
        global.DOMRect = global.DOMRect || class DOMRect {};
      }
    }

    // @ts-ignore
    const { PDFParse } = require('pdf-parse');
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const formUserId = String(formData.get('userId') || '');
    const formUserName = String(formData.get('userName') || '');
    const formUserEmail = String(formData.get('userEmail') || '');
    const formUserRole = String(formData.get('userRole') || 'Member');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);
    
    let text = '';
    
    if (file.name.toLowerCase().endsWith('.pdf')) {
      const parser = new PDFParse({ data: nodeBuffer });
      const result = await parser.getText();
      text = result.text;
      await parser.destroy();
    } else {
      // Fallback for txt or other raw text formats
      text = new TextDecoder('utf-8').decode(buffer);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const supabaseAdmin = getSupabaseServiceRole();
    const fileName = `${Date.now()}-${file.name}`;

    // Upload file to Supabase Storage
    const { error: storageErr } = await supabaseAdmin.storage
      .from('documents')
      .upload(fileName, nodeBuffer, {
        contentType: file.type,
        upsert: true
      });

    if (storageErr) {
      console.error('Supabase Storage Error:', storageErr);
      throw new Error(`Failed to store file in Supabase: ${storageErr.message}`);
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(fileName);

    const supabaseAuth = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabaseAuth.auth.getUser();
    const uploadedBy = authUser
      ? {
          id: authUser.id,
          name: authUser.user_metadata?.username ?? authUser.email?.split('@')[0] ?? 'User',
          email: authUser.email ?? '',
          avatar: '',
          role: 'Member',
        }
      : formUserId
        ? {
            id: formUserId,
            name: formUserName || formUserEmail.split('@')[0] || 'User',
            email: formUserEmail,
            avatar: '',
            role: formUserRole || 'Member',
          }
      : { id: 'anonymous', name: 'User', email: '', avatar: '', role: 'Member' };

    const docId = `doc-${Date.now()}`;
    const dbPayload = {
      id: docId,
      title: file.name,
      type: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt',
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      uploaded_at: new Date().toISOString(),
      uploaded_by: uploadedBy,
      summary: 'Processing document...',
      key_points: ['No key points extracted yet.'],
      extracted_tasks: [],
      extracted_deadlines: [],
      extracted_people: [],
      extracted_organizations: [],
      tags: ['processing'],
      thumbnail: getDocumentFavicon(file.name),
      processing_status: 'processing',
      content: text
    };

    // Insert document record into PostgreSQL documents table
    const { data: dbData, error: dbErr } = await supabaseAdmin
      .from('documents')
      .insert(dbPayload)
      .select()
      .single();

    if (dbErr) {
      console.error('Supabase Database Error:', dbErr);
      throw new Error(`Failed to save document metadata: ${dbErr.message}`);
    }

    // Defer Gemini API processing to run in the background after the response is sent
    after(async () => {
      if (apiKey && text.trim().length > 0) {
        try {
          const prompt = `Analyze the following document content. Extract standard metadata and content analysis. 
The output MUST be a JSON object with exactly the following fields (do not wrap in markdown code blocks, return raw json string):
{
  "summary": "A concise 3-sentence executive summary of the document",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4"],
  "tasks": [
    {"text": "Task description 1", "deadline": "YYYY-MM-DD or null", "assignee": "assignee name or null"},
    {"text": "Task description 2", "deadline": "YYYY-MM-DD or null", "assignee": "assignee name or null"}
  ],
  "deadlines": [
    {"text": "Deadline name 1", "date": "YYYY-MM-DD"},
    {"text": "Deadline name 2", "date": "YYYY-MM-DD"}
  ],
  "people": ["Name 1", "Name 2"],
  "organizations": ["Org 1", "Org 2"],
  "tags": ["tag1", "tag2", "tag3"]
}

If no tasks, deadlines, people, or organizations are found, return empty arrays.
Document Content:
${text.substring(0, 15000)}`;

          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2
              }
            })
          });

          if (response.ok) {
            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
            const cleanText = rawText.trim().replace(/^```json/i, '').replace(/^```/, '').trim();
            const analysis = JSON.parse(cleanText);

            // Update document with analysis details
            const { error: updateErr } = await supabaseAdmin
              .from('documents')
              .update({
                summary: analysis.summary || 'Uploaded document.',
                key_points: analysis.keyPoints || [],
                extracted_tasks: analysis.tasks || [],
                extracted_deadlines: analysis.deadlines || [],
                extracted_people: analysis.people || [],
                extracted_organizations: analysis.organizations || [],
                tags: analysis.tags || ['uploaded'],
                processing_status: 'completed'
              })
              .eq('id', docId);

            if (updateErr) {
              console.error('Failed to update document analysis:', updateErr);
            }

            // Extract and insert tasks into database
            if (analysis.tasks && analysis.tasks.length > 0) {
              const tasksPayload = analysis.tasks.map((t: any) => {
                const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                return {
                  id: taskId,
                  title: t.text,
                  description: `Extracted from document: ${file.name}`,
                  status: 'todo',
                  priority: 'medium',
                  assignee: uploadedBy,
                  due_date: t.deadline || null,
                  tags: ['extracted'],
                  source_document: { id: docId, title: file.name },
                  subtasks: [],
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };
              });

              const { error: tasksErr } = await supabaseAdmin
                .from('tasks')
                .insert(tasksPayload);

              if (tasksErr) {
                console.error('Failed to insert extracted tasks:', tasksErr);
              }
            }

            // Extract and insert calendar deadlines into database
            if (analysis.deadlines && analysis.deadlines.length > 0) {
              const eventsPayload = analysis.deadlines.map((d: any) => {
                const eventId = `ev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                return {
                  id: eventId,
                  title: d.text,
                  description: `Extracted deadline from: ${file.name}`,
                  date: d.date,
                  start_time: '09:00',
                  end_time: '10:00',
                  category: 'deadline',
                  attendees: [],
                  color: 'indigo',
                  added_to_calendar: true
                };
              });

              const { error: eventsErr } = await supabaseAdmin
                .from('calendar_events')
                .insert(eventsPayload);

              if (eventsErr) {
                console.error('Failed to insert extracted calendar events:', eventsErr);
              }
            }

          } else {
            console.warn('Gemini extraction endpoint returned error:', response.status);
            await supabaseAdmin
              .from('documents')
              .update({ processing_status: 'failed' })
              .eq('id', docId);
          }
        } catch (err) {
          console.error('Gemini extraction failed:', err);
          await supabaseAdmin
            .from('documents')
            .update({ processing_status: 'failed' })
            .eq('id', docId);
        }
      } else {
        await supabaseAdmin
          .from('documents')
          .update({ processing_status: 'completed' })
          .eq('id', docId);
      }
    });

    return NextResponse.json({
      text,
      filename: file.name,
      size: file.size,
      dbRecord: dbData
    });

  } catch (error: any) {
    console.error('Upload Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process file.' },
      { status: 500 }
    );
  }
}
