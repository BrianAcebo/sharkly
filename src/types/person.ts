export interface WebMention {
  title: string | null;
  link: string | null;
  snippet?: string | null;
  displayLink?: string | null;
  favicon?: string | null;
  image?: string | null;
  source?: 'google_pse' | string;
  retrieved_at?: string; // ISO
}

export interface PersonRecord {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  avatar: string | null;
  location: { city?: string; country?: string; ip?: string } | null;
  devices: Array<{ type: string; os: string; lastUsed?: string; last_used?: string }>;
  social_profiles: Array<{ platform: string; username: string; url?: string }>;
  web_mentions?: WebMention[];
  aliases?: string[];
  tags: string[];
  confidence?: number | null;
  first_seen?: string | null;
  last_seen?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePersonInput {
  organization_id: string;
  name: string;
  email?: string | null;
  avatar?: string | null;
  location?: { city?: string; country?: string; ip?: string } | null;
  devices?: Array<{ type: string; os: string; lastUsed?: string; last_used?: string }>;
  social_profiles?: Array<{ platform: string; username: string; url?: string }>;
  web_mentions?: WebMention[];
  aliases?: string[];
  tags?: string[];
  confidence?: number | null;
  first_seen?: string | null;
  last_seen?: string | null;
}

export type UpdatePersonInput = Partial<Omit<CreatePersonInput, 'organization_id' | 'name'>> & {
  name?: string;
};


