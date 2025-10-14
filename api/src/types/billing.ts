// Shared billing types for backend consistency

export type StripeSubStatus = 
  | 'trialing' 
  | 'active' 
  | 'past_due' 
  | 'unpaid' 
  | 'canceled' 
  | 'incomplete' 
  | 'incomplete_expired' 
  | 'paused';

export type OrgStatus = 'active' | 'paused' | 'disabled' | 'deleted' | 'payment_required' | 'past_due';

export type UsageResourceType = 'voice' | 'sms' | 'email' | 'other';

export type PlanCode = 'starter' | 'growth' | 'scale' | 'enterprise';

export interface PostalAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface OrganizationRow {
  id: string;
  name: string;
  owner_id: string | null;
  website: string | null;
  industry: string | null;
  ein: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  address_country: string | null;
  tz: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_status: StripeSubStatus | null;
  org_status: OrgStatus;
  plan_code: PlanCode | null;
  plan_price_cents: number | null;
  included_seats: number | null;
  included_minutes: number | null;
  included_sms: number | null;
  included_emails: number | null;
  twilio_subaccount_sid: string | null;
  twilio_messaging_service_sid?: string | null;
  trial_end: string | null;
  cancel_at_period_end?: boolean | null;
  payment_action_required?: boolean | null;
  dunning_enabled?: boolean | null;
  last_payment_failed_at?: string | null;
  payment_retry_count?: number | null;
  next_payment_retry_at?: string | null;
  payment_failure_reason?: string | null;
  usage_wallet_status?: 'active' | 'payment_required' | 'suspended';
  wallet_threshold_cents?: number | null;
  wallet_top_up_amount_cents?: number | null;
  initial_top_up_required?: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface PlanCatalogRow {
  plan_code: PlanCode;
  name: string;
  base_price_cents: number;
  included_seats: number;
  included_minutes: number;
  included_sms: number;
  included_emails: number;
  stripe_price_id: string;
  active: boolean;
}

export interface OrgOnboardRequest {
  orgId?: string;
  name: string;
  planCode: PlanCode;
  trialDays?: number;
  website?: string;
  industry?: string;
  ein?: string;
  tz?: string;
  address?: PostalAddress;
  paymentMethodId?: string;
  useExistingPaymentMethod?: boolean;
  areaCode?: string;
}

export interface CustomerPaymentMethodSummary {
  id: string;
  brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
  billing_details_name?: string | null;
}

export interface OrgOnboardResponse {
  ok: true;
  org: OrganizationRow | null;
  subscriptionClientSecret?: string | null;
  setupClientSecret?: string | null;
}

export interface WalletStatus {
  wallet: {
    status: 'active' | 'payment_required' | 'suspended';
    balance_cents: number;
    threshold_cents: number;
    top_up_amount_cents: number;
    pending_top_up_cents: number;
    last_top_up_at: string | null;
  } | null;
  included: {
    minutesRemaining?: number | null;
    smsRemaining?: number | null;
    emailRemaining?: number | null;
  };
  trialing: boolean;
  depositRequired: boolean;
  reason?: 'trial_requires_deposit' | 'insufficient_wallet' | 'wallet_suspended';
}

export interface ApiError {
  ok: false;
  error: string;
  code?: string;
}

// Helper function to convert unix timestamp to ISO string
export const unixToISO = (unix: number): string => {
  return new Date(unix * 1000).toISOString();
};
