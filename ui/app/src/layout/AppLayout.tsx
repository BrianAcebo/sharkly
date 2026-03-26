import React, { useState } from 'react';
import AppHeader from '../components/header/AppHeader';
import AppSidebar from '../components/header/AppSidebar';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { getMarketingUrl } from '../utils/urls';
import { useSidebar } from '../hooks/useSidebar';
import { BreadcrumbsProvider } from '../providers/BreadcrumbsProvider';
import { SidebarProvider } from '../providers/SidebarProvider';
import { useAuth } from '../hooks/useAuth';
import { AuthLoadingState } from '../contexts/AuthContext';
import { AuthLoading } from '../components/AuthLoading';
import { useScreenSize } from '../hooks/useScreenSize';
import ScreenSizeWarning from '../components/common/ScreenSizeWarning';
import { useNotifications } from '../hooks/useNotifications';
import { useTrial } from '../hooks/useTrial';
import { useOrganizationStatus } from '../hooks/useOrganizationStatus';
import { isOrganizationBehindOnPayments } from '../utils/paymentStatus';
import ReadOnlyMode from '../components/common/ReadOnlyMode';
import { useOrganization } from '../hooks/useOrganization';
import { CreditsLowBanner } from '../components/billing/CreditsLowBanner';
import { OrganizationRow } from '../types/billing';
import Backdrop from './Backdrop';
import ChatWidget from '../components/chat/ChatWidget';
import { ChatProvider } from '../contexts/ChatContext';
import { SiteProvider, useSiteContext } from '../contexts/SiteContext';
import { CROStudioUpgradeProvider } from '../contexts/CROStudioUpgradeContext';
import { TierUpgradeProvider } from '../contexts/TierUpgradeContext';

/** When true, blocks the first-site wizard at `/site-setup`. */
const SITE_SETUP_PAUSED = false;

const PATHS_ALLOWED_WITHOUT_ORGAN = [
	'/organization-required',
	'/billing-onboarding',
	'/onboarding'
] as const;

function isSiteSetupExemptPath(pathname: string): boolean {
	if (
		pathname === '/site-setup' ||
		pathname === '/onboarding' ||
		pathname === '/organization-required' ||
		pathname === '/billing-onboarding'
	) {
		return true;
	}
	if (pathname.startsWith('/settings')) {
		return true;
	}
	return false;
}

const LayoutContent: React.FC = () => {
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const { isExpanded, isMobileOpen } = useSidebar();
	const { user, loadingState, session } = useAuth();
	const { sites, loading: sitesLoading } = useSiteContext();
	const trialInfo = useTrial();
	const { organization: currentOrg, loading: orgLoading } = useOrganization();
	const { isPaused, isDisabled, status: orgStatus } = useOrganizationStatus();
	/** Until status loads, allow onboarding redirect; after load, only when subscription is in good standing */
	const orgAllowsSiteSetup = orgStatus === null || orgStatus === 'active';

	const [hasCheckedOrg, setHasCheckedOrg] = useState(false);
	const { isScreenTooSmall } = useScreenSize();

	// Initialize notifications system
	useNotifications(session?.user?.id);

	// Show loading while auth is being checked
	if (loadingState === AuthLoadingState.LOADING) {
		return <AuthLoading state={AuthLoadingState.LOADING} />;
	}

	// Show loading while user profile is being loaded (prevents race condition)
	if (session && !user?.id) {
		return <AuthLoading state={AuthLoadingState.LOADING} />;
	}

	// Simple redirects without state — send unauthenticated users directly to marketing home
	if (!session || !user?.id) {
		window.location.href = getMarketingUrl();
		return null;
	}

	const hasOrganization = Boolean(user?.organization_id);
	// Check if Stripe subscription is incomplete (payment required)
	const isStripeIncomplete =
		currentOrg?.stripe_status === 'incomplete' ||
		currentOrg?.stripe_status === 'incomplete_expired';
	// Check if Stripe subscription is canceled or expired (need new subscription)
	const isStripeExpired =
		currentOrg?.stripe_status === 'canceled' || currentOrg?.stripe_status === 'incomplete_expired';

	// 1) Profile onboarding (name + avatar) — `profiles.completed_onboarding`
	if (user && !user.completed_onboarding && pathname !== '/onboarding') {
		return <Navigate to="/onboarding" replace />;
	}

	if (SITE_SETUP_PAUSED && pathname === '/site-setup') {
		return <Navigate to="/organization-required" replace />;
	}

	const allowedWithoutOrg = PATHS_ALLOWED_WITHOUT_ORGAN.some((p) => pathname === p || pathname.startsWith(`${p}/`));

	// Organization gate — runs for all signed-in users (org membership loaded in AuthProvider)
	if (!hasOrganization) {
		if (!hasCheckedOrg) {
			setTimeout(() => setHasCheckedOrg(true), 100);
			return <AuthLoading state={AuthLoadingState.LOADING} />;
		}
		if (!allowedWithoutOrg) {
			return <Navigate to="/organization-required" replace />;
		}
	}

	// 2) Finished org billing but still on org page — profile → first site → dashboard
	if (
		pathname === '/organization-required' &&
		hasOrganization &&
		!isStripeIncomplete &&
		!isStripeExpired
	) {
		if (!user?.completed_onboarding) {
			return <Navigate to="/onboarding" replace />;
		}
		if (sitesLoading) {
			return <AuthLoading state={AuthLoadingState.LOADING} />;
		}
		if (sites.length === 0) {
			return <Navigate to="/site-setup" replace />;
		}
		return <Navigate to="/dashboard" replace />;
	}

	// Profile page only makes sense without an org billing block; with org + bad stripe, send to billing
	if (
		pathname === '/onboarding' &&
		hasOrganization &&
		(isStripeIncomplete || isStripeExpired)
	) {
		return <Navigate to="/organization-required" replace />;
	}

	// First-site wizard only when subscription is usable
	if (
		pathname === '/site-setup' &&
		hasOrganization &&
		(isStripeIncomplete || isStripeExpired)
	) {
		return <Navigate to="/organization-required" replace />;
	}

	// Already have sites — skip first-site wizard
	if (
		pathname === '/site-setup' &&
		hasOrganization &&
		!sitesLoading &&
		sites.length > 0
	) {
		return <Navigate to="/dashboard" replace />;
	}

	// Wait for site list before rendering app routes that depend on it (avoids flash before `/site-setup` redirect)
	if (
		hasOrganization &&
		user?.completed_onboarding &&
		sitesLoading &&
		!isStripeIncomplete &&
		!isStripeExpired &&
		orgAllowsSiteSetup
	) {
		const waitExempt =
			pathname === '/site-setup' ||
			pathname === '/onboarding' ||
			pathname === '/organization-required' ||
			pathname === '/billing-onboarding' ||
			pathname.startsWith('/settings');
		if (!waitExempt) {
			return <AuthLoading state={AuthLoadingState.LOADING} />;
		}
	}

	// 3) Org has no sites — require `/site-setup` (unless exempt e.g. settings)
	const needsFirstSite =
		hasOrganization &&
		Boolean(user?.completed_onboarding) &&
		!sitesLoading &&
		sites.length === 0 &&
		!isStripeIncomplete &&
		!isStripeExpired &&
		orgAllowsSiteSetup;

	if (needsFirstSite && !isSiteSetupExemptPath(pathname)) {
		return <Navigate to="/site-setup" replace />;
	}

	// Show screen size warning if screen is too small
	if (isScreenTooSmall) {
		return <ScreenSizeWarning />;
	}

	const organizationForBilling = (currentOrg || trialInfo.organization) as OrganizationRow | null;
	const stripeStatus = organizationForBilling?.stripe_status;
	const hasStripeStatus = typeof stripeStatus === 'string';
	const shouldRequireStripeStatus = Boolean(hasOrganization);

	if (shouldRequireStripeStatus && !hasStripeStatus) {
		return <AuthLoading state={AuthLoadingState.LOADING} />;
	}

	let shouldShowReadOnly = false;
	let reason: 'paused' | 'disabled' | 'trial_expired' | 'payment_required' | 'past_due' = 'paused';
	let paymentFailureReason: string | undefined;

	// Active org — no gate ever
	if (orgStatus === 'active') {
		shouldShowReadOnly = false;
	} else if (stripeStatus === 'canceled' || stripeStatus === 'incomplete_expired') {
		// Subscription is DEAD — needs a brand-new subscription, not a payment update.
		// Check this BEFORE isOrganizationBehindOnPayments because a canceled/expired
		// subscription may still have payment_action_required=true from a prior failure,
		// which would otherwise show the wrong "Update payment method" UI.
		shouldShowReadOnly = true;
		reason = 'trial_expired';
	} else if (isOrganizationBehindOnPayments(organizationForBilling)) {
		// Subscription exists but payment has a problem (past_due, card declined, etc.)
		shouldShowReadOnly = true;
		if (orgStatus === 'payment_required') {
			reason = 'payment_required';
		} else if (orgStatus === 'past_due') {
			reason = 'past_due';
		}
		paymentFailureReason = organizationForBilling?.payment_failure_reason || undefined;
	} else if (isPaused) {
		shouldShowReadOnly = true;
		reason = 'paused';
	} else if (isDisabled) {
		shouldShowReadOnly = true;
		reason = 'disabled';
	}

	if (shouldShowReadOnly) {
		return (
			<ReadOnlyMode
				isReadOnly={true}
				reason={reason}
				onResume={undefined}
				showResumeButton={false}
				paymentFailureReason={paymentFailureReason}
				userRole={user?.role}
				userId={user?.id}
				organization={organizationForBilling}
				onStartNewSubscription={() => navigate('/billing')}
				className="h-screen"
			>
				<div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
					<div className="text-center">
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
							{reason === 'trial_expired' ? 'Subscription Canceled' : 'Organization Paused'}
						</h1>
						<p className="text-gray-600 dark:text-gray-400">
							{reason === 'trial_expired'
								? 'Please renew to regain access.'
								: 'This content is in read-only mode'}
						</p>
					</div>
				</div>
			</ReadOnlyMode>
		);
	}

	return (
		<>
			<div className="min-h-screen">
				<div>
					<AppSidebar organization={organizationForBilling} organizationLoading={orgLoading} />
					<Backdrop />
				</div>
				<div
					className={`flex-1 transition-all duration-300 ease-in-out ${isExpanded ? 'lg:ml-55' : 'lg:ml-22'} ${isMobileOpen ? 'ml-0' : ''}`}
				>
					<AppHeader />

					<div className="w-full">
						<main className="bg-accent-foreground-dark min-h-screen-height-visible h-full w-full p-6 dark:bg-gray-800">
							<div className="mx-auto h-full w-full max-w-(--breakpoint-2xl)">
								<CreditsLowBanner organization={currentOrg} loading={orgLoading} className="mb-6" />
								<Outlet />
							</div>
						</main>
					</div>
				</div>
			</div>
		</>
	);
};

const AppLayout: React.FC = () => {
	return (
		<SidebarProvider>
			<BreadcrumbsProvider>
				<SiteProvider>
					<CROStudioUpgradeProvider>
						<TierUpgradeProvider>
							<ChatProvider>
								<LayoutContent />
								<ChatWidget />
							</ChatProvider>
						</TierUpgradeProvider>
					</CROStudioUpgradeProvider>
				</SiteProvider>
			</BreadcrumbsProvider>
		</SidebarProvider>
	);
};

export default AppLayout;
