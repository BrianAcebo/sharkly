import { supabase } from '../utils/supabaseClient';

export type OrgCredits = {
	org_id: string;
	included_monthly: number;
	included_remaining: number;
	wallet_balance_cents: number;
	wallet_remaining: number;
	remaining_total: number;
	needs_topup: boolean;
};

export async function getOrgCredits(orgId: string): Promise<OrgCredits> {
	const { data, error } = await supabase.rpc('get_org_credits', { p_org_id: orgId });
	if (error) {
		throw new Error(`Unable to fetch credits: ${error.message}`);
	}
	if (!data) {
		throw new Error('No credit data returned');
	}
	return data as OrgCredits;
}

export type SpendCreditsSuccess = {
	success: true;
	event_id: string;
	charged_credits: number;
	from_included: number;
	from_wallet: number;
	wallet_debit_cents: number;
} & OrgCredits;

export type SpendCreditsAlready = {
	success: true;
	already_charged: true;
	event_id: string;
} & OrgCredits;

export type SpendCreditsFailure = {
	success: false;
	error: 'invalid_credits' | 'missing_run_id' | 'org_not_found' | 'insufficient_credits';
	message: string;
	required?: number;
	available?: number;
	included_remaining?: number;
	wallet_remaining?: number;
	needs_topup?: boolean;
};

export type SpendCreditsResponse = SpendCreditsSuccess | SpendCreditsAlready | SpendCreditsFailure;

/**
 * Spend credits for a public presence run (requires run_id for idempotency).
 */
export async function spendCredits(params: {
	orgId: string;
	credits: number;
	runId: string;
	category?: string;
	description?: string | null;
}): Promise<SpendCreditsResponse> {
	const { orgId, credits, runId, category = 'investigation', description = null } = params;
	const { data, error } = await supabase.rpc('spend_credits', {
		p_org_id: orgId,
		p_credits: credits,
		p_run_id: runId,
		p_category: category,
		p_description: description
	});
	if (error) {
		throw new Error(`Charge failed: ${error.message}`);
	}
	return data as SpendCreditsResponse;
}

export type SpendActionCreditsResponse = {
	ok: boolean;
	reason?: string;
	included_remaining?: number;
	wallet_remaining?: number;
};

/**
 * Spend credits for a one-off action (no run_id required).
 * Uses the flexible spend_credits RPC with reference_type.
 */
export async function spendCreditsForAction(params: {
	orgId: string;
	credits: number;
	category: string;
	description?: string | null;
}): Promise<SpendActionCreditsResponse> {
	const { orgId, credits, category, description = null } = params;
	const { data, error } = await supabase.rpc('spend_credits', {
		p_org_id: orgId,
		p_credits: credits,
		p_reference_type: category,
		p_reference_id: null,
		p_description: description
	});
	if (error) {
		throw new Error(`Charge failed: ${error.message}`);
	}
	return data as SpendActionCreditsResponse;
}

export type MonthlyUsage = {
	period: {
		start: string;
		end: string;
	};
	total_credits_spent: number;
	from_included_credits: number;
	from_wallet_credits: number;
	wallet_spent_cents: number;
	wallet_spent_dollars: number;
	event_count: number;
};

export async function getOrgCreditUsageMonth(orgId: string): Promise<MonthlyUsage> {
	const { data, error } = await supabase.rpc('get_org_credit_usage_month', { p_org_id: orgId });
	if (error) {
		throw new Error(`Unable to fetch monthly usage: ${error.message}`);
	}
	if (!data) {
		throw new Error('No monthly usage returned');
	}
	return data as MonthlyUsage;
}

export type AddWalletFundsResponse = {
	success: boolean;
	wallet_id?: string;
	added_cents?: number;
	added_dollars?: number;
	added_credits?: number;
	new_balance_cents?: number;
	new_balance_credits?: number;
} & Partial<OrgCredits>;

export async function addWalletFunds(params: {
	orgId: string;
	amountCents: number;
	description?: string;
}): Promise<AddWalletFundsResponse> {
	const { orgId, amountCents, description = 'Wallet top-up' } = params;
	const { data, error } = await supabase.rpc('add_wallet_funds', {
		p_org_id: orgId,
		p_amount_cents: amountCents,
		p_description: description
	});
	if (error) {
		throw new Error(`Top-up failed: ${error.message}`);
	}
	return data as AddWalletFundsResponse;
}


