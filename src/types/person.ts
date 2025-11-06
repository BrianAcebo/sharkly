import type { EmailRecord, EmailEntity } from './email';
import type { PhoneRecord } from './phone';
import type { SocialProfileRecord } from './social';
import type { DeviceRecord } from './devices';
import type { WebMention } from './common';
import type { AddressRecord } from './address';

export interface PersonName {
  first: string;
  last: string;
  middle?: string | null;
  given?: string | null;
  family?: string | null;
  suffix?: string | null;
  prefix?: string | null;
}

export interface PersonLocation {
  city?: string | null;
  country?: string | null;
  ip?: string | null;
}

export type PersonGender = 'male' | 'female' | 'other' | null;

export interface PersonRecord {
  id: string;
  organization_id: string;
  name: PersonName;
  gender?: PersonGender;
  emails: EmailEntity[];
  phones: PhoneRecord[];
  date_of_birth?: Date | string;
  social_profiles: SocialProfileRecord[];
  avatar: string | null;
  location: PersonLocation | null;
  addresses?: AddressRecord[];
  devices: DeviceRecord[];
  web_mentions?: WebMention[];
  aliases?: string[];
  tags: string[];
  notes?: string | null;
  confidence?: number | null;
  first_seen?: string | null;
  last_seen?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePersonInput {
  organization_id: string;
  name: PersonName;
  emails?: EmailRecord[];
  phones?: PhoneRecord[];
  date_of_birth?: Date | string;
  gender?: PersonGender;
  social_profiles?: SocialProfileRecord[];
  avatar?: string | null;
  location?: PersonLocation | null;
  addresses?: AddressRecord[];
  devices?: DeviceRecord[];
  web_mentions?: WebMention[];
  aliases?: string[];
  tags?: string[];
  notes?: string | null;
  confidence?: number | null;
  first_seen?: string | null;
  last_seen?: string | null;
}

export type UpdatePersonInput = Partial<Omit<CreatePersonInput, 'organization_id'>>;


