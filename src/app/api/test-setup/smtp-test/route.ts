import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { testSmtpConnection } from '@/lib/smtp-tester';

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const mailHost = process.env.MAIL_HOST || '127.0.0.1';
    const postfixInternal = process.env.POSTFIX_HOST || 'postfix';
    const requestedHost = body.host || mailHost;
    const port = parseInt(body.port || '587', 10);

    // Hairpin NAT fix: The web container cannot reach its own public hostname
    // from inside Docker (VPS providers block loopback via public IP).
    // Route to internal 'postfix' Docker container when testing own mail host.
    const connectHost =
      requestedHost === mailHost ||
      requestedHost === 'localhost' ||
      requestedHost === '127.0.0.1'
        ? postfixInternal
        : requestedHost;

    const result = await testSmtpConnection({
      host: connectHost,
      port,
      secure: body.secure ?? port === 465,
      username: body.username,
      password: body.password,
      sendProbeTo: body.sendProbeTo,
      fromAddress: body.fromAddress || body.username,
    });

    return NextResponse.json({
      success: result.success,
      result,
      meta: {
        testedHost: requestedHost,
        internalHost: connectHost !== requestedHost ? connectHost : undefined,
        note:
          connectHost !== requestedHost
            ? `Connected via internal Docker host (${connectHost}) — hairpin NAT bypass`
            : undefined,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'SMTP test failed' }, { status: 500 });
  }
}