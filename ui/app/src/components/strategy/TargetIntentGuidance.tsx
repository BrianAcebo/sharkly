import { BookOpen, GitCompare, MapPinned, ShoppingBag } from 'lucide-react';
import type { Target } from '../../types/target';
import {
	getTargetIntentKeyword,
	getTargetPageStrategyGuidance,
	inferIntentFromDestinationContext,
	mergeTargetKeywordIntent,
	searchIntentDisplayLabel,
	type KeywordIntentKind
} from '../../lib/seoUtils';
import { cn } from '../../utils/common';
import { Tooltip } from '../ui/tooltip';

/** Matches SearchIntentTag + navigational for target cards */
const intentPillClass: Record<KeywordIntentKind, string> = {
	informational:
		'bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-900/30 dark:text-blue-light-400',
	commercial: 'bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
	transactional: 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-400',
	navigational: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
};

const panelStyles: Record<KeywordIntentKind, string> = {
	informational:
		'border-blue-light-200 bg-blue-light-50/90 dark:border-blue-light-800/60 dark:bg-blue-light-950/20',
	commercial: 'border-warning-200 bg-warning-50/90 dark:border-warning-800/50 dark:bg-warning-950/20',
	transactional: 'border-success-200 bg-success-50/90 dark:border-success-800/50 dark:bg-success-950/20',
	navigational: 'border-gray-200 bg-gray-50/95 dark:border-gray-600 dark:bg-gray-900/40'
};

const iconWrap: Record<KeywordIntentKind, string> = {
	informational: 'bg-blue-light-100 text-blue-light-700 dark:bg-blue-light-900/40 dark:text-blue-light-300',
	commercial: 'bg-warning-100 text-warning-700 dark:bg-warning-900/40 dark:text-warning-300',
	transactional: 'bg-success-100 text-success-700 dark:bg-success-900/40 dark:text-success-300',
	navigational: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
};

const IntentIcon = ({ intent }: { intent: KeywordIntentKind }) => {
	const cls = 'size-4 shrink-0';
	if (intent === 'transactional') return <ShoppingBag className={cls} />;
	if (intent === 'commercial') return <GitCompare className={cls} />;
	if (intent === 'navigational') return <MapPinned className={cls} />;
	return <BookOpen className={cls} />;
};

function isStoredIntent(t: Target | null | undefined): t is Target & { primarySearchIntent: KeywordIntentKind } {
	return Boolean(t?.primarySearchIntent);
}

type TargetIntentGuidanceProps = {
	/** When set, uses persisted intent from the target row (set on create/update). */
	target?: Target | null;
	name: string;
	seedKeywords: string[];
	destinationPageLabel?: string | null;
	destinationPageUrl?: string | null;
	/** Add/Edit modal — local preview before save */
	previewOnly?: boolean;
	compact?: boolean;
	className?: string;
};

export function TargetIntentGuidance({
	target,
	name,
	seedKeywords,
	destinationPageLabel,
	destinationPageUrl,
	previewOnly,
	compact,
	className = ''
}: TargetIntentGuidanceProps) {
	const phrase = getTargetIntentKeyword(name, seedKeywords);
	const fromDestination = inferIntentFromDestinationContext(
		destinationPageLabel,
		destinationPageUrl
	);

	const resolved = (() => {
		if (isStoredIntent(target)) {
			const kind = target.primarySearchIntent as KeywordIntentKind;
			const sourceLine = 'From your primary phrase and destination page settings';
			return { kind, sourceLine, phraseUsed: target.searchIntentPhrase ?? phrase };
		}
		const kind = mergeTargetKeywordIntent(
			undefined,
			destinationPageLabel,
			destinationPageUrl,
			phrase
		);
		const sourceLine = previewOnly
			? 'Preview — save this target to store guidance'
			: 'Approximate — save or edit this target to refresh guidance';
		return { kind, sourceLine, phraseUsed: phrase };
	})();

	const intent = resolved.kind;
	const g = getTargetPageStrategyGuidance(intent);
	const label = searchIntentDisplayLabel(intent);

	const compactTooltipText = [
		g.headline,
		'',
		g.detail,
		'',
		resolved.sourceLine,
		`Phrase: "${resolved.phraseUsed}"`,
		fromDestination && isStoredIntent(target)
			? 'Destination page label or URL was used to strengthen commerce signals when relevant.'
			: ''
	]
		.filter(Boolean)
		.join('\n');

	if (compact) {
		return (
			<p className={cn('mt-1.5 text-[12px] leading-snug', className)}>
				<Tooltip
					content={compactTooltipText}
					tooltipPosition="bottom"
					usePortal
					className="max-w-[min(340px,calc(100vw-2rem))] text-left"
				>
					<span
						tabIndex={0}
						className={cn(
							'inline-flex cursor-help items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold break-keep whitespace-nowrap',
							intentPillClass[intent]
						)}
					>
						{label} intent
					</span>
				</Tooltip>
				{fromDestination && isStoredIntent(target) ? (
					<span className="ml-1.5 text-[11px] text-gray-500 dark:text-gray-500">
						(destination page)
					</span>
				) : null}
			</p>
		);
	}

	return (
		<div className={cn('rounded-xl border px-4 py-3', panelStyles[intent], className)}>
			<div className="flex gap-3">
				<div
					className={cn(
						'flex size-9 shrink-0 items-center justify-center rounded-lg',
						iconWrap[intent]
					)}
				>
					<IntentIcon intent={intent} />
				</div>
				<div className="min-w-0 flex-1">
					<div className="text-[13px] font-semibold text-gray-900 dark:text-white">{g.headline}</div>
					<p className="mt-1 text-[13px] leading-relaxed text-gray-700 dark:text-gray-300">
						{g.detail}
					</p>
					<p className="mt-2 text-[11px] text-gray-500 dark:text-gray-500">
						<span className="font-medium text-gray-700 dark:text-gray-300">{resolved.sourceLine}</span>
						{' · '}
						Phrase:{' '}
						<span className="font-mono text-gray-700 dark:text-gray-400">{resolved.phraseUsed}</span>
						{' · '}
						<span className="font-medium">{label}</span>
						{fromDestination && isStoredIntent(target) ? (
							<>
								{' · '}
								<span className="text-gray-600 dark:text-gray-400">
									Destination hint applied when it strengthens commerce signals.
								</span>
							</>
						) : null}
					</p>
				</div>
			</div>
		</div>
	);
}
