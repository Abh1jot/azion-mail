import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { Role } from '@prisma/client';
import { getRetentionDays, setRetentionDays, enforceRetentionPolicy } from '@/lib/log-collector';

/**
 * GET /api/admin/logs/retention
 * Returns the currently configured log retention period in days.
 */
export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const retentionDays = await getRetentionDays();
    return NextResponse.json({ retentionDays });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to get retention setting' }, { status: 500 });
  }
}

/**
 * POST /api/admin/logs/retention
 * Updates the log retention policy and immediately purges logs that exceed the new limit.
 * Body: { retentionDays: number }
 */
export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user || (user.role !== Role.SUPERADMIN && user.role !== Role.ADMIN)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const days = parseInt(body.retentionDays, 10);

    if (isNaN(days) || days < 0) {
      return NextResponse.json(
        { error: 'Invalid retentionDays value. Must be a non-negative integer (0 = unlimited).' },
        { status: 400 }
      );
    }

    // Save the new setting
    await setRetentionDays(days);

    // Immediately enforce the new policy (purge expired logs)
    const { purgedCount } = await enforceRetentionPolicy(days);

    return NextResponse.json({
      success: true,
      retentionDays: days,
      purgedCount,
      message:
        days === 0
          ? 'Retention policy set to unlimited — logs will be kept indefinitely.'
          : `Retention policy set to ${days} days. ${purgedCount} expired log(s) purged.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update retention setting' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/logs/retention
 * Immediately purges all logs older than the currently configured retention period.
 * Does nothing if retention is set to unlimited (0).
 */
export async function DELETE(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user || (user.role !== Role.SUPERADMIN && user.role !== Role.ADMIN)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const retentionDays = await getRetentionDays();

    if (retentionDays === 0) {
      return NextResponse.json({
        success: true,
        purgedCount: 0,
        message: 'Retention is set to unlimited — no logs were purged.',
      });
    }

    const { purgedCount } = await enforceRetentionPolicy(retentionDays);

    return NextResponse.json({
      success: true,
      retentionDays,
      purgedCount,
      message: `Manually purged ${purgedCount} log(s) older than ${retentionDays} days.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to purge logs' }, { status: 500 });
  }
}
