import React, { useEffect, useState } from 'react';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { useOrganization } from '../hooks/useOrganization';
import { useTrial } from '../hooks/useTrial';
import { supabase } from '../utils/supabaseClient';
import { api } from '../utils/api';
import { toast } from 'sonner';
import {
	DollarSign,
	AlertCircle,
	CreditCard,
	Users,
	Calendar,
	ExternalLink,
	Wallet,
	Coins,
	ArrowLeft,
	TicketSlash,
	MessageSquare,
	Mail
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { STRIPE_CUSTOMER_PORTAL_URL, canManageBilling } from '../utils/billing';
import { useAuth } from '../hooks/useAuth';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { WalletDepositModal } from '../components/billing/WalletDepositModal';
import { useNavigate } from 'react-router-dom';
import { useCredits } from '../hooks/useCredits';
import { getOrgCreditUsageMonth } from '../api/billingCredits';

type UsageRecord = Record<string, unknown>;

interface UsageSummary {
	credits: {
		count: number;
		cost: number;
		records: UsageRecord[];
	};
	total: {
		cost: number;
		credits_cost: number;
	};
}

// Legacy BillingSettings interface removed

interface StripeInvoice {
	id: string;
	object: string;
	amount_due: number;
	amount_paid: number;
	amount_remaining: number;
	application_fee_amount: number | null;
	attempt_count: number;
	attempted: boolean;
	auto_advance: boolean;
	billing_reason: string | null;
	billing_session: string | null;
	charge: string;
	collection_method: string;
	created: number;
	currency: string;
	custom_fields: string | null;
	customer: string;
	customer_address: string | null;
	customer_email: string | null;
	customer_name: string | null;
	customer_phone: string | null;
	customer_shipping: string | null;
	customer_tax_exempt: string | null;
	customer_tax_ids: string[] | null;
	default_payment_method: string | null;
	default_source: string | null;
	default_tax_rates: string[] | null;
	description: string | null;
	discount: string | null;
	due_date: number | null;
	ending_balance: number;
	footer: string | null;
	hosted_invoice_url: string;
	invoice_pdf: string;
	lines: {
		id: string;
		object: string;
		amount: number;
		currency: string;
		description: string | null;
		discountable: boolean;
		invoice_item: string;
		invoice_line_item: string;
		livemode: boolean;
		metadata: Record<string, unknown>;
		period: {
			end: number;
			start: number;
		};
		plan: {
			id: string;
			object: string;
			active: boolean;
			aggregate_usage: string | null;
			amount: number;
			amount_decimal: string;
			billing_scheme: string;
			created: number;
			currency: string;
			interval: string;
			interval_count: number;
			livemode: boolean;
			metadata: Record<string, unknown>;
			nickname: string | null;
			product: string;
			tiers: string | null;
			tiers_mode: string | null;
			transform_usage: string | null;
			unit_amount: number;
			unit_amount_decimal: string;
		};
		proration: boolean;
		quantity: number;
		subscription: string | null;
		subscription_item: string;
		tax_amounts: string[] | null;
		tax_rates: string[] | null;
		type: string;
		unit_amount: number;
		unit_amount_decimal: string;
	}[];
	livemode: boolean;
	metadata: Record<string, unknown>;
	next_payment_attempt: number | null;
	number: string | null;
	paid: boolean;
	paid_at: number | null;
	payment_intent: string | null;
	payment_settings: {
		payment_method_options: {
			card: {
				request_three_d_secure: string;
			};
		};
		payment_method_types: string[];
		save_default_payment_method: string;
	};
	period_end: number;
	period_start: number;
	post_payment_credit_notes_amount: number;
	pre_payment_credit_notes_amount: number;
	quote: string | null;
	receipt_number: string | null;
	rendering_options: string | null;
	shipping_cost: string | null;
	starting_balance: number;
	statement_descriptor: string | null;
	status: string;
	status_transitions: {
		finalized_at: number | null;
		marked_uncollectible_at: number | null;
		paid_at: number | null;
		voided_at: number | null;
	};
	subscription: string | null;
	subtotal: number;
	tax_amounts: string[] | null;
	tax_rates: string[] | null;
	total: number;
	total_tax_amounts: string[] | null;
	transfer_data: string | null;
	webhooks_delivered_at: number | null;
}

const Billing: React.FC = () => {
	const { organization, loading: orgLoading } = useOrganization();
	const trialInfo = useTrial();
	const { setTitle, setReturnTo } = useBreadcrumbs();
	const { user } = useAuth();
	const navigate = useNavigate();
	// Removed legacy usage summary and voice price fetches (deprecated APIs)
	const [usageSummary] = useState<UsageSummary | null>(null);
	// Removed legacy Billing Settings modal (markup/cycle/email)
	const [isLoading, setIsLoading] = useState(true);
	const { walletStatus, autoRecharge, refetch: refetchPayment } = usePaymentStatus();
	const walletAutoRecharge = autoRecharge ?? null;
	const [depositOpen, setDepositOpen] = useState(false);
	const [autoRechargeOpen, setAutoRechargeOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'pricing' | 'invoices'>(
		'overview'
	);
	const [invoices, setInvoices] = useState<StripeInvoice[] | null>(null);
	const [invoicePagination, setInvoicePagination] = useState({
		hasMore: false,
		startingAfter: null as string | null,
		endingBefore: null as string | null
	});
	const credits = useCredits(organization?.id ?? null);
	const [monthlyCreditsUsed, setMonthlyCreditsUsed] = useState<number | null>(null);
	const [chatUsage, setChatUsage] = useState<{ used: number; limit: number } | null>(null);

	useEffect(() => {
		setTitle('Billing & Usage');
		setReturnTo({ path: '/organization', label: 'Organization' });
		fetchBillingData();
	}, [setTitle, setReturnTo]);

	// Fetch chat message usage
	useEffect(() => {
		const loadChatUsage = async () => {
			if (!organization?.id) return;
			try {
				const {
					data: { session }
				} = await supabase.auth.getSession();
				if (!session?.access_token) return;

				const response = await api.get('/api/ai/status', {
					headers: {
						Authorization: `Bearer ${session.access_token}`,
						'x-organization-id': organization.id
					}
				});
				if (response.ok) {
					const data = await response.json();
					// Use the nested usage object which has messages_used directly
					const usage = data.usage;
					if (usage) {
						setChatUsage({
							used: usage.messages_used ?? 0,
							limit: usage.monthly_limit ?? 500
						});
					}
				}
			} catch (e) {
				console.error('Failed to load chat usage:', e);
			}
		};
		loadChatUsage();
	}, [organization?.id]);

	useEffect(() => {
		if (organization?.stripe_customer_id) {
			fetchInvoices(
				organization.stripe_customer_id,
				invoicePagination.startingAfter,
				invoicePagination.endingBefore
			);
		}
	}, [
		organization?.stripe_customer_id,
		invoicePagination.startingAfter,
		invoicePagination.endingBefore
	]);

	useEffect(() => {
		const loadMonthly = async () => {
			if (!organization?.id) {
				setMonthlyCreditsUsed(null);
				return;
			}
			try {
				const usage = await getOrgCreditUsageMonth(organization.id);
				setMonthlyCreditsUsed(usage?.total_credits_spent ?? 0);
			} catch {
				setMonthlyCreditsUsed(null);
			}
		};
		loadMonthly();
	}, [organization?.id]);

	const fetchBillingData = async () => {
		setIsLoading(false);
	};

	const fetchInvoices = async (
		customerId: string,
		startingAfter?: string | null,
		endingBefore?: string | null
	) => {
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			if (!session?.access_token) {
				return;
			}

			const query = new URLSearchParams();
			query.append('customerId', customerId);
			query.append('limit', '10');
			if (startingAfter) query.append('starting_after', startingAfter);
			if (endingBefore) query.append('ending_before', endingBefore);

			const response = await api.get(`/api/billing/invoices?${query.toString()}`, {
				headers: {
					Authorization: `Bearer ${session.access_token}`,
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				throw new Error('Failed to fetch invoices');
			}

			const data = await response.json();
			setInvoices(data.data || []);
			setInvoicePagination((prev) => ({
				...prev,
				hasMore: data.has_more || false
			}));
		} catch (error) {
			console.error('Error fetching invoices:', error);
			toast.error('Failed to fetch invoices');
		}
	};

	const goToNextInvoicePage = () => {
		if (invoices && invoices.length > 0) {
			setInvoicePagination((prev) => ({
				...prev,
				startingAfter: invoices[invoices.length - 1].id,
				endingBefore: null
			}));
		}
	};

	const goToPreviousInvoicePage = () => {
		if (invoices && invoices.length > 0) {
			setInvoicePagination((prev) => ({
				...prev,
				endingBefore: invoices[0].id,
				startingAfter: null
			}));
		}
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
	};

	if (isLoading) {
		return (
			<div className="flex h-64 items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
			</div>
		);
	}

	const userRole = user?.role || null;

	return (
		<div className="space-y-6 p-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="outline" onClick={() => navigate('/organization')}>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing & Usage</h1>
				</div>
			</div>

			{/* Tabs */}
			<div className="border-b border-gray-200 dark:border-gray-700">
				<nav className="-mb-px flex space-x-8">
					<button
						onClick={() => setActiveTab('overview')}
						className={`border-b-2 px-1 py-2 text-sm font-medium ${
							activeTab === 'overview'
								? 'border-blue-500 text-blue-600 dark:text-blue-400'
								: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
						}`}
					>
						Overview
					</button>
					<button
						onClick={() => setActiveTab('usage')}
						className={`border-b-2 px-1 py-2 text-sm font-medium ${
							activeTab === 'usage'
								? 'border-blue-500 text-blue-600 dark:text-blue-400'
								: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
						}`}
					>
						Usage Costs
					</button>
					<button
						onClick={() => setActiveTab('invoices')}
						className={`border-b-2 px-1 py-2 text-sm font-medium ${
							activeTab === 'invoices'
								? 'border-blue-500 text-blue-600 dark:text-blue-400'
								: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
						}`}
					>
						Invoices
					</button>
				</nav>
			</div>

			{/* Tab Content */}
			{activeTab === 'overview' && (
				<div className="space-y-6">
					{!trialInfo.loading && (trialInfo.isOnTrial || trialInfo.needsPayment) && (
						<div
							className={`rounded-lg p-3 text-sm ${
								trialInfo.needsPayment
									? 'border border-amber-100 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100'
									: 'border border-blue-100 bg-blue-50 text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200'
							}`}
						>
							<div className="flex items-center justify-between">
								<div>
									<p className="font-semibold">
										{trialInfo.needsPayment ? 'Action required' : 'Pay-As-You-Go Trial Active'}
									</p>
									<p
										className={`text-xs ${
											trialInfo.needsPayment
												? 'text-amber-800 dark:text-amber-200'
												: 'text-blue-700 dark:text-blue-300'
										}`}
									>
										{trialInfo.statusMessage}
									</p>
								</div>
								{trialInfo.isOnTrial && trialInfo.trialEndFormatted && (
									<div className="text-right text-xs">
										<div className="flex items-center justify-end space-x-1">
											<Calendar className="h-4 w-4" />
											<span>{trialInfo.trialEndFormatted}</span>
										</div>
										{trialInfo.daysRemaining !== null && (
											<p className="mt-0.5">
												{trialInfo.daysRemaining === 0
													? 'Ends today'
													: trialInfo.daysRemaining === 1
														? 'Ends tomorrow'
														: `${trialInfo.daysRemaining} days remaining`}
											</p>
										)}
									</div>
								)}
							</div>
						</div>
					)}

					{/* Current Plan & Wallet */}
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
						{/* Current Plan Card */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center space-x-2">
									<CreditCard className="h-5 w-5" />
									<span>Current Plan</span>
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{orgLoading ? (
									<div className="flex items-center justify-center py-8">
										<div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500"></div>
									</div>
								) : organization ? (
									<>
										<div className="flex items-center justify-between">
											<div>
												<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
													{organization.plan_code
														? organization.plan_code
																.replace('_', ' ')
																.replace(/\b\w/g, (l) => l.toUpperCase())
														: 'No Plan'}
												</h3>
												<p className="text-sm text-gray-600 dark:text-gray-400">
													{organization.plan_price_cents
														? `$${(organization.plan_price_cents / 100).toFixed(2)}/month`
														: 'Free'}
												</p>
											</div>
											<div className="text-right">
												<span
													className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
														organization.stripe_status === 'active'
															? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
															: organization.stripe_status === 'trialing'
																? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
																: organization.stripe_status === 'incomplete'
																	? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
																	: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
													}`}
												>
													{organization.stripe_status || 'Unknown'}
												</span>
											</div>
										</div>

										{/* Plan Features */}
										<div className="space-y-3">
											<h4 className="text-sm font-medium text-gray-900 dark:text-white">
												Included Features
											</h4>
											<div className="grid grid-cols-2 gap-3">
												<div className="flex items-center space-x-2 text-sm">
													<Users className="h-4 w-4 text-gray-500" />
													<span className="text-gray-900 dark:text-white">
														{organization.included_seats || 0} team members
													</span>
												</div>
												<div className="flex items-center space-x-2 text-sm">
													<Coins className="h-4 w-4 text-gray-500" />
													<span className="text-gray-900 dark:text-white">
														{typeof organization.included_credits_monthly === 'number'
															? organization.included_credits_monthly
															: organization.included_credits || 0}{' '}
														credits
													</span>
												</div>
											</div>
										</div>

										<div className="border-t border-gray-200 pt-4 dark:border-gray-700">
											{organization && canManageBilling(userRole) && (
												<>
													<Button
														variant="outline"
														className="w-full"
														onClick={() => window.open(STRIPE_CUSTOMER_PORTAL_URL, '_blank')}
													>
														<ExternalLink className="mr-2 h-4 w-4" />
														Manage Subscription
													</Button>
												</>
											)}
											{organization && !canManageBilling(userRole) && (
												<p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
													Only an owner or admin can manage billing settings.
												</p>
											)}
										</div>
									</>
								) : (
									<div className="py-8 text-center">
										<AlertCircle className="mx-auto mb-2 h-8 w-8 text-gray-400" />
										<p className="text-gray-500 dark:text-gray-400">
											No organization data available
										</p>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Trial Status Card */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center space-x-2">
									<Wallet className="h-5 w-5" />
									<span>Usage Wallet</span>
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{/* Credits Overview (from new credit system) */}
								{organization?.id ? (
									<div className="rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800">
										<div className="flex items-center justify-between">
											<div className="space-y-1">
												<div className="flex items-center gap-2">
													<Coins className="h-4 w-4 text-gray-500" />
													<span className="text-gray-500 dark:text-gray-400">
														Included remaining:
													</span>
													<strong className="text-gray-900 dark:text-white">
														{credits.loading ? '…' : (credits.data?.included_remaining ?? 0)}
													</strong>
												</div>
												<div className="flex items-center gap-2">
													<Coins className="h-4 w-4 text-gray-500" />
													<span className="text-gray-500 dark:text-gray-400">Wallet credits:</span>
													<strong className="text-gray-900 dark:text-white">
														{credits.loading ? '…' : (credits.data?.wallet_remaining ?? 0)}
													</strong>
												</div>
												<div className="flex items-center gap-2">
													<Coins className="h-4 w-4 text-gray-500" />
													<span className="text-gray-500 dark:text-gray-400">Total remaining:</span>
													<strong className="text-gray-900 dark:text-white">
														{credits.loading ? '…' : (credits.data?.remaining_total ?? 0)}
													</strong>
												</div>
												{/* Vera Chat Messages */}
												<div className="mt-2 flex items-center gap-2 border-t border-gray-200 pt-2 dark:border-gray-600">
													<MessageSquare className="h-4 w-4 text-gray-500" />
													<span className="text-gray-500 dark:text-gray-400">
														Vera messages used:
													</span>
													<strong className="text-gray-900 dark:text-white">
														{chatUsage ? `${chatUsage.used} / ${chatUsage.limit}` : '…'}
													</strong>
												</div>
											</div>
											<div className="text-right">
												{!credits.loading && (credits.data?.remaining_total ?? 0) < 5 ? (
													<Button size="sm" onClick={() => setDepositOpen(true)}>
														Top Up Wallet
													</Button>
												) : null}
											</div>
										</div>
										{credits.error ? (
											<p className="mt-2 text-xs text-red-600 dark:text-red-400">
												Failed to load credits: {credits.error}
											</p>
										) : null}
									</div>
								) : null}

								{walletStatus && walletStatus.wallet ? (
									<div className="text-sm">
										<span
											className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
												walletStatus.wallet.status === 'active'
													? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
													: walletStatus.wallet.status === 'suspended'
														? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
														: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
											}`}
										>
											Wallet: {walletStatus.wallet.status}
										</span>
										<span className="ml-2 text-gray-700 dark:text-gray-300">
											Balance: $
											{(
												((credits.data?.wallet_balance_cents ??
													walletStatus.wallet.balance_cents ??
													0) as number) / 100
											).toFixed(2)}
										</span>
										{walletStatus.depositRequired && (
											<Button size="sm" className="ml-2" onClick={() => setDepositOpen(true)}>
												Deposit
											</Button>
										)}
									</div>
								) : null}
								<div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800/60">
									<div>
										<p className="font-medium text-gray-900 dark:text-white">
											Auto-recharge status
										</p>
										{walletStatus ? (
											walletAutoRecharge?.enabled ? (
												<p className="text-xs text-gray-600 dark:text-gray-300">
													Enabled · ${((walletAutoRecharge.amount_cents ?? 0) / 100).toFixed(2)}{' '}
													added when balance dips below $
													{((walletAutoRecharge.threshold_cents ?? 0) / 100).toFixed(2)}
												</p>
											) : (
												<p className="text-xs text-gray-500 dark:text-gray-400">
													Currently disabled
												</p>
											)
										) : (
											<p className="text-xs text-gray-500 dark:text-gray-400">
												Loading current settings…
											</p>
										)}
									</div>
									<Button size="sm" variant="outline" onClick={() => setAutoRechargeOpen(true)}>
										Manage
									</Button>
								</div>
								<div className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
									<p className="font-medium text-gray-900 dark:text-white">
										How auto-recharge works
									</p>
									<ul className="mt-2 list-inside list-disc space-y-1">
										<li>Choose the amount we add to your wallet when the balance drops too low.</li>
										<li>Pick a threshold that triggers the top-up so you stay live.</li>
										<li>
											All charges use your default payment method (update it under Billing
											settings).
										</li>
									</ul>
								</div>
								<div className="mt-2 grid grid-cols-1 gap-2">
									<Button
										variant="secondary"
										className="w-full"
										onClick={() => setDepositOpen(true)}
									>
										Deposit Funds
									</Button>
									<Button
										variant="outline"
										className="w-full"
										onClick={() => setAutoRechargeOpen(true)}
									>
										Manage Auto-Recharge
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Refund Support Notice */}
					<Card className="max-w-md">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-base">
								<Mail className="h-4 w-4" />
								Refunds & Billing Issues
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
								Need a refund or have a billing issue? Our support team is here to help.
							</p>
							<Button
								variant="outline"
								onClick={() =>
									(window.location.href =
										'mailto:support@truesight.com?subject=Billing%20Support%20Request')
								}
							>
								<Mail className="mr-2 h-4 w-4" />
								Contact Support
							</Button>
						</CardContent>
					</Card>
				</div>
			)}

			{activeTab === 'usage' && (
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Usage Highlights</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 gap-6 md:grid-cols-4">
								<div className="rounded-lg bg-white p-4 shadow dark:bg-gray-700">
									<div className="flex items-center">
										<div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
											<DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
										</div>
										<div className="ml-4">
											<p className="text-sm font-medium text-gray-600 dark:text-gray-400">
												Total Cost
											</p>
											<p className="text-2xl font-bold text-gray-900 dark:text-white">
												{formatCurrency(usageSummary?.total.cost || 0)}
											</p>
										</div>
									</div>
								</div>

								<div className="rounded-lg bg-white p-4 shadow dark:bg-gray-700">
									<div className="flex items-center">
										<div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
											<TicketSlash className="h-6 w-6 text-blue-600 dark:text-blue-400" />
										</div>
										<div className="ml-4">
											<p className="text-sm font-medium text-gray-600 dark:text-gray-400">
												Credits Used
											</p>
											<p className="text-2xl font-bold text-gray-900 dark:text-white">
												{monthlyCreditsUsed ?? 0}
											</p>
										</div>
									</div>
								</div>

								<div className="rounded-lg bg-white p-4 shadow dark:bg-gray-700">
									<div className="flex items-center">
										<div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
											<Coins className="h-6 w-6 text-blue-600 dark:text-blue-400" />
										</div>
										<div className="ml-4">
											<p className="text-sm font-medium text-gray-600 dark:text-gray-400">
												Credits Remaining
											</p>
											<p className="text-2xl font-bold text-gray-900 dark:text-white">
												{credits.loading ? '…' : (credits.data?.remaining_total ?? 0)}
											</p>
										</div>
									</div>
								</div>

								<div className="rounded-lg bg-white p-4 shadow dark:bg-gray-700">
									<div className="flex items-center">
										<div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
											<Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
										</div>
										<div className="ml-4">
											<p className="text-sm font-medium text-gray-600 dark:text-gray-400">
												Messages Sent
											</p>
											<p className="text-2xl font-bold text-gray-900 dark:text-white">
												{chatUsage ? `${chatUsage.used} / ${chatUsage.limit}` : '…'}
											</p>
										</div>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{activeTab === 'invoices' && (
				<Card>
					<CardHeader>
						<CardTitle>Invoices</CardTitle>
					</CardHeader>
					<CardContent>
						{invoices && invoices.length > 0 ? (
							<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
								<thead className="bg-gray-50 dark:bg-gray-800">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
											Invoice
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
											Amount
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
											Status
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
											Created
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
											Actions
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
									{invoices.map((invoice) => (
										<tr key={invoice.id}>
											<td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-white">
												{invoice.number ?? invoice.id}
											</td>
											<td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
												{formatCurrency((invoice.total ?? 0) / 100)}
											</td>
											<td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500 capitalize">
												{invoice.status}
											</td>
											<td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
												{invoice.created
													? new Date(invoice.created * 1000).toLocaleDateString()
													: ''}
											</td>
											<td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => {
														if (invoice.invoice_pdf) {
															window.open(invoice.invoice_pdf, '_blank');
														} else if (invoice.hosted_invoice_url) {
															window.open(invoice.hosted_invoice_url, '_blank');
														} else {
															toast.info('Invoice PDF unavailable.');
														}
													}}
												>
													View PDF
												</Button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						) : (
							<div className="py-8 text-center">
								<p className="text-gray-500 dark:text-gray-400">No invoices found.</p>
							</div>
						)}
						<div className="mt-4 flex justify-between">
							<Button
								variant="outline"
								size="sm"
								disabled={!invoicePagination.endingBefore}
								onClick={goToPreviousInvoicePage}
							>
								Previous
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={!invoicePagination.hasMore}
								onClick={goToNextInvoicePage}
							>
								Next
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Legacy Billing Settings modal removed */}

			<WalletDepositModal
				open={depositOpen}
				onClose={() => {
					setDepositOpen(false);
					refetchPayment();
				}}
			/>
			<WalletDepositModal
				open={autoRechargeOpen}
				forceAutoStep
				onClose={() => {
					setAutoRechargeOpen(false);
					refetchPayment();
				}}
			/>
		</div>
	);
};

export default Billing;
