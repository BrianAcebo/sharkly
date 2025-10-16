import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import TrialBanner from '../components/billing/TrialBanner';
import PaymentStatusBanner from '../components/billing/PaymentStatusBanner';
import { useTrial } from '../hooks/useTrial';
import { useOrganizationStatus } from '../hooks/useOrganizationStatus';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { isOrganizationBehindOnPayments } from '../utils/paymentStatus';
import ReadOnlyMode from '../components/common/ReadOnlyMode';
import { useOrganization } from '../hooks/useOrganization';
import { OrganizationRow } from '../types/billing';
import { useWebRTCCall } from '../hooks/useWebRTCCall';
import PageMeta from '../components/common/PageMeta';
import ProvisioningGate from '../components/billing/ProvisioningGate';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { BellRing } from 'lucide-react';
// import { toast } from 'sonner';
import { NOTIFICATION_HELP_EVENT } from '../constants/events';

const LayoutContent: React.FC = () => {
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const { isExpanded } = useSidebar();
	const { user, loadingState, session } = useAuth();
	const trialInfo = useTrial();
  const { organization: currentOrg, refetch: refetchOrganization } = useOrganization();
	const { isPaused, isDisabled, status: orgStatus } = useOrganizationStatus();
	const { paymentStatus } = usePaymentStatus();

  const { isIncomingCall, requestNotificationPermission } = useWebRTCCall();

	const [hasCheckedOrg, setHasCheckedOrg] = useState(false);
	const { isScreenTooSmall } = useScreenSize();
	const [isIncomingCallTitleVisible, setIsIncomingCallTitleVisible] = useState(false);
	const incomingCallIntervalRef = useRef<number | null>(null);
	const previousTitleRef = useRef<string>('Paperboat CRM');
	const [showNotificationHelp, setShowNotificationHelp] = useState(false);
	const hasShownNotificationHelpRef = useRef(false);

	const clearTitleInterval = useCallback(() => {
		if (incomingCallIntervalRef.current !== null) {
			clearInterval(incomingCallIntervalRef.current);
			incomingCallIntervalRef.current = null;
		}
	}, []);

	const handleEnableNotifications = useCallback(async () => {
		try {
			const granted = await requestNotificationPermission();
			if (granted) {
				setShowNotificationHelp(false);
			}
		} finally {
			hasShownNotificationHelpRef.current = true;
		}
	}, [requestNotificationPermission]);

	const handleCloseNotificationHelp = useCallback(() => {
		setShowNotificationHelp(false);
		hasShownNotificationHelpRef.current = true;
	}, []);

	const openSystemSettingsGuide = useCallback(() => {
		if (typeof navigator === 'undefined' || typeof window === 'undefined') return;

		const platform = navigator.userAgent.toLowerCase();
		let guideUrl = 'https://support.google.com/chrome/answer/3220216?hl=en';

		if (platform.includes('mac')) {
			guideUrl =
				'https://support.apple.com/guide/mac-help/change-notifications-settings-in-mac-mh40577/mac';
		} else if (platform.includes('win')) {
			guideUrl =
				'https://support.microsoft.com/windows/change-notification-settings-in-windows-10-6448c37f-8733-44bb-b43f-b660fdb58dff';
		} else if (platform.includes('linux') || platform.includes('ubuntu')) {
			guideUrl = 'https://help.ubuntu.com/stable/ubuntu-help/shell-notifications.html';
		}

		window.open(guideUrl, '_blank', 'noopener');
	}, []);

	// Initialize notifications system
	useNotifications(session?.user?.id);

	useEffect(() => {
		if (!isIncomingCall) {
			clearTitleInterval();
			setIsIncomingCallTitleVisible(false);
			if (typeof document !== 'undefined') {
				document.title = previousTitleRef.current || 'Paperboat CRM';
			}
			return () => {
				clearTitleInterval();
			};
		}

		if (typeof document !== 'undefined') {
			previousTitleRef.current = document.title || 'Paperboat CRM';
		}
		setIsIncomingCallTitleVisible(true);
		clearTitleInterval();
		incomingCallIntervalRef.current = window.setInterval(() => {
			setIsIncomingCallTitleVisible((prev) => !prev);
		}, 1000);

		return () => {
			clearTitleInterval();
			setIsIncomingCallTitleVisible(false);
			if (typeof document !== 'undefined') {
				document.title = previousTitleRef.current || 'Paperboat CRM';
			}
		};
	}, [clearTitleInterval, isIncomingCall]);

	useEffect(() => {
		if (typeof window === 'undefined') return;

		const handleExternalOpen = () => {
			setShowNotificationHelp(true);
		};

		window.addEventListener(NOTIFICATION_HELP_EVENT as unknown as string, handleExternalOpen);
		return () => {
			window.removeEventListener(NOTIFICATION_HELP_EVENT as unknown as string, handleExternalOpen);
		};
	}, []);

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

		const isPendingOrg = currentOrg?.org_status === 'pending';
		if ((!hasOrganization || isPendingOrg) && pathname !== '/organization-required') {
			return <Navigate to="/organization-required" replace />;
		}
	}

	// Safety fallback: if we're on organization-required but user has organization, redirect to pipeline
	if (
		pathname === '/organization-required' &&
		hasOrganization &&
		currentOrg?.org_status !== 'pending'
	) {
		return <Navigate to="/pipeline" replace />;
	}

	console.log('currentOrg', user?.completed_onboarding, currentOrg);

	// Precedence: If user has no org or a pending org at any time, force organization-required
	const isPendingOrgGlobal = currentOrg?.org_status === 'pending';
	if ((!hasOrganization || isPendingOrgGlobal) && pathname !== '/organization-required') {
		return <Navigate to="/organization-required" replace />;
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

	const needsProvisioning = Boolean(
		organizationForBilling && String((organizationForBilling as unknown as { org_status?: string })?.org_status) === 'provisioning'
	);


	// HARD GATE: ProvisioningGate takes full precedence and blocks the app entirely
	if (needsProvisioning && organizationForBilling?.included_seats != null) {
		return (
			<ProvisioningGate
				organizationId={organizationForBilling.id}
				includedSeats={organizationForBilling.included_seats || 0}
				onComplete={async () => {
					try {
						await refetchOrganization();
						navigate('/pipeline', { replace: true });
					} catch {
						// no-op
					}
				}}
			/>
		);
	}

	return (
		<>

			{isIncomingCall ? (
				<PageMeta
					isSmallTitle={true}
					title={isIncomingCallTitleVisible ? 'Incoming Call…' : ''}
					description="You have an incoming call"
				/>
			) : null}

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
      {currentOrg?.org_status === 'active' ? <ActiveCallBar /> : null}
			<Dialog
				open={showNotificationHelp}
				onOpenChange={(open) => {
					setShowNotificationHelp(open);
					if (!open) {
						hasShownNotificationHelpRef.current = true;
					}
				}}
			>
				<DialogContent className="max-w-lg space-y-5">
					<DialogHeader>
						<DialogTitle className="flex items-center space-x-2">
							<BellRing className="h-5 w-5 text-amber-500" />
							<span>Enable Notifications</span>
						</DialogTitle>
						<DialogDescription className="leading-relaxed break-words">
							Stay notified about incoming calls by enabling browser notifications and allowing them
							in your computer’s system settings.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
						<ol className="list-decimal space-y-2 pr-1 pl-5">
							<li>
								Click <span className="font-medium">Enable Browser Notifications</span> and allow
								the prompt in your browser.
							</li>
							<li>
								Open your computer's notification settings and allow notifications for your browser.
								<ul className="mt-1 list-disc space-y-1 pr-1 pl-5 text-xs text-gray-500 dark:text-gray-400">
									<li>macOS: System Settings → Notifications → Google Chrome (or your browser)</li>
									<li>Windows: Settings → System → Notifications & actions → Notifications</li>
									<li>Ubuntu/Linux: Settings → Notifications → Applications → Browser</li>
								</ul>
							</li>
						</ol>
						<p className="text-xs text-gray-500 dark:text-gray-400">
							Tip: After changing notification settings, you may need to relaunch your browser.
						</p>
					</div>
					<DialogFooter className="flex gap-2 sm:flex-wrap sm:items-center sm:justify-center">
						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={handleCloseNotificationHelp}
								className="justify-center sm:justify-start"
							>
								Remind me later
							</Button>
							<Button
								onClick={handleEnableNotifications}
								className="justify-center sm:justify-start"
							>
								Enable Browser Notifications
							</Button>
						</div>
						<Button
							variant="ghost"
							onClick={openSystemSettingsGuide}
							className="justify-center sm:justify-start"
						>
							More on system settings
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
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
