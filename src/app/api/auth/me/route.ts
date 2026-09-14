import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user with cloudflare configuration and resource counts
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
        cloudflareConfig: {
          select: {
            autoSync: true,
            lastSyncAt: true,
          },
        },
        _count: {
          select: {
            domains: true,
          },
        },
      },
    });

    const mailboxCount = await prisma.mailbox.count({
      where: {
        domain: {
          userId: user.id,
        },
      },
    });

    return NextResponse.json({
      user: {
        ...fullUser,
        mailboxCount,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
