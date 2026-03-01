/**
 * V1 — Section 12.2
 * Full-screen overlay for AI generation. Step list with active step (pulsing teal dot),
 * completed steps (green checkmark). Never use a plain spinner for AI generation.
 */
import React from 'react';
import { Check } from 'lucide-react';

export type Step = {
	id: string;
	label: string;
	status: 'pending' | 'active' | 'complete';
};

type Props = {
	steps: Step[];
	title?: string;
};

export function LoadingStepsModal({ steps, title = 'Working on it...' }: Props) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
				<h3 className="font-montserrat text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
				<ul className="mt-4 space-y-3">
					{steps.map((step) => (
						<li
							key={step.id}
							className="flex items-center gap-3 text-[13px] text-gray-700 dark:text-gray-300"
						>
							{step.status === 'complete' ? (
								<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success-500 text-white">
									<Check className="size-3.5" />
								</span>
							) : step.status === 'active' ? (
								<span className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-brand-500 bg-brand-50 dark:bg-brand-900/30">
									<span className="size-2 animate-pulse rounded-full bg-brand-500" />
								</span>
							) : (
								<span className="size-6 shrink-0 rounded-full border-2 border-gray-300 dark:border-gray-600" />
							)}
							<span
								className={
									step.status === 'active'
										? 'font-semibold text-gray-900 dark:text-white'
										: step.status === 'complete'
											? 'text-gray-500 dark:text-gray-400'
											: ''
								}
							>
								{step.label}
							</span>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
