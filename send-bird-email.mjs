import 'dotenv/config';

const apiKey = process.env.RESEND_API_KEY || 're_xxxxxxxxx';
if (apiKey === 're_xxxxxxxxx') {
  throw new Error('Set RESEND_API_KEY in your .env before sending email.');
}

const payload = {
  from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
  to: [process.env.RESEND_TO_EMAIL || 'hudson.grabow@gmail.com'],
  subject: process.env.RESEND_SUBJECT || 'Hello World',
  html: process.env.RESEND_HTML || '<p>Congrats on sending your <strong>first email</strong>!</p>'
};

const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
});

const data = await response.json();

if (!response.ok) {
  console.error('Resend email failed:', data);
  throw new Error(data?.message || `Resend request failed: ${response.status}`);
}

console.log('Email sent:', data.id, data.status || 'queued');
