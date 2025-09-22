import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { CheckCircle, Users, Clock, MessageSquare, Mail, DollarSign } from 'lucide-react';
import { PlanCatalogRow } from '../../types/billing';

interface PricingTableProps {
	plans: PlanCatalogRow[];
	selectedPlan: string | null;
	onSelectPlan: (planCode: string) => void;
	showTrialOption?: boolean;
	trialSelected?: boolean;
	onTrialToggle?: (checked: boolean) => void;
}

const PricingTable: React.FC<PricingTableProps> = ({
	plans,
	selectedPlan,
	onSelectPlan,
	showTrialOption = true,
	trialSelected = false,
	onTrialToggle
}) => {
	const getPlanFeatures = (plan: PlanCatalogRow) => {
		const features = [
			{ icon: Users, text: `${plan.included_seats} seat${plan.included_seats !== 1 ? 's' : ''}` },
			{ icon: Clock, text: `${plan.included_minutes.toLocaleString()} minutes` },
			{ icon: MessageSquare, text: `${plan.included_sms.toLocaleString()} SMS` },
			{ icon: Mail, text: `${plan.included_emails.toLocaleString()} emails` }
		];

		const overages = ['$0.18/min overage', '$0.04/SMS overage', '$0.01/email overage'];

		return { features, overages };
	};

	const getPlanMargin = (plan: PlanCatalogRow) => {
		switch (plan.plan_code) {
			case 'starter':
				return { allInCost: 62.35, margin: 56.65, percentage: 48 };
			case 'growth':
				return { allInCost: 293, margin: 206, percentage: 41 };
			case 'scale':
				return { allInCost: 530, margin: 369, percentage: 41 };
			default:
				return { allInCost: 0, margin: 0, percentage: 0 };
		}
	};

	return (
		<div className="space-y-6">
			<div className="text-center">
				<h2 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Choose Your Plan</h2>
				<p className="text-gray-600 dark:text-gray-400">
					Select the plan that best fits your organization's needs
				</p>
			</div>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
				{plans && plans.length > 0 ? (
					plans.map((plan) => {
						const { features, overages } = getPlanFeatures(plan);
						const { allInCost, margin, percentage } = getPlanMargin(plan);
						const isSelected = selectedPlan === plan.plan_code;
						const effectivePrice =
							plan.plan_code === 'growth'
								? '$100/seat'
								: plan.plan_code === 'scale'
									? '$90/seat'
									: null;

						return (
							<Card
								key={plan.plan_code}
								className={`relative cursor-pointer transition-all duration-200 ${
									isSelected
										? 'border-red-500 shadow-lg ring-2 ring-red-500'
										: 'border-gray-200 hover:border-gray-300 hover:shadow-md'
								}`}
								onClick={() => onSelectPlan(plan.plan_code)}
							>
								{isSelected && (
									<div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
										<Badge className="bg-red-500 px-3 py-1 text-white">
											<CheckCircle className="mr-1 h-3 w-3" />
											Selected
										</Badge>
									</div>
								)}

								<CardHeader className="pb-4 text-center">
									<CardTitle className="text-xl font-semibold">{plan.name}</CardTitle>
									<div className="mt-2">
										<div className="text-3xl font-bold text-gray-900 dark:text-white">
											${plan.base_price_cents / 100}
											<span className="text-sm font-normal text-gray-500">/mo</span>
										</div>
										{effectivePrice && (
											<div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
												{effectivePrice} effective
											</div>
										)}
									</div>
								</CardHeader>

								<CardContent className="space-y-4 text-center">
									{/* Bundled Features */}
									<div className="space-y-2">
										<h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
											Bundled:
										</h4>
										{features.map((feature, index) => (
											<div
												key={index}
												className="flex items-center justify-center text-sm text-gray-600 dark:text-gray-400"
											>
												<feature.icon className="mr-2 h-4 w-4 text-red-500" />
												{feature.text}
											</div>
										))}
									</div>

									{/* Overages */}
									<div className="space-y-1">
										<h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
											Overages:
										</h4>
										{overages.map((overage, index) => (
											<div key={index} className="text-xs text-gray-500 dark:text-gray-400">
												{overage}
											</div>
										))}
									</div>
								</CardContent>
							</Card>
						);
					})
				) : (
					<div className="col-span-full py-8 text-center">
						<p className="text-gray-500">Loading plans...</p>
					</div>
				)}
			</div>

			{showTrialOption && onTrialToggle && (
				<div className="mt-6 flex items-center justify-center space-x-2">
					<input
						type="checkbox"
						id="trial"
						checked={trialSelected}
						onChange={(e) => onTrialToggle(e.target.checked)}
						className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
					/>
					<label htmlFor="trial" className="text-sm text-gray-700 dark:text-gray-300">
						Start with a 7-day free trial
					</label>
				</div>
			)}
		</div>
	);
};

export default PricingTable;
