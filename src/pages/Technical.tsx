/**
 * Technical SEO Page
 * Health score · SPA detection · Thematic reports · Grouped issues with URLs
 */

import React, { useState, useEffect, useCallback } from 'react';
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { AIInsightBlock } from '../components/shared/AIInsightBlock';
import { Button } from '../components/ui/button';
import { WalletDepositModal } from '../components/billing/WalletDepositModal';
import { useSiteContext } from '../contexts/SiteContext';
import useAuth from '../hooks/useAuth';
import { useOrganization } from '../hooks/useOrganization';
import { supabase } from '../utils/supabaseClient';
import {
	Wrench,
	AlertTriangle,
	Loader2,
	RefreshCw,
	Plus,
	ChevronDown,
	ChevronRight,
	Clock,
	ExternalLink,
	Globe,
	Shield,
	Zap,
	Link2,
	Code2,
	Tag,
	FileText,
	CheckCircle2,
	TrendingUp,
	TrendingDown,
	Minus,
	Search,
	Award,
	Download
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { CREDIT_COSTS } from '../lib/credits';
import { TierGate } from '../components/common/TierGate';
import { LawTooltip } from '../components/shared/LawTooltip';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TechnicalIssue {
	id: string;
	issue_type: string;
	severity: 'critical' | 'warning' | 'info';
	affected_url: string;
	description: string;
	recommendation: string;
	resolved: boolean;
	crawl_date: string;
}

interface CrawlMeta {
	pages_scanned: number;
	avg_response_time_ms: number;
	end_time: string;
	duration_seconds: number;
	status: string;
}

/** S2-4: IGS domain-level health (product-gaps V1.2c) */
interface IgsHealth {
	ratio: number;
	status: 'critical' | 'warning' | 'good';
	message: string;
	lowCount: number;
	substantialCount: number;
}

interface CrawlResults {
	total: number;
	critical: number;
	warnings: number;
	info: number;
	healthScore: number;
	isSPA: boolean;
	spaFramework: string | null;
	hasCWVData: boolean;
	cwvSummary: Array<{ type: string; description: string }>;
	igsHealth: IgsHealth | null;
	crawlMeta: CrawlMeta | null;
	issues: TechnicalIssue[];
	byType: Record<string, number>;
	bySeverity: {
		critical: TechnicalIssue[];
		warnings: TechnicalIssue[];
		info: TechnicalIssue[];
	};
}

interface CrawlabilityIssue {
	type: 'critical' | 'warning';
	title: string;
	message: string;
	solution: string;
}

// ─── Brand Search Panel ───────────────────────────────────────────────────────

interface BrandWeekPoint {
	week: string; // ISO date (Monday)
	brandClicks: number;
	brandImpressions: number;
}

interface BacklinkPoint {
	week: string; // ISO date
	referringDomains: number;
}

type BrandStatus = 'healthy' | 'growing' | 'declining';

type RatioStatus = 'healthy' | 'amber' | 'warning';

/** S1-10 + S2-6: Links growing 3x faster than brand searches = warning (V1.2f) */
function getBrandSearchRatioStatus(
	brandPoints: BrandWeekPoint[],
	backlinkPoints: BacklinkPoint[]
): { status: RatioStatus; message: string; ratio: number | null } {
	if (brandPoints.length < 4 || backlinkPoints.length < 2) {
		return { status: 'healthy', message: 'Need more data to calculate ratio.', ratio: null };
	}

	const weeks = Math.min(brandPoints.length, backlinkPoints.length, 13);
	const brandSlope =
		weeks >= 2
			? (brandPoints[brandPoints.length - 1].brandClicks - brandPoints[brandPoints.length - weeks].brandClicks) /
				weeks
			: 0;
	const linkSlope =
		weeks >= 2
			? (backlinkPoints[backlinkPoints.length - 1].referringDomains -
					backlinkPoints[Math.max(0, backlinkPoints.length - weeks)].referringDomains) /
				weeks
			: 0;

	const brandGrowthRate = Math.max(brandSlope, 0.1); // avoid div by zero
	const backlinkGrowthRate = Math.max(linkSlope, 0);
	const ratio = backlinkGrowthRate / brandGrowthRate;

	if (ratio > 3) {
		return {
			status: 'warning',
			message:
				"Your backlinks are growing much faster than people searching for your brand. Google may think the links are bought rather than earned. Grow both together: get press mentions, appear on podcasts, and build your social presence.",
			ratio
		};
	}
	if (ratio > 1.5) {
		return {
			status: 'amber',
			message: 'Links are growing faster than brand searches — keep an eye on this.',
			ratio
		};
	}
	return {
		status: 'healthy',
		message: 'Your links and brand searches are growing together.',
		ratio
	};
}

function getBrandStatus(
	brandPoints: BrandWeekPoint[],
	backlinkPoints: BacklinkPoint[]
): BrandStatus {
	if (brandPoints.length < 4 || backlinkPoints.length < 2) return 'healthy';

	const { status } = getBrandSearchRatioStatus(brandPoints, backlinkPoints);
	if (status === 'warning') return 'declining';

	// Compute 4-week trend slope for brand clicks
	const recent = brandPoints.slice(-4).map((p) => p.brandClicks);
	const n = recent.length;
	const sumX = (n * (n - 1)) / 2;
	const sumY = recent.reduce((a, b) => a + b, 0);
	const sumXY = recent.reduce((s, y, x) => s + x * y, 0);
	const sumX2 = recent.reduce((s, _, x) => s + x * x, 0);
	const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

	const latestBrand = brandPoints[brandPoints.length - 1]?.brandClicks ?? 0;
	const prevBrand = brandPoints[brandPoints.length - 5]?.brandClicks ?? latestBrand;
	const latestLinks = backlinkPoints[backlinkPoints.length - 1]?.referringDomains ?? 1;
	const prevLinks = backlinkPoints[0]?.referringDomains ?? latestLinks;
	const ratioNow = latestLinks > 0 ? latestBrand / latestLinks : 0;
	const ratioPrev = prevLinks > 0 ? prevBrand / prevLinks : 0;

	if (ratioNow < ratioPrev * 0.85) return 'declining';
	if (slope > 1) return 'growing';
	return 'healthy';
}

function SparkLine({ points, color }: { points: number[]; color: string }) {
	if (points.length < 2)
		return <div className="h-10 w-full rounded bg-gray-100 dark:bg-gray-800" />;
	const max = Math.max(...points, 1);
	const w = 100 / (points.length - 1);
	const pts = points.map((v, i) => `${i * w},${100 - (v / max) * 100}`).join(' ');
	return (
		<svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-10 w-full">
			<polyline
				points={pts}
				fill="none"
				stroke={color}
				strokeWidth="3"
				strokeLinecap="round"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
		</svg>
	);
}

function BrandSearchPanel({
	siteId,
	projectName,
	gscConnected
}: {
	siteId: string;
	projectName: string;
	gscConnected: boolean;
}) {
	const [brandPoints, setBrandPoints] = useState<BrandWeekPoint[]>([]);
	const [backlinkPoints, setBacklinkPoints] = useState<BacklinkPoint[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!gscConnected) {
			setLoading(false);
			return;
		}

		async function load() {
			setLoading(true);
			try {
				// Branded search: keywords containing the project/brand name, last 13 weeks
				// Group daily performance_data into weekly buckets
				const thirteenWeeksAgo = new Date();
				thirteenWeeksAgo.setDate(thirteenWeeksAgo.getDate() - 91);

				const { data: perfData } = await supabase
					.from('performance_data')
					.select('date, clicks, impressions, query')
					.eq('site_id', siteId)
					.gte('date', thirteenWeeksAgo.toISOString().slice(0, 10))
					.ilike('query', `%${projectName.toLowerCase().split(' ')[0]}%`);

				// Aggregate into weeks (Monday buckets)
				const weekMap: Record<string, { clicks: number; impressions: number }> = {};
				(perfData ?? []).forEach((row) => {
					const d = new Date(row.date);
					const day = d.getDay();
					const monday = new Date(d);
					monday.setDate(d.getDate() - ((day + 6) % 7));
					const key = monday.toISOString().slice(0, 10);
					if (!weekMap[key]) weekMap[key] = { clicks: 0, impressions: 0 };
					weekMap[key].clicks += row.clicks ?? 0;
					weekMap[key].impressions += row.impressions ?? 0;
				});
				const brandWeeks: BrandWeekPoint[] = Object.entries(weekMap)
					.sort(([a], [b]) => a.localeCompare(b))
					.map(([week, v]) => ({ week, brandClicks: v.clicks, brandImpressions: v.impressions }));
				setBrandPoints(brandWeeks);

				// Backlinks from site_backlink_history (S1-10 — populated by toxic link audit)
				const { data: blHistory } = await supabase
					.from('site_backlink_history')
					.select('recorded_at, referring_domains')
					.eq('site_id', siteId)
					.order('recorded_at', { ascending: true })
					.limit(13);

				const blPoints: BacklinkPoint[] = (blHistory ?? []).map((r) => ({
					week: r.recorded_at.slice(0, 10),
					referringDomains: r.referring_domains ?? 0
				}));
				setBacklinkPoints(blPoints);
			} catch (err) {
				console.error('BrandSearchPanel load error', err);
			} finally {
				setLoading(false);
			}
		}
		load();
	}, [siteId, projectName, gscConnected]);

	const status = getBrandStatus(brandPoints, backlinkPoints);
	const ratioStatus = getBrandSearchRatioStatus(brandPoints, backlinkPoints);
	const latestBrandClicks = brandPoints[brandPoints.length - 1]?.brandClicks ?? 0;
	const latestReferringDomains = backlinkPoints[backlinkPoints.length - 1]?.referringDomains ?? 0;
	const ratio =
		latestReferringDomains > 0 ? (latestBrandClicks / latestReferringDomains).toFixed(1) : '—';

	const statusConfig = {
		healthy: {
			label: 'Healthy',
			color: 'text-green-500',
			bg: 'bg-green-500/10 border-green-500/20',
			icon: <Award className="size-4 text-green-500" />
		},
		growing: {
			label: 'Growing',
			color: 'text-blue-500',
			bg: 'bg-blue-500/10 border-blue-500/20',
			icon: <TrendingUp className="size-4 text-blue-500" />
		},
		declining: {
			label: '⚠ Ratio Declining',
			color: 'text-amber-500',
			bg: 'bg-amber-500/10 border-amber-500/20',
			icon: <TrendingDown className="size-4 text-amber-500" />
		}
	};
	const cfg = statusConfig[status];

	return (
		<div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
				<div className="flex items-center gap-2.5">
					<div className="rounded-lg bg-purple-500/10 p-1.5">
						<Search className="size-4 text-purple-500" />
					</div>
					<div>
						<p className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-white">
							Brand Search Ratio Health
							<LawTooltip lawId="brand_search_is_algorithmic" />
						</p>
						<p className="text-[11px] text-gray-500 dark:text-gray-400">
							How fast your backlinks grow vs. how often people search your brand. Both should grow together.
						</p>
					</div>
				</div>
				{!loading && gscConnected && (
					<span
						className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
							ratioStatus.ratio != null
								? ratioStatus.status === 'warning'
									? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
									: ratioStatus.status === 'amber'
										? 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400'
										: 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
								: cfg.bg + ' ' + cfg.color
						}`}
					>
						{ratioStatus.ratio != null ? (
							<>
								{ratioStatus.status === 'warning' && <AlertTriangle className="size-3.5" />}
								{ratioStatus.status === 'healthy'
									? 'Ratio healthy'
									: ratioStatus.status === 'amber'
										? 'Ratio: monitor'
										: 'Ratio at risk'}
							</>
						) : (
							<>
								{cfg.icon}
								{cfg.label}
							</>
						)}
					</span>
				)}
			</div>

			{/* Body */}
			<div className="p-5">
				{!gscConnected ? (
					<div className="flex flex-col items-center gap-2 py-8 text-center">
						<Search className="size-8 text-gray-300 dark:text-gray-600" />
						<p className="font-medium text-gray-600 dark:text-gray-400">
							Google Search Console not connected
						</p>
						<p className="max-w-sm text-sm text-gray-400 dark:text-gray-500">
							Connect GSC in Settings → Integrations to track your brand search volume and site
							authority signals.
						</p>
					</div>
				) : loading ? (
					<div className="flex items-center justify-center gap-2 py-10 text-gray-400">
						<Loader2 className="size-4 animate-spin" />
						<span className="text-sm">Loading brand signals…</span>
					</div>
				) : brandPoints.length === 0 ? (
					<div className="flex flex-col items-center gap-2 py-8 text-center">
						<Search className="size-8 text-gray-300 dark:text-gray-600" />
						<p className="font-medium text-gray-600 dark:text-gray-400">
							No branded search data yet
						</p>
						<p className="max-w-sm text-sm text-gray-400 dark:text-gray-500">
							Branded searches (queries containing "{projectName}") will appear here once GSC has
							collected enough data.
						</p>
					</div>
				) : (
					<>
						{/* S2-6: Explanation — reframed around ratio health */}
						<p className="mb-5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
							Google looks at both how many sites link to you and how often people search your brand.
							The <strong className="text-gray-700 dark:text-gray-300">ratio matters</strong>: if your backlinks grow much faster than brand searches, Google may think the links are bought. Both should grow together.
						</p>

						{/* S1-10: Ratio warning when links growing 3x faster than brand searches */}
						{ratioStatus.status !== 'healthy' && (
							<div
								className={`mb-5 rounded-lg border p-4 ${
									ratioStatus.status === 'warning'
										? 'border-amber-500/30 bg-amber-500/10 dark:border-amber-500/30 dark:bg-amber-500/10'
										: 'border-amber-500/20 bg-amber-500/5 dark:border-amber-500/20 dark:bg-amber-500/5'
								}`}
							>
								<p className="text-sm font-medium text-amber-800 dark:text-amber-200">
									{ratioStatus.status === 'warning' ? '⚠ Links outpacing brand recognition' : 'Links growing faster than brand'}
								</p>
								<p className="mt-1 text-sm text-amber-700 dark:text-amber-300">{ratioStatus.message}</p>
							</div>
						)}

						{/* Stat cards + charts */}
						<div className="grid gap-4 sm:grid-cols-2">
							{/* Brand search trend */}
							<div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
								<div className="mb-1 flex items-center justify-between">
									<p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
										Branded Searches / week
									</p>
									{brandPoints.length >= 2 &&
										(() => {
											const last = brandPoints[brandPoints.length - 1].brandClicks;
											const prev = brandPoints[brandPoints.length - 2].brandClicks;
											const diff = last - prev;
											if (diff > 0) return <TrendingUp className="size-4 text-green-500" />;
											if (diff < 0) return <TrendingDown className="size-4 text-red-400" />;
											return <Minus className="size-4 text-gray-400" />;
										})()}
								</div>
								<p className="text-2xl font-bold text-gray-900 dark:text-white">
									{latestBrandClicks.toLocaleString()}
								</p>
								<p className="mb-3 text-[11px] text-gray-400">clicks this week</p>
								<SparkLine points={brandPoints.map((p) => p.brandClicks)} color="#a855f7" />
								<div className="mt-1 flex justify-between text-[10px] text-gray-400">
									<span>{brandPoints[0]?.week?.slice(5)}</span>
									<span>{brandPoints[brandPoints.length - 1]?.week?.slice(5)}</span>
								</div>
							</div>

							{/* Backlinks / referring domains trend */}
							<div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
								<div className="mb-1 flex items-center justify-between">
									<p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
										Referring Domains
									</p>
									{backlinkPoints.length >= 2 &&
										(() => {
											const last = backlinkPoints[backlinkPoints.length - 1].referringDomains;
											const prev = backlinkPoints[0].referringDomains;
											const diff = last - prev;
											if (diff > 0) return <TrendingUp className="size-4 text-green-500" />;
											if (diff < 0) return <TrendingDown className="size-4 text-red-400" />;
											return <Minus className="size-4 text-gray-400" />;
										})()}
								</div>
								<p className="text-2xl font-bold text-gray-900 dark:text-white">
									{latestReferringDomains.toLocaleString()}
								</p>
								<p className="mb-3 text-[11px] text-gray-400">domains linking to you</p>
								{backlinkPoints.length >= 2 ? (
									<>
										<SparkLine
											points={backlinkPoints.map((p) => p.referringDomains)}
											color="#3b82f6"
										/>
										<div className="mt-1 flex justify-between text-[10px] text-gray-400">
											<span>{backlinkPoints[0]?.week?.slice(5)}</span>
											<span>{backlinkPoints[backlinkPoints.length - 1]?.week?.slice(5)}</span>
										</div>
									</>
								) : (
									<p className="text-[11px] text-gray-400 dark:text-gray-500">
										Run a Toxic Link Audit to record referring domains and enable ratio tracking.
									</p>
								)}
							</div>
						</div>

						{/* S2-6: Ratio indicator — growth rate ratio (links vs brand) reframes around ratio health */}
						<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-gray-200 px-4 py-4 dark:border-gray-700">
							<div>
									<p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
										Link growth ÷ Brand search growth
									</p>
									<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
										{ratioStatus.ratio != null
											? ratioStatus.ratio > 1
												? 'Links growing faster than brand searches = risk. Aim for similar growth.'
												: 'Links and brand searches are in balance.'
											: 'Track both over time — the ratio shows how healthy your growth is.'}
								</p>
							</div>
							<div className="flex items-baseline gap-2">
								{ratioStatus.ratio != null ? (
									<>
										<span
											className={`text-2xl font-bold ${
												ratioStatus.status === 'warning'
													? 'text-amber-600 dark:text-amber-400'
													: ratioStatus.status === 'amber'
														? 'text-amber-600 dark:text-amber-400'
														: 'text-green-600 dark:text-green-400'
											}`}
										>
											{ratioStatus.ratio.toFixed(1)}×
										</span>
										<span className="text-xs text-gray-500 dark:text-gray-400">
											{ratioStatus.ratio > 1 ? 'links faster' : 'in balance'}
										</span>
									</>
								) : (
									<span className="text-lg font-medium text-gray-400 dark:text-gray-500">—</span>
								)}
							</div>
						</div>

						{/* Level ratio (brand clicks per referring domain) — supplementary context */}
						{backlinkPoints.length >= 1 && (
							<div className="mt-3 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800/30">
								<p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
									Brand searches per site linking to you
								</p>
								<span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{ratio}×</span>
							</div>
						)}

						{/* Declining state warning */}
						{status === 'declining' && (
							<div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/8 p-4">
								<p className="mb-1 text-sm font-semibold text-amber-600 dark:text-amber-400">
									Brand searches growing slower than backlinks
								</p>
								<p className="text-xs leading-relaxed text-amber-700/80 dark:text-amber-400/70">
									Google's quality multiplier for your site is partly driven by branded search
									volume. When links grow faster than brand awareness it can indicate paid links
									without organic trust — a pattern Google's Panda algorithm is designed to detect.
								</p>
							</div>
						)}

						{/* Recommendations — improve ratio by growing brand alongside links */}
						<div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
							<p className="mb-2.5 text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
								Improve ratio health — grow brand search alongside links
							</p>
							<ul className="space-y-1.5">
								{[
									{
										icon: '📰',
										text: 'PR placements — get your brand name mentioned in industry publications'
									},
									{
										icon: '🎙️',
										text: 'Podcast appearances — say your brand name, listeners search for it later'
									},
									{
										icon: '📱',
										text: 'Social media — consistent brand name usage across platforms builds recall'
									},
									{
										icon: '✍️',
										text: 'Use your brand name naturally in all content (not just in logos)'
									},
									{
										icon: '🤝',
										text: 'Partnerships — co-marketing puts your name in front of new audiences'
									}
								].map(({ icon, text }) => (
									<li
										key={text}
										className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400"
									>
										<span className="mt-0.5 flex-shrink-0">{icon}</span>
										<span>{text}</span>
									</li>
								))}
							</ul>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

// ─── EEAT Trust & Authority Panel (S1-3) ───────────────────────────────────────

interface EEATItem {
	status: 'pass' | 'fail' | 'skipped';
	evidence?: string;
	fix?: string;
	label?: string;
}

interface EEATChecklist {
	evaluated_at: string;
	score: number;
	max_score: number;
	items: Record<string, EEATItem>;
}

function EEATTrustPanel({
	siteId,
	lastCrawlTime,
	isYMYL
}: {
	siteId: string;
	lastCrawlTime?: string | null;
	isYMYL?: boolean;
}) {
	const [data, setData] = useState<{ eeat_score: number; eeat_checklist: EEATChecklist | null } | null>(null);
	const [loading, setLoading] = useState(true);
	const [evaluating, setEvaluating] = useState(false);

	const fetchEEAT = useCallback(async (evaluate = false) => {
		try {
			const url = `/api/sites/${siteId}/eeat${evaluate ? '?evaluate=1' : ''}`;
			const res = await fetch(url, { credentials: 'include' });
			if (!res.ok) throw new Error('Failed to fetch');
			const json = await res.json();
			setData({ eeat_score: json.eeat_score ?? 0, eeat_checklist: json.eeat_checklist ?? null });
		} catch (err) {
			console.error('EEAT fetch error', err);
		} finally {
			setLoading(false);
			setEvaluating(false);
		}
	}, [siteId]);

	useEffect(() => {
		setLoading(true);
		fetchEEAT();
	}, [fetchEEAT, lastCrawlTime]);

	const checklist = data?.eeat_checklist;
	const score = data?.eeat_score ?? 0;
	const dimensionOrder: Array<'expertise' | 'experience' | 'authoritativeness' | 'trustworthiness'> = [
		'expertise',
		'experience',
		'authoritativeness',
		'trustworthiness'
	];
	const dimensionLabels: Record<string, string> = {
		expertise: 'Expertise',
		experience: 'Experience',
		authoritativeness: 'Authoritativeness',
		trustworthiness: 'Trustworthiness'
	};

	// Item key to dimension (from eeatService)
	const itemDimensions: Record<string, string> = {
		author_bio_on_articles: 'expertise',
		expert_vocabulary_present: 'expertise',
		first_hand_signals: 'experience',
		about_page_exists: 'authoritativeness',
		brand_search_ratio: 'authoritativeness',
		third_party_reviews_linked: 'authoritativeness',
		contact_page_exists: 'trustworthiness',
		privacy_policy_exists: 'trustworthiness',
		ssl_enforced: 'trustworthiness',
		citations_to_sources: 'trustworthiness'
	};

	return (
		<div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
			<div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
				<div className="flex items-center gap-2.5">
					<div className="rounded-lg bg-purple-500/10 p-1.5">
						<Shield className="size-4 text-purple-500" />
					</div>
					<div>
						<p className="font-semibold text-gray-900 dark:text-white">Trust & Authority (EEAT)</p>
						<p className="text-[11px] text-gray-500 dark:text-gray-400">
							10-item checklist across Expertise, Experience, Authoritativeness, Trustworthiness
						</p>
					</div>
				</div>
				{!loading && checklist && (
					<div className="flex items-center gap-2">
						<span
							className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
								score >= 70
									? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
									: score >= 40
										? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
										: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
							}`}
						>
							EEAT Score: {score}%
						</span>
						<Button
							variant="outline"
							size="sm"
							disabled={evaluating}
							onClick={() => {
								setEvaluating(true);
								fetchEEAT(true);
							}}
							startIcon={evaluating ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
						>
							{evaluating ? 'Evaluating…' : 'Re-evaluate'}
						</Button>
					</div>
				)}
			</div>

			<div className="p-5">
				{loading ? (
					<div className="flex items-center justify-center gap-2 py-10 text-gray-400">
						<Loader2 className="size-4 animate-spin" />
						<span className="text-sm">Loading EEAT checklist…</span>
					</div>
				) : !checklist ? (
					<div className="flex flex-col items-center gap-2 py-8 text-center">
						<Shield className="size-8 text-gray-300 dark:text-gray-600" />
						<p className="font-medium text-gray-600 dark:text-gray-400">No EEAT data yet</p>
						<p className="max-w-sm text-sm text-gray-400 dark:text-gray-500">
							Run a site crawl to evaluate trust & authority signals. EEAT is updated automatically
							after each crawl.
						</p>
						<Button
							variant="outline"
							size="sm"
							disabled={evaluating}
							onClick={() => {
								setEvaluating(true);
								fetchEEAT(true);
							}}
							startIcon={evaluating ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
						>
							{evaluating ? 'Evaluating…' : 'Evaluate now'}
						</Button>
					</div>
				) : (
					<>
						{isYMYL && (
							<div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
								<p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
									YMYL niche — stricter requirements
								</p>
								<p className="mt-0.5 text-[11px] text-amber-700/90 dark:text-amber-400/90">
									Your site operates in a health, legal, or financial niche. Google applies stricter EEAT
									standards. Ensure citations, credentials, and disclaimers are in place.
								</p>
							</div>
						)}
						<p className="mb-5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
							Google uses E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) to assess
							content quality. Each item has a pass/fail and a plain-English fix when it fails.
						</p>

						{/* Group by dimension */}
						{dimensionOrder.map((dim) => {
							const matchingItems = Object.entries(checklist.items).filter(
								([key]) => itemDimensions[key] === dim
							);
							if (matchingItems.length === 0) return null;

							return (
								<div key={dim} className="mb-6 last:mb-0">
									<p className="mb-2 text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
										{dimensionLabels[dim]}
									</p>
									<div className="space-y-2">
										{matchingItems.map(([key, item]) => (
											<div
												key={key}
												className={`flex items-start gap-3 rounded-lg border p-3 ${
													item.status === 'pass'
														? 'border-green-500/20 bg-green-500/5 dark:border-green-500/20 dark:bg-green-500/5'
														: item.status === 'fail'
															? 'border-amber-500/20 bg-amber-500/5 dark:border-amber-500/20 dark:bg-amber-500/5'
															: 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
												}`}
											>
												{item.status === 'pass' ? (
													<CheckCircle2 className="mt-0.5 size-4 flex-shrink-0 text-green-500" />
												) : item.status === 'fail' ? (
													<AlertTriangle className="mt-0.5 size-4 flex-shrink-0 text-amber-500" />
												) : (
													<span className="mt-0.5 flex size-4 flex-shrink-0 items-center justify-center rounded-full bg-gray-300 text-[10px] font-medium text-gray-500 dark:bg-gray-600 dark:text-gray-400">
														?
													</span>
												)}
												<div className="min-w-0 flex-1">
													<p className="text-sm font-medium text-gray-900 dark:text-white">
														{item.label ?? key.replace(/_/g, ' ')}
													</p>
													{item.evidence && (
														<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
															{item.evidence}
														</p>
													)}
													{item.status === 'fail' && item.fix && (
														<p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
															Fix: {item.fix}
														</p>
													)}
												</div>
											</div>
										))}
									</div>
								</div>
							);
						})}
					</>
				)}
			</div>
		</div>
	);
}

// ─── Toxic Links Panel (S1-7) ──────────────────────────────────────────────────

interface ToxicDomain {
	domain: string;
	reason: string;
	rank: number;
	spam_score?: number;
	backlinks: number;
}

interface ToxicLinksAudit {
	evaluated_at: string;
	total_domains: number;
	toxic_count: number;
	toxic_domains: ToxicDomain[];
	disavow_content: string;
	summary: string;
}

// ─── Link Velocity Panel (S2-14 / V1.3h) ────────────────────────────────────────

interface LinkVelocityResult {
	status: 'healthy' | 'elevated' | 'spike_warning' | 'insufficient_data';
	message: string;
	recommendation?: string;
	recentMonthGrowth?: number;
	avgHistoricalGrowth?: number;
	velocityRatio?: number;
	latestReferringDomains?: number;
	creditsUsed?: number;
}

function LinkVelocityPanel({
	siteId,
	creditsRemaining,
	onInsufficientCredits,
	onRefreshBacklinks
}: {
	siteId: string;
	creditsRemaining: number;
	onInsufficientCredits: () => void;
	onRefreshBacklinks?: () => void;
}) {
	const [data, setData] = useState<LinkVelocityResult | null>(null);
	const [loading, setLoading] = useState(true);
	const [running, setRunning] = useState(false);

	const fetchVelocity = useCallback(async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/sites/${siteId}/link-velocity`, { credentials: 'include' });
			if (!res.ok) throw new Error('Failed to fetch');
			const json = await res.json();
			setData(json);
		} catch {
			setData(null);
		} finally {
			setLoading(false);
		}
	}, [siteId]);

	useEffect(() => {
		fetchVelocity();
	}, [fetchVelocity]);

	const runCheck = async () => {
		if (creditsRemaining < CREDIT_COSTS.LINK_VELOCITY_CHECK) {
			toast.error(`Need ${CREDIT_COSTS.LINK_VELOCITY_CHECK} credits. You have ${creditsRemaining}.`);
			onInsufficientCredits();
			return;
		}
		setRunning(true);
		try {
			const res = await fetch(`/api/sites/${siteId}/link-velocity`, {
				method: 'POST',
				credentials: 'include'
			});
			const result = await res.json();
			if (!res.ok) {
				if (res.status === 402) {
					toast.error(result.error || 'Insufficient credits');
					onInsufficientCredits();
				} else {
					toast.error(result.error || 'Check failed');
				}
				return;
			}
			setData(result);
			onRefreshBacklinks?.();
			toast.success('Link growth recorded');
		} catch {
			toast.error('Failed to run check');
		} finally {
			setRunning(false);
		}
	};

	const statusConfig: Record<
		LinkVelocityResult['status'],
		{ label: string; color: string; bg: string; icon: React.ReactNode }
	> = {
		healthy: {
			label: 'Growth looks natural',
			color: 'text-green-600 dark:text-green-400',
			bg: 'bg-green-500/10 border-green-500/20',
			icon: <CheckCircle2 className="size-4 text-green-500" />
		},
		elevated: {
			label: 'Higher than usual',
			color: 'text-amber-600 dark:text-amber-400',
			bg: 'bg-amber-500/10 border-amber-500/20',
			icon: <AlertTriangle className="size-4 text-amber-500" />
		},
		spike_warning: {
			label: 'Spike risk',
			color: 'text-red-600 dark:text-red-400',
			bg: 'bg-red-500/10 border-red-500/20',
			icon: <AlertTriangle className="size-4 text-red-500" />
		},
		insufficient_data: {
			label: 'Need more data',
			color: 'text-gray-600 dark:text-gray-400',
			bg: 'bg-gray-500/10 border-gray-500/20',
			icon: <Clock className="size-4 text-gray-500" />
		}
	};

	const cfg = data ? statusConfig[data.status] : statusConfig.insufficient_data;

	return (
		<div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
			<div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
				<div className="flex items-center gap-2.5">
					<div className="rounded-lg bg-blue-500/10 p-1.5">
						<TrendingUp className="size-4 text-blue-500" />
					</div>
					<div>
						<p className="font-semibold text-gray-900 dark:text-white">Link Growth Check</p>
						<p className="text-[11px] text-gray-500 dark:text-gray-400">
							Are new sites linking to you too fast? Sudden spikes can look like paid links to Google
						</p>
					</div>
				</div>
				<div className="flex items-center gap-3">
					{!loading && data && (
						<span
							className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.bg} ${cfg.color}`}
						>
							{cfg.icon}
							{cfg.label}
						</span>
					)}
					<Button
						variant="outline"
						size="sm"
						disabled={running || loading}
						onClick={runCheck}
						startIcon={running ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
					>
						{running ? 'Checking…' : `Check now (${CREDIT_COSTS.LINK_VELOCITY_CHECK} credits)`}
					</Button>
				</div>
			</div>

			<div className="p-5">
				{loading ? (
					<div className="flex items-center justify-center gap-2 py-10 text-gray-400">
						<Loader2 className="size-4 animate-spin" />
						<span className="text-sm">Loading…</span>
					</div>
				) : (
					<>
						<p className="mb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{data?.message}</p>
						{data?.recommendation && (
							<div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 dark:border-amber-500/20 dark:bg-amber-500/5">
								<p className="text-xs font-medium text-amber-800 dark:text-amber-200">
									{data.recommendation}
								</p>
							</div>
						)}
						<div className="flex flex-wrap items-center gap-3">
							{data?.latestReferringDomains != null && (
								<span className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-semibold dark:border-gray-700 dark:bg-gray-800">
									{data.latestReferringDomains.toLocaleString()} sites linking to you
								</span>
							)}
							{data?.recentMonthGrowth != null && (
								<span className="text-xs text-gray-500 dark:text-gray-400">
									+{data.recentMonthGrowth} this month
									{data.avgHistoricalGrowth != null &&
										` (avg ${Math.round(data.avgHistoricalGrowth)}/mo)`}
								</span>
							)}
						</div>
						<p className="mt-4 text-[11px] text-gray-400 dark:text-gray-500">
							Requires DataForSEO. Run a check to record your current count — over time we spot unhealthy
							spikes.
						</p>
					</>
				)}
			</div>
		</div>
	);
}

function ToxicLinksPanel({
	siteId,
	creditsRemaining,
	onInsufficientCredits
}: {
	siteId: string;
	creditsRemaining: number;
	onInsufficientCredits: () => void;
}) {
	const [audit, setAudit] = useState<ToxicLinksAudit | null>(null);
	const [loading, setLoading] = useState(true);
	const [running, setRunning] = useState(false);

	const fetchAudit = useCallback(async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/sites/${siteId}/toxic-links-audit`, { credentials: 'include' });
			if (!res.ok) throw new Error('Failed to fetch');
			const json = await res.json();
			setAudit(json.audit ?? null);
		} catch {
			setAudit(null);
		} finally {
			setLoading(false);
		}
	}, [siteId]);

	useEffect(() => {
		fetchAudit();
	}, [fetchAudit]);

	const runAudit = async () => {
		if (creditsRemaining < CREDIT_COSTS.TOXIC_LINK_AUDIT) {
			toast.error(`Need ${CREDIT_COSTS.TOXIC_LINK_AUDIT} credits. You have ${creditsRemaining}.`);
			onInsufficientCredits();
			return;
		}
		setRunning(true);
		try {
			const res = await fetch(`/api/sites/${siteId}/toxic-links-audit`, {
				method: 'POST',
				credentials: 'include'
			});
			const data = await res.json();
			if (!res.ok) {
				if (res.status === 402) {
					toast.error(data.error || 'Insufficient credits');
					onInsufficientCredits();
				} else {
					toast.error(data.error || 'Audit failed');
				}
				return;
			}
			setAudit(data);
			toast.success(data.toxic_count > 0 ? `${data.toxic_count} toxic links found` : 'No toxic links detected');
		} catch {
			toast.error('Failed to run audit');
		} finally {
			setRunning(false);
		}
	};

	const downloadDisavow = () => {
		if (!audit?.disavow_content) return;
		const blob = new Blob([audit.disavow_content], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'disavow.txt';
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
			<div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
				<div className="flex items-center gap-2.5">
					<div className="rounded-lg bg-amber-500/10 p-1.5">
						<Link2 className="size-4 text-amber-500" />
					</div>
					<div>
						<p className="font-semibold text-gray-900 dark:text-white">Toxic Link Detection</p>
						<p className="text-[11px] text-gray-500 dark:text-gray-400">
							Find low-quality backlinks and generate a Google disavow file
						</p>
					</div>
				</div>
				<Button
					variant="outline"
					size="sm"
					disabled={running || loading}
					onClick={runAudit}
					startIcon={running ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
				>
					{running ? 'Running…' : `Run audit (${CREDIT_COSTS.TOXIC_LINK_AUDIT} credits)`}
				</Button>
			</div>

			<div className="p-5">
				{loading ? (
					<div className="flex items-center justify-center gap-2 py-10 text-gray-400">
						<Loader2 className="size-4 animate-spin" />
						<span className="text-sm">Loading…</span>
					</div>
				) : !audit ? (
					<div className="flex flex-col items-center gap-3 py-8 text-center">
						<p className="text-sm text-gray-500 dark:text-gray-400">
							No audit run yet. Click "Run audit" to analyze your backlinks and identify toxic links.
						</p>
						<p className="text-xs text-gray-400 dark:text-gray-500">
							Requires DataForSEO API. Results include a disavow file for Google Search Console.
						</p>
					</div>
				) : (
					<>
						<p className="mb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{audit.summary}</p>
						{audit.toxic_count > 0 && (
							<>
								<div className="mb-3 space-y-2">
									{audit.toxic_domains.slice(0, 10).map((t) => (
										<div
											key={t.domain}
											className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 dark:border-amber-500/20 dark:bg-amber-500/5"
										>
											<div className="min-w-0 flex-1">
												<p className="text-sm font-medium text-gray-900 dark:text-white">{t.domain}</p>
												<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t.reason}</p>
												{t.spam_score != null && (
													<p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
														Spam score: {t.spam_score}/100 · Rank: {t.rank}/100 · {t.backlinks} backlinks
													</p>
												)}
											</div>
										</div>
									))}
									{audit.toxic_count > 10 && (
										<p className="text-xs text-gray-500 dark:text-gray-400">
											+{audit.toxic_count - 10} more toxic domains in disavow file
										</p>
									)}
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={downloadDisavow}
									startIcon={<Download className="size-3.5" />}
								>
									Download disavow file
								</Button>
								<p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
									Submit at{' '}
									<a
										href="https://search.google.com/search-console/disavow-links"
										target="_blank"
										rel="noopener noreferrer"
										className="text-amber-600 underline hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300"
									>
										Google Search Console → Disavow links
									</a>
								</p>
							</>
						)}
						<p className="mt-4 text-[11px] text-gray-400 dark:text-gray-500">
							Audit from {new Date(audit.evaluated_at).toLocaleString()} · {audit.total_domains} domains analyzed
						</p>
					</>
				)}
			</div>
		</div>
	);
}

// ─── Internal Link Gaps Panel (S1-8) ──────────────────────────────────────────

interface LinkGap {
	type: string;
	severity: 'high' | 'medium' | 'low';
	message: string;
	action: string;
	affectedPages: string[];
	clusterId: string;
	clusterTitle: string;
}

interface InternalLinkGapResult {
	evaluated_at: string;
	total_clusters: number;
	clusters_with_gaps: number;
	gaps: LinkGap[];
	summary: string;
}

function InternalLinkGapsPanel({ siteId }: { siteId: string }) {
	const navigate = useNavigate();
	const [data, setData] = useState<InternalLinkGapResult | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchGaps = useCallback(async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/sites/${siteId}/internal-link-gaps`, { credentials: 'include' });
			if (!res.ok) throw new Error('Failed to fetch');
			const json = await res.json();
			setData(json);
		} catch {
			setData(null);
		} finally {
			setLoading(false);
		}
	}, [siteId]);

	useEffect(() => {
		fetchGaps();
	}, [fetchGaps]);

	const severityBadge = (s: string) => {
		const c =
			s === 'high'
				? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
				: s === 'medium'
					? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
					: 'border-gray-400/30 bg-gray-400/10 text-gray-600 dark:text-gray-400';
		return (
			<span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${c}`}>
				{s}
			</span>
		);
	};

	return (
		<div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
			<div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
				<div className="flex items-center gap-2.5">
					<div className="rounded-lg bg-brand-500/10 p-1.5">
						<Link2 className="size-4 text-brand-500" />
					</div>
					<div>
						<p className="font-semibold text-gray-900 dark:text-white">
							<span className="inline-flex items-center gap-1">
								Internal Link Gap Analysis
								<LawTooltip lawId="placement_determines_link_value" />
							</span>
						</p>
						<p className="text-[11px] text-gray-500 dark:text-gray-400">
							Reverse silo health — articles → focus page → destination
						</p>
					</div>
				</div>
				{!loading && data && (
					<Button variant="outline" size="sm" onClick={fetchGaps} startIcon={<RefreshCw className="size-3.5" />}>
						Refresh
					</Button>
				)}
			</div>

			<div className="p-5">
				{loading ? (
					<div className="flex items-center justify-center gap-2 py-10 text-gray-400">
						<Loader2 className="size-4 animate-spin" />
						<span className="text-sm">Analyzing clusters…</span>
					</div>
				) : !data ? (
					<div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
						Failed to load internal link gaps
					</div>
				) : data.total_clusters === 0 ? (
					<div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
						No active clusters. Add clusters to your strategy to analyze internal link gaps.
					</div>
				) : (
					<>
						<p className="mb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{data.summary}</p>
						{data.gaps.length === 0 ? (
							<div className="rounded-lg border border-green-500/20 bg-green-500/5 py-4 text-center text-sm text-green-700 dark:text-green-400">
								<CheckCircle2 className="mx-auto mb-2 size-6" />
								All clusters have healthy internal link structures
							</div>
						) : (
							<div className="space-y-4">
								{data.gaps.map((gap, i) => (
									<div
										key={`${gap.clusterId}-${gap.type}-${i}`}
										className={`rounded-lg border p-4 ${
											gap.severity === 'high'
												? 'border-red-500/20 bg-red-500/5 dark:border-red-500/20 dark:bg-red-500/5'
												: gap.severity === 'medium'
													? 'border-amber-500/20 bg-amber-500/5 dark:border-amber-500/20 dark:bg-amber-500/5'
													: 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
										}`}
									>
										<div className="flex flex-wrap items-center gap-2">
											{severityBadge(gap.severity)}
											<button
												type="button"
												onClick={() => navigate(`/clusters/${gap.clusterId}#internal-links`)}
												className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
											>
												{gap.clusterTitle}
											</button>
										</div>
										<p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{gap.message}</p>
										<p className="mt-1 text-xs font-medium text-gray-600 dark:text-gray-400">
											Fix: {gap.action}
										</p>
										{gap.affectedPages.length > 0 && (
											<p className="mt-1 text-[11px] text-gray-500 dark:text-gray-500">
												Affected: {gap.affectedPages.slice(0, 5).join(', ')}
												{gap.affectedPages.length > 5 && ` +${gap.affectedPages.length - 5} more`}
											</p>
										)}
									</div>
								))}
							</div>
						)}
						<p className="mt-4 text-[11px] text-gray-400 dark:text-gray-500">
							{data.total_clusters} clusters analyzed · Click cluster name to open Internal Links tab
						</p>
					</>
				)}
			</div>
		</div>
	);
}

// ─── Category mapping ─────────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, string> = {
	// Crawlability
	page_4xx: 'crawlability',
	server_error: 'crawlability',
	permanent_redirect: 'crawlability',
	temporary_redirect: 'crawlability',
	redirect_chain: 'crawlability',
	meta_refresh_redirect: 'crawlability',
	noindex: 'crawlability',
	url_too_long: 'crawlability',
	url_has_underscores: 'crawlability',
	url_has_uppercase: 'crawlability',
	missing_sitemap: 'crawlability',
	sitemap_orphan: 'crawlability',
	// HTTPS
	no_https: 'https',
	ssl_mismatch: 'https',
	mixed_content: 'https',
	// JavaScript rendering
	spa_no_ssr: 'javascript',
	js_rendered_content: 'javascript', // V2.1: raw vs rendered DOM comparison
	js_only_content: 'javascript',
	render_blocking_js: 'javascript',
	lazy_loaded_content: 'javascript',
	// Core Web Vitals (Google PSI field data)
	cwv_lcp_poor: 'core_web_vitals',
	cwv_lcp_needs_improvement: 'core_web_vitals',
	cwv_cls_poor: 'core_web_vitals',
	cwv_cls_needs_improvement: 'core_web_vitals',
	cwv_inp_poor: 'core_web_vitals',
	cwv_inp_needs_improvement: 'core_web_vitals',
	cwv_all_good: 'core_web_vitals',
	// Performance
	slow_response: 'performance',
	large_page_size: 'performance',
	missing_viewport: 'mobile', // S2-9: mobile-first
	// S2-9: Mobile-first indexing (V1.3b)
	mobile_content_hidden: 'mobile',
	small_touch_targets: 'mobile',
	horizontal_scroll_mobile: 'mobile',
	small_text_mobile: 'mobile',
	intrusive_interstitial: 'mobile', // S2-13: viewport-covering overlays
	images_no_dimensions: 'performance',
	// Meta tags & indexation
	missing_title: 'meta_tags',
	title_too_long: 'meta_tags',
	title_too_short: 'meta_tags',
	missing_h1: 'meta_tags',
	multiple_h1: 'meta_tags',
	h1_too_long: 'meta_tags',
	missing_meta_description: 'meta_tags',
	meta_desc_too_long: 'meta_tags',
	meta_desc_too_short: 'meta_tags',
	missing_canonical: 'meta_tags',
	canonical_points_elsewhere: 'meta_tags',
	duplicate_canonical: 'meta_tags',
	duplicate_title: 'meta_tags', // legacy
	duplicate_title_tag: 'meta_tags', // S2-10
	duplicate_meta_description: 'meta_tags',
	// Internal linking
	orphan_page: 'internal_linking',
	single_incoming_link: 'internal_linking',
	broken_link: 'internal_linking',
	too_many_links: 'internal_linking',
	anchor_text_imbalance: 'internal_linking',
	nav_footer_dilution: 'internal_linking',
	// Markup & schema
	missing_schema: 'markup',
	schema_parse_error: 'markup',
	missing_og_tags: 'markup',
	missing_twitter_card: 'markup',
	image_missing_alt: 'markup',
	image_not_webp: 'markup',
	// S2-12: Image optimization (V1.3e)
	above_fold_lazy_load: 'markup',
	lcp_image_not_preloaded: 'markup',
	// Content
	thin_content: 'content',
	low_text_html_ratio: 'content',
	keyword_stuffing: 'content', // S2-2: density > 3%
	// H2 Passage Quality [US9940367B1 + US9959315B1]
	weak_h2_passage: 'h2_passage',
	// Information Gain [US20190155948A1]
	igs_signals_absent: 'information_gain',
	igs_not_detected: 'information_gain',
	// S2-7: Crawl budget waste (V1.2g)
	thin_tag_pages: 'crawl_budget',
	author_archive_pages: 'crawl_budget',
	pagination_waste: 'crawl_budget',
	pagination_missing_canonical: 'crawl_budget', // S2-11
	parameter_duplicates: 'crawl_budget'
};

const THEMATIC_CATEGORIES: Array<{
	key: string;
	label: string;
	icon: React.ReactNode;
	psiTag?: boolean;
	patentTag?: string;
}> = [
	{ key: 'crawlability', label: 'Crawlability', icon: <Globe className="size-4" /> },
	{ key: 'https', label: 'HTTPS & Security', icon: <Shield className="size-4" /> },
	{ key: 'javascript', label: 'JS Rendering', icon: <Code2 className="size-4" /> },
	{
		key: 'core_web_vitals',
		label: 'Core Web Vitals',
		icon: <Zap className="size-4" />,
		psiTag: true
	},
	{ key: 'performance', label: 'Performance', icon: <Zap className="size-4" /> },
	{ key: 'meta_tags', label: 'Meta Tags', icon: <Tag className="size-4" /> },
	{ key: 'internal_linking', label: 'Internal Linking', icon: <Link2 className="size-4" /> },
	{ key: 'markup', label: 'Markup & Schema', icon: <FileText className="size-4" /> },
	{ key: 'content', label: 'Content', icon: <FileText className="size-4" /> },
	{
		key: 'h2_passage',
		label: 'H2 Passage Quality',
		icon: <FileText className="size-4" />,
		patentTag: 'US9940367B1'
	},
	{
		key: 'information_gain',
		label: 'Information Gain',
		icon: <FileText className="size-4" />,
		patentTag: 'US20190155948A1'
	},
	{ key: 'crawl_budget', label: 'Crawl Budget Waste', icon: <Globe className="size-4" /> },
	{ key: 'mobile', label: 'Mobile-First Indexing', icon: <Zap className="size-4" /> }
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getHealthColor(score: number) {
	if (score >= 80) return 'text-green-500';
	if (score >= 50) return 'text-amber-500';
	return 'text-red-500';
}

function getHealthBarColor(score: number) {
	if (score >= 80) return 'bg-green-500';
	if (score >= 50) return 'bg-amber-500';
	return 'bg-red-500';
}

function getSeverityDot(severity: string) {
	if (severity === 'critical')
		return <span className="mt-1.5 size-2 flex-shrink-0 rounded-full bg-red-500" />;
	if (severity === 'warning')
		return <span className="mt-1.5 size-2 flex-shrink-0 rounded-full bg-amber-500" />;
	return <span className="mt-1.5 size-2 flex-shrink-0 rounded-full bg-blue-400" />;
}

function getSeverityLabel(severity: string) {
	if (severity === 'critical')
		return (
			<span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-red-500">
				Error
			</span>
		);
	if (severity === 'warning')
		return (
			<span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-500">
				Warning
			</span>
		);
	return (
		<span className="rounded bg-blue-400/15 px-1.5 py-0.5 text-[11px] font-semibold text-blue-400">
			Notice
		</span>
	);
}

function truncateUrl(url: string, max = 60) {
	if (url === 'site-wide') return 'Site-wide';
	try {
		const u = new URL(url);
		const path = u.pathname + u.search;
		if (path.length > max) return u.hostname + path.slice(0, max) + '…';
		return u.hostname + path;
	} catch {
		return url.length > max ? url.slice(0, max) + '…' : url;
	}
}

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

// Group issues by issue_type, sorted critical → warning → info, then by count desc
function groupIssues(issues: TechnicalIssue[]) {
	const groups: Record<string, TechnicalIssue[]> = {};
	issues.forEach((issue) => {
		if (!groups[issue.issue_type]) groups[issue.issue_type] = [];
		groups[issue.issue_type].push(issue);
	});
	const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
	return Object.entries(groups).sort(([, a], [, b]) => {
		const as = severityOrder[a[0].severity] ?? 2;
		const bs = severityOrder[b[0].severity] ?? 2;
		if (as !== bs) return as - bs;
		return b.length - a.length;
	});
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Technical() {
	const { selectedSite } = useSiteContext();
	const { user } = useAuth();
	const { organization } = useOrganization();
	const navigate = useNavigate();

	const [loading, setLoading] = useState(false);
	const [results, setResults] = useState<CrawlResults | null>(null);
	const [crawlabilityIssues, setCrawlabilityIssues] = useState<CrawlabilityIssue[]>([]);
	const [checking, setChecking] = useState(false);
	const [walletModalOpen, setWalletModalOpen] = useState(false);
	const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>(
		'all'
	);
	const [categoryFilter, setCategoryFilter] = useState<string>('all');
	const [expandedIssues, setExpandedIssues] = useState<Record<string, boolean>>({});
	const [expandedUrls, setExpandedUrls] = useState<Record<string, boolean>>({});
	const [resolving, setResolving] = useState<Record<string, boolean>>({});
	const [showResolved, setShowResolved] = useState(false);

	const fetchResults = useCallback(async () => {
		if (!selectedSite) return;
		try {
			const response = await fetch(`/api/crawler/results/${selectedSite.id}`);
			if (!response.ok) throw new Error('Failed to fetch results');
			const data = await response.json();
			setResults(data.data);
		} catch (error) {
			console.error(error);
		}
	}, [selectedSite]);

	useEffect(() => {
		if (selectedSite) fetchResults();
	}, [selectedSite, fetchResults]);

	const markResolved = async (issueIds: string[]) => {
		const key = issueIds[0];
		setResolving((p) => ({ ...p, [key]: true }));
		try {
			const resp = await fetch('/api/crawler/fix-bulk', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ issueIds })
			});
			if (!resp.ok) throw new Error('Failed to mark resolved');
			toast.success(`${issueIds.length} issue${issueIds.length > 1 ? 's' : ''} marked as resolved`);
			await fetchResults();
		} catch {
			toast.error('Failed to update issue');
		} finally {
			setResolving((p) => ({ ...p, [key]: false }));
		}
	};

	const startCrawl = async () => {
		if (!selectedSite || !organization || !user) return;

		setChecking(true);
		setCrawlabilityIssues([]);

		try {
			const checkResp = await fetch('/api/crawler/check-crawlability', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ siteUrl: selectedSite.url })
			});
			if (!checkResp.ok) {
				toast.error('Error checking site');
				setChecking(false);
				return;
			}

			const checkData = (await checkResp.json()).data;
			if (checkData.issues?.length > 0) {
				setCrawlabilityIssues(checkData.issues);
				if (checkData.issues.some((i: CrawlabilityIssue) => i.type === 'critical')) {
					setChecking(false);
					return;
				}
			}
			setChecking(false);
		} catch {
			setChecking(false);
			return;
		}

		setLoading(true);
		try {
			const response = await fetch('/api/crawler/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					organizationId: organization.id,
					siteId: selectedSite.id,
					siteUrl: selectedSite.url,
					userId: user.id,
					maxPages: 100
				})
			});
			if (!response.ok) {
				const err = await response.json();
				if (err.needs_topup) {
					const available = err.available ?? 0;
					if (available === 0) {
						toast.error('No credits remaining.');
						setWalletModalOpen(true);
					} else toast.error(`Insufficient credits. Need ${err.required ?? 8}, have ${available}.`);
				} else toast.error(err.error || 'Failed to start crawl');
				return;
			}
			const data = await response.json();
			setCrawlabilityIssues([]);
			toast.success(
				`Crawl complete — ${data.data.issuesFound} issues found across ${data.data.pagesScanned} pages.`
			);
			await fetchResults();
		} catch {
			toast.error('Error starting crawl');
		} finally {
			setLoading(false);
		}
	};

	// ── No site ───────────────────────────────────────────────────────────────
	if (!selectedSite) {
		return (
			<TierGate requiredTier="scale" pageTitle="Technical SEO">
				<>
					<PageMeta title="Technical SEO" description="Site-wide technical audit" />
					<PageHeader title="Technical SEO" subtitle="Select a site to run a technical audit" />
					<div className="flex flex-col items-center gap-4 p-16">
						<Wrench className="size-12 text-gray-400" />
						<p className="text-sm text-gray-500 dark:text-gray-400">No site selected</p>
						<Button
							className="bg-brand-500 hover:bg-brand-600 text-white"
							onClick={() => navigate('/sites')}
							startIcon={<Plus className="size-4" />}
						>
							Add Site
						</Button>
					</div>
				</>
			</TierGate>
		);
	}

	// ── Derived filter state ──────────────────────────────────────────────────
	// Base: hide resolved unless user toggled show-resolved
	const baseIssues = (results?.issues ?? []).filter((i) => showResolved || !i.resolved);

	const categoryIssues =
		categoryFilter === 'all'
			? baseIssues
			: baseIssues.filter((i) => (CATEGORY_MAP[i.issue_type] || 'other') === categoryFilter);

	const catCounts = {
		all: categoryIssues.length,
		critical: categoryIssues.filter((i) => i.severity === 'critical').length,
		warning: categoryIssues.filter((i) => i.severity === 'warning').length,
		info: categoryIssues.filter((i) => i.severity === 'info').length
	};

	const filteredIssues = categoryIssues.filter(
		(i) => severityFilter === 'all' || i.severity === severityFilter
	);

	const groupedIssues = groupIssues(filteredIssues);

	// Per-category counts for thematic cards — always unresolved only
	const unresolvedIssues = (results?.issues ?? []).filter((i) => !i.resolved);
	const categoryStats: Record<string, { critical: number; warning: number; info: number }> = {};
	THEMATIC_CATEGORIES.forEach(({ key }) => {
		categoryStats[key] = { critical: 0, warning: 0, info: 0 };
	});
	unresolvedIssues.forEach((issue) => {
		const cat = CATEGORY_MAP[issue.issue_type] || 'other';
		if (categoryStats[cat]) categoryStats[cat][issue.severity]++;
	});

	return (
		<TierGate requiredTier="scale" pageTitle="Technical SEO">
			<>
				<PageMeta title="Technical SEO" description="Site-wide technical audit and issues" />
				<div className="space-y-6">
					<PageHeader title="Technical SEO" subtitle={`${selectedSite.name} · ${selectedSite.url}`} />

				<div className="space-y-10">
					{/* AI Insight */}
					<div className="flex items-start gap-2">
						<AIInsightBlock
							variant="analyst"
							label="TECHNICAL AUDIT"
							message="Comprehensive audit across 12 layers: Crawlability, HTTPS, JS Rendering, Performance, Meta Tags, Internal Linking, Markup & Schema, Content quality, H2 Passage Quality [US9940367B1], Information Gain [US20190155948A1], Crawl Budget Waste, and Mobile-First Indexing. Grounded in Google's confirmed indexation pipeline."
						/>
						<LawTooltip lawId="technical_first" />
					</div>

					{/* Pre-crawl issues */}
					{crawlabilityIssues.length > 0 && (
						<div className="space-y-2">
							{crawlabilityIssues.map((issue, idx) => (
								<div
									key={idx}
									className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${
										issue.type === 'critical'
											? 'border-red-900/60 bg-red-950/30 text-red-300'
											: 'border-amber-900/60 bg-amber-950/30 text-amber-300'
									}`}
								>
									<AlertTriangle className="mt-0.5 size-4 flex-shrink-0" />
									<div>
										<p className="font-semibold">{issue.title}</p>
										<p className="mt-0.5 text-xs opacity-80">{issue.message}</p>
										<p className="mt-1 text-xs font-medium opacity-70">Fix: {issue.solution}</p>
									</div>
								</div>
							))}
						</div>
					)}

					{/* ── Run crawl row ─────────────────────────────────────────────────── */}
					<div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-900">
						<div>
							<p className="font-medium text-gray-900 dark:text-white">Run Site Crawl</p>
							<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
								Audits up to 100 pages across 12 technical layers · 10 credits
								{results?.crawlMeta?.end_time && (
									<span className="ml-2 inline-flex items-center gap-1">
										<Clock className="size-3" />
										Last run {formatDate(results.crawlMeta.end_time)}
									</span>
								)}
							</p>
						</div>
						<Button
							onClick={startCrawl}
							disabled={
								loading || checking || crawlabilityIssues.some((i) => i.type === 'critical')
							}
							className="bg-brand-500 hover:bg-brand-600 text-white"
							startIcon={
								loading || checking ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<RefreshCw className="size-4" />
								)
							}
						>
							{checking ? 'Checking…' : loading ? 'Crawling…' : 'Start Crawl'}
						</Button>
					</div>

					{/* ── Results ──────────────────────────────────────────────────────── */}
					{results && (
						<>
							{/* S2-4: IGS domain-level consequence warning */}
							{results.igsHealth?.status === 'critical' && (
								<div className="rounded-xl border border-red-500/40 bg-red-500/8 p-5">
									<div className="flex items-start gap-3">
										<div className="rounded-lg bg-red-500/15 p-2">
											<FileText className="size-5 text-red-500" />
										</div>
										<div>
											<p className="font-semibold text-red-600 dark:text-red-400">
												{results.igsHealth.lowCount} of {results.igsHealth.substantialCount} long-form pages lack original content
											</p>
											<p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
												{results.igsHealth.message}
											</p>
											<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
												Add original research, firsthand findings, or real data to pages in the Information Gain section below.
											</p>
										</div>
									</div>
								</div>
							)}

							{/* SPA Warning */}
							{results.isSPA && (
								<div className="rounded-xl border border-amber-500/40 bg-amber-500/8 p-5">
									<div className="flex items-start gap-3">
										<div className="rounded-lg bg-amber-500/15 p-2">
											<Code2 className="size-5 text-amber-500" />
										</div>
										<div>
											<p className="font-semibold text-amber-600 dark:text-amber-400">
												JavaScript Rendering Gap — {results.spaFramework || 'SPA'} detected
											</p>
											<p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
												Your site uses{' '}
												<strong className="text-gray-600 dark:text-gray-200">
													client-side JavaScript rendering
												</strong>{' '}
												with no detectable SSR. Google crawls your raw HTML first, then renders
												JavaScript in a{' '}
												<strong className="text-gray-600 dark:text-gray-200">
													separate queue that can take days to weeks
												</strong>
												. During that gap, your content doesn't exist in Google's index — missing
												titles, H1s, and body text are all invisible until rendering completes.
											</p>
											<div className="mt-3 flex flex-wrap gap-2 text-xs">
												<span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-amber-700">
													Fix: Switch to Next.js, Astro, Remix, or Gatsby (SSR/SSG)
												</span>
												<span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-amber-700">
													Or add server-side prerendering via Prerender.io
												</span>
												<span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-amber-700">
													Verify in{' '}
													<a
														href="https://search.google.com/search-console/about"
														target="_blank"
														rel="noopener noreferrer"
														className="text-amber-700 underline hover:text-amber-600"
													>
														Google Search Console
													</a>{' '}
													→ URL Inspection → View Tested Page
												</span>
											</div>
										</div>
									</div>
								</div>
							)}

							{/* ── Overview stats ────────────────────────────────────────────── */}
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
								{/* Health score */}
								<div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-5 dark:border-gray-700 dark:bg-gray-900">
									<p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
										Site Health
									</p>
									<p className={`mt-2 text-4xl font-bold ${getHealthColor(results.healthScore)}`}>
										{results.healthScore}
									</p>
									<p className="text-[10px] text-gray-500 dark:text-gray-500">/ 100</p>
									<div className="mt-3 h-1.5 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
										<div
											className={`h-1.5 rounded-full ${getHealthBarColor(results.healthScore)}`}
											style={{ width: `${results.healthScore}%` }}
										/>
									</div>
								</div>

								{/* Pages crawled */}
								<div className="rounded-xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-900">
									<p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
										Pages Crawled
									</p>
									<p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
										{results.crawlMeta?.pages_scanned ?? '—'}
									</p>
									{results.crawlMeta?.avg_response_time_ms ? (
										<p className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500">
											<Clock className="size-3" />
											Avg {results.crawlMeta.avg_response_time_ms}ms
										</p>
									) : null}
								</div>

								{/* Errors */}
								<div className="rounded-xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-900">
									<p className="text-[10px] font-semibold tracking-widest text-red-500 uppercase">
										Errors
									</p>
									<p className="mt-2 text-3xl font-bold text-red-500">{results.critical}</p>
									<p className="mt-1 text-xs text-gray-500 dark:text-gray-500">Critical issues</p>
								</div>

								{/* Warnings */}
								<div className="rounded-xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-900">
									<p className="text-[10px] font-semibold tracking-widest text-amber-500 uppercase">
										Warnings
									</p>
									<p className="mt-2 text-3xl font-bold text-amber-500">{results.warnings}</p>
									<p className="mt-1 text-xs text-gray-500 dark:text-gray-500">Need attention</p>
								</div>

								{/* Notices */}
								<div className="rounded-xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-700 dark:bg-gray-900">
									<p className="text-[10px] font-semibold tracking-widest text-blue-400 uppercase">
										Notices
									</p>
									<p className="mt-2 text-3xl font-bold text-blue-400">{results.info}</p>
									<p className="mt-1 text-xs text-gray-500 dark:text-gray-500">Opportunities</p>
								</div>
							</div>

							{/* ── Thematic report cards ─────────────────────────────────────── */}
							<div>
								<p className="mb-2.5 text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
									Thematic Reports
								</p>
								<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
									{THEMATIC_CATEGORIES.map(({ key, label, icon, psiTag, patentTag }) => {
										const stats = categoryStats[key] ?? { critical: 0, warning: 0, info: 0 };
										const total = stats.critical + stats.warning + stats.info;
										const isActive = categoryFilter === key;
										const isClean = total === 0;

										return (
											<button
												key={key}
												onClick={() => {
													if (isActive) {
														setCategoryFilter('all');
													} else {
														setCategoryFilter(key);
														setSeverityFilter('all');
													}
												}}
												className={`group flex items-start gap-3 rounded-xl border p-4 text-left transition-all hover:border-gray-500 dark:hover:border-gray-500 ${
													isActive
														? 'border-brand-500 bg-brand-500/5 dark:border-brand-500 dark:bg-brand-500/5'
														: 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
												}`}
											>
												<span className="mt-0.5 text-gray-400 dark:text-gray-500">{icon}</span>
												<div className="min-w-0 flex-1">
													<div className="flex flex-wrap items-center gap-1">
														<p className="text-sm font-medium text-gray-900 dark:text-white">
															{label}
														</p>
														{psiTag && (
															<span className="rounded bg-blue-500/15 px-1 py-0.5 text-[9px] font-semibold text-blue-400">
																Google PSI
															</span>
														)}
														{patentTag && (
															<span className="rounded bg-purple-500/15 px-1 py-0.5 text-[9px] font-semibold text-purple-400">
																{patentTag}
															</span>
														)}
													</div>
													{isClean ? (
														<p className="mt-0.5 flex items-center gap-1 text-xs text-green-500">
															<CheckCircle2 className="size-3" />
															{key === 'core_web_vitals' && !results?.hasCWVData
																? 'No field data'
																: 'No issues'}
														</p>
													) : (
														<div className="mt-0.5 flex flex-wrap gap-x-2 text-xs">
															{stats.critical > 0 && (
																<span className="text-red-500">
																	{stats.critical} error{stats.critical > 1 ? 's' : ''}
																</span>
															)}
															{stats.warning > 0 && (
																<span className="text-amber-500">
																	{stats.warning} warning{stats.warning > 1 ? 's' : ''}
																</span>
															)}
															{stats.info > 0 && (
																<span className="text-blue-400">
																	{stats.info} notice{stats.info > 1 ? 's' : ''}
																</span>
															)}
														</div>
													)}
												</div>
												{!isClean && (
													<span
														className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
															stats.critical > 0
																? 'bg-red-500/15 text-red-500'
																: stats.warning > 0
																	? 'bg-amber-500/15 text-amber-500'
																	: 'bg-blue-400/15 text-blue-400'
														}`}
													>
														{total}
													</span>
												)}
											</button>
										);
									})}
								</div>
							</div>

							{/* ── Issues ───────────────────────────────────────────────────── */}
							<div>
								{/* Filter pills */}
								<div className="mb-3 flex flex-wrap items-center gap-2">
									<p className="mr-1 text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
										Issues
									</p>

									{/* Active category tag */}
									{categoryFilter !== 'all' && (
										<span className="border-brand-500/40 bg-brand-500/10 text-brand-400 flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
											{THEMATIC_CATEGORIES.find((c) => c.key === categoryFilter)?.label}
											<button
												onClick={() => setCategoryFilter('all')}
												className="ml-0.5 opacity-60 hover:opacity-100"
												aria-label="Clear category filter"
											>
												✕
											</button>
										</span>
									)}

									{/* Severity pills — counts are scoped to active category */}
									{(
										[
											['all', `All (${catCounts.all})`],
											['critical', `Errors (${catCounts.critical})`],
											['warning', `Warnings (${catCounts.warning})`],
											['info', `Notices (${catCounts.info})`]
										] as const
									).map(([sev, label]) => (
										<button
											key={sev}
											onClick={() => setSeverityFilter(sev)}
											className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
												severityFilter === sev
													? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
													: 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
											}`}
										>
											{label}
										</button>
									))}

									{/* Show resolved toggle */}
									{(results?.issues ?? []).some((i) => i.resolved) && (
										<button
											onClick={() => setShowResolved((p) => !p)}
											className={`ml-auto rounded-full px-3 py-1 text-xs font-medium transition-colors ${
												showResolved
													? 'bg-green-500/15 text-green-500'
													: 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
											}`}
										>
											{showResolved
												? 'Hide resolved'
												: `Show resolved (${(results?.issues ?? []).filter((i) => i.resolved).length})`}
										</button>
									)}
								</div>

								{/* Issue list */}
								{groupedIssues.length === 0 ? (
									<div className="rounded-xl border border-gray-200 bg-gray-50 p-10 text-center dark:border-gray-700 dark:bg-gray-800/50">
										<CheckCircle2 className="mx-auto size-9 text-green-500" />
										<p className="mt-3 font-medium text-gray-700 dark:text-gray-300">
											No issues in this category
										</p>
										<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
											{categoryFilter !== 'all'
												? 'Click a different thematic report or clear the filter to see all issues.'
												: 'Your site looks clean!'}
										</p>
									</div>
								) : (
									<div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-600">
										{groupedIssues.map(([issueType, issueGroup], groupIdx) => {
											const rep = issueGroup[0];
											const isExpanded = !!expandedIssues[issueType];
											const showAllUrls = !!expandedUrls[issueType];
											const urlsToShow = showAllUrls ? issueGroup : issueGroup.slice(0, 3);
											const hasMoreUrls = issueGroup.length > 3;
											const catLabel =
												THEMATIC_CATEGORIES.find(
													(c) => c.key === (CATEGORY_MAP[issueType] || 'other')
												)?.label ?? 'General';

											return (
												<div
													key={issueType}
													className={`${groupIdx > 0 ? 'border-t border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-900'}`}
												>
													{/* Issue header row */}
													<div className="flex items-start gap-3 px-4 py-3.5">
														{/* Severity dot */}
														{getSeverityDot(rep.severity)}

														{/* Content */}
														<div className="min-w-0 flex-1">
															<div className="flex flex-wrap items-center gap-2">
																<p className="text-sm font-medium text-gray-900 dark:text-white">
																	{rep.description}
																</p>
																{getSeverityLabel(rep.severity)}
																<span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
																	{catLabel}
																</span>
															</div>

															{/* Affected URLs — always visible */}
															<div className="mt-2 space-y-1">
																{urlsToShow.map((issue, idx) => (
																	<div key={idx} className="flex items-center gap-1.5">
																		<Globe className="size-3 flex-shrink-0 text-gray-400" />
																		<a
																			href={
																				issue.affected_url === 'site-wide'
																					? '#'
																					: issue.affected_url
																			}
																			target={
																				issue.affected_url === 'site-wide' ? undefined : '_blank'
																			}
																			rel="noopener noreferrer"
																			className="hover:text-brand-500 dark:hover:text-brand-400 flex items-center gap-1 truncate text-xs text-gray-500 dark:text-gray-400"
																		>
																			{truncateUrl(issue.affected_url)}
																			{issue.affected_url !== 'site-wide' && (
																				<ExternalLink className="size-2.5 flex-shrink-0 opacity-50" />
																			)}
																		</a>
																	</div>
																))}
																{hasMoreUrls && !showAllUrls && (
																	<button
																		onClick={() =>
																			setExpandedUrls((p) => ({ ...p, [issueType]: true }))
																		}
																		className="text-brand-500 hover:text-brand-400 mt-0.5 text-xs"
																	>
																		+{issueGroup.length - 3} more pages
																	</button>
																)}
																{showAllUrls && hasMoreUrls && (
																	<button
																		onClick={() =>
																			setExpandedUrls((p) => ({ ...p, [issueType]: false }))
																		}
																		className="mt-0.5 text-xs text-gray-500 hover:text-gray-400"
																	>
																		Show less
																	</button>
																)}
															</div>
														</div>

														{/* Actions */}
														<div className="ml-2 flex flex-shrink-0 items-start gap-1">
															{/* Mark resolved — uses first issue id of this group */}
															{!rep.resolved && (
																<button
																	onClick={() => markResolved(issueGroup.map((i) => i.id))}
																	disabled={!!resolving[issueGroup[0]?.id]}
																	className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-gray-400 hover:bg-green-500/10 hover:text-green-500 disabled:opacity-40 dark:hover:bg-green-500/10"
																	title="Mark all affected URLs for this issue as resolved"
																>
																	<CheckCircle2 className="size-3.5" />
																	{resolving[issueGroup[0]?.id] ? 'Saving…' : 'Resolve'}
																</button>
															)}
															{rep.resolved && (
																<span className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-green-500">
																	<CheckCircle2 className="size-3.5" />
																	Resolved
																</span>
															)}
															{/* Expand recommendation toggle */}
															<button
																onClick={() =>
																	setExpandedIssues((p) => ({ ...p, [issueType]: !p[issueType] }))
																}
																className="mt-0.5 flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
																aria-label={
																	isExpanded ? 'Hide recommendation' : 'Show recommendation'
																}
															>
																{isExpanded ? (
																	<ChevronDown className="size-4" />
																) : (
																	<ChevronRight className="size-4" />
																)}
															</button>
														</div>
													</div>

													{/* Recommendation — expandable */}
													{isExpanded && (
														<div className="border-t border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-600 dark:bg-gray-900">
															<p className="mb-1.5 text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
																How to fix
															</p>
															<p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
																{rep.recommendation}
															</p>
														</div>
													)}
												</div>
											);
										})}
									</div>
								)}
							</div>
						</>
					)}

					{/* ── Trust & Authority (EEAT) Panel S1-3 ───────────────────────────── */}
					<EEATTrustPanel
						siteId={selectedSite.id}
						lastCrawlTime={results?.crawlMeta?.end_time ?? null}
						isYMYL={selectedSite.isYMYL}
					/>

					{/* ── Brand Search Signal Panel ─────────────────────────────────── */}
					<BrandSearchPanel
						siteId={selectedSite.id}
						projectName={selectedSite.name}
						gscConnected={selectedSite.gsc_connected ?? false}
					/>

					{/* ── Link Velocity Panel S2-14 ────────────────────────────────────── */}
					<LinkVelocityPanel
						siteId={selectedSite.id}
						creditsRemaining={
							organization?.included_credits_remaining ?? organization?.included_credits ?? 0
						}
						onInsufficientCredits={() => setWalletModalOpen(true)}
					/>

					{/* ── Toxic Links Panel S1-7 ─────────────────────────────────────── */}
					<ToxicLinksPanel
						siteId={selectedSite.id}
						creditsRemaining={
							organization?.included_credits_remaining ?? organization?.included_credits ?? 0
						}
						onInsufficientCredits={() => setWalletModalOpen(true)}
					/>

					{/* ── Internal Link Gaps Panel S1-8 ───────────────────────────────── */}
					<InternalLinkGapsPanel siteId={selectedSite.id} />

					{/* Empty state — no crawl yet */}
					{!results && !loading && (
						<div className="rounded-xl border border-gray-200 bg-white p-14 text-center dark:border-gray-700 dark:bg-gray-900">
							<Wrench className="mx-auto size-11 text-gray-300 dark:text-gray-600" />
							<p className="mt-4 font-medium text-gray-600 dark:text-gray-400">
								No crawl results yet
							</p>
							<p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
								Click "Start Crawl" above to audit your site across all 12 technical layers
								including Google PSI Core Web Vitals.
							</p>
						</div>
					)}
				</div>

					<WalletDepositModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
				</div>
			</>
		</TierGate>
	);
}
