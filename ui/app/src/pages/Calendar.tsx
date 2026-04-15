/**
 * Content Calendar — V1
 * Strategy targets, then tabs: topic queue (expandable rows + cluster pipeline)
 * or article schedule (FullCalendar).
 */
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { AIInsightBlock } from '../components/shared/AIInsightBlock';
import { FunnelTag } from '../components/shared/FunnelTag';
import { TopicQueueTable } from '../components/shared/TopicQueueTable';
import { ContentScheduleCalendar } from '../components/shared/ContentScheduleCalendar';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useSiteContext } from '../contexts/SiteContext';
import { useClusters } from '../hooks/useClusters';
import { useTopics } from '../hooks/useTopics';
import { useTargets } from '../hooks/useTargets';
import { supabase } from '../utils/supabaseClient';
import {
	CalendarDays,
	FileText,
	CheckCircle2,
	Clock,
	PenLine,
	Layers,
	ChevronRight,
	Filter,
	Plus,
	Target as TargetIcon,
	LayoutList
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CalendarPage {
	id: string;
	title: string;
	keyword: string;
	type: 'focus_page' | 'article';
	funnel: 'tofu' | 'mofu' | 'bofu';
	status: 'planned' | 'brief_generated' | 'draft' | 'published';
	seoScore: number;
	wordCount: number;
	clusterId: string;
	clusterTitle: string;
}

type StatusFilter = 'all' | 'planned' | 'brief_generated' | 'draft' | 'published';
type FunnelFilter = 'all' | 'tofu' | 'mofu' | 'bofu';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
	planned: {
		label: 'Planned',
		icon: Clock,
		color: 'text-gray-400',
		bg: 'bg-gray-100 dark:bg-gray-800',
		border: 'border-gray-200 dark:border-gray-700'
	},
	brief_generated: {
		label: 'Brief Ready',
		icon: FileText,
		color: 'text-blue-500',
		bg: 'bg-blue-50 dark:bg-blue-900/20',
		border: 'border-blue-200 dark:border-blue-800'
	},
	draft: {
		label: 'Draft',
		icon: PenLine,
		color: 'text-amber-500',
		bg: 'bg-amber-50 dark:bg-amber-900/20',
		border: 'border-amber-200 dark:border-amber-800'
	},
	published: {
		label: 'Published',
		icon: CheckCircle2,
		color: 'text-green-500',
		bg: 'bg-green-50 dark:bg-green-900/20',
		border: 'border-green-200 dark:border-green-800'
	}
};

function StatusBadge({ status }: { status: CalendarPage['status'] }) {
	const cfg = STATUS_CONFIG[status];
	const Icon = cfg.icon;
	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.border} ${cfg.color}`}
		>
			<Icon className="size-3 shrink-0" />
			{cfg.label}
		</span>
	);
}

function ClusterPagesList({
	pages,
	clusterId,
	clusterTitle
}: {
	pages: CalendarPage[];
	clusterId: string;
	clusterTitle: string;
}) {
	return (
		<div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
			<div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-800/50">
				<div className="flex min-w-0 items-center gap-2">
					<Layers className="size-4 shrink-0 text-gray-400" />
					<span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
						{clusterTitle}
					</span>
					<span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
						· {pages.length} piece{pages.length !== 1 ? 's' : ''} ·{' '}
						{pages.filter((p) => p.status === 'published').length} published
					</span>
				</div>
				<Link to={`/clusters/${clusterId}`}>
					<Button variant="ghost" size="sm" className="h-7 text-xs">
						View cluster <ChevronRight className="ml-1 size-3.5" />
					</Button>
				</Link>
			</div>
			<div className="divide-y divide-gray-50 dark:divide-gray-800">
				{pages.map((page) => (
					<div
						key={page.id}
						className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
					>
						<div className="shrink-0">
							{page.type === 'focus_page' ? (
								<span className="inline-flex items-center rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-bold text-white dark:bg-white dark:text-gray-900">
									FOCUS
								</span>
							) : (
								<span className="inline-flex items-center rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:border-gray-700">
									ARTICLE
								</span>
							)}
						</div>
						<div className="min-w-0 flex-1">
							<div className="truncate text-sm font-medium text-gray-900 dark:text-white">
								{page.title}
							</div>
							<div className="truncate font-mono text-[11px] text-gray-400 dark:text-gray-500">
								{page.keyword}
							</div>
						</div>
						<div className="flex shrink-0 flex-wrap items-center gap-2">
							<FunnelTag stage={page.funnel} />
							<StatusBadge status={page.status} />
							{page.status !== 'planned' && page.wordCount > 0 && (
								<span className="text-[11px] text-gray-400">
									{page.wordCount.toLocaleString()} words
								</span>
							)}
							{page.seoScore > 0 && (
								<span
									className={`text-[11px] font-semibold ${page.seoScore >= 76 ? 'text-green-500' : page.seoScore >= 55 ? 'text-amber-500' : 'text-red-500'}`}
								>
									{page.seoScore}/115
								</span>
							)}
						</div>
						<Link to={`/clusters/${clusterId}/workspace/${page.id}`} className="shrink-0">
							<Button variant="ghost" size="sm" className="h-7 text-xs">
								{page.status === 'planned' ? 'Generate' : 'Open'}
								<ChevronRight className="ml-1 size-3.5" />
							</Button>
						</Link>
					</div>
				))}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Calendar() {
	const { selectedSite } = useSiteContext();
	const { clusters, loading: clustersLoading } = useClusters(selectedSite?.id ?? null);
	const { topics, loading: topicsLoading } = useTopics(selectedSite?.id ?? null);
	const { targets, loading: targetsLoading } = useTargets(selectedSite?.id ?? null);

	const targetNameById = useMemo(() => {
		const m = new Map<string, string>();
		for (const t of targets) m.set(t.id, t.name);
		return m;
	}, [targets]);

	const [allPages, setAllPages] = useState<CalendarPage[]>([]);
	const [pagesLoading, setPagesLoading] = useState(false);

	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
	const [funnelFilter, setFunnelFilter] = useState<FunnelFilter>('all');
	const [clusterFilter, setClusterFilter] = useState<string>('all');
	const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

	useEffect(() => {
		setExpandedTopicId(null);
	}, [statusFilter, funnelFilter, clusterFilter]);

	// Fetch all pages for all clusters in this site
	useEffect(() => {
		if (!selectedSite?.id || clusters.length === 0) {
			setAllPages([]);
			return;
		}
		setPagesLoading(true);
		const clusterIds = clusters.map((c) => c.id);
		void Promise.resolve(
			supabase
				.from('pages')
				.select('id, cluster_id, title, keyword, type, funnel_stage, status, seo_score, word_count')
				.in('cluster_id', clusterIds)
				.order('sort_order', { ascending: true })
		)
			.then(({ data }) => {
				const clusterMap = new Map(clusters.map((c) => [c.id, c.title]));
				setAllPages(
					(data ?? []).map((row) => ({
						id: row.id,
						title: row.title ?? '',
						keyword: row.keyword ?? '',
						type: (row.type as CalendarPage['type']) || 'article',
						funnel: (row.funnel_stage as CalendarPage['funnel']) || 'mofu',
						status: (row.status as CalendarPage['status']) || 'planned',
						seoScore: row.seo_score ?? 0,
						wordCount: row.word_count ?? 0,
						clusterId: row.cluster_id,
						clusterTitle: clusterMap.get(row.cluster_id) ?? 'Unknown'
					}))
				);
			})
			.finally(() => setPagesLoading(false));
	}, [selectedSite?.id, clusters]);

	// Filtered list
	const filtered = useMemo(() => {
		return allPages.filter((p) => {
			if (statusFilter !== 'all' && p.status !== statusFilter) return false;
			if (funnelFilter !== 'all' && p.funnel !== funnelFilter) return false;
			if (clusterFilter !== 'all' && p.clusterId !== clusterFilter) return false;
			return true;
		});
	}, [allPages, statusFilter, funnelFilter, clusterFilter]);

	// Summary counts
	const counts = useMemo(() => {
		const c = { planned: 0, brief_generated: 0, draft: 0, published: 0 };
		for (const p of allPages) c[p.status]++;
		return c;
	}, [allPages]);

	const schedulePages = useMemo(
		() =>
			allPages.map((p) => ({
				id: p.id,
				title: p.title,
				keyword: p.keyword,
				clusterId: p.clusterId,
				clusterTitle: p.clusterTitle,
				status: p.status
			})),
		[allPages]
	);

	const loading = clustersLoading || pagesLoading;

	const aiMessage = useMemo(() => {
		const total = allPages.length;
		const topicHint =
			topics.length > 0
				? ` Your topic queue (${topics.length} topic${topics.length !== 1 ? 's' : ''}) shows what to tackle next by priority and authority fit.`
				: '';
		if (total === 0 && topics.length === 0 && targets.length === 0) {
			return `Add strategy targets and generate topics from Strategy, then build clusters here. This page is your map: prioritized topics first, then every cluster page from planned to published.${topicHint}`;
		}
		if (total === 0) {
			return `Use the topic list below to see what's next. Expand a topic to open its cluster pipeline once you've started a cluster.${topicHint}`;
		}
		const published = counts.published;
		const inProgress = counts.draft + counts.brief_generated;
		const planned = counts.planned;
		if (published === total) {
			return `All ${total} pieces are published. Consider starting a new cluster from Strategy to continue building topical authority.${topicHint}`;
		}
		if (published === 0 && inProgress === 0) {
			return `You have ${planned} planned pieces across ${clusters.length} cluster${clusters.length !== 1 ? 's' : ''}. Open a cluster to start generating briefs and articles.${topicHint}`;
		}
		return `${published} published · ${inProgress} in progress · ${planned} planned. ${inProgress > 0 ? 'Keep going — finishing in-progress pieces before starting new clusters maximizes topical authority.' : 'Open a cluster to work on your next piece.'}${topicHint}`;
	}, [allPages, counts, clusters, topics.length, targets.length]);

	return (
		<>
			<PageMeta title="Content Calendar" noIndex description="Plan and track your content" />

			<PageHeader
				title="Content Calendar"
				subtitle={
					selectedSite
						? `${selectedSite.name} · ${topics.length} topic${topics.length !== 1 ? 's' : ''} queued · ${targets.length} target${targets.length !== 1 ? 's' : ''} · ${allPages.length} cluster piece${allPages.length !== 1 ? 's' : ''}`
						: 'Select a site to view your content calendar'
				}
				rightContent={
					selectedSite ? (
						<div className="flex flex-wrap items-center justify-end gap-2">
							<Link to="/strategy">
								<Button
									variant="outline"
									size="sm"
									className="border-gray-300 dark:border-gray-600"
								>
									<TargetIcon className="mr-1.5 size-4" />
									Strategy
								</Button>
							</Link>
							<Link to="/strategy">
								<Button className="bg-brand-500 hover:bg-brand-600 text-white" size="sm">
									<Plus className="mr-1.5 size-4" />
									New cluster
								</Button>
							</Link>
						</div>
					) : undefined
				}
			/>

			<div className="mt-6 space-y-6">
				{/* AI insight */}
				<AIInsightBlock variant="strategy" label="CONTENT CALENDAR" message={aiMessage} />

				{selectedSite && !targetsLoading && targets.length === 0 && (
					<div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-5 dark:border-gray-700 dark:bg-gray-900/50">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<h2 className="font-montserrat text-sm font-bold text-gray-900 dark:text-white">
									No strategy targets yet
								</h2>
								<p className="mt-1 max-w-xl text-[13px] text-gray-600 dark:text-gray-400">
									Targets group the topics you want to rank for. Add one from Strategy so generated
									topics have a clear home.
								</p>
							</div>
							<Link to="/strategy">
								<Button size="sm" className="bg-brand-500 hover:bg-brand-600 shrink-0 text-white">
									<Plus className="mr-1.5 size-4" />
									Add target
								</Button>
							</Link>
						</div>
					</div>
				)}

				{/* Topic queue vs schedule calendar */}
				{!selectedSite ? (
					<div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
						<CalendarDays className="mx-auto size-12 text-gray-300 dark:text-gray-600" />
						<p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
							Select a site to view your content calendar
						</p>
					</div>
				) : (
					<Tabs
						defaultValue="queue"
						className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700"
					>
						<TabsList className="h-10 w-full max-w-md border border-gray-200 bg-gray-50 p-1 sm:w-auto dark:border-gray-700 dark:bg-gray-800/50">
							<TabsTrigger value="queue" className="gap-2 px-4">
								<LayoutList className="size-4 shrink-0" />
								Topic queue
							</TabsTrigger>
							<TabsTrigger value="schedule" className="gap-2 px-4">
								<CalendarDays className="size-4 shrink-0" />
								Schedule
							</TabsTrigger>
						</TabsList>

						<TabsContent value="queue" className="mt-6 space-y-6 focus:outline-none">
							<div className="flex flex-wrap items-end justify-between gap-3">
								<div>
									<h2 className="font-montserrat flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
										<TargetIcon className="text-brand-500 dark:text-brand-400 size-4" />
										Topics & cluster pipeline
									</h2>
									<p className="mt-1 max-w-2xl text-[12px] text-gray-500 dark:text-gray-400">
										Open a topic to see its cluster pieces. Filters apply to the pieces shown below.
										Queue order matches Strategy (priority & authority fit).
									</p>
								</div>
							</div>

							{loading && clusters.length === 0 ? (
								<div className="space-y-4">
									{[1, 2].map((i) => (
										<div
											key={i}
											className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
										/>
									))}
								</div>
							) : (
								<>
									{allPages.length > 0 && (
										<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
											{(Object.keys(STATUS_CONFIG) as CalendarPage['status'][]).map((s) => {
												const cfg = STATUS_CONFIG[s];
												const Icon = cfg.icon;
												const count = counts[s];
												const active = statusFilter === s;
												return (
													<button
														key={s}
														type="button"
														onClick={() => setStatusFilter(active ? 'all' : s)}
														className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm ${active ? `${cfg.bg} ${cfg.border} ring-2 ring-current ring-offset-1` : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'}`}
													>
														<div className={`flex items-center gap-2 ${cfg.color}`}>
															<Icon className="size-4 shrink-0" />
															<span className="text-xs font-semibold tracking-wide uppercase">
																{cfg.label}
															</span>
														</div>
														<div className="font-montserrat mt-2 text-2xl font-bold text-gray-900 dark:text-white">
															{count}
														</div>
													</button>
												);
											})}
										</div>
									)}

									{allPages.length > 0 && (
										<div className="flex flex-wrap items-center gap-2">
											<Filter className="size-4 shrink-0 text-gray-400" />
											{(['all', 'tofu', 'mofu', 'bofu'] as const).map((f) => (
												<button
													key={f}
													type="button"
													onClick={() => setFunnelFilter(f)}
													className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors ${funnelFilter === f ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400'}`}
												>
													{f === 'all' ? 'All Funnels' : f.toUpperCase()}
												</button>
											))}
											<div className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700" />
											<select
												value={clusterFilter}
												onChange={(e) => setClusterFilter(e.target.value)}
												className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[12px] font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
											>
												<option value="all">All Clusters</option>
												{clusters.map((c) => (
													<option key={c.id} value={c.id}>
														{c.title}
													</option>
												))}
											</select>
											{(statusFilter !== 'all' ||
												funnelFilter !== 'all' ||
												clusterFilter !== 'all') && (
												<button
													type="button"
													onClick={() => {
														setStatusFilter('all');
														setFunnelFilter('all');
														setClusterFilter('all');
													}}
													className="text-xs text-gray-400 underline hover:text-gray-600 dark:hover:text-gray-300"
												>
													Clear filters
												</button>
											)}
										</div>
									)}

									<TopicQueueTable
										topics={topics}
										loading={topicsLoading}
										pageSize={15}
										showTargetColumn
										targetNameById={targetNameById}
										expandable
										expandedTopicId={expandedTopicId}
										onExpandedTopicChange={setExpandedTopicId}
										renderExpanded={(topic) => {
											const cid = topic.clusterId ?? null;
											if (!cid) {
												return (
													<div className="rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-900">
														<p className="text-sm text-gray-600 dark:text-gray-400">
															No cluster for this topic yet. Start one from Strategy.
														</p>
														<Link to="/strategy" className="mt-3 inline-block">
															<Button size="sm" variant="outline">
																Go to Strategy
															</Button>
														</Link>
													</div>
												);
											}
											if (pagesLoading) {
												return (
													<div className="h-28 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
												);
											}
											const clusterTitle = clusters.find((c) => c.id === cid)?.title ?? 'Cluster';
											const pagesForTopic = filtered.filter((p) => p.clusterId === cid);
											const anyForCluster = allPages.filter((p) => p.clusterId === cid);
											if (pagesForTopic.length === 0) {
												if (anyForCluster.length === 0) {
													return (
														<div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
															<p className="text-sm text-gray-600 dark:text-gray-400">
																No pages in this cluster yet. Open the cluster to generate your
																content plan.
															</p>
															<Link to={`/clusters/${cid}`} className="mt-3 inline-block">
																<Button size="sm" variant="outline">
																	Open cluster <ChevronRight className="ml-1 size-3.5" />
																</Button>
															</Link>
														</div>
													);
												}
												return (
													<div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-900">
														<p className="text-sm text-gray-500 dark:text-gray-400">
															No pieces match your filters for this cluster.
														</p>
														<button
															type="button"
															onClick={() => {
																setStatusFilter('all');
																setFunnelFilter('all');
																setClusterFilter('all');
															}}
															className="text-brand-500 mt-2 text-xs underline"
														>
															Clear filters
														</button>
													</div>
												);
											}
											return (
												<ClusterPagesList
													pages={pagesForTopic}
													clusterId={cid}
													clusterTitle={clusterTitle}
												/>
											);
										}}
									/>
								</>
							)}
						</TabsContent>

						<TabsContent value="schedule" className="mt-6 focus:outline-none">
							<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
								<ContentScheduleCalendar
									key={selectedSite.id}
									siteId={selectedSite.id}
									pages={schedulePages}
									topics={topics}
									clusters={clusters}
									loading={loading}
								/>
							</div>
						</TabsContent>
					</Tabs>
				)}
			</div>
		</>
	);
}
