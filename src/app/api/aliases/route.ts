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

    const aliases = await prisma.alias.findMany({
      where,
      orderBy: { source: 'asc' },
      include: {
        domain: {
          select: { id: true, domain: true },
        },
      },
    });

    return NextResponse.json({ aliases });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list aliases' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { domainId, sourcePrefix, destination } = await req.json();

    if (!domainId || !sourcePrefix || !destination) {
      return NextResponse.json({ error: 'Domain, source prefix, and destination are required' }, { status: 400 });
    }

    const domain = await prisma.domain.findUnique({ where: { id: domainId } });
    if (!domain) return NextResponse.json({ error: 'Domain not found' }, { status: 404 });

    if (user.role !== Role.SUPERADMIN && user.role !== Role.ADMIN && domain.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const cleanSource = `${sourcePrefix.toLowerCase().trim().replace(/@.*$/, '')}@${domain.domain}`;
    const cleanDestination = destination.toLowerCase().trim();

    const existing = await prisma.alias.findUnique({ where: { source: cleanSource } });
    if (existing) {
      return NextResponse.json({ error: `Alias for ${cleanSource} already exists` }, { status: 400 });
    }

    const alias = await prisma.alias.create({
      data: {
        domainId,
        source: cleanSource,
        destination: cleanDestination,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ALIAS_CREATED',
        targetType: 'Alias',
        targetId: alias.id,
        details: JSON.stringify({ source: cleanSource, destination: cleanDestination }),
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, alias });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create alias' }, { status: 500 });
  }
}
