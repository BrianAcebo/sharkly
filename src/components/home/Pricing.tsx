import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle, Users, Clock, MessageSquare, Mail } from 'lucide-react';
import { toast } from 'sonner';
import type { PlanCatalogRow } from '../../types/billing';
import { apiGet } from '../../utils/api';

interface UsageRate {
	voice?: {
		amountCents: number | null;
		unit: string | null;
	};
	sms?: {
		amountCents: number | null;
		unit: string | null;
	};
}

const featureIcon = {
	seats: Users,
	minutes: Clock,
	sms: MessageSquare,
	emails: Mail
} as const;

type FeatureType = keyof typeof featureIcon;

const formatCurrency = (cents: number | null | undefined, { minimumFractionDigits = 0 } = {}) => {
	if (cents == null) return '—';
	return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits })}`;
};

const describeFeature = (plan: PlanCatalogRow, type: FeatureType) => {
	switch (type) {
		case 'seats':
			return `${plan.included_seats.toLocaleString()} seat${plan.included_seats === 1 ? '' : 's'}`;
		case 'minutes':
			return `${plan.included_minutes.toLocaleString()} minutes`;
		case 'sms':
			return `${plan.included_sms.toLocaleString()} SMS`;
		case 'emails':
			// return plan.included_emails > 0 ? `${plan.included_emails.toLocaleString()} emails` : 'Unlimited emails';
			return 'Unlimited emails';
		default:
			return '';
	}
};

const Pricing: React.FC = () => {
	const [plans, setPlans] = useState<PlanCatalogRow[] | null>(null);
	const [usageRates, setUsageRates] = useState<UsageRate | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const fetchPricing = async () => {
			try {
				setLoading(true);
				const [planData, rateData] = await Promise.all([
					apiGet<PlanCatalogRow[]>('/api/billing/public/plans'),
					apiGet<UsageRate>('/api/billing/public/usage-catalog'),
				]);
				setPlans(planData);
				setUsageRates(rateData);
			} catch (error) {
				console.error('Failed to load pricing', error);
				toast.error('Pricing is temporarily unavailable.');
				setPlans([]);
			} finally {
				setLoading(false);
			}
		};

		fetchPricing();
	}, []);

	const enrichedPlans = useMemo(() => {
		if (!plans) return [];
		return plans.map((plan, index) => ({
			...plan,
			popular: index === 1
		}));
	}, [plans]);

	const voiceRate = usageRates?.voice?.amountCents ?? null;
	const smsRate = usageRates?.sms?.amountCents ?? null;

	return (
		<section id="pricing" className="py-24 bg-gray-50 dark:bg-gray-900">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-16">
					<h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Simple, Transparent Pricing</h2>
					<p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
						Choose the plan that fits your team's needs. All plans include a 7‑day pay-as-you-go trial.
					</p>
				</div>

				<div className="grid grid-cols-1 gap-8 md:grid-cols-3">
					{loading && (!plans || plans.length === 0) ? (
						<div className="col-span-full flex justify-center py-12 text-gray-500">Loading pricing…</div>
					) : (
						enrichedPlans.map((plan) => (
							<Card
								key={plan.plan_code}
								className={`relative transition-all duration-200 hover:shadow-lg ${
									plan.popular ? 'border-red-500 ring-2 ring-red-500 shadow-lg scale-105' : 'border-gray-200 dark:border-gray-700'
								}`}
							>
								{plan.popular && (
									<div className="absolute -top-4 left-1/2 w-max -translate-x-1/2">
										<Badge className="bg-red-500 px-4 py-1 text-white">Most Popular</Badge>
									</div>
								)}

								<CardHeader className="pb-4 text-center">
									<CardTitle className="text-2xl font-semibold">{plan.name}</CardTitle>
									<div className="mt-4">
										<div className="text-4xl font-bold text-gray-900 dark:text-white">
											{formatCurrency(plan.base_price_cents)}
											<span className="text-lg font-normal text-gray-500">/month</span>
										</div>
									</div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Everything you need to grow with pay-as-you-go usage.
                </p>
								</CardHeader>

								<CardContent className="space-y-6 text-center">
									<div className="space-y-3">
										<h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Bundled:</h4>
										{(['seats', 'minutes', 'sms', 'emails'] as FeatureType[]).map((type) => {
											const Icon = featureIcon[type];
											return (
												<div key={type} className="flex items-center justify-center text-left text-sm text-gray-600 dark:text-gray-400">
													<Icon className="mr-3 h-4 w-4 text-red-500" />
													{describeFeature(plan, type)}
												</div>
											);
										})}
									</div>

									<div className="space-y-2">
										<h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Overages:</h4>
										<div className="text-xs text-gray-500 dark:text-gray-400">
											Voice minutes billed at {formatCurrency(voiceRate, { minimumFractionDigits: 2 })}/{usageRates?.voice?.unit ?? 'min'}
										</div>
										<div className="text-xs text-gray-500 dark:text-gray-400">
											SMS usage billed at {formatCurrency(smsRate, { minimumFractionDigits: 2 })}/{usageRates?.sms?.unit ?? 'sms'}
										</div>
										<div className="text-xs text-gray-500 dark:text-gray-400">Emails currently free</div>
									</div>

									<Button
										className={`w-full ${
											plan.popular
												? 'bg-red-600 text-white hover:bg-red-700'
												: 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100'
										}`}
									>
										Start 7-Day Trial
									</Button>
								</CardContent>
							</Card>
						))
						)}
				</div>

				<div className="mt-12 text-center">
					<div className="inline-flex items-center space-x-2 rounded-lg bg-green-50 px-6 py-3 text-green-700 dark:bg-green-900/20 dark:text-green-300">
						<CheckCircle className="h-5 w-5" />
						<span className="font-medium">7-day pay-as-you-go trial on all plans</span>
					</div>
				</div>
			</div>
		</section>
	);
};

export default Pricing;
