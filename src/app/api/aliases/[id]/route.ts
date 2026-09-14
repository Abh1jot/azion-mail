import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const alias = await prisma.alias.findUnique({
      where: { id },
      include: { domain: true },
    });

    if (!alias) return NextResponse.json({ error: 'Alias not found' }, { status: 404 });

    if (user.role !== Role.SUPERADMIN && user.role !== Role.ADMIN && alias.domain.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await prisma.alias.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ALIAS_DELETED',
        targetType: 'Alias',
        targetId: id,
        details: JSON.stringify({ source: alias.source }),
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'Alias deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete alias' }, { status: 500 });
  }
}
