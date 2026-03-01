import { supabase } from './supabaseClient.js';

// =====================================================
// Simple Action Credit Spending (no run_id required)
// =====================================================

export type ActionSpendParams = {
  orgId: string;
  creditCost: number;
  category: string;        // e.g. 'hunter_domain_search', 'vera_tool'
  description: string;     // Human-readable description
};

export type ActionSpendResult = {
  success: boolean;
  error?: string;
  errorType?: 'insufficient' | 'server';
};

/**
 * Spend credits for a one-off action (not tied to a public presence run).
 * Uses the flexible spend_credits RPC with reference_type/reference_id.
 */
export async function spendCreditsForAction(params: ActionSpendParams): Promise<ActionSpendResult> {
  const { orgId, creditCost, category, description } = params;

  console.log('[Credits] Spending for action:', { orgId, creditCost, category });

  const { data, error } = await supabase.rpc('spend_credits', {
    p_org_id: orgId,
    p_credits: creditCost,
    p_reference_type: category,
    p_reference_id: null,
    p_description: description,
  });

  if (error) {
    console.error('[Credits] Failed to spend - DB error:', error);
    return { success: false, error: 'An error occurred', errorType: 'server' };
  }

  // This version returns 'ok' instead of 'success'
  if (!data?.ok) {
    console.log('[Credits] Spend rejected:', data);
    return { success: false, error: 'Insufficient credits', errorType: 'insufficient' };
  }

  console.log('[Credits] Spent successfully:', data);
  return { success: true };
}

// =====================================================
// Full Usage Event Credit Spending (with run_id)
// =====================================================

export type SpendParams = {
  orgId: string;
  seatId: string | null;
  runId: string | null;
  category: string;
  provider: string;
  unit: string;
  qty: number;
  creditCost: number;
  meta?: Record<string, unknown>;
};

export type SpendResult = {
  ok: boolean;
  from_included_credits: number;
  from_wallet_credits: number;
  wallet_debit_cents: number;
  included_remaining_credits?: number | null;
  reason?: string;
  proceededWithoutRpc?: boolean;
};

/**
 * Spend credits for a usage event, preferring included credits first.
 * Falls back to wallet RPC if included credits are insufficient.
 * If the RPC is unavailable (function missing), returns ok=true and proceededWithoutRpc=true,
 * allowing callers to proceed (soft fail for environments without RPC).
 */
export async function spendCreditsPreferIncludedOrWallet(params: SpendParams): Promise<SpendResult> {
  const { orgId, seatId, runId, category, provider, unit, qty, creditCost, meta } = params;

  // Try included credits first
  try {
    const { data: orgInfo } = await supabase
      .from('organizations')
      .select('id, included_credits')
      .eq('id', orgId)
      .single();
    const available = Number((orgInfo as { included_credits: number | null } | null)?.included_credits ?? 0);
    if (available >= creditCost) {
      const newRemaining = available - creditCost;
      const [{ error: updErr }] = await Promise.all([
        supabase.from('organizations').update({ included_credits: newRemaining }).eq('id', orgId),
        supabase.from('usage_events').insert({
          org_id: orgId,
          run_id: runId,
          category,
          provider,
          unit,
          qty,
          credit_cost: creditCost,
          meta: meta ?? {}
        })
      ]);
      if (!updErr) {
        return {
          ok: true,
          from_included_credits: creditCost,
          from_wallet_credits: 0,
          wallet_debit_cents: 0,
          included_remaining_credits: newRemaining
        };
      }
    }
  } catch {
    // ignore; try wallet next
  }

  // Wallet RPC path
  const { data: billData, error: billErr } = await supabase.rpc('spend_credits_for_usage_event', {
    p_org_id: orgId,
    p_seat_id: seatId,
    p_run_id: runId,
    p_category: category,
    p_provider: provider,
    p_unit: unit,
    p_qty: qty,
    p_credit_cost: creditCost,
    p_raw_cost_cents: 0,
    p_meta: meta ?? {}
  });

  if (billErr || !billData?.ok) {
    const reason = billData?.reason ?? billErr?.message ?? 'billing_failed';
    // If RPC function is missing/unavailable in this environment, allow proceeding
    const rpcMissing = /could not find the function|not exist/i.test(reason);
    if (rpcMissing) {
      return {
        ok: true,
        proceededWithoutRpc: true,
        from_included_credits: 0,
        from_wallet_credits: 0,
        wallet_debit_cents: 0,
        included_remaining_credits: billData?.included_remaining_credits ?? null,
        reason
      };
    }
    return {
      ok: false,
      from_included_credits: 0,
      from_wallet_credits: 0,
      wallet_debit_cents: 0,
      included_remaining_credits: billData?.included_remaining_credits ?? null,
      reason
    };
  }

  return {
    ok: true,
    from_included_credits: billData.from_included_credits ?? 0,
    from_wallet_credits: billData.from_wallet_credits ?? 0,
    wallet_debit_cents: billData.wallet_debit_cents ?? 0,
    included_remaining_credits: billData?.included_remaining_credits ?? null
  };
}


