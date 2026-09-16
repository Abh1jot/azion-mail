import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/** GET  /api/auth/cloudflare/status — returns current Cloudflare connection state */
export async function GET(req: NextRequest) {
  const { user } = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const config = await prisma.cloudflareConfig.findUnique({ where: { userId: user.id } });

  if (!config) {
    return NextResponse.json({
      connected: false,
      authorizeUrl: '/api/auth/cloudflare/authorize',
    });
  }

  const isOAuth = config.authType === 'oauth';
  const tokenExpired = isOAuth && config.tokenExpiresAt
    ? config.tokenExpiresAt < new Date()
    : false;

  return NextResponse.json({
    connected: true,
    authType: config.authType,
    accountEmail: config.accountEmail,
    tokenExpired,
    lastSyncAt: config.lastSyncAt,
    // If token is expired and no refresh token, user must re-authorize
    needsReauth: tokenExpired && !config.refreshToken,
    authorizeUrl: '/api/auth/cloudflare/authorize',
  });
}

/** DELETE /api/auth/cloudflare/status — disconnect Cloudflare */
export async function DELETE(req: NextRequest) {
  const { user } = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.cloudflareConfig.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ success: true, message: 'Cloudflare disconnected.' });
}
