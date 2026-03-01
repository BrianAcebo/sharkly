import React from 'react';

type Stage = 'tofu' | 'mofu' | 'bofu' | 'money';

const stageStyles: Record<Stage, string> = {
	tofu: 'bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-900/30 dark:text-blue-light-400',
	mofu: 'bg-warning-50 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400',
	bofu: 'bg-success-50 text-success-600 dark:bg-success-900/30 dark:text-success-400',
	money: 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
};

interface FunnelTagProps {
	stage: Stage;
	prefix?: string;
}

export function FunnelTag({ stage, prefix }: FunnelTagProps) {
	const label = stage === 'money' ? 'Focus Page' : stage === 'tofu' ? 'ToFu' : stage === 'mofu' ? 'MoFu' : 'BoFu';
	return (
		<span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${stageStyles[stage]}`}>
			{prefix}
			{prefix ? ' ' : ''}
			{label}
		</span>
	);
}
