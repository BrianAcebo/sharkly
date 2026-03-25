/**
 * First-site wizard (after profile + organization + billing). Gated when org has zero sites.
 */
import PageMeta from '../components/common/PageMeta';
import SiteSetupForm from '../components/auth/SiteSetupForm';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { useEffect } from 'react';

export default function SiteSetup() {
	const { setTitle } = useBreadcrumbs();

	useEffect(() => {
		setTitle('Add your site');
	}, [setTitle]);

	return (
		<>
			<PageMeta
				noIndex
				title="Add your site"
				description="Create your first site for this organization"
			/>
			<SiteSetupForm />
		</>
	);
}
