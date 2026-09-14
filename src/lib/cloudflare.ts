import { getDomainRecommendedDns } from './dkim';

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

interface CloudflareApiResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
  result: T;
}

export interface CloudflareZone {
  id: string;
  name: string;
  status: string;
  paused: boolean;
}

export interface CloudflareDnsRecord {
  id?: string;
  type: string;
  name: string;
  content: string;
  priority?: number;
  proxied?: boolean;
  ttl?: number;
  comment?: string;
}

export class CloudflareClient {
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken.trim();
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${CF_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = (await res.json()) as CloudflareApiResponse<T>;
    if (!data.success) {
      const errMsg = data.errors?.map((e) => e.message).join(', ') || 'Cloudflare API request failed';
      throw new Error(errMsg);
    }

    return data.result;
  }

  async verifyToken(): Promise<boolean> {
    try {
      const res = await this.request<{ id: string; status: string }>('/user/tokens/verify');
      return res.status === 'active';
    } catch {
      return false;
    }
  }

  async listZones(): Promise<CloudflareZone[]> {
    return this.request<CloudflareZone[]>('/zones?status=active&per_page=50');
  }

  async getZoneByName(domainName: string): Promise<CloudflareZone | null> {
    const zones = await this.request<CloudflareZone[]>(`/zones?name=${encodeURIComponent(domainName)}`);
    return zones.length > 0 ? zones[0] : null;
  }

  async listDnsRecords(zoneId: string): Promise<CloudflareDnsRecord[]> {
    return this.request<CloudflareDnsRecord[]>(`/zones/${zoneId}/dns_records?per_page=100`);
  }

  async createDnsRecord(zoneId: string, record: CloudflareDnsRecord): Promise<CloudflareDnsRecord> {
    return this.request<CloudflareDnsRecord>(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify(record),
    });
  }

  async updateDnsRecord(zoneId: string, recordId: string, record: CloudflareDnsRecord): Promise<CloudflareDnsRecord> {
    return this.request<CloudflareDnsRecord>(`/zones/${zoneId}/dns_records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(record),
    });
  }

  /**
   * Automatically provision and repair all required mail DNS records on Cloudflare
   */
  async syncMailDns(
    zoneId: string,
    domain: string,
    mailHost: string,
    dkimPublicKey: string,
    selector: string = 'mail'
  ): Promise<{
    created: string[];
    updated: string[];
    unchanged: string[];
    errors: string[];
  }> {
    const existing = await this.listDnsRecords(zoneId);
    const required = getDomainRecommendedDns(domain, mailHost, dkimPublicKey, selector);

    const created: string[] = [];
    const updated: string[] = [];
    const unchanged: string[] = [];
    const errors: string[] = [];

    for (const req of required) {
      try {
        // Find existing match by type and record name
        const match = existing.find(
          (r) =>
            r.type.toUpperCase() === req.type.toUpperCase() &&
            (r.name.toLowerCase() === req.name.toLowerCase() ||
             r.name.toLowerCase() === `${req.name.toLowerCase()}.${domain.toLowerCase()}`)
        );

        const payload: CloudflareDnsRecord = {
          type: req.type,
          name: req.name,
          content: req.value,
          ttl: 1, // Auto TTL
          proxied: false, // Mail records (MX, SPF, DKIM, mail CNAME) must NOT be proxied through Cloudflare CDN!
          comment: 'Managed by Azion Mail',
          ...(req.priority ? { priority: req.priority } : {}),
        };

        if (!match) {
          await this.createDnsRecord(zoneId, payload);
          created.push(`${req.type} ${req.name}`);
        } else if (
          match.content !== req.value ||
          (req.priority && match.priority !== req.priority) ||
          match.proxied === true
        ) {
          await this.updateDnsRecord(zoneId, match.id!, payload);
          updated.push(`${req.type} ${req.name}`);
        } else {
          unchanged.push(`${req.type} ${req.name}`);
        }
      } catch (err: any) {
        errors.push(`${req.type} ${req.name}: ${err.message || err}`);
      }
    }

    return { created, updated, unchanged, errors };
  }
}
