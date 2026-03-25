/**
 * Site audit / profile onboarding (OnboardingForm).
 * When paused in AppLayout (SITE_AUDIT_ONBOARDING_PAUSED), users are redirected to /organization-required instead.
 */
import PageMeta from '../components/common/PageMeta';
import OnboardingForm from '../components/auth/OnboardingForm';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { useEffect } from 'react';

export default function Onboarding() {
	const { setTitle } = useBreadcrumbs();

	useEffect(() => {
		setTitle('Finish Profile');
	}, [setTitle]);

	return (
		<>
			<PageMeta noIndex title="Complete your profile" description="Complete your profile to get started" />
			<OnboardingForm />
		</>
	);
}
