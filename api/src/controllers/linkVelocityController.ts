/**
 * S2-14: Link Velocity Monitoring (V1.3h)
 * GET  /api/sites/:siteId/link-velocity — status from existing data (no charge)
 * POST /api/sites/:siteId/link-velocity — fetch from DataForSEO, charge credits, store, return
 *
 * Research: US7346839B2 — sudden spikes in link acquisition are formal spam signals.
 * Target: 3–8 new referring domains per month consistently.
 */

import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { getReferringDomains } from '../utils/dataforseoBacklinks.js';
import { CREDIT_COSTS } from '../../../shared/credits.mjs';

const CREDIT_COST = CREDIT_COSTS.LINK_VELOCITY_CHECK;

type VelocityStatus = 'healthy' | 'elevated' | 'spike_warning' | 'insufficient_data';

interface LinkVelocityResult {
	status: VelocityStatus;
	message: string;
	recommendation?: string;
	recentMonthGrowth?: number;
	avgHistoricalGrowth?: number;
	velocityRatio?: number;
	latestReferringDomains?: number;
	creditsUsed?: number;
}

function evaluateLinkVelocity(
	history: Array<{ recorded_at: string; referring_domains: number }>
): LinkVelocityResult {
	if (!history || history.length < 2) {
		return {
			status: 'insufficient_data',
			message: 'Need at least 2 data points to evaluate link growth. Run a link velocity check or toxic link audit to record your referring domains over time.',
			latestReferringDomains: history?.[history.length - 1]?.referring_domains ?? undefined
		};
	}

	// Group by month (YYYY-MM), take latest recorded_at per month → use that row's referring_domains
	const byMonth = new Map<string, { recorded_at: string; referring_domains: number }>();
	for (const row of history) {
		const d = new Date(row.recorded_at);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
		const existing = byMonth.get(key);
		if (!existing || new Date(row.recorded_at) > new Date(existing.recorded_at)) {
			byMonth.set(key, { recorded_at: row.recorded_at, referring_domains: row.referring_domains });
		}
	}

	const sortedMonths = Array.from(byMonth.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([k, v]) => [k, v.referring_domains] as [string, number]);
	if (sortedMonths.length < 2) {
		return {
			status: 'insufficient_data',
			message: 'Need at least 2 months of data to evaluate growth pattern.',
			latestReferringDomains: sortedMonths[sortedMonths.length - 1]?.[1]
		};
	}

	const monthlyGrowth: number[] = [];
	for (let i = 1; i < sortedMonths.length; i++) {
		monthlyGrowth.push(
			sortedMonths[i][1] - sortedMonths[i - 1][1]
		);
	}

	const recentMonthGrowth = monthlyGrowth[monthlyGrowth.length - 1] ?? 0;
	const historical = monthlyGrowth.slice(0, -1);
	const avgHistoricalGrowth =
		historical.length > 0
			? historical.reduce((a, b) => a + b, 0) / historical.length
			: 0;
	const velocityRatio =
		avgHistoricalGrowth > 0 ? recentMonthGrowth / avgHistoricalGrowth : 0;

	const latestReferringDomains = sortedMonths[sortedMonths.length - 1]?.[1];

	// Spec: spike_warning if ratio > 5 AND recentMonthGrowth > 20
	if (velocityRatio > 5 && recentMonthGrowth > 20) {
		return {
			status: 'spike_warning',
			message: `You gained ${recentMonthGrowth} new sites linking to you this month after averaging ${Math.round(avgHistoricalGrowth)} per month. Sudden spikes in link acquisition can look like paid links to Google — a formal spam signal.`,
			recommendation:
				'Review where these new links came from. If any are from link-buying or low-quality directories, consider disavowing them in Google Search Console.',
			recentMonthGrowth,
			avgHistoricalGrowth,
			velocityRatio,
			latestReferringDomains
		};
	}

	if (velocityRatio > 3) {
		return {
			status: 'elevated',
			message: 'Link growth is higher than usual this month — worth monitoring.',
			recommendation: 'Keep growing naturally. Avoid bulk link purchases — steady growth is safer.',
			recentMonthGrowth,
			avgHistoricalGrowth,
			velocityRatio,
			latestReferringDomains
		};
	}

	return {
		status: 'healthy',
		message: `Link growth looks consistent at ~${Math.round(avgHistoricalGrowth || recentMonthGrowth)} new sites per month. This pattern is what Google expects.`,
		recentMonthGrowth,
		avgHistoricalGrowth,
		velocityRatio,
		latestReferringDomains
	};
}

export async function getLinkVelocity(req: Request, res: Response): Promise<void> {
	try {
		const userId = req.user?.id;
		if (!userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const siteId = req.params.siteId;
		if (!siteId) {
			res.status(400).json({ error: 'siteId is required' });
			return;
		}

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg?.organization_id) {
			res.status(400).json({ error: 'No organization found' });
			return;
		}

		const { data: site, error: siteErr } = await supabase
			.from('sites')
			.select('id')
			.eq('id', siteId)
			.eq('organization_id', userOrg.organization_id)
			.single();

		if (siteErr || !site) {
			res.status(404).json({ error: 'Site not found' });
			return;
		}

		const { data: history, error: histErr } = await supabase
			.from('site_backlink_history')
			.select('recorded_at, referring_domains')
			.eq('site_id', siteId)
			.order('recorded_at', { ascending: true });

		if (histErr) {
			console.error('[LinkVelocity] History fetch error:', histErr);
			res.status(500).json({ error: 'Failed to fetch backlink history' });
			return;
		}

		const result = evaluateLinkVelocity(history ?? []);
		res.json(result);
	} catch (err) {
		console.error('[LinkVelocity] Get error:', err);
		res.status(500).json({ error: 'Failed to get link velocity status' });
	}
}

export async function runLinkVelocityCheck(req: Request, res: Response): Promise<void> {
	try {
		const userId = req.user?.id;
		if (!userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const siteId = req.params.siteId;
		if (!siteId) {
			res.status(400).json({ error: 'siteId is required' });
			return;
		}

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg?.organization_id) {
			res.status(400).json({ error: 'No organization found' });
			return;
		}

		const { data: site, error: siteErr } = await supabase
			.from('sites')
			.select('id, url')
			.eq('id', siteId)
			.eq('organization_id', userOrg.organization_id)
			.single();

		if (siteErr || !site) {
			res.status(404).json({ error: 'Site not found' });
			return;
		}

		const { data: org } = await supabase
			.from('organizations')
			.select('included_credits_remaining, included_credits')
			.eq('id', userOrg.organization_id)
			.single();

		const creditsRemaining = Number(org?.included_credits_remaining ?? org?.included_credits ?? 0);
		if (creditsRemaining < CREDIT_COST) {
			res.status(402).json({
				error: 'Insufficient credits',
				required: CREDIT_COST,
				available: creditsRemaining,
				needs_topup: true,
			});
			return;
		}

		const newCredits = Math.max(0, creditsRemaining - CREDIT_COST);
		const { error: deductErr } = await supabase
			.from('organizations')
			.update({
				included_credits_remaining: newCredits,
				...(org?.included_credits != null && { included_credits: newCredits }),
			})
			.eq('id', userOrg.organization_id);

		if (deductErr) {
			console.error('[LinkVelocity] Failed to deduct credits:', deductErr);
			res.status(500).json({ error: 'Failed to deduct credits' });
			return;
		}

		try {
			const { total_count, configured, error: dfsError } = await getReferringDomains(site.url, {
				limit: 1,
			});

			if (!configured || dfsError) {
				const msg = configured
					? dfsError ?? 'DataForSEO request failed'
					: 'DataForSEO API not configured. Add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD to enable link velocity checks.';
				res.status(503).json({ error: msg });
				// Refund
				await supabase
					.from('organizations')
					.update({
						included_credits_remaining: creditsRemaining,
						...(org?.included_credits != null && { included_credits: creditsRemaining }),
					})
					.eq('id', userOrg.organization_id);
				return;
			}

			await supabase.from('site_backlink_history').insert({
				site_id: siteId,
				referring_domains: total_count,
			});
		} catch (fetchErr) {
			console.error('[LinkVelocity] DataForSEO error:', fetchErr);
			await supabase
				.from('organizations')
				.update({
					included_credits_remaining: creditsRemaining,
					...(org?.included_credits != null && { included_credits: creditsRemaining }),
				})
				.eq('id', userOrg.organization_id);
			res.status(500).json({
				error: fetchErr instanceof Error ? fetchErr.message : 'Failed to fetch referring domains',
			});
			return;
		}

		// Re-fetch history and evaluate
		const { data: history } = await supabase
			.from('site_backlink_history')
			.select('recorded_at, referring_domains')
			.eq('site_id', siteId)
			.order('recorded_at', { ascending: true });

		const result = evaluateLinkVelocity(history ?? []);
		res.json({ ...result, creditsUsed: CREDIT_COST });
	} catch (err) {
		console.error('[LinkVelocity] Run error:', err);
		res.status(500).json({
			error: err instanceof Error ? err.message : 'Failed to run link velocity check',
		});
	}
}
