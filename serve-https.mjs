import 'dotenv/config';
import sgMail from '@sendgrid/mail';

const sendgridApiKey = process.env.SENDGRID_API_KEY || '';
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
}

export async function sendAssignmentEmail({ email, title, date, time, quote }) {
  if (!sendgridApiKey) {
    throw new Error('SENDGRID_API_KEY is missing.');
  }

  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'hello@yourdomain.com';
  const msg = {
    to: email,
    from: { email: fromEmail, name: 'Daymark' },
    subject: `Daymark reminder: ${title}`,
    text: `Assignment: ${title}\nDue: ${date} at ${time}\nMotivational quote: ${quote}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937;">
        <h2 style="margin-bottom: 12px;">Daymark reminder</h2>
        <p><strong>Assignment:</strong> ${title}</p>
        <p><strong>Due date:</strong> ${date}</p>
        <p><strong>Time:</strong> ${time}</p>
        <p style="margin-top: 18px; color: #3b82f6;"><strong>Motivational quote:</strong> “${quote}”</p>
      </div>
    `
  };

  const response = await sgMail.send(msg);
  return response;
}
