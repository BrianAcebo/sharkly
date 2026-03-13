/**
 * L5. Weekly Priority Stack
 * Data-driven task list shown on Dashboard. Max 6 items.
 * Categories: High Impact (red), Medium Impact (amber), Keep Going (green).
 */

import { Link } from 'react-router';
import { Zap, AlertCircle, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import type { PriorityItem, PriorityCategory } from '../../hooks/useWeeklyPriorityStack';

function CategoryIcon({ category }: { category: PriorityCategory }) {
	if (category === 'high') return <AlertCircle className="size-4 shrink-0 text-error-500" />;
	if (category === 'medium') return <Zap className="size-4 shrink-0 text-warning-500" />;
	return <CheckCircle2 className="size-4 shrink-0 text-success-500" />;
}

function categoryStyles(category: PriorityCategory): string {
	if (category === 'high')
		return 'border-l-error-500 bg-error-50/50 dark:bg-error-900/10 dark:border-error-600';
	if (category === 'medium')
		return 'border-l-warning-500 bg-warning-50/50 dark:bg-warning-900/10 dark:border-warning-600';
	return 'border-l-success-500 bg-success-50/50 dark:bg-success-900/10 dark:border-success-600';
}

type Props = {
	items: PriorityItem[];
	loading: boolean;
	error: string | null;
	onRefetch?: () => void;
};

export function WeeklyPriorityStack({ items, loading, error, onRefetch }: Props) {
	if (loading) {
		return (
			<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
				<h3 className="font-montserrat flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
					<Zap className="text-brand-500 dark:text-brand-400 size-4" />
					Priorities
				</h3>
				<div className="mt-4 flex items-center justify-center py-8">
					<Loader2 className="size-6 animate-spin text-gray-400" />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
				<h3 className="font-montserrat flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
					<Zap className="text-brand-500 dark:text-brand-400 size-4" />
					Priorities
				</h3>
				<p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{error}</p>
				{onRefetch && (
					<Button variant="outline" size="sm" className="mt-2" onClick={onRefetch}>
						Retry
					</Button>
				)}
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
			<h3 className="font-montserrat flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
				<Zap className="text-brand-500 dark:text-brand-400 size-4" />
				Weekly Priorities
			</h3>
			<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
				Data-driven actions ranked by impact
			</p>
			<div className="mt-4 flex flex-col gap-3">
				{items.length === 0 ? (
					<p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
						All caught up. Start a cluster or add topics on Strategy.
					</p>
				) : (
					items.map((item) => (
						<Link
							key={item.id}
							to={item.actionUrl}
							className={`flex cursor-pointer gap-3 rounded-lg border-l-4 p-3 transition-colors hover:opacity-90 ${categoryStyles(
								item.category
							)}`}
						>
							<CategoryIcon category={item.category} />
							<div className="min-w-0 flex-1">
								<div className="text-[13px] font-semibold text-gray-900 dark:text-white">
									{item.title}
								</div>
								<p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
									{item.description}
								</p>
							</div>
							<span className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-brand-600 dark:text-brand-400">
								{item.actionLabel}
								<ArrowRight className="size-3" />
							</span>
						</Link>
					))
				)}
			</div>
		</div>
	);
}
