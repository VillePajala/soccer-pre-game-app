import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.error('SENDGRID_API_KEY not set');
      return NextResponse.json({ error: 'Missing SendGrid API key' }, { status: 500 });
    }
    sgMail.setApiKey(apiKey);

    const { email, filename, content } = await req.json();
    if (!email || !content || !filename) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    await sgMail.send({
      to: email,
      from: process.env.SENDGRID_FROM || email,
      subject: 'Soccer App Backup',
      text: 'Backup file attached.',
      attachments: [
        {
          content,
          filename,
          type: 'application/json',
          disposition: 'attachment',
        },
      ],
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Send backup failed', err);
    return NextResponse.json({ error: 'Failed to send backup' }, { status: 500 });
  }
}
