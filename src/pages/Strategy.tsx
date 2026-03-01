import { useState, useCallback } from 'react';
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { AIInsightBlock } from '../components/shared/AIInsightBlock';
import { FunnelTag } from '../components/shared/FunnelTag';
import { CreditBadge } from '../components/shared/CreditBadge';
import { Button } from '../components/ui/button';
import { Link, useNavigate } from 'react-router';
import { GripVertical } from 'lucide-react';
import { useSiteContext } from '../contexts/SiteContext';
import { useTopics } from '../hooks/useTopics';
import { useOrganization } from '../hooks/useOrganization';
import { supabase } from '../utils/supabaseClient';
import { buildApiUrl } from '../utils/urls';
import { toast } from 'sonner';
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	DragEndEvent
} from '@dnd-kit/core';
import {
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
	useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Topic } from '../hooks/useTopics';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import InputField from '../components/form/input/InputField';
import { CREDIT_COSTS } from '../lib/credits';

const FILTERS = [
	'All',
	'Achievable Now',
	'Build Toward',
	'BoFu',
	'MoFu',
	'ToFu',
	'Quick Wins'
] as const;

const FUNNEL_OPTIONS: { value: Topic['funnel']; label: string }[] = [
	{ value: 'tofu', label: 'ToFu' },
	{ value: 'mofu', label: 'MoFu' },
	{ value: 'bofu', label: 'BoFu' }
];

function SortableTopicRow({
	topic,
	startingTopicId,
	hasCreditsForCluster,
	onStartCluster
}: {
	topic: Topic;
	startingTopicId: string | null;
	hasCreditsForCluster: boolean;
	onStartCluster: (id: string) => void;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: topic.id
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition
	};

	const kdColor =
		topic.kd < 25
			? 'text-success-600 font-bold'
			: topic.kd <= 45
				? 'text-warning-600 font-bold'
				: 'text-error-600 font-bold';
	const authLabel =
		topic.authorityFit === 'achievable'
			? '✓ Achievable Now'
			: topic.authorityFit === 'buildToward'
				? '⏳ Build Toward'
				: '🔒 Locked';
	const authColor =
		topic.authorityFit === 'achievable'
			? 'text-brand-600 dark:text-brand-400 font-semibold'
			: topic.authorityFit === 'buildToward'
				? 'text-warning-600 font-semibold'
				: 'text-gray-500 dark:text-gray-400';
	const isActive = topic.status === 'active';

	return (
		<tr
			ref={setNodeRef}
			style={style}
			className={`group border-b border-gray-200 transition-colors last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 ${
				isActive ? 'border-l-brand-500 dark:border-l-brand-500 border-l-4' : ''
			} ${isDragging ? 'bg-gray-100 opacity-50 dark:bg-gray-800' : ''}`}
		>
			<td className="px-4 py-4" {...attributes} {...listeners}>
				<GripVertical className="invisible cursor-grab text-gray-500 opacity-0 transition-all duration-200 group-hover:visible group-hover:text-gray-900 active:cursor-grabbing dark:text-gray-400 dark:group-hover:opacity-100" />
			</td>
			<td className="px-4 py-4 text-[13px] text-gray-500 dark:text-gray-400">{topic.priority}</td>
			<td className="px-4 py-4">
				<div className="font-semibold text-gray-900 dark:text-white">{topic.title}</div>
				<div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{topic.reasoning}</div>
			</td>
			<td className="px-4 py-4">
				<FunnelTag stage={topic.funnel} />
			</td>
			<td className="px-4 py-4 text-sm">{topic.volume.toLocaleString()}</td>
			<td className={`px-4 py-4 text-sm ${kdColor}`}>{topic.kd}</td>
			<td className="px-4 py-4 text-sm">${topic.cpc.toFixed(2)}</td>
			<td className={`px-4 py-4 text-sm ${authColor}`}>{authLabel}</td>
			<td className="px-4 py-4">
				{topic.clusterId ? (
					<Link to={`/clusters/${topic.clusterId}`}>
						<Button size="sm" className="bg-brand-500 hover:bg-brand-600 text-white">
							View Cluster
						</Button>
					</Link>
				) : topic.authorityFit === 'achievable' ? (
					<Button
						size="sm"
						variant="outline"
						className="border-gray-200 dark:border-gray-700"
						onClick={() => onStartCluster(topic.id)}
						disabled={!!startingTopicId || !hasCreditsForCluster}
					>
						<CreditBadge
							cost={CREDIT_COSTS.CLUSTER_GENERATION}
							action="Cluster"
							sufficient={hasCreditsForCluster}
						/>
						<span className="ml-1.5">
							{startingTopicId === topic.id ? 'Creating...' : 'Start Cluster'}
						</span>
					</Button>
				) : (
					<Button size="sm" variant="ghost" disabled>
						Locked
					</Button>
				)}
			</td>
		</tr>
	);
}

export default function Strategy() {
	const [activeFilter, setActiveFilter] = useState<string>('all');
	const [strategyView, setStrategyView] = useState<'topics' | 'keywords'>('topics');
	const [startingTopicId, setStartingTopicId] = useState<string | null>(null);
	const [addTopicOpen, setAddTopicOpen] = useState(false);
	const [addTopicSubmitting, setAddTopicSubmitting] = useState(false);
	const [addTopicForm, setAddTopicForm] = useState({
		title: '',
		keyword: '',
		funnel: 'mofu' as Topic['funnel'],
		reasoning: ''
	});
	const [reordering, setReordering] = useState(false);

	const navigate = useNavigate();
	const { selectedSite } = useSiteContext();
	const { topics, loading, refetch: refetchTopics } = useTopics(selectedSite?.id ?? null);
	const { organization, refetch: refetchOrg } = useOrganization();
	const creditsRemaining =
		organization?.included_credits_remaining ?? organization?.included_credits ?? 0;
	const hasCreditsForCluster = creditsRemaining >= CREDIT_COSTS.CLUSTER_GENERATION;

	const projectDa = selectedSite ? 25 : 25;
	const topicCount = topics.length;

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
	);

	const handleStartCluster = async (topicId: string) => {
		setStartingTopicId(topicId);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				toast.error('Please sign in to continue');
				return;
			}
			const res = await fetch(buildApiUrl('/api/clusters'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({ topicId })
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				if (res.status === 402) {
					toast.error(
						`Insufficient credits. Need ${data.required ?? CREDIT_COSTS.CLUSTER_GENERATION}, have ${data.available ?? 0}.`
					);
					return;
				}
				throw new Error(data?.error || 'Failed to create cluster');
			}
			await refetchTopics();
			refetchOrg();
			navigate(`/clusters/${data.clusterId}`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to create cluster');
		} finally {
			setStartingTopicId(null);
		}
	};

	const handleAddTopic = useCallback(async () => {
		if (!selectedSite?.id) {
			toast.error('Select a site first');
			return;
		}
		const title = addTopicForm.title.trim();
		const keyword = addTopicForm.keyword.trim() || title;
		if (!title) {
			toast.error('Enter a topic title');
			return;
		}
		setAddTopicSubmitting(true);
		try {
			const nextOrder = topicCount + 1;
			const { error } = await supabase.from('topics').insert({
				site_id: selectedSite.id,
				title,
				keyword,
				monthly_searches: 0,
				keyword_difficulty: 0,
				cpc: 0,
				funnel_stage: addTopicForm.funnel,
				authority_fit: 'achievable',
				status: 'queued',
				sort_order: nextOrder,
				ai_reasoning: addTopicForm.reasoning.trim() || null
			});
			if (error) throw error;
			toast.success('Topic added');
			setAddTopicOpen(false);
			setAddTopicForm({ title: '', keyword: '', funnel: 'mofu', reasoning: '' });
			await refetchTopics();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to add topic');
		} finally {
			setAddTopicSubmitting(false);
		}
	}, [selectedSite?.id, addTopicForm, topicCount, refetchTopics]);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const { active, over } = event;
			if (!over || active.id === over.id) return;
			const oldIndex = topics.findIndex((t) => t.id === active.id);
			const newIndex = topics.findIndex((t) => t.id === over.id);
			if (oldIndex === -1 || newIndex === -1) return;
			const reordered = [...topics];
			const [removed] = reordered.splice(oldIndex, 1);
			reordered.splice(newIndex, 0, removed);
			setReordering(true);
			try {
				await Promise.all(
					reordered.map((t, i) =>
						supabase
							.from('topics')
							.update({ sort_order: i + 1, updated_at: new Date().toISOString() })
							.eq('id', t.id)
					)
				);
				await refetchTopics();
				toast.success('Order saved');
			} catch (err) {
				toast.error(err instanceof Error ? err.message : 'Failed to save order');
			} finally {
				setReordering(false);
			}
		},
		[topics, refetchTopics]
	);

	const filteredTopics =
		activeFilter === 'all'
			? topics
			: topics.filter((t) => {
					if (activeFilter === 'achievablenow') return t.authorityFit === 'achievable';
					if (activeFilter === 'buildtoward') return t.authorityFit === 'buildToward';
					if (activeFilter === 'bofu') return t.funnel === 'bofu';
					if (activeFilter === 'mofu') return t.funnel === 'mofu';
					if (activeFilter === 'tofu') return t.funnel === 'tofu';
					if (activeFilter === 'quickwins') return t.authorityFit === 'achievable' && t.kd < 30 && (t.funnel === 'mofu' || t.funnel === 'bofu');
					return true;
				});

	return (
		<>
			<PageMeta title="Topic Strategy" description="Your SEO topic strategy" noIndex />

			<div className="space-y-6">
				<PageHeader
					title="Topic Strategy"
					subtitle={
						topicCount === 0
							? 'Add topics and drag to reorder. Run onboarding or regenerate to get AI-recommended topics.'
							: `${topicCount} topic${topicCount !== 1 ? 's' : ''} — drag to re-prioritize.`
					}
					rightContent={
						<div className="flex gap-2">
							<Button
								variant="outline"
								className="border-gray-200 dark:border-gray-700"
								onClick={() => setAddTopicOpen(true)}
								disabled={!selectedSite?.id}
							>
								+ Add Topic
							</Button>
							<Button
								className="bg-brand-500 hover:bg-brand-600 text-white"
								disabled={!hasCreditsForCluster}
							>
								<CreditBadge
									cost={CREDIT_COSTS.CLUSTER_GENERATION}
									action="Cluster Generation"
									sufficient={hasCreditsForCluster}
								/>
								<span className="ml-2">✨ Regenerate Strategy</span>
							</Button>
						</div>
					}
				/>

				{selectedSite && (
					<AIInsightBlock
						variant="analyst"
						label="AI STRATEGIST"
						message={`Based on how strong your site currently is (${projectDa}), we've focused on keywords where you can realistically rank right now. Topics marked 'Build Toward' will unlock as your authority grows over the next 3–4 completed clusters.`}
					/>
				)}

				{/* View toggle: Topics | Keywords (V1 — SITEMAP / Roadmap) */}
				{topics.length > 0 && (
					<div className="mt-5 flex flex-wrap items-center gap-4">
						<div className="flex rounded-lg border border-gray-200 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-800">
							<button
								type="button"
								onClick={() => setStrategyView('topics')}
								className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${
									strategyView === 'topics'
										? 'bg-brand-500 text-white dark:bg-brand-600'
										: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
								}`}
							>
								Topics view
							</button>
							<button
								type="button"
								onClick={() => setStrategyView('keywords')}
								className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${
									strategyView === 'keywords'
										? 'bg-brand-500 text-white dark:bg-brand-600'
										: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
								}`}
							>
								Keywords view
							</button>
						</div>
						<div className="flex flex-wrap gap-2">
						{FILTERS.map((f) => {
							const isActive =
								activeFilter === f.toLowerCase().replace(' ', '') ||
								(activeFilter === 'all' && f === 'All');
							return (
								<button
									key={f}
									onClick={() =>
										setActiveFilter(f === 'All' ? 'all' : f.toLowerCase().replace(' ', ''))
									}
									className={`rounded-full px-3 py-1.5 text-[13px] ${
										isActive
											? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300 border font-semibold'
											: 'border border-gray-200 bg-white text-gray-600 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-white'
									}`}
								>
									{f}
								</button>
							);
						})}
						</div>
					</div>
				)}

				{/* Topic table or Keywords table */}
				<div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
					{loading ? (
						<div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading topics…</div>
					) : topics.length === 0 ? (
						<div className="p-8 text-center">
							<p className="text-gray-600 dark:text-gray-400">No topics yet.</p>
							<p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
								Add a topic manually or complete onboarding to get an AI-generated strategy.
							</p>
							<Button
								className="bg-brand-500 hover:bg-brand-600 mt-4 text-white"
								onClick={() => setAddTopicOpen(true)}
								disabled={!selectedSite?.id}
							>
								+ Add Topic
							</Button>
						</div>
					) : strategyView === 'keywords' ? (
						<table className="w-full">
							<thead>
								<tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
									<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
										Keyword
									</th>
									<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
										Topic
									</th>
									<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
										Monthly Searches
									</th>
									<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400" title="How hard it is to rank for this">
										Difficulty
									</th>
									<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
										Funnel
									</th>
									<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
										Authority Fit
									</th>
									<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
										Action
									</th>
								</tr>
							</thead>
							<tbody>
								{filteredTopics.map((topic) => (
									<tr key={topic.id} className="border-b border-gray-200 last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
										<td className="px-4 py-3 font-mono text-[13px] text-gray-900 dark:text-white">{topic.keyword}</td>
										<td className="px-4 py-3 text-[13px] text-gray-700 dark:text-gray-300">{topic.title}</td>
										<td className="px-4 py-3 text-sm">{topic.volume.toLocaleString()}</td>
										<td className="px-4 py-3 text-sm">{topic.kd}</td>
										<td className="px-4 py-3">
											<FunnelTag stage={topic.funnel} />
										</td>
										<td className="px-4 py-3 text-[13px]">
											{topic.authorityFit === 'achievable' ? '✓ Achievable Now' : topic.authorityFit === 'buildToward' ? '⏳ Build Toward' : '🔒 Locked'}
										</td>
										<td className="px-4 py-3">
											{topic.status === 'active' ? (
												<Link to="/clusters">
													<Button variant="outline" size="sm">View Cluster</Button>
												</Link>
											) : topic.authorityFit === 'achievable' ? (
												<Button
													size="sm"
													className="bg-brand-500 hover:bg-brand-600 text-white"
													disabled={!hasCreditsForCluster}
													onClick={() => handleStartCluster(topic.id)}
												>
													Start Cluster
												</Button>
											) : (
												<span className="text-[12px] text-gray-400">—</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					) : (
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragEnd={handleDragEnd}
						>
							<SortableContext
								items={filteredTopics.map((t) => t.id)}
								strategy={verticalListSortingStrategy}
							>
								<table className="w-full">
									<thead>
										<tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
											<th className="w-8 px-4 py-3" />
											<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
												#
											</th>
											<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
												Topic
											</th>
											<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
												Funnel
											</th>
											<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
												Monthly Searches
											</th>
											<th
												className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400"
												title="How hard it is to rank for this"
											>
												Rank
											</th>
											<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
												CPC
											</th>
											<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
												Authority Fit
											</th>
											<th className="px-4 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
												Action
											</th>
										</tr>
									</thead>
									<tbody>
										{filteredTopics.map((topic) => (
											<SortableTopicRow
												key={topic.id}
												topic={topic}
												startingTopicId={startingTopicId}
												hasCreditsForCluster={hasCreditsForCluster}
												onStartCluster={handleStartCluster}
											/>
										))}
									</tbody>
								</table>
							</SortableContext>
						</DndContext>
					)}
				</div>

				{topics.length > 0 && (
					<div className="mt-4 p-4 text-center text-[13px] text-gray-500 dark:text-gray-400">
						{reordering
							? 'Saving order…'
							: `Showing ${filteredTopics.length} topic${filteredTopics.length !== 1 ? 's' : ''}`}
					</div>
				)}
			</div>

			{/* Add Topic dialog */}
			<Dialog open={addTopicOpen} onOpenChange={setAddTopicOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Add Topic</DialogTitle>
						<DialogDescription>
							Add a topic to your strategy. You can reorder it by dragging on the Strategy page.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-6 py-4">
						<div className="grid gap-3">
							<Label htmlFor="topic-title">Title</Label>
							<InputField
								id="topic-title"
								placeholder="e.g. Cyber Crime Investigation"
								value={addTopicForm.title}
								onChange={(e) => setAddTopicForm((f) => ({ ...f, title: e.target.value }))}
								className="dark:border-gray-700 dark:bg-gray-900"
							/>
						</div>
						<div className="grid gap-3">
							<Label htmlFor="topic-keyword">Target keyword (optional)</Label>
							<InputField
								id="topic-keyword"
								placeholder="Defaults to title if blank"
								value={addTopicForm.keyword}
								onChange={(e) => setAddTopicForm((f) => ({ ...f, keyword: e.target.value }))}
								className="dark:border-gray-700 dark:bg-gray-900"
							/>
						</div>
						<div className="grid gap-3">
							<Label>Funnel stage</Label>
							<div className="flex gap-2">
								{FUNNEL_OPTIONS.map((opt) => (
									<Button
										key={opt.value}
										type="button"
										size="sm"
										variant={addTopicForm.funnel === opt.value ? 'flat' : 'outline'}
										className={
											addTopicForm.funnel === opt.value
												? 'bg-brand-500 hover:bg-brand-600 text-white'
												: ''
										}
										onClick={() => setAddTopicForm((f) => ({ ...f, funnel: opt.value }))}
									>
										{opt.label}
									</Button>
								))}
							</div>
						</div>
						<div className="grid gap-3">
							<Label htmlFor="topic-reasoning">Reasoning (optional)</Label>
							<InputField
								id="topic-reasoning"
								placeholder="Why this topic matters"
								value={addTopicForm.reasoning}
								onChange={(e) => setAddTopicForm((f) => ({ ...f, reasoning: e.target.value }))}
								className="dark:border-gray-700 dark:bg-gray-900"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setAddTopicOpen(false)}
							disabled={addTopicSubmitting}
						>
							Cancel
						</Button>
						<Button
							className="bg-brand-500 hover:bg-brand-600 text-white"
							onClick={handleAddTopic}
							disabled={addTopicSubmitting || !addTopicForm.title.trim()}
						>
							{addTopicSubmitting ? 'Adding…' : 'Add Topic'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
