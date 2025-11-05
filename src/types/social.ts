import type { EntityRef } from './entities';
import type { EmailNode } from './entities';
import type { PhoneNode } from './entities';
import type { ImageNode } from './entities';

export interface UsernamePlatform {
  platform: string;
  url?: string | null;
  first_seen?: string | null;
}

export interface UsernameRecord {
  username: {
    value: string;
    platforms?: UsernamePlatform[] | null;
  };
  linked_emails?: EntityRef<EmailNode>[] | null;
  linked_profiles?: EntityRef<SocialProfileNode>[] | null;
}

export interface SocialProfileRecord {
  profile: {
    handle: string;
    platform: string;
    profile_url?: string | null;
    display_name?: string | null;
    bio?: string | null;
    posts?: { id?: string; url?: string; snippet?: string }[] | null;
    followers_count?: number | null;
    following_count?: number | null;
    join_date?: string | null;
    location?: string | null;
  };
  linked_emails?: EntityRef<EmailNode>[] | null;
  linked_phones?: EntityRef<PhoneNode>[] | null;
  images?: EntityRef<ImageNode>[] | null;
}


