import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getMailQueue, flushMailQueue, purgeDeferredQueue } from '@/lib/mail-queue';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user || (user.role !== Role.SUPERADMIN && user.role !== Role.ADMIN)) {
      return NextResponse.json({ error: 'Access denied: Administrator privileges required' }, { status: 403 });
    }

    const queueStatus = await getMailQueue();
    return NextResponse.json({ success: true, queue: queueStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to inspect mail queue' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user || (user.role !== Role.SUPERADMIN && user.role !== Role.ADMIN)) {
      return NextResponse.json({ error: 'Access denied: Administrator privileges required' }, { status: 403 });
    }

    const { action } = await req.json();
    if (action === 'flush') {
      const res = await flushMailQueue();
      return NextResponse.json(res);
    } else if (action === 'purge_deferred') {
      const res = await purgeDeferredQueue();
      return NextResponse.json(res);
    } else {
      return NextResponse.json({ error: 'Invalid action. Expected "flush" or "purge_deferred"' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to execute queue command' }, { status: 500 });
  }
}
