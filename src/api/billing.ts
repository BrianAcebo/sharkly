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

export async function fetchWalletStatus(orgId: string): Promise<WalletStatusResponse> {
  const resp = await fetch(`/api/billing/wallet/status?orgId=${encodeURIComponent(orgId)}`);
  if (!resp.ok) {
    throw new Error('Failed to fetch wallet status');
  }
  return resp.json();
}

export async function createWalletTopup(params: { organizationId: string; amountCents?: number }) {
  const resp = await fetch('/api/billing/wallet/topup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Failed to create top-up');
  }
  return resp.json() as Promise<{ client_secret: string | null; payment_intent_id: string; }>;
}


