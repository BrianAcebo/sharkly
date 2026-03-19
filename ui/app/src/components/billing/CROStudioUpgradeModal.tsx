/**
 * CRO Studio Upgrade Modal
 * Shown when user clicks the locked CRO Studio nav item or tries to access CRO Studio without the add-on.
 * Per cro-studio.md: "Unlock CRO Studio" routes to the upgrade flow.
 */

import React from 'react';
import { Link } from 'react-router';
import { Target, Lock } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription
} from '../ui/dialog';
import { Button } from '../ui/button';

interface CROStudioUpgradeModalProps {
	open: boolean;
	onClose: () => void;
}

const CRO_FEATURES = [
	'Full conversion audit — 5 dimensions',
	'Exact copy fixes with placement instructions',
	'Psychological triggers audit',
	'Objection removal audit',
	'Dedicated workspace for destination pages',
	'Funnel visualizer — destination card unlocked'
];

export function CROStudioUpgradeModal({ open, onClose }: CROStudioUpgradeModalProps) {
	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
			<DialogContent className="max-w-md border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
				<DialogHeader>
					<div className="flex items-center gap-2">
						<div className="flex size-10 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/30">
							<Target className="size-5 text-brand-600 dark:text-brand-400" />
						</div>
						<div>
							<DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
								Unlock CRO Studio
							</DialogTitle>
							<DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
								Add-on for any plan — $29/month
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="space-y-4">
					<p className="text-sm text-gray-600 dark:text-gray-300">
						CRO Studio is your dedicated workspace for conversion-focused destination pages — signup, checkout,
						service, and booking pages. It tells you what's stopping traffic from converting and gives you the
						exact copy to fix it.
					</p>

					<div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
						<p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
							Included in CRO Add-on
						</p>
						<ul className="space-y-2">
							{CRO_FEATURES.map((feature, i) => (
								<li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
									<span className="mt-0.5 text-brand-500">•</span>
									<span>{feature}</span>
								</li>
							))}
						</ul>
					</div>

					<div className="flex flex-col gap-2 pt-2">
						<Link to="/settings/billing" onClick={onClose}>
							<Button className="w-full" size="lg">
								View plans & add CRO Studio
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
