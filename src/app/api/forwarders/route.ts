import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const domainId = searchParams.get('domainId');

    const where: any = {};
    if (user.role !== Role.SUPERADMIN && user.role !== Role.ADMIN) {
      where.domain = { userId: user.id };
    }
    if (domainId) {
      where.domainId = domainId;
    }

    const forwarders = await prisma.forwarder.findMany({
      where,
      orderBy: { sourceAddress: 'asc' },
      include: {
        domain: {
          select: { id: true, domain: true },
        },
      },
    });

    return NextResponse.json({ forwarders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list forwarders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { domainId, sourcePrefix, destinations, isCatchAll = false, keepLocalCopy = false } = await req.json();

    if (!domainId || (!isCatchAll && !sourcePrefix) || !destinations || !Array.isArray(destinations) || destinations.length === 0) {
      return NextResponse.json({ error: 'Domain, source, and at least one destination are required' }, { status: 400 });
    }

    const domain = await prisma.domain.findUnique({ where: { id: domainId } });
    if (!domain) return NextResponse.json({ error: 'Domain not found' }, { status: 404 });

    if (user.role !== Role.SUPERADMIN && user.role !== Role.ADMIN && domain.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const cleanDestinations = destinations
      .map((d: string) => d.toLowerCase().trim())
      .filter((d: string) => d.includes('@'));

    if (cleanDestinations.length === 0) {
      return NextResponse.json({ error: 'Please enter valid recipient email addresses' }, { status: 400 });
    }

    const fullSource = isCatchAll ? `@${domain.domain}` : `${sourcePrefix.toLowerCase().trim().replace(/@.*$/, '')}@${domain.domain}`;

    const forwarder = await prisma.forwarder.create({
      data: {
        domainId,
        sourceAddress: fullSource,
        destinations: cleanDestinations,
        isCatchAll,
        keepLocalCopy,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'FORWARDER_CREATED',
        targetType: 'Forwarder',
        targetId: forwarder.id,
        details: JSON.stringify({ source: fullSource, destinations: cleanDestinations, isCatchAll }),
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, forwarder });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create forwarder' }, { status: 500 });
  }
}
