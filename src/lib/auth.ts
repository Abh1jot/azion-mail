import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from './prisma';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'azion-mail-super-secure-jwt-secret-2026-replace-in-prod';
const JWT_EXPIRES_IN = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Strip any Dovecot password scheme prefix if present (e.g. {BLF-CRYPT} or {CRYPT})
  const cleanHash = hash.replace(/^\{[A-Z0-9-]+\}/i, '');
  return bcrypt.compare(password, cleanHash);
}

/**
 * Format hash for Dovecot passdb sql
 */
export function formatDovecotHash(hash: string): string {
  const clean = hash.replace(/^\{[A-Z0-9-]+\}/i, '');
  return `{BLF-CRYPT}${clean}`;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getAuthUser(req: NextRequest): Promise<{
  user: {
    id: string;
    email: string;
    name: string | null;
    role: Role;
  } | null;
  authType: 'session' | 'api_key' | null;
}> {
  // 1. Check API Key header
  const apiKeyHeader = req.headers.get('x-api-key');
  if (apiKeyHeader) {
    const keyHash = crypto.createHash('sha256').update(apiKeyHeader).digest('hex');
    const key = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: true },
    });

    if (key && (!key.expiresAt || key.expiresAt > new Date())) {
      // Update lastUsedAt asynchronously
      prisma.apiKey.update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() },
      }).catch(() => {});

      return {
        user: {
          id: key.user.id,
          email: key.user.email,
          name: key.user.name,
          role: key.user.role,
        },
        authType: 'api_key',
      };
    }
  }

  // 2. Check Bearer token or Cookie
  let token: string | null = null;
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    token = req.cookies.get('azion_token')?.value || null;
  }

  if (!token) {
    return { user: null, authType: null };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return { user: null, authType: null };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    return { user: null, authType: null };
  }

  return { user, authType: 'session' };
}

export function generateApiKey(): { key: string; keyHash: string; keyPrefix: string } {
  const rawKey = `az_${crypto.randomBytes(24).toString('hex')}`;
  const keyPrefix = rawKey.substring(0, 7);
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  return { key: rawKey, keyHash, keyPrefix };
}
