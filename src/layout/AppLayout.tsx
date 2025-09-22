import React, { useState } from 'react';
import AppHeader from '../components/header/AppHeader';
import AppSidebar from '../components/header/AppSidebar';
import { Navigate, Outlet, useLocation } from 'react-router';
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
import { TrialExpiredBlock } from '../components/billing/TrialExpiredBlock';
import PaymentStatusBanner from '../components/billing/PaymentStatusBanner';
import PaymentRequiredBlock from '../components/billing/PaymentRequiredBlock';
import { useTrial } from '../hooks/useTrial';
import { useOrganizationStatus } from '../hooks/useOrganizationStatus';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { isOrganizationBehindOnPayments } from '../utils/paymentStatus';
import ReadOnlyMode from '../components/common/ReadOnlyMode';

const LayoutContent: React.FC = () => {
	const { pathname } = useLocation();
	const { isExpanded } = useSidebar();
	const { user, loadingState, session } = useAuth();
	const trialInfo = useTrial();
	const {
		isReadOnly,
		isPaused,
    isDisabled,
		status: orgStatus
	} = useOrganizationStatus();
	const { paymentStatus } = usePaymentStatus();

	// Debug logging
	console.log('[APP_LAYOUT] Organization status:', { orgStatus, isPaused, isDisabled, isReadOnly });
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

	// Only after onboarding is complete, check organization status
	if (user?.completed_onboarding) {
		// Add a small delay to allow user context to update after invitation completion
		// This prevents race conditions where organization_id might not be immediately available
		if (!hasCheckedOrg) {
			setTimeout(() => setHasCheckedOrg(true), 100);
			return <AuthLoading state={AuthLoadingState.LOADING} />;
		}

		if (orgStatus && orgStatus !== 'active') {
			return (
        <ReadOnlyMode
					isReadOnly={true}
          reason={isPaused ? 'paused' : isDisabled ? 'disabled' : 'trial_expired'}
          onResume={undefined}
          showResumeButton={false}
					className="h-screen"
				>
					<div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
						<div className="text-center">
							<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
								Organization Paused
							</h1>
						</div>
					</div>
				</ReadOnlyMode>
			);
		}

		// If user has no organization after completing onboarding, redirect to organization-required
		if (!user?.organization_id && pathname !== '/organization-required') {
			return <Navigate to="/organization-required" replace />;
		}

		// If user has organization and is on organization-required, redirect to pipeline
		if (user?.organization_id && pathname === '/organization-required') {
			return <Navigate to="/pipeline" replace />;
		}

		// If user has organization and is on onboarding, redirect to pipeline
		if (user?.organization_id && pathname === '/onboarding') {
			return <Navigate to="/pipeline" replace />;
		}
	}

	// Safety fallback: if we're on organization-required but user has organization, redirect to pipeline
	if (pathname === '/organization-required' && user?.organization_id) {
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

	// Block app if organization is behind on payments (check this first)
    if (paymentStatus && isOrganizationBehindOnPayments(paymentStatus.organization as unknown as import('../types/billing').OrganizationRow)) {
		return (
			<PaymentRequiredBlock 
				organization={paymentStatus.organization}
				onUpdatePayment={() => {
					// Navigate to billing page
					window.location.href = '/billing';
				}}
			>
				<div />
			</PaymentRequiredBlock>
		);
	}

	// Block app if trial expired or subscription issues (check this after payment status)
	if (trialInfo.shouldBlockApp) {
		console.log('[APP_LAYOUT] trialInfo.shouldBlockApp', trialInfo.shouldBlockApp);
		return <TrialExpiredBlock trialInfo={trialInfo} needsPayment={trialInfo.needsPayment} />;
	}

	// Show read-only mode as full-screen replacement if organization is paused or disabled
  if (isReadOnly) {
		console.log('[APP_LAYOUT] isReadOnly', isReadOnly);
		// Determine the reason and whether resumption is allowed
		let reason: 'paused' | 'disabled' | 'trial_expired' | 'payment_required' | 'past_due' = 'paused';
    // no manual resume
		let paymentFailureReason: string | undefined;

		if (paymentStatus && isOrganizationBehindOnPayments(paymentStatus.organization as unknown as import('../types/billing').OrganizationRow)) {
			// Organization is behind on payments
			if (orgStatus === 'payment_required') {
				reason = 'payment_required';
			} else if (orgStatus === 'past_due') {
				reason = 'past_due';
			}
			paymentFailureReason = paymentStatus.organization.payment_failure_reason || undefined;
    } else if (isPaused) {
			// Organization is paused but in good standing
			reason = 'paused';
      // no manual resume
    } else if (isDisabled) {
			reason = 'disabled';
		} else {
			reason = 'trial_expired';
		}

    return (
			<ReadOnlyMode
				isReadOnly={true}
				reason={reason}
        onResume={undefined}
        showResumeButton={false}
				paymentFailureReason={paymentFailureReason}
				className="h-screen"
			>
				<div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
					<div className="text-center">
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
							Organization Paused
						</h1>
						<p className="text-gray-600 dark:text-gray-400">This content is in read-only mode</p>
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
