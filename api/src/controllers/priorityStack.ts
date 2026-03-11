/**
 * L5. Weekly Priority Stack
 * Data-driven task list from UPSA scores, cluster state, re-optimization queue, credits.
 * Builder tier: UPSA + cluster completion + credits + topics.
 * Growth+: adds GSC re-optimization queue.
 */

import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { findPageIdForGscUrl } from '../utils/gscUrlMatch.js';

export type PriorityCategory = 'high' | 'medium' | 'keep_going';

export type PriorityItem = {
	id: string;
	title: string;
	description: string;
	category: PriorityCategory;
	actionUrl: string;
	actionLabel: string;
	/** For sorting — higher = more urgent */
	score: number;
};

/** S2-16: Publishing cadence by growth stage (O3) */
export type PublishingCadence = {
	stage: 1 | 2 | 3 | 4;
	stageLabel: string;
	recommendedMin: number;
	recommendedMax: number;
	publishedThisMonth: number;
	onTrack: boolean;
	message: string;
};

/** Cadence recommendation per stage (pieces per month) */
const CADENCE_BY_STAGE: Record<number, { min: number; max: number }> = {
	1: { min: 2, max: 4 },
	2: { min: 4, max: 6 },
	3: { min: 6, max: 8 },
	4: { min: 4, max: 12 },
};

const MAX_ITEMS = 6;

export const getPriorityStack = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const siteId = req.query.siteId as string | undefined;
		if (!siteId) {
			res.status(400).json({ error: 'siteId required' });
			return;
		}

		// Verify user has access to site
		const { data: site } = await supabase
			.from('sites')
			.select('id, organization_id, domain_authority')
			.eq('id', siteId)
			.single();

		if (!site) {
			res.status(404).json({ error: 'Site not found' });
			return;
		}

		const siteDa = Number((site as { domain_authority?: number }).domain_authority ?? 0);

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg || userOrg.organization_id !== site.organization_id) {
			res.status(403).json({ error: 'Access denied' });
			return;
		}

		const items: PriorityItem[] = [];

		// 1. Credits critical (< 10% of monthly)
		const { data: org } = await supabase
			.from('organizations')
			.select('included_credits_remaining, included_credits_monthly')
			.eq('id', site.organization_id)
			.single();

		if (org) {
			const remaining = Number(org.included_credits_remaining ?? 0);
			const monthly = Number(org.included_credits_monthly ?? 1);
			const pct = monthly > 0 ? remaining / monthly : 0;
			if (pct < 0.1 && monthly > 0) {
				items.push({
					id: 'credits-critical',
					title: 'Credits running low',
					description: `${remaining} credits left. Add more to keep generating content.`,
					category: 'high',
					actionUrl: '/billing',
					actionLabel: 'Add credits',
					score: 100
				});
			} else if (pct < 0.2 && monthly > 0) {
				items.push({
					id: 'credits-low',
					title: 'Credits below 20%',
					description: `${remaining} of ${monthly} credits remaining this period.`,
					category: 'medium',
					actionUrl: '/billing',
					actionLabel: 'Billing',
					score: 60
				});
			}
		}

		// 2. Low SEO score published pages (score < 70)
		const { data: clusterRows } = await supabase
			.from('clusters')
			.select('id')
			.eq('site_id', siteId);
		const clusterIds = (clusterRows ?? []).map((c) => c.id);

		if (clusterIds.length > 0) {
			const { data: publishedPages } = await supabase
				.from('pages')
				.select('id, title, seo_score')
				.in('cluster_id', clusterIds)
				.eq('status', 'published');

			const lowScorePages = (publishedPages ?? []).filter((p) => {
				const score = Number(p.seo_score ?? 0);
				return score < 70 || p.seo_score == null;
			});

			for (const p of lowScorePages ?? []) {
				const score = Number(p.seo_score ?? 0);
				items.push({
					id: `low-score-${p.id}`,
					title: `Improve SEO: ${p.title}`,
					description: `Published page scores ${score}/115. Optimize to boost rankings.`,
					category: 'high',
					actionUrl: `/workspace/${p.id}`,
					actionLabel: 'Open in workspace',
					score: 90 - score
				});
			}
		}

		// 3. Re-optimization queue (GSC: position 4–15, impressions ≥ 500, score < 85)
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - 90);
		const startStr = startDate.toISOString().split('T')[0];

		const { data: perfRows } = await supabase
			.from('performance_data')
			.select('page, clicks, impressions, position')
			.eq('site_id', siteId)
			.gte('date', startStr);

		if (perfRows && perfRows.length > 0) {
			// Aggregate by page
			const byPage = new Map<
				string,
				{ clicks: number; impressions: number; position: number; count: number }
			>();
			for (const r of perfRows as { page: string; clicks: number; impressions: number; position: number }[]) {
				const existing = byPage.get(r.page);
				if (existing) {
					existing.clicks += r.clicks;
					existing.impressions += r.impressions;
					existing.position = (existing.position + r.position) / 2;
					existing.count++;
				} else {
					byPage.set(r.page, {
						clicks: r.clicks,
						impressions: r.impressions,
						position: r.position,
						count: 1
					});
				}
			}

			const { data: siteRow } = await supabase
				.from('sites')
				.select('url')
				.eq('id', siteId)
				.single();
			const siteUrl = (siteRow as { url?: string } | null)?.url ?? null;

			const { data: allPages } = await supabase
				.from('pages')
				.select('id, published_url, title, seo_score')
				.eq('site_id', siteId);

			const pagesWithUrl = (allPages ?? []).map((p) => ({
				id: p.id,
				published_url: (p as { published_url?: string }).published_url ?? null
			}));

			const reOptCandidates: Array<{
				url: string;
				impressions: number;
				position: number;
				pageId: string;
				title: string;
				seoScore: number | null;
			}> = [];

			for (const [gscUrl, agg] of byPage) {
				if (agg.position >= 4 && agg.position <= 15 && agg.impressions >= 500) {
					const pageId = findPageIdForGscUrl(gscUrl, pagesWithUrl, siteUrl);
					const meta = (allPages ?? []).find((p) => p.id === pageId) as
						| { id: string; title: string; seo_score: number | null }
						| undefined;
					const seoScore = meta?.seo_score != null ? Number(meta.seo_score) : null;
					if (seoScore == null || seoScore < 85) {
						reOptCandidates.push({
							url: gscUrl,
							impressions: agg.impressions,
							position: agg.position,
							pageId: pageId ?? '',
							title: meta?.title ?? gscUrl,
							seoScore
						});
					}
				}
			}

			reOptCandidates.sort((a, b) => b.impressions - a.impressions);
			for (const c of reOptCandidates.slice(0, 2)) {
				if (c.pageId) {
					items.push({
						id: `reopt-${c.pageId}`,
						title: `Re-optimize: ${c.title}`,
						description: `Ranking #${Math.round(c.position)} with ${c.impressions.toLocaleString()} impressions. Score ${c.seoScore ?? '?'}/115 — improve to climb.`,
						category: 'high',
						actionUrl: `/workspace/${c.pageId}`,
						actionLabel: 'Open in workspace',
						score: 85 + Math.min(10, Math.log10(c.impressions))
					});
				}
			}
		}

		// 4. Incomplete clusters
		const { data: clusters } = await supabase
			.from('clusters')
			.select('id, title, target_keyword')
			.eq('site_id', siteId)
			.order('created_at', { ascending: false });

		if (clusters) {
			for (const c of clusters) {
				const { count: total } = await supabase
					.from('pages')
					.select('id', { count: 'exact', head: true })
					.eq('cluster_id', c.id);
				const { count: completed } = await supabase
					.from('pages')
					.select('id', { count: 'exact', head: true })
					.eq('cluster_id', c.id)
					.in('status', ['published', 'draft']);
				const totalNum = total ?? 0;
				const completedNum = completed ?? 0;
				if (totalNum > 0 && completedNum < totalNum) {
					items.push({
						id: `cluster-incomplete-${c.id}`,
						title: `Continue cluster: ${c.title}`,
						description: `${completedNum} of ${totalNum} pieces complete.`,
						category: 'medium',
						actionUrl: `/clusters/${c.id}`,
						actionLabel: 'Open cluster',
						score: 50 + (totalNum - completedNum) * 5
					});
				}
			}
		}

		// 5. Topics ready to start (achievable, not active)
		const { data: topics } = await supabase
			.from('topics')
			.select('id, title, cluster_id')
			.eq('site_id', siteId)
			.eq('authority_fit', 'achievable')
			.neq('status', 'active')
			.limit(5);

		const readyTopics = (topics ?? []).filter((t) => !t.cluster_id);
		if (readyTopics.length > 0) {
			items.push({
				id: 'start-cluster',
				title: 'Start a topic cluster',
				description: `${readyTopics.length} achievable topic${readyTopics.length !== 1 ? 's' : ''} ready on Strategy.`,
				category: 'keep_going',
				actionUrl: '/strategy',
				actionLabel: 'Go to Strategy',
				score: 30
			});
		}

		// 6. No cluster yet
		if ((clusters?.length ?? 0) === 0 && readyTopics.length === 0) {
			items.push({
				id: 'get-strategy',
				title: 'Get your topic strategy',
				description: 'Complete onboarding or add topics on Strategy to begin.',
				category: 'keep_going',
				actionUrl: '/strategy',
				actionLabel: 'Strategy',
				score: 20
			});
		}

		// 7. Cluster complete — add internal links
		if (clusters) {
			for (const c of clusters) {
				const { count: total } = await supabase
					.from('pages')
					.select('id', { count: 'exact', head: true })
					.eq('cluster_id', c.id);
				const { count: completed } = await supabase
					.from('pages')
					.select('id', { count: 'exact', head: true })
					.eq('cluster_id', c.id)
					.in('status', ['published', 'draft']);
				if ((total ?? 0) > 0 && (completed ?? 0) >= (total ?? 0)) {
					items.push({
						id: `cluster-links-${c.id}`,
						title: `Add internal links: ${c.title}`,
						description: 'All pieces written. Connect them with internal links.',
						category: 'keep_going',
						actionUrl: `/clusters/${c.id}`,
						actionLabel: 'Open cluster',
						score: 25
					});
					break; // only one
				}
			}
		}

		// S2-16: Publishing cadence (O3)
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
		const { count: publishedThisMonth } = await supabase
			.from('pages')
			.select('id', { count: 'exact', head: true })
			.eq('site_id', siteId)
			.eq('status', 'published')
			.gte('updated_at', startOfMonth);

		const stage: 1 | 2 | 3 | 4 = siteDa >= 30 ? 4 : siteDa >= 20 ? 3 : siteDa >= 10 ? 2 : 1;
		const cadenceConfig = CADENCE_BY_STAGE[stage] ?? CADENCE_BY_STAGE[1];
		const rec = cadenceConfig ?? { min: 2, max: 4 };
		const pubCount = publishedThisMonth ?? 0;
		const stageLabels: Record<number, string> = {
			1: 'Getting Started',
			2: 'Trust Building',
			3: 'Building Momentum',
			4: 'Full Authority'
		};

		const cadence: PublishingCadence = {
			stage,
			stageLabel: stageLabels[stage] ?? 'Getting Started',
			recommendedMin: rec.min,
			recommendedMax: rec.max,
			publishedThisMonth: pubCount,
			onTrack: pubCount >= rec.min,
			message:
				pubCount >= rec.min
					? `On track — ${pubCount} published this month (aim for ${rec.min}–${rec.max})`
					: `Aim for ${rec.min}–${rec.max} pieces this month. You've published ${pubCount}.`
		};

		// Add cadence item when behind (avoid showing first week of month)
		if (!cadence.onTrack && now.getDate() >= 10 && rec.min > 0) {
			items.push({
				id: 'cadence-behind',
				title: 'Publish more content this month',
				description: cadence.message,
				category: 'medium',
				actionUrl: '/strategy',
				actionLabel: 'Start a cluster',
				score: 55
			});
		}

		// Sort by score desc, take max 6, dedupe by id
		const seen = new Set<string>();
		const sorted = items
			.filter((i) => {
				if (seen.has(i.id)) return false;
				seen.add(i.id);
				return true;
			})
			.sort((a, b) => b.score - a.score)
			.slice(0, MAX_ITEMS);

		res.json({ items: sorted, cadence });
	} catch (err) {
		console.error('[PriorityStack] Error:', err);
		res.status(500).json({ error: 'Internal server error' });
	}
};
