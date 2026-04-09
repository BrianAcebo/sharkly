import { useParams, Link, Navigate, useNavigate } from 'react-router';
import { useAudit } from '../hooks/useAudit';
import { Button } from '../components/ui/button';
import {
	AlertCircle,
	CheckCircle2,
	AlertTriangle,
	XCircle,
	RotateCcw,
	ArrowLeft
} from 'lucide-react';
import PageMeta from '../components/common/PageMeta';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { useEffect } from 'react';
import { useSiteContext } from '../contexts/SiteContext';

/** Single saved technical SEO audit. Uses the site selected in the header; route is `/audits/:snapshotId`. */
export default function AuditResults() {
	const { snapshotId } = useParams<{ snapshotId: string }>();
	const navigate = useNavigate();
	const { selectedSite } = useSiteContext();
	const siteId = selectedSite?.id;

	const { audit, isLoading, error, runAudit, refetch } = useAudit(siteId, snapshotId);

	const handleRunAudit = async () => {
		await runAudit();
		navigate('/audits');
	};

	const { setTitle } = useBreadcrumbs();

	useEffect(() => {
		setTitle('Site Audit');
	}, [setTitle]);

	if (!siteId) {
		return (
			<div className="mx-auto max-w-6xl p-6">
				<p className="text-gray-600 dark:text-gray-400">Select a site in the header to view this audit.</p>
			</div>
		);
	}

	if (!snapshotId) {
		return <Navigate to="/audits" replace />;
	}

	if (isLoading && !audit) {
		return (
			<div className="p-6">
				<div className="animate-pulse">
					<div className="mb-6 h-12 rounded bg-gray-200 dark:bg-gray-700"></div>
					<div className="h-64 rounded bg-gray-200 dark:bg-gray-700"></div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="mx-auto max-w-6xl space-y-4 p-6">
				<Link
					to="/audits"
					className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
				>
					<ArrowLeft className="size-4" />
					All reports
				</Link>
				<div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
					<p className="text-red-800 dark:text-red-200">{error}</p>
					<Button className="mt-4" variant="outline" type="button" onClick={() => refetch()}>
						Retry
					</Button>
				</div>
			</div>
		);
	}

	if (!audit) {
		return (
			<div className="mx-auto max-w-6xl p-6">
				<Link
					to="/audits"
					className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
				>
					<ArrowLeft className="size-4" />
					All reports
				</Link>
				<p className="mt-8 text-center text-gray-600 dark:text-gray-400">Report not found.</p>
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
				<div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
					<div>
						<Link
							to="/audits"
							className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
						>
							<ArrowLeft className="size-4" />
							All reports
						</Link>
						<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
							Site Technical Audit
						</h1>
						<p className="text-gray-600 dark:text-gray-400">
							<span className="text-amber-700 dark:text-amber-300">
								Saved report · {new Date(audit.createdAt).toLocaleString()}
							</span>
						</p>
					</div>
					<div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
						<Button onClick={() => void handleRunAudit()} disabled={isLoading}>
							<RotateCcw className="w-4 h-4 mr-2" />
							Re-run Audit
						</Button>
					</div>
				</div>

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
