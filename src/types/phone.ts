import type { EntityRef } from './entities';
import type { SocialProfileNode } from './entities';

export interface PhoneRecord {
  phone: {
    number_e164: string;
    country?: string | null;
    carrier?: string | null;
    line_type?: 'mobile' | 'landline' | 'voip' | 'unknown';
  };
  messaging_apps?: string[] | null; // WhatsApp/Telegram flags
  spam_reports?: number | null;
  linked_profiles?: EntityRef<SocialProfileNode>[] | null;
  leak_hits?: number | null;
}


