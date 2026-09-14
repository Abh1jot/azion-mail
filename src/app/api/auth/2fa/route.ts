import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';

// GET: Generate new 2FA secret and QR Code
export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(user.email, 'Azion Mail', secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    return NextResponse.json({
      secret,
      qrCodeDataUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to generate 2FA' }, { status: 500 });
  }
}

// POST: Verify and enable 2FA
export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { secret, token } = await req.json();
    if (!secret || !token) {
      return NextResponse.json({ error: 'Secret and token are required' }, { status: 400 });
    }

    const isValid = authenticator.verify({ token, secret });
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid verification token' }, { status: 400 });
    }

    // Generate 8 backup codes
    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        backupCodes,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication enabled successfully',
      backupCodes,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to enable 2FA' }, { status: 500 });
  }
}

// DELETE: Disable 2FA
export async function DELETE(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { password } = await req.json();
    // Validate password before disabling
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: [],
      },
    });

    return NextResponse.json({ success: true, message: '2FA disabled successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to disable 2FA' }, { status: 500 });
  }
}
