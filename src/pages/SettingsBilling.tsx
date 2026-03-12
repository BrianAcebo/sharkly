/**
 * Settings: Billing — Overview and Invoices (tabs).
 * Same content as Billing page overview + invoices, with settings styling.
 */
import { useEffect, useState } from 'react';
import { useOrganization } from '../hooks/useOrganization';
import { useTrial } from '../hooks/useTrial';
import { useAuth } from '../hooks/useAuth';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { useCredits } from '../hooks/useCredits';
import { supabase } from '../utils/supabaseClient';
import { api } from '../utils/api';
import { toast } from 'sonner';
import PageMeta from '../components/common/PageMeta';
import { Button } from '../components/ui/button';
import { STRIPE_CUSTOMER_PORTAL_URL, canManageBilling } from '../utils/billing';
import { WalletDepositModal } from '../components/billing/WalletDepositModal';
import { formatCurrency } from '../utils/format';
import {
	AlertCircle,
	CreditCard,
	Users,
	Calendar,
	ExternalLink,
	Wallet,
	Coins,
	MessageSquare,
	Mail,
} from 'lucide-react';

interface StripeInvoice {
	id: string;
	number: string | null;
	total: number;
	status: string;
	created: number;
	hosted_invoice_url: string;
	invoice_pdf: string;
}

export default function SettingsBilling() {
	const { organization, loading: orgLoading } = useOrganization();
	const trialInfo = useTrial();
	const { user } = useAuth();
	const { walletStatus, autoRecharge: walletAutoRecharge, refetch: refetchPayment } = usePaymentStatus();
	const credits = useCredits(organization?.id ?? null);
	const [chatUsage, setChatUsage] = useState<{ used: number; limit: number } | null>(null);
	const [invoices, setInvoices] = useState<StripeInvoice[] | null>(null);
	const [invoicePagination, setInvoicePagination] = useState({
		hasMore: false,
		startingAfter: null as string | null,
		endingBefore: null as string | null,
	});
	const [activeTab, setActiveTab] = useState<'overview' | 'invoices'>('overview');
	const [depositOpen, setDepositOpen] = useState(false);
	const [autoRechargeOpen, setAutoRechargeOpen] = useState(false);

	useEffect(() => {
		const loadChatUsage = async () => {
			if (!organization?.id) return;
			try {
				const { data: { session } } = await supabase.auth.getSession();
				if (!session?.access_token) return;
				const response = await api.get('/api/ai/status', {
					headers: {
						Authorization: `Bearer ${session.access_token}`,
						'x-organization-id': organization.id,
					},
				});
				if (response.ok) {
					const data = await response.json();
					const u = data.usage;
					if (u) setChatUsage({ used: u.messages_used ?? 0, limit: u.monthly_limit ?? 500 });
				}
			} catch {
				// ignore
			}
		};
		loadChatUsage();
	}, [organization?.id]);

	const fetchInvoices = async (
		customerId: string,
		startingAfter?: string | null,
		endingBefore?: string | null
	) => {
		try {
			const { data: { session } } = await supabase.auth.getSession();
			if (!session?.access_token) return;
			const query = new URLSearchParams();
			query.append('customerId', customerId);
			query.append('limit', '10');
			if (startingAfter) query.append('starting_after', startingAfter);
			if (endingBefore) query.append('ending_before', endingBefore);
			const response = await api.get(`/api/billing/invoices?${query.toString()}`, {
				headers: {
					Authorization: `Bearer ${session.access_token}`,
					'Content-Type': 'application/json',
				},
			});
			if (!response.ok) throw new Error('Failed to fetch invoices');
			const data = await response.json();
			setInvoices(data.data || []);
			setInvoicePagination((prev) => ({ ...prev, hasMore: data.has_more || false }));
		} catch (e) {
			console.error('Fetch invoices:', e);
			toast.error('Failed to load invoices');
		}
	};

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
		invoicePagination.endingBefore,
	]);

	const goToNextInvoicePage = () => {
		if (invoices && invoices.length > 0) {
			setInvoicePagination((prev) => ({
				...prev,
				startingAfter: invoices[invoices.length - 1].id,
				endingBefore: null,
			}));
		}
	};

	const goToPreviousInvoicePage = () => {
		if (invoices && invoices.length > 0) {
			setInvoicePagination((prev) => ({
				...prev,
				endingBefore: invoices[0].id,
				startingAfter: null,
			}));
		}
	};

	const userRole = user?.role || null;

	return (
		<>
			<PageMeta title="Billing" description="Subscription, wallet, and invoices" />

			<h1 className="font-montserrat text-xl font-bold text-gray-900 dark:text-white">
				Billing
			</h1>

			{/* Tabs: Overview | Invoices */}
			<div className="mt-4 border-b border-gray-200 dark:border-gray-700">
				<nav className="-mb-px flex gap-6">
					<button
						type="button"
						onClick={() => setActiveTab('overview')}
						className={`border-b-2 px-1 py-2.5 text-sm font-medium transition-colors ${
							activeTab === 'overview'
								? 'border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400'
								: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
						}`}
					>
						Overview
					</button>
					<button
						type="button"
						onClick={() => setActiveTab('invoices')}
						className={`border-b-2 px-1 py-2.5 text-sm font-medium transition-colors ${
							activeTab === 'invoices'
								? 'border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400'
								: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
						}`}
					>
						Invoices
					</button>
				</nav>
			</div>

			{activeTab === 'overview' && (
				<div className="mt-6 space-y-6">
					{!trialInfo.loading && (trialInfo.isOnTrial || trialInfo.needsPayment) && (
						<div
							className={`rounded-xl border p-4 text-sm ${
								trialInfo.needsPayment
									? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100'
									: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
							}`}
						>
							<div className="flex flex-wrap items-center justify-between gap-3">
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
										<div className="flex items-center justify-end gap-1">
											<Calendar className="size-4" />
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

					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
						{/* Current Plan */}
						<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
							<h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
								<CreditCard className="size-5" />
								Current Plan
							</h3>
							{orgLoading ? (
								<div className="flex justify-center py-8">
									<div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
								</div>
							) : organization ? (
								<>
									<div className="flex items-center justify-between">
										<div>
											<p className="text-lg font-semibold text-gray-900 dark:text-white">
												{organization.plan_code
													? organization.plan_code.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
													: 'No Plan'}
											</p>
											<p className="text-sm text-gray-500 dark:text-gray-400">
												{organization.plan_price_cents
													? `$${(organization.plan_price_cents / 100).toFixed(2)}/month`
													: 'Free'}
											</p>
										</div>
										<span
											className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
												organization.stripe_status === 'active'
													? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
													: organization.stripe_status === 'trialing'
														? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
														: organization.stripe_status === 'incomplete'
															? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
															: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
											}`}
										>
											{organization.stripe_status || 'Unknown'}
										</span>
									</div>
									<div className="mt-4 space-y-3">
										<p className="text-sm font-medium text-gray-900 dark:text-white">Included Features</p>
										<div className="flex flex-wrap gap-4 text-sm">
											<div className="flex items-center gap-2">
												<Users className="size-4 text-gray-500" />
												<span>{organization.included_seats ?? 0} team members</span>
											</div>
											<div className="flex items-center gap-2">
												<Coins className="size-4 text-gray-500" />
												<span>
													{typeof organization.included_credits_monthly === 'number'
														? organization.included_credits_monthly
														: organization.included_credits ?? 0}{' '}
													credits
												</span>
											</div>
										</div>
									</div>
									<div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
										{canManageBilling(userRole) && (
											<Button
												variant="outline"
												className="w-full"
												onClick={() => window.open(STRIPE_CUSTOMER_PORTAL_URL, '_blank')}
											>
												<ExternalLink className="mr-2 size-4" />
												Manage Subscription
											</Button>
										)}
										{!canManageBilling(userRole) && (
											<p className="text-center text-xs text-gray-500 dark:text-gray-400">
												Only an owner or admin can manage billing.
											</p>
										)}
									</div>
								</>
							) : (
								<div className="py-8 text-center">
									<AlertCircle className="mx-auto mb-2 size-8 text-gray-400" />
									<p className="text-gray-500 dark:text-gray-400">No organization data</p>
								</div>
							)}
						</div>

						{/* Usage Wallet */}
						<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
							<h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
								<Wallet className="size-5" />
								Usage Wallet
							</h3>
							{organization?.id ? (
								<div className="space-y-4">
									<div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-800/50">
										<div className="space-y-2">
											<div className="flex justify-between">
												<span className="text-gray-500 dark:text-gray-400">Included remaining</span>
												<strong>{credits.loading ? '…' : (credits.data?.included_remaining ?? 0)}</strong>
											</div>
											<div className="flex justify-between">
												<span className="text-gray-500 dark:text-gray-400">Wallet credits</span>
												<strong>{credits.loading ? '…' : (credits.data?.wallet_remaining ?? 0)}</strong>
											</div>
											<div className="flex justify-between">
												<span className="text-gray-500 dark:text-gray-400">Total remaining</span>
												<strong>{credits.loading ? '…' : (credits.data?.remaining_total ?? 0)}</strong>
											</div>
											<div className="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-600">
												<span className="text-gray-500 dark:text-gray-400">Fin messages used</span>
												<strong>{chatUsage ? `${chatUsage.used} / ${chatUsage.limit}` : '…'}</strong>
											</div>
										</div>
										{!credits.loading && (credits.data?.remaining_total ?? 0) < 5 && (
											<Button size="sm" className="mt-3 w-full" onClick={() => setDepositOpen(true)}>
												Top Up Wallet
											</Button>
										)}
									</div>
									{walletStatus?.wallet && (
										<div className="flex flex-wrap items-center gap-2 text-sm">
											<span
												className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
													walletStatus.wallet.status === 'active'
														? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
														: walletStatus.wallet.status === 'suspended'
															? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
															: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
												}`}
											>
												Wallet: {walletStatus.wallet.status}
											</span>
											<span className="text-gray-700 dark:text-gray-300">
												Balance: {formatCurrency(credits.data?.wallet_balance_cents ?? walletStatus.wallet.balance_cents ?? 0)}
											</span>
											{walletStatus.depositRequired && (
												<Button size="sm" onClick={() => setDepositOpen(true)}>Deposit</Button>
											)}
										</div>
									)}
									<div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
										<div>
											<p className="font-medium text-gray-900 dark:text-white">Auto-recharge</p>
											{walletAutoRecharge?.enabled ? (
												<p className="text-xs text-gray-500 dark:text-gray-400">
													Enabled · {formatCurrency(walletAutoRecharge.amount_cents ?? 0)} when below {formatCurrency(walletAutoRecharge.threshold_cents ?? 0)}
												</p>
											) : (
												<p className="text-xs text-gray-500 dark:text-gray-400">Currently disabled</p>
											)}
										</div>
										<Button size="sm" variant="outline" onClick={() => setAutoRechargeOpen(true)}>
											Manage
										</Button>
									</div>
									<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
										<Button variant="secondary" onClick={() => setDepositOpen(true)}>Deposit Funds</Button>
										<Button variant="outline" onClick={() => setAutoRechargeOpen(true)}>Manage Auto-Recharge</Button>
									</div>
								</div>
							) : (
								<p className="text-sm text-gray-500 dark:text-gray-400">No organization</p>
							)}
						</div>
					</div>

					{/* Refunds & Support */}
					<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
						<h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
							<Mail className="size-5" />
							Refunds & Billing Issues
						</h3>
						<p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
							Need a refund or have a billing issue? Our support team is here to help.
						</p>
						<Button
							variant="outline"
							onClick={() => (window.location.href = 'mailto:hello@sharkly.co?subject=Billing%20Support%20Request')}
						>
							<Mail className="mr-2 size-4" />
							Contact Support
						</Button>
					</div>
				</div>
			)}

			{activeTab === 'invoices' && (
				<div className="mt-6 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
					<div className="p-5">
						<h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Invoices</h3>
						{invoices && invoices.length > 0 ? (
							<>
								<div className="overflow-x-auto">
									<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
										<thead className="bg-gray-50 dark:bg-gray-800">
											<tr>
												<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
													Invoice
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
													Amount
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
													Status
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
													Created
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
													Actions
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
											{invoices.map((invoice) => (
												<tr key={invoice.id}>
													<td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-white">
														{invoice.number ?? invoice.id}
													</td>
													<td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
														{formatCurrency(invoice.total ?? 0)}
													</td>
													<td className="whitespace-nowrap px-4 py-3 text-sm capitalize text-gray-500 dark:text-gray-400">
														{invoice.status}
													</td>
													<td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
														{invoice.created ? new Date(invoice.created * 1000).toLocaleDateString() : ''}
													</td>
													<td className="whitespace-nowrap px-4 py-3">
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
								</div>
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
							</>
						) : (
							<div className="py-12 text-center">
								<p className="text-gray-500 dark:text-gray-400">No invoices found.</p>
							</div>
						)}
					</div>
				</div>
			)}

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
		</>
	);
}
