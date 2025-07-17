import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
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
