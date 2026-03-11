/**
 * Content Calendar — V1
 * Shows all cluster pages (planned → published) across the selected site,
 * grouped by cluster with status tracking and funnel filtering.
 */
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { AIInsightBlock } from '../components/shared/AIInsightBlock';
import { FunnelTag } from '../components/shared/FunnelTag';
import { Button } from '../components/ui/button';
import { useSiteContext } from '../contexts/SiteContext';
import { useClusters } from '../hooks/useClusters';
import { supabase } from '../utils/supabaseClient';
import {
	CalendarDays,
	FileText,
	CheckCircle2,
	Clock,
	PenLine,
	Layers,
	ChevronRight,
	Filter
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
		<span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.border} ${cfg.color}`}>
			<Icon className="size-3 shrink-0" />
			{cfg.label}
		</span>
	);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Calendar() {
	const { selectedSite } = useSiteContext();
	const { clusters, loading: clustersLoading } = useClusters(selectedSite?.id ?? null);

	const [allPages, setAllPages] = useState<CalendarPage[]>([]);
	const [pagesLoading, setPagesLoading] = useState(false);

	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
	const [funnelFilter, setFunnelFilter] = useState<FunnelFilter>('all');
	const [clusterFilter, setClusterFilter] = useState<string>('all');

	// Fetch all pages for all clusters in this site
	useEffect(() => {
		if (!selectedSite?.id || clusters.length === 0) {
			setAllPages([]);
			return;
		}
		setPagesLoading(true);
		const clusterIds = clusters.map((c) => c.id);
		supabase
			.from('pages')
			.select('id, cluster_id, title, keyword, type, funnel_stage, status, seo_score, word_count')
			.in('cluster_id', clusterIds)
			.order('sort_order', { ascending: true })
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

	// Group filtered pages by cluster
	const grouped = useMemo(() => {
		const map = new Map<string, { clusterTitle: string; clusterId: string; pages: CalendarPage[] }>();
		for (const p of filtered) {
			if (!map.has(p.clusterId)) {
				map.set(p.clusterId, { clusterTitle: p.clusterTitle, clusterId: p.clusterId, pages: [] });
			}
			map.get(p.clusterId)!.pages.push(p);
		}
		return Array.from(map.values());
	}, [filtered]);

	// Summary counts
	const counts = useMemo(() => {
		const c = { planned: 0, brief_generated: 0, draft: 0, published: 0 };
		for (const p of allPages) c[p.status]++;
		return c;
	}, [allPages]);

	const loading = clustersLoading || pagesLoading;

	const aiMessage = useMemo(() => {
		const total = allPages.length;
		if (total === 0) return 'Generate your first cluster to start building your content calendar. Your planned, drafted, and published pieces will all appear here.';
		const published = counts.published;
		const inProgress = counts.draft + counts.brief_generated;
		const planned = counts.planned;
		if (published === total) return `All ${total} pieces are published. Consider starting a new cluster to continue building topical authority.`;
		if (published === 0 && inProgress === 0) return `You have ${planned} planned pieces across ${clusters.length} cluster${clusters.length !== 1 ? 's' : ''}. Open a cluster to start generating briefs and articles.`;
		return `${published} published · ${inProgress} in progress · ${planned} planned. ${inProgress > 0 ? 'Keep going — finishing in-progress pieces before starting new clusters maximizes topical authority.' : 'Open a cluster to work on your next piece.'}`;
	}, [allPages, counts, clusters]);

	return (
		<>
			<PageMeta title="Content Calendar" description="Plan and track your content" />

			<PageHeader
				title="Content Calendar"
				subtitle={
					selectedSite
						? `${selectedSite.name} · ${allPages.length} piece${allPages.length !== 1 ? 's' : ''} across ${clusters.length} cluster${clusters.length !== 1 ? 's' : ''}`
						: 'Select a site to view your content calendar'
				}
			/>

			<div className="p-6 space-y-6">
				{/* AI insight */}
				<AIInsightBlock variant="strategy" label="CONTENT CALENDAR" message={aiMessage} />

				{/* Status summary strip */}
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
									onClick={() => setStatusFilter(active ? 'all' : s)}
									className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm ${active ? `${cfg.bg} ${cfg.border} ring-2 ring-offset-1 ring-current` : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'}`}
								>
									<div className={`flex items-center gap-2 ${cfg.color}`}>
										<Icon className="size-4 shrink-0" />
										<span className="text-xs font-semibold uppercase tracking-wide">{cfg.label}</span>
									</div>
									<div className="font-montserrat mt-2 text-2xl font-bold text-gray-900 dark:text-white">
										{count}
									</div>
								</button>
							);
						})}
					</div>
				)}

				{/* Filters */}
				{allPages.length > 0 && (
					<div className="flex flex-wrap items-center gap-2">
						<Filter className="size-4 shrink-0 text-gray-400" />

						{/* Funnel filter */}
						{(['all', 'tofu', 'mofu', 'bofu'] as const).map((f) => (
							<button
								key={f}
								onClick={() => setFunnelFilter(f)}
								className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors ${funnelFilter === f ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400'}`}
							>
								{f === 'all' ? 'All Funnels' : f.toUpperCase()}
							</button>
						))}

						<div className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700" />

						{/* Cluster filter */}
						<select
							value={clusterFilter}
							onChange={(e) => setClusterFilter(e.target.value)}
							className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[12px] font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
						>
							<option value="all">All Clusters</option>
							{clusters.map((c) => (
								<option key={c.id} value={c.id}>{c.title}</option>
							))}
						</select>

						{(statusFilter !== 'all' || funnelFilter !== 'all' || clusterFilter !== 'all') && (
							<button
								onClick={() => { setStatusFilter('all'); setFunnelFilter('all'); setClusterFilter('all'); }}
								className="text-xs text-gray-400 underline hover:text-gray-600 dark:hover:text-gray-300"
							>
								Clear filters
							</button>
						)}
					</div>
				)}

				{/* Content */}
				{!selectedSite ? (
					<div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
						<CalendarDays className="mx-auto size-12 text-gray-300 dark:text-gray-600" />
						<p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Select a site to view your content calendar</p>
					</div>
				) : loading ? (
					<div className="space-y-4">
						{[1, 2].map((i) => (
							<div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
						))}
					</div>
				) : allPages.length === 0 ? (
					<div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
						<CalendarDays className="mx-auto size-12 text-gray-300 dark:text-gray-600" />
						<h2 className="font-montserrat mt-4 text-base font-bold text-gray-900 dark:text-white">No content yet</h2>
						<p className="mt-2 max-w-sm mx-auto text-sm text-gray-500 dark:text-gray-400">
							Generate your first cluster from the Strategy page to start building your content plan.
						</p>
						<Link to="/strategy" className="mt-4 inline-block">
							<Button className="bg-brand-500 hover:bg-brand-600 text-white">
								Go to Strategy
							</Button>
						</Link>
					</div>
				) : grouped.length === 0 ? (
					<div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900">
						<p className="text-sm text-gray-500 dark:text-gray-400">No pieces match your current filters.</p>
						<button
							onClick={() => { setStatusFilter('all'); setFunnelFilter('all'); setClusterFilter('all'); }}
							className="mt-2 text-xs text-brand-500 underline"
						>
							Clear filters
						</button>
					</div>
				) : (
					<div className="space-y-6">
						{grouped.map(({ clusterTitle, clusterId, pages }) => (
							<div key={clusterId} className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
								{/* Cluster header */}
								<div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3 dark:border-gray-800 dark:bg-gray-800/50">
									<div className="flex items-center gap-2">
										<Layers className="size-4 shrink-0 text-gray-400" />
										<span className="font-semibold text-sm text-gray-900 dark:text-white">{clusterTitle}</span>
										<span className="text-xs text-gray-400 dark:text-gray-500">
											· {pages.length} piece{pages.length !== 1 ? 's' : ''}
											{' '}
											· {pages.filter((p) => p.status === 'published').length} published
										</span>
									</div>
									<Link to={`/clusters/${clusterId}`}>
										<Button variant="ghost" size="sm" className="h-7 text-xs">
											View Cluster <ChevronRight className="ml-1 size-3.5" />
										</Button>
									</Link>
								</div>

								{/* Pages table */}
								<div className="divide-y divide-gray-50 dark:divide-gray-800">
									{pages.map((page) => (
										<div key={page.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
											{/* Type indicator */}
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

											{/* Title / keyword */}
											<div className="min-w-0 flex-1">
												<div className="truncate text-sm font-medium text-gray-900 dark:text-white">
													{page.title}
												</div>
												<div className="truncate font-mono text-[11px] text-gray-400 dark:text-gray-500">
													{page.keyword}
												</div>
											</div>

											{/* Metadata */}
											<div className="flex shrink-0 flex-wrap items-center gap-2">
												<FunnelTag stage={page.funnel} />
												<StatusBadge status={page.status} />
												{page.status !== 'planned' && page.wordCount > 0 && (
													<span className="text-[11px] text-gray-400">
														{page.wordCount.toLocaleString()} words
													</span>
												)}
												{page.seoScore > 0 && (
													<span className={`text-[11px] font-semibold ${page.seoScore >= 76 ? 'text-green-500' : page.seoScore >= 55 ? 'text-amber-500' : 'text-red-500'}`}>
														{page.seoScore}/115
													</span>
												)}
											</div>

											{/* Action */}
											<Link
												to={`/clusters/${clusterId}/workspace/${page.id}`}
												className="shrink-0"
											>
												<Button variant="ghost" size="sm" className="h-7 text-xs">
													{page.status === 'planned' ? 'Generate' : 'Open'}
													<ChevronRight className="ml-1 size-3.5" />
												</Button>
											</Link>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</>
	);
}
