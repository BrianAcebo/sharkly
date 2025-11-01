// Billing Onboarding Types

export type PlanCode = 'starter' | 'growth' | 'scale';

export type OrgStatus = 'pending' | 'active' | 'paused' | 'disabled' | 'deleted' | 'payment_required' | 'past_due';

export type StripeSubStatus = 
  | 'trialing' 
  | 'active' 
  | 'past_due' 
  | 'unpaid' 
  | 'canceled' 
  | 'incomplete' 
  | 'incomplete_expired' 
  | 'paused';

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
  tz: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_status: StripeSubStatus | null;
  status: OrgStatus;
  plan_code: PlanCode | null;
  plan_price_cents: number | null;
  included_seats: number | null;
  included_credits: number | null;
  trial_end: string | null;
  payment_action_required?: boolean | null;
  dunning_enabled?: boolean | null;
  last_payment_failed_at?: string | null;
  payment_retry_count?: number | null;
  next_payment_retry_at?: string | null;
  payment_failure_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanCatalogRow {
  plan_code: PlanCode;
  name: string;
  base_price_cents: number;
  included_seats: number;
  included_credits: number;
  stripe_price_id: string;
  active: boolean;
}

export interface BillingOnboardingViewState {
  step: 1 | 2;
  selectedPlan: PlanCode | null;
  trialSelected: boolean;
  orgId: string;
  orgName: string;
  website: string;
  industry: string;
  ein: string;
  tz: string;
  address: PostalAddress;
  loading: boolean;
  error: string | null;
  success: boolean;
}

// API Contracts
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
  org: OrganizationRow;
  subscriptionClientSecret?: string | null;
}

export interface ApiError {
  ok: false;
  error: string;
  code?: string;
}

export type OrgOnboardResult = OrgOnboardResponse | ApiError;

// Webhook Events
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

export interface SubscriptionUpdatedEvent {
  id: string;
  status: StripeSubStatus;
  current_period_start: number;
  current_period_end: number;
  trial_end?: number | null;
  customer: string;
}
