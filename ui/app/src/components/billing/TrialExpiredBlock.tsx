import React from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, CreditCard, Lock, Calendar, DollarSign } from 'lucide-react';
import { OrganizationRow } from '../../types/billing';
import { supabase } from '../../utils/supabaseClient';
import { STRIPE_CUSTOMER_PORTAL_URL, canManageBilling } from '../../utils/billing';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface TrialExpiredBlockProps {
	trialInfo: {
		daysRemaining: number | null;
		trialEndFormatted: string | null;
		organization: OrganizationRow | null;
	};
	needsPayment: boolean;
	role?: string | null;
	onStartNewSubscription?: () => void;
}

export const TrialExpiredBlock: React.FC<TrialExpiredBlockProps> = ({
	trialInfo,
	needsPayment,
	role,
	onStartNewSubscription
}) => {
	const navigate = useNavigate();
	const isManager = canManageBilling(role);

	const { daysRemaining, trialEndFormatted, organization } = trialInfo;

	const handleUpgrade = () => {
		if (organization?.stripe_status === 'canceled') {
			window.open(STRIPE_CUSTOMER_PORTAL_URL, '_blank');
			return;
		}

		navigate('/billing');
	};

	const handleStartNewSubscription = () => {
		if (onStartNewSubscription) {
			onStartNewSubscription();
			return;
		}
		navigate('/billing');
	};

	const handleSignOut = async () => {
		try {
			await supabase.auth.signOut();
			window.location.href = '/';
		} catch (error) {
			console.error('Error signing out:', error);
		}
	};

	const getStatusInfo = () => {
		const stripeStatus = organization?.stripe_status;

		if (stripeStatus === 'canceled') {
			return {
				icon: <AlertTriangle className="h-8 w-8 text-red-600" />,
				title: 'Subscription Canceled',
				description: isManager
					? 'Your subscription has been canceled. Renew to regain full access to Sharkly.'
					: 'Your subscription has been canceled. An owner or admin can renew to restore access.',
				actionText: isManager ? 'Renew Subscription' : 'View Plans',
				bgColor: 'bg-red-50',
				borderColor: 'border-red-200',
				textColor: 'text-red-800',
				showTrialEnd: false
			};
		}

		if (needsPayment) {
			return {
				icon: <CreditCard className="h-8 w-8 text-red-600" />,
				title: 'Payment Method Required',
				description:
					'Your trial has ended and you need to add a payment method to continue using your account.',
				actionText: 'Add Payment Method',
				bgColor: 'bg-red-50',
				borderColor: 'border-red-200',
				textColor: 'text-red-800'
			};
		} else if (daysRemaining === 0) {
			return {
				icon: <AlertTriangle className="h-8 w-8 text-red-600" />,
				title: 'Trial Ended Today',
				description: 'Your 7‑day pay‑as‑you‑go trial has ended today.',
				actionText: 'View Billing',
				bgColor: 'bg-red-50',
				borderColor: 'border-red-200',
				textColor: 'text-red-800'
			};
		} else if (daysRemaining !== null && daysRemaining < 0) {
			return {
				icon: <Lock className="h-8 w-8 text-red-600" />,
				title: 'Trial Expired',
				description: `Your 7‑day pay‑as‑you‑go trial ended ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} ago.`,
				actionText: 'View Billing',
				bgColor: 'bg-red-50',
				borderColor: 'border-red-200',
				textColor: 'text-red-800'
			};
		} else if (daysRemaining !== null) {
			return {
				icon: <Calendar className="h-8 w-8 text-amber-600" />,
				title: 'Trial Ending Soon',
				description: `Your 7‑day pay‑as‑you‑go trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`,
				actionText: 'View Billing',
				bgColor: 'bg-amber-50',
				borderColor: 'border-amber-200',
				textColor: 'text-amber-800'
			};
		}

		return {
			icon: <Calendar className="h-8 w-8 text-amber-600" />,
			title: 'Trial Status Unknown',
			description: 'Unable to determine trial status. Please contact support.',
			actionText: 'Contact Support',
			bgColor: 'bg-gray-50',
			borderColor: 'border-gray-200',
			textColor: 'text-gray-800'
		};
	};

	const statusInfo = getStatusInfo();

	const getPlanName = () => {
		if (!organization) {
			return 'Plan Unavailable';
		}

		if (organization.stripe_status === 'canceled') {
			return organization.plan_code
				? `${organization.plan_code.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} (Canceled)`
				: 'Subscription Canceled';
		}

		if (organization.plan_code) {
			return organization.plan_code
				.replace('_', ' ')
				.replace(/\b\w/g, (l: string) => l.toUpperCase());
		}

		return '7‑Day Trial';
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
			<div className="w-full max-w-md">
				<Card className={`${statusInfo.bgColor} ${statusInfo.borderColor} border-2`}>
					<CardHeader className="text-center">
						<div className="mb-4 flex justify-center">{statusInfo.icon}</div>
						<CardTitle className={`text-xl font-bold ${statusInfo.textColor}`}>
							{statusInfo.title}
						</CardTitle>
					</CardHeader>

					<CardContent className="space-y-6">
						<div className="text-center">
							<p className={`text-sm ${statusInfo.textColor} mb-4`}>{statusInfo.description}</p>
							{!isManager && organization?.stripe_status === 'canceled' && (
								<p className="text-xs text-red-600 dark:text-red-300">
									Contact an owner or admin to restart the subscription.
								</p>
							)}
							{trialEndFormatted && statusInfo.showTrialEnd !== false && (
								<div className="mb-4 flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
									<Calendar className="h-4 w-4" />
									<span>Trial ended: {trialEndFormatted}</span>
								</div>
							)}
						</div>

						{/* Current Plan Info */}
						{organization && (
							<div className="rounded-lg border bg-white p-4 dark:bg-gray-800">
								<h3 className="mb-2 font-semibold text-gray-900 dark:text-white">
									Current Plan: {getPlanName()}
								</h3>
								<div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
									<div>Team members: {organization.included_seats || 1}</div>
									<div>Credits: {organization.included_credits || 0}</div>
									{typeof organization.plan_price_cents === 'number' &&
										organization.plan_price_cents > 0 && (
											<div className="flex items-center space-x-2">
												<DollarSign className="h-3 w-3" />
												<span>${(organization.plan_price_cents / 100).toFixed(2)}/month</span>
											</div>
										)}
								</div>
							</div>
						)}

						{/* Action Buttons */}
						<div className="space-y-3">
							<Button
								onClick={handleUpgrade}
								className="w-full bg-red-600 text-white hover:bg-red-700"
								size="lg"
							>
								{statusInfo.actionText}
							</Button>

							<Button
								onClick={() => window.open(STRIPE_CUSTOMER_PORTAL_URL, '_blank')}
								className="w-full border-red-200 text-red-600 hover:bg-red-50"
								variant="outline"
							>
								Manage Subscription
							</Button>

							{organization?.stripe_status === 'canceled' && isManager && (
								<Button onClick={handleStartNewSubscription} className="w-full" variant="outline">
									Start New Subscription
								</Button>
							)}

							{organization?.stripe_status === 'canceled' && (
								<Button onClick={handleSignOut} className="w-full" variant="ghost">
									Sign Out
								</Button>
							)}

							{organization?.stripe_status === 'canceled' && (
								<p className="text-center text-xs text-gray-400">
									Want to switch accounts? Sign out and log in with a different organization.
								</p>
							)}

							<p className="text-center text-xs text-gray-500 dark:text-gray-400">
								Need help? Contact our support team for assistance.
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default TrialExpiredBlock;
