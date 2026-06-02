import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
import { getTodayAiUsage, isAdminRole } from '@/lib/permissions';

export async function POST(req: Request) {
  try {
    const { documentTitle, documentContent, format, workspaceId } = await req.json();

    if (!documentContent || !format) {
      return NextResponse.json({ error: 'Missing documentContent or format' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please add GEMINI_API_KEY in .env.local.' },
        { status: 500 }
      );
    }

    // Verify rate limit
    const auth = await createSupabaseServerClient();
    const { data: { user } } = await auth.auth.getUser();
    if (user && workspaceId) {
      const supabase = createSupabaseAdminClient();
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const limit = isAdminRole(profile?.role) ? 100 : 25;
      const usage = await getTodayAiUsage(user.id, workspaceId);
      if ((usage?.requests || 0) > limit) {
        return NextResponse.json({ error: `Daily AI limit reached (${limit} requests).` }, { status: 429 });
      }
    }

    // Define format-specific system prompt guidelines
    let studySystemPrompt = '';

    if (format === 'podcast') {
      studySystemPrompt = `You are a podcast producer. Based on the document: "${documentTitle}", write an engaging, natural-sounding, conversational podcast script discussing the key details and concepts.
      The conversation must have two speakers:
      - "Host": Asks interesting questions, clarifies points, and keeps the discussion flowing.
      - "Expert": Explains deep insights, shares data, and simplifies complex details.
      The discussion should cover the core arguments, context, and key highlights of the document.
      Return ONLY a valid JSON object with the following schema:
      {
        "title": "A creative title for the podcast episode",
        "description": "A short summary of the podcast discussion",
        "episodes": [
          { "speaker": "Host" | "Expert", "text": "What they say. Use natural speech fillers like 'Well', 'Exactly', 'Interesting', etc. to sound human." }
        ]
      }`;
    } else if (format === 'video-overview') {
      studySystemPrompt = `You are an expert presentation scriptwriter. Based on the document: "${documentTitle}", create a video overview slide deck script.
      The presentation should explain the document in a series of logical visual slides accompanied by audio narration.
      Return ONLY a valid JSON object with the following schema:
      {
        "title": "Title of the video overview",
        "slides": [
          {
            "slideTitle": "Slide title",
            "bulletPoints": ["Key bullet point 1", "Key bullet point 2", "Key bullet point 3"],
            "illustrationType": "chart" | "timeline" | "dashboard" | "list",
            "narration": "What the narrator speaks for this slide. Ensure it sounds like a real speaker explaining the slide graphics."
          }
        ]
      }`;
    } else if (format === 'infographic') {
      studySystemPrompt = `You are a data-driven infographic designer. Transform the document: "${documentTitle}" into a visually structured infographic summary.
      Return ONLY a valid JSON object with the following schema:
      {
        "title": "Infographic Title",
        "subtitle": "Infographic Subtitle Summarizing Purpose",
        "metrics": [
          { "label": "Label of KPI", "value": "A numeric or short value (e.g. 85%, 10x, $5M)", "icon": "A short 1-word name (e.g. trend, users, shield, briefcase)" }
        ],
        "highlights": [
          { "title": "Highlight Area Title", "text": "Detailed visual highlight description" }
        ],
        "timeline": [
          { "step": "Step name or Stage", "title": "Milestone Title", "description": "What happens in this milestone" }
        ]
      }`;
    } else if (format === 'flashcards') {
      studySystemPrompt = `You are a cognitive study expert. Create a deck of 8-12 flashcards to test understanding of the document: "${documentTitle}".
      Ensure questions cover core definitions, equations, dates, findings, or methods.
      Return ONLY a valid JSON object with the following schema:
      {
        "flashcards": [
          { "question": "Question on the front of the flashcard?", "answer": "Answer on the back of the flashcard." }
        ]
      }`;
    } else if (format === 'quiz') {
      studySystemPrompt = `You are an educational designer. Generate a practice quiz containing 5-10 questions to evaluate comprehension of the document: "${documentTitle}".
      Provide 4 options for each multiple-choice question, a correct index, and a clear explanation.
      Return ONLY a valid JSON object with the following schema:
      {
        "questions": [
          {
            "question": "The quiz question?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "answerIndex": 0 | 1 | 2 | 3,
            "explanation": "Detailed explanation of why this option is correct."
          }
        ]
      }`;
    } else if (format === 'mindmap') {
      studySystemPrompt = `You are an information architect. Build a concept map/mindmap connecting entities, details, and chapters of the document: "${documentTitle}".
      Generate a hierarchical tree of concepts.
      Return ONLY a valid JSON object representing the node hierarchy:
      {
        "id": "root",
        "label": "Document Name or Main Topic",
        "children": [
          {
            "id": "child-1",
            "label": "Subtopic A",
            "children": [
              { "id": "subchild-1", "label": "Detail A1" }
            ]
          }
        ]
      }`;
    } else if (format === 'table') {
      studySystemPrompt = `You are a data extraction expert. Scan the document: "${documentTitle}" and extract key facts, comparison values, or structured statistics into tabular form.
      Return ONLY a valid JSON object with headers and rows mapping properties:
      {
        "headers": ["Name/Topic/Date Column", "Property Column 1", "Property Column 2"],
        "rows": [
          {
            "Name/Topic/Date Column": "Row Item A",
            "Property Column 1": "Extracted value A1",
            "Property Column 2": "Extracted value A2"
          }
        ]
      }`;
    } else if (format === 'faq') {
      studySystemPrompt = `You are an educational tutor. Create a list of Frequently Asked Questions (FAQ) with clear, detailed answers based on the document: "${documentTitle}".
      Provide 5-10 question and answer pairs.
      Return ONLY a valid JSON object with the following schema:
      {
        "questions": [
          { "q": "The question based on the document", "a": "The detailed answer containing key facts and explanations" }
        ]
      }`;
    } else if (format === 'briefing') {
      studySystemPrompt = `You are a business chief of staff. Create a professional Briefing Document based on the document: "${documentTitle}".
      Summarize context, key takeaways, and provide a detailed executive brief.
      Return ONLY a valid JSON object with the following schema:
      {
        "title": "Title of the briefing document",
        "context": "Background context and overview of the document scope",
        "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3", "Takeaway 4"],
        "executiveBrief": "Detailed, comprehensive narrative summary of the contents, findings, and implications"
      }`;
    } else if (format === 'study-guide') {
      studySystemPrompt = `You are an academic course instructor. Create a structured Study Guide covering the primary topics of the document: "${documentTitle}".
      Identify 3-6 core topics, summarize each, and provide bulleted structural details.
      Return ONLY a valid JSON object with the following schema:
      {
        "topics": [
          { "topic": "Name of Topic or Section", "summary": "One-paragraph overview of the topic", "details": ["Bulleted study detail 1", "Bulleted study detail 2", "Bulleted study detail 3"] }
        ]
      }`;
    } else if (format === 'timeline') {
      studySystemPrompt = `You are a historian and timelines compiler. Extract dates, chronological sequences, milestones, or developmental phases from the document: "${documentTitle}".
      Return ONLY a valid JSON object with the following schema:
      {
        "events": [
          { "date": "Date, Time, or Phase Name", "event": "Milestone event title", "description": "Details of the event or milestone context" }
        ]
      }`;
    } else if (format === 'insights') {
      studySystemPrompt = `You are an AI document researcher. Extract 5 crucial, deep key insights from the document: "${documentTitle}".
      Return ONLY a valid JSON object with the following schema:
      {
        "insights": [
          "Crucial Insight 1 detailing key finding, statistic, or argument",
          "Crucial Insight 2 detailing key finding, statistic, or argument",
          "Crucial Insight 3 detailing key finding, statistic, or argument",
          "Crucial Insight 4 detailing key finding, statistic, or argument",
          "Crucial Insight 5 detailing key finding, statistic, or argument"
        ]
      }`;
    }


    const contents = [
      {
        role: 'user',
        parts: [{ text: `Generate study material format: "${format}" based on the document text:\n\n${documentContent}` }]
      }
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    let response: Response | null = null;
    let data: any = null;
    let attempt = 0;
    const maxAttempts = 3;
    let delay = 1000;

    while (attempt < maxAttempts) {
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents,
            system_instruction: {
              parts: [{ text: studySystemPrompt }]
            },
            generationConfig: {
              temperature: 0.3,
              responseMimeType: 'application/json',
            }
          })
        });

        data = await response.json();

        if (response.ok) {
          break;
        }

        // Retry on rate limits, service overload, or internal errors
        const isRetriable = [429, 503, 500].includes(response.status) || 
                            (data?.error?.message && String(data.error.message).toLowerCase().includes('demand'));
                            
        if (!isRetriable || attempt === maxAttempts - 1) {
          break;
        }

        console.warn(`Gemini API returned status ${response.status}. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxAttempts})`);
      } catch (err) {
        if (attempt === maxAttempts - 1) throw err;
        console.warn(`Fetch error in Gemini request. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxAttempts})`);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
      delay *= 2; // Exponential backoff
    }

    if (!response || !response.ok) {
      console.error('Gemini API Error (study/generate):', data);
      return NextResponse.json(
        { error: data?.error?.message || 'Failed to call Gemini study generation API due to high demand.' },
        { status: response ? response.status : 503 }
      );
    }

    const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiResponseText) {
      throw new Error('Empty response content received from Gemini.');
    }

    // Try parsing to verify it is valid JSON
    const parsedData = JSON.parse(aiResponseText.trim());

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Study API Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'An error occurred during study hub material generation.' },
      { status: 500 }
    );
  }
}
