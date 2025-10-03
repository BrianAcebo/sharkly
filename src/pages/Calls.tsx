import PageMeta from '../components/common/PageMeta';
import Calls from '../components/calls/Calls';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { fetchWalletStatus } from '../api/billing';
import { WalletDepositModal } from '../components/billing/WalletDepositModal';

export default function CallsPage() {
	const { setTitle } = useBreadcrumbs();
  const { user } = useAuth();
  const [needsDeposit, setNeedsDeposit] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);

	useEffect(() => {
		setTitle('Calls');
	}, [setTitle]);

  useEffect(() => {
    (async () => {
      try {
        if (!user?.organization_id) return;
        const status = await fetchWalletStatus(user.organization_id);
        const blocked = status.depositRequired || status.wallet?.status === 'suspended';
        setNeedsDeposit(blocked);
        setDepositOpen(blocked);
      } catch {}
    })();
  }, [user?.organization_id]);

	return (
		<>
			<PageMeta title="Calls" description="Manage your calls and contacts" />
      <Calls />
      <WalletDepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
		</>
	);
}