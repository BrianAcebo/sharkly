/**
 * V1 — Section 12.2
 * Shown on cluster detail when any article lacks a link to the focus page.
 * Amber persistent banner with link to Internal Links tab.
 */
import React from 'react';
import { Link } from 'react-router';
import { AlertTriangle, Link2 } from 'lucide-react';

type Props = {
	missingCount: number;
	clusterId: string;
};

export function ReverseSiloAlert({ missingCount, clusterId }: Props) {
	if (missingCount <= 0) return null;
	return (
		<div className="flex items-center gap-3 rounded-lg border border-warning-200 bg-warning-50 p-4 dark:border-warning-800 dark:bg-warning-900/20">
			<AlertTriangle className="size-5 shrink-0 text-warning-600 dark:text-warning-400" />
			<div className="min-w-0 flex-1">
				<p className="text-[13px] font-semibold text-warning-800 dark:text-warning-200">
					{missingCount} article{missingCount !== 1 ? 's' : ''} don&apos;t link to your main page — authority isn&apos;t flowing correctly.
				</p>
				<Link
					to={`/clusters/${clusterId}#internal-links`}
					className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-warning-700 dark:text-warning-300 hover:underline"
				>
					<Link2 className="size-3.5" />
					Fix in Internal Links
				</Link>
			</div>
		</div>
	);
}
