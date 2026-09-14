import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, hashPassword, formatDovecotHash } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { user } = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const mailboxes = await prisma.mailbox.findMany({
    where: { domain: { userId: user.id } },
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
  });

  const serialized = mailboxes.map((m) => ({
    ...m,
    quotaBytes: m.quotaBytes.toString(),
    usedBytes: m.usedBytes.toString(),
  }));

  return NextResponse.json({ data: serialized });
}

export async function POST(req: NextRequest) {
  const { user } = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { domainId, username, password, name, quotaMb = 5120 } = await req.json();
  if (!domainId || !username || !password) {
    return NextResponse.json({ error: 'domainId, username, and password are required' }, { status: 400 });
  }

  const domain = await prisma.domain.findFirst({ where: { id: domainId, userId: user.id } });
  if (!domain) return NextResponse.json({ error: 'Domain not found' }, { status: 404 });

  const cleanUser = username.toLowerCase().trim().replace(/@.*$/, '');
  const address = `${cleanUser}@${domain.domain}`;

  const rawHash = await hashPassword(password);
  const passwordHash = formatDovecotHash(rawHash);
  const quotaBytes = BigInt(quotaMb) * BigInt(1024 * 1024);

  const mailbox = await prisma.mailbox.create({
    data: {
      domainId: domain.id,
      address,
      name: name || null,
      passwordHash,
      quotaBytes,
    },
  });

  return NextResponse.json({
    data: {
      id: mailbox.id,
      address: mailbox.address,
      quotaBytes: mailbox.quotaBytes.toString(),
      isActive: mailbox.isActive,
      createdAt: mailbox.createdAt,
    },
  }, { status: 201 });
}
