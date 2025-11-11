import type { PersonRecord } from './person';
import type { AddressRecord } from './address';

export interface BusinessRecord {
  id: string;
  organization_id: string;
  name: string;
  ein_tax_id: string | null;
  avatar: string | null;
  officers: PersonRecord[];
  addresses: AddressRecord[];
  registration: Record<string, unknown> | null;
  domains: unknown[];
  created_at: string;
  updated_at: string;
}

export interface CreateBusinessInput {
  organization_id: string;
  name: string;
  ein_tax_id?: string | null;
  avatar?: string | null;
  officers?: unknown[];
  addresses?: unknown[];
  registration?: Record<string, unknown> | null;
  domains?: unknown[];
}

export type UpdateBusinessInput = Partial<Omit<CreateBusinessInput, 'organization_id' | 'name'>> & {
  name?: string;
};


