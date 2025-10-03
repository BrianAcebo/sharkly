import PageMeta from '../components/common/PageMeta';
import EmailInbox from '../components/email/EmailInbox';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { fetchWalletStatus } from '../api/billing';
import { WalletDepositModal } from '../components/billing/WalletDepositModal';

export default function EmailPage() {
	const { setTitle } = useBreadcrumbs();
  const { user } = useAuth();
  const [depositOpen, setDepositOpen] = useState(false);

	useEffect(() => {
		setTitle('Email Inbox');
	}, [setTitle]);

  useEffect(() => {
    (async () => {
      try {
        if (!user?.organization_id) return;
        const status = await fetchWalletStatus(user.organization_id);
        const blocked = status.depositRequired || status.wallet?.status === 'suspended';
        setDepositOpen(blocked);
      } catch {}
    })();
  }, [user?.organization_id]);

	return (
		<>
			<PageMeta title="Email Inbox" description="Manage your email inbox" />
			<EmailInbox />
      <WalletDepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
		</>
	);
}
