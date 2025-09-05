import PageMeta from '../components/common/PageMeta';
import EmailInbox from '../components/email/EmailInbox';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { useEffect } from 'react';

export default function EmailPage() {
	const { setTitle } = useBreadcrumbs();

	useEffect(() => {
		setTitle('Email Inbox');
	}, [setTitle]);

	return (
		<>
			<PageMeta title="Email Inbox" description="Manage your email inbox" />
			<EmailInbox />
		</>
	);
}
