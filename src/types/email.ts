import type { EntityRef, LeakNode, SocialProfileNode } from './entities';

export interface EmailProfileRef extends EntityRef<SocialProfileNode> {
  label?: string | null;
  handle?: string | null;
  platform?: string | null;
  url?: string | null;
}

export interface EmailRecord {
  id?: string;
  organization_id?: string;
  email: {
    address: string;
    domain?: string | null;
    first_seen?: string | null;
  };
  leaks?: EmailLeak[] | null;
  profiles?: EmailProfileRef[] | null;
  confidence?: number | null;
  last_checked?: string | null;
}

export interface EmailEntity extends EmailRecord {
  id: string;
  organization_id: string;
  created_at?: string;
  updated_at?: string;
  edge?: EmailEdgeInfo;
}

export interface EmailEdgeInfo {
  id: string;
  transform_type?: string | null;
  confidence_score?: number | null;
  source_api?: string | null;
  source_url?: string | null;
  raw_reference_id?: string | null;
  metadata?: Record<string, unknown> | null;
  retrieved_at?: string | null;
}

export type EmailLeakKind = 'breach' | 'paste';

export interface EmailLeak {
  id?: string;
  leak: EntityRef<LeakNode>;
  kind: EmailLeakKind;
  title?: string | null;
  source?: string | null;
  content_snippet?: string | null;
  first_seen?: string | null;
  last_seen?: string | null;
  confidence?: number | null;
  url?: string | null;
  metadata?: Record<string, unknown> | null;
}

