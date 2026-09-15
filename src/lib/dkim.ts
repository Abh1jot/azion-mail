import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface DkimKeyPair {
  privateKeyPem: string;
  publicKeyPem: string;
  dnsTxtRecord: string;
  selector: string;
}

/**
 * Saves a domain's DKIM private key to /var/lib/rspamd/dkim for Rspamd signing
 */
export function saveDkimKeyToFile(domain: string, selector: string, privateKeyPem: string): boolean {
  try {
    const dkimDir = '/var/lib/rspamd/dkim';
    if (!fs.existsSync(dkimDir)) {
      fs.mkdirSync(dkimDir, { recursive: true, mode: 0o755 });
    }
    const cleanDomain = domain.toLowerCase().trim();
    const keyPath = path.join(dkimDir, `${cleanDomain}.${selector}.key`);
    fs.writeFileSync(keyPath, privateKeyPem, { mode: 0o644 });
    return true;
  } catch (err) {
    // In local dev without mounted rspamd volume, fail gracefully
    console.warn(`[DKIM] Note: Could not write DKIM key file for ${domain}:`, (err as any)?.message);
    return false;
  }
}


/**
 * Generates an RSA 2048-bit DKIM Keypair and formatted DNS TXT value.
 */
export function generateDkimKeyPair(selector: string = 'mail'): DkimKeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  // Extract base64 public key bytes without PEM headers
  const pubClean = publicKey
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/[\r\n\s]/g, '');

  const dnsTxtRecord = `v=DKIM1; k=rsa; p=${pubClean}`;

  return {
    privateKeyPem: privateKey,
    publicKeyPem: publicKey,
    dnsTxtRecord,
    selector,
  };
}

/**
 * Returns formatted DNS records needed for a domain (MX, SPF, DKIM, DMARC)
 */
export function getDomainRecommendedDns(
  domain: string,
  mailHost: string,
  dkimPublicKey: string,
  selector: string = 'mail',
  vpsIp?: string
) {
  // Extract base64 part of public key
  const pubClean = dkimPublicKey
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/[\r\n\s]/g, '');

  const spfValue = vpsIp
    ? `v=spf1 ip4:${vpsIp} mx a:${mailHost} ~all`
    : `v=spf1 mx a:${mailHost} ~all`;

  return [
    {
      type: 'MX',
      name: domain,
      value: mailHost,
      priority: 10,
      description: 'Routes incoming mail to Azion Mail VPS',
    },
    {
      type: 'TXT',
      name: domain,
      value: spfValue,
      description: 'Authorizes Azion Mail server to send on behalf of this domain',
    },
    {
      type: 'TXT',
      name: `${selector}._domainkey.${domain}`,
      value: `v=DKIM1; k=rsa; p=${pubClean}`,
      description: 'Cryptographic signature verification for outgoing messages',
    },
    {
      type: 'TXT',
      name: `_dmarc.${domain}`,
      value: `v=DMARC1; p=none; sp=none; rua=mailto:dmarc-reports@${domain}`,
      description: 'DMARC alignment policy (p=none prevents initial Gmail spam quarantine while reputation establishes)',
    },
    {
      type: 'CNAME',
      name: `mail.${domain}`,
      value: mailHost,
      description: 'Webmail and client access hostname',
    },
    {
      type: 'CNAME',
      name: `autoconfig.${domain}`,
      value: mailHost,
      description: 'Thunderbird & Outlook automatic mail client configuration',
    },
  ];
}
