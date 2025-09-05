import PageMeta from '../components/common/PageMeta';
import Calls from '../components/calls/Calls';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { useEffect } from 'react';

export default function CallsPage() {
	const { setTitle } = useBreadcrumbs();

	useEffect(() => {
		setTitle('Calls');
	}, [setTitle]);

	return (
		<>
			<PageMeta title="Calls" description="Manage your calls and contacts" />
			<Calls />
		</>
	);
}