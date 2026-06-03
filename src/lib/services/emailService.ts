export async function sendInvitationEmail(to: string, data: {
  inviterName: string;
  projectName: string;
  role: string;
  message?: string;
  inviteLink: string;
}) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY is not configured. Email to", to, "will not be sent.");
      return false;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      background-color: #09090b;
      color: #fafafa;
      font-family: 'Inter', -apple-system, sans-serif;
      margin: 0;
      padding: 40px 20px;
    }
    .email-container {
      max-width: 480px;
      margin: 0 auto;
      background-color: #121217;
      border: 1px solid #27272a;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
      text-align: center;
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.05em;
      background: linear-gradient(to right, #6366f1, #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      margin-top: 0;
      margin-bottom: 16px;
      line-height: 1.4;
    }
    .personal-message {
      background-color: #18181b;
      border-left: 3px solid #6366f1;
      border-radius: 6px;
      padding: 14px 16px;
      text-align: left;
      font-size: 13px;
      color: #d4d4d8;
      margin: 20px 0;
      line-height: 1.5;
      font-style: italic;
    }
    .role-desc {
      font-size: 13px;
      color: #a1a1aa;
      margin-bottom: 28px;
    }
    .cta-button {
      display: inline-block;
      background-color: #6366f1;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
      padding: 12px 28px;
      border-radius: 8px;
      margin-bottom: 20px;
      transition: background-color 0.2s;
    }
    .cta-button:hover {
      background-color: #4f46e5;
    }
    .expires {
      font-size: 11px;
      color: #71717a;
      margin-top: 0;
    }
    .footer {
      margin-top: 32px;
      border-top: 1px solid #27272a;
      padding-top: 20px;
      font-size: 11px;
      color: #71717a;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="logo">NEXUS AI</div>
    
    <div class="content">
      <h1>${data.inviterName} invited you to join ${data.projectName}</h1>
      
      ${data.message ? `<p class="personal-message">"${data.message}"</p>` : ''}
      
      <p class="role-desc">You've been invited to collaborate as a <strong>${data.role}</strong></p>
      
      <a href="${data.inviteLink}" class="cta-button" target="_blank">
        Accept Invitation
      </a>
      
      <p class="expires">This invitation expires in 7 days</p>
    </div>
    
    <div class="footer">
      <p>If you weren't expecting this invitation, you can ignore this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    console.log(`Sending invitation email to ${to} using Resend...`);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Nexus AI <onboarding@resend.dev>',
        to: [to],
        subject: `${data.inviterName} invited you to join ${data.projectName}`,
        html
      })
    });

    if (response.ok) {
      const resData = await response.json();
      console.log('Resend email sent successfully:', resData);
      return true;
    } else {
      const errorText = await response.text();
      console.error('Resend API returned error:', errorText);
      return false;
    }
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return false;
  }
}
