export interface IPGeo {
  country?: string | null;
  region?: string | null;
  city?: string | null;
}

export interface IPReputation {
  abuse_ipdb?: Record<string, unknown> | null;
  greynoise?: Record<string, unknown> | null;
}

export interface IPRecord {
  id?: string;
  organization_id?: string;
  title?: string | null;
  description?: string | null;
  ip: {
    address: string;
  };
  asn?: string | null;
  organization?: string | null;
  geo?: IPGeo | null;
  open_ports?: number[] | null;
  services?: Array<Record<string, unknown>> | null;
  reputation?: IPReputation | null;
  first_seen?: string | null;
  last_seen?: string | null;
}

export interface IPEntity extends IPRecord {
  id: string;
  organization_id: string;
  created_at?: string;
  updated_at?: string;
}

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


