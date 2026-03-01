import { api } from '../utils/api';
import { supabase } from '../utils/supabaseClient';

export interface SubscriptionRefundEligibility {
  eligible: boolean;
  refund_amount_cents: number;
  refund_amount_dollars: number;
  original_amount_cents: number;
  stripe_invoice_id: string;
  stripe_charge_id?: string;
  days_since_charge: number;
  usage_percent: number;
  credits_used: number;
  credits_remaining: number;
  credits_total: number;
  refunds_90d: number;
  denial_reasons: string[];
  requires_manual_review: boolean;
}

export interface WalletRefundEligibility {
  eligible: boolean;
  refund_amount_cents: number;
  refund_amount_dollars: number;
  wallet_balance_cents: number;
  total_deposited_cents?: number;
  total_spent_cents?: number;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  refund_id: string;
  stripe_refund_id: string;
  refund_amount_cents: number;
  refund_amount_dollars: string;
  message: string;
}

export interface RefundRequest {
  id: string;
  organization_id: string;
  user_id?: string;
  refund_type: 'subscription' | 'wallet' | 'action_credit';
  status: 'pending' | 'approved' | 'denied' | 'processed' | 'failed';
  stripe_charge_id?: string;
  stripe_invoice_id?: string;
  stripe_refund_id?: string;
  original_amount_cents: number;
  refund_amount_cents: number;
  credits_refunded?: number;
  auto_eligible: boolean;
  denial_reason?: string;
  reason?: string;
  notes?: string;
  requested_at: string;
  processed_at?: string;
}

// Helper to get auth headers
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
  };
}

// Check subscription refund eligibility
export async function checkSubscriptionRefundEligibility(): Promise<SubscriptionRefundEligibility> {
  const headers = await getAuthHeaders();
  const resp = await api.get('/api/refunds/subscription/eligibility', { headers });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to check eligibility');
  }
  return resp.json();
}

// Check wallet refund eligibility
export async function checkWalletRefundEligibility(): Promise<WalletRefundEligibility> {
  const headers = await getAuthHeaders();
  const resp = await api.get('/api/refunds/wallet/eligibility', { headers });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to check eligibility');
  }
  return resp.json();
}

// Request subscription refund
export async function requestSubscriptionRefund(reason?: string): Promise<RefundResult> {
  const headers = await getAuthHeaders();
  const resp = await api.post('/api/refunds/subscription', { reason }, { headers });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Refund request failed');
  }
  return resp.json();
}

// Request wallet refund
export async function requestWalletRefund(reason?: string): Promise<RefundResult> {
  const headers = await getAuthHeaders();
  const resp = await api.post('/api/refunds/wallet', { reason }, { headers });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Refund request failed');
  }
  return resp.json();
}

// Get refund history
export async function getRefundHistory(): Promise<RefundRequest[]> {
  const headers = await getAuthHeaders();
  const resp = await api.get('/api/refunds/history', { headers });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to get refund history');
  }
  return resp.json();
}
