import { useEffect, useState } from 'react';
import { useModal } from '../../hooks/useModal';
import { Modal } from '../../components/ui/modal';
import { Button } from '../../components/ui/button';
import Input from '../../components/form/input/InputField';
import Label from '../../components/form/Label';
import { motion, AnimatePresence } from 'framer-motion';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, ExpressCheckoutElement } from '@stripe/react-stripe-js';
import useAuth from '../../hooks/useAuth';
import { api } from '../../utils/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { HttpError } from '../../utils/error';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import SeamlessBillingFlow from '../../components/billing/SeamlessBillingFlow';
import UpfrontBillingDisclaimer from '../../components/billing/UpfrontBillingDisclaimer';
import { useOrganization } from '../../hooks/useOrganization';
import { AlertCircle } from 'lucide-react';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface OrganizationData {
	name: string;
	maxSeats: string;
}

const CreateOrganizationForm = ({
	onClose,
	setActiveTab,
	onOrganizationDataChange
}: {
	onClose: () => void;
	setActiveTab: () => void;
	onOrganizationDataChange: (data: OrganizationData) => void;
}) => {
	const [formData, setFormData] = useState({
		name: '',
		maxSeats: '3'
	});
	const [errors, setErrors] = useState({
		name: false,
		maxSeats: false
	});

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value
		}));
		setErrors((prev) => ({
			...prev,
			[name]: false
		}));
	};

	const handleCreateOrganization = (e: React.FormEvent) => {
		e.preventDefault();

		const newErrors = {
			name: !formData.name.trim(),
			maxSeats: !formData.maxSeats || parseInt(formData.maxSeats) < 1
		};

		setErrors(newErrors);

		if (!newErrors.name && !newErrors.maxSeats) {
			onOrganizationDataChange(formData);
			setActiveTab();
		}
	};

	return (
		<form onSubmit={handleCreateOrganization} className="flex flex-col">
			<div className="custom-scrollbar overflow-y-auto px-2">
				<div className="space-y-5">
					<div>
						<Label>Organization Name</Label>
						<Input
							type="text"
							name="name"
							value={formData.name}
							onChange={handleInputChange}
							placeholder="Enter organization name"
							error={errors.name}
							hint={errors.name ? 'Organization name is required' : ''}
						/>
					</div>
				</div>
			</div>
			<div className="mt-6 flex items-center gap-3 px-2 lg:justify-end">
				<Button size="sm" variant="outline" onClick={onClose}>
					Cancel
				</Button>
				<Button type="submit" size="sm">
					Next
				</Button>
			</div>
		</form>
	);
};

const SubscriptionForm = ({
	setActiveTab,
	organizationData
}: {
	setActiveTab: () => void;
	organizationData: OrganizationData;
}) => {
	const { user, session, updateUser } = useAuth();
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string>();
	const [clientSecret, setClientSecret] = useState<string>();
	const { setTitle } = useBreadcrumbs();

	useEffect(() => {
		setTitle('Organization Required');
	}, [setTitle]);

	const handleSubscribe = async () => {
		if (!user?.id || !session?.access_token) {
			setErrorMessage('You must be logged in to subscribe');
			return;
		}

		setIsLoading(true);
		setErrorMessage(undefined);

		try {
			const response = await api.post(
				'/api/payments/create-intent',
				{ amount: 2000, currency: 'usd' },
				{
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${session.access_token}`
					}
				}
			);

			if (!response.ok) {
				throw new HttpError(response.statusText, response.status);
			}

			const data = await response.json();

			if (data.clientSecret) {
				setClientSecret(data.clientSecret);
			} else {
				throw new Error('No client secret received');
			}
		} catch (e) {
			if (e instanceof HttpError) {
				const err = e as { message: string; statusCode: number };
				console.error(`Error ${err.statusCode}: ${err.message}`);
				toast.error(err.message);
			} else {
				console.error('An unexpected error occurred:', e);
				toast.error('Failed to initialize checkout');
			}
		} finally {
			setIsLoading(false);
		}
	};

	if (!clientSecret) {
		return (
			<div className="flex flex-col">
				<div className="space-y-6">
					<div className="rounded-lg border border-gray-200 p-6 dark:border-gray-900">
						<h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
							Organization Details
						</h3>
						<div className="space-y-4">
							<div>
								<Label>Organization Name</Label>
								<p className="text-sm text-gray-600 dark:text-gray-400">{organizationData.name}</p>
							</div>
							<div>
								<Label>Number of Seats</Label>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									{organizationData.maxSeats}
								</p>
							</div>
						</div>
					</div>

					<div className="rounded-lg border border-gray-200 p-6 dark:border-gray-900">
						<h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
							Subscription Plan
						</h3>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<span className="text-gray-600 dark:text-gray-400">Monthly Plan</span>
								<span className="font-semibold text-gray-900 dark:text-white">$20.00/month</span>
							</div>
							<ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
								<li className="flex items-center">
									<svg
										className="mr-2 h-4 w-4 text-green-500"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M5 13l4 4L19 7"
										/>
									</svg>
									Unlimited cases
								</li>
								<li className="flex items-center">
									<svg
										className="mr-2 h-4 w-4 text-green-500"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M5 13l4 4L19 7"
										/>
									</svg>
									Advanced analytics
								</li>
								<li className="flex items-center">
									<svg
										className="mr-2 h-4 w-4 text-green-500"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M5 13l4 4L19 7"
										/>
									</svg>
									Priority support
								</li>
							</ul>
						</div>
					</div>
					{errorMessage && <div className="text-sm text-red-500">{errorMessage}</div>}
				</div>
				<div className="mt-6 flex items-center gap-3 px-2 lg:justify-end">
					<Button size="sm" variant="outline" onClick={setActiveTab}>
						Back
					</Button>
					<Button size="sm" onClick={handleSubscribe} disabled={isLoading}>
						{isLoading ? 'Loading...' : 'Select Plan'}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<Elements stripe={stripePromise} options={{ clientSecret }}>
			<PaymentForm
				setActiveTab={setActiveTab}
				onPaymentSuccess={async () => {
					try {
						// Create organization through backend route
						await api.post('/api/organizations/create', {
							name: organizationData.name,
							maxSeats: parseInt(organizationData.maxSeats),
							userId: user?.id
						});

						// Update user data to reflect the new organization
						await updateUser();
					} catch (error) {
						console.error('Error creating organization:', error);
						toast.error(
							'Payment successful but failed to create organization. Please contact support.'
						);
						throw error; // Re-throw to prevent navigation
					}
				}}
			/>
		</Elements>
	);
};

const PaymentForm = ({
	setActiveTab,
	onPaymentSuccess
}: {
	setActiveTab: () => void;
	onPaymentSuccess: () => Promise<void>;
}) => {
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string>();
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setErrorMessage(undefined);

		try {
			// Here you would handle the payment submission
			// For now, we'll just simulate a delay
			await new Promise((resolve) => setTimeout(resolve, 1000));
			toast.success('Payment successful');
			await onPaymentSuccess();
			toast.success('Organization created successfully');
			navigate('/dashboard');
		} catch (error) {
			console.error('Error:', error);
			toast.error(error instanceof Error ? error.message : 'Payment failed');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col">
			<div className="space-y-6">
				<ExpressCheckoutElement
					onConfirm={(event) => handleSubmit(event as unknown as React.FormEvent)}
				/>
				<PaymentElement />
				{errorMessage && <div className="text-sm text-red-500">{errorMessage}</div>}
			</div>
			<div className="mt-6 flex items-center gap-3 px-2 lg:justify-end">
				<Button size="sm" variant="outline" onClick={setActiveTab}>
					Back
				</Button>
				<Button size="sm" type="submit" disabled={isLoading}>
					{isLoading ? 'Processing...' : 'Complete'}
				</Button>
			</div>
		</form>
	);
};

export default function OrganizationRequired() {
	const { isOpen, closeModal } = useModal();
	const [activeTab, setActiveTab] = useState<'create' | 'subscribe' | 'billing'>('create');
	const [organizationData, setOrganizationData] = useState<OrganizationData>({
		name: '',
		maxSeats: '3'
	});
	const [showSeamlessBilling, setShowSeamlessBilling] = useState(false);
	const { setTitle } = useBreadcrumbs();
	const { organization: currentOrg } = useOrganization();

	useEffect(() => {
		setTitle('Organization Required');
	}, [setTitle]);

	if (showSeamlessBilling) {
		return <SeamlessBillingFlow onClose={() => setShowSeamlessBilling(false)} />;
	}

	const isIncompleteSubscription =
		currentOrg?.stripe_status === 'incomplete' ||
		currentOrg?.stripe_status === 'incomplete_expired';
	const isPaymentPending = currentOrg?.status === 'payment_pending';
	const isPaymentRequired = currentOrg?.status === 'payment_required';
	const hasIncompletePayment = isIncompleteSubscription || isPaymentPending || isPaymentRequired;

	return (
		<div className="flex h-full flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 dark:bg-gray-900">
			<div className="w-full max-w-md space-y-8">
				<div className="text-center">
					{hasIncompletePayment && (
						<div className="mb-8 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
							<div className="flex items-start gap-3">
								<AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
								<div className="text-left">
									<h3 className="font-semibold text-red-900 dark:text-red-100">
										Payment Confirmation Required
									</h3>
									<p className="mt-1 text-sm text-red-800 dark:text-red-200">
										Your subscription payment is incomplete. Please complete the payment process to
										continue using the app.
									</p>
								</div>
							</div>
						</div>
					)}
					<h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
						{hasIncompletePayment ? 'Complete Your Payment' : 'Organization Required'}
					</h1>
					<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
						{hasIncompletePayment
							? 'Finalize your subscription to access all features'
							: 'You need to be part of an organization to use this feature.'}
					</p>
					<Button
						size="sm"
						onClick={() => setShowSeamlessBilling(true)}
						className="mx-auto mt-6 block w-40"
					>
						{hasIncompletePayment ? 'Complete Payment' : 'Get Started'}
					</Button>
				</div>

				{/* <div className="space-y-6">
					<p className="text-center text-sm text-gray-600 dark:text-gray-400">
						Already have an invitation?{' '}
						<a
							href="#"
							className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
						>
							Check your email
						</a>
					</p>
					<UpfrontBillingDisclaimer />
				</div> */}
			</div>

			<Modal isOpen={isOpen} onClose={closeModal} className="m-4 max-w-[500px]">
				<div className="no-scrollbar relative max-h-96 w-full overflow-y-auto rounded-3xl bg-white p-4 lg:max-h-[800px] lg:p-11 dark:bg-gray-900">
					<div className="px-2 pr-14">
						<h4 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white/90">
							Let's get started
						</h4>
						<p className="mb-6 text-sm text-gray-500 lg:mb-7 dark:text-gray-400">
							Create an organization to get started with Sharkly.
						</p>
					</div>

					{/* Tab Content */}
					<AnimatePresence mode="wait">
						<motion.div
							key={activeTab}
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							transition={{ duration: 0.2 }}
						>
							{activeTab === 'create' ? (
								<CreateOrganizationForm
									setActiveTab={() => {
										setActiveTab('subscribe');
									}}
									onClose={closeModal}
									onOrganizationDataChange={setOrganizationData}
								/>
							) : (
								<SubscriptionForm
									setActiveTab={() => {
										setActiveTab('create');
									}}
									organizationData={organizationData}
								/>
							)}
						</motion.div>
					</AnimatePresence>
				</div>
			</Modal>
		</div>
	);
}
