import PageMeta from '../components/common/PageMeta';
import AIAssistant from '../components/assistant/AIAssistant';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { useEffect } from 'react';

export default function AssistantPage() {
	const { setTitle } = useBreadcrumbs();

	useEffect(() => {
		setTitle('Vera');
	}, [setTitle]);

	return (
		<>
			<PageMeta title="Vera" description="Your investigator assistant powered by AI" />
			<AIAssistant />
		</>
	);
}
