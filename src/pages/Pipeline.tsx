import { useEffect } from 'react';
import PageMeta from '../components/common/PageMeta';
import LeadPipeline from '../components/leads/LeadPipeline';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';

export default function PipelinePage() {
	const { setTitle } = useBreadcrumbs();

	useEffect(() => {
		setTitle('Lead Pipeline');
	}, [setTitle]);

	return (
		<>
			<PageMeta title="Lead Pipeline" description="Manage your leads" />
			<LeadPipeline />
		</>
	);
}
