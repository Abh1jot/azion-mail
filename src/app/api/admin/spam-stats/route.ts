import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user || (user.role !== Role.SUPERADMIN && user.role !== Role.ADMIN)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const rspamdUrl = process.env.RSPAMD_URL || 'http://127.0.0.1:11334';
    try {
      const res = await fetch(`${rspamdUrl}/stat`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ success: true, stats: data });
      }
    } catch {
      // Fallback if Rspamd is offline or starting up
    }

    return NextResponse.json({
      success: true,
      stats: {
        scanned: 0,
        clean: 0,
        spam: 0,
        learned_ham: 0,
        learned_spam: 0,
        uptime: 0,
      },
      offline: true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch spam stats' }, { status: 500 });
  }
}
