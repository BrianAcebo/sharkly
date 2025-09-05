import { Calendar as CalendarComponent } from '../components/calendar/Calendar';
import PageMeta from '../components/common/PageMeta';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { useEffect } from 'react';

export default function CalendarPage() {
	const { setTitle } = useBreadcrumbs();

	useEffect(() => {
		setTitle('Calendar');
	}, [setTitle]);

	return (
		<>
			<PageMeta title="Calendar" description="Manage your tasks and schedule" />
			<div className="container mx-auto px-4 py-6">
				<CalendarComponent />
			</div>
		</>
	);
};
