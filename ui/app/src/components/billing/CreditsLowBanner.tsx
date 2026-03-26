import { Link } from 'react-router';
import { Coins } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import type { OrganizationRow } from '../../types/billing';
import { cn } from '../../utils/common';

export interface CreditsLowBannerProps {
	organization: OrganizationRow | null;
	/** When true, banner is hidden — avoids flash from placeholder 0 / 1 math before org loads */
	loading: boolean;
	/** Show when remaining / monthly allocation is strictly below this (default 20%) */
	lowThreshold?: number;
	className?: string;
}

/**
 * Warns when included credits are low vs this period’s allocation.
 * Does not render while org/subscription is still loading or when the allocation cannot be determined.
 */
export function CreditsLowBanner({
	organization,
	loading,
	lowThreshold = 0.2,
	className = ''
}: CreditsLowBannerProps) {
	if (loading || !organization) {
		return null;
	}

	const monthly = organization.included_credits_monthly ?? organization.included_credits;
	if (monthly == null || monthly <= 0) {
		return null;
	}

	const remaining =
		organization.included_credits_remaining ?? organization.included_credits ?? 0;
	if (remaining / monthly >= lowThreshold) {
		return null;
	}

	return (
		<Card
			className={cn(
				'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20',
				className
			)}
		>
			<CardContent className="p-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-start gap-3 sm:items-center">
						<Coins className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400 sm:mt-0" />
						<div>
							<h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
								Running low on credits
							</h3>
							<p className="text-sm text-amber-800 dark:text-amber-200">
								You have {remaining} credit{remaining === 1 ? '' : 's'} left of {monthly} this period.
								Add more in Billing to keep generating content.
							</p>
						</div>
					</div>
					<Link to="/settings/billing" className="shrink-0">
						<Button size="sm" className="bg-brand-500 text-white hover:bg-brand-600">
							Billing
						</Button>
					</Link>
				</div>
			</CardContent>
		</Card>
	);
}

export default CreditsLowBanner;
