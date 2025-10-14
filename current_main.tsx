import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import { supabase } from '../../utils/supabaseClient';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import Input from '../form/input/InputField';
import Label from '../form/Label';
import { motion, AnimatePresence } from 'framer-motion';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import PricingTable from './PricingTable';
import { PlanCatalogRow } from '../../types/billing';
import { ArrowRight, ArrowLeft, CheckCircle, Users, Clock, Shield } from 'lucide-react';
import BrandForm from '../sms/BrandForm';
import CampaignForm from '../sms/CampaignForm';
import TollFreeForm from '../sms/TollFreeForm';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

interface SeamlessBillingFlowProps {
	onClose: () => void;
}

type FlowStep = 'organization' | 'plan' | 'payment' | 'sms-verification' | 'success';

const PaymentForm: React.FC<{
	orgName: string;
	selectedPlan: PlanCatalogRow;
	trialSelected: boolean;
	onSuccess: () => void;
	onBack: () => void;
	onError: (message: string) => void;
	isLoading: boolean;
	setIsLoading: (loading: boolean) => void;
	setOrgId: (id: string) => void;
}> = ({
	orgName,
	selectedPlan,
	trialSelected,
	onSuccess,
	onBack,
	onError,
	isLoading,
	setIsLoading,
	setOrgId
}) => {
	const stripe = useStripe();
	const elements = useElements();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!stripe || !elements) {
			return;
		}

		setIsLoading(true);
		try {
			// Confirm payment with Stripe
			const { error: stripeError } = await stripe.confirmPayment({
				elements,
				redirect: 'if_required'
			});

			if (stripeError) {
				onError(stripeError.message || 'Payment failed');
				return;
			}

			// Payment successful, now create organization and subscription
			toast.success('Payment successful');
			
			// Create organization with user as owner using billing onboarding
			const { data: { session } } = await supabase.auth.getSession();
			if (!session?.access_token) {
				onError('Not authenticated');
				return;
			}

			const response = await fetch('/api/billing/orgs/onboard', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${session.access_token}`
				},
				body: JSON.stringify({
					name: orgName,
					planCode: selectedPlan.plan_code,
					trialDays: trialSelected ? 7 : 0, // Include trial days if selected
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
					}
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create organization');
			}

			const result = await response.json();
			
			// Capture the organization ID from the response
			if (result.org && result.org.id) {
				setOrgId(result.org.id);
			}
			
			if (trialSelected) {
				toast.success('Organization and trial subscription created successfully');
                toast.success('Your 7-day pay-as-you-go trial has begun!');
			} else {
				toast.success('Organization and subscription created successfully');
			}
			
			// Don't refresh user context yet - let user complete SMS verification first
			await onSuccess();
		} catch (error) {
			console.error('Error:', error);
			onError(error instanceof Error ? error.message : 'Payment failed');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col">
			<div className="space-y-6">
				<div className="text-center">
					<h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
						Complete Your Setup
					</h3>
					<p className="text-gray-600 dark:text-gray-400">
						You're about to create <strong>{orgName}</strong> with the{' '}
						<strong>{selectedPlan.name}</strong> plan.
                        {trialSelected && ' This includes a 7-day pay-as-you-go trial.'}
					</p>
				</div>

				{/* Plan Summary */}
				<Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<h4 className="font-medium text-gray-900 dark:text-white">{selectedPlan.name}</h4>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									${selectedPlan.base_price_cents / 100}/month
								</p>
							</div>
							<div className="text-right text-sm text-gray-600 dark:text-gray-400">
								<div className="flex items-center">
									<Users className="mr-1 h-4 w-4" />
									{selectedPlan.included_seats} seat{selectedPlan.included_seats !== 1 ? 's' : ''}
								</div>
								<div className="flex items-center">
									<Clock className="mr-1 h-4 w-4" />
									{selectedPlan.included_minutes.toLocaleString()} min
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<PaymentElement options={{ layout: { type: 'tabs', defaultCollapsed: false } }} />
				{isLoading && <div className="text-sm text-red-500">Processing payment...</div>}
			</div>
			<div className="mt-6 flex items-center gap-3 px-2 lg:justify-end">
				<Button size="sm" variant="outline" onClick={onBack} disabled={isLoading}>
					Back
				</Button>
				<Button size="sm" type="submit" disabled={isLoading}>
					{isLoading ? 'Processing...' : 'Complete'}
				</Button>
			</div>
		</form>
	);
};

const SeamlessBillingFlow: React.FC<SeamlessBillingFlowProps> = ({ onClose }) => {
	const { user, refreshUser } = useAuth();
	const navigate = useNavigate();
	const { setTitle } = useBreadcrumbs();

	const [currentStep, setCurrentStep] = useState<FlowStep>('organization');
	const [plans, setPlans] = useState<PlanCatalogRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [clientSecret, setClientSecret] = useState<string | null>(null);
	const [completedSteps, setCompletedSteps] = useState<FlowStep[]>([]);

	// Form data
	const [orgName, setOrgName] = useState('');
	const [selectedPlan, setSelectedPlan] = useState<PlanCatalogRow | null>(null);
	const [trialSelected, setTrialSelected] = useState(false);
	const [orgId, setOrgId] = useState<string | null>(null);

	useEffect(() => {
		setTitle('Get Started');
		fetchPlans();
	}, [setTitle]);

	const fetchPlans = async () => {
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();

			if (!session) {
				toast.error('Not authenticated');
				return;
			}

			const response = await fetch('/api/billing/plans', {
				headers: {
					Authorization: `Bearer ${session.access_token}`,
					'Content-Type': 'application/json'
				}
			});

			const data = await response.json();
			const { plans } = data;

			setPlans(plans);
			setSelectedPlan(plans[1]);
		} catch (error) {
			console.error('Error fetching plans:', error);
			toast.error('Failed to fetch plans');
		}
	};

	const handleNext = async () => {
		if (currentStep === 'organization') {
			if (!orgName.trim()) {
				setError('Organization name is required');
				return;
			}
			setCompletedSteps(['organization']);
			setCurrentStep('plan');
			setError(null);
		} else if (currentStep === 'plan') {
			if (!selectedPlan) {
				setError('Please select a plan');
				return;
			}
			setCompletedSteps(['organization', 'plan']);
			
			// For both trials and paid plans, create payment intent (trials still need payment method)
			setLoading(true);
			try {
				const { data: { session } } = await supabase.auth.getSession();
				
				if (!session?.access_token) {
					setError('You must be logged in to subscribe');
					return;
				}

				const response = await fetch('/api/payments/create-intent', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${session.access_token}`
					},
					body: JSON.stringify({
						amount: selectedPlan.base_price_cents,
						currency: 'usd'
					})
				});

				if (!response.ok) {
					throw new Error('Failed to create payment intent');
				}

				const data = await response.json();
				
				if (data.clientSecret) {
					setClientSecret(data.clientSecret);
					setCompletedSteps(['organization', 'plan', 'payment']);
					setCurrentStep('payment');
					setError(null);
				} else {
					throw new Error('No client secret received');
				}
			} catch (error) {
				console.error('Error creating payment intent:', error);
				setError((error as { message?: string })?.message || 'Failed to prepare payment');
			} finally {
				setLoading(false);
			}
		}
	};

	const handleBack = () => {
		if (currentStep === 'plan') {
			setCompletedSteps(['organization']);
			setCurrentStep('organization');
		} else if (currentStep === 'payment') {
			setCompletedSteps(['organization', 'plan']);
			setCurrentStep('plan');
		} else if (currentStep === 'sms-verification') {
			setCompletedSteps(['organization', 'plan', 'payment']);
			setCurrentStep('payment');
		}
		setError(null);
	};

	const handleSuccess = async () => {
		setCompletedSteps(['organization', 'plan', 'payment']);
		setCurrentStep('sms-verification');
		toast.success('Organization created successfully!');
	};

	const handleSmsVerificationComplete = () => {
		setCompletedSteps(['organization', 'plan', 'payment', 'sms-verification', 'success']);
		setCurrentStep('success');
		toast.success('SMS verification setup completed!');
	};

	const handleGoToDashboard = async () => {
		// Refresh user context to update organization data
		await refreshUser();
		// Close the billing flow modal
		onClose();
		// Navigate to organization page
		navigate('/organization');
	};

	const renderStepContent = () => {
		switch (currentStep) {
			case 'organization':
				return (
					<div className="space-y-6">
						<div className="text-center">
							<h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
								Create Your Organization
							</h3>
							<p className="text-gray-600 dark:text-gray-400">
								Let's start by giving your organization a name
							</p>
						</div>

						<div className="mx-auto mb-4 max-w-md">
							<Label htmlFor="orgName">Organization Name</Label>
							<Input
								id="orgName"
								value={orgName}
								onChange={(e) => setOrgName(e.target.value)}
								placeholder="My Company Inc."
								required
							/>
						</div>

						<div className="flex justify-end">
							<Button onClick={handleNext} disabled={!orgName.trim()}>
								Next: Choose Plan
								<ArrowRight className="ml-2 h-4 w-4" />
							</Button>
						</div>
					</div>
				);

			case 'plan':
				return (
					<div className="space-y-6">
						<PricingTable
							plans={plans}
							selectedPlan={selectedPlan?.plan_code || null}
							onSelectPlan={(planCode) => {
								const plan = plans.find((p) => p.plan_code === planCode);
								if (plan) {
									setSelectedPlan(plan);
									setError(null);
								}
							}}
							showTrialOption={true}
							trialSelected={trialSelected}
							onTrialToggle={setTrialSelected}
						/>

						<div className="flex justify-between">
							<Button variant="outline" onClick={handleBack}>
								<ArrowLeft className="mr-2 h-4 w-4" />
								Back
							</Button>
							<Button onClick={handleNext} disabled={!selectedPlan}>
								Next: Payment Details
								<ArrowRight className="ml-2 h-4 w-4 text-red-500" />
							</Button>
						</div>
					</div>
				);

		case 'payment':
			return selectedPlan ? (
				clientSecret ? (
					<Elements
						stripe={stripePromise}
						options={{
							clientSecret,
							appearance: {
								theme: 'flat',
								variables: {
									colorPrimary: '#f6339a'
								}
							}
						}}
					>
						<PaymentForm
							orgName={orgName}
							selectedPlan={selectedPlan}
							trialSelected={trialSelected}
							onSuccess={handleSuccess}
							onBack={handleBack}
							onError={setError}
							isLoading={loading}
							setIsLoading={setLoading}
							setOrgId={setOrgId}
						/>
					</Elements>
				) : (
					<div className="py-8 text-center">
						<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-red-500"></div>
						<p className="text-gray-600">Preparing payment...</p>
					</div>
				)
			) : null;

		case 'sms-verification':
			return orgId ? (
				<div className="space-y-6">
					<div className="text-center">
						<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
							<Shield className="h-6 w-6 text-blue-600" />
						</div>
						<h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
							SMS Verification Setup
						</h2>
						<p className="mb-4 text-gray-600 dark:text-gray-400">
							This step is <strong>optional</strong> but highly recommended for better SMS delivery.
						</p>
					</div>

					{/* Important Information Card */}
					<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
						<div className="flex items-start space-x-3">
							<div className="flex-shrink-0">
								<Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
							</div>
							<div className="flex-1">
								<h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
									Why verify your business for SMS?
								</h3>
								<div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
									<p className="mb-2">
										Phone carriers now require verified business identity to reduce spam. 
										Despite our provision of a quality phone number, without verification, your messages might be seen as "unregistered" numbers.
									</p>
									<div className="space-y-1">
										<p><strong>Without verification:</strong></p>
										<ul className="ml-4 list-disc space-y-1">
											<li>Lower message delivery rates</li>
											<li>Higher chance of messages being blocked</li>
											<li>Slower sending speeds</li>
										</ul>
									</div>
									<div className="mt-3 space-y-1">
										<p><strong>With verification:</strong></p>
										<ul className="ml-4 list-disc space-y-1">
											<li>Higher message delivery rates</li>
											<li>Faster sending speeds</li>
											<li>Better protection against spam filters</li>
										</ul>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* SMS Verification Forms */}
					<div className="space-y-6">
						<BrandForm 
							orgId={orgId} 
							onSave={() => {}} 
							userRole={user?.role}
						/>
						<CampaignForm 
							orgId={orgId} 
							onSave={() => {}} 
							onSubmit10DLC={() => {}} 
							userRole={user?.role}
						/>
						<TollFreeForm 
							orgId={orgId} 
							onSubmit={() => {}} 
							userRole={user?.role}
						/>
					</div>

					<div className="flex justify-between">
						<Button variant="outline" onClick={handleBack}>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back
						</Button>
						<div className="flex space-x-3">
							<Button variant="outline" onClick={handleGoToDashboard}>
								Skip Verification
							</Button>
							<Button onClick={handleSmsVerificationComplete}>
								Complete Verification
								<ArrowRight className="ml-2 h-4 w-4" />
							</Button>
						</div>
					</div>

					{/* Optional Note */}
					<div className="text-center">
						<p className="text-xs text-gray-500 dark:text-gray-400">
							💡 You can complete SMS verification later in your organization settings
						</p>
					</div>
				</div>
			) : (
				<div className="py-8 text-center">
					<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-red-500"></div>
					<p className="text-gray-600">Loading verification setup...</p>
				</div>
			);

		case 'success':
				return (
					<div className="space-y-6 text-center">
						<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
							<CheckCircle className="h-8 w-8 text-green-600" />
						</div>
						<div>
							<h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
								Welcome to {orgName}!
							</h2>
							<p className="text-gray-600 dark:text-gray-400">
								Your organization has been created successfully.
                                {trialSelected && ' Enjoy your 7-day pay-as-you-go trial!'}
							</p>
						</div>
						<Button onClick={handleGoToDashboard} size="lg">
							Go to Dashboard
						</Button>
					</div>
				);

			default:
				return null;
		}
	};

	return (
		<div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
			<div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-900">
				<div className="p-6">
					{/* Header */}
					<div className="mb-6 flex items-center justify-between">
						<h2 className="text-2xl font-bold text-gray-900 dark:text-white">Get Started</h2>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
						>
							✕
						</button>
					</div>

					{/* Progress Steps */}
					<div className="mb-8">
						<div className="flex items-center justify-center space-x-4">
							{/* Step 1: Organization */}
							<div
								className={`flex h-8 w-8 items-center justify-center rounded-full ${
									currentStep === 'organization' || completedSteps.includes('organization')
										? 'bg-red-500 text-white'
										: 'bg-gray-200 text-gray-500'
								}`}
							>
								1
							</div>
							<div
								className={`h-1 w-16 ${currentStep === 'plan' || currentStep === 'payment' || currentStep === 'sms-verification' || currentStep === 'success' ? 'bg-red-500' : 'bg-gray-200'}`}
							/>
							
							{/* Step 2: Plan */}
							<div
								className={`flex h-8 w-8 items-center justify-center rounded-full ${
									currentStep === 'plan' || completedSteps.includes('plan')
										? 'bg-red-500 text-white'
										: currentStep === 'payment' || currentStep === 'sms-verification' || currentStep === 'success'
											? 'bg-red-500 text-white'
											: 'bg-gray-200 text-gray-500'
								}`}
							>
								2
							</div>
							<div
								className={`h-1 w-16 ${currentStep === 'payment' || currentStep === 'sms-verification' || currentStep === 'success' ? 'bg-red-500' : 'bg-gray-200'}`}
							/>
							
							{/* Step 3: Payment */}
							<div
								className={`flex h-8 w-8 items-center justify-center rounded-full ${
									currentStep === 'payment' || completedSteps.includes('payment')
										? 'bg-red-500 text-white'
										: currentStep === 'sms-verification' || currentStep === 'success'
											? 'bg-red-500 text-white'
											: 'bg-gray-200 text-gray-500'
								}`}
							>
								3
							</div>
							<div
								className={`h-1 w-16 ${currentStep === 'sms-verification' || currentStep === 'success' ? 'bg-red-500' : 'bg-gray-200'}`}
							/>
							
							{/* Step 4: SMS Verification */}
							<div
								className={`flex h-8 w-8 items-center justify-center rounded-full ${
									currentStep === 'sms-verification' || completedSteps.includes('sms-verification')
										? 'bg-red-500 text-white'
										: currentStep === 'success'
											? 'bg-green-500 text-white'
											: 'bg-gray-200 text-gray-500'
								}`}
							>
								4
							</div>
						</div>
					</div>

					{/* Error Display */}
					{error && (
						<div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4">
							<p className="text-sm text-red-600">{error}</p>
						</div>
					)}

					{/* Step Content */}
					<AnimatePresence mode="wait">
						<motion.div
							key={currentStep}
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							transition={{ duration: 0.2 }}
						>
							{renderStepContent()}
						</motion.div>
					</AnimatePresence>
				</div>
			</div>
		</div>
	);
};

export default SeamlessBillingFlow;
