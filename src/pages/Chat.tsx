import PageMeta from '../components/common/PageMeta';
import Chat from '../components/chat/Chat';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { useEffect } from 'react';

export default function ChatPage() {
	const { setTitle } = useBreadcrumbs();

	useEffect(() => {
		setTitle('Messages');
	}, [setTitle]);

	return (
		<>
			<PageMeta title="Chat Messages" description="Manage your chat messages" />
			<Chat />
		</>
	);
}