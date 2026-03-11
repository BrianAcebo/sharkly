/**
 * /strategy — Targets overview (grid of target cards)
 */

import { useState } from 'react';
import { Link } from 'react-router';
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { AIInsightBlock } from '../components/shared/AIInsightBlock';
import { Button } from '../components/ui/button';
import { Plus, FileText, Layers, Target as TargetIcon } from 'lucide-react';
import { useSiteContext } from '../contexts/SiteContext';
import { useTargets } from '../hooks/useTargets';
import { useTopics } from '../hooks/useTopics';
import { useClusters } from '../hooks/useClusters';
import { AddTargetModal } from '../components/strategy/AddTargetModal';
import type { Target } from '../types/target';


export default function StrategyTargetsOverview() {
	const { selectedSite } = useSiteContext();
	const { targets, loading, refetch } = useTargets(selectedSite?.id ?? null);
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
								<Link
									key={target.id}
									to={`/strategy/${target.id}`}
									className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-700 dark:hover:bg-brand-950/30"
								>
									<h3 className="font-semibold text-gray-900 dark:text-white">{target.name}</h3>
									{target.destinationPageLabel && (
										<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
											→ {target.destinationPageLabel}
										</p>
									)}
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
		</>
	);
}
