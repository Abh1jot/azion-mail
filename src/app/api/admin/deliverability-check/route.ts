import { NextRequest, NextResponse } from 'next/server';
import dns from 'dns/promises';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mailHost = process.env.MAIL_HOST || 'mail.azioncloud.com';

    // 1. Resolve forward IP of MAIL_HOST
    let hostIps: string[] = [];
    try {
      const addresses = await dns.resolve4(mailHost);
      hostIps = addresses;
    } catch {
      // Fallback
    }

    const primaryIp = hostIps[0] || '127.0.0.1';

    // 2. Perform Reverse DNS (PTR) Check
    let ptrHostname: string | null = null;
    let ptrValid = false;
    let ptrError: string | null = null;

    if (primaryIp && primaryIp !== '127.0.0.1') {
      try {
        const ptrs = await dns.reverse(primaryIp);
        if (ptrs && ptrs.length > 0) {
          ptrHostname = ptrs[0];
          // Check if PTR matches MAIL_HOST or base domain
          if (
            ptrHostname.toLowerCase() === mailHost.toLowerCase() ||
            ptrHostname.toLowerCase().endsWith(mailHost.toLowerCase())
          ) {
            ptrValid = true;
          }
        }
      } catch (err: any) {
        ptrError = err.message || 'No PTR record found';
      }
    }

    // 3. Inspect registered domains
    const domains = await prisma.domain.findMany({
      where: user.role === 'SUPERADMIN' || user.role === 'ADMIN' ? {} : { userId: user.id },
      select: {
        id: true,
        domain: true,
        dkimSelector: true,
      },
      take: 10,
    });

    const domainAudits = await Promise.all(
      domains.map(async (d) => {
        let spfOk = false;
        let dkimOk = false;
        let dmarcOk = false;
        let spfValue: string | null = null;

        // Check SPF
        try {
          const txts = await dns.resolveTxt(d.domain);
          const spf = txts.map((t) => t.join('')).find((t) => t.startsWith('v=spf1'));
          if (spf) {
            spfValue = spf;
            spfOk = true;
          }
        } catch {}

        // Check DKIM
        try {
          const dkimRecord = `${d.dkimSelector}._domainkey.${d.domain}`;
          const dkimTxt = await dns.resolveTxt(dkimRecord);
          if (dkimTxt && dkimTxt.length > 0) {
            dkimOk = true;
          }
        } catch {}

        // Check DMARC
        try {
          const dmarcRecord = `_dmarc.${d.domain}`;
          const dmarcTxt = await dns.resolveTxt(dmarcRecord);
          if (dmarcTxt && dmarcTxt.length > 0) {
            dmarcOk = true;
          }
        } catch {}

        return {
          domain: d.domain,
          spfOk,
          dkimOk,
          dmarcOk,
          spfValue,
        };
      })
    );

    // Calculate score
    let score = 0;
    if (ptrValid) score += 35;
    else if (ptrHostname) score += 15;

    const allSpf = domainAudits.length > 0 && domainAudits.every((d) => d.spfOk);
    const allDkim = domainAudits.length > 0 && domainAudits.every((d) => d.dkimOk);
    const allDmarc = domainAudits.length > 0 && domainAudits.every((d) => d.dmarcOk);

    if (allSpf) score += 25;
    if (allDkim) score += 25;
    if (allDmarc) score += 15;

    const recommendations: string[] = [];

    if (!ptrValid) {
      recommendations.push(
        `Set Reverse DNS (PTR): The IP ${primaryIp} resolves to "${ptrHostname || 'nothing'}". Log in to your VPS control panel (Hetzner, Contabo, DigitalOcean, OVH) and set the PTR/Reverse DNS of IP ${primaryIp} to "${mailHost}". Google requires this to avoid spam classification.`
      );
    }

    if (!allDkim) {
      recommendations.push(
        'DKIM record missing on one or more domains: Ensure the "mail._domainkey" TXT record is published in your DNS (or use 1-Click Cloudflare Sync).'
      );
    }

    if (!allSpf) {
      recommendations.push(
        `SPF record missing: Add "v=spf1 ip4:${primaryIp} mx a:${mailHost} ~all" as a TXT record on your domain.`
      );
    }

    return NextResponse.json({
      score: Math.min(100, Math.max(10, score)),
      mailHost,
      serverIp: primaryIp,
      ptr: {
        valid: ptrValid,
        hostname: ptrHostname,
        expected: mailHost,
        error: ptrError,
      },
      domains: domainAudits,
      recommendations,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to check deliverability' }, { status: 500 });
  }
}
