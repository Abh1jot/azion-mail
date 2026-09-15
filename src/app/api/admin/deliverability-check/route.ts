import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns/promises';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
const CACHE_KEY = 'deliverability:check:v1';
const CACHE_TTL = 600; // 10 minutes — DNS is expensive, cache hard

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const forceRefresh = req.nextUrl.searchParams.get('refresh') === '1';

    if (!forceRefresh) {
      try {
        const cached = await redis.get(CACHE_KEY);
        if (cached) return NextResponse.json({ ...JSON.parse(cached), cached: true });
      } catch {}
    }

    const mailHost = process.env.MAIL_HOST || 'mail.azioncloud.com';
    let hostIps: string[] = [];
    try { hostIps = await dns.resolve4(mailHost); } catch {}
    const primaryIp = hostIps[0] || '127.0.0.1';

    let ptrHostname: string | null = null;
    let ptrValid = false;
    let ptrError: string | null = null;

    if (primaryIp && primaryIp !== '127.0.0.1') {
      try {
        const ptrs = await dns.reverse(primaryIp);
        if (ptrs?.length > 0) {
          ptrHostname = ptrs[0];
          ptrValid = ptrHostname.toLowerCase() === mailHost.toLowerCase() ||
            ptrHostname.toLowerCase().endsWith(mailHost.toLowerCase());
        }
      } catch (err: any) { ptrError = err.message; }
    }

    const domains = await prisma.domain.findMany({
      where: user.role === 'SUPERADMIN' || user.role === 'ADMIN' ? {} : { userId: user.id },
      select: { id: true, domain: true, dkimSelector: true },
      take: 10,
    });

    const domainAudits = await Promise.all(domains.map(async (d) => {
      let spfOk = false, dkimOk = false, dmarcOk = false, spfValue: string | null = null;
      try {
        const txts = await dns.resolveTxt(d.domain);
        const spf = txts.map(t => t.join('')).find(t => t.startsWith('v=spf1'));
        if (spf) { spfValue = spf; spfOk = true; }
      } catch {}
      try {
        const dkimTxt = await dns.resolveTxt(${d.dkimSelector}._domainkey.);
        if (dkimTxt?.length > 0) dkimOk = true;
      } catch {}
      try {
        const dmarcTxt = await dns.resolveTxt(_dmarc.);
        if (dmarcTxt?.length > 0) dmarcOk = true;
      } catch {}
      return { domain: d.domain, spfOk, dkimOk, dmarcOk, spfValue };
    }));

    let score = ptrValid ? 35 : ptrHostname ? 15 : 0;
    const allSpf = domainAudits.length > 0 && domainAudits.every(d => d.spfOk);
    const allDkim = domainAudits.length > 0 && domainAudits.every(d => d.dkimOk);
    const allDmarc = domainAudits.length > 0 && domainAudits.every(d => d.dmarcOk);
    if (allSpf) score += 25;
    if (allDkim) score += 25;
    if (allDmarc) score += 15;

    const recommendations: string[] = [];
    if (!ptrValid) recommendations.push(Set PTR/rDNS for IP  to  in your VPS control panel. Gmail requires this.);
    if (!allDkim) recommendations.push('DKIM record missing — publish mail._domainkey TXT record or use 1-Click Cloudflare Sync.');
    if (!allSpf) recommendations.push(SPF missing — add: v=spf1 ip4: mx a: ~all);

    const result = {
      score: Math.min(100, Math.max(10, score)),
      mailHost, serverIp: primaryIp,
      ptr: { valid: ptrValid, hostname: ptrHostname, expected: mailHost, error: ptrError },
      domains: domainAudits,
      recommendations,
      cachedAt: new Date().toISOString(),
    };

    try { await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(result)); } catch {}

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}