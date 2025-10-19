import { apiGet, apiPost, apiPut } from '../utils/api';

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

export const fetchWalletStatus = (organizationId: string, accessToken: string) =>
  apiGet(`/api/billing/wallet/status?orgId=${encodeURIComponent(organizationId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

export interface WalletTopupIntentResponse {
  client_secret: string | null;
  payment_intent_id: string;
  wallet: WalletStatusResponse['wallet'];
}

export const createWalletTopupIntent = (
  organizationId: string,
  amountCents: number,
  autoConfirm: boolean,
  purpose: string,
  metadata: Record<string, string>,
  accessToken: string
) =>
  apiPost(
    `/api/billing/wallet/topup/${encodeURIComponent(organizationId)}/intent`,
    { amount_cents: amountCents, auto_confirm: autoConfirm, purpose, metadata },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

export interface AutoRechargeSettings {
  organization_id: string;
  enabled: boolean;
  amount_cents: number;
  threshold_cents: number;
  payment_method_id: string | null;
  failed_attempts: number | null;
  updated_at: string | null;
}

export const fetchAutoRechargeSettings = (organizationId: string, accessToken: string) =>
  apiGet(`/api/billing/wallet/auto-recharge/${encodeURIComponent(organizationId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

export const updateAutoRechargeSettings = (
  organizationId: string,
  payload: Record<string, unknown>,
  accessToken: string
) =>
  apiPut(`/api/billing/wallet/auto-recharge/${encodeURIComponent(organizationId)}`, payload, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

export interface InvoiceListResponse<T> {
  data: T[];
  has_more: boolean;
  url?: string;
}

export const listInvoices = (
  organizationId: string,
  accessToken: string,
  params: { limit?: number; starting_after?: string | null; ending_before?: string | null } = {}
) => {
  const query = new URLSearchParams({ limit: String(params.limit ?? 10) });
  if (params.starting_after) query.set('starting_after', params.starting_after);
  if (params.ending_before) query.set('ending_before', params.ending_before);
  return apiGet(`/api/billing/invoices?${query.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
};

export const fetchDefaultPaymentMethodSummary = (
  orgId: string,
  accessToken: string
) =>
  apiGet(`/api/billing/orgs/payment-methods/default?orgId=${encodeURIComponent(orgId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

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

export const fetchUsageCatalog = () => apiGet('/api/billing/usage-catalog');
