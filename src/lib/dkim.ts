import crypto from 'crypto';

export interface DkimKeyPair {
  privateKeyPem: string;
  publicKeyPem: string;
  dnsTxtRecord: string;
  selector: string;
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
export function getDomainRecommendedDns(domain: string, mailHost: string, dkimPublicKey: string, selector: string = 'mail') {
  // Extract base64 part of public key
  const pubClean = dkimPublicKey
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/[\r\n\s]/g, '');

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
      value: `v=spf1 mx a:${mailHost} ~all`,
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
      value: `v=DMARC1; p=quarantine; sp=quarantine; rua=mailto:dmarc-reports@${domain}`,
      description: 'DMARC alignment policy and feedback delivery',
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
