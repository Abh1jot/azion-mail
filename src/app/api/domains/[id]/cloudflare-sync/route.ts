import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CloudflareClient, getCloudflareToken } from '@/lib/cloudflare';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const domain = await prisma.domain.findUnique({ where: { id } });
    if (!domain) return NextResponse.json({ error: 'Domain not found' }, { status: 404 });

    // Resolve token: OAuth access_token (auto-refreshed) or legacy API key
    // Also accept a one-time apiToken in body for backwards compat
    const body = await req.json().catch(() => ({}));
    let token: string;

    if (body.apiToken) {
      // One-time token passed directly (legacy flow)
      token = body.apiToken;
      // Save as legacy api_key for future use
      await prisma.cloudflareConfig.upsert({
        where: { userId: user.id },
        update: { apiToken: body.apiToken, authType: 'api_key', lastSyncAt: new Date() },
        create: { userId: user.id, apiToken: body.apiToken, authType: 'api_key' },
      });
    } else {
      // OAuth path: resolve from stored config (auto-refreshes if needed)
      try {
        token = await getCloudflareToken(user.id);
      } catch {
        return NextResponse.json({
          error: 'Cloudflare not connected. Please click "Connect Cloudflare" to authorize.',
          requiresOAuth: true,
          oauthUrl: '/api/auth/cloudflare/authorize',
        }, { status: 401 });
      }
    }

    const cf = new CloudflareClient(token);

    // Find the correct zone
    let zoneId = body.zoneId || domain.cloudflareZoneId;
    if (!zoneId) {
      const zone = await cf.getZoneByName(domain.domain);
      if (!zone) {
        return NextResponse.json({
          error: `Zone '${domain.domain}' not found in your Cloudflare account. Make sure the domain is added to Cloudflare and the OAuth app has Zone.DNS permissions.`,
        }, { status: 404 });
      }
      zoneId = zone.id;
    }

    const mailHost = process.env.MAIL_HOST || 'mail.azioncloud.com';

    // Sync / repair all required DNS records
    const syncResult = await cf.syncMailDns(
      zoneId,
      domain.domain,
      mailHost,
      domain.dkimPublicKey,
      domain.dkimSelector
    );

    // Persist zone ID and mark domain verified
    await prisma.domain.update({
      where: { id: domain.id },
      data: { cloudflareZoneId: zoneId, isVerified: true },
    });

    // Update last sync timestamp
    await prisma.cloudflareConfig.updateMany({
      where: { userId: user.id },
      data: { lastSyncAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CLOUDFLARE_DNS_SYNC',
        targetType: 'Domain',
        targetId: domain.id,
        details: JSON.stringify(syncResult),
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, zoneId, syncResult });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to sync with Cloudflare' }, { status: 500 });
  }
}
