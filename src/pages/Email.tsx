import PageMeta from '../components/common/PageMeta';
import EmailInbox from '../components/email/EmailInbox';

export default function EmailPage() {
	return (
		<>
			<PageMeta title="Email Inbox" description="Manage your email inbox" />
			<EmailInbox />
		</>
	);
}
