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


