import { useParams, useSearchParams } from 'react-router-dom';
import { useAudit } from '../hooks/useAudit';
import { Button } from '../components/ui/button';
import { AlertCircle, CheckCircle2, AlertTriangle, XCircle, RotateCcw, History } from 'lucide-react';
import PageMeta from '../components/common/PageMeta';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { useEffect } from 'react';
import { cn } from '../utils/common';

export default function AuditResults() {
	const { siteId } = useParams<{ siteId: string }>();
	const [searchParams, setSearchParams] = useSearchParams();
	const snapshotId = searchParams.get('snapshot');
	const { audit, isLoading, isInProgress, error, runAudit, history } = useAudit(siteId, snapshotId);

	const handleRunAudit = async () => {
		setSearchParams({});
		await runAudit();
	};
	const { setTitle } = useBreadcrumbs();

	useEffect(() => {
		setTitle('Site Audit');
	}, [setTitle]);

	if (!siteId) {
		return <div className="p-6">Site not found</div>;
	}

	if (isLoading && !audit) {
		return (
			<div className="p-6">
				<div className="animate-pulse">
					<div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
					<div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
				</div>
			</div>
		);
	}

	if (isInProgress && !audit) {
		return (
			<div className="p-6">
				<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
					<div className="animate-spin h-12 w-12 border-4 border-blue-200 border-t-blue-500 rounded-full mx-auto mb-4"></div>
					<h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
						Audit in Progress
					</h2>
					<p className="text-blue-700 dark:text-blue-200">
						Scanning your website... This typically takes 10-30 seconds
					</p>
				</div>
			</div>
		);
	}

	if (!audit) {
		return (
			<div className="p-6">
				<div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg p-12 text-center">
					<AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
						No Audit Available
					</h2>
					<p className="text-gray-600 dark:text-gray-400 mb-6">
						Start your first site audit to get a detailed technical SEO report
					</p>
					<Button onClick={handleRunAudit} disabled={isLoading}>
						<RotateCcw className="w-4 h-4 mr-2" />
						Start Audit
					</Button>
				</div>
			</div>
		);
	}

	const getHealthColor = (status: string) => {
		switch (status) {
			case 'good':
				return 'text-green-600 dark:text-green-400';
			case 'warning':
				return 'text-yellow-600 dark:text-yellow-400';
			case 'critical':
				return 'text-red-600 dark:text-red-400';
			default:
				return 'text-gray-600 dark:text-gray-400';
		}
	};

	const getHealthBgColor = (status: string) => {
		switch (status) {
			case 'good':
				return 'bg-green-50 dark:bg-green-900/20';
			case 'warning':
				return 'bg-yellow-50 dark:bg-yellow-900/20';
			case 'critical':
				return 'bg-red-50 dark:bg-red-900/20';
			default:
				return 'bg-gray-50 dark:bg-gray-900/50';
		}
	};

	const getCWVStatus = (status: string) => {
		switch (status) {
			case 'good':
				return <span className="inline-flex items-center gap-1 text-success-600 dark:text-success-400"><CheckCircle2 className="size-3.5" /> Good</span>;
			case 'needs_improvement':
				return <span className="inline-flex items-center gap-1 text-warning-600 dark:text-warning-400"><AlertTriangle className="size-3.5" /> Needs Improvement</span>;
			case 'poor':
				return <span className="inline-flex items-center gap-1 text-error-600 dark:text-error-400"><XCircle className="size-3.5" /> Poor</span>;
			default:
				return <span className="text-gray-400">Unknown</span>;
		}
	};

	return (
		<>
			<PageMeta noIndex title="Site Audit Results" description="Technical SEO audit results" />

			<div className="max-w-6xl mx-auto p-6 space-y-8">
				{/* Header */}
				<div className="flex justify-between items-start">
					<div>
						<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
							Site Technical Audit
						</h1>
						<p className="text-gray-600 dark:text-gray-400">
							{snapshotId ? (
								<span className="text-amber-700 dark:text-amber-300">
									Viewing saved report from {new Date(audit.createdAt).toLocaleString()} — not
									necessarily the latest crawl.
								</span>
							) : (
								<>Last scanned: {new Date(audit.createdAt).toLocaleDateString()}</>
							)}
						</p>
					</div>
					<div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
						{snapshotId && (
							<Button variant="outline" onClick={() => setSearchParams({})}>
								View latest audit
							</Button>
						)}
						<Button onClick={handleRunAudit} disabled={isLoading}>
							<RotateCcw className="w-4 h-4 mr-2" />
							Re-run Audit
						</Button>
					</div>
				</div>

				{history.length > 0 && (
					<div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
						<div className="mb-2 flex items-center gap-2">
							<History className="h-4 w-4 text-gray-500" />
							<h2 className="text-sm font-semibold text-gray-900 dark:text-white">Past reports</h2>
						</div>
						<p className="mb-3 text-xs text-gray-600 dark:text-gray-400">
							Each run saves a snapshot (health score, crawl counts, DA/CWV). Open an older report to
							compare with the current site state.
						</p>
						<div className="flex flex-wrap gap-2">
							{history.map((h) => {
								const latestId = history[0]?.id;
								const active =
									(snapshotId && h.id === snapshotId) ||
									(!snapshotId && h.id === latestId);
								return (
									<button
										key={h.id}
										type="button"
										onClick={() => {
											if (h.id === latestId) setSearchParams({});
											else setSearchParams({ snapshot: h.id });
										}}
										className={cn(
											'rounded-lg border px-3 py-2 text-left text-xs transition-colors',
											active
												? 'border-brand-500 bg-brand-50 text-brand-900 dark:bg-brand-950/40 dark:text-brand-100'
												: 'border-gray-200 bg-white hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:hover:bg-gray-800'
										)}
									>
										<span className="font-medium">
											{new Date(h.created_at).toLocaleDateString()}{' '}
											<span className="text-gray-500 dark:text-gray-400">
												{new Date(h.created_at).toLocaleTimeString([], {
													hour: '2-digit',
													minute: '2-digit'
												})}
											</span>
										</span>
										<span className="mt-0.5 block text-[11px] text-gray-600 dark:text-gray-400">
											Score {h.overall_score} · {h.health_status} · {h.crawl_total_issues ?? '—'}{' '}
											issues
										</span>
									</button>
								);
							})}
						</div>
					</div>
				)}

				{/* Overall Score Card */}
				<div className={`${getHealthBgColor(audit.healthStatus)} rounded-lg p-8 border border-current`}>
					<div className="flex items-center justify-between">
						<div className="flex-1">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
								Overall Health
							</h2>
							<p className={`text-sm font-medium ${getHealthColor(audit.healthStatus)}`}>
								Status: {audit.healthStatus.toUpperCase()}
							</p>
						</div>
						<div className="text-right">
							<div className="text-6xl font-bold text-gray-900 dark:text-white">
								{audit.overallScore}
							</div>
							<p className="text-gray-600 dark:text-gray-400 text-sm">out of 100</p>
						</div>
					</div>
				</div>

				{/* Issues Summary */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
						<div className="text-3xl font-bold text-red-600 dark:text-red-400">
							{audit.crawlResults.criticalIssues}
						</div>
						<p className="text-red-700 dark:text-red-300 text-sm font-medium mt-1">
							Critical Issues
						</p>
					</div>

					<div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 border border-yellow-200 dark:border-yellow-800">
						<div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
							{audit.crawlResults.warningIssues}
						</div>
						<p className="text-yellow-700 dark:text-yellow-300 text-sm font-medium mt-1">
							Warning Issues
						</p>
					</div>

					<div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
						<div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
							{audit.crawlResults.totalPagesCrawled}
						</div>
						<p className="text-blue-700 dark:text-blue-300 text-sm font-medium mt-1">
							Pages Crawled
						</p>
					</div>

					<div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
						<div className="text-3xl font-bold text-green-600 dark:text-green-400">
							{audit.crawlResults.indexablePages}
						</div>
						<p className="text-green-700 dark:text-green-300 text-sm font-medium mt-1">
							Indexable Pages
						</p>
					</div>
				</div>

				{/* Crawlability Status */}
				{!audit.crawlabilityCheck.isCrawlable && (
					<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
						<div className="flex items-start gap-4">
							<AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
							<div className="flex-1">
								<h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
									Crawlability Issues Detected
								</h3>
								{audit.crawlabilityCheck.issues.map((issue, idx) => (
									<div key={idx} className="mb-4 pb-4 border-b border-red-200 dark:border-red-800 last:border-0 last:mb-0">
										<p className="font-medium text-red-800 dark:text-red-200">{issue.title}</p>
										<p className="text-red-700 dark:text-red-300 text-sm mt-1">{issue.message}</p>
										<p className="text-red-600 dark:text-red-400 text-sm mt-2">
											<strong>Solution:</strong> {issue.solution}
										</p>
									</div>
								))}
							</div>
						</div>
					</div>
				)}

				{/* Domain Authority */}
				<div className={`rounded-lg p-6 border ${audit.domainAuthority.error ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'}`}>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
						Domain Authority
					</h3>
					{audit.domainAuthority.error ? (
						<div className="flex items-start gap-3">
							<AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
							<div>
								<p className="font-medium text-red-900 dark:text-red-100">API Error</p>
								<p className="text-red-700 dark:text-red-300 text-sm mt-1">
									Could not fetch Domain Authority from Moz API: {audit.domainAuthority.error}
								</p>
								<p className="text-red-600 dark:text-red-400 text-xs mt-2">
									Please try running the audit again.
								</p>
							</div>
						</div>
					) : (
						<div className="flex items-center justify-between">
							<div>
								<div className="text-4xl font-bold text-gray-900 dark:text-white">
									{audit.domainAuthority.estimated}
								</div>
								<p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
									out of 100
									<span className="ml-2 text-xs font-medium text-gray-500">
										({audit.domainAuthority.confidence} confidence via {audit.domainAuthority.method})
									</span>
								</p>
							</div>
							{audit.domainAuthority.estimated < 20 && (
								<p className="text-sm text-yellow-700 dark:text-yellow-300 max-w-xs">
									Your domain authority is low. Focus on building quality backlinks to improve rankings.
								</p>
							)}
						</div>
					)}
				</div>

				{/* Core Web Vitals */}
				<div className={`rounded-lg p-6 border ${audit.coreWebVitals.error ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'}`}>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
						Core Web Vitals
					</h3>
					{audit.coreWebVitals.error ? (
						<div className="flex items-start gap-3">
							<AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
							<div>
								<p className="font-medium text-red-900 dark:text-red-100">API Error</p>
								<p className="text-red-700 dark:text-red-300 text-sm mt-1">
									Could not fetch Core Web Vitals from Google PageSpeed Insights: {audit.coreWebVitals.error}
								</p>
								<p className="text-red-600 dark:text-red-400 text-xs mt-2">
									Please try running the audit again.
								</p>
							</div>
						</div>
					) : (
						<>
							<p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
								Real metrics from Google PageSpeed Insights. {getCWVStatus(audit.coreWebVitals.status)}
							</p>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								<div>
									<p className="font-medium text-gray-900 dark:text-white mb-2">
										LCP (Largest Contentful Paint)
									</p>
									<div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
										{audit.coreWebVitals.lcpEstimate}ms
									</div>
									<p className="text-sm text-gray-600 dark:text-gray-400">
								{audit.coreWebVitals.lcpEstimate < 2500 ? (
										<span className="inline-flex items-center gap-1 text-success-600 dark:text-success-400"><CheckCircle2 className="size-3.5" /> Good (target: &lt;2.5s)</span>
									) : (
										<span className="inline-flex items-center gap-1 text-error-600 dark:text-error-400"><XCircle className="size-3.5" /> Needs improvement (target: &lt;2.5s)</span>
									)}
									</p>
								</div>

								<div>
									<p className="font-medium text-gray-900 dark:text-white mb-2">
										CLS (Cumulative Layout Shift)
									</p>
									<div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
										{audit.coreWebVitals.clsEstimate.toFixed(2)}
									</div>
									<p className="text-sm text-gray-600 dark:text-gray-400">
								{audit.coreWebVitals.clsEstimate < 0.1 ? (
										<span className="inline-flex items-center gap-1 text-success-600 dark:text-success-400"><CheckCircle2 className="size-3.5" /> Good (target: &lt;0.1)</span>
									) : (
										<span className="inline-flex items-center gap-1 text-error-600 dark:text-error-400"><XCircle className="size-3.5" /> Needs improvement (target: &lt;0.1)</span>
									)}
									</p>
								</div>

								<div>
									<p className="font-medium text-gray-900 dark:text-white mb-2">
										INP (Interaction to Next Paint)
									</p>
									<div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
										{audit.coreWebVitals.inpEstimate}ms
									</div>
									<p className="text-sm text-gray-600 dark:text-gray-400">
								{audit.coreWebVitals.inpEstimate < 200 ? (
										<span className="inline-flex items-center gap-1 text-success-600 dark:text-success-400"><CheckCircle2 className="size-3.5" /> Good (target: &lt;200ms)</span>
									) : (
										<span className="inline-flex items-center gap-1 text-error-600 dark:text-error-400"><XCircle className="size-3.5" /> Needs improvement (target: &lt;200ms)</span>
									)}
									</p>
								</div>
							</div>
						</>
					)}
				</div>

				{/* Indexation Status */}
				<div className={`rounded-lg p-6 border ${audit.indexationStatus.error ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'}`}>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
						Indexation Status
					</h3>
					{audit.indexationStatus.error ? (
						<div className="flex items-start gap-3">
							<AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
							<div>
								<p className="font-medium text-red-900 dark:text-red-100">Check Failed</p>
								<p className="text-red-700 dark:text-red-300 text-sm mt-1">
									{audit.indexationStatus.error}
								</p>
								<p className="text-red-600 dark:text-red-400 text-xs mt-2">
									Connect Google Search Console to see indexation data.
								</p>
							</div>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
									GSC Connection
								</p>
								<p className="text-lg font-semibold text-gray-900 dark:text-white">
								{audit.indexationStatus.gscConnected ? (
									<span className="inline-flex items-center gap-1 text-success-600 dark:text-success-400"><CheckCircle2 className="size-4" /> Connected</span>
								) : (
									<span className="inline-flex items-center gap-1 text-warning-600 dark:text-warning-400"><AlertTriangle className="size-4" /> Not Connected</span>
								)}
								</p>
							</div>
							<div>
								<p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
									Estimated Crawl Budget
								</p>
								<p className="text-lg font-semibold text-gray-900 dark:text-white">
									{audit.indexationStatus.estimatedCrawlBudget}
								</p>
							</div>
						</div>
					)}
				</div>

				{/* Recommendations */}
				{audit.recommendations.length > 0 && (
					<div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
							Recommendations
						</h3>
						<ul className="space-y-3">
							{audit.recommendations.map((rec, idx) => (
								<li key={idx} className="flex items-start gap-3">
									<CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
									<p className="text-gray-700 dark:text-gray-300">{rec}</p>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</>
	);
}
