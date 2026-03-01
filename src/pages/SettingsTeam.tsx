import PageMeta from '../components/common/PageMeta';
import { Button } from '../components/ui/button';

export default function SettingsTeam() {
	return (
		<>
			<PageMeta title="Team" description="Team settings" />
			<div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-900">
				<span className="text-5xl">🔒</span>
				<h2 className="font-montserrat mt-4 text-lg font-bold text-gray-900 dark:text-white">
					Team features coming in V2
				</h2>
				<p className="mt-2 max-w-sm text-sm text-gray-600 dark:text-gray-400">
					Invite team members, assign content, and collaborate on strategy.
				</p>
				<Button variant="outline" size="sm" className="mt-4 border-gray-200 dark:border-gray-700">
					Join waitlist
				</Button>
			</div>
		</>
	);
}
