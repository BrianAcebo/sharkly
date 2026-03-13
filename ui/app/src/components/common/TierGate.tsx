/**
 * TierGate — Feature gating by plan tier with zero visual glitch.
 *
 * NEVER renders gated content until access is confirmed. Uses a single render path:
 * - Loading/unknown: show skeleton (same dimensions as page)
 * - No access: show upgrade prompt
 * - Has access: render children
 *
 * This avoids the "flash then hide" pattern that causes visible jumps.
 *
 * Provides TierGateContext so children get organization + tier flags immediately
 * (no secondary loading) to avoid any pop-in of sub-features like Content Refresh Queue.
 */

import React, { createContext, useContext } from 'react';
import { Link } from 'react-router';
import { useOrganization } from '../../hooks/useOrganization';
import { hasPlanAtLeast, hasFinAccess, canAccessTechnical } from '../../utils/featureGating';
import type { OrganizationRow } from '../../types/billing';
import { Skeleton } from '../ui/skeleton';

export type RequiredTier = 'builder' | 'growth' | 'scale';

interface TierGateProps {
	children: React.ReactNode;
	/** Minimum tier required to view this content */
	requiredTier: RequiredTier;
	/** Page title for skeleton/upgrade context */
	pageTitle: string;
	/** When true, also requires Fin add-on (for Assistant page) */
	requireFinAddon?: boolean;
}

const TIER_LABELS: Record<RequiredTier, string> = {
	builder: 'Builder',
	growth: 'Growth',
	scale: 'Scale'
};

/** Provided to gated children — org and tier flags available immediately (no loading) */
export interface TierGateContextValue {
	organization: OrganizationRow;
	hasScale: boolean;
}

export const TierGateContext = createContext<TierGateContextValue | null>(null);

export function useTierGateContext(): TierGateContextValue | null {
	return useContext(TierGateContext);
}

/**
 * Skeleton that mimics page layout — prevents layout shift when switching to content or upgrade prompt.
 * Same structure as typical page: header block + content area.
 */
function TierGateSkeleton({ pageTitle }: { pageTitle: string }) {
	return (
		<div className="space-y-6" data-tier-gate="skeleton">
			{/* Page header skeleton — matches PageHeader dimensions */}
			<div className="relative flex items-center justify-between rounded-lg border border-gray-200 bg-white px-8 py-5 dark:border-gray-700 dark:bg-gray-900">
				<div className="space-y-2">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-64" />
				</div>
			</div>
			{/* Content area skeleton */}
			<div className="space-y-4">
				<Skeleton className="h-32 w-full rounded-lg" />
				<Skeleton className="h-64 w-full rounded-lg" />
			</div>
		</div>
	);
}

/**
 * Upgrade prompt — shown when user's plan doesn't meet required tier.
 */
function TierUpgradePrompt({
	requiredTier,
	pageTitle,
	organization,
	requireFinAddon
}: {
	requiredTier: RequiredTier;
	pageTitle: string;
	organization: OrganizationRow | null;
	requireFinAddon?: boolean;
}) {
	const tierLabel = TIER_LABELS[requiredTier];
	const currentPlan = organization?.plan_code?.replace(/_test$/, '') ?? 'builder';

	return (
		<div
			className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-12 dark:border-gray-700 dark:bg-gray-900"
			data-tier-gate="upgrade"
		>
			<div className="mx-auto max-w-md text-center">
				<div className="mb-6 inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
					{requireFinAddon
						? 'Fin (AI Assistant) requires Growth plan or higher'
						: `${tierLabel} plan or higher required`}
				</div>
				<h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
					{pageTitle}
				</h2>
				<p className="mb-8 text-gray-600 dark:text-gray-400">
					{requireFinAddon
						? 'Fin is included in Growth, Scale, and Pro plans. Upgrade your plan to access the AI Assistant.'
						: `You're currently on the ${currentPlan} plan. Upgrade to ${tierLabel} to access this feature.`}
				</p>
				<Link to="/billing">
					<button
						type="button"
						className="rounded-lg bg-brand-500 px-6 py-3 font-medium text-white transition-colors hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-500"
					>
						View plans
					</button>
				</Link>
			</div>
		</div>
	);
}

/**
 * Check access for the given required tier.
 * When requireFinAddon is true, also requires included_chat_messages_monthly > 0 (Fin AI Assistant).
 */
function checkAccess(
	organization: OrganizationRow | null,
	requiredTier: RequiredTier,
	requireFinAddon?: boolean
): boolean {
	if (!organization) return false;
	if (requireFinAddon) return hasFinAccess(organization);
	return hasPlanAtLeast(organization, requiredTier);
}

/**
 * TierGate — Renders children only when user has the required plan tier.
 * Shows skeleton while loading, upgrade prompt when no access. No content flash.
 */
export function TierGate({ children, requiredTier, pageTitle, requireFinAddon }: TierGateProps) {
	const { organization, loading } = useOrganization();

	// Block until we have a definitive answer. Never render children conditionally after first paint.
	if (loading || !organization) {
		return <TierGateSkeleton pageTitle={pageTitle} />;
	}

	if (!checkAccess(organization, requiredTier, requireFinAddon)) {
		return (
			<TierUpgradePrompt
				requiredTier={requiredTier}
				pageTitle={pageTitle}
				organization={organization}
				requireFinAddon={requireFinAddon}
			/>
		);
	}

	const contextValue: TierGateContextValue = {
		organization,
		hasScale: canAccessTechnical(organization)
	};

	return (
		<TierGateContext.Provider value={contextValue}>
			{children}
		</TierGateContext.Provider>
	);
}
