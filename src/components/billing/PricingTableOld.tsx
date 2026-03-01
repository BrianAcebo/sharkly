import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { CheckCircle, Users, Coins } from 'lucide-react';
import { PlanCatalogRow, PlanCode } from '../../types/billing';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '../ui/dialog';
import { cn } from '../../utils/common';

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
	const [showTrialDisclaimer, setShowTrialDisclaimer] = useState(false);
	const additionalFeatures: Record<PlanCode, { description: string; features: string[] }> = {
		builder: {
			description: 'For business owners ready to start getting found on search engines.',
			features: ['Full content strategy', 'AI article generation']
		},
		builder_test: {
			description: 'For business owners ready to start getting found on search engines.',
			features: ['Full content strategy', 'AI article generation']
		},
		growth: {
			description: "For growing businesses that want to see what's actually working.",
			features: ['Everything in Builder', 'Rankings dashboard', 'Google Search Console integration']
		},
		growth_test: {
			description: "For growing businesses that want to see what's actually working.",
			features: [
				'Everything in Growth',
				'Google Search Console integration',
				'AI-powered analytics & insights'
			]
		},
		scale: {
			description: 'For serious operators who want every SEO advantage working for them.',
			features: [
				'Everything in Growth',
				'Technical SEO',
				'Image optimization',
				'Core web vitals monitoring'
			]
		},
		scale_test: {
			description: 'For serious operators who want every SEO advantage working for them.',
			features: [
				'Everything in Scale',
				'Technical SEO',
				'Image optimization',
				'Core web vitals monitoring'
			]
		},
		pro: {
			description: 'For power users and professionals who run SEO like a business.',
			features: ['Everything in Scale', 'White-label exports', 'Agency-ready reporting']
		},
		pro_test: {
			description: 'For power users and professionals who run SEO like a business.',
			features: ['Everything in Pro', 'White-label exports', 'Agency-ready reporting']
		}
	};
	const getPlanFeatures = (plan: PlanCatalogRow) => {
		const features = [
			{ icon: Users, text: `${plan.included_seats} seat${plan.included_seats !== 1 ? 's' : ''}` },
			{ icon: Coins, text: `${plan.included_credits.toLocaleString()} credits` }
		];

		return {
			features,
			description: additionalFeatures[plan.plan_code].description,
			additionalFeatures: additionalFeatures[plan.plan_code].features
		};
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
						const { features, description, additionalFeatures } = getPlanFeatures(plan);
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
								className={cn(
									'relative cursor-pointer transition-all duration-200',
									isSelected
										? 'border-blue-500 shadow-lg ring-2 ring-blue-500'
										: 'border-gray-200 hover:border-gray-300 hover:shadow-md',
									plan.plan_code === 'pro' || plan.plan_code === 'pro_test'
										? 'col-span-1 md:col-span-3'
										: 'col-span-1'
								)}
								onClick={() => onSelectPlan(plan.plan_code)}
							>
								{isSelected && (
									<div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
										<Badge className="bg-blue-500 px-3 py-1 text-white">
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
												<feature.icon className="mr-2 h-4 w-4 text-blue-500" />
												{feature.text}
											</div>
										))}
									</div>
									{additionalFeatures.length > 0 && (
										<div className="mt-4">
											<ul className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
												{additionalFeatures.map((feature) => (
													<li key={feature}>{feature}</li>
												))}
											</ul>
										</div>
									)}
									<div className="mt-4">
										<p className="text-xs text-gray-400 dark:text-gray-400">{description}</p>
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
				<>
					<TrialToggle
						checked={trialSelected}
						onRequestChange={(next) => {
							if (!next) return onTrialToggle(false);
							setShowTrialDisclaimer(true);
						}}
					/>

					<Dialog open={showTrialDisclaimer} onOpenChange={setShowTrialDisclaimer}>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>How the 7‑day pay‑as‑you‑go trial works</DialogTitle>
								<DialogDescription>
									During the trial, your monthly subscription won’t be charged until the 7 days are
									up. However, usage for LLM credits is billed as you go and must be paid during the
									trial.
								</DialogDescription>
							</DialogHeader>
							<DialogFooter className="flex gap-2 sm:justify-end">
								<button
									className="rounded-md border px-3 py-2 text-sm"
									onClick={() => {
										setShowTrialDisclaimer(false);
										onTrialToggle(false);
									}}
								>
									Cancel
								</button>
								<button
									className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white"
									onClick={() => {
										setShowTrialDisclaimer(false);
										onTrialToggle(true);
									}}
								>
									I Understand
								</button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</>
			)}
		</div>
	);
};

export default PricingTable;

function TrialToggle({
	checked,
	onRequestChange
}: {
	checked: boolean;
	onRequestChange: (next: boolean) => void;
}) {
	return (
		<div className="mt-6 flex items-center justify-center">
			<button
				type="button"
				onClick={() => onRequestChange(!checked)}
				className="group inline-flex items-center gap-3 rounded-full px-0 py-0"
			>
				<span
					className={`relative inline-flex h-5 w-10 items-center rounded-full transition ${checked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}`}
				>
					<span
						className={`absolute top-0 left-0 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : ''}`}
					></span>
				</span>
				<span className="text-sm text-gray-700 dark:text-gray-300">
					Start with a 7‑day pay‑as‑you‑go trial
				</span>
			</button>
		</div>
	);
}
