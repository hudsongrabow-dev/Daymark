import sgMail from '@sendgrid/mail';

const motivationalQuotes = [
  'Small steps still move you forward.',
  'You do not need to do everything today—just the next right thing.',
  'Progress is built by showing up, even when the task is boring.',
  'Your future self will thank you for the effort you make now.',
  'Keep your promises to yourself, even in small ways.'
];

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      email,
      title,
      date,
      time,
      quote,
      sendAt
    } = body;

    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;

    if (!apiKey) {
      return Response.json({ error: 'SENDGRID_API_KEY is missing.' }, { status: 500 });
    }

    if (!fromEmail) {
      return Response.json({ error: 'SENDGRID_FROM_EMAIL is missing.' }, { status: 500 });
    }

    if (!email || !title || !date || !time) {
      return Response.json({ error: 'Email, title, date, and time are required.' }, { status: 400 });
    }

    sgMail.setApiKey(apiKey);

    const dueDate = new Date(`${date}T${time}:00`);
    const fallbackQuote = motivationalQuotes[new Date(date).getTime() % motivationalQuotes.length] || motivationalQuotes[0];
    const messageQuote = quote || fallbackQuote;
    const scheduledAt = Number(sendAt) || Math.floor(dueDate.getTime() / 1000);

    if (scheduledAt <= Math.floor(Date.now() / 1000)) {
      return Response.json({ error: 'Reminder time must be in the future.' }, { status: 400 });
    }

    const msg = {
      to: email,
      from: {
        email: fromEmail,
        name: 'Daymark'
      },
      subject: `Daymark reminder: ${title}`,
      text: `Assignment: ${title}\nDue: ${date} at ${time}\nMotivational quote: ${messageQuote}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937;">
          <h2 style="margin-bottom: 12px;">Daymark reminder</h2>
          <p><strong>Assignment:</strong> ${title}</p>
          <p><strong>Due date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
          <p style="margin-top: 18px; color: #3b82f6;"><strong>Motivational quote:</strong> “${messageQuote}”</p>
        </div>
      `,
      send_at: scheduledAt
    };

    const result = await sgMail.send(msg);

    return Response.json({
      ok: true,
      status: result?.[0]?.statusCode || 202,
      sendAt: scheduledAt,
      messageId: result?.[0]?.headers?.['x-message-id'] || null
    });
  } catch (error) {
    return Response.json({
      error: error?.response?.body?.errors?.[0]?.message || error.message || 'Unknown email error.'
    }, { status: 500 });
  }
}
