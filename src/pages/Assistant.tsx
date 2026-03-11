import PageMeta from '../components/common/PageMeta';
import AIAssistant from '../components/assistant/AIAssistant';
import { TierGate } from '../components/common/TierGate';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { useEffect } from 'react';

export default function AssistantPage() {
	const { setTitle } = useBreadcrumbs();

	useEffect(() => {
		setTitle('Fin');
	}, [setTitle]);

	return (
		<TierGate requiredTier="growth" pageTitle="Fin" requireFinAddon>
			<PageMeta title="Fin" description="Your SEO assistant — read project data, explain findings, suggest next actions" />
			<AIAssistant />
		</TierGate>
	);
}
