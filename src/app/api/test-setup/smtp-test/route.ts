import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { testSmtpConnection } from '@/lib/smtp-tester';

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const defaultHost = process.env.MAIL_HOST || '127.0.0.1';

    const result = await testSmtpConnection({
      host: body.host || defaultHost,
      port: parseInt(body.port || '587', 10),
      secure: body.secure ?? body.port === 465,
      username: body.username,
      password: body.password,
      sendProbeTo: body.sendProbeTo,
      fromAddress: body.fromAddress || body.username,
    });

    return NextResponse.json({ success: result.success, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'SMTP test failed' }, { status: 500 });
  }
}
