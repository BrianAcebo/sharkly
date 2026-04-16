import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '../ui/button';
import { FunnelTag } from './FunnelTag';
import { Check, Clock, Lock, ChevronDown } from 'lucide-react';
import type { Topic } from '../../hooks/useTopics';
import { CLUSTER_SEQUENCING_BLOG_URL, CLUSTER_SEQUENCING_REASON } from '../../lib/clusterSequencingMessaging';
import { useEffect, useMemo, useState } from 'react';

export type TopicQueueTableProps = {
	topics: Topic[];
	/** Overrides the default empty copy when `topics` is empty (e.g. active queue with everything completed). */
	emptyDescription?: string;
	/** When false, the “Go to Strategy” button is omitted in the empty state. */
	emptyShowStrategyCta?: boolean;
	loading?: boolean;
	/** When set, only the first N rows are shown and pagination is hidden (e.g. Dashboard preview). */
	maxRows?: number;
	/** Used when `maxRows` is omitted. Default 15. */
	pageSize?: number;
	showTargetColumn?: boolean;
	targetNameById?: Map<string, string>;
	/** Full calendar: expand a row to show extra content (e.g. cluster pages). Incompatible with `maxRows`. */
	expandable?: boolean;
	expandedTopicId?: string | null;
	onExpandedTopicChange?: (topicId: string | null) => void;
	renderExpanded?: (topic: Topic) => ReactNode;
	/** When set, "Start" is disabled until that cluster is fully complete (topic status complete). */
	blockingIncompleteClusterTopic?: Topic | null;
};

export function TopicQueueTable({
	topics,
	emptyDescription,
	emptyShowStrategyCta = true,
	loading = false,
	maxRows,
	pageSize = 15,
	showTargetColumn = false,
	targetNameById,
	expandable = false,
	expandedTopicId = null,
	onExpandedTopicChange,
	renderExpanded,
	blockingIncompleteClusterTopic = null
}: TopicQueueTableProps) {
	const isPreview = maxRows != null;
	const canExpand = Boolean(expandable && !isPreview && renderExpanded && onExpandedTopicChange);
	const [page, setPage] = useState(1);

	const totalPages = Math.max(1, Math.ceil(topics.length / pageSize));

	useEffect(() => {
		setPage(1);
	}, [topics.length]);

	useEffect(() => {
		if (page > totalPages) setPage(totalPages);
	}, [page, totalPages]);

	useEffect(() => {
		if (canExpand) onExpandedTopicChange?.(null);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only collapse when page changes
	}, [page]);

	const displayTopics = useMemo(() => {
		if (isPreview) return topics.slice(0, maxRows);
		const start = (page - 1) * pageSize;
		return topics.slice(start, start + pageSize);
	}, [topics, maxRows, page, pageSize, isPreview]);

	const colCount = (showTargetColumn ? 8 : 7) + (canExpand ? 1 : 0);

	if (loading) {
		return (
			<div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
				Loading topic queue…
			</div>
		);
	}

	return (
		<div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
			<div className="overflow-x-auto">
				<table className="w-full min-w-[720px]">
					<thead>
						<tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
							{canExpand && (
								<th className="w-10 px-2 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
									<span className="sr-only">Expand</span>
								</th>
							)}
							<th className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
								#
							</th>
							<th className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
								Topic
							</th>
							{showTargetColumn && (
								<th className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
									Target
								</th>
							)}
							<th className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
								Funnel
							</th>
							<th className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
								Monthly Searches
							</th>
							<th
								className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400"
								title="How hard it is to rank for this"
							>
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
								<td
									colSpan={colCount}
									className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
								>
									{emptyDescription ??
										'No topics yet. Add topics on the Strategy page or complete onboarding for an AI-generated strategy.'}
									{emptyShowStrategyCta && (
										<div className="mt-3">
											<Link to="/strategy">
												<Button size="sm" variant="outline">
													Go to Strategy
												</Button>
											</Link>
										</div>
									)}
								</td>
							</tr>
						) : (
							displayTopics.map((topic, idx) => {
								const globalIdx = isPreview ? idx : (page - 1) * pageSize + idx;
								const isOpen = canExpand && expandedTopicId === topic.id;
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
								const target = {
									id: topic.targetId,
									name: (topic.targetId && targetNameById?.get(topic.targetId)) ?? '—'
								};

								const row = (
									<tr
										key={canExpand ? undefined : topic.id}
										className={`border-b border-gray-200 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 ${
											isActive ? 'border-l-brand-500 border-l-4' : ''
										} ${isOpen ? 'bg-gray-50/80 dark:bg-gray-800/40' : ''}`}
									>
										{canExpand && (
											<td className="px-2 py-4 align-top">
												<button
													type="button"
													onClick={() => onExpandedTopicChange?.(isOpen ? null : topic.id)}
													className="flex size-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200/80 dark:text-gray-400 dark:hover:bg-gray-700"
													aria-expanded={isOpen}
													aria-label={isOpen ? 'Collapse cluster pages' : 'Expand cluster pages'}
												>
													<ChevronDown
														className={`size-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
													/>
												</button>
											</td>
										)}
										<td className="px-5 py-4 text-[13px] text-gray-500 dark:text-gray-400">
											{topic.priority ?? globalIdx + 1}
										</td>
										<td className="px-5 py-4">
											{canExpand ? (
												<button
													type="button"
													onClick={() => onExpandedTopicChange?.(isOpen ? null : topic.id)}
													className="w-full text-left"
												>
													<div className="font-semibold text-gray-900 dark:text-white">
														{topic.title}
													</div>
													<div className="text-xs text-gray-500 dark:text-gray-400">
														{topic.reasoning}
													</div>
												</button>
											) : (
												<>
													<div className="font-semibold text-gray-900 dark:text-white">
														{topic.title}
													</div>
													<div className="text-xs text-gray-500 dark:text-gray-400">
														{topic.reasoning}
													</div>
												</>
											)}
										</td>
										{showTargetColumn && (
											<td className="max-w-[140px] px-5 py-4 text-[13px] text-gray-700 dark:text-gray-300">
												<Link
													to={`/strategy/${target.id}`}
													className="text-xs text-gray-500 dark:text-gray-400"
												>
													{target.name}
												</Link>
											</td>
										)}
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
											{topic.clusterId &&
											(topic.status === 'active' || topic.status === 'complete') ? (
												<Link to={`/clusters/${topic.clusterId}`}>
													<Button
														size="sm"
														variant={topic.status === 'complete' ? 'outline' : 'default'}
														className={
															topic.status === 'complete'
																? ''
																: 'bg-brand-500 hover:bg-brand-600 text-white'
														}
													>
														View cluster
													</Button>
												</Link>
											) : (topic.status === 'queued' || !topic.clusterId) &&
											  topic.authorityFit === 'achievable' ? (
												!topic.clusterId &&
												blockingIncompleteClusterTopic?.clusterId ? (
													<div className="flex max-w-[200px] flex-col gap-1">
														<Button size="sm" variant="outline" disabled>
															<Lock className="mr-1 size-3 shrink-0" />
															Finish cluster first
														</Button>
														<p className="text-[9px] leading-snug text-gray-500 dark:text-gray-400">
															{CLUSTER_SEQUENCING_REASON}
														</p>
														<a
															href={CLUSTER_SEQUENCING_BLOG_URL}
															target="_blank"
															rel="noopener noreferrer"
															className="text-brand-600 dark:text-brand-400 text-[10px] font-medium hover:underline"
														>
															Why one cluster →
														</a>
														<Link
															to={`/clusters/${blockingIncompleteClusterTopic.clusterId}`}
															className="text-brand-600 dark:text-brand-400 text-[10px] font-medium hover:underline"
														>
															Open active →
														</Link>
													</div>
												) : (
													<Link to={`/strategy/${target.id}`}>
														<Button size="sm" variant="outline">
															Start
														</Button>
													</Link>
												)
											) : (
												<Button size="sm" variant="ghost" disabled>
													Locked
												</Button>
											)}
										</td>
									</tr>
								);

								if (!canExpand) {
									return row;
								}

								return (
									<Fragment key={topic.id}>
										{row}
										{isOpen && (
											<tr className="border-b border-gray-200 bg-gray-50/90 dark:border-gray-700 dark:bg-gray-900/80">
												<td colSpan={colCount} className="px-0 py-0">
													<div className="border-t border-gray-200 px-4 py-4 dark:border-gray-700">
														{renderExpanded ? renderExpanded(topic) : null}
													</div>
												</td>
											</tr>
										)}
									</Fragment>
								);
							})
						)}
					</tbody>
				</table>
			</div>
			{!isPreview && topics.length > pageSize && (
				<div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-5 py-3 dark:border-gray-700">
					<p className="text-[12px] text-gray-500 dark:text-gray-400">
						Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, topics.length)} of{' '}
						{topics.length}
					</p>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={page <= 1}
							onClick={() => setPage((p) => Math.max(1, p - 1))}
						>
							Previous
						</Button>
						<span className="text-[12px] text-gray-600 dark:text-gray-400">
							Page {page} of {totalPages}
						</span>
						<Button
							variant="outline"
							size="sm"
							disabled={page >= totalPages}
							onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
						>
							Next
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
