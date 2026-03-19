import React, { useState } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/common';
import { AIInsightBlock } from '../shared/AIInsightBlock';
import type { ClusterIntelligence, ClusterWarning } from '../../hooks/useClusterIntelligence';

const severityColors: Record<ClusterWarning['severity'], string> = {
	high: 'border-l-red-500 bg-red-50/50 dark:bg-red-900/20 dark:border-l-red-400',
	medium: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/20 dark:border-l-amber-400',
	low: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/20 dark:border-l-blue-400'
};

const healthBadgeColors: Record<ClusterIntelligence['health']['color'], string> = {
	green: 'bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-300',
	amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
	red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
};

export function ClusterHealthCheck({
	intelligence,
	loading,
	error,
	onRefetch
}: {
	intelligence: ClusterIntelligence | null;
	loading: boolean;
	error: string | null;
	onRefetch: () => void;
}) {
	const [collapsed, setCollapsed] = useState(false);

	if (loading && !intelligence) {
		return (
			<div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-8 dark:border-gray-700 dark:bg-gray-900">
				<Loader2 className="size-4 animate-spin text-gray-400" />
				<span className="text-sm text-gray-500 dark:text-gray-400">Checking cluster health…</span>
			</div>
		);
	}

	if (error && !intelligence) {
		return (
			<div className="mt-6 rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-800 dark:bg-red-900/20">
				<p className="text-sm text-red-700 dark:text-red-300">{error}</p>
				<button
					type="button"
					onClick={onRefetch}
					className="mt-2 flex items-center gap-2 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
				>
					<RefreshCw className="size-3.5" />
					Try again
				</button>
			</div>
		);
	}

	if (!intelligence) return null;

	const { warnings, health } = intelligence;
	const hasWarnings = warnings.length > 0;

	return (
		<div className="mt-6 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
			<button
				type="button"
				onClick={() => setCollapsed(!collapsed)}
				className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
			>
				<div className="flex items-center gap-3">
					{collapsed ? (
						<ChevronRight className="size-4 text-gray-400" />
					) : (
						<ChevronDown className="size-4 text-gray-400" />
					)}
					<span className="font-semibold text-gray-900 dark:text-white">Cluster Health Check</span>
					<span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', healthBadgeColors[health.color])}>
						{health.label} ({health.score})
					</span>
					{hasWarnings && (
						<span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
							<AlertTriangle className="size-3.5" />
							{warnings.length} issue{warnings.length !== 1 ? 's' : ''}
						</span>
					)}
				</div>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onRefetch();
					}}
					disabled={loading}
					className="rounded p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
					title="Re-evaluate"
				>
					{loading ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<RefreshCw className="size-4" />
					)}
				</button>
			</button>

			{!collapsed && (
				<div className="border-t border-gray-200 px-5 pb-5 pt-4 dark:border-gray-700">
					{!hasWarnings ? (
						<p className="text-sm text-gray-600 dark:text-gray-400">
							Your cluster architecture looks solid. Articles are flowing equity to your main page, funnel
							stages are balanced, and external links are protected.
						</p>
					) : (
						<div className="space-y-3">
							{warnings.map((w, i) => (
								<div
									key={w.type + String(i)}
									className={cn(
										'rounded-r-lg border-l-4 p-4',
										severityColors[w.severity]
									)}
								>
									<p className="text-sm font-medium text-gray-900 dark:text-white">{w.message}</p>
									<p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
										<strong>Action:</strong> {w.action}
									</p>
									{w.assessmentNote && (
										<p className="mt-1.5 text-xs italic text-gray-500 dark:text-gray-400">
											{w.assessmentNote}
										</p>
									)}
									{w.affectedPages.length > 0 && (
										<ul className="mt-2 list-inside list-disc text-xs text-gray-500 dark:text-gray-400">
											{w.affectedPages.slice(0, 5).map((p) => (
												<li key={p}>{p}</li>
											))}
											{w.affectedPages.length > 5 && (
												<li>+{w.affectedPages.length - 5} more</li>
											)}
										</ul>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
