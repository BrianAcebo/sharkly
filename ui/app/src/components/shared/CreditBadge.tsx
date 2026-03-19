import React from 'react';
import { Coins } from 'lucide-react';

/** Inline display of credit cost: Coins icon + amount. Use in buttons/labels. */
export function CreditCost({ amount, className }: { amount: number; className?: string }) {
	return (
		<span className={className ?? 'inline-flex items-center gap-1 text-current'}>
			{amount}
			<Coins className="size-3.5 shrink-0" />
		</span>
	);
}

interface CreditBadgeProps {
	cost: number;
	action: string;
	sufficient?: boolean;
}

export function CreditBadge({ cost, action, sufficient = true }: CreditBadgeProps) {
	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
				sufficient ? 'bg-brand-50 text-brand-600' : 'bg-error-50 text-error-600'
			}`}
		>
			<Coins className="size-3 shrink-0" />
			{cost}
		</span>
	);
}
