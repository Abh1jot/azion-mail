import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, hashPassword, formatDovecotHash } from '@/lib/auth';
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

    const mailboxes = await prisma.mailbox.findMany({
      where,
      orderBy: { address: 'asc' },
      include: {
        domain: {
          select: {
            id: true,
            domain: true,
          },
        },
      },
    });

    const serialized = mailboxes.map((m) => ({
      id: m.id,
      address: m.address,
      name: m.name,
      domainId: m.domainId,
      domainName: m.domain.domain,
      quotaBytes: m.quotaBytes.toString(),
      usedBytes: m.usedBytes.toString(),
      isActive: m.isActive,
      isSuspended: m.isSuspended,
      createdAt: m.createdAt,
    }));

    return NextResponse.json({ mailboxes: serialized });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list mailboxes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { domainId, username, password, name, quotaMb = 5120 } = await req.json();

    if (!domainId || !username || !password) {
      return NextResponse.json({ error: 'Domain, username, and password are required' }, { status: 400 });
    }

    const domain = await prisma.domain.findUnique({ where: { id: domainId } });
    if (!domain) return NextResponse.json({ error: 'Domain not found' }, { status: 404 });

    if (user.role !== Role.SUPERADMIN && user.role !== Role.ADMIN && domain.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied to this domain' }, { status: 403 });
    }

    const cleanUsername = username.toLowerCase().trim().replace(/@.*$/, '');
    const fullAddress = `${cleanUsername}@${domain.domain}`;

    const existing = await prisma.mailbox.findUnique({ where: { address: fullAddress } });
    if (existing) {
      return NextResponse.json({ error: `Mailbox ${fullAddress} already exists` }, { status: 400 });
    }

    // Dovecot & Postfix format password hash
    const rawHash = await hashPassword(password);
    const dovecotHash = formatDovecotHash(rawHash);
    const quotaBytes = BigInt(quotaMb) * BigInt(1024 * 1024);

    const mailbox = await prisma.mailbox.create({
      data: {
        domainId,
        address: fullAddress,
        name: name?.trim() || null,
        passwordHash: dovecotHash,
        quotaBytes,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'MAILBOX_CREATED',
        targetType: 'Mailbox',
        targetId: mailbox.id,
        details: JSON.stringify({ address: fullAddress, quotaMb }),
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      mailbox: {
        id: mailbox.id,
        address: mailbox.address,
        name: mailbox.name,
        quotaBytes: mailbox.quotaBytes.toString(),
        isActive: mailbox.isActive,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create mailbox' }, { status: 500 });
  }
}
