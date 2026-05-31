import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields (to, subject, body)' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'api_key_missing', message: 'Resend API key is not configured.' }, { status: 200 });
    }

    // Call Resend REST API
    console.log(`Attempting to send email to ${to} via Resend...`);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Nexus AI <onboarding@resend.dev>',
        to: [to],
        subject: subject,
        html: body.replace(/\n/g, '<br />')
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Resend email sent successfully:', data);
      return NextResponse.json({ success: true, method: 'resend', data });
    } else {
      const errorText = await response.text();
      console.error('Resend API returned error:', errorText);
      return NextResponse.json({ error: 'resend_error', message: errorText }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Send Email Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send email.' },
      { status: 500 }
    );
  }
}
