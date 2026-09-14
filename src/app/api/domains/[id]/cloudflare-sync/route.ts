import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CloudflareClient } from '@/lib/cloudflare';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const domain = await prisma.domain.findUnique({ where: { id } });
    if (!domain) return NextResponse.json({ error: 'Domain not found' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    let apiToken = body.apiToken;

    // If no token provided in request, check saved Cloudflare config for user
    if (!apiToken) {
      const savedConfig = await prisma.cloudflareConfig.findUnique({
        where: { userId: user.id },
      });
      if (savedConfig) {
        apiToken = savedConfig.apiToken;
      }
    }

    if (!apiToken) {
      return NextResponse.json({
        error: 'Cloudflare API Token is required. Please provide your Cloudflare API token.',
      }, { status: 400 });
    }

    const cf = new CloudflareClient(apiToken);

    // 1. Locate zone
    let zoneId = body.zoneId || domain.cloudflareZoneId;
    if (!zoneId) {
      const zone = await cf.getZoneByName(domain.domain);
      if (!zone) {
        return NextResponse.json({
          error: `Zone '${domain.domain}' was not found in your Cloudflare account. Please make sure the domain is added to Cloudflare and the API token has Zone.DNS permissions.`,
        }, { status: 404 });
      }
      zoneId = zone.id;
    }

    const mailHost = process.env.MAIL_HOST || 'mail.azioncloud.com';

    // 2. Sync / repair all records
    const syncResult = await cf.syncMailDns(
      zoneId,
      domain.domain,
      mailHost,
      domain.dkimPublicKey,
      domain.dkimSelector
    );

    // 3. Update domain record with zoneId and save user Cloudflare config if requested
    await prisma.domain.update({
      where: { id: domain.id },
      data: {
        cloudflareZoneId: zoneId,
        isVerified: true,
      },
    });

    if (body.saveToken !== false) {
      await prisma.cloudflareConfig.upsert({
        where: { userId: user.id },
        update: {
          apiToken,
          lastSyncAt: new Date(),
        },
        create: {
          userId: user.id,
          apiToken,
          lastSyncAt: new Date(),
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CLOUDFLARE_DNS_SYNC',
        targetType: 'Domain',
        targetId: domain.id,
        details: JSON.stringify(syncResult),
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      zoneId,
      syncResult,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to sync with Cloudflare' }, { status: 500 });
  }
}
