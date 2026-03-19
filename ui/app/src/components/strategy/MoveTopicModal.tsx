/**
 * Move topic to another strategy — modal with search for when users have many targets.
 */

import { useState, useMemo } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription
} from '../ui/dialog';
import { Search, ArrowRightLeft, Loader2 } from 'lucide-react';
import type { Topic } from '../../hooks/useTopics';

interface Props {
	open: boolean;
	onClose: () => void;
	topic: Topic | null;
	targets: Array<{ id: string; name: string }>;
	onMove: (topicId: string, destinationTargetId: string) => void;
	moving: boolean;
}

export function MoveTopicModal({ open, onClose, topic, targets, onMove, moving }: Props) {
	const [search, setSearch] = useState('');

	const filteredTargets = useMemo(() => {
		if (!search.trim()) return targets;
		const q = search.trim().toLowerCase();
		return targets.filter((t) => t.name.toLowerCase().includes(q));
	}, [targets, search]);

	const handleSelect = (targetId: string) => {
		if (!topic || moving) return;
		onMove(topic.id, targetId);
		onClose();
		setSearch('');
	};

	const handleClose = (open: boolean) => {
		if (!open) {
			setSearch('');
			onClose();
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<ArrowRightLeft className="size-4" />
						Move topic to strategy
					</DialogTitle>
					<DialogDescription>
						{topic ? (
							<>
								Moving &quot;{topic.title}&quot; — select a strategy below.
							</>
						) : (
							'Select a strategy to move this topic to.'
						)}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3 pt-2">
					<div className="relative">
						<Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
						<input
							type="text"
							placeholder="Search strategies…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
							autoFocus
						/>
					</div>

					<div className="max-h-[280px] overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700">
						{filteredTargets.length === 0 ? (
							<div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
								{search.trim()
									? 'No strategies match your search.'
									: 'No other strategies available.'}
							</div>
						) : (
							<ul className="divide-y divide-gray-200 dark:divide-gray-700">
								{filteredTargets.map((t) => (
									<li key={t.id}>
										<button
											type="button"
											onClick={() => handleSelect(t.id)}
											disabled={moving}
											className="flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50 disabled:opacity-50 dark:hover:bg-gray-800"
										>
											<span className="font-medium text-gray-900 dark:text-white">
												{t.name}
											</span>
											{moving ? (
												<Loader2 className="size-4 animate-spin text-gray-400" />
											) : (
												<ArrowRightLeft className="size-4 text-gray-400" />
											)}
										</button>
									</li>
								))}
							</ul>
						)}
					</div>

					{targets.length > 5 && (
						<p className="text-[11px] text-gray-500 dark:text-gray-400">
							{filteredTargets.length} of {targets.length} strategies
							{search.trim() && ' match your search'}
						</p>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
