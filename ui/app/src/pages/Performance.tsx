import { useState, useMemo } from 'react';
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer
} from 'recharts';
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { AIInsightBlock } from '../components/shared/AIInsightBlock';
import { StatCard } from '../components/shared/StatCard';
import { StatSkeleton, ChartSkeleton } from '../components/shared/SkeletonLoader';
import { Button } from '../components/ui/button';
import { useSiteContext } from '../contexts/SiteContext';
import { usePerformanceData } from '../hooks/usePerformanceData';
import { useGSCStatus } from '../hooks/useGSCStatus';
import { useNavboostSignals } from '../hooks/useNavboostSignals';
import { useRefreshQueue } from '../hooks/useRefreshQueue';
import {
	BarChart3,
	TrendingUp,
	Zap,
	Loader2,
	RefreshCw,
	Shield,
	ArrowUp,
	Minus,
	ArrowDown,
	FileEdit
} from 'lucide-react';
import { useNavigate, Link } from 'react-router';
import { useSites } from '../hooks/useSites';
import { api } from '../utils/api';
import { TierGate, useTierGateContext } from '../components/common/TierGate';
import { LawTooltip } from '../components/shared/LawTooltip';
import { resolveSiteDomainAuthority } from '../lib/siteDomainAuthority';

const RANGE_OPTIONS = ['30d', '90d', 'All time'] as const;

/**
 * Navboost momentum status badge.
 * US8595225B1: topic-specific behavioral ranking — trend direction matters, not just level.
 * Building = slope > +0.001/week, Weakening = slope < -0.001/week, Flat = in between.
 */
function MomentumBadge({ status }: { status: 'building' | 'flat' | 'weakening' }) {
	if (status === 'building') {
		return (
			<span className="text-success-600 dark:text-success-400 flex items-center gap-1 text-[12px] font-semibold">
				<ArrowUp className="size-3" />
				Building
			</span>
		);
	}
	if (status === 'weakening') {
		return (
			<span className="text-error-600 dark:text-error-400 flex items-center gap-1 text-[12px] font-semibold">
				<ArrowDown className="size-3" />
				Weakening
			</span>
		);
	}
	return (
		<span className="text-warning-600 dark:text-warning-400 flex items-center gap-1 text-[12px] font-semibold">
			<Minus className="size-3" />
			Flat
		</span>
	);
}

export default function Performance() {
	const { selectedSite } = useSiteContext();
	const navigate = useNavigate();
	const [activeRange, setActiveRange] = useState<'30d' | '90d' | 'All time'>('90d');
	const [isSyncing, setIsSyncing] = useState(false);
	const [refreshingDA, setRefreshingDA] = useState(false);
	const [localDA, setLocalDA] = useState<number | null>(null);
	const { refreshSiteAuthority } = useSites();

	const measuredDA = useMemo(() => {
		if (!selectedSite) return null;
		return resolveSiteDomainAuthority({
			lastAuditAt: selectedSite.lastAuditAt,
			domainAuthorityEstimated: selectedSite.domainAuthorityEstimated,
			domainAuthority: selectedSite.domainAuthority
		});
	}, [selectedSite]);

	const displayDA =
		localDA != null
			? localDA
			: measuredDA?.known && measuredDA.value != null
				? measuredDA.value
				: null;
	const tierContext = useTierGateContext();
	const hasScale = tierContext?.hasScale ?? false;

	const handleRefreshDA = async () => {
		if (!selectedSite?.id) return;
		setRefreshingDA(true);
		const newDA = await refreshSiteAuthority(selectedSite.id);
		if (newDA != null) setLocalDA(newDA);
		setRefreshingDA(false);
	};

	// Check if GSC is connected
	const { isConnected: gscConnected } = useGSCStatus(selectedSite?.id);

	// Fetch performance data (only if site is selected and connected)
	const days = activeRange === '30d' ? 30 : activeRange === '90d' ? 90 : 365;
	const {
		topPages,
		topQueries,
		totalClicks,
		totalImpressions,
		avgCtr,
		avgPosition,
		records,
		loading
	} = usePerformanceData({
		siteId: selectedSite?.id,
		days,
		enabled: !!selectedSite && gscConnected
	});

	// Navboost signals — weekly aggregated CTR trends per query (US8595225B1)
	// Populated by gscService.aggregateNavboostSignals() on each sync
	const { signals: navboostSignals, loading: navboostLoading } = useNavboostSignals({
		siteId: selectedSite?.id,
		enabled: !!selectedSite && gscConnected
	});

	// S1-1: Content Refresh Queue — stale + declining pages (Scale+ only)
	const { items: refreshQueue, loading: refreshQueueLoading } = useRefreshQueue(
		gscConnected && selectedSite ? selectedSite.id : null,
		hasScale
	);

	// Has data to display (either from GSC or empty state for connected sites)
	const hasGscData = !!selectedSite && gscConnected;

	// Aggregate traffic data by month
	const trafficData = useMemo(() => {
		if (!hasGscData) return [];

		const byMonth: Record<string, number> = {};
		records.forEach((r) => {
			const month = r.date.slice(0, 7); // YYYY-MM
			byMonth[month] = (byMonth[month] || 0) + r.clicks;
		});

		return Object.entries(byMonth)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([month, clicks]) => ({
				month,
				clicks
			}));
	}, [records, hasGscData]);

	/**
	 * Re-Optimization Queue filter.
	 * Spec §7.8: pages at positions 4–15 with ≥500 impressions AND SEO score < 85.
	 * "Top Fix" = the single highest-impact action from the page's current SEO issues.
	 */
	// L11: Re-optimization queue — position 4–15, score < 85, ≥500 impr; sort by impressions (highest impact)
	const reOptQueue = useMemo(() => {
		return topPages
			.filter(
				(p) =>
					p.position >= 4 &&
					p.position <= 15 &&
					p.impressions >= 500 &&
					(p.seoScore == null || p.seoScore < 85)
			)
			.sort((a, b) => b.impressions - a.impressions)
			.slice(0, 10);
	}, [topPages]);

	return (
		<TierGate requiredTier="growth" pageTitle="Performance">
			<>
				<PageMeta title="Performance" description="SEO performance metrics" />

			<div className="space-y-6">
				<PageHeader
					title="Performance"
					subtitle={
						selectedSite
							? gscConnected
								? `${selectedSite.name} · Connected to Google Search Console · Last ${days} days`
								: `${selectedSite.name} · Connect GSC to see rankings and traffic`
							: gscConnected
								? `Connected to Google Search Console · Last ${days} days`
								: 'Connect Google Search Console to see rankings and traffic'
					}
					rightContent={
						<div className="flex gap-2">
							{gscConnected && (
								<button
									onClick={async () => {
										try {
											setIsSyncing(true);
											const res = await api.post('/api/gsc/sync');
											if (res.ok) {
												const result = (await res.json()) as {
													synced: number;
													rows_inserted: number;
												};
												console.log(
													`Synced ${result.synced} sites, inserted ${result.rows_inserted} rows`
												);
											}
										} catch (err) {
											console.error('Sync error:', err);
										} finally {
											setIsSyncing(false);
										}
									}}
									disabled={isSyncing}
									className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-white"
								>
									{isSyncing ? (
										<>
											<Loader2 className="mr-1.5 inline size-3 animate-spin" />
											Syncing...
										</>
									) : (
										'Sync Now'
									)}
								</button>
							)}
							{RANGE_OPTIONS.map((r) => (
								<button
									key={r}
									onClick={() => setActiveRange(r)}
									disabled={loading}
									className={`rounded-lg px-3 py-1.5 text-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
										activeRange === r
											? 'border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-500 dark:bg-brand-900/30 dark:text-brand-400 border font-semibold'
											: 'border border-gray-200 bg-white text-gray-600 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-white'
									}`}
								>
									{loading && activeRange === r ? (
										<>
											<Loader2 className="mr-1 inline size-3 animate-spin" />
											{r}
										</>
									) : (
										r
									)}
								</button>
							))}
						</div>
					}
				/>

				<AIInsightBlock
					variant="analyst"
					label="AI ANALYST"
					message={
						hasGscData
							? `Tracking ${totalImpressions.toLocaleString()} impressions and ${totalClicks.toLocaleString()} clicks across your content. Average CTR is ${avgCtr.toFixed(2)}% at position ${avgPosition.toFixed(1)}. Priority: identify pages with high impressions but low CTR for optimization.`
							: 'Connect Google Search Console to unlock performance insights, re-optimization suggestions, and click trend analysis. Your published content will appear here once GSC is linked.'
					}
				/>

				<div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{/* Stats row */}
					{!gscConnected ? (
						<>
							<div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
								<div className="text-center">
									<p className="text-sm text-gray-600 dark:text-gray-400">
										Connect GSC to see data
									</p>
								</div>
							</div>
							<div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
								<div className="text-center">
									<p className="text-sm text-gray-600 dark:text-gray-400">
										Connect GSC to see data
									</p>
								</div>
							</div>
							<div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
								<div className="text-center">
									<p className="text-sm text-gray-600 dark:text-gray-400">
										Connect GSC to see data
									</p>
								</div>
							</div>
							<div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
								<div className="text-center">
									<p className="text-sm text-gray-600 dark:text-gray-400">
										Connect GSC to see data
									</p>
								</div>
							</div>
						</>
					) : loading ? (
						<>
							<StatSkeleton />
							<StatSkeleton />
							<StatSkeleton />
							<StatSkeleton />
						</>
					) : (
						<>
							<StatCard
								label="Total Impressions"
								value={totalImpressions.toLocaleString()}
								delta={'Last ' + days + ' days'}
								deltaDirection={'neutral'}
							/>
							<StatCard
								label="Total Clicks"
								value={totalClicks.toLocaleString()}
								delta={'Last ' + days + ' days'}
								deltaDirection={'neutral'}
							/>
							<StatCard
								label="Avg. CTR"
								value={avgCtr.toFixed(2) + '%'}
								delta={'vs ' + days + ' days'}
								deltaDirection="neutral"
							/>
							<StatCard
								label="Avg. Position"
								value={avgPosition.toFixed(1)}
								delta={'vs ' + days + ' days'}
								deltaDirection="neutral"
							/>
						</>
					)}
					{/* Domain Authority — auto-fetched from Moz */}
					<div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
								<Shield className="size-3" />
								Domain Authority
							</div>
							<button
								type="button"
								onClick={handleRefreshDA}
								disabled={refreshingDA || !selectedSite?.id}
								className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 dark:hover:bg-gray-800 dark:hover:text-gray-300"
								title="Refresh from Moz"
							>
								<RefreshCw className={`size-3 ${refreshingDA ? 'animate-spin' : ''}`} />
							</button>
						</div>
						<div className="mt-2 flex items-baseline gap-1">
							<span className="text-2xl font-bold text-gray-900 dark:text-white">
								{displayDA != null ? displayDA : '—'}
							</span>
							{displayDA != null && (
								<span className="text-[11px] text-gray-400">/ 100</span>
							)}
						</div>
						<p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
							{displayDA == null
								? 'Run a technical audit or click ↺ when Moz is configured'
								: measuredDA?.source === 'audit'
									? 'from your last technical audit'
									: 'via Moz · refresh monthly'}
						</p>
					</div>
				</div>

				{/* Two column: Traffic chart + Top pages */}
				<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
					{/* Traffic chart */}
					<div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-3 dark:border-gray-700 dark:bg-gray-900">
						<div className="mb-4 flex justify-between">
							<h3 className="font-montserrat text-base font-bold text-gray-900 dark:text-white">
								Organic Traffic
							</h3>
							<span className="text-[13px] text-gray-500 dark:text-gray-400">Clicks per month</span>
						</div>
						<div className="h-[220px] w-full">
							{gscConnected ? (
								hasGscData && trafficData.length > 0 ? (
									<ResponsiveContainer width="100%" height="100%">
										<LineChart data={trafficData}>
											<CartesianGrid
												strokeDasharray="3 3"
												stroke="#E8ECF0"
												horizontal={true}
												vertical={false}
											/>
											<XAxis
												dataKey="month"
												tick={{ fontSize: 12, fill: '#9AAAB8' }}
												axisLine={false}
												tickLine={false}
											/>
											<YAxis hide />
											<Tooltip
												contentStyle={{
													backgroundColor: 'white',
													border: '1px solid #E8ECF0',
													borderRadius: '8px',
													boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
												}}
												labelStyle={{ color: '#5A6A7A' }}
											/>
											<Line
												type="monotone"
												dataKey="clicks"
												stroke="#00B4D8"
												strokeWidth={2}
												dot={{ fill: '#00B4D8', r: 4 }}
											/>
										</LineChart>
									</ResponsiveContainer>
								) : loading ? (
									<ChartSkeleton />
								) : (
									<div className="flex h-full flex-col items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800/50">
										<BarChart3 className="size-10 text-gray-400 dark:text-gray-500" />
										<p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
											No traffic data yet
										</p>
										<p className="text-xs text-gray-500 dark:text-gray-500">
											Data will appear here once you get clicks in Search Console
										</p>
									</div>
								)
							) : (
								<div className="flex h-full flex-col items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800/50">
									<BarChart3 className="size-10 text-gray-400 dark:text-gray-500" />
									<p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
										Connect Google Search Console
									</p>
									<p className="text-xs text-gray-500 dark:text-gray-500">
										to see clicks over time
									</p>
								</div>
							)}
						</div>
					</div>

					{/* Top pages */}
					<div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2 dark:border-gray-700 dark:bg-gray-900">
						<h3 className="font-montserrat mb-4 text-base font-bold text-gray-900 dark:text-white">
							Top Pages
						</h3>
						{gscConnected ? (
							hasGscData && topPages.length > 0 ? (
								<div className="space-y-3">
									{topPages.slice(0, 5).map((page) => (
										<div
											key={page.page}
											className="items-between flex justify-between border-b border-gray-200 pb-2 last:border-0 dark:border-gray-700"
										>
											<div className="min-w-0 flex-1">
												<p className="truncate text-[13px] font-medium text-gray-900 dark:text-white">
													{page.page}
												</p>
												<p className="text-[11px] text-gray-500 dark:text-gray-400">
													{page.clicks.toLocaleString()} clicks ·{' '}
													{page.impressions.toLocaleString()} impr
												</p>
											</div>
											<div className="ml-2 text-right">
												<p className="text-[13px] font-semibold text-gray-900 dark:text-white">
													{page.position.toFixed(1)}
												</p>
												<p className="text-[11px] text-gray-500 dark:text-gray-400">pos</p>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="flex flex-col items-center justify-center py-8">
									<p className="text-[13px] text-gray-500 dark:text-gray-400">No page data yet</p>
									<p className="text-xs text-gray-500 dark:text-gray-500">
										Data will appear here once you get clicks
									</p>
								</div>
							)
						) : (
							<div className="flex flex-col items-center justify-center py-8">
								<p className="text-[13px] text-gray-500 dark:text-gray-400">
									Connect GSC to see your top pages by clicks
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Re-Optimization Queue — Spec §7.8 */}
				{/* Filter: positions 4–15, ≥500 impressions, SEO score < 85 */}
				<div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
					<div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-700">
						<div>
							<h3 className="font-montserrat text-base font-bold text-gray-900 dark:text-white">
								Re-Optimization Queue
							</h3>
							<p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
								Pages at positions 4–15 with room to improve their SEO score
							</p>
						</div>
						<span className="text-[11px] font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
							Ready to promote
						</span>
					</div>
					<div className="p-6">
						{gscConnected ? (
							hasGscData && reOptQueue.length > 0 ? (
								<table className="w-full">
									<thead>
										<tr className="border-b border-gray-200 text-left text-[11px] font-semibold tracking-wider text-gray-500 uppercase dark:border-gray-700 dark:text-gray-400">
											<th className="pb-3">Page</th>
											<th className="pb-3">Position</th>
											<th className="pb-3">Impressions</th>
											<th className="pb-3">SEO Score</th>
											<th className="pb-3">Top Fix</th>
											<th className="pb-3">Action</th>
										</tr>
									</thead>
									<tbody>
										{reOptQueue.map((page) => (
											<tr key={page.page} className="border-b border-gray-200 dark:border-gray-700">
												<td className="max-w-[200px] truncate py-4 text-sm text-gray-900 dark:text-white">
													{page.page}
												</td>
												<td className="py-4 text-sm text-gray-700 dark:text-gray-300">
													{page.position.toFixed(1)}
												</td>
												<td className="py-4 text-sm text-gray-700 dark:text-gray-300">
													{page.impressions.toLocaleString()}
												</td>
												<td className="py-4">
													<span
														className={`text-sm font-semibold ${
															(page.seoScore ?? 0) >= 70
																? 'text-warning-600 dark:text-warning-400'
																: 'text-error-600 dark:text-error-400'
														}`}
													>
														{page.seoScore != null ? `${page.seoScore}/115` : '—'}
													</span>
												</td>
												<td className="max-w-[180px] py-4 text-[12px] text-gray-500 dark:text-gray-400">
													{page.topFix ?? 'Run SEO score to see top fix'}
												</td>
												<td className="py-4">
													<Button
														size="sm"
														variant="outline"
														onClick={() =>
															page.workspaceId
																? navigate(`/workspace/${page.workspaceId}`)
																: undefined
														}
													>
														Optimize
													</Button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							) : (
								<div className="flex flex-col items-center justify-center py-10 text-center">
									<Zap className="size-10 text-gray-400 dark:text-gray-500" />
									<p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
										No pages in the re-optimization queue
									</p>
									<p className="mt-1 max-w-sm text-[13px] text-gray-500 dark:text-gray-400">
										Publish content to see pages ready to promote (positions 4–15, SEO score &lt;
										85, ≥ 500 impressions).
									</p>
								</div>
							)
						) : (
							<div className="flex flex-col items-center justify-center py-10 text-center">
								<Zap className="size-10 text-gray-400 dark:text-gray-500" />
								<p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
									No pages in the re-optimization queue
								</p>
								<p className="mt-1 max-w-sm text-[13px] text-gray-500 dark:text-gray-400">
									Connect GSC and publish content to see pages ready to promote (positions 4–15, SEO
									score &lt; 85, ≥ 500 impressions).
								</p>
								<Button
									onClick={() => navigate('/sites')}
									variant="outline"
									size="sm"
									className="mt-4"
								>
									Connect Search Console
								</Button>
							</div>
						)}
					</div>
				</div>

				{/* S1-1: Content Refresh Queue — product-gaps-master.md V1.6 (Scale+ only) */}
				{/* Pages where last_updated > 6 months AND position/impressions trending down */}
				{hasScale && (
				<div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
					<div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-700">
						<div>
							<h3 className="font-montserrat text-base font-bold text-gray-900 dark:text-white">
								Content Refresh Queue
							</h3>
							<p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
								Stale content (&gt;6 months) with declining rankings — prioritize by traffic
							</p>
						</div>
					</div>
					<div className="p-6">
						{gscConnected ? (
							refreshQueueLoading ? (
								<div className="flex items-center justify-center py-10">
									<Loader2 className="size-6 animate-spin text-gray-400" />
								</div>
							) : refreshQueue.length > 0 ? (
								<table className="w-full">
									<thead>
										<tr className="border-b border-gray-200 text-left text-[11px] font-semibold tracking-wider text-gray-500 uppercase dark:border-gray-700 dark:text-gray-400">
											<th className="pb-3">Page</th>
											<th className="pb-3">Position</th>
											<th className="pb-3">Impressions</th>
											<th className="pb-3">Trend</th>
											<th className="pb-3">Stale</th>
											<th className="pb-3">Action</th>
										</tr>
									</thead>
									<tbody>
										{refreshQueue.map((item) => (
											<tr key={item.pageId} className="border-b border-gray-200 dark:border-gray-700">
												<td className="max-w-[200px] truncate py-4 text-sm text-gray-900 dark:text-white">
													{item.title}
												</td>
												<td className="py-4 text-sm text-gray-700 dark:text-gray-300">
													{item.position}
												</td>
												<td className="py-4 text-sm text-gray-700 dark:text-gray-300">
													{item.impressions.toLocaleString()}
												</td>
												<td className="py-4">
													<span
														className={`text-[12px] ${
															item.positionTrend === 'declining' || item.impressionsTrend === 'declining'
																? 'text-red-600 dark:text-red-400'
																: 'text-gray-500 dark:text-gray-400'
														}`}
													>
														{item.positionTrend === 'declining' ? 'Pos ↓' : ''}{' '}
														{item.impressionsTrend === 'declining' ? 'Impr ↓' : ''}
													</span>
												</td>
												<td className="py-4 text-[12px] text-gray-500 dark:text-gray-400">
													{item.monthsStale} mo
												</td>
												<td className="py-4">
													<Link to={`/workspace/${item.pageId}`}>
														<Button size="sm" variant="outline">
															<FileEdit className="mr-1.5 size-3.5" />
															Refresh
														</Button>
													</Link>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							) : (
								<div className="flex flex-col items-center justify-center py-10 text-center">
									<FileEdit className="size-10 text-gray-400 dark:text-gray-500" />
									<p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
										No pages in the refresh queue
									</p>
									<p className="mt-1 max-w-sm text-[13px] text-gray-500 dark:text-gray-400">
										Content older than 6 months with declining GSC position or impressions will
										appear here. Keep content fresh to maintain rankings.
									</p>
								</div>
							)
						) : (
							<div className="flex flex-col items-center justify-center py-10 text-center">
								<FileEdit className="size-10 text-gray-400 dark:text-gray-500" />
								<p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
									Connect GSC to see refresh queue
								</p>
								<p className="mt-1 max-w-sm text-[13px] text-gray-500 dark:text-gray-400">
									We compare recent vs older performance to find stale pages with declining
									rankings.
								</p>
								<Button
									onClick={() => navigate('/sites')}
									variant="outline"
									size="sm"
									className="mt-4"
								>
									Connect Search Console
								</Button>
							</div>
						)}
					</div>
				</div>
				)}

				{/* CTR Momentum Panel — US8595225B1 (Navboost) */}
				{/* Internal label: Navboost. User-facing label: "CTR Momentum" per spec §2.3 */}
				<div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
					<div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-700">
						<div>
							<h3 className="font-montserrat flex items-center gap-1.5 text-base font-bold text-gray-900 dark:text-white">
								CTR Momentum
								<LawTooltip lawId="behaviour_confirms_authority" />
							</h3>
							<p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
								Google's click signal compounds over 13 months — improving CTR today builds ranking
								power through{' '}
								{new Date(Date.now() + 365 * 86400000).toLocaleDateString('en-US', {
									month: 'long',
									year: 'numeric'
								})}
							</p>
						</div>
						<span className="text-[11px] text-gray-500 dark:text-gray-400">13-week CTR trend</span>
					</div>
					<div className="p-6">
						{gscConnected ? (
							navboostLoading ? (
								<div className="flex items-center justify-center py-10">
									<Loader2 className="size-6 animate-spin text-gray-400" />
								</div>
							) : navboostSignals && navboostSignals.length > 0 ? (
								<div className="space-y-3">
									{navboostSignals.slice(0, 5).map((signal) => (
										<div
											key={signal.query}
											className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50"
										>
											<div className="flex-1">
												<p className="truncate text-[13px] font-medium text-gray-900 dark:text-white">
													{signal.query}
												</p>
												<p className="text-[11px] text-gray-500 dark:text-gray-400">
													CTR: {(signal.avg_ctr * 100).toFixed(2)}% · Pos:{' '}
													{signal.avg_position.toFixed(1)}
												</p>
											</div>
											<div className="ml-4 flex items-center gap-3">
												{signal.status === 'weakening' && (
													<Button
														size="sm"
														variant="outline"
														className="text-[11px]"
														onClick={() =>
															signal.workspaceId
																? navigate(`/workspace/${signal.workspaceId}`)
																: undefined
														}
													>
														Optimize Title
													</Button>
												)}
												<MomentumBadge status={signal.status} />
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="flex flex-col items-center justify-center py-10 text-center">
									<TrendingUp className="size-10 text-gray-400 dark:text-gray-500" />
									<p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
										No CTR trend data yet
									</p>
									<p className="mt-1 max-w-sm text-[13px] text-gray-500 dark:text-gray-400">
										CTR trends build over 4+ weeks of data. Keep publishing and syncing — your
										momentum scores will appear here.
									</p>
								</div>
							)
						) : (
							<div className="flex flex-col items-center justify-center py-10 text-center">
								<TrendingUp className="size-10 text-gray-400 dark:text-gray-500" />
								<p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
									Connect Search Console to see CTR trends
								</p>
								<p className="mt-1 max-w-sm text-[13px] text-gray-500 dark:text-gray-400">
									Per-keyword click trends over 13 weeks. Status: Building / Flat / Weakening.
									Improving CTR today builds ranking power over the next 13 months.
								</p>
								<Button
									onClick={() => navigate('/sites')}
									variant="outline"
									size="sm"
									className="mt-4"
								>
									Connect Search Console
								</Button>
							</div>
						)}
					</div>
				</div>

				{/* Keyword Rankings table */}
				<div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
					<div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-700">
						<h3 className="font-montserrat text-base font-bold text-gray-900 dark:text-white">
							Keyword Rankings
						</h3>
						<span className="text-xs text-gray-500 dark:text-gray-400">via Search Console</span>
					</div>
					{gscConnected ? (
						hasGscData && topQueries.length > 0 ? (
							<table className="w-full">
								<thead>
									<tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
										<th className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
											Keyword
										</th>
										<th className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
											Position
										</th>
										<th className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
											Impressions
										</th>
										<th className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
											Clicks
										</th>
										<th className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
											CTR
										</th>
									</tr>
								</thead>
								<tbody>
									{topQueries.slice(0, 10).map((query) => (
										<tr
											key={query.query}
											className="border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50"
										>
											<td className="truncate px-5 py-3 text-[13px] font-medium text-gray-900 dark:text-white">
												{query.query}
											</td>
											<td className="px-5 py-3 text-[13px] text-gray-700 dark:text-gray-300">
												{query.position.toFixed(1)}
											</td>
											<td className="px-5 py-3 text-[13px] text-gray-700 dark:text-gray-300">
												{query.impressions.toLocaleString()}
											</td>
											<td className="px-5 py-3 text-[13px] text-gray-700 dark:text-gray-300">
												{query.clicks.toLocaleString()}
											</td>
											<td className="px-5 py-3 text-[13px] text-gray-700 dark:text-gray-300">
												{query.ctr.toFixed(2)}%
											</td>
										</tr>
									))}
								</tbody>
							</table>
						) : (
							<div className="flex flex-col items-center justify-center py-12 text-center">
								<BarChart3 className="size-12 text-gray-400 dark:text-gray-500" />
								<p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
									No keyword data yet
								</p>
								<p className="mt-1 max-w-sm text-[13px] text-gray-500 dark:text-gray-400">
									Available when you have search results data. Rankings, CTR, and re-optimization
									suggestions will appear here.
								</p>
							</div>
						)
					) : (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<BarChart3 className="size-12 text-gray-400 dark:text-gray-500" />
							<p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
								Connect Search Console to see your rankings
							</p>
							<p className="mt-1 max-w-sm text-[13px] text-gray-500 dark:text-gray-400">
								Available when Google Search Console is connected. Rankings, CTR, and
								re-optimization suggestions will appear here.
							</p>
							<Button
								onClick={() => navigate('/sites')}
								variant="outline"
								size="sm"
								className="mt-4"
							>
								Connect Search Console
							</Button>
						</div>
					)}
				</div>
			</div>
			</>
		</TierGate>
	);
}
