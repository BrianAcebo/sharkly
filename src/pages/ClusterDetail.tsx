import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router';
import {
	ReactFlow,
	Background,
	Controls,
	useNodesState,
	useEdgesState,
	MarkerType,
	Handle,
	Position,
	type Node,
	type Edge,
	type NodeProps
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '../../xy-theme.css';
import FloatingEdge from '../components/graphs/FloatingEdges/FloatingEdge';
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { AIInsightBlock } from '../components/shared/AIInsightBlock';
import { FunnelTag } from '../components/shared/FunnelTag';
import { CreditBadge } from '../components/shared/CreditBadge';
import { ReverseSiloAlert } from '../components/shared/ReverseSiloAlert';
import { Button } from '../components/ui/button';
import { useTheme } from '../hooks/useTheme';
import { useCluster } from '../hooks/useCluster';
import { useClusterPages } from '../hooks/useClusterPages';
import { useOrganization } from '../hooks/useOrganization';
import {
	X,
	Sparkles,
	Check,
	Map,
	List,
	Link2,
	Settings,
	Plus,
	Trash2,
	CircleDollarSign
} from 'lucide-react';
import { cn } from '../utils/common';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'sonner';
import { getGenerateAllCreditsCost } from '../lib/credits';
import {
	generateInternalLinkSuggestions,
	getPlacementLabel,
	getEquityLabel,
	type ClusterPage
} from '../lib/internalLinkSuggestions';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription
} from '../components/ui/dialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '../components/ui/alert-dialog';
import { Label } from '../components/ui/label';
import InputField from '../components/form/input/InputField';
import type { PageData } from '../hooks/useClusterPages';

function InternalLinksTable({ pages }: { pages: PageData[] }) {
	const suggestions = useMemo(() => {
		const clusterPages: ClusterPage[] = pages.map((p) => ({
			id: p.id,
			title: p.title,
			keyword: p.keyword,
			type: p.type
		}));
		return generateInternalLinkSuggestions(clusterPages, []);
	}, [pages]);

	if (suggestions.length === 0) {
		return (
			<div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
				<p className="text-sm text-gray-500 dark:text-gray-400">
					No internal link suggestions right now. Add a focus page and articles to see suggested links.
				</p>
			</div>
		);
	}

	return (
		<div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
			<table className="w-full">
				<thead>
					<tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
						<th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
							From page
						</th>
						<th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
							Anchor text
						</th>
						<th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
							To page
						</th>
						<th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
							Placement
						</th>
						<th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
							Equity
						</th>
						<th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
							Status
						</th>
					</tr>
				</thead>
				<tbody>
					{suggestions.map((s, i) => (
						<tr
							key={`${s.from_page_id}-${s.to_page_id}-${i}`}
							className="border-b border-gray-200 last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
						>
							<td className="px-4 py-3">
								<Link to={`/workspace/${s.from_page_id}`} className="text-[13px] font-medium text-brand-600 hover:underline dark:text-brand-400">
									{s.from_title ?? '—'}
								</Link>
							</td>
							<td className="px-4 py-3 font-mono text-[12px] text-gray-700 dark:text-gray-300">
								{s.anchor_text}
							</td>
							<td className="px-4 py-3">
								<Link to={`/workspace/${s.to_page_id}`} className="text-[13px] font-medium text-brand-600 hover:underline dark:text-brand-400">
									{s.to_title ?? '—'}
								</Link>
							</td>
							<td className="px-4 py-3 text-[12px] text-gray-600 dark:text-gray-400">
								{getPlacementLabel(s.placement_hint)}
							</td>
							<td className="px-4 py-3 text-[12px] text-gray-600 dark:text-gray-400">
								{getEquityLabel(s.equity_multiplier)}
							</td>
							<td className="px-4 py-3">
								<span className={cn(
									s.priority === 'critical' ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-gray-500 dark:text-gray-400',
									'text-[12px]'
								)}>
									Suggested
								</span>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

const EDGE_COLORS = {
	light: { implemented: '#0891b2', notImplemented: '#94a3b8' },
	dark: { implemented: '#22d3ee', notImplemented: '#64748b' }
};

const BG_COLORS = { light: '#E8ECF0', dark: '#4b5563' };
const SPREAD_FACTOR = 1.8;

type ClusterNodeData = PageData & { label?: string };

const funnelBorderColors: Record<string, string> = {
	tofu: 'border-l-blue-light-600',
	mofu: 'border-l-warning-600',
	bofu: 'border-l-success-600'
};

function FocusPageNode({ data, selected }: NodeProps) {
	const d = data as ClusterNodeData;
	const statusLabel = d.status === 'published' ? 'Published' : d.status === 'draft' ? 'Draft' : 'Planned';
	return (
		<div
			className={cn(
				'relative rounded-lg border border-l-4 border-gray-200 bg-white p-3 text-left shadow-sm dark:border-gray-700 dark:bg-gray-900',
				funnelBorderColors[d.funnel] || 'border-l-blue-light-600',
				selected ? 'ring-brand-500 ring-2' : ''
			)}
		>
			<Handle type="target" position={Position.Left} id="target" />
			<div className="text-brand-600 dark:text-brand-400 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide uppercase">
				<CircleDollarSign className="size-3" />
				FOCUS PAGE
			</div>
			<div className="font-montserrat mt-1 text-sm font-bold text-gray-900 dark:text-white">{d.title}</div>
			<div className="mt-1 font-mono text-[11px] text-gray-500 dark:text-gray-400">
				{d.keyword} · {d.volume.toLocaleString()}
			</div>
			<div className="mt-3 flex gap-2">
				<span
					className={cn(
						'rounded-full px-2 py-0.5 text-[11px] font-semibold',
						d.status === 'published'
							? 'bg-success-600 dark:bg-success-500 text-white'
							: d.status === 'draft'
								? 'bg-warning-500 dark:bg-warning-600 text-white'
								: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
					)}
				>
					{statusLabel}
				</span>
				{(d.croScore ?? 0) > 0 && (
					<span className="bg-warning-500 dark:bg-warning-600 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white">
						CRO {d.croScore}
					</span>
				)}
			</div>
		</div>
	);
}

function ArticleNode({ data, selected }: NodeProps) {
	const d = data as ClusterNodeData;
	const statusLabel =
		d.status === 'published' ? 'Published' : d.status === 'draft' ? 'Draft' : 'Planned';
	const statusColor =
		d.status === 'published'
			? 'text-success-600 dark:text-success-400'
			: d.status === 'draft'
				? 'text-warning-600 dark:text-warning-400'
				: 'text-gray-500 dark:text-gray-400';
	const funnelLabel = d.funnel === 'tofu' ? 'ToFu' : d.funnel === 'mofu' ? 'MoFu' : 'BoFu';
	return (
		<div
			className={cn(
				'relative rounded-lg border border-l-4 border-gray-200 bg-white p-3 text-left shadow-sm dark:border-gray-700 dark:bg-gray-900',
				funnelBorderColors[d.funnel] || 'border-l-blue-light-600',
				selected ? 'ring-brand-500 ring-2' : ''
			)}
		>
			<Handle type="source" position={Position.Right} id="source" />
			<div className="text-[10px] font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
				{funnelLabel}
			</div>
			<div className="mt-1 text-[13px] font-semibold text-gray-900 dark:text-white">{d.title}</div>
			<div className="mt-1 font-mono text-[11px] text-gray-500 dark:text-gray-400">
				{d.keyword} · {d.volume.toLocaleString()}
			</div>
			<div className={cn('mt-2 flex items-center gap-1.5 text-[11px]', statusColor)}>
				<span
					className={cn(
						'size-1.5 rounded-full',
						d.status === 'published' ? 'bg-success-600' : d.status === 'draft' ? 'bg-warning-500' : 'bg-gray-400'
					)}
				/>
				{statusLabel}
			</div>
		</div>
	);
}

const nodeTypes = {
	focusPage: FocusPageNode as React.ComponentType<NodeProps>,
	article: ArticleNode as React.ComponentType<NodeProps>
};
const edgeTypes = { floating: FloatingEdge };

function buildNodesAndEdges(pages: PageData[], theme: 'light' | 'dark') {
	const focusPage = pages.find((p) => p.type === 'focus_page');
	const articles = pages.filter((p) => p.type === 'article');
	const colors = EDGE_COLORS[theme];
	const centerX = focusPage?.position_x ?? 400;
	const centerY = focusPage?.position_y ?? 300;
	const spread = (x: number, y: number) => ({
		x: centerX + (x - centerX) * SPREAD_FACTOR,
		y: centerY + (y - centerY) * SPREAD_FACTOR
	});
	const nodes: Node<ClusterNodeData>[] = [];
	const edges: Edge[] = [];
	if (focusPage) {
		const pos = spread(focusPage.position_x, focusPage.position_y);
		nodes.push({ id: focusPage.id, type: 'focusPage', position: pos, data: focusPage });
	}
	articles.forEach((p) => {
		const pos = spread(p.position_x, p.position_y);
		nodes.push({ id: p.id, type: 'article', position: pos, data: p });
		if (focusPage) {
			const isImplemented = p.status === 'published';
			const strokeColor = isImplemented ? colors.implemented : colors.notImplemented;
			edges.push({
				id: `${p.id}-${focusPage.id}`,
				source: p.id,
				target: focusPage.id,
				type: 'floating',
				markerEnd: { type: MarkerType.ArrowClosed, color: strokeColor },
				style: {
					fill: 'none',
					stroke: strokeColor,
					strokeWidth: isImplemented ? 2 : 1.5,
					...(isImplemented ? {} : { strokeDasharray: '5,5' })
				}
			});
		}
	});
	return { nodes, edges };
}

type TabId = 'map' | 'content' | 'links' | 'settings';

export default function ClusterDetail() {
	const { id } = useParams();
	const { theme } = useTheme();
	const { cluster, loading: clusterLoading, refetch: refetchCluster } = useCluster(id ?? null);
	const { pages: dbPages, loading: pagesLoading, refetch: refetchPages } = useClusterPages(id ?? null);
	const { organization } = useOrganization();

	const focusCount = dbPages.filter((p) => p.type === 'focus_page').length;
	const articleCount = dbPages.filter((p) => p.type === 'article').length;
	const generateAllCost = getGenerateAllCreditsCost(focusCount, articleCount);
	const creditsRemaining = organization?.included_credits_remaining ?? organization?.included_credits ?? 0;
	const hasEnoughForGenerateAll = creditsRemaining >= generateAllCost;

	const [activeTab, setActiveTab] = useState<TabId>('map');
	const [addArticleOpen, setAddArticleOpen] = useState(false);
	const [addArticleSubmitting, setAddArticleSubmitting] = useState(false);
	const [addArticleForm, setAddArticleForm] = useState({ title: '', keyword: '', funnel: 'mofu' as 'tofu' | 'mofu' | 'bofu' });
	const [pageToDelete, setPageToDelete] = useState<PageData | null>(null);
	const [deleteSubmitting, setDeleteSubmitting] = useState(false);
	const [settingsForm, setSettingsForm] = useState({ title: '', targetKeyword: '' });
	const [settingsSubmitting, setSettingsSubmitting] = useState(false);

	const pagesForFlow = useMemo(() => {
		return dbPages.map((p) => ({
			id: p.id,
			clusterId: p.clusterId,
			title: p.title,
			type: p.type,
			keyword: p.keyword,
			volume: p.volume,
			kd: p.kd,
			funnel: p.funnel,
			status: p.status,
			seoScore: p.seoScore,
			croScore: p.croScore ?? 0,
			wordCount: p.wordCount,
			targetWordCount: p.targetWordCount,
			position_x: p.position_x,
			position_y: p.position_y
		}));
	}, [dbPages]);

	const { nodes: initialNodes, edges: initialEdges } = useMemo(
		() => buildNodesAndEdges(pagesForFlow, theme),
		[pagesForFlow, theme]
	);
	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
	const [selectedNode, setSelectedNode] = useState<Node<ClusterNodeData> | null>(null);

	useEffect(() => {
		setNodes(initialNodes);
		setEdges(initialEdges);
	}, [initialNodes, initialEdges, setNodes, setEdges]);

	const onNodeClick = useCallback((_: React.MouseEvent, node: Node<ClusterNodeData>) => {
		setSelectedNode(node);
	}, []);
	const onPaneClick = useCallback(() => setSelectedNode(null), []);

	const totalPieces = dbPages.length;
	const completedPieces = dbPages.filter((p) => p.status === 'published' || p.status === 'draft').length;
	const selectedPage = selectedNode ? dbPages.find((p) => p.id === selectedNode.id) : null;

	// Sync settings form when cluster loads
	useEffect(() => {
		if (cluster) setSettingsForm({ title: cluster.title, targetKeyword: cluster.targetKeyword });
	}, [cluster]);

	// Switch to Internal Links tab when navigating via #internal-links (e.g. from ReverseSiloAlert)
	useEffect(() => {
		if (window.location.hash === '#internal-links') setActiveTab('links');
	}, [id]);

	const handleAddArticle = useCallback(async () => {
		if (!cluster || !id) return;
		const title = addArticleForm.title.trim() || 'New Article';
		const keyword = addArticleForm.keyword.trim() || title;
		setAddArticleSubmitting(true);
		try {
			const articles = dbPages.filter((p) => p.type === 'article');
			const focusPage = dbPages.find((p) => p.type === 'focus_page');
			const centerX = focusPage?.position_x ?? 400;
			const centerY = focusPage?.position_y ?? 300;
			const radius = 150;
			const angle = (articles.length * 60 * Math.PI) / 180;
			const position_x = Math.round(centerX + radius * Math.cos(angle));
			const position_y = Math.round(centerY + radius * Math.sin(angle));
			const { error } = await supabase.from('pages').insert({
				cluster_id: id,
				site_id: cluster.siteId,
				type: 'article',
				title,
				keyword,
				monthly_searches: 0,
				keyword_difficulty: 30,
				funnel_stage: addArticleForm.funnel,
				status: 'planned',
				target_word_count: 1000,
				sort_order: dbPages.length + 1,
				position_x,
				position_y
			});
			if (error) throw error;
			toast.success('Article added');
			setAddArticleOpen(false);
			setAddArticleForm({ title: '', keyword: '', funnel: 'mofu' });
			await refetchPages();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to add article');
		} finally {
			setAddArticleSubmitting(false);
		}
	}, [cluster, id, dbPages, addArticleForm, refetchPages]);

	const handleDeletePage = useCallback(async () => {
		if (!pageToDelete) return;
		setDeleteSubmitting(true);
		try {
			const { error } = await supabase.from('pages').delete().eq('id', pageToDelete.id);
			if (error) throw error;
			toast.success('Removed from cluster');
			setPageToDelete(null);
			setSelectedNode(null);
			await refetchPages();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to remove');
		} finally {
			setDeleteSubmitting(false);
		}
	}, [pageToDelete, refetchPages]);

	const handleSaveSettings = useCallback(async () => {
		if (!cluster || !id) return;
		setSettingsSubmitting(true);
		try {
			const { error } = await supabase
				.from('clusters')
				.update({
					title: settingsForm.title.trim() || cluster.title,
					target_keyword: settingsForm.targetKeyword.trim() || cluster.targetKeyword,
					updated_at: new Date().toISOString()
				})
				.eq('id', id);
			if (error) throw error;
			toast.success('Cluster updated');
			await refetchCluster();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to save');
		} finally {
			setSettingsSubmitting(false);
		}
	}, [cluster, id, settingsForm, refetchCluster]);

	if (id && clusterLoading && !cluster) {
		return (
			<div className="flex h-[calc(100vh-120px)] items-center justify-center">
				<p className="text-gray-500 dark:text-gray-400">Loading cluster…</p>
			</div>
		);
	}

	if (id && !clusterLoading && !cluster) {
		return (
			<div className="flex h-[calc(100vh-120px)] flex-col items-center justify-center gap-4">
				<p className="text-gray-600 dark:text-gray-400">Cluster not found.</p>
				<Link to="/clusters">
					<Button variant="outline">Back to Clusters</Button>
				</Link>
			</div>
		);
	}

	const displayCluster = cluster!;
	const funnelCoverage = displayCluster.funnelCoverage ?? { tofu: 0, mofu: 0, bofu: 0 };

	const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
		{ id: 'map', label: 'Visual Map', icon: Map },
		{ id: 'content', label: 'Content List', icon: List },
		{ id: 'links', label: 'Internal Links', icon: Link2 },
		{ id: 'settings', label: 'Cluster Settings', icon: Settings }
	];

	return (
		<>
			<PageMeta title={displayCluster.title} description="Cluster detail" noIndex />

			<div className="flex h-[calc(100vh-120px)] flex-col">
				<PageHeader
					title={displayCluster.title}
					breadcrumb={
						<>
							<Link to="/strategy" className="text-brand-600 dark:text-brand-400 hover:underline">
								Strategy
							</Link>
							<span className="mx-1 text-gray-500 dark:text-gray-400">›</span>
							<Link to="/clusters" className="text-brand-600 dark:text-brand-400 hover:underline">
								Clusters
							</Link>
							<span className="mx-1 text-gray-500 dark:text-gray-400">›</span>
							<span className="text-gray-900 dark:text-white">{displayCluster.title}</span>
						</>
					}
					subtitle={`${totalPieces} pieces · ${completedPieces} complete · Est. ${(displayCluster.estimatedTraffic || 0).toLocaleString()} monthly visits if ranked`}
					rightContent={
						<div className="flex gap-2">
							<Button
								variant="outline"
								className="border-gray-200 dark:border-gray-700"
								startIcon={<Plus className="size-4" />}
								onClick={() => setAddArticleOpen(true)}
							>
								Add Article
							</Button>
							<Button
								className="bg-brand-500 hover:bg-brand-600 text-white"
								disabled={dbPages.length === 0 || !hasEnoughForGenerateAll}
							>
								<CreditBadge
									cost={generateAllCost}
									action="Generate All"
									sufficient={hasEnoughForGenerateAll}
								/>
								<Sparkles className="ml-2 size-4" />
								<span className="ml-2">Generate All Content</span>
							</Button>
						</div>
					}
				/>

				{/* Cluster health bar */}
				<div className="flex flex-wrap items-center gap-8 border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-700 dark:bg-gray-900">
					<div>
						<div className="text-[11px] font-semibold text-gray-500 uppercase dark:text-gray-400">
							Funnel Coverage
						</div>
						<div className="flex h-2 w-40 overflow-hidden rounded-full">
							<div
								className="bg-blue-light-500 opacity-70"
								style={{ width: `${Math.max(1, (funnelCoverage.tofu || 0) * 10)}%` }}
							/>
							<div
								className="bg-warning-500"
								style={{ width: `${Math.max(1, (funnelCoverage.mofu || 0) * 10)}%` }}
							/>
							<div
								className="bg-success-600"
								style={{ width: `${Math.max(1, (funnelCoverage.bofu || 0) * 10)}%` }}
							/>
						</div>
						<p className="text-warning-600 dark:text-warning-400 mt-1 text-[11px]">
							{totalPieces === 0 ? 'Add articles to build your cluster' : 'ToFu heavy — add MoFu/BoFu articles'}
						</p>
					</div>
					<div>
						<div className="text-[11px] font-semibold text-gray-500 uppercase dark:text-gray-400">CRO Score</div>
						<div className="font-montserrat text-warning-600 dark:text-warning-400 text-2xl font-extrabold">
							{displayCluster.croScore ?? 0}/100
						</div>
					</div>
					<div>
						<div className="text-[11px] font-semibold text-gray-500 uppercase dark:text-gray-400">Authority Fit</div>
						<div className="text-brand-600 dark:text-brand-400 flex items-center gap-1.5 text-sm font-semibold">
							<Check className="size-4" />
							Achievable Now
						</div>
					</div>
					<div>
						<div className="text-[11px] font-semibold text-gray-500 uppercase dark:text-gray-400">Completion</div>
						<div className="text-sm font-semibold text-gray-900 dark:text-white">
							{completedPieces} of {totalPieces} pieces
						</div>
					</div>
					<div className="ml-auto max-w-md">
						<AIInsightBlock
							variant={
								(funnelCoverage.mofu ?? 0) >= 1 ? 'success' : (funnelCoverage.bofu ?? 0) >= 1 ? 'info' : 'warning'
							}
							compact
							label="CLUSTER INSIGHT"
							message={
								completedPieces === totalPieces && totalPieces > 0
									? `All ${totalPieces} pieces are drafted or published. Add internal links between them and to your focus page to maximize rankings.`
									: (funnelCoverage.mofu ?? 0) < 1 && totalPieces > 1
										? 'Missing mid-funnel content. Add a comparison or "how to choose" article to capture buyers weighing their options.'
										: (funnelCoverage.bofu ?? 0) < 1
											? 'Add a bottom-funnel piece (e.g. pricing or "hire us") to capture high-intent searches.'
											: `${totalPieces - completedPieces} of ${totalPieces} pieces still planned. Open each in the workspace to generate briefs and articles.`
							}
						/>
					</div>
				</div>

				{/* Reverse silo: alert when articles lack link to focus page (V1: no internal_links table yet, so 0) */}
				{id && (
					<ReverseSiloAlert
						missingCount={0}
						clusterId={id}
					/>
				)}

				{/* Content: left nav + main + right panel (for map only) */}
				<div className="flex flex-1 overflow-hidden">
					<div className="w-[200px] shrink-0 border-r border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
						<nav className="space-y-1">
							{tabs.map(({ id: tabId, label, icon: Icon }) => (
								<button
									key={tabId}
									type="button"
									onClick={() => setActiveTab(tabId)}
									className={cn(
										'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm',
										activeTab === tabId
											? 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 font-semibold'
											: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
									)}
								>
									<Icon className="size-4 shrink-0" />
									{label}
								</button>
							))}
						</nav>
					</div>

					{/* Main content by tab */}
					<div className="relative flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
						{activeTab === 'map' && (
							<div className="flex flex-1 min-h-0">
								<div className="relative flex-1">
									{pagesLoading ? (
										<div className="flex h-full items-center justify-center">
											<p className="text-gray-500 dark:text-gray-400">Loading map…</p>
										</div>
									) : (
										<ReactFlow
											nodes={nodes}
											edges={edges}
											onNodesChange={onNodesChange}
											onEdgesChange={onEdgesChange}
											onNodeClick={onNodeClick}
											onPaneClick={onPaneClick}
											nodeTypes={nodeTypes}
											edgeTypes={edgeTypes}
											colorMode={theme}
											fitView
											fitViewOptions={{ padding: 0.2, duration: 0 }}
										>
											<Background gap={20} color={BG_COLORS[theme]} />
											<Controls className="!rounded-lg !border !border-gray-200 !bg-white !shadow-sm dark:!border-gray-700 dark:!bg-gray-900" />
										</ReactFlow>
									)}
								</div>
								{/* Right detail panel (map only) */}
								<div className="w-[300px] shrink-0 border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
									{selectedNode && selectedPage ? (
										<>
											<div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-700">
												<h3 className="font-montserrat text-base font-bold text-gray-900 dark:text-white">
													{selectedPage.title}
												</h3>
												<button
													onClick={() => setSelectedNode(null)}
													className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
												>
													<X className="size-4" />
												</button>
											</div>
											<div className="max-h-[calc(100vh-320px)] overflow-y-auto p-5">
												<div className="space-y-2.5 border-b border-gray-200 py-2.5 text-[13px] dark:border-gray-700">
													<div className="flex justify-between">
														<span className="text-gray-500 dark:text-gray-400">Content Type</span>
														<span className="text-gray-900 dark:text-white">
															{selectedPage.type === 'focus_page' ? 'Focus Page' : 'Blog Article'}
														</span>
													</div>
													<div className="flex justify-between">
														<span className="text-gray-500 dark:text-gray-400">Funnel Stage</span>
														<FunnelTag stage={selectedPage.funnel} />
													</div>
													<div className="flex justify-between">
														<span className="text-gray-500 dark:text-gray-400">Target Keyword</span>
														<span className="text-brand-600 dark:text-brand-400 font-mono text-xs">
															{selectedPage.keyword}
														</span>
													</div>
													<div className="flex justify-between">
														<span className="text-gray-500 dark:text-gray-400">Monthly Volume</span>
														<span className="text-gray-900 dark:text-white">
															{selectedPage.volume.toLocaleString()}
														</span>
													</div>
													<div className="flex justify-between">
														<span className="text-gray-500 dark:text-gray-400">Status</span>
														<span
															className={
																selectedPage.status === 'published'
																	? 'text-success-600 dark:text-success-400'
																	: selectedPage.status === 'draft'
																		? 'text-warning-600 dark:text-warning-400'
																		: 'text-gray-500 dark:text-gray-400'
															}
														>
															{selectedPage.status}
														</span>
													</div>
												</div>
												<div className="mt-4">
													<AIInsightBlock
														variant="info"
														label={selectedPage.type === 'focus_page' ? 'FOCUS PAGE' : 'WHY THIS ARTICLE'}
														compact
														message={
															selectedPage.type === 'focus_page'
																? `Your cluster hub for "${selectedPage.keyword}". Nail the brief and word count here; supporting articles link back to strengthen rankings.`
																: `Targets "${selectedPage.keyword}" (${selectedPage.volume.toLocaleString()}/mo). Supports your focus page and captures ${selectedPage.funnel === 'tofu' ? 'early-stage' : selectedPage.funnel === 'mofu' ? 'mid-funnel' : 'high-intent'} traffic.`
														}
													/>
												</div>
												<div className="mt-5 flex flex-col gap-2">
													<Link to={`/workspace/${selectedPage.id}`}>
														<Button className="bg-brand-500 hover:bg-brand-600 w-full text-white">
															Open in Workspace →
														</Button>
													</Link>
													{selectedPage.type === 'article' && (
														<Button
															variant="ghost"
															className="text-error-600 dark:text-error-400 w-full"
															onClick={() => setPageToDelete(selectedPage)}
														>
															Remove from Cluster
														</Button>
													)}
												</div>
											</div>
										</>
									) : (
										<div className="flex flex-col items-center justify-center p-8 text-center">
											<p className="text-sm text-gray-500 dark:text-gray-400">
												Click any node to see details and open the editor.
											</p>
											<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
												{totalPieces} pieces · Est. {(displayCluster.estimatedTraffic || 0).toLocaleString()} visits
											</p>
										</div>
									)}
								</div>
							</div>
						)}

						{activeTab === 'content' && (
							<div className="flex-1 overflow-auto p-6">
								{pagesLoading ? (
									<p className="text-gray-500 dark:text-gray-400">Loading…</p>
								) : dbPages.length === 0 ? (
									<p className="text-gray-500 dark:text-gray-400">No content yet. Add an article above.</p>
								) : (
									<div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
										<table className="w-full">
											<thead>
												<tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
													<th className="px-4 py-3 text-left text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400">
														Type
													</th>
													<th className="px-4 py-3 text-left text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400">
														Title
													</th>
													<th className="px-4 py-3 text-left text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400">
														Funnel
													</th>
													<th className="px-4 py-3 text-left text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400">
														Status
													</th>
													<th className="w-[180px] px-4 py-3 text-right text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400">
														Actions
													</th>
												</tr>
											</thead>
											<tbody>
												{dbPages.map((p) => (
													<tr
														key={p.id}
														className="border-b border-gray-200 last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50"
													>
														<td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
															{p.type === 'focus_page' ? 'Focus Page' : 'Article'}
														</td>
														<td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
															{p.title}
														</td>
														<td className="px-4 py-3">
															<FunnelTag stage={p.funnel} />
														</td>
														<td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
															{p.status}
														</td>
														<td className="px-4 py-3 text-right">
															<Link to={`/workspace/${p.id}`}>
																<Button size="sm" variant="outline" className="mr-2">
																	Open
																</Button>
															</Link>
															{p.type === 'article' && (
																<Button
																	size="sm"
																	variant="ghost"
																	className="text-error-600 dark:text-error-400"
																	onClick={() => setPageToDelete(p)}
																>
																	<Trash2 className="size-4" />
																</Button>
															)}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								)}
							</div>
						)}

						{activeTab === 'links' && (
							<div id="internal-links" className="flex-1 overflow-auto p-6">
								<AIInsightBlock
									variant="info"
									label="INTERNAL LINKS"
									message="Links in body text pass more authority than footer or nav links. Add suggested links in the first 400 words where possible."
								/>
								<InternalLinksTable pages={dbPages} />
							</div>
						)}

						{activeTab === 'settings' && cluster && (
							<div className="flex-1 overflow-auto p-6">
								<div className="max-w-md rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
									<h3 className="font-montserrat text-lg font-bold text-gray-900 dark:text-white">
										Cluster Settings
									</h3>
									<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
										Update the cluster title and target keyword.
									</p>
									<div className="mt-6 grid gap-4">
										<InputField
											label="Title"
											value={settingsForm.title}
											onChange={(e) => setSettingsForm((f) => ({ ...f, title: e.target.value }))}
										/>
										<InputField
											label="Target keyword"
											value={settingsForm.targetKeyword}
											onChange={(e) =>
												setSettingsForm((f) => ({ ...f, targetKeyword: e.target.value }))
											}
										/>
										<Button
											className="bg-brand-500 hover:bg-brand-600 text-white"
											onClick={handleSaveSettings}
											disabled={settingsSubmitting}
										>
											{settingsSubmitting ? 'Saving…' : 'Save changes'}
										</Button>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Add Article dialog */}
			<Dialog open={addArticleOpen} onOpenChange={setAddArticleOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Add article</DialogTitle>
						<DialogDescription>
							Add a supporting article to this cluster. You can edit the brief and content in the workspace after.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<InputField
							label="Title"
							value={addArticleForm.title}
							onChange={(e) => setAddArticleForm((f) => ({ ...f, title: e.target.value }))}
							placeholder="e.g. How to Prevent Cyber Crime"
						/>
						<InputField
							label="Target keyword"
							value={addArticleForm.keyword}
							onChange={(e) => setAddArticleForm((f) => ({ ...f, keyword: e.target.value }))}
							placeholder="e.g. how to prevent cyber crime"
						/>
						<div className="grid gap-2">
							<Label>Funnel stage</Label>
							<div className="flex gap-2">
								{(['tofu', 'mofu', 'bofu'] as const).map((f) => (
									<Button
										key={f}
										type="button"
										size="sm"
										variant={addArticleForm.funnel === f ? 'default' : 'outline'}
										className={addArticleForm.funnel === f ? 'bg-brand-500 hover:bg-brand-600 text-white' : ''}
										onClick={() => setAddArticleForm((prev) => ({ ...prev, funnel: f }))}
									>
										{f === 'tofu' ? 'ToFu' : f === 'mofu' ? 'MoFu' : 'BoFu'}
									</Button>
								))}
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setAddArticleOpen(false)} disabled={addArticleSubmitting}>
							Cancel
						</Button>
						<Button
							className="bg-brand-500 hover:bg-brand-600 text-white"
							onClick={handleAddArticle}
							disabled={addArticleSubmitting}
						>
							{addArticleSubmitting ? 'Adding…' : 'Add article'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete page confirmation */}
			<AlertDialog open={!!pageToDelete} onOpenChange={(open) => !open && setPageToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove from cluster?</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove &quot;{pageToDelete?.title}&quot; from the cluster. The page will be deleted. This cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteSubmitting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								handleDeletePage();
							}}
							disabled={deleteSubmitting}
							className="bg-error-600 hover:bg-error-700 text-white"
						>
							{deleteSubmitting ? 'Removing…' : 'Remove'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
