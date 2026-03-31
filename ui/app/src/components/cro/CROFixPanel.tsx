/**
 * CRO Studio — Generated fixes panel
 * Inline expansion with 2–3 options, placement instruction, copy-to-clipboard.
 * Spec: cro-studio.md — Generated Fixes Panel
 */

import React from 'react';
import { Copy, MapPin, RefreshCw, Wand2 } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { CreditCost } from '../shared/CreditBadge';
import { CREDIT_COSTS } from '../../lib/credits';

export interface FixOption {
	copy: string;
	placement: string;
}

interface CROFixPanelProps {
	/** Generated fix options (empty = show Generate button) */
	options: FixOption[];
	/** Unique key for this item (e.g. "handoff", "arch_0", "3") */
	itemKey: string;
	/** Called when user clicks Generate fix */
	onGenerateFix: (key: string) => void;
	/** True while fix is being generated */
	generating: boolean;
	/** Credit cost to display (default 1) */
	creditCost?: number;
}

function copyToClipboard(text: string) {
	navigator.clipboard.writeText(text).then(
		() => toast.success('Copied to clipboard'),
		() => toast.error('Failed to copy')
	);
}

export function CROFixPanel({
	options,
	itemKey,
	onGenerateFix,
	generating,
	creditCost = CREDIT_COSTS.CRO_STUDIO_SINGLE_FIX
}: CROFixPanelProps) {
	if (options && options.length > 0) {
		return (
			<div className="mt-4 space-y-3">
				<div className="flex flex-wrap items-center gap-2">
					<Button
						size="sm"
						variant="outline"
						onClick={() => onGenerateFix(itemKey)}
						disabled={generating}
						className="h-8 gap-2 text-xs"
					>
						<RefreshCw className={`size-3.5 ${generating ? 'animate-spin' : ''}`} />
						{generating ? 'Generating…' : 'Regenerate fix'}
					</Button>
					<span className="text-xs text-gray-400">
						<CreditCost amount={creditCost} />
					</span>
				</div>
				<p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
					Generated fix
				</p>
				<div className="space-y-3">
					{options.map((opt, i) => (
						<div
							key={i}
							className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800"
						>
							<p className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
								OPTION {i + 1}
							</p>
							<p className="mb-2 text-sm text-gray-700 dark:text-gray-300">{opt.copy}</p>
							<p className="mb-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
								<MapPin className="size-3.5 shrink-0" />
								PLACEMENT: {opt.placement}
							</p>
							<Button
								size="sm"
								variant="outline"
								onClick={() =>
									copyToClipboard(opt.copy + '\n\nPlacement: ' + opt.placement)
								}
							>
								<Copy className="size-4" />
								Copy
							</Button>
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<Button
			size="sm"
			variant="outline"
			className="mt-3 gap-2"
			onClick={() => onGenerateFix(itemKey)}
			disabled={generating}
		>
			<Wand2 className={`size-4 ${generating ? 'animate-pulse' : ''}`} />
			Generate fix — <CreditCost amount={creditCost} />
		</Button>
	);
}
