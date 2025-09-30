import React, { useState } from 'react';
import AppHeader from '../components/header/AppHeader';
import AppSidebar from '../components/header/AppSidebar';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { useSidebar } from '../hooks/useSidebar';
import { BreadcrumbsProvider } from '../providers/BreadcrumbsProvider';
import { SidebarProvider } from '../providers/SidebarProvider';
import { WebRTCCallProvider } from '../providers/WebRTCCallProvider';
import { ActiveCallProvider } from '../contexts/ActiveCallContext';
import { useAuth } from '../hooks/useAuth';
import { AuthLoadingState } from '../contexts/AuthContext';
import { AuthLoading } from '../components/AuthLoading';
import { useScreenSize } from '../hooks/useScreenSize';
import ScreenSizeWarning from '../components/common/ScreenSizeWarning';
import { useNotifications } from '../hooks/useNotifications';
import { ActiveCallBar } from '../components/calls/ActiveCallBar';
import { TrialBanner } from '../components/billing/TrialBanner';
import PaymentStatusBanner from '../components/billing/PaymentStatusBanner';
import { useTrial } from '../hooks/useTrial';
import { useOrganizationStatus } from '../hooks/useOrganizationStatus';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { isOrganizationBehindOnPayments } from '../utils/paymentStatus';
import ReadOnlyMode from '../components/common/ReadOnlyMode';
import { useOrganization } from '../hooks/useOrganization';
import { OrganizationRow } from '../types/billing';

const LayoutContent: React.FC = () => {
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const { isExpanded } = useSidebar();
	const { user, loadingState, session } = useAuth();
	const trialInfo = useTrial();
	const { organization: currentOrg } = useOrganization();
	const { isPaused, isDisabled, status: orgStatus } = useOrganizationStatus();
	const { paymentStatus } = usePaymentStatus();

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

	// Only after onboarding is complete, check organization status
	if (user?.completed_onboarding) {
		// Add a small delay to allow user context to update after invitation completion
		// This prevents race conditions where organization_id might not be immediately available
		if (!hasCheckedOrg) {
			setTimeout(() => setHasCheckedOrg(true), 100);
			return <AuthLoading state={AuthLoadingState.LOADING} />;
		}

		if (!hasOrganization && pathname !== '/organization-required') {
			return <Navigate to="/organization-required" replace />;
		}
	}

	// Safety fallback: if we're on organization-required but user has organization, redirect to pipeline
	if (pathname === '/organization-required' && hasOrganization) {
		return <Navigate to="/pipeline" replace />;
	}

	// Safety fallback: if we're on onboarding but user completed it, redirect to pipeline
	if (pathname === '/onboarding' && user?.completed_onboarding) {
		return <Navigate to="/pipeline" replace />;
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
			<div className="app-layout-content flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
				{isExpanded && <AppSidebar />}

				<div className="h-screen flex-1 overflow-hidden">
					<TrialBanner />
					<PaymentStatusBanner
						organization={paymentStatus?.organization}
						onUpdatePayment={() => {
							window.location.href = '/billing';
						}}
					/>
					<AppHeader />

					<div className="flex-1">
						<main className="h-screen-visible mx-auto max-w-(--breakpoint-2xl) overflow-y-auto p-4 md:p-6">
							<Outlet />
						</main>
					</div>
				</div>
			</div>
			<ActiveCallBar />
		</>
	);
};

const AppLayout: React.FC = () => {
	return (
		<SidebarProvider>
			<BreadcrumbsProvider>
				<WebRTCCallProvider>
					<ActiveCallProvider>
						<LayoutContent />
					</ActiveCallProvider>
				</WebRTCCallProvider>
			</BreadcrumbsProvider>
		</SidebarProvider>
	);
};

export default AppLayout;
