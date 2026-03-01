/**
 * Shown when we cannot accurately score a page because there's no content brief
 * (no entity/LSI/PAA data from search). Avoids showing a misleading score.
 * Encourages generating a brief first; editing after generation is supported.
 */
import React from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { CreditBadge } from './CreditBadge';
import { CREDIT_COSTS } from '../../lib/credits';

type Props = {
	/** Compact: for header or sidebar. Full: for main content / SEO tab. */
	variant?: 'compact' | 'full';
	/** Focus pages can generate a brief; article pages cannot (show message only). */
	canGenerateBrief?: boolean;
	/** Credits remaining — enable/disable Generate button */
	hasCreditsForBrief?: boolean;
	/** Cost to show on button */
	briefCost?: number;
	onGenerateBrief?: () => void;
	/** If true, show loading state on button */
	generating?: boolean;
};

export function ScoreUnavailableNotice({
	variant = 'full',
	canGenerateBrief = false,
	hasCreditsForBrief = false,
	briefCost = CREDIT_COSTS.MONEY_PAGE_BRIEF,
	onGenerateBrief,
	generating = false
}: Props) {
	const message =
		"We can't accurately assess this page without a content brief. Our score relies on key concepts, related topics, and question coverage from search results — without that data, a score would be misleading and could steer your content the wrong way.";

	const cta = (
		<p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
			Generate a brief to unlock full SEO scoring (0–115) and actionable recommendations. You can edit everything after it’s generated.
		</p>
	);

	if (variant === 'compact') {
		return (
			<div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-900/20">
				<AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
				<div className="min-w-0 flex-1">
					<p className="text-[12px] font-medium text-amber-800 dark:text-amber-200">
						Score unavailable — generate a brief for accurate assessment
					</p>
					{canGenerateBrief && onGenerateBrief && (
						<Button
							size="sm"
							className="bg-brand-500 hover:bg-brand-600 mt-1.5 text-white"
							disabled={generating || !hasCreditsForBrief}
							onClick={onGenerateBrief}
						>
							<CreditBadge cost={briefCost} action="Brief" sufficient={hasCreditsForBrief} />
							<Sparkles className="ml-1.5 size-3.5" />
							<span className="ml-1.5">Generate Brief</span>
						</Button>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-900/20">
			<div className="flex gap-3">
				<AlertCircle className="size-6 shrink-0 text-amber-600 dark:text-amber-400" />
				<div className="min-w-0 flex-1">
					<h3 className="text-[13px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
						Score unavailable
					</h3>
					<p className="mt-1 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
						{message}
					</p>
					{cta}
					{canGenerateBrief && onGenerateBrief && (
						<Button
							className="bg-brand-500 hover:bg-brand-600 mt-4 text-white"
							disabled={generating || !hasCreditsForBrief}
							onClick={onGenerateBrief}
						>
							<CreditBadge cost={briefCost} action="Brief" sufficient={hasCreditsForBrief} />
							<Sparkles className="ml-2 size-4" />
							<span className="ml-2">{generating ? 'Generating…' : 'Generate Brief'}</span>
						</Button>
					)}
					{!canGenerateBrief && (
						<p className="mt-3 text-[13px] text-amber-700 dark:text-amber-300">
							This is an article page. Generate a brief on your cluster’s focus page to unlock scoring for content created from that brief.
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
