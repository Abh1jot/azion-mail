import dns from 'dns/promises';

export interface DnsCheckItem {
  type: string;
  name: string;
  status: 'valid' | 'warning' | 'invalid' | 'missing';
  currentValue?: string | string[];
  expectedValue: string;
  message: string;
}

export interface DomainDnsHealth {
  domain: string;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  records: {
    mx: DnsCheckItem;
    spf: DnsCheckItem;
    dkim: DnsCheckItem;
    dmarc: DnsCheckItem;
  };
}

export async function checkDomainDns(
  domain: string,
  expectedMailHost: string,
  expectedDkimPublic: string,
  selector: string = 'mail'
): Promise<DomainDnsHealth> {
  const resolver = new dns.Resolver();
  resolver.setServers(['1.1.1.1', '8.8.8.8']); // Use reliable public DNS

  // 1. Check MX
  let mxItem: DnsCheckItem = {
    type: 'MX',
    name: domain,
    status: 'missing',
    expectedValue: `10 ${expectedMailHost}`,
    message: 'No MX records found',
  };

  try {
    const mxRecords = await resolver.resolveMx(domain);
    if (mxRecords && mxRecords.length > 0) {
      mxItem.currentValue = mxRecords.map((r) => `${r.priority} ${r.exchange}`);
      const hasHost = mxRecords.some(
        (r) => r.exchange.toLowerCase() === expectedMailHost.toLowerCase()
      );
      if (hasHost) {
        mxItem.status = 'valid';
        mxItem.message = `MX properly points to ${expectedMailHost}`;
      } else {
        mxItem.status = 'warning';
        mxItem.message = `MX exists (${mxRecords[0].exchange}) but does not point to ${expectedMailHost}`;
      }
    }
  } catch (err: any) {
    mxItem.message = err.code === 'ENODATA' || err.code === 'ENOTFOUND' ? 'No MX records found' : err.message;
  }

  // 2. Check SPF
  let spfItem: DnsCheckItem = {
    type: 'TXT',
    name: domain,
    status: 'missing',
    expectedValue: `v=spf1 mx a:${expectedMailHost} ~all`,
    message: 'No SPF TXT record found',
  };

  try {
    const txtRecords = await resolver.resolveTxt(domain);
    const flattened = txtRecords.map((chunks) => chunks.join(''));
    const spfRecord = flattened.find((txt) => txt.toLowerCase().startsWith('v=spf1'));

    if (spfRecord) {
      spfItem.currentValue = spfRecord;
      if (spfRecord.includes(expectedMailHost) || spfRecord.includes('mx')) {
        spfItem.status = 'valid';
        spfItem.message = 'Valid SPF record detected';
      } else {
        spfItem.status = 'warning';
        spfItem.message = 'SPF record exists but may not authorize this mailserver';
      }
    }
  } catch (err: any) {
    spfItem.message = err.code === 'ENODATA' || err.code === 'ENOTFOUND' ? 'No SPF record found' : err.message;
  }

  // 3. Check DKIM
  const dkimName = `${selector}._domainkey.${domain}`;
  let dkimItem: DnsCheckItem = {
    type: 'TXT',
    name: dkimName,
    status: 'missing',
    expectedValue: `v=DKIM1; k=rsa; p=...`,
    message: `DKIM record not found at ${dkimName}`,
  };

  try {
    const dkimRecords = await resolver.resolveTxt(dkimName);
    const dkimTxt = dkimRecords.map((chunks) => chunks.join('')).join('');
    if (dkimTxt) {
      dkimItem.currentValue = dkimTxt;
      if (dkimTxt.includes('v=DKIM1') && dkimTxt.includes('p=')) {
        dkimItem.status = 'valid';
        dkimItem.message = 'Valid DKIM public key record found';
      } else {
        dkimItem.status = 'warning';
        dkimItem.message = 'DKIM TXT record format may be malformed';
      }
    }
  } catch (err: any) {
    dkimItem.message = err.code === 'ENODATA' || err.code === 'ENOTFOUND' ? 'No DKIM record found' : err.message;
  }

  // 4. Check DMARC
  const dmarcName = `_dmarc.${domain}`;
  let dmarcItem: DnsCheckItem = {
    type: 'TXT',
    name: dmarcName,
    status: 'missing',
    expectedValue: `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${domain}`,
    message: `DMARC record not found at ${dmarcName}`,
  };

  try {
    const dmarcRecords = await resolver.resolveTxt(dmarcName);
    const dmarcTxt = dmarcRecords.map((chunks) => chunks.join('')).join('');
    if (dmarcTxt && dmarcTxt.toLowerCase().startsWith('v=dmarc1')) {
      dmarcItem.currentValue = dmarcTxt;
      dmarcItem.status = 'valid';
      dmarcItem.message = 'Valid DMARC policy found';
    }
  } catch (err: any) {
    dmarcItem.message = err.code === 'ENODATA' || err.code === 'ENOTFOUND' ? 'No DMARC record found' : err.message;
  }

  // Calculate overall status
  const statuses = [mxItem.status, spfItem.status, dkimItem.status, dmarcItem.status];
  let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if (statuses.includes('missing') || statuses.includes('invalid')) {
    overallStatus = statuses.filter((s) => s === 'missing' || s === 'invalid').length > 1 ? 'critical' : 'degraded';
  } else if (statuses.includes('warning')) {
    overallStatus = 'degraded';
  }

  return {
    domain,
    overallStatus,
    records: {
      mx: mxItem,
      spf: spfItem,
      dkim: dkimItem,
      dmarc: dmarcItem,
    },
  };
}
