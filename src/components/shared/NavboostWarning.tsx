/**
 * V1 — Section 12.2
 * Shown when CTR < 2% with weakening 4-week trend (CTR momentum risk).
 * Amber badge; links to CTR optimization action (3 credits).
 */
import React from 'react';
import { Link } from 'react-router';
import { AlertTriangle, TrendingDown } from 'lucide-react';

type Props = {
	/** Optional workspace page id for "Optimize CTR" link */
	pageId?: string;
	/** Optional keyword for display */
	keyword?: string;
};

export function NavboostWarning({ pageId, keyword }: Props) {
	const optimizeUrl = pageId ? `/workspace/${pageId}` : '/performance';
	const displayText = keyword
		? `Click rate declining for "${keyword}" — Google is tracking this. Rewrite title now.`
		: 'Click rate declining — Google is tracking this. Rewrite title now.';

	return (
		<div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
			<AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
			<div className="min-w-0 flex-1">
				<p className="text-[13px] font-semibold text-amber-800 dark:text-amber-200">
					{displayText}
				</p>
				<Link
					to={optimizeUrl}
					className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-700 hover:underline dark:text-amber-300"
				>
					<TrendingDown className="size-3.5" />
					Optimize title (3 credits)
				</Link>
			</div>
		</div>
	);
}
