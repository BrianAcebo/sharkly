import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';

import { usePaymentStatus } from '../../hooks/usePaymentStatus';
import { useAuth } from '../../hooks/useAuth';
import { fetchDefaultPaymentMethodSummary } from '../../api/billing';
import type { CustomerPaymentMethodSummary } from '../../types/billing';
import { toast } from 'sonner';
import { cn } from '../../utils/common';
import { formatCurrency } from '../../utils/format';
import { useUsageRates } from '../../hooks/useUsageRates';

const DEPOSIT_PRESETS_CENTS = [1000, 2500, 5000, 10000] as const; // $10, $25, $50, $100
const MIN_DEPOSIT_CENTS = 1000; // $10 minimum
const MIN_AUTO_THRESHOLD_CENTS = 200; // $2 minimum threshold
const MIN_AUTO_AMOUNT_CENTS = 1000; // $10 minimum auto top-up amount

type Step = 1 | 2;

interface WalletDepositModalProps {
	open: boolean;
	onClose: () => void;
	forceAutoStep?: boolean;
}

export function WalletDepositModal({
	open,
	onClose,
	forceAutoStep = false
}: WalletDepositModalProps) {
  if (!open) return null;
	return <InnerModal onClose={onClose} forceAutoStep={forceAutoStep} />;
}

function InnerModal({ onClose, forceAutoStep }: { onClose: () => void; forceAutoStep?: boolean }) {
	const { user, session } = useAuth();
	const { startTopup, refreshWallet, autoRecharge, saveAutoRecharge } = usePaymentStatus({
		autoRefresh: false
	});

	const [step, setStep] = useState<Step>(forceAutoStep ? 2 : 1);
	const [depositing, setDepositing] = useState(false);
	const [depositError, setDepositError] = useState<string | null>(null);
	const [depositComplete, setDepositComplete] = useState(false);
	const [confirmedDepositCents, setConfirmedDepositCents] = useState<number | null>(null);
	const [initialAutoValuesLoaded, setInitialAutoValuesLoaded] = useState(false);

	const [defaultPmLoading, setDefaultPmLoading] = useState(true);
	const [defaultPaymentMethod, setDefaultPaymentMethod] =
		useState<CustomerPaymentMethodSummary | null>(null);
	const [hasDefaultPaymentMethod, setHasDefaultPaymentMethod] = useState<boolean>(true);

	const [selectedAmountKey, setSelectedAmountKey] = useState<number | 'custom'>(
		DEPOSIT_PRESETS_CENTS[2]
	);
	const [customAmountInput, setCustomAmountInput] = useState('75');

	const customAmountCents = useMemo(() => {
		const sanitized = customAmountInput.replace(/[^0-9.]/g, '');
		const parsed = parseFloat(sanitized);
		if (Number.isFinite(parsed)) {
			return Math.round(parsed * 100);
		}
		return 0;
	}, [customAmountInput]);

	const amountCents = selectedAmountKey === 'custom' ? customAmountCents : selectedAmountKey;
	const amountIsValid = amountCents >= MIN_DEPOSIT_CENTS;

	const amountCurrency = useMemo(() => formatCurrency(amountCents), [amountCents]);

	const [voiceAllocationPercent, setVoiceAllocationPercent] = useState(50);
	const [allocationOpen, setAllocationOpen] = useState(false);
	const usageRates = useUsageRates();

  console.log("111", usageRates);

	const purchasePower = useMemo(() => {
		if (!usageRates || amountCents <= 0) {
  return (
				usageRates?.map((item) => ({ ...item, portion: 0, units: 0 })) ?? [
					{
						key: 'voice',
						label: 'Voice minutes',
						rate: 0,
						unitLabel: 'mins',
						color: 'bg-rose-500',
						portion: 0,
						units: 0
					},
					{
						key: 'sms',
						label: 'SMS messages',
						rate: 0,
						unitLabel: 'SMS',
						color: 'bg-blue-500',
						portion: 0,
						units: 0
					}
				]
			);
		}
		const dollars = amountCents / 100;
		const voicePercent = voiceAllocationPercent / 100;
		const smsPercent = 1 - voicePercent;
		return usageRates.map((item) => {
			const percent = item.key === 'voice' ? voicePercent : smsPercent;
			const portion = dollars * percent;
			return {
				...item,
				portion,
				units: item.rate > 0 ? portion / item.rate : 0
			};
		});
	}, [amountCents, voiceAllocationPercent, usageRates]);

	const [autoEnabled, setAutoEnabled] = useState(false);
	const [autoAmountInput, setAutoAmountInput] = useState('50');
	const [autoThresholdInput, setAutoThresholdInput] = useState('5');
	const autoAmountCents = useMemo(() => dollarsToCents(autoAmountInput), [autoAmountInput]);
	const autoThresholdCents = useMemo(
		() => dollarsToCents(autoThresholdInput),
		[autoThresholdInput]
	);
	const [autoSaving, setAutoSaving] = useState(false);
	const [autoError, setAutoError] = useState<string | null>(null);
	const [autoDirty, setAutoDirty] = useState(false);

	useEffect(() => {
		if (!user?.organization_id || !session?.access_token) {
			setDefaultPmLoading(false);
			setHasDefaultPaymentMethod(false);
			return;
		}

		let active = true;
		setDefaultPmLoading(true);
		fetchDefaultPaymentMethodSummary({
			organizationId: user.organization_id,
			accessToken: session.access_token
		})
			.then((resp) => {
				if (!active) return;
				setDefaultPaymentMethod(resp.defaultPaymentMethod ?? null);
				setHasDefaultPaymentMethod(resp.hasDefault);
			})
			.catch((err) => {
				console.error('Failed to load default payment method', err);
				if (!active) return;
				setDefaultPaymentMethod(null);
				setHasDefaultPaymentMethod(false);
			})
			.finally(() => {
				if (active) setDefaultPmLoading(false);
			});

		return () => {
			active = false;
		};
	}, [session?.access_token, user?.organization_id]);

	useEffect(() => {
		if (!user?.organization_id || !session?.access_token) {
			return;
		}
		refreshWallet().catch((err) => console.warn('Failed to refresh wallet status', err));
	}, [refreshWallet, session?.access_token, user?.organization_id]);

	useEffect(() => {
		if (!autoRecharge) {
			if (depositComplete && confirmedDepositCents) {
				setAutoEnabled(false);
				setAutoAmountInput((confirmedDepositCents / 100).toFixed(2));
				setAutoThresholdInput(
					(
						Math.max(
							MIN_AUTO_THRESHOLD_CENTS,
							Math.round(
								Math.min((confirmedDepositCents ?? MIN_AUTO_THRESHOLD_CENTS * 10) / 4, 5000)
							)
						) / 100
					).toFixed(2)
				);
			}
			return;
		}

		setAutoEnabled(autoRecharge.enabled ?? false);
		setAutoAmountInput(((autoRecharge.amount_cents ?? MIN_AUTO_AMOUNT_CENTS) / 100).toFixed(2));
		setAutoThresholdInput(
			(
				Math.max(
					MIN_AUTO_THRESHOLD_CENTS,
					autoRecharge.threshold_cents ?? MIN_AUTO_THRESHOLD_CENTS
				) / 100
			).toFixed(2)
		);
		setAutoDirty(false);
		setAutoError(null);
	}, [autoRecharge, depositComplete, confirmedDepositCents]);

  useEffect(() => {
		if (!initialAutoValuesLoaded && autoRecharge) {
			setAutoEnabled(autoRecharge.enabled ?? false);
			setAutoAmountInput(((autoRecharge.amount_cents ?? MIN_AUTO_AMOUNT_CENTS) / 100).toFixed(2));
			setAutoThresholdInput(
				(
					Math.max(
						MIN_AUTO_THRESHOLD_CENTS,
						autoRecharge.threshold_cents ?? MIN_AUTO_THRESHOLD_CENTS
					) / 100
				).toFixed(2)
			);
			setInitialAutoValuesLoaded(true);
		}
	}, [initialAutoValuesLoaded, autoRecharge]);

	const handleAmountSelect = (value: number | 'custom') => {
		setSelectedAmountKey(value);
		setDepositError(null);
	};

	const handleCustomAmountChange = (value: string) => {
		setSelectedAmountKey('custom');
		setCustomAmountInput(value);
	};

	const handleDeposit = async () => {
		if (!user?.organization_id) {
			toast.error('An organization is required to add credit');
			return;
		}
		if (!hasDefaultPaymentMethod || !defaultPaymentMethod) {
			toast.error('Add a default payment method before purchasing credit');
			return;
		}
		if (!amountIsValid) {
			setDepositError('Minimum deposit is $10.00');
			return;
		}

		setDepositing(true);
		setDepositError(null);
		try {
			await startTopup({
				amountCents,
				autoConfirm: true,
				metadata: {
					source: 'wallet_deposit_modal'
				}
			});

			setConfirmedDepositCents(amountCents);
			setDepositComplete(true);
			setStep(2);
			toast.success(`${formatCurrency(amountCents)} added to your wallet`);
			await refreshWallet();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to process deposit';
			setDepositError(message);
			toast.error(message);
		} finally {
			setDepositing(false);
		}
	};

	const handleEnableToggle = (checked: boolean) => {
		setAutoEnabled(checked);
		setAutoDirty(true);
		setAutoError(null);
	};

	const handleAutoAmountChange = (value: string) => {
		setAutoAmountInput(value);
		setAutoDirty(true);
		setAutoError(null);
	};

	const handleAutoThresholdChange = (value: string) => {
		setAutoThresholdInput(value);
		setAutoDirty(true);
		setAutoError(null);
	};

	const handleDisableAutoRecharge = async () => {
		setAutoSaving(true);
		try {
			await saveAutoRecharge({
				enabled: false,
				amount_cents: autoAmountCents > 0 ? autoAmountCents : MIN_AUTO_AMOUNT_CENTS,
				threshold_cents: autoThresholdCents > 0 ? autoThresholdCents : MIN_AUTO_THRESHOLD_CENTS
			});
			toast.success('Auto-recharge disabled');
			setAutoDirty(false);
			await refreshWallet();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to update auto-recharge';
			toast.error(message);
		} finally {
			setAutoSaving(false);
		}
	};

	const handleSaveAutoRecharge = useCallback(async (): Promise<boolean> => {
		if (!autoEnabled) {
			await handleDisableAutoRecharge();
			return true;
		}

		if (autoAmountCents < MIN_AUTO_AMOUNT_CENTS) {
			setAutoError('Auto-recharge amount must be at least $10.00');
			return false;
		}

		if (autoThresholdCents < MIN_AUTO_THRESHOLD_CENTS) {
			setAutoError('Recharge threshold must be at least $2.00');
			return false;
		}

		setAutoSaving(true);
		setAutoError(null);
		try {
			await saveAutoRecharge({
				enabled: true,
				amount_cents: autoAmountCents,
				threshold_cents: autoThresholdCents
			});
			toast.success('Auto-recharge settings saved');
			setAutoDirty(false);
			await refreshWallet();
			return true;
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to save auto-recharge';
			setAutoError(message);
			toast.error(message);
			return false;
		} finally {
			setAutoSaving(false);
		}
	}, [autoAmountCents, autoEnabled, autoThresholdCents, refreshWallet, saveAutoRecharge]);

	const handleFinish = async () => {
		const saved = await handleSaveAutoRecharge();
		if (!saved) {
			return;
		}
		handleClose();
	};

	const handleSkipAuto = async () => {
		try {
			setAutoEnabled(false);
			setAutoDirty(false);
			await saveAutoRecharge({
				enabled: false,
				amount_cents: autoAmountCents > 0 ? autoAmountCents : MIN_AUTO_AMOUNT_CENTS,
				threshold_cents: autoThresholdCents > 0 ? autoThresholdCents : MIN_AUTO_THRESHOLD_CENTS
			});
			await refreshWallet();
			handleClose();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to update auto-recharge';
			setAutoError(message);
			toast.error(message);
		}
	};

	const handleClose = () => {
		setDepositComplete(false);
		setConfirmedDepositCents(null);
      onClose();
	};

	const paymentMethodText = defaultPaymentMethod
		? `${(defaultPaymentMethod.brand ?? 'Card').toUpperCase()} ending in ${defaultPaymentMethod.last4 ?? '****'}${
				defaultPaymentMethod.exp_month && defaultPaymentMethod.exp_year
					? ` · Expires ${defaultPaymentMethod.exp_month}/${defaultPaymentMethod.exp_year}`
					: ''
			}`
		: 'No default payment method on file';

	const isAutoStep = step === 2;
	const headingText = isAutoStep ? 'Auto-recharge (optional)' : 'Add Usage Credit';
	const subheading = isAutoStep ? (
		'Keep your wallet topped up automatically whenever the balance drops.'
	) : (
		<>
			Deposits are processed instantly and charged to your default payment method. Need to change
			it? Visit{' '}
			<a href="/billing" className="text-rose-500 underline underline-offset-2 hover:text-rose-400">
				Billing settings
			</a>
			.
		</>
	);

  return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-2.5">
			<div className="absolute inset-0 h-full w-full bg-black/45" aria-hidden="true" />
			<div
				className="relative w-full max-w-md rounded-lg bg-white p-4 shadow-2xl dark:bg-gray-900"
				onClick={(event) => event.stopPropagation()}
			>
				<button
					type="button"
					onClick={handleClose}
					className="absolute right-3 top-3 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
				>
					<span className="sr-only">Close</span>
					&times;
				</button>
				<header className="mb-4">
					<h2 className="text-base font-semibold text-gray-900 dark:text-white">{headingText}</h2>
					<p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{subheading}</p>
				</header>

				{step === 1 && !forceAutoStep ? (
					<StepOne
						amountCents={amountCents}
						amountCurrency={amountCurrency}
						amountIsValid={amountIsValid}
						customAmountInput={customAmountInput}
						defaultPaymentMethodText={paymentMethodText}
						defaultPmLoading={defaultPmLoading}
						hasDefaultPaymentMethod={hasDefaultPaymentMethod}
						voiceAllocationPercent={voiceAllocationPercent}
						allocationOpen={allocationOpen}
						purchasePower={purchasePower}
						selectedAmountKey={selectedAmountKey}
						depositError={depositError}
						depositing={depositing}
						onAmountSelect={handleAmountSelect}
						onCustomAmountChange={handleCustomAmountChange}
						onVoiceAllocationChange={setVoiceAllocationPercent}
						onToggleAllocation={() => setAllocationOpen((prev) => !prev)}
						onConfirm={handleDeposit}
						onCancel={handleClose}
					/>
				) : (
					<StepTwo
						amountCurrency={
							confirmedDepositCents ? formatCurrency(confirmedDepositCents) : amountCurrency
						}
						autoAmountInput={autoAmountInput}
						autoThresholdInput={autoThresholdInput}
						autoEnabled={autoEnabled}
						autoSaving={autoSaving}
						autoError={autoError}
						onEnableToggle={handleEnableToggle}
						onAutoAmountChange={handleAutoAmountChange}
						onAutoThresholdChange={handleAutoThresholdChange}
						onSave={handleSaveAutoRecharge}
						onFinish={handleFinish}
						onSkip={handleSkipAuto}
						autoDirty={autoDirty}
						depositComplete={depositComplete}
						confirmedDepositCents={confirmedDepositCents}
					/>
        )}
      </div>
    </div>
  );
}

interface StepOneProps {
	amountCents: number;
	amountCurrency: string;
	amountIsValid: boolean;
	selectedAmountKey: number | 'custom';
	customAmountInput: string;
	defaultPmLoading: boolean;
	hasDefaultPaymentMethod: boolean;
	defaultPaymentMethodText: string;
	voiceAllocationPercent: number;
	allocationOpen: boolean;
	purchasePower: Array<{
		key: string;
		label: string;
		portion: number;
		units: number;
		unitLabel: string;
		color: string;
	}>;
	depositError: string | null;
	depositing: boolean;
	onAmountSelect: (value: number | 'custom') => void;
	onCustomAmountChange: (value: string) => void;
	onVoiceAllocationChange: (value: number) => void;
	onToggleAllocation: () => void;
	onConfirm: () => void;
	onCancel: () => void;
}

function StepOne({
	amountCents,
	amountCurrency,
	amountIsValid,
	selectedAmountKey,
	customAmountInput,
	defaultPmLoading,
	hasDefaultPaymentMethod,
	defaultPaymentMethodText,
	voiceAllocationPercent,
	allocationOpen,
	purchasePower,
	depositError,
	depositing,
	onAmountSelect,
	onCustomAmountChange,
	onVoiceAllocationChange,
	onToggleAllocation,
	onConfirm,
	onCancel
}: StepOneProps) {
	const minDepositMessage = amountIsValid ? null : 'Minimum deposit is $10.00';
	const smsAllocationPercent = 100 - voiceAllocationPercent;
	return (
		<div className="space-y-6">
			<section>
				<h3 className="mb-2 text-[11px] font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-300">
					Choose amount
				</h3>
				<div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
					{DEPOSIT_PRESETS_CENTS.map((preset) => (
						<AmountButton
							key={preset}
							label={formatCurrency(preset)}
							active={selectedAmountKey === preset}
							onClick={() => onAmountSelect(preset)}
						/>
					))}
					<AmountButton
						label="Custom"
						active={selectedAmountKey === 'custom'}
						onClick={() => onAmountSelect('custom')}
					/>
				</div>
				{selectedAmountKey === 'custom' && (
					<div className="mt-2 space-y-1">
						<label className="text-[11px] font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
							Custom amount (USD)
						</label>
						<Input
							type="number"
							min={10}
							step={1}
							value={customAmountInput}
							onChange={(event) => onCustomAmountChange(event.target.value)}
							className="w-full"
						/>
					</div>
				)}
				{minDepositMessage && <p className="mt-1 text-[11px] text-red-600">{minDepositMessage}</p>}
			</section>

			<section>
				<h3 className="mb-2 text-[11px] font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-300">
					Purchase power
				</h3>
				<div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/60">
					<button
						type="button"
						className="flex w-full items-center justify-between text-left"
						onClick={onToggleAllocation}
					>
						<div>
							<span className="text-[11px] font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
								Purchase power
							</span>
							<div className="text-sm font-semibold text-gray-900 dark:text-white">
								{amountCurrency}
							</div>
						</div>
						<span className="text-[11px] text-gray-500 dark:text-gray-400">
							{allocationOpen ? 'Hide' : 'See details'}
						</span>
					</button>

					{allocationOpen && (
						<div className="mt-3 space-y-3">
							<div className="rounded-lg border border-rose-100 bg-white px-3 py-2 text-[11px] text-gray-600 shadow-sm dark:border-rose-900/40 dark:bg-gray-900/40 dark:text-gray-200">
								<div className="flex items-center justify-between">
									<span>Calls allocation</span>
									<span>
										{voiceAllocationPercent}% voice / {smsAllocationPercent}% SMS
									</span>
								</div>
								<Slider
									min={0}
									max={100}
									step={1}
									value={voiceAllocationPercent}
									onChange={(event) =>
										onVoiceAllocationChange(Number((event.target as HTMLInputElement).value))
									}
									className="mt-2"
								/>
								<p className="text-xxs mt-2 text-gray-400 dark:text-gray-500">
									Drag the slider to dedicate more of this deposit to calls or to SMS. The other
									category updates automatically.
								</p>
							</div>

							<dl className="grid grid-cols-1 gap-2 text-[11px] text-gray-600 md:grid-cols-2 dark:text-gray-300">
								{purchasePower.map((item) => (
									<div
										key={item.key}
										className="rounded-lg bg-white/70 p-2.5 text-center shadow-sm dark:bg-gray-900/40"
									>
										<div className="text-xxs tracking-wide text-gray-500 uppercase dark:text-gray-400">
											{item.label}
										</div>
										<div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
											{formatUnits(item.units, item.unitLabel)}
										</div>
										<div className="text-xs text-gray-400">
											{formatCurrency(Math.round(item.portion * 100))} allocated
										</div>
									</div>
								))}
							</dl>
						</div>
					)}
				</div>
			</section>

			<section className="rounded-lg border border-gray-200 p-2.5 dark:border-gray-800">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="text-[13px] font-semibold text-gray-900 dark:text-white">
							Payment method
						</p>
						<p className="mt-0.5 text-[11px] text-gray-600 dark:text-gray-300">
							{defaultPmLoading && 'Checking saved payment methods…'}
						</p>
					</div>
					<Badge variant={hasDefaultPaymentMethod ? 'secondary' : 'destructive'}>
						{hasDefaultPaymentMethod ? 'On file' : 'Action needed'}
					</Badge>
				</div>
				{!hasDefaultPaymentMethod && !defaultPmLoading && (
					<p className="mt-2 text-[11px] text-red-600">
						Add a default payment method from the billing page before purchasing credit.
					</p>
				)}
			</section>

			{depositError ? <p className="text-[11px] text-red-600">{depositError}</p> : null}

			<div className="flex flex-col-reverse items-center justify-between gap-2 sm:flex-row">
				<Button variant="outline" size="sm" onClick={onCancel} className="w-full sm:w-auto">
					Cancel
				</Button>
				<Button
					size="sm"
					className="w-full sm:w-auto"
					disabled={depositing || !amountIsValid || !hasDefaultPaymentMethod}
					loading={depositing}
					onClick={onConfirm}
				>
					Charge {amountCurrency}
				</Button>
			</div>
		</div>
	);
}

interface StepTwoProps {
	amountCurrency: string;
	autoEnabled: boolean;
	autoAmountInput: string;
	autoThresholdInput: string;
	autoSaving: boolean;
	autoError: string | null;
	autoDirty: boolean;
	onEnableToggle: (checked: boolean) => void;
	onAutoAmountChange: (value: string) => void;
	onAutoThresholdChange: (value: string) => void;
	onSave: () => Promise<boolean>;
	onFinish: () => void;
	onSkip: () => void;
	depositComplete: boolean;
	confirmedDepositCents: number | null;
}

function StepTwo({
	amountCurrency,
	autoEnabled,
	autoAmountInput,
	autoThresholdInput,
	autoSaving,
	autoError,
	autoDirty,
	onEnableToggle,
	onAutoAmountChange,
	onAutoThresholdChange,
	onSave,
	onFinish,
	onSkip,
	depositComplete,
	confirmedDepositCents
}: StepTwoProps) {
	return (
		<div className="space-y-3">
			{depositComplete && confirmedDepositCents ? (
				<section className="rounded-lg border border-green-200 bg-green-50 p-3 text-[13px] text-green-800 dark:border-green-900 dark:bg-green-900/20 dark:text-green-200">
					<p className="font-medium">Success! {formatCurrency(confirmedDepositCents)}</p>
					<p className="mt-1 text-[12px]">
						Set up auto-recharge to keep your balance healthy. You can change these settings anytime
						from the billing page.
					</p>
				</section>
			) : null}

			<section className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white">Auto-recharge</h3>
						<p className="mt-1 text-[12px] text-gray-500 dark:text-gray-400">
							Automatically top up your wallet when the balance dips below your threshold.
						</p>
					</div>
					<Switch checked={autoEnabled} onCheckedChange={onEnableToggle} />
				</div>

				<div
					className={cn(
						'mt-3 space-y-3 transition-opacity',
						autoEnabled ? 'opacity-100' : 'pointer-events-none opacity-50'
					)}
				>
					<div>
						<label className="mb-1 block text-[11px] font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
							Recharge amount (USD)
						</label>
						<Input
							type="number"
							min={10}
							step={1}
							value={autoAmountInput}
							onChange={(event) => onAutoAmountChange(event.target.value)}
						/>
					</div>
					<div>
						<label className="mb-1 block text-[11px] font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
							Trigger when balance drops below (USD)
						</label>
						<div className="flex items-center gap-3">
							<Input
								type="number"
								min={2}
								step={1}
								value={autoThresholdInput}
								onChange={(event) => onAutoThresholdChange(event.target.value)}
								className="flex-1"
							/>
							<Slider
								min={2}
								max={50}
								step={1}
								value={Number(autoThresholdInput) || 0}
								onChange={(event) =>
									onAutoThresholdChange(String((event.target as HTMLInputElement).value))
								}
								className="flex-1"
							/>
						</div>
						<p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
							Minimum threshold is $2.00.
						</p>
					</div>
				</div>

				{autoError ? <p className="mt-2 text-[11px] text-red-500">{autoError}</p> : null}

				<div className="mt-2.5 flex flex-col gap-1.5 sm:flex-row sm:justify-end">
					<div className="flex flex-col gap-1.5 sm:flex-row">
						<Button
							variant="ghost"
							size="sm"
							className="w-full sm:w-auto"
							disabled={autoSaving}
							onClick={onSkip}
						>
							Skip
						</Button>
            <Button
							variant="primary"
							size="sm"
							className="w-full sm:w-auto"
							disabled={autoSaving || !autoEnabled}
							loading={autoSaving && autoEnabled}
							onClick={onSave}
						>
							Save
						</Button>
					</div>
				</div>
			</section>
		</div>
	);
}

function AmountButton({
	label,
	active,
	onClick
}: {
	label: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				'rounded-md border px-2 py-2 text-xs font-semibold transition',
				active
					? 'border-transparent bg-red-500 text-white shadow-md'
					: 'border-gray-200 bg-white text-gray-700 hover:border-rose-200 hover:text-rose-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
			)}
		>
			{label}
		</button>
	);
}

function formatUnits(units: number, unitLabel: string): string {
	if (!Number.isFinite(units)) {
		return `0 ${unitLabel}`;
	}
	if (units >= 100) {
		return `${Math.round(units).toLocaleString()} ${unitLabel}`;
	}
	return `${units.toFixed(1)} ${unitLabel}`;
}

function dollarsToCents(value: string): number {
	const sanitized = value.replace(/[^0-9.]/g, '');
	const parsed = parseFloat(sanitized);
	if (Number.isFinite(parsed)) {
		return Math.round(parsed * 100);
	}
	return 0;
}
