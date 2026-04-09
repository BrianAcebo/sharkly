import { Link } from 'react-router';
import {
	Activity,
	ArrowRight,
	CheckCircle2,
	ChevronRight,
	FileBarChart,
	Loader2,
	Search,
	Wrench
} from 'lucide-react';
import type { AuditHistoryItem } from '../../hooks/useAudit';
import { useSiteContext } from '../../contexts/SiteContext';

interface Props {
	gscConnected: boolean;
	history: AuditHistoryItem[];
	historyLoading: boolean;
}

export function SiteHealthPanel({ gscConnected, history, historyLoading }: Props) {
	const { selectedSite } = useSiteContext();
	const siteId = selectedSite?.id;
	return (
		<div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
			<div className="mb-5 flex items-start gap-3">
				<div className="rounded-lg bg-brand-500/10 p-2 dark:bg-brand-500/15">
					<Activity className="size-5 text-brand-600 dark:text-brand-400" />
				</div>
				<div>
					<h2 className="font-montserrat text-lg font-bold text-gray-900 dark:text-white">
						Site health
					</h2>
					<p className="mt-0.5 text-[13px] text-gray-500 dark:text-gray-400">
						Integrations and recent technical audit snapshots
					</p>
				</div>
			</div>

			{/* Search Console */}
			<div className="mb-5 rounded-lg border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-600/60 dark:bg-gray-800/50">
				<div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
					<Search className="size-3.5" />
					Search Console
				</div>
				<div className="mt-2 flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						{gscConnected ? (
							<>
								<CheckCircle2 className="size-5 text-success-600 dark:text-success-400" />
								<span className="text-sm font-medium text-gray-900 dark:text-white">Connected</span>
							</>
						) : (
							<>
								<span className="text-sm text-amber-800 dark:text-amber-200/90">
									Not connected — rankings and queries won&apos;t sync.
								</span>
							</>
						)}
					</div>
					<Link
						to={`/sites/${siteId}`}
						className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
					>
						{gscConnected ? 'Manage' : 'Connect'}
						<ArrowRight className="size-3.5" />
					</Link>
				</div>
			</div>

			{/* Recent audit reports */}
			<div className="min-h-0 flex-1">
				<div className="mb-2 flex items-center justify-between gap-2">
					<div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
						<FileBarChart className="size-3.5" />
						Recent audit reports
					</div>
					<Link
						to="/audits"
						className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
					>
						View all
					</Link>
				</div>

				{historyLoading ? (
					<div className="flex items-center justify-center py-10 text-gray-500">
						<Loader2 className="size-6 animate-spin text-brand-500" />
					</div>
				) : history.length === 0 ? (
					<div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4 py-6 text-center dark:border-gray-600 dark:bg-gray-800/30">
						<p className="text-sm text-gray-600 dark:text-gray-400">
							No saved reports yet. Run a crawl from Technical SEO or re-run an audit.
						</p>
						<div className="mt-3 flex flex-wrap justify-center gap-2">
							<Link to="/technical">
								<span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
									<Wrench className="size-3.5" />
									Technical SEO
								</span>
							</Link>
							<Link to="/audits">
								<span className="inline-flex items-center gap-1 rounded-lg border border-brand-500/30 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-100/80 dark:border-brand-500/40 dark:bg-brand-950/40 dark:text-brand-100 dark:hover:bg-brand-950/60">
									Audit reports
									<ChevronRight className="size-3.5" />
								</span>
							</Link>
						</div>
					</div>
				) : (
					<ul className="space-y-1">
						{history.map((h) => (
							<li key={h.id}>
								<Link
									to={`/audits/${encodeURIComponent(h.id)}`}
									className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/80"
								>
									<div className="min-w-0">
										<p className="truncate text-sm font-medium text-gray-900 dark:text-white">
											{new Date(h.created_at).toLocaleString(undefined, {
												month: 'short',
												day: 'numeric',
												hour: 'numeric',
												minute: '2-digit'
											})}
										</p>
										<p className="truncate text-xs text-gray-500 dark:text-gray-400">
											Score {h.overall_score} · {h.health_status} · {h.crawl_total_issues ?? '—'}{' '}
											issues
										</p>
									</div>
									<ChevronRight className="size-4 shrink-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
								</Link>
							</li>
						))}
					</ul>
				)}
			</div>

			{/* Quick links footer */}
			<div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-700">
				<p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
					Shortcuts
				</p>
				<div className="flex flex-wrap gap-2">
					<Link
						to="/technical"
						className="inline-flex items-center rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
					>
						<Wrench className="mr-1.5 size-3.5" />
						Technical crawl
					</Link>
					<Link
						to="/audits"
						className="inline-flex items-center rounded-md bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-500/15 dark:text-brand-200 dark:hover:bg-brand-500/20"
					>
						<FileBarChart className="mr-1.5 size-3.5" />
						All audit reports
					</Link>
				</div>
			</div>
		</div>
	);
}
