import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import crypto from 'crypto';

// Cloudflare OAuth 2.0 endpoints
const CF_AUTH_URL = 'https://dash.cloudflare.com/oauth2/auth';

export async function GET(req: NextRequest) {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = process.env.CLOUDFLARE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'CLOUDFLARE_CLIENT_ID is not configured in .env. See setup instructions.' },
      { status: 503 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.MAIL_HOST}`;
  const redirectUri = `${baseUrl}/api/auth/cloudflare/callback`;

  // CSRF / replay protection: encode user ID + timestamp in state, signed with JWT_SECRET
  const statePayload = `${user.id}:${Date.now()}`;
  const sig = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'azion-state-secret')
    .update(statePayload)
    .digest('hex')
    .substring(0, 16);
  const state = Buffer.from(`${statePayload}:${sig}`).toString('base64url');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'account:read zone:read dns_records:edit',
    state,
  });

  return NextResponse.redirect(`${CF_AUTH_URL}?${params.toString()}`);
}
