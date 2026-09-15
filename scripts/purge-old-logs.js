#!/usr/bin/env node
/**
 * Azion Mail - Automated Log Retention & Purge Worker
 * Deletes delivery logs and sent emails older than configured retention days (default: 7 days).
 *
 * Usage:
 *   node scripts/purge-old-logs.js
 *   docker compose exec -T web node scripts/purge-old-logs.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runRetentionPurge() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'log_retention_days' },
    });

    const days = setting ? parseInt(setting.value, 10) : 7;

    if (days <= 0) {
      console.log('ℹ️ Log retention is set to 0 (unlimited/keep indefinitely). No records deleted.');
      return;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const result = await prisma.deliveryLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoff,
        },
      },
    });

    console.log(
      `✅ Log Retention Clean: Successfully purged ${result.count} email logs older than ${days} days (Cutoff: ${cutoff.toISOString()}).`
    );
  } catch (err) {
    console.error('❌ Failed to run retention purge:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runRetentionPurge();
