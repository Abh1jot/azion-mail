import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, hashPassword, formatDovecotHash } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { password, quotaMb, name, isSuspended, isActive } = await req.json();
    const updateData: any = {};

    if (name !== undefined) updateData.name = name?.trim() || null;
    if (isSuspended !== undefined) updateData.isSuspended = Boolean(isSuspended);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    if (quotaMb !== undefined) {
      updateData.quotaBytes = BigInt(quotaMb) * BigInt(1024 * 1024);
    }

    if (password) {
      const rawHash = await hashPassword(password);
      updateData.passwordHash = formatDovecotHash(rawHash);
    }

    const updated = await prisma.mailbox.update({
      where: { id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'MAILBOX_UPDATED',
        targetType: 'Mailbox',
        targetId: id,
        details: JSON.stringify({ address: mailbox.address, updates: Object.keys(updateData) }),
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      mailbox: {
        id: updated.id,
        address: updated.address,
        name: updated.name,
        quotaBytes: updated.quotaBytes.toString(),
        usedBytes: updated.usedBytes.toString(),
        isActive: updated.isActive,
        isSuspended: updated.isSuspended,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update mailbox' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    await prisma.mailbox.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'MAILBOX_DELETED',
        targetType: 'Mailbox',
        targetId: id,
        details: JSON.stringify({ address: mailbox.address }),
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'Mailbox deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete mailbox' }, { status: 500 });
  }
}
