/**
 * V1 — Section 12.2 + 17.8
 * Shows current SEO growth stage (1–4) and what unlocks the next.
 * Decision tree from detectGrowthStage(project, domainAuthorityHistory, gscData).
 */
import React from 'react';
import { TrendingUp } from 'lucide-react';

export type GrowthStage = {
	phase: 1 | 2 | 3 | 4;
	label: string;
	description: string;
	nextUnlock: string | null;
};

type Props = {
	stage: GrowthStage;
};

export function SEOGrowthStagePanel({ stage }: Props) {
	return (
		<div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
			<div className="flex items-center gap-2 text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
				<TrendingUp className="size-3.5" />
				SEO Growth Stage
			</div>
			<p className="mt-2 text-[15px] font-semibold text-gray-900 dark:text-white">
				You&apos;re in Stage {stage.phase} of 4. {stage.label}
			</p>
			<p className="mt-1 text-[13px] text-gray-600 dark:text-gray-400">{stage.description}</p>
			{stage.nextUnlock && (
				<p className="mt-2 text-[12px] text-brand-600 dark:text-brand-400">
					Next: {stage.nextUnlock}
				</p>
			)}
		</div>
	);
}

/**
 * Simplified stage detection when DA history / GSC not yet available.
 * Uses project DA only; pass 0 or undefined for "new domain".
 */
export function getDefaultGrowthStage(domainAuthority: number | undefined): GrowthStage {
	const da = domainAuthority ?? 0;
	if (da >= 30) {
		return {
			phase: 4,
			label: 'Stage 4 — Full Authority',
			description: "Your site has a proven track record. Head-term keywords are now realistic.",
			nextUnlock: null
		};
	}
	if (da >= 10) {
		return {
			phase: 2,
			label: 'Stage 2 — Trust Building',
			description: 'Brand search signals are forming — this phase rewards consistent publishing.',
			nextUnlock: 'Earn 5+ new referring domains per month for 3 consecutive months.'
		};
	}
	return {
		phase: 1,
		label: 'Stage 1 — Getting Started',
		description: 'Focus on low-competition keywords under 500 searches/month.',
		nextUnlock: "Publish consistently and get your first few links from other websites."
	};
}
