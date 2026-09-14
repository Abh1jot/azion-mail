import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDomainRecommendedDns } from '@/lib/dkim';
import { checkDomainDns } from '@/lib/dns-checker';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const domain = await prisma.domain.findUnique({ where: { id } });
    if (!domain) return NextResponse.json({ error: 'Domain not found' }, { status: 404 });

    const mailHost = process.env.MAIL_HOST || 'mail.azioncloud.com';
    const recommendedRecords = getDomainRecommendedDns(
      domain.domain,
      mailHost,
      domain.dkimPublicKey,
      domain.dkimSelector
    );

    // Live public DNS verification
    const dnsHealth = await checkDomainDns(
      domain.domain,
      mailHost,
      domain.dkimPublicKey,
      domain.dkimSelector
    );

    return NextResponse.json({
      domain: domain.domain,
      mailHost,
      selector: domain.dkimSelector,
      recommendedRecords,
      dnsHealth,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to check DNS' }, { status: 500 });
  }
}
