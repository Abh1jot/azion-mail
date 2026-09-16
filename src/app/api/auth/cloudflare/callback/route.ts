import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import crypto from 'crypto';

const CF_TOKEN_URL = 'https://dash.cloudflare.com/oauth2/token';
const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDesc = searchParams.get('error_description');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.MAIL_HOST}`;

  // Handle user-denied or Cloudflare error
  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/domains?cf_error=${encodeURIComponent(errorDesc || error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/dashboard/domains?cf_error=missing_params`);
  }

  // Validate state signature (CSRF protection)
  try {
    const decoded = Buffer.from(state, 'base64url').toString();
    const parts = decoded.split(':');
    if (parts.length !== 3) throw new Error('invalid state');
    const [userId, ts, sig] = parts;

    // Reject stale states (> 10 minutes)
    if (Date.now() - parseInt(ts) > 10 * 60 * 1000) {
      return NextResponse.redirect(`${baseUrl}/dashboard/domains?cf_error=state_expired`);
    }

    const expectedSig = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'azion-state-secret')
      .update(`${userId}:${ts}`)
      .digest('hex')
      .substring(0, 16);

    if (sig !== expectedSig) {
      return NextResponse.redirect(`${baseUrl}/dashboard/domains?cf_error=invalid_state`);
    }

    // Verify user still exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.redirect(`${baseUrl}/dashboard/domains?cf_error=user_not_found`);
    }

    const clientId = process.env.CLOUDFLARE_CLIENT_ID!;
    const clientSecret = process.env.CLOUDFLARE_CLIENT_SECRET!;
    const redirectUri = `${baseUrl}/api/auth/cloudflare/callback`;

    // Exchange authorization code for access token
    const tokenRes = await fetch(CF_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error('[CF OAuth] Token exchange failed:', body);
      return NextResponse.redirect(`${baseUrl}/dashboard/domains?cf_error=token_exchange_failed`);
    }

    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;
    const refreshToken: string | undefined = tokenData.refresh_token;
    const expiresIn: number = tokenData.expires_in || 3600;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // Fetch Cloudflare account info for display
    let accountId: string | undefined;
    let accountEmail: string | undefined;
    try {
      const accountRes = await fetch(`${CF_API_BASE}/accounts?per_page=1`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const accountData = await accountRes.json();
      if (accountData.success && accountData.result?.length > 0) {
        accountId = accountData.result[0].id;
      }
      // Get user email
      const userRes = await fetch(`${CF_API_BASE}/user`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userData = await userRes.json();
      if (userData.success) accountEmail = userData.result?.email;
    } catch { /* non-critical */ }

    // Save OAuth token to database
    await prisma.cloudflareConfig.upsert({
      where: { userId: user.id },
      update: {
        authType: 'oauth',
        accessToken,
        refreshToken: refreshToken || null,
        tokenExpiresAt,
        accountId: accountId || null,
        accountEmail: accountEmail || null,
        lastSyncAt: new Date(),
        // Clear old API key when switching to OAuth
        apiToken: null,
      },
      create: {
        userId: user.id,
        authType: 'oauth',
        accessToken,
        refreshToken: refreshToken || null,
        tokenExpiresAt,
        accountId: accountId || null,
        accountEmail: accountEmail || null,
      },
    });

    // Redirect back to domains page with success
    return NextResponse.redirect(
      `${baseUrl}/dashboard/domains?cf_connected=1&cf_email=${encodeURIComponent(accountEmail || '')}`
    );
  } catch (err: any) {
    console.error('[CF OAuth Callback Error]', err);
    return NextResponse.redirect(`${baseUrl}/dashboard/domains?cf_error=internal_error`);
  }
}
