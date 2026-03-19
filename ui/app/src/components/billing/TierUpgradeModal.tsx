/**
 * Tier Upgrade Modal
 * Shown when user clicks a tier-gated sidebar item (Performance, Rankings, Site Audit).
 * Mirrors CRO addon modal UX — modal with upgrade CTA that routes to /settings/billing.
 */

import React from 'react';
import { Link } from 'react-router';
import { BarChart2, TrendingUp, Wrench } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription
} from '../ui/dialog';
import { Button } from '../ui/button';

export type RequiredTier = 'growth' | 'scale';

interface TierUpgradeModalProps {
	open: boolean;
	onClose: () => void;
	requiredTier: RequiredTier;
	featureLabel: string;
}

const TIER_CONFIG: Record<RequiredTier, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
	growth: { label: 'Growth', icon: BarChart2 },
	scale: { label: 'Scale', icon: Wrench }
};

export function TierUpgradeModal({ open, onClose, requiredTier, featureLabel }: TierUpgradeModalProps) {
	const config = TIER_CONFIG[requiredTier];
	const Icon = config.icon;

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
			<DialogContent className="max-w-md border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
				<DialogHeader>
					<div className="flex items-center gap-2">
						<div className="flex size-10 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/30">
							<Icon className="size-5 text-brand-600 dark:text-brand-400" />
						</div>
						<div>
							<DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
								Unlock {featureLabel}
							</DialogTitle>
							<DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
								{config.label} plan or higher required
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="space-y-4">
					<p className="text-sm text-gray-600 dark:text-gray-300">
						Upgrade to the {config.label} plan to access {featureLabel}. View your plan options and upgrade in
						Settings → Billing.
					</p>

					<div className="flex flex-col gap-2 pt-2">
						<Link to="/settings/billing" onClick={onClose}>
							<Button className="w-full" size="lg">
								View plans & upgrade
							</Button>
						</Link>
						<Button variant="ghost" size="sm" onClick={onClose} className="w-full text-gray-500">
							Maybe later
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
