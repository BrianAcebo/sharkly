export interface DomainRecord {
  id?: string;
  organization_id?: string;
  domain: {
    name: string;
  };
  whois?: {
    registrant?: string | null;
    emails?: string[] | null;
  } | null;
  creation_date?: string | null;
  expiry_date?: string | null;
  dns_records?: {
    A?: string[] | null;
    MX?: string[] | null;
    TXT?: string[] | null;
    SPF?: string[] | null;
    DMARC?: string[] | null;
  } | null;
  subdomains?: string[] | null;
  hosting_provider?: string | null;
  techstack?: string[] | null;
}

export interface DomainEntity extends DomainRecord {
  id: string;
  organization_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface DNSRecord {
  name: string;
  type: 'A' | 'AAAA' | 'MX' | 'TXT' | 'CNAME' | 'NS' | 'SOA' | 'SRV' | 'CAA' | 'PTR' | string;
  value: string;
}

export interface DomainRecord {
  domain: {
    name: string;
    whois?: Record<string, unknown> | null;
    creation_date?: string | null;
    expiry_date?: string | null;
    dns_records?: DNSRecord[] | null;
    subdomains?: string[] | null;
    hosting_provider?: string | null;
    techstack?: string[] | null;
  };
}


