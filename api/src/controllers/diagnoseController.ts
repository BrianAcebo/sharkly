/**
 * S2-15: SEO Decision Tree — "Diagnose This Page" (V1.5)
 * GET /api/pages/:pageId/diagnose
 *
 * 7-step diagnostic: indexation → ranking → intent → content → authority → CTR → GroupMod
 * Returns primary diagnosis + first action.
 */

import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';

function normalizePath(url: string): string {
	if (!url || typeof url !== 'string') return '';
	const lower = url.trim().toLowerCase();
	const withoutProtocol = lower.replace(/^https?:\/\//, '');
	const pathOnly = withoutProtocol.replace(/^[^/]+/, '') || withoutProtocol;
	return pathOnly.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/') || pathOnly;
}

function urlMatches(pageUrl: string | null, affectedUrl: string): boolean {
	if (!affectedUrl) return false;
	const pagePath = normalizePath(pageUrl ?? '');
	const affectedPath = normalizePath(affectedUrl);
	if (pagePath === affectedPath) return true;
	if (affectedPath.endsWith('/' + pagePath) || pagePath.endsWith('/' + affectedPath)) return true;
	return false;
}

/** Expected CTR by position (approximate) — for step 6 */
const EXPECTED_CTR_BY_POSITION: Record<number, number> = {
	1: 28, 2: 15, 3: 11, 4: 8, 5: 6, 6: 5, 7: 4, 8: 3.5, 9: 3, 10: 2.5
};

function getExpectedCtr(position: number): number {
	if (position <= 0) return 0;
	const rounded = Math.round(position);
	return EXPECTED_CTR_BY_POSITION[rounded] ?? Math.max(1, 30 / Math.sqrt(rounded));
}

export async function diagnosePage(req: Request, res: Response): Promise<void> {
	try {
		const userId = req.user?.id;
		if (!userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const pageId = req.params.id;
		if (!pageId) {
			res.status(400).json({ error: 'pageId required' });
			return;
		}

		// 1. Fetch page + site + org
		const { data: page, error: pageErr } = await supabase
			.from('pages')
			.select(
				'id, site_id, cluster_id, title, keyword, published_url, seo_score, cro_checklist, status, type'
			)
			.eq('id', pageId)
			.single();

		if (pageErr || !page) {
			res.status(404).json({ error: 'Page not found' });
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
			.select('id, url, organization_id')
			.eq('id', page.site_id)
			.eq('organization_id', userOrg.organization_id)
			.single();

		if (siteErr || !site) {
			res.status(404).json({ error: 'Site not found' });
			return;
		}

		const { data: org } = await supabase
			.from('organizations')
			.select('da_estimate')
			.eq('id', site.organization_id)
			.single();

		const siteDa = org?.da_estimate ?? 20;
		const pageUrl = page.published_url ?? (site?.url ? `${site.url.replace(/\/$/, '')}/${page.keyword?.replace(/\s+/g, '-').toLowerCase()}` : null);

		// 2. Technical issues for this page URL
		const { data: allIssues } = await supabase
			.from('technical_issues')
			.select('issue_type, severity, description, affected_url')
			.eq('site_id', page.site_id)
			.eq('resolved', false);

		const pageIssueList = (allIssues ?? []).filter((i) =>
			urlMatches(pageUrl, i.affected_url ?? '')
		);

		// 3. GSC/performance data for this page
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - 28);
		const startStr = startDate.toISOString().split('T')[0];

		const { data: perfRows } = await supabase
			.from('performance_data')
			.select('page, clicks, impressions, ctr, position')
			.eq('site_id', page.site_id)
			.gte('date', startStr);

		const pagePerf = (perfRows ?? []).filter((r) => {
			const gscPath = normalizePath(r.page);
			const ourPath = normalizePath(pageUrl ?? '');
			return gscPath === ourPath || gscPath.endsWith('/' + ourPath) || ourPath.endsWith('/' + gscPath);
		});

		const totalImpressions = pagePerf.reduce((s, r) => s + (r.impressions ?? 0), 0);
		const totalClicks = pagePerf.reduce((s, r) => s + (r.clicks ?? 0), 0);
		const avgPosition =
			pagePerf.length > 0
				? pagePerf.reduce((s, r) => s + (parseFloat(String(r.position)) || 0), 0) / pagePerf.length
				: null;
		const actualCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : null;

		// 4. Crawl history IGS health
		const { data: latestCrawl } = await supabase
			.from('crawl_history')
			.select('igs_health')
			.eq('site_id', page.site_id)
			.order('end_time', { ascending: false })
			.limit(1)
			.maybeSingle();

		const igsHealth = latestCrawl?.igs_health as
			| { status?: string; ratio?: number; message?: string }
			| null
			| undefined;

		// 5. CRO checklist funnel mismatch
		const croChecklist = page.cro_checklist as { funnel_mismatch?: string } | null | undefined;
		const funnelMismatch = croChecklist?.funnel_mismatch ?? null;

		// --- Run 7-step decision tree ---
		const steps: Array<{ step: number; name: string; passed: boolean; message: string }> = [];
		let primaryDiagnosis: string | null = null;
		let firstAction: string | null = null;

		// Step 1: Indexation
		const hasIndexIssue = pageIssueList.some(
			(i) =>
				i.issue_type === 'noindex' ||
				i.issue_type === 'page_4xx' ||
				i.issue_type === 'page_5xx' ||
				i.issue_type === 'meta_refresh_redirect'
		);
		const indexPassed = !hasIndexIssue;
		if (hasIndexIssue) {
			const noindex = pageIssueList.find((i) => i.issue_type === 'noindex');
			const err4xx = pageIssueList.find((i) => i.issue_type === 'page_4xx' || i.issue_type === 'page_5xx');
			primaryDiagnosis =
				noindex
					? 'This page is set to not appear in Google'
					: err4xx
						? 'This page returns an error — Google cannot index it'
						: 'Indexation problem — Google may not be showing this page';
			firstAction =
				noindex
					? "Remove the noindex from your page's meta robots tag"
					: "Fix the server error or redirect so the page returns 200 OK";
		}
		steps.push({
			step: 1,
			name: 'Indexation',
			passed: indexPassed,
			message: indexPassed
				? 'Page appears indexable (no noindex or critical crawl issues)'
				: primaryDiagnosis ?? 'Check indexation in Technical audit'
		});

		if (!indexPassed) {
			res.json({
				steps,
				primaryDiagnosis: primaryDiagnosis ?? 'Indexation problem',
				firstAction: firstAction ?? 'Fix indexation before other steps',
				pageTitle: page.title
			});
			return;
		}

		// Step 2: Ranking position
		const hasGscData = avgPosition != null && totalImpressions > 0;
		const notRanking = hasGscData && (avgPosition == null || avgPosition > 50 || totalImpressions < 5);
		const rankingPassed = !notRanking || !hasGscData;
		if (hasGscData && notRanking) {
			if (totalImpressions < 5) {
				primaryDiagnosis = 'This page gets almost no visibility in Google';
				firstAction =
					'Check that the page matches the keyword and intent. If it is new, wait for Google to recrawl — or improve internal links to help Google find it.';
			} else if (avgPosition != null && avgPosition > 50) {
				primaryDiagnosis = 'Page ranks in positions 50+ — authority or content gap';
				firstAction =
					'If your site is newer, focus on link building. If your site has authority, improve content depth and relevance to outrank competitors.';
			}
		}
		steps.push({
			step: 2,
			name: 'Ranking position',
			passed: rankingPassed,
			message: rankingPassed
				? hasGscData
					? `Page is ranking (avg position ~${Math.round(avgPosition ?? 0)}, ${totalImpressions} impressions)`
					: 'No GSC data yet — connect Search Console to see position'
				: primaryDiagnosis ?? 'Low or no visibility'
		});

		if (!rankingPassed && primaryDiagnosis) {
			res.json({
				steps,
				primaryDiagnosis,
				firstAction: firstAction ?? 'Improve visibility',
				pageTitle: page.title
			});
			return;
		}

		// Step 3: Intent match
		const intentPassed = !funnelMismatch;
		if (funnelMismatch) {
			primaryDiagnosis = 'Content format does not match what ranks for this keyword';
			firstAction =
				'Check what content types rank in Google for your keyword. If guides rank and you have a product page (or vice versa), consider creating content that matches.';
		}
		steps.push({
			step: 3,
			name: 'Intent match',
			passed: intentPassed,
			message: intentPassed
				? 'Page format matches the expected intent for this keyword'
				: funnelMismatch ?? 'Funnel mismatch'
		});

		if (!intentPassed) {
			res.json({
				steps,
				primaryDiagnosis: primaryDiagnosis ?? 'Intent mismatch',
				firstAction: firstAction ?? 'Align content with search intent',
				pageTitle: page.title
			});
			return;
		}

		// Step 4: Content quality (UPSA)
		const upsa = page.seo_score ?? 0;
		const contentPassed = upsa >= 70;
		if (!contentPassed && upsa > 0) {
			primaryDiagnosis = `Content score is ${upsa}/100 — below the 70 target`;
			firstAction =
				'Improve headings, word count, and originality. Add question-format H2s, cover key entities, and include unique insights or data.';
		}
		steps.push({
			step: 4,
			name: 'Content quality',
			passed: contentPassed,
			message: contentPassed
				? `Content score ${upsa}/100 — competitive`
				: upsa > 0
					? `Content score ${upsa}/100 — improve to 70+`
					: 'Run SEO score to see content gaps'
		});

		if (!contentPassed && upsa > 0) {
			res.json({
				steps,
				primaryDiagnosis: primaryDiagnosis ?? 'Content quality gap',
				firstAction: firstAction ?? 'Improve content',
				pageTitle: page.title
			});
			return;
		}

		// Step 5: Domain authority (simplified — we don't have competitor DA without extra API)
		const authorityPassed = siteDa >= 25;
		if (!authorityPassed) {
			primaryDiagnosis = `Your site's authority (${siteDa}) may be too low to compete for this keyword`;
			firstAction =
				'Focus on earning links before publishing more content. Publishing alone rarely works when your site has fewer links than competitors.';
		}
		steps.push({
			step: 5,
			name: 'Site authority',
			passed: authorityPassed,
			message: authorityPassed
				? `Site authority ${siteDa} — likely sufficient`
				: `Site authority ${siteDa} — consider link building first`
		});

		if (!authorityPassed) {
			res.json({
				steps,
				primaryDiagnosis: primaryDiagnosis ?? 'Authority gap',
				firstAction: firstAction ?? 'Build links',
				pageTitle: page.title
			});
			return;
		}

		// Step 6: CTR / user behavior
		const pos = avgPosition != null ? Math.round(avgPosition) : 0;
		const expectedCtr = getExpectedCtr(pos);
		const ctrPassed =
			!hasGscData || actualCtr == null || actualCtr >= expectedCtr * 0.5; // Allow 50% of expected
		if (hasGscData && actualCtr != null && expectedCtr > 0 && actualCtr < expectedCtr * 0.5) {
			primaryDiagnosis = 'Low click-through rate — your title and description may not stand out';
			firstAction =
				'Improve your meta title and description to better match search intent and encourage clicks. Use the meta optimizer in this workspace.';
		}
		steps.push({
			step: 6,
			name: 'Click-through rate',
			passed: ctrPassed,
			message: ctrPassed
				? hasGscData && actualCtr != null
					? `CTR ${actualCtr.toFixed(1)}% — in line with position`
					: 'No GSC data — connect Search Console to check CTR'
				: `CTR ${actualCtr?.toFixed(1) ?? 0}% vs expected ~${expectedCtr}% for position ${pos}`
		});

		if (!ctrPassed) {
			res.json({
				steps,
				primaryDiagnosis: primaryDiagnosis ?? 'CTR problem',
				firstAction: firstAction ?? 'Improve title and description',
				pageTitle: page.title
			});
			return;
		}

		// Step 7: GroupModificationFactor (site-level quality)
		const gmfOk =
			!igsHealth || igsHealth.status === 'good' || (igsHealth.ratio ?? 0) <= 0.3;
		const gmfPassed = gmfOk;
		if (!gmfPassed) {
			primaryDiagnosis = 'Site-level quality may be limiting this page';
			firstAction =
				igsHealth?.message ??
				'Add original content across your site — research, data, or firsthand experience. Too many thin or generic pages can hold back every page.';
		}
		steps.push({
			step: 7,
			name: 'Site quality signal',
			passed: gmfPassed,
			message: gmfPassed
				? 'Site quality looks fine'
				: igsHealth?.message ?? 'Review site-wide content quality in Technical audit'
		});

		if (!gmfPassed) {
			res.json({
				steps,
				primaryDiagnosis: primaryDiagnosis ?? 'Site quality issue',
				firstAction: firstAction ?? 'Improve site-wide content',
				pageTitle: page.title
			});
			return;
		}

		// All passed
		res.json({
			steps,
			primaryDiagnosis: 'No major issues found',
			firstAction:
				'Keep monitoring. Small improvements to title, content freshness, or internal links can help over time.',
			pageTitle: page.title
		});
	} catch (err) {
		console.error('[Diagnose] Error:', err);
		res.status(500).json({
			error: err instanceof Error ? err.message : 'Diagnosis failed'
		});
	}
}
