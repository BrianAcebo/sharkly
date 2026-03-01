/**
 * Technical SEO Page
 * Full site audit, crawl results, and technical issue detection
 * Based on Complete SEO System: Section 1.7 - Technical SEO Audit Layers 1-5
 */

import { useState, useEffect } from 'react';
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { AIInsightBlock } from '../components/shared/AIInsightBlock';
import { Button } from '../components/ui/button';
import { WalletDepositModal } from '../components/billing/WalletDepositModal';
import { useSiteContext } from '../contexts/SiteContext';
import useAuth from '../hooks/useAuth';
import { useOrganization } from '../hooks/useOrganization';
import {
	Wrench,
	AlertTriangle,
	CheckCircle,
	AlertCircle,
	Loader2,
	RefreshCw,
	ChevronDown,
	ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

interface TechnicalIssue {
	id: string;
	issue_type: string;
	severity: 'critical' | 'warning' | 'info';
	affected_url: string;
	description: string;
	recommendation: string;
	resolved: boolean;
	crawl_date: string;
}

interface CrawlabilityIssue {
	type: 'critical' | 'warning';
	title: string;
	message: string;
	solution: string;
}

interface CrawlResults {
	total: number;
	critical: number;
	warnings: number;
	info: number;
	issues: TechnicalIssue[];
	byType: Record<string, number>;
	bySeverity: {
		critical: TechnicalIssue[];
		warnings: TechnicalIssue[];
		info: TechnicalIssue[];
	};
}

const ISSUE_ICON_MAP: Record<string, any> = {
	critical: <AlertTriangle className="size-4 text-red-500" />,
	warning: <AlertCircle className="size-4 text-amber-500" />,
	info: <CheckCircle className="size-4 text-blue-500" />
};

const ISSUE_COLOR_MAP: Record<string, string> = {
	critical: 'bg-red-50 border-red-200 dark:border-red-900 dark:bg-red-900/20',
	warning: 'bg-amber-50 border-amber-200 dark:border-amber-900 dark:bg-amber-900/20',
	info: 'bg-blue-50 border-blue-200 dark:border-blue-900 dark:bg-blue-900/20'
};

export default function Technical() {
	const { selectedSite } = useSiteContext();
	const { user } = useAuth();
	const { organization } = useOrganization();

	const [loading, setLoading] = useState(false);
	const [results, setResults] = useState<CrawlResults | null>(null);
	const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
		critical: true,
		warnings: true,
		info: false
	});
	const [crawlabilityIssues, setCrawlabilityIssues] = useState<CrawlabilityIssue[]>([]);
	const [checking, setChecking] = useState(false);
	const [walletModalOpen, setWalletModalOpen] = useState(false);

	useEffect(() => {
		if (selectedSite) {
			fetchResults();
		}
	}, [selectedSite]);

	const fetchResults = async () => {
		if (!selectedSite) return;

		try {
			const response = await fetch(`/api/crawler/results/${selectedSite.id}`);
			if (!response.ok) throw new Error('Failed to fetch results');

			const data = await response.json();
			setResults(data.data);
		} catch (error) {
			console.error(error);
		}
	};

	const startCrawl = async () => {
		if (!selectedSite || !organization || !user) return;

		// First check crawlability
		setChecking(true);
		setCrawlabilityIssues([]);

		try {
			const checkResponse = await fetch('/api/crawler/check-crawlability', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					siteUrl: selectedSite.url
				})
			});

			if (!checkResponse.ok) {
				toast.error('Error checking site crawlability');
				setChecking(false);
				return;
			}

			const checkData = await checkResponse.json();
			const crawlabilityData = checkData.data;

			// Show crawlability issues
			if (crawlabilityData.issues && crawlabilityData.issues.length > 0) {
				setCrawlabilityIssues(crawlabilityData.issues);

				// If there are critical issues, don't start crawl
				if (crawlabilityData.issues.some((i: any) => i.type === 'critical')) {
					setChecking(false);
					return;
				}
			}

			setChecking(false);
		} catch (error) {
			console.error('Error checking crawlability:', error);
			setChecking(false);
			return;
		}

		// If crawlability checks pass, start the crawl
		setLoading(true);
		try {
			const response = await fetch('/api/crawler/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					organizationId: organization.id,
					siteId: selectedSite.id,
					siteUrl: selectedSite.url,
					userId: user.id,
					maxPages: 100
				})
			});

			if (!response.ok) {
				const error = await response.json();
				if (error.needs_topup) {
					toast.error('Insufficient credits. Add funds to your wallet to continue.');
					setWalletModalOpen(true);
				} else {
					toast.error(error.error || 'Failed to start crawl');
				}
				return;
			}

			const data = await response.json();
			setResults(data.data);
			setCrawlabilityIssues([]); // Clear crawlability issues after successful crawl
			toast.success(`Crawl complete! Found ${data.data.issuesFound} issues.`);
		} catch (error) {
			toast.error('Error starting crawl');
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	const toggleSection = (section: string) => {
		setExpandedSections((prev) => ({
			...prev,
			[section]: !prev[section]
		}));
	};

	if (!selectedSite) {
		return (
			<>
				<PageMeta title="Technical SEO" description="Site-wide technical audit" />
				<PageHeader title="Technical SEO" subtitle="Select a site to run technical audits" />
				<div className="p-6">
					<div className="rounded-lg bg-gray-50 p-6 text-center dark:bg-gray-800">
						<p className="text-sm text-gray-600 dark:text-gray-400">Select a site from the dropdown to begin auditing</p>
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<PageMeta title="Technical SEO" description="Site-wide technical audit and issues" />

			<PageHeader
				title="Technical SEO"
				subtitle={`${selectedSite.name} · Full site audit, crawl quality, Core Web Vitals, schema markup`}
			/>

			<div className="p-6">
				<AIInsightBlock
					variant="analyst"
					label="TECHNICAL SEO AUDIT"
					message="Comprehensive site audit checking 5 critical layers: Crawl, Render, Indexation, Performance (Core Web Vitals), and Schema. Based on Google's indexation pipeline and Complete SEO System framework."
				/>

				{/* Crawlability Issues */}
				{crawlabilityIssues.length > 0 && (
					<div className="mt-6 space-y-3">
						{crawlabilityIssues.map((issue, idx) => (
							<div
								key={idx}
								className={`rounded-lg border p-4 ${
									issue.type === 'critical'
										? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20'
										: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20'
								}`}
							>
								<div className="flex items-start gap-3">
									{issue.type === 'critical' ? (
										<AlertTriangle className="mt-0.5 size-5 text-red-600 dark:text-red-400 flex-shrink-0" />
									) : (
										<AlertCircle className="mt-0.5 size-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
									)}
									<div className="flex-1">
										<h3 className={`font-semibold ${issue.type === 'critical' ? 'text-red-900 dark:text-red-200' : 'text-amber-900 dark:text-amber-200'}`}>
											{issue.title}
										</h3>
										<p className={`mt-1 text-sm ${issue.type === 'critical' ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'}`}>
											{issue.message}
										</p>
										<p className={`mt-2 text-xs font-medium ${issue.type === 'critical' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
											Solution: {issue.solution}
										</p>
									</div>
								</div>
							</div>
						))}
					</div>
				)}

				{/* Crawl Status */}
				<div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="font-semibold text-gray-900 dark:text-white">Run Site Crawl</h2>
							<p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
								Scan up to 100 pages for technical issues. Costs 8 credits.
								{crawlabilityIssues.some((i) => i.type === 'critical') && (
									<span className="ml-2 text-red-600 dark:text-red-400">
										(Fix crawlability issues first)
									</span>
								)}
							</p>
						</div>
						<Button
							onClick={startCrawl}
							disabled={loading || checking || crawlabilityIssues.some((i) => i.type === 'critical')}
							className="bg-brand-500 hover:bg-brand-600 text-white"
							startIcon={
								loading || checking ? (
									<Loader2 className="animate-spin size-4" />
								) : (
									<RefreshCw className="size-4" />
								)
							}
						>
							{checking ? 'Checking...' : loading ? 'Crawling...' : 'Start Crawl'}
						</Button>
					</div>
				</div>

				{/* Results Summary */}
				{results && (
					<>
						<div className="mt-6 grid gap-4 sm:grid-cols-4">
							<div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
								<p className="text-xs font-semibold tracking-widest text-gray-600 uppercase dark:text-gray-400">
									Pages Scanned
								</p>
								<p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{results.total}</p>
							</div>
							<div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
								<p className="text-xs font-semibold tracking-widest text-red-700 uppercase dark:text-red-400">
									Critical
								</p>
								<p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">{results.critical}</p>
							</div>
							<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/20">
								<p className="text-xs font-semibold tracking-widest text-amber-700 uppercase dark:text-amber-400">
									Warnings
								</p>
								<p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{results.warnings}</p>
							</div>
							<div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
								<p className="text-xs font-semibold tracking-widest text-blue-700 uppercase dark:text-blue-400">
									Info
								</p>
								<p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">{results.info}</p>
							</div>
						</div>

						{/* Issues by Severity */}
						<div className="mt-6 space-y-4">
							{['critical', 'warnings', 'info'].map((severity) => {
								const issues = results.bySeverity[severity as keyof typeof results.bySeverity];
								const isExpanded = expandedSections[severity];

								return (
									<div key={severity} className="border border-gray-200 rounded-lg dark:border-gray-700">
										<button
											onClick={() => toggleSection(severity)}
											className={`w-full p-4 flex items-center justify-between ${
												severity === 'critical'
													? 'bg-red-50 dark:bg-red-900/20'
													: severity === 'warnings'
														? 'bg-amber-50 dark:bg-amber-900/20'
														: 'bg-blue-50 dark:bg-blue-900/20'
											}`}
										>
											<div className="flex items-center gap-3">
												{ISSUE_ICON_MAP[severity]}
												<span className="font-medium text-gray-900 dark:text-white capitalize">
													{severity === 'warnings' ? 'Warnings' : severity}
												</span>
												<span className="text-sm text-gray-600 dark:text-gray-400">({issues.length})</span>
											</div>
											{isExpanded ? (
												<ChevronUp className="size-4" />
											) : (
												<ChevronDown className="size-4" />
											)}
										</button>

										{isExpanded && (
											<div className="border-t border-gray-200 divide-y dark:border-gray-700">
												{issues.map((issue) => (
													<div key={issue.id} className="p-4">
														<div className="flex items-start gap-3">
															{ISSUE_ICON_MAP[severity]}
															<div className="flex-1">
																<p className="font-medium text-gray-900 dark:text-white">
																	{issue.description}
																</p>
																<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
																	{issue.affected_url}
																</p>
																<p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
																	{issue.recommendation}
																</p>
																<p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
																	Issue: {issue.issue_type}
																</p>
															</div>
														</div>
													</div>
												))}
											</div>
										)}
									</div>
								);
							})}
						</div>
					</>
				)}

				{!results && !loading && (
					<div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
						<Wrench className="mx-auto size-10 text-gray-400 dark:text-gray-500" />
						<p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
							No crawl results yet. Click "Start Crawl" to audit your site.
						</p>
					</div>
				)}
			</div>

			{/* Wallet Deposit Modal */}
			<WalletDepositModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
		</>
	);
}
