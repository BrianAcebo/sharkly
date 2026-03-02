import React, { useState } from 'react';
import AppHeader from '../components/header/AppHeader';
import AppSidebar from '../components/header/AppSidebar';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router';
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
import { OrganizationRow } from '../types/billing';
import Backdrop from './Backdrop';
import ChatWidget from '../components/chat/ChatWidget';
import { ChatProvider } from '../contexts/ChatContext';
import { SiteProvider } from '../contexts/SiteContext';

const LayoutContent: React.FC = () => {
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const { isExpanded, isMobileOpen } = useSidebar();
	const { user, loadingState, session } = useAuth();
	const trialInfo = useTrial();
	const { organization: currentOrg } = useOrganization();
	const { isPaused, isDisabled, status: orgStatus } = useOrganizationStatus();

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

	// Simple redirects without state
	if (!session || !user?.id) {
		return <Navigate to="/" replace />;
	}

	// For newly created users, prioritize onboarding over organization check
	if (!user?.completed_onboarding && pathname !== '/onboarding') {
		return <Navigate to="/onboarding" replace />;
	}

	const hasOrganization = Boolean(user?.organization_id);
	// Check if org is in payment_pending status (not yet paid)
	const isOrgPaymentPending = currentOrg?.status === 'payment_pending';

	// Only after onboarding is complete, check organization status
	if (user?.completed_onboarding) {
		// Add a small delay to allow user context to update after invitation completion
		// This prevents race conditions where organization_id might not be immediately available
		if (!hasCheckedOrg) {
			setTimeout(() => setHasCheckedOrg(true), 100);
			return <AuthLoading state={AuthLoadingState.LOADING} />;
		}

		// CRITICAL: Block access if org hasn't completed payment yet
		if (isOrgPaymentPending && pathname !== '/organization-required') {
			return <Navigate to="/organization-required" replace />;
		}

		if (!hasOrganization && pathname !== '/organization-required') {
			return <Navigate to="/organization-required" replace />;
		}
	}

	// Safety fallback: if we're on organization-required but user has organization AND payment is complete, redirect to dashboard
	if (pathname === '/organization-required' && hasOrganization && !isOrgPaymentPending) {
		return <Navigate to="/dashboard" replace />;
	}

	// Safety fallback: if we're on onboarding but user completed it, redirect to dashboard
	if (pathname === '/onboarding' && user?.completed_onboarding) {
		return <Navigate to="/dashboard" replace />;
	}

	// Show screen size warning if screen is too small
	if (isScreenTooSmall) {
		return <ScreenSizeWarning />;
	}

	const organizationForBilling = (currentOrg || trialInfo.organization) as OrganizationRow | null;
	const stripeStatus = organizationForBilling?.stripe_status;
	const hasStripeStatus = typeof stripeStatus === 'string';
	const shouldRequireStripeStatus = Boolean(user?.completed_onboarding && hasOrganization);

	if (shouldRequireStripeStatus && !hasStripeStatus) {
		return <AuthLoading state={AuthLoadingState.LOADING} />;
	}

	let shouldShowReadOnly = false;
	let reason: 'paused' | 'disabled' | 'trial_expired' | 'payment_required' | 'past_due' = 'paused';
	let paymentFailureReason: string | undefined;

	// If the organization status is already active, do NOT render read-only gate,
	// even if other derived fields are momentarily stale.
	if (orgStatus === 'active') {
		shouldShowReadOnly = false;
	} else if (isOrganizationBehindOnPayments(organizationForBilling)) {
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
	} else if (stripeStatus === 'canceled' || stripeStatus === 'incomplete_expired') {
		shouldShowReadOnly = true;
		reason = 'trial_expired';
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
					<AppSidebar />
					<Backdrop />
				</div>
				<div
					className={`flex-1 transition-all duration-300 ease-in-out ${isExpanded ? 'lg:ml-50' : 'lg:ml-22'} ${isMobileOpen ? 'ml-0' : ''}`}
				>
					<AppHeader />

					<div className="w-full">
						<main className="bg-accent-foreground-dark min-h-screen-height-visible h-full w-full p-6 dark:bg-gray-800">
							<div className="mx-auto h-full w-full max-w-(--breakpoint-2xl)">
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
					<ChatProvider>
						<LayoutContent />
						<ChatWidget />
					</ChatProvider>
				</SiteProvider>
			</BreadcrumbsProvider>
		</SidebarProvider>
	);
};

export default AppLayout;
