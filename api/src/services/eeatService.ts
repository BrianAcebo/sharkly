/**
 * EEAT Service — S1-3
 * 10-item scored checklist across Expertise, Experience, Authoritativeness, Trustworthiness.
 * See docs/product-gaps-master.md V1.1
 */

import { supabase } from '../utils/supabaseClient.js';

export type EEATItemStatus = 'pass' | 'fail' | 'skipped';

export interface EEATChecklistItem {
	status: EEATItemStatus;
	evidence?: string;
	fix?: string;
}

export interface EEATChecklistResult {
	evaluated_at: string;
	score: number;
	max_score: number;
	items: Record<string, EEATChecklistItem>;
}

const EEAT_ITEMS: Record<
	string,
	{ weight: number; label: string; fix: string; dimension: 'expertise' | 'experience' | 'authoritativeness' | 'trustworthiness' }
> = {
	// EXPERTISE
	author_bio_on_articles: {
		weight: 10,
		label: 'Author bio with credentials on article pages',
		fix: "Add an author bio to your blog posts showing who wrote them and why they're qualified.",
		dimension: 'expertise'
	},
	expert_vocabulary_present: {
		weight: 8,
		label: 'Expert-level vocabulary and entity coverage',
		fix: "Your content needs more industry-specific terminology. Use the brief's entity list.",
		dimension: 'expertise'
	},

	// EXPERIENCE
	first_hand_signals: {
		weight: 8,
		label: 'First-hand experience signals in content',
		fix: 'Add specific examples from your own work — client stories, before/after scenarios, lessons from real jobs.',
		dimension: 'experience'
	},

	// AUTHORITATIVENESS
	about_page_exists: {
		weight: 8,
		label: 'About page with real team information',
		fix: 'Create an About page that describes your team, history, and credentials — not just marketing copy.',
		dimension: 'authoritativeness'
	},
	brand_search_ratio: {
		weight: 6,
		label: 'Brand search volume tracked',
		fix: "Your brand isn't being searched for enough. Focus on activities that build name recognition.",
		dimension: 'authoritativeness'
	},
	third_party_reviews_linked: {
		weight: 8,
		label: 'Third-party reviews present or linked',
		fix: 'Link to your Google reviews or embed a review widget. Third-party reviews are a trust signal.',
		dimension: 'authoritativeness'
	},

	// TRUSTWORTHINESS
	contact_page_exists: {
		weight: 6,
		label: 'Contact page with real contact methods',
		fix: 'Add a contact page with a phone number, email, or address — not just a form.',
		dimension: 'trustworthiness'
	},
	privacy_policy_exists: {
		weight: 5,
		label: 'Privacy policy and Terms of Service',
		fix: 'Add a privacy policy page. Google uses this as a basic trustworthiness signal.',
		dimension: 'trustworthiness'
	},
	ssl_enforced: {
		weight: 5,
		label: 'SSL certificate (https://)',
		fix: 'Your site is not using HTTPS. This is a direct ranking factor and a basic trust requirement.',
		dimension: 'trustworthiness'
	},
	citations_to_sources: {
		weight: 4,
		label: 'Citations to authoritative external sources',
		fix: 'Link to at least one high-authority external source relevant to your topic.',
		dimension: 'trustworthiness'
	}
};

function pathMatches(url: string, patterns: string[]): boolean {
	try {
		const u = new URL(url);
		const path = u.pathname.toLowerCase();
		return patterns.some((p) => path.includes(p));
	} catch {
		return false;
	}
}

export class EEATService {
	async evaluateSite(siteId: string): Promise<EEATChecklistResult> {
		const evaluated_at = new Date().toISOString();
		const items: Record<string, EEATChecklistItem> = {};
		let score = 0;
		let max_score = 0;

		// Load site
		const { data: site, error: siteErr } = await supabase
			.from('sites')
			.select('id, name, url, author_bio, google_review_count, gbp_url')
			.eq('id', siteId)
			.single();

		if (siteErr || !site) {
			throw new Error('Site not found');
		}

		const baseUrl = (site.url || '').trim() || 'https://example.com';
		const siteName = (site.name || '').trim();
		const firstWord = siteName.toLowerCase().split(/\s+/)[0] || '';

		// Load crawled URLs from latest completed crawl
		let crawledUrls: string[] = [];
		const { data: latestCrawl } = await supabase
			.from('crawl_history')
			.select('crawled_urls')
			.eq('site_id', siteId)
			.eq('status', 'completed')
			.order('end_time', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (latestCrawl?.crawled_urls && Array.isArray(latestCrawl.crawled_urls)) {
			crawledUrls = latestCrawl.crawled_urls as string[];
		}

		// Fallback: get distinct affected_url from technical_issues if no crawled_urls
		if (crawledUrls.length === 0) {
			const { data: issues } = await supabase
				.from('technical_issues')
				.select('affected_url')
				.eq('site_id', siteId);
			const unique = new Set<string>();
			(issues ?? []).forEach((i) => {
				if (i.affected_url && i.affected_url !== 'site-wide') unique.add(i.affected_url);
			});
			crawledUrls = Array.from(unique);
		}

		// Brand search volume (performance_data) — also for S1-10 ratio
		let brandClicksTotal = 0;
		const brandClicksByDate: Array<{ date: string; clicks: number }> = [];
		if (firstWord) {
			const ninetyDaysAgo = new Date();
			ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
			const { data: perfData } = await supabase
				.from('performance_data')
				.select('date, clicks')
				.eq('site_id', siteId)
				.gte('date', ninetyDaysAgo.toISOString().slice(0, 10))
				.ilike('query', `%${firstWord}%`);
			for (const r of perfData ?? []) {
				const clicks = r.clicks ?? 0;
				brandClicksTotal += clicks;
				if (r.date) brandClicksByDate.push({ date: r.date, clicks });
			}
		}

		// S1-10: Brand search ratio — fail if links growing 3x faster than brand (V1.2f)
		let brandSearchRatioWarning: string | null = null;
		const { data: blHistory } = await supabase
			.from('site_backlink_history')
			.select('recorded_at, referring_domains')
			.eq('site_id', siteId)
			.order('recorded_at', { ascending: true })
			.limit(13);
		if (
			(blHistory ?? []).length >= 2 &&
			brandClicksByDate.length >= 4
		) {
			const blSorted = (blHistory ?? []).sort(
				(a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
			);
			const brandByWeek = new Map<string, number>();
			for (const { date, clicks } of brandClicksByDate) {
				const d = new Date(date);
				const monday = new Date(d);
				monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
				const key = monday.toISOString().slice(0, 10);
				brandByWeek.set(key, (brandByWeek.get(key) ?? 0) + clicks);
			}
			const brandWeeks = Array.from(brandByWeek.entries()).sort(([a], [b]) => a.localeCompare(b));
			const weeks = Math.min(blSorted.length - 1, brandWeeks.length, 8);
			if (weeks >= 2) {
				const brandSlope =
					(brandWeeks[brandWeeks.length - 1][1] - brandWeeks[0][1]) / weeks;
				const linkSlope =
					(blSorted[blSorted.length - 1].referring_domains - blSorted[0].referring_domains) / weeks;
				const brandRate = Math.max(brandSlope, 0.1);
				const linkRate = Math.max(linkSlope, 0);
				const ratio = linkRate / brandRate;
				if (ratio > 3) {
					brandSearchRatioWarning =
						'Your backlinks are growing much faster than brand search volume — this can look like artificial link building. Focus on activities that grow both: press, podcasts, social, community.';
				}
			}
		}

		// Evaluate each item
		for (const [key, meta] of Object.entries(EEAT_ITEMS)) {
			max_score += meta.weight;
			let status: EEATItemStatus = 'fail';
			let evidence: string | undefined;
			let customFix: string | undefined;

			switch (key) {
				case 'author_bio_on_articles':
					status = site.author_bio && site.author_bio.trim().length > 0 ? 'pass' : 'fail';
					if (status === 'pass') evidence = 'Author bio configured in site settings.';
					break;

				case 'expert_vocabulary_present':
					// No entity_coverage in Sharkly yet — skip
					status = 'skipped';
					evidence = 'Requires entity coverage data (coming soon).';
					break;

				case 'first_hand_signals':
					// No IGS first_hand_experience in Sharkly yet — skip
					status = 'skipped';
					evidence = 'Requires IGS experience signals (coming soon).';
					break;

				case 'about_page_exists':
					status = crawledUrls.some((u) => pathMatches(u, ['/about', '/about-us', '/about_us'])) ? 'pass' : 'fail';
					if (status === 'pass') evidence = 'About page detected in crawled URLs.';
					break;

				case 'brand_search_ratio':
					if (brandSearchRatioWarning) {
						status = 'fail';
						customFix = brandSearchRatioWarning;
						evidence = 'Links growing 3x+ faster than brand searches.';
					} else {
						status = brandClicksTotal > 0 ? 'pass' : 'fail';
						if (status === 'pass')
							evidence = `Brand searches: ${brandClicksTotal} clicks in last 90 days.`;
					}
					break;

				case 'third_party_reviews_linked':
					// S1-5: Pass if Google reviews configured or GBP URL set
					const hasReviews =
						(site.google_review_count != null && site.google_review_count > 0) ||
						(site.gbp_url && String(site.gbp_url).trim().length > 0);
					status = hasReviews ? 'pass' : 'fail';
					if (status === 'pass')
						evidence =
							site.google_review_count > 0
								? `Google reviews configured (${site.google_review_count}).`
								: 'Google Business Profile URL linked.';
					break;

				case 'contact_page_exists':
					status = crawledUrls.some((u) => pathMatches(u, ['/contact', '/contact-us', '/contact_us'])) ? 'pass' : 'fail';
					if (status === 'pass') evidence = 'Contact page detected in crawled URLs.';
					break;

				case 'privacy_policy_exists':
					status = crawledUrls.some((u) =>
						pathMatches(u, ['/privacy', '/privacy-policy', '/terms', '/terms-of-service'])
					)
						? 'pass'
						: 'fail';
					if (status === 'pass') evidence = 'Privacy or terms page detected in crawled URLs.';
					break;

				case 'ssl_enforced':
					status = baseUrl.toLowerCase().startsWith('https://') ? 'pass' : 'fail';
					if (status === 'pass') evidence = 'Site uses HTTPS.';
					break;

				case 'citations_to_sources':
					// No external authority link detection — skip
					status = 'skipped';
					evidence = 'Requires citation analysis (coming soon).';
					break;
			}

			if (status === 'pass') score += meta.weight;

			items[key] = {
				status,
				...(evidence && { evidence }),
				...(status === 'fail' && { fix: customFix ?? meta.fix })
			};
		}

		// Attach labels to items for UI
		const itemsWithLabels: Record<string, EEATChecklistItem & { label?: string }> = {};
		for (const [key, item] of Object.entries(items)) {
			itemsWithLabels[key] = { ...item, label: EEAT_ITEMS[key].label };
		}

		const checklist: EEATChecklistResult = {
			evaluated_at,
			score,
			max_score,
			items: itemsWithLabels
		};

		// Score 0-100 for display
		const eeatScore = max_score > 0 ? Math.round((score / max_score) * 100) : 0;

		// Persist to sites
		await supabase
			.from('sites')
			.update({
				eeat_score: eeatScore,
				eeat_checklist: checklist as unknown as object,
				updated_at: evaluated_at
			})
			.eq('id', siteId);

		return checklist;
	}
}

export const eeatService = new EEATService();
