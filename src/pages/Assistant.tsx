import PageMeta from '../components/common/PageMeta';
import AIAssistant from '../components/assistant/AIAssistant';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { useEffect } from 'react';

export default function AssistantPage() {
	const { setTitle } = useBreadcrumbs();

	useEffect(() => {
		setTitle('AI Assistant');
	}, [setTitle]);

	return (
		<>
			<PageMeta title="AI Assistant" description="Your AI assistant for managing tasks and leads" />
			<AIAssistant />
		</>
	);
}