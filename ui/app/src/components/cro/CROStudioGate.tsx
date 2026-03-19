/**
 * CRO Studio gate — Zero visual glitch, same pattern as TierGate.
 *
 * Block until organization/addon status is known. Never show locked until we're sure.
 * - Loading/unknown: show skeleton (avoids locked→unlocked twitch)
 * - No access: show upgrade prompt
 * - Has access: render children
 */

import React from 'react';
import { Target, Lock } from 'lucide-react';
import { Link } from 'react-router';
import { useOrganization } from '../../hooks/useOrganization';
import { canAccessCROStudio } from '../../utils/featureGating';
import { useCROStudioUpgrade } from '../../contexts/CROStudioUpgradeContext';
import { Skeleton } from '../ui/skeleton';

function CROStudioSkeleton() {
	return (
		<div className="mx-auto max-w-4xl px-4 py-8 space-y-6" data-cro-gate="skeleton">
			<div className="flex items-center justify-between">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-10 w-24" />
			</div>
			<div className="space-y-4">
				<Skeleton className="h-24 w-full rounded-xl" />
				<Skeleton className="h-24 w-full rounded-xl" />
				<Skeleton className="h-24 w-full rounded-xl" />
			</div>
		</div>
	);
}

function CROStudioLockedGate({ variant = 'main' }: { variant?: 'main' | 'audit' }) {
	const { openCROStudioUpgradeModal } = useCROStudioUpgrade();
	return (
		<div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
			<div className="max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
				<div className="relative mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
					<Target className="size-8 text-gray-500 dark:text-gray-400" />
					<Lock className="absolute bottom-0 right-0 size-5 text-gray-400" />
				</div>
				<h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">CRO Studio</h2>
				<p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
					{variant === 'audit'
						? 'Add CRO Studio ($29/mo) to view audit details.'
						: 'Unlock live page audits for SEO pages and destination pages. Get exact copy fixes and placement instructions to improve conversions.'}
				</p>
				<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
					<button
						type="button"
						onClick={openCROStudioUpgradeModal}
						className="rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-700"
					>
						{variant === 'audit' ? 'Add CRO Studio' : 'View plans & add CRO Studio'}
					</button>
					{variant === 'main' && (
						<Link
							to="/settings/billing"
							className="rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
						>
							Go to Billing
						</Link>
					)}
				</div>
			</div>
		</div>
	);
}

interface CROStudioGateProps {
	children: React.ReactNode;
	/** 'audit' = shorter locked message for audit detail page */
	variant?: 'main' | 'audit';
}

export function CROStudioGate({ children, variant = 'main' }: CROStudioGateProps) {
	const { organization, loading } = useOrganization();

	if (loading || !organization) {
		return <CROStudioSkeleton />;
	}

	if (!canAccessCROStudio(organization)) {
		return <CROStudioLockedGate variant={variant} />;
	}

	return <>{children}</>;
}
