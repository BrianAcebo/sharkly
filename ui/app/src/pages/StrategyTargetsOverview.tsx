/**
 * /strategy — Targets overview (grid of target cards)
 */

import { useState } from 'react';
import { Link } from 'react-router';
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { AIInsightBlock } from '../components/shared/AIInsightBlock';
import { Button } from '../components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
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
import { Plus, FileText, Layers, MoreVertical, Target as TargetIcon, Trash2 } from 'lucide-react';
import { useSiteContext } from '../contexts/SiteContext';
import { useTargets } from '../hooks/useTargets';
import { useTopics } from '../hooks/useTopics';
import { useClusters } from '../hooks/useClusters';
import { AddTargetModal } from '../components/strategy/AddTargetModal';
import { TargetIntentGuidance } from '../components/strategy/TargetIntentGuidance';
import { toast } from 'sonner';
import type { Target } from '../types/target';


export default function StrategyTargetsOverview() {
	const { selectedSite } = useSiteContext();
	const { targets, loading, refetch, deleteTarget } = useTargets(selectedSite?.id ?? null);
	const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<Target | null>(null);
	const [deleting, setDeleting] = useState(false);
	const { topics } = useTopics(selectedSite?.id ?? null);
	const { clusters } = useClusters(selectedSite?.id ?? null);
	const [addModalOpen, setAddModalOpen] = useState(false);

	const getTargetStats = (target: Target) => {
		const targetTopicIds = new Set(
			topics.filter((t) => t.targetId === target.id).map((t) => t.id)
		);
		const topicCount = targetTopicIds.size;
		const clusterCount = clusters.filter((c) => targetTopicIds.has(c.topicId)).length;
		const inProgress = topics.filter(
			(t) => t.targetId === target.id && (t.status === 'active' || t.clusterId)
		).length;
		return { topicCount, clusterCount, inProgress };
	};

	return (
		<>
			<PageMeta title="Strategy" description="Your content strategy targets" noIndex />
			<div className="space-y-6">
				<PageHeader
					title="Your Strategy"
					subtitle="Each target is a page you want to rank. Build a topic plan around each one."
					rightContent={
						<Button
							className="bg-brand-500 hover:bg-brand-600"
							onClick={() => setAddModalOpen(true)}
							disabled={!selectedSite?.id}
						>
							<Plus className="mr-2 size-4" />
							Add Target
						</Button>
					}
				/>

				{selectedSite && (
					<AIInsightBlock
						variant="analyst"
						label="AI STRATEGIST"
						message="Create targets for each service, product, or area of business you want to rank. Sharkly builds a topic plan around each target and recommends which to focus on first."
					/>
				)}

				{loading ? (
					<div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
						Loading targets…
					</div>
				) : targets.length === 0 ? (
					<div className="rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
						<div className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-950/50">
							<TargetIcon className="text-brand-500 size-8" />
						</div>
						<h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
							You haven&apos;t defined any targets yet
						</h3>
						<p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
							A target is a page you want to rank — a service, product, or area of your business.
							Sharkly builds a content plan around each one.
						</p>
						<Button
							className="bg-brand-500 hover:bg-brand-600 mt-6"
							onClick={() => setAddModalOpen(true)}
							disabled={!selectedSite?.id}
						>
							<Plus className="mr-2 size-4" />
							Add your first target
						</Button>
					</div>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{targets.map((target) => {
							const { topicCount, clusterCount, inProgress } = getTargetStats(target);
							return (
								<div
									key={target.id}
									className="relative flex flex-col rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-700 dark:hover:bg-brand-950/30"
								>
									<div className="absolute top-3 right-3">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													className="size-8 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
													onClick={(e) => e.stopPropagation()}
												>
													<MoreVertical className="size-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem
													className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
													onClick={() => setDeleteConfirmTarget(target)}
												>
													<Trash2 className="mr-2 size-4" />
													Delete target
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
									<Link
										to={`/strategy/${target.id}`}
										className="flex flex-1 flex-col"
									>
										<h3 className="pr-8 font-semibold text-gray-900 dark:text-white">{target.name}</h3>
										{target.destinationPageLabel && (
											<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
												→ {target.destinationPageLabel}
											</p>
										)}
										<TargetIntentGuidance
											compact
											target={target}
											name={target.name}
											seedKeywords={target.seedKeywords ?? []}
											destinationPageLabel={target.destinationPageLabel}
											destinationPageUrl={target.destinationPageUrl}
										/>
										<div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
											<span className="flex items-center gap-1.5">
												<FileText className="size-4" />
												{topicCount} topic{topicCount !== 1 ? 's' : ''}
											</span>
											<span className="flex items-center gap-1.5">
												<Layers className="size-4" />
												{clusterCount} cluster{clusterCount !== 1 ? 's' : ''}
											</span>
											{inProgress > 0 && (
												<span className="text-brand-600 dark:text-brand-400">
													{inProgress} in progress
												</span>
											)}
										</div>
										<span className="mt-4 text-sm font-medium text-brand-600 dark:text-brand-400">
											View Topics →
										</span>
									</Link>
								</div>
							);
						})}
					</div>
				)}
			</div>

			<AddTargetModal
				open={addModalOpen}
				onClose={() => setAddModalOpen(false)}
				siteId={selectedSite?.id ?? ''}
				onTargetCreated={() => refetch()}
			/>

			<AlertDialog
				open={!!deleteConfirmTarget}
				onOpenChange={(open) => !open && setDeleteConfirmTarget(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete target?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete &quot;{deleteConfirmTarget?.name}&quot; and all its topics,
							clusters, and related content. This cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-red-600 hover:bg-red-700"
							onClick={async (e) => {
								e.preventDefault();
								if (!deleteConfirmTarget) return;
								setDeleting(true);
								const { error } = await deleteTarget(deleteConfirmTarget.id);
								setDeleting(false);
								setDeleteConfirmTarget(null);
								if (error) {
									toast.error(error);
								} else {
									refetch();
									toast.success('Target deleted');
								}
							}}
							disabled={deleting}
						>
							{deleting ? 'Deleting…' : 'Delete'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
