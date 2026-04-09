import { useAudit } from '../../hooks/useAudit';
import { Button } from '../ui/button';
import { RotateCcw, AlertTriangle, AlertCircle, CheckCircle, XCircle, Circle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useSiteContext } from '../../contexts/SiteContext';

export default function AuditScoreCard() {
	const { selectedSite } = useSiteContext();
	const siteId = selectedSite?.id;
	const { audit, isLoading, isInProgress, runAudit } = useAudit(siteId, 'latest');
	const navigate = useNavigate();

	const getHealthColor = (status: string | undefined) => {
		switch (status) {
			case 'good':
				return 'from-green-500 to-green-600 dark:from-green-600 dark:to-green-700';
			case 'warning':
				return 'from-yellow-500 to-yellow-600 dark:from-yellow-600 dark:to-yellow-700';
			case 'critical':
				return 'from-red-500 to-red-600 dark:from-red-600 dark:to-red-700';
			default:
				return 'from-gray-400 to-gray-500 dark:from-gray-500 dark:to-gray-600';
		}
	};

	const getStatusBadge = (status: string | undefined) => {
		switch (status) {
			case 'good':
				return <CheckCircle className="size-6 text-green-500" />;
			case 'warning':
				return <AlertTriangle className="size-6 text-yellow-500" />;
			case 'critical':
				return <XCircle className="size-6 text-red-500" />;
			default:
				return <Circle className="size-6 text-gray-400" />;
		}
	};

	if (!siteId) {
		return null;
	}

	if (isInProgress && !audit) {
		return (
			<div className="flex h-full min-h-[280px] flex-col rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
				<div className="flex items-center justify-between mb-4">
					<h3 className="font-semibold text-gray-900 dark:text-white">Site Audit</h3>
					<div className="animate-spin h-4 w-4 border-2 border-blue-200 border-t-blue-600 rounded-full"></div>
				</div>
				<p className="text-sm text-gray-600 dark:text-gray-400">
					Audit in progress... Check back in a moment
				</p>
			</div>
		);
	}

	if (!audit) {
		return (
			<div className="flex h-full min-h-[280px] flex-col rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
				<div className="flex items-center justify-between mb-4">
					<h3 className="font-semibold text-gray-900 dark:text-white">Site Audit</h3>
					<AlertTriangle className="h-5 w-5 text-yellow-500" />
				</div>
				<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
					No audit available yet. Start your first scan to see detailed technical insights.
				</p>
				<Button
					size="sm"
					onClick={runAudit}
					disabled={isLoading}
					className="w-full"
				>
					<RotateCcw className="w-4 h-4 mr-2" />
					Start Audit
				</Button>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
			{/* Header */}
			<div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
				<div className="flex items-center justify-between">
					<h3 className="font-semibold text-gray-900 dark:text-white">Site Audit</h3>
					<button
						onClick={runAudit}
						disabled={isLoading}
						className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
					>
						<RotateCcw className="w-4 h-4" />
					</button>
				</div>
				<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
					Last: {new Date(audit.createdAt).toLocaleDateString()}
				</p>
			</div>

			{/* Score and Status */}
			<div className="flex flex-1 flex-col px-6 py-6">
				<div className="flex items-center gap-6 mb-6">
					{/* Score Circle */}
					<div className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${getHealthColor(audit.healthStatus)} flex items-center justify-center flex-shrink-0`}>
						<div className="text-center">
							<div className="text-3xl font-bold text-white">{audit.overallScore}</div>
							<div className="text-xs text-white/80">Score</div>
						</div>
					</div>

					{/* Status Info */}
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-2">
							<span className="text-2xl">{getStatusBadge(audit.healthStatus)}</span>
							<span className="font-semibold text-gray-900 dark:text-white capitalize">
								{audit.healthStatus}
							</span>
						</div>
						<div className="space-y-1 text-sm">
							<div className="text-gray-600 dark:text-gray-400">
								<strong>{audit.crawlResults.criticalIssues}</strong> critical issues
							</div>
							<div className="text-gray-600 dark:text-gray-400">
								<strong>{audit.crawlResults.totalPagesCrawled}</strong> pages crawled
							</div>
						</div>
					</div>
				</div>

				{/* Issues Breakdown */}
				<div className="grid grid-cols-3 gap-3 mb-6">
					<div className="bg-red-50 dark:bg-red-900/20 rounded p-3 text-center">
						<div className="text-lg font-bold text-red-600 dark:text-red-400">
							{audit.crawlResults.criticalIssues}
						</div>
						<div className="text-xs text-red-700 dark:text-red-300">Critical</div>
					</div>
					<div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-3 text-center">
						<div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
							{audit.crawlResults.warningIssues}
						</div>
						<div className="text-xs text-yellow-700 dark:text-yellow-300">Warning</div>
					</div>
					<div className="bg-green-50 dark:bg-green-900/20 rounded p-3 text-center">
						<div className="text-lg font-bold text-green-600 dark:text-green-400">
							{audit.crawlResults.indexablePages}
						</div>
						<div className="text-xs text-green-700 dark:text-green-300">Indexable</div>
					</div>
				</div>

				{/* Top Recommendations */}
				{audit.recommendations.length > 0 && (
					<div className="mb-6">
						<h4 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
							Top Recommendations
						</h4>
						<ul className="space-y-1 text-sm">
							{audit.recommendations.slice(0, 3).map((rec, idx) => (
								<li key={idx} className="text-gray-600 dark:text-gray-400 flex items-start gap-2">
									<span className="text-blue-500 flex-shrink-0">→</span>
									<span>{rec}</span>
								</li>
							))}
						</ul>
					</div>
				)}

				{/* View audit reports (list → pick a snapshot) */}
				<button
					type="button"
					onClick={() => navigate('/technical')}
					className="mt-auto w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
				>
					View Report
				</button>
			</div>
		</div>
	);
}
