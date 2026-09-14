import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateDkimKeyPair, saveDkimKeyToFile } from '@/lib/dkim';
import { DomainStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  const { user } = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized: Invalid API key or token' }, { status: 401 });

  const domains = await prisma.domain.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      domain: true,
      status: true,
      isVerified: true,
      dkimSelector: true,
      createdAt: true,
      _count: {
        select: { mailboxes: true, aliases: true, forwarders: true },
      },
    },
  });

  return NextResponse.json({ data: domains });
}

export async function POST(req: NextRequest) {
  const { user } = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized: Invalid API key or token' }, { status: 401 });

  const { domain } = await req.json();
  if (!domain) return NextResponse.json({ error: 'domain is required' }, { status: 400 });

  const cleanDomain = domain.toLowerCase().trim();
  const existing = await prisma.domain.findUnique({ where: { domain: cleanDomain } });
  if (existing) return NextResponse.json({ error: 'Domain already exists' }, { status: 400 });

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
    },
  });

  return NextResponse.json({
    data: {
      id: newDomain.id,
      domain: newDomain.domain,
      status: newDomain.status,
      dkimSelector: newDomain.dkimSelector,
      createdAt: newDomain.createdAt,
    },
  }, { status: 201 });
}
