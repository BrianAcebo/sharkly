import React from 'react';
import { Sparkles } from 'lucide-react';

type Variant = 'strategy' | 'analyst' | 'success' | 'warning' | 'info';

const variantStyles: Record<Variant, { bg: string; border: string; label: string; icon: string }> =
	{
		strategy: {
			bg: 'bg-brand-50 dark:bg-brand-900/30',
			border: 'border-l-theme-purple-500',
			label: 'text-theme-purple-500 dark:text-theme-purple-400',
			icon: 'text-theme-purple-500'
		},
		analyst: {
			bg: 'bg-brand-50 dark:bg-brand-900/30',
			border: 'border-l-brand-500',
			label: 'text-brand-600 dark:text-brand-400',
			icon: 'text-brand-600 dark:text-brand-400'
		},
		success: {
			bg: 'bg-success-50 dark:bg-success-900/20',
			border: 'border-l-success-600 dark:border-l-success-500',
			label: 'text-success-600 dark:text-success-400',
			icon: 'text-success-600 dark:text-success-400'
		},
		warning: {
			bg: 'bg-warning-50 dark:bg-warning-900/20',
			border: 'border-l-warning-600 dark:border-l-warning-500',
			label: 'text-warning-600 dark:text-warning-400',
			icon: 'text-warning-600 dark:text-warning-400'
		},
		info: {
			bg: 'bg-blue-light-50 dark:bg-blue-light-900/20',
			border: 'border-l-blue-light-600 dark:border-l-blue-light-500',
			label: 'text-blue-light-600 dark:text-blue-light-400',
			icon: 'text-blue-light-600 dark:text-blue-light-400'
		}
	};

interface AIInsightBlockProps {
	message: string | React.ReactNode;
	variant?: Variant;
	label?: string;
	compact?: boolean;
}

export function AIInsightBlock({
	message,
	variant = 'analyst',
	label,
	compact
}: AIInsightBlockProps) {
	const styles = variantStyles[variant];
	return (
		<div
			className={`flex gap-3 rounded-r-lg border-l-4 p-4 ${styles.bg} ${styles.border} ${
				compact ? 'px-3 py-2 text-xs' : ''
			}`}
		>
			<Sparkles className={`size-5 shrink-0 ${styles.icon}`} />
			<div>
				{label && (
					<div className={`text-[11px] font-bold tracking-wide uppercase ${styles.label}`}>
						{label}
					</div>
				)}
				<p
					className={`mt-0.5 leading-relaxed text-gray-900 dark:text-white ${compact ? 'text-xs' : 'text-sm'}`}
				>
					{typeof message === 'string' ? message : <React.Fragment>{message}</React.Fragment>}
				</p>
			</div>
		</div>
	);
}
