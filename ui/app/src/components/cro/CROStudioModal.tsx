import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';
import { Sparkles, Zap, Check, AlertCircle, Coins } from 'lucide-react';

interface CROAddonStatus {
	hasAddon: boolean;
	addonStartedAt: string | null;
	addonPriceCents: number | null;
	canSubscribe: boolean;
	canCancel: boolean;
}

interface CROStudioModalProps {
	open: boolean;
	onClose: () => void;
	reason?: 'out_of_credits' | 'premium_feature' | 'general';
}

const CRO_STUDIO_BENEFITS = [
	{ icon: Coins, text: '150 additional credits per month (on top of your plan)' },
	{ icon: Zap, text: 'Access to CRO Studio workspace' },
	{ icon: Sparkles, text: 'Destination page audits' },
	{ icon: Check, text: 'Conversion analysis & insights' },
	{ icon: Check, text: 'A/B test recommendations' },
	{ icon: Check, text: 'Full audit history' },
	{ icon: Check, text: 'Priority CRO support' }
];

export function CROStudioModal({ open, onClose, reason = 'general' }: CROStudioModalProps) {
	if (!open) return null;
	return <InnerModal onClose={onClose} reason={reason} />;
}

function InnerModal({ onClose, reason }: { onClose: () => void; reason: string }) {
	const { session } = useAuth();
	const [status, setStatus] = useState<CROAddonStatus | null>(null);
	const [loading, setLoading] = useState(true);
	const [subscribing, setSubscribing] = useState(false);
	const [cancelling, setCancelling] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showCancelConfirm, setShowCancelConfirm] = useState(false);

	useEffect(() => {
		if (!session?.access_token) {
			setLoading(false);
			return;
		}

		setLoading(true);
		fetch('/api/billing/cro-addon/status', {
			headers: {
				Authorization: `Bearer ${session.access_token}`
			}
		})
			.then((res) => res.json())
			.then((data) => {
				if (data.error) {
					setError(data.error);
				} else {
					setStatus(data);
				}
			})
			.catch((err) => {
				console.error('Failed to load addon status:', err);
				setError('Failed to load subscription status');
			})
			.finally(() => setLoading(false));
	}, [session?.access_token]);

	const handleSubscribe = async () => {
		if (!session?.access_token) {
			toast.error('Please sign in to subscribe');
			return;
		}

		setSubscribing(true);
		setError(null);

		try {
			const res = await fetch('/api/billing/cro-addon/subscribe', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${session.access_token}`,
					'Content-Type': 'application/json'
				}
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Failed to subscribe');
			}

			toast.success('Welcome to CRO Studio!');
			// Refresh status
			setStatus((prev) =>
				prev ? { ...prev, hasAddon: true, canSubscribe: false, canCancel: true } : null
			);

			// Close modal after brief delay so user sees the success state
			setTimeout(() => {
				onClose();
				// Reload page to update credits display
				window.location.reload();
			}, 1500);
		} catch (err: any) {
			setError(err.message || 'Failed to subscribe');
			toast.error(err.message || 'Failed to subscribe');
		} finally {
			setSubscribing(false);
		}
	};

	const handleCancel = async () => {
		if (!session?.access_token) return;

		setCancelling(true);
		setError(null);

		try {
			const res = await fetch('/api/billing/cro-addon/cancel', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${session.access_token}`,
					'Content-Type': 'application/json'
				}
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Failed to cancel');
			}

			toast.success('CRO Studio cancelled');
			setStatus((prev) =>
				prev ? { ...prev, hasAddon: false, canSubscribe: true, canCancel: false } : null
			);
			setShowCancelConfirm(false);

			setTimeout(() => {
				onClose();
				window.location.reload();
			}, 1500);
		} catch (err: any) {
			setError(err.message || 'Failed to cancel');
			toast.error(err.message || 'Failed to cancel');
		} finally {
			setCancelling(false);
		}
	};

	const priceDollars = status?.addonPriceCents ? (status.addonPriceCents / 100).toFixed(0) : '29';

	const reasonMessages: Record<string, { title: string; subtitle: string }> = {
		out_of_credits: {
			title: 'Unlock CRO Studio',
			subtitle: 'Add CRO Studio for destination page audits and conversion insights.'
		},
		premium_feature: {
			title: 'This is a premium feature',
			subtitle: 'Unlock destination page audits and CRO tools with CRO Studio.'
		},
		general: {
			title: 'Upgrade to CRO Studio',
			subtitle: 'Get destination page audits, conversion analysis, and full audit history.'
		}
	};

	const message = reasonMessages[reason] || reasonMessages.general;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-2.5">
			<div
				className="absolute inset-0 h-full w-full bg-black/50 backdrop-blur-sm"
				aria-hidden="true"
				onClick={onClose}
			/>
			<div
				className="relative w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 via-white to-purple-50 shadow-2xl dark:from-gray-900 dark:via-gray-900 dark:to-violet-950"
				onClick={(event) => event.stopPropagation()}
			>
				{/* Decorative gradient */}
				<div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-violet-500/10 to-transparent" />

				<button
					type="button"
					onClick={onClose}
					className="absolute top-3 right-3 z-10 rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:ring-2 focus:ring-violet-500 focus:outline-none dark:hover:bg-gray-800 dark:hover:text-gray-200"
				>
					<span className="sr-only">Close</span>
					<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>

				<div className="relative p-6">
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
						</div>
					) : showCancelConfirm ? (
						<CancelConfirmation
							onConfirm={handleCancel}
							onBack={() => setShowCancelConfirm(false)}
							cancelling={cancelling}
						/>
					) : status?.hasAddon ? (
						<SubscribedView
							addonStartedAt={status.addonStartedAt}
							onCancel={() => setShowCancelConfirm(true)}
							onClose={onClose}
						/>
					) : (
						<>
							{/* Header — compact */}
							<div className="mb-4 flex items-start gap-3">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm">
									<Sparkles className="h-5 w-5 text-white" />
								</div>
								<div>
									<h2 className="text-lg font-bold text-gray-900 dark:text-white">{message.title}</h2>
									<p className="text-sm text-gray-500 dark:text-gray-400">{message.subtitle}</p>
								</div>
							</div>

							{/* Benefits — 2 columns */}
							<div className="mb-4 grid grid-cols-2 gap-x-2 gap-y-1.5">
								{CRO_STUDIO_BENEFITS.map((benefit, idx) => (
									<div
										key={idx}
										className="flex items-start gap-2 rounded-lg bg-white/60 px-2.5 py-1.5 dark:bg-gray-800/40"
									>
										<benefit.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
										<span className="text-xs leading-tight text-gray-700 dark:text-gray-200">{benefit.text}</span>
									</div>
								))}
							</div>

							{/* Pricing — compact */}
							<div className="mb-4 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 px-4 py-3 text-white shadow-lg">
								<div className="flex items-center justify-between gap-3">
									<div>
										<span className="text-2xl font-bold">${priceDollars}</span>
										<span className="text-sm opacity-80">/month</span>
									</div>
									<Badge className="bg-white/20 text-white hover:bg-white/30">Best Value</Badge>
								</div>
								<p className="mt-1 text-xs opacity-90">
									150 extra credits/mo · Added to your plan · Cancel anytime
								</p>
							</div>

							{error && (
								<div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
									<AlertCircle className="h-4 w-4" />
									{error}
								</div>
							)}

							{/* Actions */}
							<div className="flex flex-col gap-2">
								<Button
									size="lg"
									className="w-full bg-gradient-to-r from-violet-500 to-purple-600 font-semibold text-white shadow-lg shadow-violet-500/25 hover:from-violet-600 hover:to-purple-700"
									disabled={subscribing || !status?.canSubscribe}
									loading={subscribing}
									onClick={handleSubscribe}
								>
									{subscribing ? 'Subscribing...' : `Subscribe for $${priceDollars}/mo`}
								</Button>
								<Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500">
									Maybe later
								</Button>
							</div>

							{!status?.canSubscribe && !status?.hasAddon && (
								<p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
									An active subscription is required to add CRO Studio.
								</p>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}

function SubscribedView({
	addonStartedAt,
	onCancel,
	onClose
}: {
	addonStartedAt: string | null;
	onCancel: () => void;
	onClose: () => void;
}) {
	const startDate = addonStartedAt ? new Date(addonStartedAt).toLocaleDateString() : null;

	return (
		<div className="text-center">
			<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25">
				<Check className="h-8 w-8 text-white" />
			</div>
			<h2 className="text-xl font-bold text-gray-900 dark:text-white">You have CRO Studio!</h2>
			<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
				Enjoy destination page audits, conversion analysis, and full audit history.
			</p>
			{startDate && <p className="mt-3 text-xs text-gray-400">Member since {startDate}</p>}

			<div className="mt-6 flex flex-col gap-2">
				<Button variant="outline" onClick={onClose}>
					Close
				</Button>
				<button
					type="button"
					onClick={onCancel}
					className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600 dark:hover:text-gray-300"
				>
					Cancel subscription
				</button>
			</div>
		</div>
	);
}

function CancelConfirmation({
	onConfirm,
	onBack,
	cancelling
}: {
	onConfirm: () => void;
	onBack: () => void;
	cancelling: boolean;
}) {
	return (
		<div className="text-center">
			<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
				<AlertCircle className="h-8 w-8 text-white" />
			</div>
			<h2 className="text-xl font-bold text-gray-900 dark:text-white">Cancel CRO Studio?</h2>
			<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
				You'll lose access to CRO Studio, including destination page audits and conversion analysis.
			</p>

			<div className="mt-6 flex flex-col gap-2">
				<Button
					variant="destructive"
					onClick={onConfirm}
					disabled={cancelling}
					loading={cancelling}
				>
					{cancelling ? 'Cancelling...' : 'Yes, cancel CRO Studio'}
				</Button>
				<Button variant="outline" onClick={onBack} disabled={cancelling}>
					Keep CRO Studio
				</Button>
			</div>
		</div>
	);
}

export default CROStudioModal;
