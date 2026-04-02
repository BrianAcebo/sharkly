import { useState, useCallback } from 'react';
import { Link } from 'react-router';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { FunnelTag } from '../components/shared/FunnelTag';
import { Button } from '../components/ui/button';
import { cn } from '../utils/common';
import { useSiteContext } from '../contexts/SiteContext';
import { useClusters } from '../hooks/useClusters';
import { useTopics } from '../hooks/useTopics';
import { useTargets } from '../hooks/useTargets';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'sonner';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
	DialogDescription
} from '../components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '../components/ui/command';
import { ChevronDown } from 'lucide-react';
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
import type { Cluster } from '../hooks/useClusters';
import { inferClusterContentPageType } from '../lib/seoUtils';

export default function Clusters() {
	const { selectedSite } = useSiteContext();
	const { clusters, loading, refetch: refetchClusters } = useClusters(selectedSite?.id ?? null);
	const { topics, refetch: refetchTopics } = useTopics(selectedSite?.id ?? null);
	const { targets } = useTargets(selectedSite?.id ?? null);

	const [createOpen, setCreateOpen] = useState(false);
	const [createSubmitting, setCreateSubmitting] = useState(false);
	const [createForm, setCreateForm] = useState({
		topicId: '',
		title: '',
		targetKeyword: '',
		destinationPageUrl: '',
		destinationPageLabel: ''
	});
	const [topicPopoverOpen, setTopicPopoverOpen] = useState(false);

	const [editCluster, setEditCluster] = useState<Cluster | null>(null);
	const [editSubmitting, setEditSubmitting] = useState(false);
	const [editForm, setEditForm] = useState({
		title: '',
		targetKeyword: '',
		destinationPageUrl: '',
		destinationPageLabel: ''
	});

	const [deleteCluster, setDeleteCluster] = useState<Cluster | null>(null);
	const [deleteSubmitting, setDeleteSubmitting] = useState(false);

	const topicsWithoutCluster = topics.filter((t) => !t.clusterId);

	const getCroScoreColor = useCallback((croScore: number) => {
		if (croScore >= 80) return 'text-success-600 dark:text-success-400';
		if (croScore >= 60) return 'text-warning-600 dark:text-warning-400';
		return 'text-error-600 dark:text-error-400';
	}, []);

	const handleCreateSubmit = useCallback(async () => {
		if (!selectedSite?.id || !createForm.topicId.trim()) {
			toast.error('Select a topic');
			return;
		}
		const title = createForm.title.trim() || 'Untitled cluster';
		const targetKeyword = createForm.targetKeyword.trim() || title;
		const destUrl = createForm.destinationPageUrl.trim() || null;
		const destLabel = createForm.destinationPageLabel.trim() || null;
		const hasDestination = !!destUrl;
		setCreateSubmitting(true);
		try {
			const { data: cluster, error: clusterErr } = await supabase
				.from('clusters')
				.insert({
					site_id: selectedSite.id,
					topic_id: createForm.topicId,
					title,
					target_keyword: targetKeyword,
					status: 'active',
					funnel_coverage: { tofu: 0, mofu: 0, bofu: 0 },
					completion_pct: 0,
					...(hasDestination && {
						architecture: 'B',
						destination_page_url: destUrl,
						destination_page_label: destLabel || destUrl
					})
				})
				.select('id')
				.single();
			if (clusterErr || !cluster) throw clusterErr || new Error('Failed to create cluster');

			const topic = topics.find((t) => t.id === createForm.topicId);
			const focusTitle = topic ? `${topic.title} Services` : `${title} Services`;
			await supabase.from('pages').insert({
				cluster_id: cluster.id,
				site_id: selectedSite.id,
				type: 'focus_page',
				title: focusTitle,
				keyword: targetKeyword,
				monthly_searches: topic?.volume ?? 0,
				keyword_difficulty: topic?.kd ?? 0,
				funnel_stage: topic?.funnel ?? 'mofu',
				page_type: inferClusterContentPageType(targetKeyword, topic?.title ?? title),
				status: 'planned',
				target_word_count: 1400,
				sort_order: 0,
				position_x: 400,
				position_y: 300
			});

			await supabase
				.from('topics')
				.update({ status: 'active', cluster_id: cluster.id })
				.eq('id', createForm.topicId);

			toast.success('Cluster created');
			setCreateOpen(false);
			setCreateForm({
				topicId: '',
				title: '',
				targetKeyword: '',
				destinationPageUrl: '',
				destinationPageLabel: ''
			});
			await refetchClusters();
			await refetchTopics();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to create cluster');
		} finally {
			setCreateSubmitting(false);
		}
	}, [selectedSite?.id, createForm, topics, refetchClusters, refetchTopics]);

	const openEdit = useCallback((cluster: Cluster, e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setEditCluster(cluster);
		setEditForm({
			title: cluster.title,
			targetKeyword: cluster.targetKeyword,
			destinationPageUrl: cluster.destinationPageUrl ?? '',
			destinationPageLabel: cluster.destinationPageLabel ?? ''
		});
	}, []);

	const handleEditSubmit = useCallback(async () => {
		if (!editCluster) return;
		setEditSubmitting(true);
		try {
			const newTitle = editForm.title.trim() || editCluster.title;
			const newKeyword = editForm.targetKeyword.trim() || editCluster.targetKeyword;
			const keywordChanged = newKeyword !== editCluster.targetKeyword;
			const titleChanged = newTitle !== editCluster.title;

			const destUrl = editForm.destinationPageUrl.trim() || null;
			const destLabel = editForm.destinationPageLabel.trim() || null;
			const hasDestination = !!destUrl;

			// 1. Update the cluster
			const { error: clusterErr } = await supabase
				.from('clusters')
				.update({
					title: newTitle,
					target_keyword: newKeyword,
					...(hasDestination
						? {
								architecture: 'B',
								destination_page_url: destUrl,
								destination_page_label: destLabel || destUrl
							}
						: {
								architecture: 'A',
								destination_page_url: null,
								destination_page_label: null
							}),
					updated_at: new Date().toISOString()
				})
				.eq('id', editCluster.id);
			if (clusterErr) throw clusterErr;

			// 2. Sync the parent topic — keyword and title stay in lockstep
			if (editCluster.topicId && (keywordChanged || titleChanged)) {
				console.log('1');
				const { error: topicErr, count } = await supabase
					.from('topics')
					.update({
						...(keywordChanged && { keyword: newKeyword }),
						...(titleChanged && { title: newTitle })
					})
					.eq('id', editCluster.topicId)
					.single();
				if (topicErr) {
					console.error('[ClusterDetail] Topic sync error:', topicErr);
					throw new Error(`Cluster saved but topic sync failed: ${topicErr.message}`);
				}
				if (count === 0) {
					console.warn(
						'[ClusterDetail] Topic sync: 0 rows updated — RLS may be blocking. Run migration: 2026-03-04_topics_update_rls.sql'
					);
					throw new Error(
						'Cluster saved but topic sync was blocked. Run the topics update RLS migration in Supabase.'
					);
				}
			} else if (!editCluster.topicId) {
				console.warn('[ClusterDetail] No topicId on cluster — cannot sync to parent topic');
			}

			// 3. Sync the cluster's focus page keyword so the workspace uses the right keyword
			if (keywordChanged) {
				console.log('2');
				const { error: pageErr } = await supabase
					.from('pages')
					.update({ keyword: newKeyword })
					.eq('cluster_id', editCluster.id)
					.eq('type', 'focus_page');
				if (pageErr)
					console.warn('[ClusterDetail] Focus page keyword sync error:', pageErr.message);
			}
			toast.success('Cluster updated');
			setEditCluster(null);
			await refetchClusters();
		} catch (err) {
			console.error(err);
			toast.error(err instanceof Error ? err.message : 'Failed to update cluster');
		} finally {
			setEditSubmitting(false);
		}
	}, [editCluster, editForm, refetchClusters]);

	const openDelete = useCallback((cluster: Cluster, e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDeleteCluster(cluster);
	}, []);

	const handleDeleteConfirm = useCallback(async () => {
		if (!deleteCluster) return;
		setDeleteSubmitting(true);
		try {
			// Reset topic first so it can be re-used
			await supabase
				.from('topics')
				.update({ status: 'queued', cluster_id: null })
				.eq('id', deleteCluster.topicId);

			const { error, count } = await supabase
				.from('clusters')
				.delete({ count: 'exact' })
				.eq('id', deleteCluster.id);

			if (error) throw error;
			// count === 0 means RLS silently blocked the delete
			if (count === 0) throw new Error('Permission denied — could not delete cluster.');

			toast.success('Cluster deleted');
			setDeleteCluster(null);
			await refetchClusters();
			await refetchTopics();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to delete cluster');
		} finally {
			setDeleteSubmitting(false);
		}
	}, [deleteCluster, refetchClusters, refetchTopics]);

	const onSelectTopic = useCallback(
		(topicId: string) => {
			const t = topics.find((x) => x.id === topicId);
			// Pre-fill cluster destination from target (Phase 5: target destination as default)
			const target = t?.targetId ? targets.find((x) => x.id === t.targetId) : null;
			setCreateForm((f) => ({
				...f,
				topicId,
				title: t?.title ?? f.title,
				targetKeyword: t?.keyword ?? f.targetKeyword,
				destinationPageUrl: target?.destinationPageUrl ?? f.destinationPageUrl ?? '',
				destinationPageLabel: target?.destinationPageLabel ?? f.destinationPageLabel ?? ''
			}));
		},
		[topics, targets]
	);

	return (
		<>
			<PageMeta title="Clusters" description="Your content clusters" />

			<div className="space-y-6">
				<PageHeader
					title="Content Clusters"
					subtitle="Manage your topic clusters and content pieces"
					rightContent={
						<Button
							className="bg-brand-500 hover:bg-brand-600 text-white"
							startIcon={<Plus className="size-4" />}
							onClick={() => setCreateOpen(true)}
							disabled={!selectedSite?.id}
						>
							New Cluster
						</Button>
					}
				/>

				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
					{clusters.length === 0 && !loading ? (
						<div className="col-span-2 rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
							<p className="text-gray-600 dark:text-gray-400">No clusters yet.</p>
							<p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
								Create a cluster from a topic below, or add topics on the Strategy page first.
							</p>
							<div className="mt-4 flex justify-center gap-3">
								<Button
									className="bg-brand-500 hover:bg-brand-600 text-white"
									onClick={() => setCreateOpen(true)}
									disabled={!selectedSite?.id}
								>
									New Cluster
								</Button>
								<Link to="/strategy">
									<Button variant="outline">Go to Strategy</Button>
								</Link>
							</div>
						</div>
					) : (
						clusters.map((cluster) => (
							<div
								key={cluster.id}
								className={cn(
									'rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:shadow-lg',
									loading && 'pointer-events-none opacity-70'
								)}
							>
								<Link to={`/clusters/${cluster.id}`} className="block p-6">
									<div className="flex items-start justify-between">
										<div>
											<h3 className="font-montserrat text-lg font-bold text-gray-900 dark:text-white">
												{cluster.title}
											</h3>
											<p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">
												keyword: {cluster.targetKeyword}
											</p>
										</div>
										<FunnelTag stage="money" />
									</div>
									<div className="mt-4">
										<p className="text-[12px] text-gray-500 dark:text-gray-400">
											<span className="font-medium text-gray-700 dark:text-gray-300">
												{cluster.articleCount} supporting article
												{cluster.articleCount !== 1 ? 's' : ''}
											</span>{' '}
											covering the complete topic
										</p>
									</div>
									<div className="mt-3 flex items-center justify-between gap-4 text-sm text-gray-600 dark:text-gray-400">
										<div className="flex items-center gap-4">
											<span>
												{cluster.completion} of {cluster.total} complete
											</span>
											<span>Est. {(cluster.estimatedTraffic || 0).toLocaleString()} visits</span>
										</div>
										<span
											className={cn(
												'text-sm text-gray-900 dark:text-white',
												getCroScoreColor(cluster.croScore)
											)}
										>
											CRO {cluster.croScore}/100
										</span>
									</div>
									<div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
										<div
											className="bg-brand-500 h-full rounded-full"
											style={{
												width: `${cluster.total > 0 ? (cluster.completion / cluster.total) * 100 : 0}%`
											}}
										/>
									</div>
									<div className="mt-4 flex items-center justify-between">
										<Button size="sm" variant="flat">
											Continue Working →
										</Button>
									</div>
								</Link>
								<div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
									<Button
										size="sm"
										variant="ghost"
										className="text-gray-600 dark:text-gray-400"
										onClick={(e) => openEdit(cluster, e)}
									>
										<Pencil className="size-4" />
										<span className="ml-1.5">Edit</span>
									</Button>
									<Button
										size="sm"
										variant="ghost"
										className="text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-950"
										onClick={(e) => openDelete(cluster, e)}
									>
										<Trash2 className="size-4" />
										<span className="ml-1.5">Delete</span>
									</Button>
								</div>
							</div>
						))
					)}
				</div>
			</div>

			{/* Create cluster dialog */}
			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Create cluster</DialogTitle>
						<DialogDescription>
							Every cluster must be linked to a topic. Choose a topic that doesn’t already have a
							cluster.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label>Topic (required)</Label>
							<Popover open={topicPopoverOpen} onOpenChange={setTopicPopoverOpen}>
								<PopoverTrigger asChild>
									<Button
										variant="outline"
										role="combobox"
										aria-expanded={topicPopoverOpen}
										className="h-11 w-full justify-between rounded-lg border-gray-300 px-4 font-normal dark:border-gray-600"
									>
										{createForm.topicId
											? (topicsWithoutCluster.find((t) => t.id === createForm.topicId)?.title ??
												'Select a topic…')
											: 'Select a topic…'}
										<ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
									</Button>
								</PopoverTrigger>
								<PopoverContent
									className="w-[var(--radix-popover-trigger-width)] p-0"
									align="start"
								>
									<Command>
										<CommandInput placeholder="Search topics…" className="h-10" />
										<CommandList>
											<CommandEmpty>No topic found.</CommandEmpty>
											<CommandGroup>
												{topicsWithoutCluster.map((t) => (
													<CommandItem
														key={t.id}
														value={`${t.title} ${t.keyword}`}
														onSelect={() => {
															onSelectTopic(t.id);
															setTopicPopoverOpen(false);
														}}
													>
														<span className="font-medium">{t.title}</span>
														{t.keyword && t.keyword !== t.title && (
															<span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
																· {t.keyword}
															</span>
														)}
													</CommandItem>
												))}
											</CommandGroup>
										</CommandList>
									</Command>
								</PopoverContent>
							</Popover>
							{topicsWithoutCluster.length === 0 && selectedSite && (
								<p className="text-xs text-gray-500 dark:text-gray-400">
									All topics have a cluster. Add more topics on the Strategy page.
								</p>
							)}
						</div>
						<InputField
							label="Cluster title"
							value={createForm.title}
							onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
							placeholder="e.g. Cyber Crime Investigation"
						/>
						<InputField
							label="Target keyword"
							value={createForm.targetKeyword}
							onChange={(e) => setCreateForm((f) => ({ ...f, targetKeyword: e.target.value }))}
							placeholder="e.g. cyber crime investigation"
						/>
						<div className="space-y-2 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
							<p className="text-xs font-medium text-gray-700 dark:text-gray-300">
								Destination page (optional)
							</p>
							<p className="text-[11px] text-gray-500 dark:text-gray-400">
								Does this cluster drive visitors to a product page, signup page, or service booking
								page? We&apos;ll optimize linking to send the right visitors there.
							</p>
							<InputField
								label="Page URL"
								value={createForm.destinationPageUrl}
								onChange={(e) =>
									setCreateForm((f) => ({ ...f, destinationPageUrl: e.target.value }))
								}
								placeholder="https://yoursite.com/product or /signup"
							/>
							<InputField
								label="Page label"
								value={createForm.destinationPageLabel}
								onChange={(e) =>
									setCreateForm((f) => ({ ...f, destinationPageLabel: e.target.value }))
								}
								placeholder="e.g. Cooling Sheets Product Page"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setCreateOpen(false)}
							disabled={createSubmitting}
						>
							Cancel
						</Button>
						<Button
							className="bg-brand-500 hover:bg-brand-600 text-white"
							onClick={handleCreateSubmit}
							disabled={createSubmitting || !createForm.topicId.trim()}
						>
							{createSubmitting ? 'Creating…' : 'Create cluster'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Edit cluster dialog */}
			<Dialog open={!!editCluster} onOpenChange={(open) => !open && setEditCluster(null)}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Edit cluster</DialogTitle>
						<DialogDescription>Update the cluster title and target keyword.</DialogDescription>
					</DialogHeader>
					{editCluster && (
						<div className="grid gap-4 py-4">
							<InputField
								label="Title"
								value={editForm.title}
								onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
							/>
							<InputField
								label="Target keyword"
								value={editForm.targetKeyword}
								onChange={(e) => setEditForm((f) => ({ ...f, targetKeyword: e.target.value }))}
							/>
							<hr className="my-4 border-gray-200 dark:border-gray-600" />
							<p className="text-xs font-medium text-gray-700 dark:text-gray-300">
								Destination page (optional)
							</p>
							<p className="text-[11px] text-gray-500 dark:text-gray-400">
								Product, signup, or service page this content drives visitors toward.
							</p>
							<InputField
								label="Page URL"
								value={editForm.destinationPageUrl}
								onChange={(e) => setEditForm((f) => ({ ...f, destinationPageUrl: e.target.value }))}
								placeholder="https://yoursite.com/product"
							/>
							<InputField
								label="Page label"
								value={editForm.destinationPageLabel}
								onChange={(e) =>
									setEditForm((f) => ({ ...f, destinationPageLabel: e.target.value }))
								}
								placeholder="e.g. Product Page"
							/>
						</div>
					)}
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setEditCluster(null)}
							disabled={editSubmitting}
						>
							Cancel
						</Button>
						<Button
							className="bg-brand-500 hover:bg-brand-600 text-white"
							onClick={handleEditSubmit}
							disabled={editSubmitting}
						>
							{editSubmitting ? 'Saving…' : 'Save'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete cluster confirmation */}
			<AlertDialog open={!!deleteCluster} onOpenChange={(open) => !open && setDeleteCluster(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete cluster?</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove the cluster and all its pages. The topic will be available again on
							the Strategy page so you can start a new cluster from it later.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteSubmitting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								handleDeleteConfirm();
							}}
							disabled={deleteSubmitting}
							className="bg-error-600 hover:bg-error-700 text-white"
						>
							{deleteSubmitting ? 'Deleting…' : 'Delete cluster'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
