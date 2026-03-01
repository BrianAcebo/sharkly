import { api } from '../utils/api';
import { supabase } from '../utils/supabaseClient';

export interface OrganizationRefundInfo {
  id: string;
  name: string;
  plan_code: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_status: string | null;
  included_credits_monthly: number;
  included_credits_remaining: number;
  last_refund_at: string | null;
  refund_count_90d: number;
  created_at: string;
  wallet_balance_cents: number;
}

interface RefundEligibility {
  eligible: boolean;
  reason?: string;
  days_since_charge?: number;
  usage_percent?: number;
  refund_amount_cents?: number;
  original_amount_cents?: number;
  stripe_charge_id?: string;
  stripe_invoice_id?: string;
}

interface UsageEvent {
  id: string;
  organization_id: string;
  action_key: string;
  credits_spent: number;
  occurred_at: string;
  metadata: Record<string, unknown>;
}

interface ActionResult {
  id: string;
  action_key: string;
  entity_type: string;
  entity_id: string;
  success: boolean;
  error_message: string | null;
  credits_charged: number;
  created_at: string;
}

interface RefundRequest {
  id: string;
  organization_id: string;
  refund_type: string;
  status: string;
  refund_amount_cents: number | null;
  credits_refunded: number | null;
  stripe_refund_id: string | null;
  requested_at: string;
  processed_at: string | null;
  reason: string | null;
}

interface Invoice {
  id: string;
  stripe_invoice_id: string;
  amount_due: number;
  amount_paid: number;
  status: string;
  created_at: string;
}

interface PaymentFailure {
  id: string;
  organization_id: string;
  stripe_invoice_id: string | null;
  stripe_charge_id: string | null;
  stripe_payment_intent_id: string | null;
  failure_code: string | null;
  failure_message: string | null;
  decline_code: string | null;
  next_action: string | null;
  attempt_count: number;
  stripe_created_at: string | null;
  created_at: string;
}

interface LedgerEntry {
  id: string;
  organization_id: string;
  event_type: string;
  description: string;
  amount_cents: number | null;
  balance_impact: 'credit' | 'debit' | 'none';
  metadata: Record<string, unknown> | null;
  stripe_event_id: string | null;
  created_at: string;
}

export interface RefundAudit {
  organization: OrganizationRefundInfo;
  eligibility: {
    subscription: RefundEligibility | null;
    wallet: RefundEligibility | null;
  };
  usage_events: UsageEvent[];
  action_results: ActionResult[];
  refund_history: RefundRequest[];
  recent_invoices: Invoice[];
  payment_failures: PaymentFailure[];
  subscription_ledger: LedgerEntry[];
}

// Helper to get auth headers
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
  };
}

// Search for organizations
export async function lookupOrgForRefund(query: string): Promise<OrganizationRefundInfo[]> {
  const headers = await getAuthHeaders();
  const resp = await api.get(`/api/billing/admin/refunds/lookup?query=${encodeURIComponent(query)}`, { headers });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Lookup failed');
  }
  return resp.json();
}

// Get full refund audit for an org
export async function getRefundAudit(orgId: string): Promise<RefundAudit> {
  const headers = await getAuthHeaders();
  const resp = await api.get(`/api/billing/admin/refunds/audit/${orgId}`, { headers });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to load audit');
  }
  return resp.json();
}

// Process subscription refund
export async function processSubscriptionRefund(orgId: string, reason?: string): Promise<{
  success: boolean;
  refund_id: string;
  stripe_refund_id: string;
  refund_amount_cents: number;
  refund_amount_dollars: string;
}> {
  const headers = await getAuthHeaders();
  const resp = await api.post('/api/billing/admin/refunds/subscription', { orgId, reason }, { headers });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Refund failed');
  }
  return resp.json();
}

// Process wallet refund
export async function processWalletRefund(orgId: string, reason?: string): Promise<{
  success: boolean;
  refund_id: string;
  stripe_refund_id: string;
  refund_amount_cents: number;
  refund_amount_dollars: string;
}> {
  const headers = await getAuthHeaders();
  const resp = await api.post('/api/billing/admin/refunds/wallet', { orgId, reason }, { headers });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Refund failed');
  }
  return resp.json();
}

// Credit back a failed action
export async function creditBackAction(
  orgId: string,
  actionKey: string,
  credits: number,
  reason: string
): Promise<{
  success: boolean;
  credits_added: number;
  new_balance: number;
}> {
  const headers = await getAuthHeaders();
  const resp = await api.post('/api/billing/admin/refunds/credit-back', {
    orgId,
    actionKey,
    credits,
    reason
  }, { headers });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Credit-back failed');
  }
  return resp.json();
}

// Stripe subscription actions
export async function cancelSubscription(orgId: string, immediately?: boolean): Promise<{ success: boolean; message: string }> {
  const headers = await getAuthHeaders();
  const resp = await api.post('/api/billing/admin/subscription/cancel', { orgId, immediately }, { headers });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Cancel failed');
  }
  return resp.json();
}

export async function pauseSubscription(orgId: string): Promise<{ success: boolean; message: string }> {
  const headers = await getAuthHeaders();
  const resp = await api.post('/api/billing/admin/subscription/pause', { orgId }, { headers });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Pause failed');
  }
  return resp.json();
}

export async function resumeSubscription(orgId: string): Promise<{ success: boolean; message: string }> {
  const headers = await getAuthHeaders();
  const resp = await api.post('/api/billing/admin/subscription/resume', { orgId }, { headers });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Resume failed');
  }
  return resp.json();
}

// Verify admin password
export async function verifyAdminPassword(password: string): Promise<{ valid: boolean }> {
  const headers = await getAuthHeaders();
  const resp = await api.post('/api/billing/admin/verify-password', { password }, { headers });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Verification failed');
  }
  return resp.json();
}
