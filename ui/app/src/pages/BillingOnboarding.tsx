import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import Input from '../components/form/input/InputField';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import { CheckCircle, ArrowRight, ArrowLeft, Users, Coins, MessageCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';
import PageMeta from '../components/common/PageMeta';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import {
	BillingOnboardingViewState,
	PlanCatalogRow,
	OrgOnboardRequest,
	OrgOnboardResponse,
	PostalAddress,
	PlanCode
} from '../types/billing';
import { getMarketingUrl } from '../utils/urls';

const BillingOnboarding: React.FC = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const { setTitle } = useBreadcrumbs();

	const [plans, setPlans] = useState<PlanCatalogRow[]>([]);
	const [state, setState] = useState<BillingOnboardingViewState>({
		step: 1,
		selectedPlan: null,
		trialSelected: false,
		orgId: user?.organization_id || '',
		orgName: '',
		website: '',
		industry: '',
		ein: '',
		tz: 'America/New_York',
		address: {
			street: '',
			city: '',
			state: '',
			zip: '',
			country: 'US'
		},
		loading: false,
		error: null,
		success: false
	});

	useEffect(() => {
		setTitle('Billing Onboarding');
		fetchPlans();
	}, [setTitle]);

	const fetchPlans = async () => {
		try {
			const response = await api.get('/api/billing/plans');
			const data = await response.json();
			if (data.plans) {
				// Pro plan not offered yet — hide from onboarding
				const filtered = data.plans.filter(
					(p: PlanCatalogRow) => !['pro', 'pro_test'].includes(p.plan_code)
				);
				setPlans(filtered);
			}
		} catch (error) {
			console.error('Error fetching plans:', error);
			toast.error('Failed to load plans');
		}
	};

	const handlePlanSelect = (planCode: PlanCode) => {
		setState((prev) => ({ ...prev, selectedPlan: planCode }));
	};

	const handleTrialToggle = (checked: boolean) => {
		setState((prev) => ({ ...prev, trialSelected: checked }));
	};

	const handleInputChange = (field: keyof BillingOnboardingViewState, value: any) => {
		setState((prev) => ({ ...prev, [field]: value }));
	};

	const handleAddressChange = (field: keyof PostalAddress, value: string) => {
		setState((prev) => ({
			...prev,
			address: { ...prev.address, [field]: value }
		}));
	};

	const handleNext = () => {
		if (state.step === 1) {
			if (!state.selectedPlan) {
				toast.error('Please select a plan');
				return;
			}
			setState((prev) => ({ ...prev, step: 2 }));
		}
	};

	const handleBack = () => {
		if (state.step === 2) {
			setState((prev) => ({ ...prev, step: 1 }));
		}
	};

	const handleSubmit = async () => {
		if (!state.selectedPlan || !state.orgId || !state.orgName) {
			toast.error('Please fill in all required fields');
			return;
		}

		setState((prev) => ({ ...prev, loading: true, error: null }));

		try {
			const request: OrgOnboardRequest = {
				orgId: state.orgId,
				name: state.orgName,
				planCode: state.selectedPlan,
				trialDays: state.trialSelected ? 14 : undefined,
				website: state.website || undefined,
				industry: state.industry || undefined,
				ein: state.ein || undefined,
				tz: state.tz,
				address: Object.values(state.address).some((v) => v) ? state.address : undefined
			};

			const resp = await api.post(
				'/api/billing/orgs/onboard',
				request as unknown as Record<string, unknown>
			);
			if (!resp.ok) {
				const err = await resp.json().catch(() => ({}));
				throw new Error(
					(err as { error?: string; message?: string }).error ||
						(err as { message?: string }).message ||
						'Failed to setup billing'
				);
			}
			const data = (await resp.json()) as OrgOnboardResponse;
			if ((data as unknown as { error?: string }).error) {
				throw new Error((data as unknown as { error?: string }).error || 'Failed to setup billing');
			}
			setState((prev) => ({ ...prev, success: true, loading: false }));
			toast.success('Billing setup completed successfully!');
		} catch (error) {
			console.error('Error setting up billing:', error);
			setState((prev) => ({
				...prev,
				loading: false,
				error: error instanceof Error ? error.message : 'Failed to setup billing'
			}));
			toast.error('Failed to setup billing');
		}
	};

	const renderPlanCard = (plan: PlanCatalogRow) => {
		const isSelected = state.selectedPlan === plan.plan_code;
		const price = (plan.base_price_cents / 100).toFixed(0);

		return (
			<Card
				key={plan.plan_code}
				className={`cursor-pointer transition-all ${
					isSelected ? 'border-blue-500 ring-2 ring-blue-500' : 'hover:border-gray-300'
				}`}
				onClick={() => handlePlanSelect(plan.plan_code as PlanCode)}
			>
				<CardHeader className="text-center">
					<div className="mb-2 flex items-center justify-center">
						{isSelected && <CheckCircle className="mr-2 h-5 w-5 text-blue-500" />}
						<h3 className="text-xl font-semibold">{plan.name}</h3>
					</div>
					<div className="text-3xl font-bold text-gray-900 dark:text-white">
						${price}
						<span className="text-sm font-normal text-gray-500">/month</span>
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						<div className="flex items-center text-sm">
							<Users className="mr-2 h-4 w-4 text-gray-500" />
							<span>
								{plan.included_seats} seat{plan.included_seats !== 1 ? 's' : ''}
							</span>
						</div>
						<div className="flex items-center text-sm">
							<Coins className="mr-2 h-4 w-4 text-gray-500" />
							<span>{plan.included_credits.toLocaleString()} credits</span>
						</div>
						<div className="flex items-center text-sm">
							<MessageCircle className="mr-2 h-4 w-4 text-gray-500" />
							<span>
								{(plan.included_chat_messages ?? 0) > 0
									? `Fin AI Assistant (${(plan.included_chat_messages ?? 0).toLocaleString()} messages/mo)`
									: 'Fin AI Assistant — Upgrade to Growth'}
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	};

	const renderStep1 = () => (
		<div className="space-y-6">
			<div className="text-center">
				<h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Choose Your Plan</h2>
				<p className="text-gray-600 dark:text-gray-400">
					Select the plan that best fits your organization's needs
				</p>
				<a
					href={`${getMarketingUrl()}/pricing`}
					target="_blank"
					rel="noopener noreferrer"
					className="mt-2 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
				>
					View full feature comparison
					<ExternalLink className="size-3.5" />
				</a>
			</div>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-3">{plans.map(renderPlanCard)}</div>

			<div className="flex items-center justify-center space-x-2">
				<Checkbox id="trial" checked={state.trialSelected} onCheckedChange={handleTrialToggle} />
				<label htmlFor="trial" className="text-sm text-gray-700 dark:text-gray-300">
					Start with a 7‑day pay‑as‑you‑go trial
				</label>
			</div>

			{state.trialSelected && (
				<div className="mx-auto mt-4 max-w-2xl rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-900">
					<strong>During your 7‑day pay‑as‑you‑go trial</strong>, monthly plan fees are $0, but any
					LLM usage is billed separately and due immediately. You will receive separate invoices for
					usage during the trial.
				</div>
			)}

			<div className="flex justify-end">
				<Button onClick={handleNext} disabled={!state.selectedPlan}>
					Next
					<ArrowRight className="ml-2 h-4 w-4" />
				</Button>
			</div>
		</div>
	);

	const renderStep2 = () => (
		<div className="space-y-6">
			<div className="text-center">
				<h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Business Details</h2>
				<p className="text-gray-600 dark:text-gray-400">Tell us about your organization</p>
			</div>

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
				<div>
					<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
						Organization Name *
					</label>
					<Input
						value={state.orgName}
						onChange={(e) => handleInputChange('orgName', e.target.value)}
						placeholder="Enter organization name"
						required
					/>
				</div>

				<div>
					<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
						Website
					</label>
					<Input
						value={state.website}
						onChange={(e) => handleInputChange('website', e.target.value)}
						placeholder="https://example.com"
						type="url"
					/>
				</div>

				<div>
					<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
						Industry
					</label>
					<Input
						value={state.industry}
						onChange={(e) => handleInputChange('industry', e.target.value)}
						placeholder="e.g., Technology, Healthcare, Finance"
					/>
				</div>

				<div>
					<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
						EIN (Tax ID)
					</label>
					<Input
						value={state.ein}
						onChange={(e) => handleInputChange('ein', e.target.value)}
						placeholder="12-3456789"
					/>
				</div>

				<div>
					<label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
						Timezone
					</label>
					<Select value={state.tz} onValueChange={(value) => handleInputChange('tz', value)}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="America/New_York">Eastern Time</SelectItem>
							<SelectItem value="America/Chicago">Central Time</SelectItem>
							<SelectItem value="America/Denver">Mountain Time</SelectItem>
							<SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<div>
				<h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
					Address (Optional)
				</h3>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div className="md:col-span-2">
						<Input
							value={state.address.street}
							onChange={(e) => handleAddressChange('street', e.target.value)}
							placeholder="Street Address"
						/>
					</div>
					<Input
						value={state.address.city}
						onChange={(e) => handleAddressChange('city', e.target.value)}
						placeholder="City"
					/>
					<Input
						value={state.address.state}
						onChange={(e) => handleAddressChange('state', e.target.value)}
						placeholder="State"
					/>
					<Input
						value={state.address.zip}
						onChange={(e) => handleAddressChange('zip', e.target.value)}
						placeholder="ZIP Code"
					/>
					<Input
						value={state.address.country}
						onChange={(e) => handleAddressChange('country', e.target.value)}
						placeholder="Country"
					/>
				</div>
			</div>

			{state.error && (
				<div className="rounded-md border border-red-200 bg-red-50 p-4">
					<p className="text-sm text-red-600">{state.error}</p>
				</div>
			)}

			<div className="flex justify-between">
				<Button variant="outline" onClick={handleBack}>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back
				</Button>
				<Button onClick={handleSubmit} disabled={state.loading}>
					{state.loading ? 'Setting up...' : 'Complete Setup'}
				</Button>
			</div>
		</div>
	);

	const renderSuccess = () => (
		<div className="space-y-6 text-center">
			<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
				<CheckCircle className="h-8 w-8 text-green-600" />
			</div>

			<div>
				<h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
					Billing Setup Complete!
				</h2>
				<p className="text-gray-600 dark:text-gray-400">
					Your organization is now set up with the {state.selectedPlan} plan.
					{state.trialSelected && (
						<span className="mt-2 block">
							<Badge variant="secondary">7‑day pay‑as‑you‑go trial active</Badge>
						</span>
					)}
				</p>
			</div>

			<Button onClick={() => navigate('/organization')} size="lg">
				Go to Organization
			</Button>
		</div>
	);

	return (
		<>
			<PageMeta title="Billing Onboarding" description="Set up billing for your organization" />
			<div className="container mx-auto max-w-4xl px-4 py-8">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">Billing Onboarding</h1>
					<p className="mt-2 text-gray-600 dark:text-gray-400">
						Set up billing and subscription for your organization
					</p>
				</div>

				<Card>
					<CardContent className="p-8">
						{state.success ? (
							renderSuccess()
						) : (
							<>
								{state.step === 1 ? renderStep1() : renderStep2()}

								{/* Progress indicator */}
								<div className="mt-8 flex items-center justify-center space-x-4">
									<div
										className={`flex h-8 w-8 items-center justify-center rounded-full ${
											state.step >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
										}`}
									>
										1
									</div>
									<div className={`h-1 w-16 ${state.step >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`} />
									<div
										className={`flex h-8 w-8 items-center justify-center rounded-full ${
											state.step >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
										}`}
									>
										2
									</div>
								</div>
							</>
						)}
					</CardContent>
				</Card>
			</div>
		</>
	);
};

export default BillingOnboarding;
