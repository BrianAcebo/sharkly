// SMS Verification Types for Organization Onboarding

export type BusinessType = 'llc' | 'corporation' | 'sole_prop' | 'partnership' | 'non_profit';
export type Industry = 'real_estate' | 'insurance' | 'saas' | 'services' | 'other';
export type OptInMethod = 'web_form' | 'paper_form' | 'verbal' | 'existing_customer' | 'keyword' | 'other';
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | null;

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface ComplianceContact {
  name: string;
  email: string;
  phone: string;
}

export interface SmsBrandProfile {
  org_id: string;
  legal_name: string;
  business_type: BusinessType;
  ein: string;
  website: string;
  industry: Industry;
  addr_street: string;
  addr_city: string;
  addr_state: string;
  addr_zip: string;
  addr_country: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  created_at: string;
  updated_at: string;
}

export interface SmsCampaignProfile {
  org_id: string;
  use_case_description: string;
  opt_in_method: OptInMethod;
  sample_msg_1: string;
  sample_msg_2: string;
  opt_out_text: string;
  help_text: string;
  terms_url: string;
  privacy_url: string;
  est_monthly_messages: number;
  countries: string[];
  created_at: string;
  updated_at: string;
}

export interface VerificationStatusResponse {
  subaccountSid: string | null;
  messagingServiceSid: string | null;
  trusthubProfileSid: string | null;
  a2p: {
    status: VerificationStatus;
    reason: string | null;
  };
  tollfree: {
    status: VerificationStatus;
    reason: string | null;
  };
}

export interface SaveBrandRequest {
  orgId: string;
  legal_name: string;
  business_type: BusinessType;
  ein: string;
  website: string;
  industry: Industry;
  address: Address;
  contact: ComplianceContact;
}

export interface SaveCampaignRequest {
  orgId: string;
  use_case_description: string;
  opt_in_method: OptInMethod;
  sample_msg_1: string;
  sample_msg_2: string;
  opt_out_text: string;
  help_text: string;
  terms_url: string;
  privacy_url: string;
  est_monthly_messages: number;
  countries: string[];
}

export interface ApiResponse {
  ok: boolean;
  error?: string;
  data?: any;
}
