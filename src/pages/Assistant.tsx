import PageMeta from '../components/common/PageMeta';
import AIAssistant from '../components/assistant/AIAssistant';

export default function AssistantPage() {
	return (
		<>
			<PageMeta title="AI Assistant" description="Your AI assistant for managing tasks and leads" />
			<AIAssistant />
		</>
	);
}