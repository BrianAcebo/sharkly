import { useEffect, useMemo, useState } from 'react';
import PageMeta from '../components/common/PageMeta';
import Calls from '../components/calls/Calls';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { usePaymentStatus } from '../hooks/usePaymentStatus';
import { WalletDepositModal } from '../components/billing/WalletDepositModal';
import { Button } from '../components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function CallsPage() {
	const { setTitle } = useBreadcrumbs();
	const { walletStatus, refreshWallet } = usePaymentStatus({ autoRefresh: true });
	const [depositOpen, setDepositOpen] = useState(false);
	const [needsDeposit, setNeedsDeposit] = useState(false);
	const [walletChecked, setWalletChecked] = useState(false);

	useEffect(() => {
		if (!walletStatus) return;
		setWalletChecked(true);
		const requiresDeposit =
			!walletStatus.wallet ||
			walletStatus.wallet.status !== 'active' ||
			(walletStatus.wallet.balance_cents ?? 0) <= 0;
		setNeedsDeposit(requiresDeposit);
	}, [walletStatus]);

	useEffect(() => {
		refreshWallet().catch(() => undefined);
	}, [refreshWallet]);

	useEffect(() => {
		setTitle('Calls');
	}, [setTitle]);

	return (
		<>
			<PageMeta title="Calls" description="Manage your calls and contacts" />
			{walletChecked && needsDeposit ? (
				<div className="flex h-full flex-col items-center justify-center gap-6 rounded-lg border border-dashed border-red-200 bg-red-50/60 p-8 text-center dark:border-red-900 dark:bg-red-950/40">
					<div className="flex items-center justify-center rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-900/40 dark:text-red-300">
						<AlertTriangle className="h-8 w-8" />
					</div>
					<h2 className="text-xl font-semibold text-red-700 dark:text-red-200">Add credit to place calls</h2>
					<p className="max-w-xl text-sm text-red-600 dark:text-red-300">
						Calling requires an active wallet balance. Top up your wallet to unlock outbound and inbound calls.
					</p>
					<div className="flex items-center gap-3">
						<Button className="bg-red-600 hover:bg-red-700" onClick={() => setDepositOpen(true)}>
							Add Credit
						</Button>
						<Button variant="outline" onClick={() => (window.location.href = '/billing')}>
							Manage Billing
						</Button>
					</div>
				</div>
			) : (
				<Calls />
			)}
			<WalletDepositModal
				open={depositOpen}
				onClose={() => {
					setDepositOpen(false);
					refreshWallet().catch(() => undefined);
				}}
			/>
		</>
	);
}