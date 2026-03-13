import { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useUsageRates } from '../../hooks/useUsageRates';
import { usePaymentStatus } from '../../hooks/usePaymentStatus';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';
import { formatCurrency } from '../../utils/format';
import { addWalletFunds } from '../../api/billingCredits';

const DEFAULT_PRESETS = [1000, 2500, 5000, 10000] as const; // $10, $25, $50, $100

export type TopUpFormProps = {
	onSuccess?: (amountCents: number) => void | Promise<void>;
	onCancel?: () => void;
	defaultAmountCents?: number;
	presetsCents?: number[];
	minCents?: number;
	showPaymentMethodStatus?: boolean;
};

export function TopUpForm({
	onSuccess,
	onCancel,
	defaultAmountCents = 5000,
	presetsCents = DEFAULT_PRESETS as unknown as number[],
	minCents = 1000,
	showPaymentMethodStatus = true
}: TopUpFormProps) {
	const { user, session } = useAuth();
	const { startTopup, refreshWallet } = usePaymentStatus({ autoRefresh: false });
	const usageRates = useUsageRates();

	const [selectedAmountKey, setSelectedAmountKey] = useState<number | 'custom'>(defaultAmountCents);
	const [customAmountInput, setCustomAmountInput] = useState(String(Math.round(defaultAmountCents / 100)));
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const customAmountCents = useMemo(() => {
		const sanitized = customAmountInput.replace(/[^0-9.]/g, '');
		const parsed = parseFloat(sanitized);
		if (Number.isFinite(parsed)) return Math.round(parsed * 100);
		return 0;
	}, [customAmountInput]);

	const amountCents = selectedAmountKey === 'custom' ? customAmountCents : (selectedAmountKey as number);
	const amountIsValid = amountCents >= minCents;
	const amountCurrency = useMemo(() => formatCurrency(amountCents), [amountCents]);

	const creditsUnits = useMemo(() => {
		if (!usageRates || amountCents <= 0) return 0;
		const dollars = amountCents / 100;
		const credits = usageRates.find((r) => r.key === 'credits');
		const rate = credits?.rate ?? 0;
		return rate > 0 ? dollars / rate : 0;
	}, [amountCents, usageRates]);

	const handleSubmit = async () => {
		if (!user?.organization_id) {
			toast.error('An organization is required to add credit');
			return;
		}
		if (!session?.access_token) {
			toast.error('Please sign in to purchase credits');
			return;
		}
		if (!amountIsValid) {
			setError(`Minimum deposit is ${formatCurrency(minCents)}`);
			return;
		}
		setSubmitting(true);
		setError(null);
		try {
			// Charge via backend + Stripe
			await startTopup({
				amountCents,
				autoConfirm: true,
				metadata: { source: 'credits_topup_form' }
			});
			// Reflect into credits wallet
			try {
				await addWalletFunds({
					orgId: user.organization_id,
					amountCents,
					description: 'Wallet top-up'
				});
			} catch (e) {
				console.warn('add_wallet_funds failed', e);
			}
			await refreshWallet();
			toast.success(`${amountCurrency} added to your wallet`);
			if (onSuccess) await onSuccess(amountCents);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to process deposit';
			setError(message);
			toast.error(message);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="space-y-4">
			<section>
				<h3 className="mb-2 text-[11px] font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-300">
					Choose amount
				</h3>
				<div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
					{presetsCents.map((preset) => (
						<button
							type="button"
							key={preset}
							onClick={() => setSelectedAmountKey(preset)}
							className={`rounded-md border px-2 py-2 text-xs font-semibold transition ${
								selectedAmountKey === preset
									? 'border border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:text-white shadow-md'
									: 'border-gray-200 bg-white text-gray-700 hover:border-rose-200 hover:text-rose-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
							}`}
						>
							{formatCurrency(preset)}
						</button>
					))}
					<button
						type="button"
						onClick={() => setSelectedAmountKey('custom')}
						className={`rounded-md border px-2 py-2 text-xs font-semibold transition ${
							selectedAmountKey === 'custom'
								? 'border border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:text-white shadow-md'
								: 'border-gray-200 bg-white text-gray-700 hover:border-rose-200 hover:text-rose-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
						}`}
					>
						Custom
					</button>
				</div>
				{selectedAmountKey === 'custom' && (
					<div className="mt-2 space-y-1">
						<label className="text-[11px] font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
							Custom amount (USD)
						</label>
						<Input
							type="number"
							min={minCents / 100}
							step={1}
							value={customAmountInput}
							onChange={(event) => setCustomAmountInput(event.target.value)}
							className="w-full"
						/>
					</div>
				)}
				{!amountIsValid && (
					<p className="mt-1 text-[11px] text-blue-600">Minimum deposit is {formatCurrency(minCents)}</p>
				)}
			</section>

			<section className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700">
				<div className="flex w-full items-center justify-between text-left">
					<div>
						<span className="text-[11px] font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
							Purchase power
						</span>
						<div className="text-sm font-semibold text-gray-900 dark:text-white">
							{amountCurrency}
						</div>
					</div>
					<Badge variant="secondary">~{Math.round(creditsUnits).toLocaleString()} credits</Badge>
				</div>
			</section>

			{error ? <p className="text-[11px] text-blue-600">{error}</p> : null}

			<div className="flex flex-col-reverse items-center justify-between gap-2 sm:flex-row">
				<Button variant="outline" size="sm" onClick={onCancel} className="w-full sm:w-auto">
					Cancel
				</Button>
				<Button
					size="sm"
					className="w-full sm:w-auto"
					disabled={submitting || !amountIsValid}
					loading={submitting}
					onClick={handleSubmit}
				>
					Charge {amountCurrency}
				</Button>
			</div>
		</div>
	);
}


