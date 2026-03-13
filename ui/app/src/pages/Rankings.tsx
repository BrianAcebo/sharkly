/**
 * Rankings Page (Growth+ tier)
 * GSC keyword rankings with CTR optimization
 *
 * Momentum status: 'building' | 'flat' | 'weakening'
 * - Calculated in rankingsController via 4-week linear regression on navboost_signals
 * - US8595225B1 (Navboost): trend direction matters, not just CTR level
 * - position change (↑↓) calculated in rankingsController by comparing current vs previous period
 */

import { useState } from 'react';
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { AIInsightBlock } from '../components/shared/AIInsightBlock';
import { Button } from '../components/ui/button';
import { useSiteContext } from '../contexts/SiteContext';
import { useRankings } from '../hooks/useRankings';
import { useGSCStatus } from '../hooks/useGSCStatus';
import { CTROptimizationModal } from '../components/rankings/CTROptimizationModal';
import { ArrowUp, ArrowDown, Minus, TrendingUp } from 'lucide-react';
import { Link } from 'react-router';
import type { RankingData } from '../hooks/useRankings';
import { TierGate } from '../components/common/TierGate';

type SortField = 'keyword' | 'position' | 'clicks' | 'impressions' | 'ctr';
type SortOrder = 'asc' | 'desc';

export default function Rankings() {
	const { selectedSite } = useSiteContext();

	const { isConnected: gscConnected } = useGSCStatus(selectedSite?.id);

	const [activeRange, setActiveRange] = useState<30 | 90 | 365>(30);
	const [sortBy, setSortBy] = useState<SortField>('impressions');
	const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
	const [ctrModalOpen, setCtrModalOpen] = useState(false);
	const [selectedRanking, setSelectedRanking] = useState<RankingData | null>(null);

	const { rankings, loading, error } = useRankings({
		siteId: selectedSite?.id,
		days: activeRange,
		sortBy,
		order: sortOrder,
		enabled: !!selectedSite && gscConnected
	});

	const openCTRModal = (ranking: RankingData) => {
		setSelectedRanking(ranking);
		setCtrModalOpen(true);
	};

	const handleSort = (field: SortField, defaultOrder: SortOrder = 'desc') => {
		if (sortBy === field) {
			setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
		} else {
			setSortBy(field);
			setSortOrder(defaultOrder);
		}
	};

	return (
		<TierGate requiredTier="growth" pageTitle="Rankings">
			<>
				<PageMeta title="Rankings" description="Keyword rankings and performance" noIndex />

				<div className="space-y-6">
				<PageHeader
					title="Rankings"
					subtitle={
						selectedSite
							? `${selectedSite.name} · Keyword positions, CTR, and click trends`
							: 'Select a site to view rankings'
					}
				/>

				{/* AI Insight Block */}
				<AIInsightBlock
					variant="analyst"
					label="RANKINGS INSIGHT"
					message={
						gscConnected
							? rankings.length > 0
								? `You're tracking ${rankings.length} keywords. ${rankings.filter((r) => r.position <= 3).length} are in the top 3. Focus on pages with CTR under 2% — improving click rates builds ranking power over time.`
								: 'No ranking data yet. GSC data will appear once Google indexes your pages.'
							: 'Connect Google Search Console on the sites page to start tracking your keyword rankings.'
					}
				/>

				{!gscConnected && (
					<div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/20">
						<p className="text-[13px] text-amber-900 dark:text-amber-200">
							Connect Google Search Console on your site to start seeing keyword rankings and CTR
							data.
						</p>
						<Link to="/sites">
							<Button variant="flat" size="sm" className="mt-2">
								Go to Sites →
							</Button>
						</Link>
					</div>
				)}

				{/* Range Filter */}
				{gscConnected && (
					<div className="mt-6 flex gap-2">
						{[
							{ label: '30 days', value: 30 as const },
							{ label: '90 days', value: 90 as const },
							{ label: 'All time', value: 365 as const }
						].map(({ label, value }) => (
							<button
								key={value}
								onClick={() => setActiveRange(value)}
								className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
									activeRange === value
										? 'bg-brand-500 dark:bg-brand-600 text-white'
										: 'border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
								}`}
							>
								{label}
							</button>
						))}
					</div>
				)}

				{/* Rankings Table */}
				{gscConnected && (
					<div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
						{loading ? (
							<div className="flex items-center justify-center py-12">
								<div className="text-center">
									<div className="border-t-brand-500 dark:border-t-brand-400 mx-auto mb-3 size-8 animate-spin rounded-full border-4 border-gray-200 dark:border-gray-700" />
									<p className="text-sm text-gray-600 dark:text-gray-400">Loading rankings...</p>
								</div>
							</div>
						) : error ? (
							<div className="flex items-center justify-center py-12">
								<div className="text-center">
									<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
								</div>
							</div>
						) : rankings.length === 0 ? (
							<div className="flex items-center justify-center py-12">
								<div className="text-center">
									<TrendingUp className="mx-auto mb-2 size-8 text-gray-400 dark:text-gray-500" />
									<p className="text-sm text-gray-600 dark:text-gray-400">
										No ranking data yet. Check back once Google indexes your pages.
									</p>
								</div>
							</div>
						) : (
							<table className="w-full">
								<thead>
									<tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
										<th
											onClick={() => handleSort('keyword', 'asc')}
											className="cursor-pointer px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-600 uppercase hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50"
										>
											Keyword
										</th>
										<th
											onClick={() => handleSort('position', 'asc')}
											className="cursor-pointer px-5 py-3 text-center text-[11px] font-semibold tracking-widest text-gray-600 uppercase hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50"
										>
											Position
										</th>
										<th
											onClick={() => handleSort('impressions')}
											className="cursor-pointer px-5 py-3 text-center text-[11px] font-semibold tracking-widest text-gray-600 uppercase hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50"
										>
											Impressions
										</th>
										<th
											onClick={() => handleSort('clicks')}
											className="cursor-pointer px-5 py-3 text-center text-[11px] font-semibold tracking-widest text-gray-600 uppercase hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50"
										>
											Clicks
										</th>
										<th
											onClick={() => handleSort('ctr')}
											className="cursor-pointer px-5 py-3 text-center text-[11px] font-semibold tracking-widest text-gray-600 uppercase hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50"
										>
											CTR
										</th>
										<th className="px-5 py-3 text-center text-[11px] font-semibold tracking-widest text-gray-600 uppercase dark:text-gray-400">
											Click Trend
										</th>
										<th className="px-5 py-3 text-center text-[11px] font-semibold tracking-widest text-gray-600 uppercase dark:text-gray-400">
											Action
										</th>
									</tr>
								</thead>
								<tbody>
									{rankings.map((ranking, idx) => (
										<tr
											key={`${ranking.keyword}-${idx}`}
											className="border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50"
										>
											<td className="truncate px-5 py-3 text-[13px] font-medium text-gray-900 dark:text-white">
												{ranking.keyword}
											</td>

											{/* Position + change delta */}
											<td className="px-5 py-3 text-center text-[13px] text-gray-700 dark:text-gray-300">
												<div className="flex items-center justify-center gap-1">
													<span>{ranking.position.toFixed(0)}</span>
													{ranking.change > 0 && (
														<span className="text-success-600 dark:text-success-400 flex items-center gap-0.5 text-[11px] font-semibold">
															<ArrowUp className="size-3" />
															{ranking.change}
														</span>
													)}
													{ranking.change < 0 && (
														<span className="text-error-600 dark:text-error-400 flex items-center gap-0.5 text-[11px] font-semibold">
															<ArrowDown className="size-3" />
															{Math.abs(ranking.change)}
														</span>
													)}
													{ranking.change === 0 && (
														<Minus className="size-3 text-gray-400 dark:text-gray-500" />
													)}
												</div>
											</td>

											<td className="px-5 py-3 text-center text-[13px] text-gray-700 dark:text-gray-300">
												{ranking.impressions.toLocaleString()}
											</td>
											<td className="px-5 py-3 text-center text-[13px] font-medium text-gray-900 dark:text-white">
												{ranking.clicks.toLocaleString()}
											</td>
											<td className="px-5 py-3 text-center text-[13px] text-gray-700 dark:text-gray-300">
												{(ranking.ctr * 100).toFixed(2)}%
											</td>

											{/* Click trend — user-facing label for Navboost momentum (§2.3) */}
											<td className="px-5 py-3 text-center text-[12px]">
												{ranking.momentum === 'building' && (
													<span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-green-700 dark:bg-green-900/30 dark:text-green-300">
														<span className="inline-block size-1.5 rounded-full bg-green-500" />
														Building
													</span>
												)}
												{ranking.momentum === 'flat' && (
													<span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
														<span className="inline-block size-1.5 rounded-full bg-amber-500" />
														Flat
													</span>
												)}
												{ranking.momentum === 'weakening' && (
													<span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-red-700 dark:bg-red-900/30 dark:text-red-300">
														<span className="inline-block size-1.5 rounded-full bg-red-500" />
														Weakening
													</span>
												)}
											</td>

											<td className="px-5 py-3 text-center">
												{ranking.ctr < 0.02 ? (
													<Button
														variant="ghost"
														size="sm"
														className="text-brand-500 hover:text-brand-600 text-xs"
														onClick={() => openCTRModal(ranking)}
													>
														Optimize CTR
													</Button>
												) : (
													<span className="text-[11px] text-gray-400 dark:text-gray-500">—</span>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>
				)}
			</div>

				<CTROptimizationModal
					open={ctrModalOpen}
					onClose={() => setCtrModalOpen(false)}
					siteId={selectedSite?.id ?? ''}
					ranking={selectedRanking}
				/>
			</>
		</TierGate>
	);
}
