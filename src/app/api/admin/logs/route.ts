import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user || (user.role !== Role.SUPERADMIN && user.role !== Role.ADMIN)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const status = searchParams.get('status') as any;

    const where: any = {};
    if (status) where.status = status;

    const logs = await prisma.deliveryLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });

    const auditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    return NextResponse.json({ logs, auditLogs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch logs' }, { status: 500 });
  }
}
