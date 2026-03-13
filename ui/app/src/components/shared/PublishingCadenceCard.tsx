/**
 * S2-16: Publishing Cadence Guidance (O3)
 * Shows recommended cadence by growth stage and whether user is hitting it.
 * Surfaces in Weekly Priority Stack area on Dashboard.
 */

import { CheckCircle2, Clock } from 'lucide-react';
import { LawTooltip } from './LawTooltip';
import type { PublishingCadence } from '../../hooks/useWeeklyPriorityStack';

type Props = {
	cadence: PublishingCadence | null;
};

export function PublishingCadenceCard({ cadence }: Props) {
	if (!cadence) return null;

	return (
		<div
			className={`rounded-lg border px-3 py-2.5 ${
				cadence.onTrack
					? 'border-green-500/20 bg-green-500/5 dark:border-green-500/10 dark:bg-green-500/5'
					: 'border-amber-500/20 bg-amber-500/5 dark:border-amber-500/10 dark:bg-amber-500/5'
			}`}
		>
			<div className="flex items-center justify-between gap-2">
				<div className="min-w-0">
					<p className="text-[11px] font-semibold tracking-wide text-gray-500 dark:text-gray-400">
						<span className="inline-flex items-center gap-1">
							Publishing cadence · Stage {cadence.stage} ({cadence.stageLabel})
							<LawTooltip lawId="trust_takes_time" />
						</span>
					</p>
					<p className="mt-0.5 text-[13px] font-medium text-gray-900 dark:text-white">
						Aim for {cadence.recommendedMin}–{cadence.recommendedMax} pieces/month · This month:{' '}
						{cadence.publishedThisMonth}
					</p>
				</div>
				{cadence.onTrack ? (
					<CheckCircle2 className="size-5 shrink-0 text-green-500" />
				) : (
					<Clock className="size-5 shrink-0 text-amber-500" />
				)}
			</div>
			{!cadence.onTrack && (
				<p className="mt-1.5 text-xs text-amber-700 dark:text-amber-300">{cadence.message}</p>
			)}
		</div>
	);
}
