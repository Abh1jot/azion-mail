import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateDkimKeyPair, saveDkimKeyToFile } from '@/lib/dkim';
import { DomainStatus, Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const where = user.role === Role.SUPERADMIN || user.role === Role.ADMIN ? {} : { userId: user.id };

    const domains = await prisma.domain.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            mailboxes: true,
            aliases: true,
            forwarders: true,
          },
        },
      },
    });

    return NextResponse.json({ domains });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list domains' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { domain, cloudflareZoneId } = await req.json();
    if (!domain) {
      return NextResponse.json({ error: 'Domain name is required' }, { status: 400 });
    }

    const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    // Check if domain is already registered
    const existing = await prisma.domain.findUnique({
      where: { domain: cleanDomain },
    });

    if (existing) {
      return NextResponse.json({ error: 'This domain is already configured on Azion Mail' }, { status: 400 });
    }

    // Auto-generate 2048-bit RSA DKIM Keypair for this domain
    const dkim = generateDkimKeyPair('mail');
    saveDkimKeyToFile(cleanDomain, dkim.selector, dkim.privateKeyPem);

    const newDomain = await prisma.domain.create({
      data: {
        domain: cleanDomain,
        userId: user.id,
        status: DomainStatus.ACTIVE,
        isVerified: true,
        dkimSelector: dkim.selector,
        dkimPrivateKey: dkim.privateKeyPem,
        dkimPublicKey: dkim.publicKeyPem,
        cloudflareZoneId: cloudflareZoneId || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DOMAIN_CREATED',
        targetType: 'Domain',
        targetId: newDomain.id,
        details: JSON.stringify({ domain: cleanDomain }),
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      domain: newDomain,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create domain' }, { status: 500 });
  }
}
