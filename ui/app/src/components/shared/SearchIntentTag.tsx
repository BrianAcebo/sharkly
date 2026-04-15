import {
	detectSearchIntent,
	searchIntentDisplayLabel,
	type SearchIntent
} from '../../lib/seoUtils';
import { Tooltip } from '../ui/tooltip';

const intentClass: Record<SearchIntent, string> = {
	informational:
		'bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-900/30 dark:text-blue-light-400',
	commercial: 'bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
	transactional: 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-400'
};

const TOOLTIP =
	'Inferred from the primary keyword: informational (learn/know), commercial (compare/review/best), or transactional (buy/hire/pricing).';

type SearchIntentTagProps = {
	keyword: string;
	showTooltip?: boolean;
};

export function SearchIntentTag({ keyword, showTooltip }: SearchIntentTagProps) {
	const intent = detectSearchIntent(keyword);
	const label = searchIntentDisplayLabel(intent);
	const badge = (
		<span
			className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold break-keep whitespace-nowrap ${intentClass[intent]}`}
		>
			{label}
		</span>
	);
	if (showTooltip) {
		return <Tooltip content={TOOLTIP}>{badge}</Tooltip>;
	}
	return badge;
}
