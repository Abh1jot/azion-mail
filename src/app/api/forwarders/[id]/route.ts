import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const forwarder = await prisma.forwarder.findUnique({
      where: { id },
      include: { domain: true },
    });

    if (!forwarder) return NextResponse.json({ error: 'Forwarder not found' }, { status: 404 });

    if (user.role !== Role.SUPERADMIN && user.role !== Role.ADMIN && forwarder.domain.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await prisma.forwarder.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'FORWARDER_DELETED',
        targetType: 'Forwarder',
        targetId: id,
        details: JSON.stringify({ source: forwarder.sourceAddress }),
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'Forwarder deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete forwarder' }, { status: 500 });
  }
}
