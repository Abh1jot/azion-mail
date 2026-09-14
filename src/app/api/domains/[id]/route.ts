import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const domain = await prisma.domain.findUnique({
      where: { id },
      include: {
        mailboxes: {
          orderBy: { address: 'asc' },
          select: {
            id: true,
            address: true,
            name: true,
            quotaBytes: true,
            usedBytes: true,
            isActive: true,
            isSuspended: true,
            createdAt: true,
          },
        },
        aliases: {
          orderBy: { source: 'asc' },
        },
        forwarders: {
          orderBy: { sourceAddress: 'asc' },
        },
      },
    });

    if (!domain) return NextResponse.json({ error: 'Domain not found' }, { status: 404 });

    if (user.role !== Role.SUPERADMIN && user.role !== Role.ADMIN && domain.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Convert BigInts for JSON serialization
    const serializedDomain = {
      ...domain,
      mailboxes: domain.mailboxes.map((m) => ({
        ...m,
        quotaBytes: m.quotaBytes.toString(),
        usedBytes: m.usedBytes.toString(),
      })),
    };

    return NextResponse.json({ domain: serializedDomain });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to get domain' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const domain = await prisma.domain.findUnique({ where: { id } });
    if (!domain) return NextResponse.json({ error: 'Domain not found' }, { status: 404 });

    if (user.role !== Role.SUPERADMIN && user.role !== Role.ADMIN && domain.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await prisma.domain.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DOMAIN_DELETED',
        targetType: 'Domain',
        targetId: id,
        details: JSON.stringify({ domain: domain.domain }),
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'Domain deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete domain' }, { status: 500 });
  }
}
