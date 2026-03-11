/**
 * Settings: Credits & Billing
 * Shows real org credit balance, plan info, monthly usage, and cost reference.
 * Links to /billing for full invoice history, wallet top-ups, and plan changes.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '../components/common/PageMeta';
import { Button } from '../components/ui/button';
import { CREDIT_COSTS, PLANS } from '../lib/credits';
import { CREDIT_COST_LABELS } from '../../shared/credits';
import { STRIPE_CUSTOMER_PORTAL_URL } from '../utils/billing';
import { useOrganization } from '../hooks/useOrganization';
import { useCredits } from '../hooks/useCredits';
import { getOrgCreditUsageMonth, type MonthlyUsage } from '../api/billingCredits';
import { ExternalLink, Coins, Zap, RefreshCw, Loader2 } from 'lucide-react';

export default function SettingsCredits() {
	const { organization, loading: orgLoading } = useOrganization();
	const {
		data: credits,
		loading: creditsLoading,
		refresh: refreshCredits
	} = useCredits(organization?.id ?? null);
	const [usage, setUsage] = useState<MonthlyUsage | null>(null);
	const [usageLoading, setUsageLoading] = useState(false);

	useEffect(() => {
		if (!organization?.id) return;
		setUsageLoading(true);
		getOrgCreditUsageMonth(organization.id)
			.then(setUsage)
			.catch(() => setUsage(null))
			.finally(() => setUsageLoading(false));
	}, [organization?.id]);

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
				<Button variant="ghost" size="sm" onClick={refreshCredits} disabled={creditsLoading}>
					{creditsLoading ? (
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
			<div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
					<Link to="/billing" className="mt-3 block">
						<Button variant="outline" size="sm" className="w-full">
							Buy Overage Credits · $0.05 each
						</Button>
					</Link>
				</div>
			</div>

			{/* Monthly usage summary */}
			{(usageLoading || usage) && (
				<div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
					<h3 className="mb-3 font-semibold text-gray-900 dark:text-white">This Month's Usage</h3>
					{usageLoading ? (
						<div className="flex items-center gap-2 text-sm text-gray-400">
							<Loader2 className="size-4 animate-spin" /> Loading usage…
						</div>
					) : usage ? (
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
							<div>
								<div className="text-2xl font-bold text-gray-900 dark:text-white">
									{usage.total_credits_spent.toLocaleString()}
								</div>
								<div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Credits used</div>
							</div>
							<div>
								<div className="text-2xl font-bold text-gray-900 dark:text-white">
									{usage.from_included_credits.toLocaleString()}
								</div>
								<div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">From plan</div>
							</div>
							<div>
								<div className="text-2xl font-bold text-gray-900 dark:text-white">
									{usage.from_wallet_credits.toLocaleString()}
								</div>
								<div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">From wallet</div>
							</div>
							<div>
								<div className="text-2xl font-bold text-gray-900 dark:text-white">
									{usage.event_count}
								</div>
								<div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">AI actions</div>
							</div>
						</div>
					) : null}
				</div>
			)}

			{/* Credit cost reference */}
			<div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
				<h3 className="mb-3 font-semibold text-gray-900 dark:text-white">Credit Costs</h3>
				<div className="divide-y divide-gray-100 dark:divide-gray-800">
					{Object.entries(CREDIT_COSTS).map(([key, cost]) => (
						<div key={key} className="flex items-center justify-between py-2.5 text-sm">
							<span className="text-gray-600 dark:text-gray-400">
								{CREDIT_COST_LABELS[key] ?? key.replace(/_/g, ' ').toLowerCase()}
							</span>
							<span className="text-brand-600 dark:text-brand-400 font-semibold tabular-nums">
								{cost} credits
							</span>
						</div>
					))}
				</div>
			</div>

			<p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-600">
				Full invoice history and payment methods in{' '}
				<Link to="/billing" className="text-brand-500 hover:underline">
					Billing
				</Link>
			</p>
		</>
	);
}
