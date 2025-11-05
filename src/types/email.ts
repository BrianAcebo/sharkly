import type { EntityRef } from './entities';
import type { PasteLeakNode } from './entities';
import type { SocialProfileNode } from './entities';

export interface BreachRecord {
  name: string; // breach name or dataset
  first_seen?: string | null;
  last_seen?: string | null;
}

export interface EmailRecord {
  email: {
    address: string;
    domain?: string | null;
    first_seen?: string | null;
  };
  breach_hits?: BreachRecord[] | null;
  paste_mentions?: EntityRef<PasteLeakNode>[] | null;
  profiles?: EntityRef<SocialProfileNode>[] | null;
}


