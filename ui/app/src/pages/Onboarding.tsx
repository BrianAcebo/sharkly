/**
 * Profile onboarding (name + avatar). Runs first; `completed_onboarding` on profiles.
 */
import PageMeta from '../components/common/PageMeta';
import OnboardingForm from '../components/auth/OnboardingForm';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { useEffect } from 'react';

export default function Onboarding() {
	const { setTitle } = useBreadcrumbs();

	useEffect(() => {
		setTitle('Complete your profile');
	}, [setTitle]);

	return (
		<>
			<PageMeta
				noIndex
				title="Complete your profile"
				description="Add your name and optional avatar"
			/>
			<OnboardingForm />
		</>
	);
}
