import nodemailer from 'nodemailer';
import net from 'net';
import tls from 'tls';

export interface SmtpTestOptions {
  host: string;
  port: number;
  secure?: boolean;
  username?: string;
  password?: string;
  sendProbeTo?: string;
  fromAddress?: string;
}

export interface SmtpTestResult {
  success: boolean;
  durationMs: number;
  steps: Array<{
    step: string;
    success: boolean;
    message: string;
    durationMs: number;
  }>;
  banner?: string;
  error?: string;
}

export async function testSmtpConnection(options: SmtpTestOptions): Promise<SmtpTestResult> {
  const startTime = Date.now();
  const steps: SmtpTestResult['steps'] = [];
  let banner = '';

  const { host, port, secure = port === 465, username, password, sendProbeTo, fromAddress } = options;

  // Step 1: TCP Port & Banner Handshake
  const t0 = Date.now();
  try {
    banner = await new Promise<string>((resolve, reject) => {
      const TIMEOUT_MS = 12000;
      const isImplicitTls = secure || port === 465;

      const socket = isImplicitTls
        ? tls.connect({ host, port, rejectUnauthorized: false })
        : net.createConnection(port, host);

      const timer = setTimeout(() => {
        socket.destroy();
        reject(
          new Error(
            `TCP connection timed out after ${TIMEOUT_MS / 1000}s — port ${port} appears to be blocked by a firewall or ISP. ` +
              `On your VPS run: sudo ufw allow ${port}/tcp`
          )
        );
      }, TIMEOUT_MS);

      socket.once('data', (data) => {
        clearTimeout(timer);
        const response = data.toString().trim();
        socket.end();
        resolve(response);
      });

      socket.on('connect', () => {
        // For plain SMTP (port 25/587) the server sends the greeting automatically.
        // For SMTPS (port 465, implicit TLS) the greeting comes after TLS handshake.
        // We just wait — don't send anything, don't close the socket.
      });

      socket.on('error', (err: any) => {
        clearTimeout(timer);
        socket.destroy();
        let msg = err.message;
        if (err.code === 'ECONNREFUSED') {
          msg = `Connection refused on port ${port} — Postfix is not listening on this port, or the port is not exposed in docker-compose.`;
        } else if (err.code === 'ETIMEDOUT') {
          msg = `TCP timeout on port ${port} — blocked by firewall. On your VPS run: sudo ufw allow ${port}/tcp`;
        } else if (err.code === 'ENOTFOUND') {
          msg = `DNS resolution failed for "${host}" — verify your MAIL_HOST domain has an A record pointing to this server.`;
        }
        reject(new Error(msg));
      });
    });

    steps.push({
      step: 'TCP Connection & SMTP Banner',
      success: true,
      message: `Connected successfully. Banner: ${banner}`,
      durationMs: Date.now() - t0,
    });
  } catch (err: any) {
    steps.push({
      step: 'TCP Connection & SMTP Banner',
      success: false,
      message: err.message,
      durationMs: Date.now() - t0,
    });
    return {
      success: false,
      durationMs: Date.now() - startTime,
      steps,
      error: err.message,
    };
  }

  // Step 2: Nodemailer Transport Verification (TLS + Auth)
  const t1 = Date.now();
  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: username && password ? { user: username, pass: password } : undefined,
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production' && !host.includes('localhost'),
      },
      connectionTimeout: 20000,
      greetingTimeout: 12000,
      socketTimeout: 20000,
    });

    await transporter.verify();
    steps.push({
      step: 'TLS & Authentication Handshake',
      success: true,
      message: username ? `Authenticated successfully as ${username}` : 'TLS handshake verified (Anonymous)',
      durationMs: Date.now() - t1,
    });

    // Step 3 (Optional): Send Probe Email
    if (sendProbeTo && fromAddress) {
      const t2 = Date.now();
      await transporter.sendMail({
        from: `"Azion Mail Tester" <${fromAddress}>`,
        to: sendProbeTo,
        subject: `Azion Mail - SMTP Probe (${new Date().toLocaleTimeString()})`,
        text: `This is an automated test message from Azion Mail testing client connectivity.\nHost: ${host}\nPort: ${port}\nTimestamp: ${new Date().toISOString()}`,
      });
      steps.push({
        step: 'Test Email Delivery',
        success: true,
        message: `Probe message dispatched to ${sendProbeTo}`,
        durationMs: Date.now() - t2,
      });
    }

    return {
      success: true,
      durationMs: Date.now() - startTime,
      steps,
      banner,
    };
  } catch (err: any) {
    steps.push({
      step: 'TLS & Authentication Handshake',
      success: false,
      message: `SMTP verification failed: ${err.message}`,
      durationMs: Date.now() - t1,
    });
    return {
      success: false,
      durationMs: Date.now() - startTime,
      steps,
      banner,
      error: err.message,
    };
  }
}
