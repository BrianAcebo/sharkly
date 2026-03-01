import React from 'react';
import { Zap } from 'lucide-react';

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
			<Zap className="size-3" />
			{cost} credits
		</span>
	);
}
