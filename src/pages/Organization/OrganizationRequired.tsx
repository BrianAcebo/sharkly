import { useState } from 'react';
import { useModal } from '../../hooks/useModal';
import { Modal } from '../../components/ui/modal';
import Button from '../../components/ui/button/Button';
import Input from '../../components/form/input/InputField';
import Label from '../../components/form/Label';
import { motion, AnimatePresence } from 'framer-motion';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, ExpressCheckoutElement } from '@stripe/react-stripe-js';
import useAuth from '../../hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { HttpError } from '@/utils/error';

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

	const handleSubscribe = async () => {
		if (!user?.id || !session?.access_token) {
			setErrorMessage('You must be logged in to subscribe');
			return;
		}

		setIsLoading(true);
		setErrorMessage(undefined);

		try {
			const response = await fetch('/api/payments/create-intent', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${session.access_token}`
				},
				body: JSON.stringify({
					amount: 2000, // $20.00 in cents
					currency: 'usd'
				})
			});

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
					<div className="rounded-lg border border-gray-200 p-6 dark:border-gray-800">
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

					<div className="rounded-lg border border-gray-200 p-6 dark:border-gray-800">
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
						const response = await fetch('/api/organizations/create', {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								Authorization: `Bearer ${session?.access_token}`
							},
							body: JSON.stringify({
								name: organizationData.name,
								maxSeats: parseInt(organizationData.maxSeats),
								userId: user?.id
							})
						});

						if (!response.ok) {
							const error = await response.json();
							throw new Error(error.message || 'Failed to create organization');
						}

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
			navigate('/cases');
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
	const { isOpen, openModal, closeModal } = useModal();
	const [activeTab, setActiveTab] = useState<'create' | 'subscribe'>('create');
	const [organizationData, setOrganizationData] = useState<OrganizationData>({
		name: '',
		maxSeats: '3'
	});
	const navigate = useNavigate();

	return (
		<div className="flex h-full flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 dark:bg-gray-900">
			<div className="w-full max-w-md space-y-8">
				<div className="text-center">
					<h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
						Organization Required
					</h1>
					<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
						You need to be part of an organization to use this feature. Either create a new
						organization or try out{' '}
						<button
							className="font-medium text-blue-600 underline hover:text-blue-500 dark:text-blue-400"
							onClick={() => navigate('/search')}
						>
							search
						</button>
						.
					</p>
				</div>

				<div className="space-y-6">
					<Button size="sm" onClick={openModal} className="mx-auto block w-40">
						Get Started
					</Button>
					<p className="text-center text-sm text-gray-600 dark:text-gray-400">
						Already have an invitation?{' '}
						<a
							href="#"
							className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
						>
							Check your email
						</a>
					</p>
				</div>
			</div>

			<Modal isOpen={isOpen} onClose={closeModal} className="m-4 max-w-[500px]">
				<div className="no-scrollbar relative max-h-[800px] w-full overflow-y-auto rounded-3xl bg-white p-4 lg:p-11 dark:bg-gray-900">
					<div className="px-2 pr-14">
						<h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
							Let's get started
						</h4>
						<p className="mb-6 text-sm text-gray-500 lg:mb-7 dark:text-gray-400">
							Create an organization to get started with True Sight.
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
