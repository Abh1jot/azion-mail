import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('X-Internal-Secret');
    const expectedSecret = process.env.INTERNAL_ARCHIVE_SECRET || 'azion-internal-archive-secret';
    // Secret verification for internal Postfix pipe
    if (authHeader !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized internal call' }, { status: 401 });
    }

    const body = await req.json();
    const {
      messageId,
      sender = '',
      recipient = '',
      subject = '',
      bodyText = '',
      bodyHtml = '',
      sizeBytes = 0,
    } = body;

    const cleanSender = sender.toLowerCase().trim();
    const cleanRecipient = recipient.toLowerCase().trim();

    // Try to correlate with a registered Domain and Mailbox
    let domainId: string | undefined = undefined;
    let mailboxId: string | undefined = undefined;

    const senderDomain = cleanSender.split('@')[1];
    if (senderDomain) {
      const domain = await prisma.domain.findUnique({
        where: { domain: senderDomain },
        select: { id: true },
      });
      if (domain) {
        domainId = domain.id;
      }
    }

    if (cleanSender) {
      const mailbox = await prisma.mailbox.findUnique({
        where: { address: cleanSender },
        select: { id: true, domainId: true },
      });
      if (mailbox) {
        mailboxId = mailbox.id;
        if (!domainId) domainId = mailbox.domainId;
      }
    }

    // Create delivery log record with full message content
    const deliveryLog = await prisma.deliveryLog.create({
      data: {
        messageId: messageId || undefined,
        sender: cleanSender || 'unknown@local',
        recipient: cleanRecipient || 'unknown@remote',
        subject: subject || '(No Subject)',
        bodyText: bodyText || '',
        bodyHtml: bodyHtml || '',
        sizeBytes: Number(sizeBytes) || 0,
        status: 'SENT',
        response: 'Accepted by Postfix SMTP submission for delivery',
        domainId,
        mailboxId,
        clientIp: '127.0.0.1',
      },
    });

    return NextResponse.json({ success: true, id: deliveryLog.id });
  } catch (err: any) {
    console.error('[Archive-Mail API Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to archive mail' }, { status: 500 });
  }
}
