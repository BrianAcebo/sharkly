import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

type DeltaDirection = 'up' | 'down' | 'neutral';

interface StatCardProps {
	label: string;
	value: string | number;
	delta?: string;
	deltaDirection?: DeltaDirection;
	icon?: React.ReactNode;
}

export function StatCard({ label, value, delta, deltaDirection = 'neutral', icon }: StatCardProps) {
	const deltaColors: Record<DeltaDirection, string> = {
		up: 'text-success-600 dark:text-success-400',
		down: 'text-error-600 dark:text-error-400',
		neutral: 'text-gray-600 dark:text-gray-400'
	};
	const DeltaIcon =
		deltaDirection === 'up' ? ArrowUp : deltaDirection === 'down' ? ArrowDown : Minus;

	return (
		<div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
			<div className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
				{label}
			</div>
			<div className="mt-1 flex items-center gap-2">
				{icon}
				<span className="font-montserrat text-[28px] font-extrabold text-gray-900 dark:text-white">
					{value}
				</span>
			</div>
			{delta && (
				<div className={`mt-1 flex items-center gap-1 text-xs ${deltaColors[deltaDirection]}`}>
					<DeltaIcon className="size-3" />
					{delta}
				</div>
			)}
		</div>
	);
}
