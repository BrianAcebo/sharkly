/**
 * S2-17: Law of SEO — Contextual education tooltip
 * Shows an info icon that on hover displays the law statement + patent.
 * Use at feature locations where that law applies.
 */

import { Info } from 'lucide-react';
import { Tooltip } from '../ui/tooltip';
import { LAWS_OF_SEO, type LawId } from '../../lib/lawsOfSeo';

type Props = {
	lawId: LawId;
	/** Optional: override position */
	tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
	/** Optional: smaller icon */
	size?: 'sm' | 'md';
};

export function LawTooltip({ lawId, tooltipPosition = 'top', size = 'sm' }: Props) {
	const law = LAWS_OF_SEO[lawId];
	if (!law) return null;

	const content = `${law.statement} [${law.patent}]`;
	const iconClass = size === 'sm' ? 'size-3.5' : 'size-4';

	return (
		<Tooltip
			content={content}
			tooltipPosition={tooltipPosition}
			usePortal
			className="max-w-[340px]"
		>
			<span className="inline-flex cursor-help text-gray-400 hover:text-gray-600 dark:hover:text-gray-500">
				<Info className={iconClass} />
			</span>
		</Tooltip>
	);
}
