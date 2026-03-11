import React, { useState } from 'react';
import { AlertTriangle, Pause, Shield, CreditCard, Play, RefreshCcw, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { STRIPE_CUSTOMER_PORTAL_URL, canManageBilling } from '../../utils/billing';
import { OrganizationRow } from '../../types/billing';
import SeamlessBillingFlow from '../billing/SeamlessBillingFlow';
import { useAuth } from '../../hooks/useAuth';

interface ReadOnlyModeProps {
	children: React.ReactNode;
	isReadOnly: boolean;
	reason?: 'paused' | 'disabled' | 'trial_expired' | 'payment_required' | 'past_due';
	onResume?: () => void;
	className?: string;
	showResumeButton?: boolean;
	paymentFailureReason?: string;
	userRole?: string | null;
	userId?: string | null;
	organization?: OrganizationRow | null;
	onStartNewSubscription?: () => void;
}

export const ReadOnlyMode: React.FC<ReadOnlyModeProps> = ({
	children,
	isReadOnly,
	reason = 'paused',
	onResume,
	className = '',
	showResumeButton = false,
	paymentFailureReason,
	userRole,
	userId,
	organization,
	onStartNewSubscription
}) => {
	const [showRenewalFlow, setShowRenewalFlow] = useState(false);
	const { signOut } = useAuth();

	if (!isReadOnly) {
		return <>{children}</>;
	}

	const handleLogout = async () => {
		await signOut();
		window.location.href = '/signin';
	};

	const isOrgOwner = !!userId && organization?.owner_id === userId;
	const canManage = canManageBilling(userRole) || isOrgOwner;
	const stripeStatus = organization?.stripe_status || null;
	const isCanceledStripe = stripeStatus === 'canceled' || stripeStatus === 'incomplete_expired';

	const getReasonInfo = () => {
		switch (reason) {
			case 'trial_expired':
				return {
					icon: <AlertTriangle className="h-5 w-5" />,
					title: 'Subscription Ended',
					message: canManage
						? 'Start a new subscription to regain access to Paperboat CRM.'
						: 'Your subscription has ended. An owner or admin can restart it.',
					showResume: false,
					showManagePortal: false,
					showStartNew: canManage,
					showRestrictedNotice: !canManage
				};
			case 'payment_required':
				return {
					icon: <CreditCard className="h-5 w-5" />,
					title: 'Payment Action Required',
					message: 'Update your payment method to continue using the service.',
					showResume: false,
					showManagePortal: canManage,
					showStartNew: false,
					showRestrictedNotice: !canManage
				};
			case 'past_due':
				return {
					icon: <AlertTriangle className="h-5 w-5" />,
					title: 'Payment Past Due',
					message: 'Your payment is past due. Update your payment method to restore access.',
					showResume: false,
					showManagePortal: canManage,
					showStartNew: false,
					showRestrictedNotice: !canManage
				};
			case 'disabled':
				return {
					icon: <Shield className="h-5 w-5" />,
					title: 'Organization Disabled',
					message: canManage
						? 'This organization has been disabled. Manage your subscription to re-enable it.'
						: 'This organization is disabled until an owner or admin restarts the subscription.',
					showResume: false,
					showManagePortal: canManage && !isCanceledStripe,
					showStartNew: canManage && isCanceledStripe,
					showRestrictedNotice: !canManage
				};
			case 'paused':
				return {
					icon: <Pause className="h-5 w-5" />,
					title: 'Organization Paused',
					message: 'This organization has been paused. All features are in read-only mode.',
					showResume: showResumeButton,
					showManagePortal: canManage,
					showStartNew: false,
					showRestrictedNotice: !canManage
				};
			default:
				return {
					icon: <Pause className="h-5 w-5" />,
					title: 'Read-Only Mode',
					message: 'This organization is in read-only mode.',
					showResume: false,
					showManagePortal: canManage,
					showStartNew: false,
					showRestrictedNotice: !canManage
				};
		}
	};

	const openPortal = () => {
		window.open(STRIPE_CUSTOMER_PORTAL_URL, '_blank');
	};

	const reasonInfo = getReasonInfo();

	return (
		<div className={`relative ${className}`}>
			<div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
				<div className="flex h-full items-center justify-center p-4">
					<Card className="w-full max-w-md">
						<CardContent className="p-6 text-center">
							<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
								{reasonInfo.icon}
							</div>
							<h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
								{reasonInfo.title}
							</h3>
							<p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{reasonInfo.message}</p>
							{paymentFailureReason && (reason === 'payment_required' || reason === 'past_due') && (
								<div className="mb-4 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
									<p className="text-sm text-red-800 dark:text-red-200">
										<strong>Reason:</strong> {paymentFailureReason}
									</p>
								</div>
							)}
							<div className="space-y-2">
								{reasonInfo.showResume && onResume && (
									<Button onClick={onResume} variant="default" className="w-full">
										<Play className="mr-2 h-4 w-4" />
										Resume Organization
									</Button>
								)}
								{reasonInfo.showManagePortal && (
									<Button onClick={openPortal} variant="outline" className="w-full">
										<CreditCard className="mr-2 h-4 w-4" />
										Manage Subscription
									</Button>
								)}
								{reasonInfo.showStartNew && organization && (
									<div className="space-y-3">
										{!showRenewalFlow ? (
											<Button
												onClick={() => {
													setShowRenewalFlow(true);
													onStartNewSubscription?.();
												}}
												className="w-full bg-red-600 text-white hover:bg-red-700"
											>
												<RefreshCcw className="mr-2 h-4 w-4" />
												Start New Subscription
											</Button>
										) : (
											<div className="rounded-lg border border-red-200 bg-white p-4 text-left dark:border-red-800 dark:bg-gray-900/40">
												<SeamlessBillingFlow
													existingOrganization={{
														id: organization.id,
														name: organization.name,
														stripe_customer_id: organization.stripe_customer_id,
														plan_code: organization.plan_code
													}}
													onClose={() => setShowRenewalFlow(false)}
												/>
											</div>
										)}
									</div>
								)}
								{reasonInfo.showRestrictedNotice && (
									<p className="text-xs text-red-600/90 dark:text-red-300/90">
										Only an organization owner or admin can manage billing.
									</p>
								)}
								<p className="mt-5 block text-xs text-gray-500 dark:text-gray-400">
									Need help? Contact our support team at hello@paperboatcrm.com
								</p>

								{/* Logout option - always visible */}
								<div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
									<p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Wrong account?</p>
									<Button
										onClick={handleLogout}
										variant="ghost"
										size="sm"
										className="w-full text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
									>
										<LogOut className="mr-2 h-4 w-4" />
										Sign out
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
			<div className="pointer-events-none blur-sm select-none">{children}</div>
		</div>
	);
};

export default ReadOnlyMode;
