/** Case management types (entity graph / CRM feature) */

export type CaseStatus = 'active' | 'closed' | 'pending' | 'archived' | 'in_progress';
export type CasePriority = 'low' | 'medium' | 'high' | 'critical';

export interface ListCasesParams {
  organizationId: string;
  page?: number;
  perPage?: number;
  from?: number;
  to?: number;
  sortBy?: 'alphabetical' | 'created_at' | 'priority';
  includeArchived?: boolean;
  archivedOnly?: boolean;
  status?: CaseStatus | 'all';
  priority?: CasePriority | 'all';
  search?: string;
}

export interface Evidence {
  id?: string;
  type?: string;
  url?: string;
  title?: string;
  snippet?: string;
  [key: string]: unknown;
}

export interface CaseSubjectPerson {
  id: string;
  type: 'person';
  name: string;
  email?: string | null;
  avatar?: string | null;
  location?: { city?: string; country?: string; ip?: string };
  devices?: Array<{ type: string; os: string; last_used: string }>;
  social_profiles?: Array<{ platform: string; username: string; url?: string }>;
}

export interface CaseSubjectCompany {
  id: string;
  type: 'company';
  name: string;
  avatar?: string | null;
}

export type CaseSubject = CaseSubjectPerson | CaseSubjectCompany;

export interface Case {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  status: CaseStatus;
  priority: CasePriority;
  tags?: string[];
  assigned_to?: unknown[];
  created_at: Date | string;
  updated_at: Date | string;
  graph_id?: string | null;
  archived_at?: string | Date | null;
  subject?: CaseSubject | null;
  subject_id?: string | null;
  subject_type?: 'person' | 'company';
  organization_id?: string | null;
}
