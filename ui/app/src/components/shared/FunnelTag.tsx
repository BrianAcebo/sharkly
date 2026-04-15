import React from 'react';
import { Tooltip } from '../ui/tooltip';

type Stage = 'tofu' | 'mofu' | 'bofu' | 'money';

const stageConfig: Record<
	Stage,
	{ label: string; shortLabel: string; plainLabel: string; description: string; className: string }
> = {
	tofu: {
		label: 'ToFu',
		shortLabel: 'ToFu',
		plainLabel: 'New Visitors',
		description:
			'Top of funnel — awareness and discovery. (This is funnel stage, not the same as “informational search intent” in SEO.)',
		className:
			'bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-900/30 dark:text-blue-light-400'
	},
	mofu: {
		label: 'MoFu',
		shortLabel: 'MoFu',
		plainLabel: 'Interested',
		description:
			'Middle of funnel — consideration and deeper research. Not the same label as “commercial search intent” (comparison/buyer keywords).',
		className: 'bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400'
	},
	bofu: {
		label: 'BoFu',
		shortLabel: 'BoFu',
		plainLabel: 'Ready to Buy',
		description:
			'Bottom of funnel — high purchase intent. (Funnel stage ≠ transactional keyword intent alone.)',
		className: 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-400'
	},
	money: {
		label: 'Focus Page',
		shortLabel: 'Focus',
		plainLabel: 'Focus Page',
		description: 'Main hub page — targets the primary keyword for this topic',
		className: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400'
	}
};

interface FunnelTagProps {
	stage: Stage;
	prefix?: string;
	/** When true, show abbreviated label (for tight spaces) */
	compact?: boolean;
	/** When true, wrap in a tooltip showing SEO intent + plain-English explanation */
	showTooltip?: boolean;
	/** When true, show plain-English label (e.g. "New Visitors") instead of SEO label */
	plain?: boolean;
}

export function FunnelTag({ stage, prefix, compact, showTooltip, plain }: FunnelTagProps) {
	const config = stageConfig[stage] ?? stageConfig.tofu;
	const label = plain ? config.plainLabel : compact ? config.shortLabel : config.label;

	const badge = (
		<span
			className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold break-keep whitespace-nowrap ${config.className}`}
		>
			{prefix}
			{prefix ? ' ' : ''}
			{label}
		</span>
	);

	if (showTooltip) {
		return <Tooltip content={config.description}>{badge}</Tooltip>;
	}
	return badge;
}
