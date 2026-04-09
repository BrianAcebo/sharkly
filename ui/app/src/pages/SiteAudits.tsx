import { Link } from 'react-router';
import { useAudit } from '../hooks/useAudit';
import { Button } from '../components/ui/button';
import { AlertTriangle, RotateCcw, ChevronRight, ArrowLeft } from 'lucide-react';
import PageMeta from '../components/common/PageMeta';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { useEffect } from 'react';
import { useSiteContext } from '../contexts/SiteContext';

/** Lists saved technical SEO audits for the site selected in the header. Detail: `/audits/:snapshotId`. */
export default function SiteAudits() {
	const { selectedSite } = useSiteContext();
	const siteId = selectedSite?.id;
	const { isLoading, isInProgress, error, runAudit, history, refetch } = useAudit(siteId, undefined);

	const { setTitle } = useBreadcrumbs();

	useEffect(() => {
		setTitle('Site audits');
	}, [setTitle]);

	if (!siteId) {
		return (
			<div className="mx-auto max-w-6xl p-6">
				<p className="text-gray-600 dark:text-gray-400">Select a site in the header to view audit history.</p>
			</div>
		);
	}

	if (isLoading && history.length === 0) {
		return (
			<div className="p-6">
				<div className="mx-auto max-w-6xl animate-pulse">
					<div className="mb-4 h-10 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
					<div className="mb-8 h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
					<div className="h-40 rounded bg-gray-200 dark:bg-gray-700" />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="mx-auto max-w-6xl p-6">
				<div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
					<p className="text-red-800 dark:text-red-200">{error}</p>
					<Button className="mt-4" variant="outline" type="button" onClick={() => refetch()}>
						Retry
					</Button>
				</div>
			</div>
		);
	}

	if (isInProgress && history.length === 0) {
		return (
			<div className="p-6">
				<div className="mx-auto max-w-lg rounded-lg border border-blue-200 bg-blue-50 p-6 text-center dark:border-blue-800 dark:bg-blue-900/20">
					<div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500" />
					<h2 className="mb-2 text-lg font-semibold text-blue-900 dark:text-blue-100">
						Audit in Progress
					</h2>
					<p className="text-blue-700 dark:text-blue-200">
						Scanning your website... This typically takes 10-30 seconds
					</p>
				</div>
			</div>
		);
	}

	return (
		<>
			<PageMeta noIndex title="Site audit reports" description="Saved technical SEO audit runs" />
			<div className="mx-auto max-w-6xl space-y-6 p-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<Link
							to="/technical"
							className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
						>
							<ArrowLeft className="size-4" />
							Technical SEO
						</Link>
						<h1 className="text-3xl font-bold text-gray-900 dark:text-white">Site audit reports</h1>
						<p className="mt-1 text-gray-600 dark:text-gray-400">
							Audits for <span className="font-medium text-gray-800 dark:text-gray-200">{selectedSite?.name}</span>.
							Open one for the full report. Separate from crawl history on Technical SEO.
						</p>
					</div>
					<Button onClick={() => void runAudit()} disabled={isLoading} className="shrink-0">
						<RotateCcw className="mr-2 h-4 w-4" />
						Re-run audit
					</Button>
				</div>

				{isInProgress && history.length > 0 && (
					<div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100">
						A new audit is running. This list will update when it finishes.
					</div>
				)}

				{history.length === 0 ? (
					<div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-900/50">
						<AlertTriangle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
						<h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">No reports yet</h2>
						<p className="mb-6 text-gray-600 dark:text-gray-400">
							Run a site audit to save your first snapshot.
						</p>
						<Button onClick={() => void runAudit()} disabled={isLoading}>
							<RotateCcw className="mr-2 h-4 w-4" />
							Start audit
						</Button>
					</div>
				) : (
					<ul className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-900">
						{history.map((h) => (
							<li key={h.id}>
								<Link
									to={`/audits/${encodeURIComponent(h.id)}`}
									className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/80"
								>
									<div>
										<p className="font-medium text-gray-900 dark:text-white">
											{new Date(h.created_at).toLocaleString()}
										</p>
										<p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
											Score {h.overall_score} · {h.health_status} · {h.crawl_total_issues ?? '—'}{' '}
											issues · {h.crawl_total_pages ?? '—'} pages
										</p>
									</div>
									<ChevronRight className="size-5 shrink-0 text-gray-400" />
								</Link>
							</li>
						))}
					</ul>
				)}
			</div>
		</>
	);
}
