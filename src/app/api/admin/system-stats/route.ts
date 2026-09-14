import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { Role } from '@prisma/client';
import os from 'os';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user || (user.role !== Role.SUPERADMIN && user.role !== Role.ADMIN)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // OS Metrics
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercentage = Math.round((usedMem / totalMem) * 100);

    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    const uptimeSeconds = os.uptime();

    // Counts from Database
    const totalUsers = await prisma.user.count();
    const totalDomains = await prisma.domain.count();
    const totalMailboxes = await prisma.mailbox.count();
    const totalAliases = await prisma.alias.count();
    const totalForwarders = await prisma.forwarder.count();

    // Delivery stats (last 24 hours)
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sent24h = await prisma.deliveryLog.count({
      where: { status: 'SENT', createdAt: { gte: since24h } },
    });
    const deferred24h = await prisma.deliveryLog.count({
      where: { status: 'DEFERRED', createdAt: { gte: since24h } },
    });
    const bounced24h = await prisma.deliveryLog.count({
      where: { status: 'BOUNCED', createdAt: { gte: since24h } },
    });

    return NextResponse.json({
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        cpuCores: cpus.length,
        cpuModel: cpus[0]?.model || 'Generic VPS vCPU',
        loadAverage: loadAvg,
        memory: {
          totalMb: Math.round(totalMem / (1024 * 1024)),
          usedMb: Math.round(usedMem / (1024 * 1024)),
          freeMb: Math.round(freeMem / (1024 * 1024)),
          percentage: memPercentage,
        },
        uptimeSeconds,
      },
      counts: {
        users: totalUsers,
        domains: totalDomains,
        mailboxes: totalMailboxes,
        aliases: totalAliases,
        forwarders: totalForwarders,
      },
      delivery24h: {
        sent: sent24h,
        deferred: deferred24h,
        bounced: bounced24h,
        successRate: sent24h + bounced24h > 0 ? Math.round((sent24h / (sent24h + bounced24h)) * 100) : 100,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to get system stats' }, { status: 500 });
  }
}
