export interface IPRecord {
  ip: {
    address: string;
    asn?: string | null;
    organization?: string | null;
    geo?: { country?: string; region?: string; city?: string } | null;
    open_ports?: number[] | null;
    services?: Array<{ port: number; name?: string; banner?: string }>;
    reputation?: { provider: string; score?: number; label?: string }[] | null;
    first_seen?: string | null;
    last_seen?: string | null;
  };
}


