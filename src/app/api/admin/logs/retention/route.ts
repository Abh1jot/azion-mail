import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { Role } from '@prisma/client';
import { getRetentionDays, setRetentionDays, enforceRetentionPolicy } from '@/lib/log-collector';

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const retentionDays = await getRetentionDays();
    return NextResponse.json({ retentionDays });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to get retention setting' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user || (user.role !== Role.SUPERADMIN && user.role !== Role.ADMIN)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const days = parseInt(body.retentionDays, 10);
    if (isNaN(days) || days < 0) {
      return NextResponse.json({ error: 'Invalid retention days value' }, { status: 400 });
    }

    const savedDays = await setRetentionDays(days);
    const { purgedCount } = await enforceRetentionPolicy(savedDays);

    return NextResponse.json({
      success: true,
      retentionDays: savedDays,
      purgedCount,
      message:
        savedDays === 0
          ? 'Retention policy updated: Keep all logs indefinitely.'
          : `Retention policy updated to ${savedDays} days. Purged ${purgedCount} expired email logs.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update retention policy' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user || (user.role !== Role.SUPERADMIN && user.role !== Role.ADMIN)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { purgedCount, retentionDays } = await enforceRetentionPolicy();

    return NextResponse.json({
      success: true,
      purgedCount,
      retentionDays,
      message: `Manually purged ${purgedCount} logs older than ${retentionDays} days.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to purge logs' }, { status: 500 });
  }
}
