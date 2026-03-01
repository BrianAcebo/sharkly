import PageMeta from '../components/common/PageMeta';
import { Button } from '../components/ui/button';

export default function SettingsIntegrations() {
	return (
		<>
			<PageMeta title="Integrations" description="Connect your tools" />
			<h1 className="font-montserrat text-xl font-bold text-gray-900 dark:text-white">
				Integrations
			</h1>
			<p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
				Connect your tools to unlock more features
			</p>

			<div className="mt-6 flex flex-col gap-4">
				<div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700">
					<div className="bg-blue-light-50 text-blue-light-600 flex size-10 items-center justify-center rounded-lg">
						G
					</div>
					<div className="flex-1">
						<div className="font-semibold text-gray-900 dark:text-white">Google Search Console</div>
						<p className="text-sm text-gray-600 dark:text-gray-400">
							Pull keyword rankings, impressions, and CTR data.
						</p>
					</div>
					<span className="bg-success-50 text-success-600 rounded-full px-3 py-1 text-xs font-semibold">
						● Connected
					</span>
					<Button variant="outline" size="sm" className="border-gray-200 dark:border-gray-700">
						Manage
					</Button>
				</div>

				<div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700">
					<div className="bg-success-600 flex size-10 items-center justify-center rounded-lg text-white">
						S
					</div>
					<div className="flex-1">
						<div className="font-semibold text-gray-900 dark:text-white">Shopify</div>
						<p className="text-sm text-gray-600 dark:text-gray-400">
							Publish content directly, sync product data, optimize collections.
						</p>
					</div>
					<span className="rounded-full bg-gray-50 px-3 py-1 text-xs text-gray-500 dark:bg-gray-900 dark:text-gray-400">
						Not Connected
					</span>
					<Button size="sm" className="bg-brand-500 hover:bg-brand-600 text-white">
						Connect
					</Button>
				</div>

				<div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700">
					<div className="bg-blue-light-600 flex size-10 items-center justify-center rounded-lg text-white">
						W
					</div>
					<div className="flex-1">
						<div className="font-semibold text-gray-900 dark:text-white">WordPress</div>
						<p className="text-sm text-gray-600 dark:text-gray-400">
							Publish content directly to WordPress.
						</p>
					</div>
					<span className="rounded-full bg-gray-50 px-3 py-1 text-xs text-gray-500 dark:bg-gray-900 dark:text-gray-400">
						Not Connected
					</span>
					<Button variant="outline" size="sm" className="border-gray-200 dark:border-gray-700">
						Connect
					</Button>
				</div>

				<div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 opacity-50 dark:border-gray-700">
					<div className="bg-warning-500 flex size-10 items-center justify-center rounded-lg text-white">
						GA
					</div>
					<div className="flex-1">
						<div className="font-semibold text-gray-900 dark:text-white">Google Analytics</div>
						<p className="text-sm text-gray-600 dark:text-gray-400">Traffic and behavior data.</p>
					</div>
					<span className="rounded-full bg-gray-50 px-3 py-1 text-xs text-gray-500 dark:bg-gray-900 dark:text-gray-400">
						Coming Soon
					</span>
				</div>
			</div>
		</>
	);
}
