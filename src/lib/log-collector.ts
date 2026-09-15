import { exec } from 'child_process';
import { promisify } from 'util';
import { prisma } from './prisma';

const execAsync = promisify(exec);

export interface ParsedMailEvent {
  timestamp?: string;
  queueId?: string;
  sender?: string;
  recipient?: string;
  status: 'SENT' | 'BOUNCED' | 'DEFERRED' | 'REJECTED' | 'QUEUED';
  response?: string;
  relay?: string;
  delay?: string;
}

/**
 * Synchronizes Postfix container logs and updates DeliveryLog records in PostgreSQL
 */
export async function syncPostfixDeliveryLogs(): Promise<{
  syncedCount: number;
  errorCount: number;
  recentLogs: string[];
}> {
  try {
    // Fetch the last 200 log lines from the azion-postfix container
    const { stdout } = await execAsync('docker logs azion-postfix --tail 200 2>&1', { timeout: 6000 });
    const lines = stdout.split('\n').filter(Boolean);

    let syncedCount = 0;
    let errorCount = 0;

    // Regular expressions for Postfix delivery results
    // Example: postfix/smtp[123]: 4X9K...: to=<test@gmail.com>, relay=gmail-smtp-in.l.google.com[...]:25, ... status=bounced (host ... said: 550-5.1.1 ...)
    const deliveryRegex = /(?:postfix\/smtp(?:d)?|qmgr)\[\d+\]:\s+([0-9A-Za-z]+):\s+to=<([^>]+)>.*status=([a-z]+)\s+\((.+)\)/i;
    // Example: postfix/cleanup[123]: 4X9K...: message-id=<...>
    const messageIdRegex = /postfix\/cleanup\[\d+\]:\s+([0-9A-Za-z]+):\s+message-id=<([^>]+)>/i;

    const queueToMessageId = new Map<string, string>();

    // First pass: collect message-ids
    for (const line of lines) {
      const msgMatch = line.match(messageIdRegex);
      if (msgMatch) {
        queueToMessageId.set(msgMatch[1], msgMatch[2]);
      }
    }

    // Second pass: process delivery statuses
    for (const line of lines) {
      const match = line.match(deliveryRegex);
      if (!match) continue;

      const queueId = match[1];
      const recipient = match[2].toLowerCase().trim();
      const statusRaw = match[3].toLowerCase();
      const response = match[4].trim();

      let status: 'SENT' | 'BOUNCED' | 'DEFERRED' | 'REJECTED' = 'SENT';
      if (statusRaw === 'bounced') {
        status = 'BOUNCED';
        errorCount++;
      } else if (statusRaw === 'deferred') {
        status = 'DEFERRED';
        errorCount++;
      } else if (statusRaw === 'rejected') {
        status = 'REJECTED';
        errorCount++;
      }

      const messageId = queueToMessageId.get(queueId);

      // Find candidate delivery log record
      const existing = await prisma.deliveryLog.findFirst({
        where: {
          recipient,
          ...(messageId ? { messageId } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existing) {
        await prisma.deliveryLog.update({
          where: { id: existing.id },
          data: {
            status,
            queueId,
            response,
            errorMessage: status !== 'SENT' ? response : null,
          },
        });
        syncedCount++;
      } else if (status !== 'SENT') {
        // Record bounced/deferred events even if email body wasn't archived
        await prisma.deliveryLog.create({
          data: {
            queueId,
            messageId,
            sender: 'mailer-daemon@postfix',
            recipient,
            subject: 'Delivery Notification Event',
            status,
            response,
            errorMessage: response,
          },
        });
        syncedCount++;
      }
    }

    return {
      syncedCount,
      errorCount,
      recentLogs: lines.slice(-40).reverse(),
    };
  } catch (err: any) {
    // In local dev without docker or if container is starting up
    return {
      syncedCount: 0,
      errorCount: 0,
      recentLogs: [`[Log Collector Notice]: ${err?.message || 'Postfix container logs not accessible in local environment'}`],
    };
  }
}
