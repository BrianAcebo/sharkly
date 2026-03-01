import PageMeta from '../components/common/PageMeta';
import { Button } from '../components/ui/button';
import { mockUser } from '../lib/mockData';
import { CREDIT_COSTS, PLANS } from '../lib/credits';

export default function SettingsCredits() {
	const plan = PLANS[mockUser.plan];
	const pct = (mockUser.credits_remaining / mockUser.credits_monthly) * 100;

	return (
		<>
			<PageMeta title="Credits & Billing" description="Manage your credits" />
			<h1 className="font-montserrat text-xl font-bold text-gray-900 dark:text-white">
				Credits & Billing
			</h1>

			<div className="bg-brand-50 mt-6 rounded-xl p-6">
				<div className="flex items-center justify-between">
					<div>
						<div className="font-montserrat text-brand-600 dark:text-brand-400 text-xl font-extrabold">
							{plan.name} Plan
						</div>
						<p className="text-brand-600 dark:text-brand-400Dark mt-1 text-sm">
							${plan.price}/month · Renews March 23, 2026
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						className="border-brand-500 text-brand-600 dark:text-brand-400"
					>
						Upgrade to Scale →
					</Button>
				</div>
			</div>

			<div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 text-center dark:border-gray-700">
				<div className="font-montserrat text-brand-600 dark:text-brand-400 text-5xl font-extrabold">
					{mockUser.credits_remaining}
				</div>
				<p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
					credits remaining this month
				</p>
				<div className="mx-auto mt-4 h-2 max-w-xs overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
					<div className="bg-brand-500 h-full rounded-full" style={{ width: `${pct}%` }} />
				</div>
				<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Resets in 12 days</p>
				<Button variant="outline" size="sm" className="mt-4 border-gray-200 dark:border-gray-700">
					Buy Overage Credits
				</Button>
				<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
					$0.05 per credit · No expiry
				</p>
			</div>

			<div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700">
				<h3 className="mb-3 font-semibold text-gray-900 dark:text-white">Credit Costs</h3>
				<div className="space-y-2">
					{Object.entries(CREDIT_COSTS).map(([key, cost]) => (
						<div
							key={key}
							className="flex justify-between border-b border-gray-200 py-2 text-sm last:border-0 dark:border-gray-700"
						>
							<span className="text-gray-600 dark:text-gray-400">{key.replace(/_/g, ' ')}</span>
							<span className="text-brand-600 dark:text-brand-400 font-semibold">
								{cost} credits
							</span>
						</div>
					))}
				</div>
			</div>
		</>
	);
}
