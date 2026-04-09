import PageMeta from '../components/common/PageMeta';
import { AIInsightBlock } from '../components/shared/AIInsightBlock';
import { StatCard } from '../components/shared/StatCard';
import { FunnelTag } from '../components/shared/FunnelTag';
import { SEOGrowthStagePanel, getDefaultGrowthStage } from '../components/shared/SEOGrowthStagePanel';
import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { Target, Check, Clock, Lock, Plus } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { useSiteContext } from '../contexts/SiteContext';
import { useClusters } from '../hooks/useClusters';
import { useTopics } from '../hooks/useTopics';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useGSCStatus } from '../hooks/useGSCStatus';
import { usePerformanceData } from '../hooks/usePerformanceData';
import { useWeeklyPriorityStack } from '../hooks/useWeeklyPriorityStack';
import { WeeklyPriorityStack } from '../components/shared/WeeklyPriorityStack';
import { PublishingCadenceCard } from '../components/shared/PublishingCadenceCard';
import AuditScoreCard from '../components/audit/AuditScoreCard';
import { SiteHealthPanel } from '../components/dashboard/SiteHealthPanel';
import { useAuditHistory } from '../hooks/useAuditHistory';

export default function Dashboard() {
	const { user } = useAuth();
	const { selectedSite } = useSiteContext();
	const { clusters } = useClusters(selectedSite?.id ?? null);
	const { topics } = useTopics(selectedSite?.id ?? null);
	const { publishedCount, avgSeoScore } = useDashboardStats(selectedSite?.id ?? null);
	const { isConnected: gscConnected } = useGSCStatus(selectedSite?.id);
	const { history: auditHistory, loading: auditHistoryLoading } = useAuditHistory(selectedSite?.id, 5);
	const { avgPosition, totalClicks } = usePerformanceData({
		siteId: selectedSite?.id,
		days: 30,
		enabled: !!selectedSite && gscConnected
	});
	const { items: priorityItems, cadence: publishingCadence, loading: priorityLoading, error: priorityError, refetch: refetchPriorities } = useWeeklyPriorityStack(selectedSite?.id ?? null);

	const keywordsTracked = topics.filter((t) => t.status === 'active').length;
	const growthStage = getDefaultGrowthStage(undefined);

	const activeCluster = clusters[0] ?? null;
	const progressPct = activeCluster && activeCluster.total > 0
		? (activeCluster.completion / activeCluster.total) * 100
		: 0;

	const aiInsightMessage = activeCluster
		? `Your active cluster "${activeCluster.title}" is ${activeCluster.completion} of ${activeCluster.total} pieces complete. ${activeCluster.completion < activeCluster.total ? 'Open it to generate briefs and articles for the remaining pieces.' : 'Add internal links between articles and to your focus page to maximize rankings.'}`
		: topics.length > 0
			? `You have ${topics.filter((t) => t.authorityFit === 'achievable' && t.status !== 'active').length} achievable topics ready. Start a cluster from Strategy to create your first content hub.`
			: 'Complete onboarding to get your topic strategy. Then start a cluster from the Strategy page.';

	return (
		<>
			<PageMeta title="Dashboard" description="Your SEO dashboard" noIndex />

			{/* Section 1: Page Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-montserrat text-[26px] font-bold text-gray-900 dark:text-white">
						{user?.first_name ? `Good morning, ${user.first_name}` : 'Good morning'}
					</h1>
					<p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">
						{selectedSite?.name} · {selectedSite?.url} · Last updated today
					</p>
				</div>
				<Link to="/strategy">
					<Button
						className="bg-brand-500 hover:bg-brand-600 text-white"
						startIcon={<Plus className="size-4" />}
					>
						New Cluster
					</Button>
				</Link>
			</div>

			{/* Section 2: AI Strategist Block */}
			<div className="mt-6">
				<AIInsightBlock variant="strategy" label="AI STRATEGIST" message={aiInsightMessage} />
				<div className="mt-2 flex justify-end">
					{activeCluster ? (
						<Link to={`/clusters/${activeCluster.id}`}>
							<Button variant="ghost" size="sm">
								View Plan →
							</Button>
						</Link>
					) : (
						<Link to="/strategy">
							<Button variant="ghost" size="sm">
								Topic Strategy →
							</Button>
						</Link>
					)}
				</div>
			</div>

			{/* Section 3: Stats Row — Section 7.3 */}
			<div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard label="Keywords Tracked" value={keywordsTracked > 0 ? String(keywordsTracked) : '0'} delta={keywordsTracked > 0 ? 'in active clusters' : 'Start your first cluster'} deltaDirection="neutral" />
				<StatCard
					label="Avg. Position"
					value={gscConnected && avgPosition != null ? avgPosition.toFixed(1) : '—'}
					delta={gscConnected ? (totalClicks != null ? `${totalClicks.toLocaleString()} clicks · last 30d` : 'last 30 days') : 'Connect Search Console'}
					deltaDirection="neutral"
				/>
				<StatCard label="Content Published" value={publishedCount > 0 ? String(publishedCount) : '0'} delta={publishedCount > 0 ? 'pages live' : 'Publish your first article'} deltaDirection="neutral" />
				<StatCard label="SEO Score (0–115)" value={avgSeoScore != null ? String(avgSeoScore) : 'N/A'} delta={avgSeoScore != null ? 'avg of published' : 'Publish content first'} deltaDirection="neutral" />
			</div>

		{/* Section 4b: SEO Growth Stage Panel — V1 Section 7.3, 12.2, 17.8 */}
		<div className="mt-6">
			<SEOGrowthStagePanel stage={growthStage} />
		</div>

		{/* Section 4c: Site audit + health rail — fills width on large screens */}
		{selectedSite && (
			<div className="mt-6 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
				<div className="min-w-0">
					<AuditScoreCard />
				</div>
				<div className="min-w-0">
					<SiteHealthPanel
						gscConnected={gscConnected}
						history={auditHistory}
						historyLoading={auditHistoryLoading}
					/>
				</div>
			</div>
		)}

		{/* Section 5: Two column - Active Cluster + Quick Wins */}
			<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
				{/* Left: Active Cluster Card */}
				<div className="rounded-xl border border-gray-200 bg-white p-6 lg:col-span-3 dark:border-gray-700 dark:bg-gray-900">
					<div className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
						Active Cluster
					</div>
					{activeCluster ? (
						<>
							<h2 className="font-montserrat mt-2 text-[20px] font-bold text-gray-900 dark:text-white">
								{activeCluster.title}
							</h2>
							<p className="mt-0.5 font-mono text-[13px] text-gray-500 dark:text-gray-400">
								{activeCluster.targetKeyword}
							</p>

							<div className="mt-4">
								<div className="mb-1.5 flex justify-between text-[13px] text-gray-600 dark:text-gray-400">
									<span>
										{activeCluster.completion} of {activeCluster.total} pieces complete
									</span>
								</div>
								<div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
									<div
										className="bg-brand-500 h-full rounded-full transition-all"
										style={{ width: `${progressPct}%` }}
									/>
								</div>
							</div>

							<div className="mt-4">
								<div className="mb-2 text-[11px] text-gray-500 dark:text-gray-400">Funnel Coverage</div>
								<div className="flex h-2 w-full overflow-hidden rounded-full">
									<div className="bg-blue-light-500 opacity-70" style={{ flex: Math.max(1, activeCluster.funnelCoverage?.tofu ?? 0) }} />
									<div className="bg-warning-500" style={{ flex: Math.max(1, activeCluster.funnelCoverage?.mofu ?? 0) }} />
									<div className="bg-success-500" style={{ flex: Math.max(1, activeCluster.funnelCoverage?.bofu ?? 0) }} />
								</div>
								<p className="text-warning-600 dark:text-warning-400 mt-1 text-[11px]">
									{(activeCluster.funnelCoverage?.mofu ?? 0) < 1 ? 'Add a MoFu article' : (activeCluster.funnelCoverage?.bofu ?? 0) < 1 ? 'Add a BoFu article' : 'Funnel balanced'}
								</p>
							</div>

							<Link to={`/clusters/${activeCluster.id}`} className="mt-5 block">
								<Button className="bg-brand-500 hover:bg-brand-600 w-full text-white">
									Continue Working →
								</Button>
							</Link>
						</>
					) : (
						<>
							<p className="mt-2 text-[15px] text-gray-600 dark:text-gray-400">
								No cluster yet. Start one from your topic strategy.
							</p>
							<Link to="/strategy" className="mt-5 block">
								<Button className="bg-brand-500 hover:bg-brand-600 w-full text-white">
									Go to Strategy →
								</Button>
							</Link>
						</>
					)}
				</div>

				{/* Right: Publishing Cadence (S2-16) + Weekly Priority Stack (L5) */}
				<div className="flex flex-col gap-4 lg:col-span-2">
					<PublishingCadenceCard cadence={publishingCadence} />
					<WeeklyPriorityStack
						items={priorityItems}
						loading={priorityLoading}
						error={priorityError}
						onRefetch={refetchPriorities}
					/>
				</div>
			</div>

			{/* Section 6: Topic Queue */}
			<div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
				<div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-700">
					<h3 className="font-montserrat flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
						<Target className="text-brand-500 dark:text-brand-400 size-4" />
						Topic Queue
					</h3>
					<Link to="/strategy">
						<Button variant="ghost" size="sm">
							View full strategy →
						</Button>
					</Link>
				</div>
				<table className="w-full">
					<thead>
						<tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
							<th className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
								#
							</th>
							<th className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
								Topic
							</th>
							<th className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
								Funnel
							</th>
							<th className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
								Monthly Searches
							</th>
							<th className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400" title="How hard it is to rank for this">
								Rank
							</th>
							<th className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
								Authority Fit
							</th>
							<th className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
								Action
							</th>
						</tr>
					</thead>
					<tbody>
						{topics.length === 0 ? (
							<tr>
								<td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
									No topics yet. Add topics on the Strategy page or complete onboarding for an AI-generated strategy.
									<div className="mt-3">
										<Link to="/strategy">
											<Button size="sm" variant="outline">Go to Strategy</Button>
										</Link>
									</div>
								</td>
							</tr>
						) : (
						topics.slice(0, 5).map((topic, idx) => {
							const kdColor =
								topic.kd < 25
									? 'text-success-600 dark:text-success-400 font-bold'
									: topic.kd <= 45
										? 'text-warning-600 dark:text-warning-400 font-bold'
										: 'text-error-600 dark:text-error-400 font-bold';
							const AuthIcon =
								topic.authorityFit === 'achievable'
									? Check
									: topic.authorityFit === 'buildToward'
										? Clock
										: Lock;
							const authLabel =
								topic.authorityFit === 'achievable'
									? 'Achievable Now'
									: topic.authorityFit === 'buildToward'
										? 'Build Toward'
										: 'Locked';
							const authColor =
								topic.authorityFit === 'achievable'
									? 'text-brand-600 dark:text-brand-400 font-semibold'
									: topic.authorityFit === 'buildToward'
										? 'text-warning-600 font-semibold'
										: 'text-gray-500 dark:text-gray-400';
							const isActive = topic.status === 'active';

							return (
								<tr
									key={topic.id}
									className={`border-b border-gray-200 transition-colors last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 ${
										isActive ? 'border-l-brand-500 border-l-4' : ''
									}`}
								>
									<td className="px-5 py-4 text-[13px] text-gray-500 dark:text-gray-400">
										{topic.priority ?? idx + 1}
									</td>
									<td className="px-5 py-4">
										<div className="font-semibold text-gray-900 dark:text-white">{topic.title}</div>
										<div className="text-xs text-gray-500 dark:text-gray-400">
											{topic.reasoning}
										</div>
									</td>
									<td className="px-5 py-4">
										<FunnelTag stage={topic.funnel} />
									</td>
									<td className="px-5 py-4 text-sm text-gray-900 dark:text-white">
										{topic.volume.toLocaleString()}
									</td>
									<td className={`px-5 py-4 text-sm ${kdColor}`}>{topic.kd}</td>
									<td className={`px-5 py-4 text-sm ${authColor}`}>
										<span className="inline-flex items-center gap-1.5">
											<AuthIcon className="size-3.5 shrink-0" />
											{authLabel}
										</span>
									</td>
									<td className="px-5 py-4">
										{topic.status === 'active' && topic.clusterId ? (
											<Link to={`/clusters/${topic.clusterId}`}>
												<Button size="sm" className="bg-brand-500 hover:bg-brand-600 text-white">
													View Cluster
												</Button>
											</Link>
										) : (topic.status === 'queued' || !topic.clusterId) && topic.authorityFit === 'achievable' ? (
											<Link to="/strategy">
												<Button size="sm" variant="outline">
													Start
												</Button>
											</Link>
										) : (
											<Button size="sm" variant="ghost" disabled>
												Locked
											</Button>
										)}
									</td>
								</tr>
							);
						})
						)}
					</tbody>
				</table>
			</div>
		</>
	);
}
