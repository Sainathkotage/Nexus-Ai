import { NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    // Polyfill browser globals required by pdfjs-dist / napi-rs/canvas in Node.js
    if (typeof global.DOMMatrix === 'undefined') {
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
    let analysis = {
      summary: 'Newly uploaded document.',
      keyPoints: ['No key points extracted yet.'],
      tasks: [],
      deadlines: [],
      people: [],
      organizations: [],
      tags: ['uploaded']
    };

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

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
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
          analysis = JSON.parse(cleanText);
        } else {
          console.warn('Gemini extraction endpoint returned error:', response.status);
        }
      } catch (err) {
        console.error('Gemini extraction failed, using defaults:', err);
      }
    }

    // ── Supabase Integration ────────────────────────────────
    const supabaseAdmin = getSupabaseServiceRole();
    const fileName = `${Date.now()}-${file.name}`;
    
    // Create bucket if it doesn't exist
    try {
      await supabaseAdmin.storage.createBucket('documents', { public: true });
    } catch (_) {}

    // Upload file buffer to Supabase storage bucket
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

    // Get public URL
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
      summary: analysis.summary,
      key_points: analysis.keyPoints,
      extracted_tasks: analysis.tasks,
      extracted_deadlines: analysis.deadlines,
      extracted_people: analysis.people,
      extracted_organizations: analysis.organizations,
      tags: analysis.tags,
      thumbnail: file.name.toLowerCase().endsWith('.pdf') ? '📋' : '📄',
      processing_status: 'completed',
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

    return NextResponse.json({
      text,
      filename: file.name,
      size: file.size,
      analysis,
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
