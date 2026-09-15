import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { syncPostfixDeliveryLogs } from '@/lib/log-collector';

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const status = searchParams.get('status') as any;
    const query = searchParams.get('query')?.trim();
    const mailbox = searchParams.get('mailbox')?.trim();

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (query) {
      where.OR = [
        { sender: { contains: query, mode: 'insensitive' } },
        { recipient: { contains: query, mode: 'insensitive' } },
        { subject: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (mailbox) {
      where.sender = { equals: mailbox.toLowerCase() };
    }

    // Non-admin users only see logs for their own domains/mailboxes
    if (user.role !== Role.SUPERADMIN && user.role !== Role.ADMIN) {
      const userDomains = await prisma.domain.findMany({
        where: { userId: user.id },
        select: { id: true },
      });
      where.domainId = { in: userDomains.map((d) => d.id) };
    }

    const [logs, totalCount, bouncedCount, deferredCount, auditLogs] = await Promise.all([
      prisma.deliveryLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100),
      }),
      prisma.deliveryLog.count({ where }),
      prisma.deliveryLog.count({ where: { status: 'BOUNCED' } }),
      prisma.deliveryLog.count({ where: { status: 'DEFERRED' } }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
          user: { select: { email: true, name: true } },
        },
      }),
    ]);

    const sentCount = await prisma.deliveryLog.count({ where: { status: 'SENT' } });
    const successRate =
      totalCount > 0
        ? Math.round((sentCount / Math.max(totalCount, 1)) * 100)
        : 100;

    return NextResponse.json({
      logs,
      totalCount,
      stats: {
        sent: sentCount,
        bounced: bouncedCount,
        deferred: deferredCount,
        successRate,
      },
      auditLogs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch logs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user || (user.role !== Role.SUPERADMIN && user.role !== Role.ADMIN)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Trigger sync of Postfix container logs
    const syncResult = await syncPostfixDeliveryLogs();

    return NextResponse.json({
      success: true,
      message: `Synced ${syncResult.syncedCount} mail events (${syncResult.errorCount} delivery errors detected).`,
      rawLogs: syncResult.recentLogs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to sync logs' }, { status: 500 });
  }
}
