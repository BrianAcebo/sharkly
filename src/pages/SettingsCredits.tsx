/**
 * Settings: Credits & Usage
 * Usage highlights, included features, usage wallet (credits + auto-recharge), plan, monthly usage, seats.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '../components/common/PageMeta';
import { Button } from '../components/ui/button';
import { PLANS } from '../lib/credits';
import { STRIPE_CUSTOMER_PORTAL_URL } from '../utils/billing';
import { useOrganization } from '../hooks/useOrganization';
import { useCredits } from '../hooks/useCredits';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { getOrgCreditUsageMonth, type MonthlyUsage } from '../api/billingCredits';
import { api } from '../utils/api';
import { supabase } from '../utils/supabaseClient';
import type { SeatSummary } from '../types/organization';
import { formatCurrency } from '../utils/format';
import { WalletDepositModal } from '../components/billing/WalletDepositModal';
import {
	ExternalLink,
	Coins,
	Zap,
	RefreshCw,
	Loader2,
	Users,
	DollarSign,
	MessageSquare,
	Wallet,
	TicketSlash,
	Mail,
} from 'lucide-react';

export default function SettingsCredits() {
	const { organization, loading: orgLoading } = useOrganization();
	const {
		data: credits,
		loading: creditsLoading,
		refresh: refreshCredits
	} = useCredits(organization?.id ?? null);
	const { walletStatus, autoRecharge: walletAutoRecharge, refetch: refetchPayment } = usePaymentStatus();
	const [usage, setUsage] = useState<MonthlyUsage | null>(null);
	const [usageLoading, setUsageLoading] = useState(false);
	const [chatUsage, setChatUsage] = useState<{ used: number; limit: number } | null>(null);
	const [seatSummary, setSeatSummary] = useState<SeatSummary | null>(null);
	const [seatLoading, setSeatLoading] = useState(false);
	const [seatError, setSeatError] = useState<string | null>(null);
	const [depositOpen, setDepositOpen] = useState(false);
	const [autoRechargeOpen, setAutoRechargeOpen] = useState(false);

	useEffect(() => {
		if (!organization?.id) return;
		setUsageLoading(true);
		getOrgCreditUsageMonth(organization.id)
			.then(setUsage)
			.catch(() => setUsage(null))
			.finally(() => setUsageLoading(false));
	}, [organization?.id]);

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

	const fetchSeatSummary = useCallback(async () => {
		if (!organization?.id) return;
		setSeatLoading(true);
		setSeatError(null);
		try {
			const { data: { session } } = await supabase.auth.getSession();
			if (!session?.access_token) {
				setSeatError('Not authenticated');
				return;
			}
			const response = await api.get(`/api/organizations/${organization.id}/seats`, {
				headers: {
					Authorization: `Bearer ${session.access_token}`,
					'Content-Type': 'application/json',
				},
			});
			if (!response.ok) {
				const err = await response.json().catch(() => ({}));
				setSeatError((err as { error?: string })?.error ?? 'Failed to load seats');
				setSeatSummary(null);
				return;
			}
			const data = (await response.json()) as { summary: SeatSummary };
			setSeatSummary(data.summary);
		} catch (e) {
			console.error('Seat summary error:', e);
			setSeatError(e instanceof Error ? e.message : 'Failed to load seats');
			setSeatSummary(null);
		} finally {
			setSeatLoading(false);
		}
	}, [organization?.id]);

	useEffect(() => {
		fetchSeatSummary();
	}, [fetchSeatSummary]);

	const planCode = organization?.plan_code ?? 'builder';
	const plan = PLANS[planCode as keyof typeof PLANS] ?? PLANS.builder;

	const includedMonthly =
		credits?.included_monthly ?? organization?.included_credits_monthly ?? plan.credits;
	const includedRemaining =
		credits?.included_remaining ?? organization?.included_credits_remaining ?? 0;
	const walletCredits = credits?.wallet_remaining ?? 0;
	const pct = includedMonthly > 0 ? Math.min(100, (includedRemaining / includedMonthly) * 100) : 0;

	const loading = orgLoading || creditsLoading;

	// Days until reset (approximate from billing period)
	const nextReset: string | null = (() => {
		if (!organization?.trial_end) return null;
		const end = new Date(organization.trial_end);
		const now = new Date();
		const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
		if (diff <= 0 || diff > 60) return null;
		return `${diff} day${diff !== 1 ? 's' : ''}`;
	})();

	return (
		<>
			<PageMeta title="Credits & Usage" description="Your credit balance and usage" />

			<div className="flex items-center justify-between">
				<h1 className="font-montserrat text-xl font-bold text-gray-900 dark:text-white">
					Credits & Usage
				</h1>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => {
						refreshCredits();
						fetchSeatSummary();
						refetchPayment();
					}}
					disabled={creditsLoading || seatLoading}
				>
					{creditsLoading || seatLoading ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<RefreshCw className="size-4" />
					)}
				</Button>
			</div>

			{/* Plan banner */}
			<div className="bg-brand-50 dark:bg-brand-900/20 mt-6 rounded-xl p-5">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<div className="font-montserrat text-brand-700 dark:text-brand-300 text-lg font-extrabold">
							{loading ? '—' : plan.name} Plan
						</div>
						<p className="text-brand-600 dark:text-brand-400 mt-0.5 text-sm">
							${plan.price}/month
							{nextReset ? ` · Resets in ${nextReset}` : ''}
						</p>
					</div>
					<div className="flex gap-2">
						<Link to="/billing">
							<Button
								variant="outline"
								size="sm"
								className="border-brand-400 text-brand-600 dark:text-brand-300"
							>
								Manage Plan
							</Button>
						</Link>
						{STRIPE_CUSTOMER_PORTAL_URL && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => window.open(STRIPE_CUSTOMER_PORTAL_URL, '_blank')}
							>
								<ExternalLink className="mr-1.5 size-3.5" />
								Billing Portal
							</Button>
						)}
					</div>
				</div>
			</div>

			{/* Credit balance cards */}
			<div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
				{/* Included credits */}
				<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
					<div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
						<Zap className="size-4" />
						Included Credits
					</div>
					<div className="font-montserrat text-brand-600 dark:text-brand-400 mt-2 text-4xl font-extrabold">
						{loading ? '—' : includedRemaining.toLocaleString()}
					</div>
					<p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
						of {includedMonthly.toLocaleString()} this period
					</p>
					<div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
						<div
							className={`h-full rounded-full transition-all ${pct < 20 ? 'bg-red-500' : pct < 50 ? 'bg-amber-400' : 'bg-brand-500'}`}
							style={{ width: `${pct}%` }}
						/>
					</div>
					{pct < 20 && (
						<p className="mt-1.5 text-xs font-medium text-red-500">
							Running low — consider topping up
						</p>
					)}
				</div>

				{/* Wallet / overage credits */}
				<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
					<div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
						<Coins className="size-4" />
						Overage Wallet
					</div>
					<div className="font-montserrat mt-2 text-4xl font-extrabold text-gray-900 dark:text-white">
						{loading ? '—' : walletCredits.toLocaleString()}
					</div>
					<p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
						credits available · never expire
					</p>
				</div>
			</div>

			{/* Usage Highlights */}
			<div className="mt-6">
				<h2 className="mb-3 font-semibold text-gray-900 dark:text-white">Usage Highlights</h2>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/40">
								<DollarSign className="size-5 text-blue-600 dark:text-blue-400" />
							</div>
							<div>
								<p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Cost</p>
								<p className="text-xl font-bold text-gray-900 dark:text-white">
									{formatCurrency(0)}
								</p>
							</div>
						</div>
					</div>
					<div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/40">
								<TicketSlash className="size-5 text-blue-600 dark:text-blue-400" />
							</div>
							<div>
								<p className="text-sm font-medium text-gray-500 dark:text-gray-400">Credits Used</p>
								<p className="text-xl font-bold text-gray-900 dark:text-white">
									{usageLoading ? '…' : (usage?.total_credits_spent ?? 0).toLocaleString()}
								</p>
							</div>
						</div>
					</div>
					<div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/40">
								<Coins className="size-5 text-blue-600 dark:text-blue-400" />
							</div>
							<div>
								<p className="text-sm font-medium text-gray-500 dark:text-gray-400">Credits Remaining</p>
								<p className="text-xl font-bold text-gray-900 dark:text-white">
									{creditsLoading ? '…' : (credits?.remaining_total ?? 0).toLocaleString()}
								</p>
							</div>
						</div>
					</div>
					<div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/40">
								<Mail className="size-5 text-blue-600 dark:text-blue-400" />
							</div>
							<div>
								<p className="text-sm font-medium text-gray-500 dark:text-gray-400">Messages Sent</p>
								<p className="text-xl font-bold text-gray-900 dark:text-white">
									{chatUsage ? `${chatUsage.used} / ${chatUsage.limit}` : '…'}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Usage Wallet */}
			<div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
				<h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
					<Wallet className="size-5" />
					Usage Wallet
				</h3>
				{organization?.id ? (
					<div className="space-y-4">
						<div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-800/50">
							<div className="space-y-2">
								<div className="flex items-center justify-between gap-2">
									<span className="text-gray-500 dark:text-gray-400">Included remaining</span>
									<strong className="text-gray-900 dark:text-white">
										{creditsLoading ? '…' : (credits?.included_remaining ?? 0).toLocaleString()}
									</strong>
								</div>
								<div className="flex items-center justify-between gap-2">
									<span className="text-gray-500 dark:text-gray-400">Wallet credits</span>
									<strong className="text-gray-900 dark:text-white">
										{creditsLoading ? '…' : (credits?.wallet_remaining ?? 0).toLocaleString()}
									</strong>
								</div>
								<div className="flex items-center justify-between gap-2">
									<span className="text-gray-500 dark:text-gray-400">Total remaining</span>
									<strong className="text-gray-900 dark:text-white">
										{creditsLoading ? '…' : (credits?.remaining_total ?? 0).toLocaleString()}
									</strong>
								</div>
								<div className="flex items-center justify-between gap-2 border-t border-gray-200 pt-2 dark:border-gray-600">
									<span className="text-gray-500 dark:text-gray-400">Fin messages used</span>
									<strong className="text-gray-900 dark:text-white">
										{chatUsage ? `${chatUsage.used} / ${chatUsage.limit}` : '…'}
									</strong>
								</div>
							</div>
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
									Balance: {formatCurrency(credits?.wallet_balance_cents ?? walletStatus.wallet.balance_cents ?? 0)}
								</span>
								{walletStatus.depositRequired && (
									<Button size="sm" onClick={() => setDepositOpen(true)}>
										Deposit
									</Button>
								)}
							</div>
						)}
						<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
							<div>
								<p className="font-medium text-gray-900 dark:text-white">Auto-recharge status</p>
								{walletStatus ? (
									walletAutoRecharge?.enabled ? (
										<p className="text-xs text-gray-500 dark:text-gray-400">
											Enabled · {formatCurrency((walletAutoRecharge.amount_cents ?? 0) / 100)} added when balance
											dips below {formatCurrency((walletAutoRecharge.threshold_cents ?? 0) / 100)}
										</p>
									) : (
										<p className="text-xs text-gray-500 dark:text-gray-400">Currently disabled</p>
									)
								) : (
									<p className="text-xs text-gray-500 dark:text-gray-400">Loading…</p>
								)}
							</div>
							<Button size="sm" variant="outline" onClick={() => setAutoRechargeOpen(true)}>
								Manage
							</Button>
						</div>
						<div className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800/30 dark:text-gray-400">
							<p className="font-medium text-gray-900 dark:text-white">How auto-recharge works</p>
							<ul className="mt-2 list-inside list-disc space-y-1">
								<li>Choose the amount we add to your wallet when the balance drops too low.</li>
								<li>Pick a threshold that triggers the top-up so you stay live.</li>
								<li>All charges use your default payment method (update it under Billing settings).</li>
							</ul>
						</div>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
							<Button variant="secondary" className="w-full" onClick={() => setDepositOpen(true)}>
								Deposit Funds
							</Button>
							<Button variant="outline" className="w-full" onClick={() => setAutoRechargeOpen(true)}>
								Manage Auto-Recharge
							</Button>
						</div>
					</div>
				) : (
					<p className="text-sm text-gray-500 dark:text-gray-400">No organization selected.</p>
				)}
			</div>

			<WalletDepositModal
				open={depositOpen || autoRechargeOpen}
				onClose={() => {
					setDepositOpen(false);
					setAutoRechargeOpen(false);
					refreshCredits();
					refetchPayment();
				}}
				forceAutoStep={autoRechargeOpen}
			/>
		</>
	);
}
