import PageMeta from '../components/common/PageMeta';
import Chat from '../components/chat/Chat';

export default function ChatPage() {
	return (
		<>
			<PageMeta title="Chat Messages" description="Manage your chat messages" />
			<Chat />
		</>
	);
}