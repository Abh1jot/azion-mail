import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const mailbox = await prisma.mailbox.findUnique({
      where: { id },
      include: { domain: true },
    });

    if (!mailbox) return NextResponse.json({ error: 'Mailbox not found' }, { status: 404 });

    if (user.role !== Role.SUPERADMIN && user.role !== Role.ADMIN && mailbox.domain.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const webmailBase = process.env.WEBMAIL_URL || '/webmail';
    // Construct pre-filled webmail login destination
    const webmailUrl = `${webmailBase.replace(/\/$/, '')}/?_user=${encodeURIComponent(mailbox.address)}`;

    return NextResponse.json({
      success: true,
      webmailUrl,
      address: mailbox.address,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to generate webmail link' }, { status: 500 });
  }
}
