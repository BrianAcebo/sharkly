/**
 * V1 — Content Calendar (/calendar)
 * Placeholder until content_calendar and publish scheduling exist.
 */
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { AIInsightBlock } from '../components/shared/AIInsightBlock';
import { useSiteContext } from '../contexts/SiteContext';
import { CalendarDays } from 'lucide-react';

export default function Calendar() {
	const { selectedSite } = useSiteContext();

	return (
		<>
			<PageMeta title="Content Calendar" description="Plan and schedule content" />

			<PageHeader
				title="Content Calendar"
				subtitle={
					selectedSite
						? `${selectedSite.name} · Plan and schedule your content`
						: 'Select a site to view your content calendar'
				}
			/>

			<div className="p-6">
				<AIInsightBlock
					variant="info"
					label="CONTENT CALENDAR"
					message="Your content calendar will show planned, drafted, and published pieces by cluster. Scheduling and publish dates are coming soon."
				/>

				<div className="mt-6 rounded-xl border border-gray-200 bg-white p-12 dark:border-gray-700 dark:bg-gray-900">
					<div className="flex flex-col items-center justify-center text-center">
						<CalendarDays className="size-14 text-gray-400 dark:text-gray-500" />
						<h2 className="font-montserrat mt-4 text-lg font-bold text-gray-900 dark:text-white">
							Content calendar
						</h2>
						<p className="mt-2 max-w-sm text-sm text-gray-600 dark:text-gray-400">
							View and schedule content from your clusters here. This view is being built — use
							Strategy and Clusters to manage your content for now.
						</p>
					</div>
				</div>
			</div>
		</>
	);
}
