export interface LeakRecord {
  id?: string;
  organization_id?: string;
  source: string;
  content_snippet?: string | null;
  found_emails?: string[];
  found_usernames?: string[];
  found_password_hashes?: string[];
  retrieved_at?: string | null;
  url?: string | null;
  metadata?: Record<string, unknown> | null;
  fingerprint?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LeakEntity extends LeakRecord {
  id: string;
  organization_id: string;
  found_emails: string[];
  found_usernames: string[];
  found_password_hashes: string[];
  metadata: Record<string, unknown> | null;
}

export interface LeakEdgeInfo {
  id: string;
  source_type: string;
  source_id: string;
  transform_type?: string | null;
  confidence_score?: number | null;
  source_api?: string | null;
  source_url?: string | null;
  raw_reference_id?: string | null;
  metadata?: Record<string, unknown> | null;
  retrieved_at?: string | null;
}

export interface LeakEmailLink {
  edge: LeakEdgeInfo;
  email: {
    id: string;
    address: string;
    domain: string | null;
    organization_id: string;
  };
}

export interface LeakDetail {
  leak: LeakEntity;
  emails: LeakEmailLink[];
}

export interface LeakSearchResult {
  id: string;
  source: string;
  content_snippet?: string | null;
  retrieved_at?: string | null;
  url?: string | null;
}

export interface UpdateLeakInput {
  source?: string;
  content_snippet?: string | null;
  found_emails?: string[];
  found_usernames?: string[];
  found_password_hashes?: string[];
  retrieved_at?: string | null;
  url?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CreateLeakInput {
  organization_id: string;
  source: string;
  content_snippet?: string | null;
  found_emails?: string[];
  found_usernames?: string[];
  found_password_hashes?: string[];
  retrieved_at?: string | null;
  url?: string | null;
  metadata?: Record<string, unknown> | null;
}
