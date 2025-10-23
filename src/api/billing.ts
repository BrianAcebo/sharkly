import type { CustomerPaymentMethodSummary } from '../types/billing';
import { api } from '../utils/api';

export interface WalletStatusResponse {
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

const jsonHeaders = (accessToken: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${accessToken}`
});

export async function fetchWalletStatus(params: { organizationId: string; accessToken: string }): Promise<WalletStatusResponse> {
  const { organizationId, accessToken } = params;
  const resp = await api.get(`/api/billing/wallet/status?orgId=${encodeURIComponent(organizationId)}`, {
    headers: jsonHeaders(accessToken)
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to fetch wallet status');
  }
  return resp.json();
}

export interface WalletTopupIntentResponse {
  client_secret: string | null;
  payment_intent_id: string;
  wallet: WalletStatusResponse['wallet'];
}

export async function createWalletTopupIntent(params: {
  organizationId: string;
  accessToken: string;
  amountCents?: number;
  autoConfirm?: boolean;
  purpose?: 'wallet_topup' | 'wallet_auto_recharge';
  metadata?: Record<string, string>;
}): Promise<WalletTopupIntentResponse> {
  const {
    organizationId,
    accessToken,
    amountCents,
    autoConfirm,
    purpose,
    metadata
  } = params;
  const resp = await api.post(
    `/api/billing/wallet/topup/${encodeURIComponent(organizationId)}/intent`,
    {
      amount_cents: amountCents,
      auto_confirm: autoConfirm,
      purpose,
      metadata
    },
    {
      headers: jsonHeaders(accessToken)
    }
  );
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to create wallet top-up intent');
  }
  return resp.json();
}

export interface AutoRechargeSettings {
  organization_id: string;
  enabled: boolean;
  amount_cents: number;
  threshold_cents: number;
  payment_method_id: string | null;
  failed_attempts: number | null;
  updated_at: string | null;
}

export async function fetchAutoRechargeSettings(params: { organizationId: string; accessToken: string }): Promise<AutoRechargeSettings | null> {
  const { organizationId, accessToken } = params;
  const resp = await api.get(`/api/billing/wallet/auto-recharge/${encodeURIComponent(organizationId)}`, {
    headers: jsonHeaders(accessToken)
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to load auto-recharge settings');
  }
  const data = await resp.json();
  return (data?.settings as AutoRechargeSettings | null) ?? null;
}

export async function updateAutoRechargeSettings(params: {
  organizationId: string;
  accessToken: string;
  enabled?: boolean;
  amount_cents?: number;
  threshold_cents?: number;
  payment_method_id?: string | null;
}): Promise<AutoRechargeSettings> {
  const { organizationId, accessToken, ...payload } = params;
  const resp = await api.put(
    `/api/billing/wallet/auto-recharge/${encodeURIComponent(organizationId)}`,
    payload,
    {
      headers: jsonHeaders(accessToken)
    }
  );
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to save auto-recharge settings');
  }
  const data = await resp.json();
  return data.settings as AutoRechargeSettings;
}

export interface InvoiceListResponse<T> {
  data: T[];
  has_more: boolean;
  url?: string;
}

export async function listInvoices<T = Record<string, unknown>>(params: {
  customerId: string;
  accessToken: string;
  limit?: number;
  starting_after?: string | null;
  ending_before?: string | null;
}): Promise<InvoiceListResponse<T>> {
  const { customerId, accessToken, limit = 10, starting_after, ending_before } = params;
  const query = new URLSearchParams({
    customerId,
    limit: String(limit)
  });
  if (starting_after) query.append('starting_after', starting_after);
  if (ending_before) query.append('ending_before', ending_before);

  const resp = await api.get(`/api/billing/invoices?${query.toString()}`, {
    headers: jsonHeaders(accessToken)
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to fetch invoices');
  }

  return resp.json();
}

export async function fetchDefaultPaymentMethodSummary(params: {
  organizationId: string;
  accessToken: string;
}): Promise<{
  hasDefault: boolean;
  defaultPaymentMethod: CustomerPaymentMethodSummary | null;
  customerId: string | null;
  subscriptionId: string | null;
  planCode: string | null;
  organizationName: string;
}> {
  const { organizationId, accessToken } = params;
  const query = new URLSearchParams({ orgId: organizationId });
  const resp = await api.get(`/api/billing/orgs/payment-methods/default?${query.toString()}`, {
    headers: jsonHeaders(accessToken)
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to load default payment method');
  }
  return resp.json();
}

export interface UsageCatalogPricing {
  voice: {
    stripe_price_id: string;
    amountCents: number;
  } | null;
  sms: {
    stripe_price_id: string;
    amountCents: number;
  } | null;
}

export async function fetchUsageCatalogPricing(accessToken: string): Promise<UsageCatalogPricing> {
  const resp = await api.get('/api/billing/usage-catalog', {
    headers: jsonHeaders(accessToken)
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to fetch usage pricing');
  }

  return resp.json();
}
