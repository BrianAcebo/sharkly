/**
 * CRO Studio — Conversion optimization workspace.
 * AI-powered audits, copy fixes, and conversion insights for SEO and destination pages.
 * Design inspired by Dashboard and Performance for a premium "studio" feel.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
	AlertTriangle,
	Check,
	Search,
	Plus,
	MapPin,
	XCircle,
	Target,
	HelpCircle,
	Trash2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { useOrganization } from '../hooks/useOrganization';
import { useSiteContext } from '../contexts/SiteContext';
import { canAccessCROStudio } from '../utils/featureGating';
import { CROAddPageModal } from '../components/cro/CROAddPageModal';
import { CROStudioGate } from '../components/cro/CROStudioGate';
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { AIInsightBlock } from '../components/shared/AIInsightBlock';
import { StatCard } from '../components/shared/StatCard';
import { Button } from '../components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription
} from '../components/ui/dialog';

interface CROAuditItem {
	id: string;
	page_url: string;
	page_type: 'seo_page' | 'destination_page';
	page_label: string | null;
	destination_url: string | null;
	cro_score: number;
	max_score: number;
	audited_at: string | null;
	issue_count: number;
	cluster_name: string | null;
	handoff_pass?: boolean | null;
}

const REAUDIT_DAYS = 30;

function safeUrlPath(url: string): string {
	try {
		return new URL(url).pathname || url;
	} catch {
		return url;
	}
}

function safeUrlHost(url: string): string {
	try {
		return new URL(url).hostname || url;
	} catch {
		return url;
	}
}

function formatAuditedAt(iso: string | null): string {
	if (!iso) return 'Never';
	const d = new Date(iso);
	const now = new Date();
	const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
	if (diffDays === 0) return 'Today';
	if (diffDays === 1) return 'Yesterday';
	if (diffDays < 7) return `${diffDays} days ago`;
	if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
	return `${Math.floor(diffDays / 30)} months ago`;
}

function needsReaudit(iso: string | null): boolean {
	if (!iso) return true;
	const d = new Date(iso);
	const now = new Date();
	const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
	return diffDays > REAUDIT_DAYS;
}

function ScoreBar({ score, max }: { score: number; max: number }) {
	const pct = max > 0 ? (score / max) * 100 : 0;
	return (
		<div className="flex items-center gap-1.5">
			<div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
				<div className="bg-brand-500 h-full rounded-full" style={{ width: `${pct}%` }} />
			</div>
			<span className="text-xs text-gray-600 dark:text-gray-400">
				{score}/{max}
			</span>
		</div>
	);
}

export default function CROStudio() {
	const { session } = useAuth();
	const { organization } = useOrganization();
	const { selectedSite } = useSiteContext();
	const navigate = useNavigate();
	const canAccess = canAccessCROStudio(organization);

	const [activeTab, setActiveTab] = useState<'seo_page' | 'destination_page'>('seo_page');
	const [audits, setAudits] = useState<CROAuditItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [addPageOpen, setAddPageOpen] = useState(false);
	const [diffModalOpen, setDiffModalOpen] = useState(false);
	const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);

	const fetchAudits = useCallback(() => {
		if (!canAccess || !session?.access_token || !selectedSite?.id) return;
		setLoading(true);
		fetch(
			`/api/cro-studio/audits?page_type=${activeTab}&site_id=${encodeURIComponent(selectedSite.id)}`,
			{
				headers: { Authorization: `Bearer ${session.access_token}` }
			}
		)
			.then((res) => res.json())
			.then((data) => {
				if (data.audits) setAudits(data.audits);
				else setAudits([]);
			})
			.catch(() => setAudits([]))
			.finally(() => setLoading(false));
	}, [canAccess, session?.access_token, activeTab, selectedSite?.id]);

	useEffect(() => {
		if (selectedSite?.id) fetchAudits();
		else setAudits([]);
	}, [fetchAudits, selectedSite?.id]);

	const handleDeleteAudit = useCallback(
		async (id: string) => {
			if (!session?.access_token) return;
			setDeleting(true);
			try {
				await fetch(`/api/cro-studio/audits/${id}`, {
					method: 'DELETE',
					headers: { Authorization: `Bearer ${session.access_token}` }
				});
				setAudits((prev) => prev.filter((a) => a.id !== id));
			} finally {
				setDeleting(false);
				setDeleteConfirmId(null);
			}
		},
		[session?.access_token]
	);

	// Stats for dashboard feel
	const totalPages = audits.length;
	const totalIssues = audits.reduce((sum, a) => sum + (a.issue_count ?? 0), 0);
	const needsReauditCount = audits.filter((a) => needsReaudit(a.audited_at)).length;
	const avgScore =
		audits.length > 0
			? Math.round(
					audits.reduce(
						(sum, a) => sum + (a.max_score > 0 ? (a.cro_score / a.max_score) * 100 : 0),
						0
					) / audits.length
				)
			: 0;

	const handoffFailCount = audits.filter(
		(a) => a.page_type === 'seo_page' && a.destination_url && !a.handoff_pass
	).length;

	const aiInsightMessage =
		audits.length === 0
			? `Add your first ${activeTab === 'seo_page' ? 'SEO' : 'destination'} page to get AI-powered conversion audits. We'll analyze handoff, CTAs, and persuasion triggers to help you convert more visitors.`
			: handoffFailCount > 0
				? `${handoffFailCount} SEO page${handoffFailCount !== 1 ? 's' : ''} ${handoffFailCount !== 1 ? 'have' : 'has'} handoff issues — visitors may not reach your conversion pages. Fix these first for the biggest impact.`
				: totalIssues > 0
					? `${totalIssues} improvement${totalIssues !== 1 ? 's' : ''} identified across your pages. Generate copy fixes with one click to boost conversions.`
					: needsReauditCount > 0
						? `${needsReauditCount} page${needsReauditCount !== 1 ? 's' : ''} ${needsReauditCount !== 1 ? 'are' : 'is'} due for a re-audit. Fresh audits keep insights actionable.`
						: 'Your pages look strong. Keep monitoring conversion signals as you add new content.';

	return (
		<CROStudioGate variant="main">
			<PageMeta
				title="CRO Studio"
				description="Conversion optimization for SEO and destination pages"
				noIndex
			/>
			<div className="space-y-6">
				<PageHeader
					title="CRO Studio"
					subtitle={
						selectedSite
							? `${selectedSite.name} · AI-powered conversion audits · Copy fixes · Persuasion analysis`
							: 'Select a site to view and add CRO audits'
					}
					rightContent={
						<Button
							onClick={() => setAddPageOpen(true)}
							disabled={!selectedSite?.id}
							className="bg-brand-500 hover:bg-brand-600 text-white"
						>
							<Plus className="size-4" />
							Add Page
						</Button>
					}
				/>

				<AIInsightBlock variant="analyst" label="CRO ANALYST" message={aiInsightMessage} />

				{!selectedSite ? (
					<div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-800/50">
						<Target className="mb-4 size-12 text-gray-400 dark:text-gray-500" />
						<h3 className="font-montserrat mb-2 text-lg font-semibold text-gray-900 dark:text-white">
							Select a site
						</h3>
						<p className="max-w-sm text-sm text-gray-600 dark:text-gray-400">
							Use the site selector in the header to choose which site&apos;s CRO audits you want to
							view.
						</p>
					</div>
				) : (
					<>
						{/* Stats row — like Dashboard */}
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<StatCard
								label="Pages Audited"
								value={totalPages}
								delta={activeTab === 'seo_page' ? 'SEO pages in funnel' : 'Destination pages'}
								deltaDirection="neutral"
								icon={<Target className="text-brand-500 dark:text-brand-400 size-5" />}
							/>
							<StatCard
								label="Avg CRO Score"
								value={totalPages > 0 ? `${avgScore}%` : '—'}
								delta={totalPages > 0 ? 'conversion readiness' : 'Add pages to audit'}
								deltaDirection="neutral"
							/>
							<StatCard
								label="Issues to Fix"
								value={totalIssues}
								delta={totalIssues > 0 ? 'AI fixes available' : 'No issues found'}
								deltaDirection={totalIssues > 0 ? 'down' : 'neutral'}
							/>
							<StatCard
								label="Needs Re-audit"
								value={needsReauditCount}
								delta={needsReauditCount > 0 ? 'Re-audit for fresh insights' : 'All up to date'}
								deltaDirection="neutral"
							/>
						</div>

						{/* Tabs — styled like Performance range selector */}
						<div className="flex items-center justify-between gap-4">
							<div className="flex items-center gap-3">
								<div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800/50">
									<button
										type="button"
										onClick={() => setActiveTab('seo_page')}
										className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
											activeTab === 'seo_page'
												? 'border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-500 dark:bg-brand-900/30 dark:text-brand-400 border shadow-sm'
												: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
										}`}
									>
										<Search className="size-4" />
										SEO Pages
									</button>
									<button
										type="button"
										onClick={() => setActiveTab('destination_page')}
										className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
											activeTab === 'destination_page'
												? 'border-brand-500 bg-brand-50 text-brand-600 dark:border-brand-500 dark:bg-brand-900/30 dark:text-brand-400 border shadow-sm'
												: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
										}`}
									>
										<MapPin className="size-4" />
										Destination Pages
									</button>
								</div>
								<button
									type="button"
									onClick={() => setDiffModalOpen(true)}
									className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 flex items-center gap-1.5 text-sm"
								>
									<HelpCircle className="size-3.5" />
									What&apos;s the difference?
								</button>
							</div>
						</div>

						{/* Page list — table layout like Topic Queue */}
						<div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
							<div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
								<h3 className="font-montserrat flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
									{activeTab === 'seo_page' ? (
										<Search className="text-brand-500 dark:text-brand-400 size-4" />
									) : (
										<MapPin className="text-brand-500 dark:text-brand-400 size-4" />
									)}
									{activeTab === 'seo_page' ? 'SEO Pages' : 'Destination Pages'}
								</h3>
								<Button variant="ghost" size="sm" onClick={() => setAddPageOpen(true)}>
									<Plus className="size-4" />
									Add Page
								</Button>
							</div>

							{loading ? (
								<div className="flex justify-center py-16">
									<div className="border-brand-500 size-8 animate-spin rounded-full border-2 border-t-transparent" />
								</div>
							) : audits.length === 0 ? (
								<div className="flex flex-col items-center justify-center px-6 py-16 text-center">
									<div className="bg-brand-50 dark:bg-brand-900/20 mb-4 flex size-16 items-center justify-center rounded-2xl">
										{activeTab === 'seo_page' ? (
											<Search className="text-brand-500 dark:text-brand-400 size-8" />
										) : (
											<MapPin className="text-brand-500 dark:text-brand-400 size-8" />
										)}
									</div>
									<h3 className="font-montserrat mb-2 text-lg font-semibold text-gray-900 dark:text-white">
										No {activeTab === 'seo_page' ? 'SEO' : 'destination'} pages yet
									</h3>
									<p className="mb-6 max-w-sm text-sm text-gray-600 dark:text-gray-400">
										Add a page to get AI-powered conversion audits, copy fixes, and persuasion
										analysis.
									</p>
									<Button
										onClick={() => setAddPageOpen(true)}
										className="bg-brand-500 hover:bg-brand-600"
									>
										<Plus className="size-4" />
										Add your first page
									</Button>
								</div>
							) : (
								<table className="w-full">
									<thead>
										<tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
											<th className="px-6 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
												Page
											</th>
											<th className="px-6 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
												Status
											</th>
											<th className="px-6 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
												CRO Score
											</th>
											<th className="px-6 py-3 text-left text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
												Last Audited
											</th>
											<th className="px-6 py-3 text-right text-[11px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
												Action
											</th>
										</tr>
									</thead>
									<tbody>
										{audits.map((a) => (
											<tr
												key={a.id}
												className="border-b border-gray-200 transition-colors last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50"
											>
												<td className="px-6 py-4">
													<Link to={`/cro-studio/audit/${a.id}`} className="block">
														<div className="font-semibold text-gray-900 dark:text-white">
															{a.page_label || safeUrlPath(a.page_url) || a.page_url}
														</div>
														<div className="text-xs text-gray-500 dark:text-gray-400">
															{a.page_url}
														</div>
														{a.page_type === 'seo_page' && a.destination_url && (
															<span
																className={`mt-1 inline-flex items-center gap-1 text-xs ${
																	a.handoff_pass
																		? 'text-green-600 dark:text-green-400'
																		: 'text-amber-600 dark:text-amber-400'
																}`}
															>
																{a.handoff_pass ? (
																	<Check className="size-3" />
																) : (
																	<XCircle className="size-3" />
																)}
																Handoff to {safeUrlHost(a.destination_url)}
															</span>
														)}
													</Link>
												</td>
												<td className="px-6 py-4">
													{a.issue_count > 0 ? (
														<span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
															{a.issue_count} issue{a.issue_count !== 1 ? 's' : ''}
														</span>
													) : (
														<span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-200">
															<Check className="size-3" />
															Strong
														</span>
													)}
												</td>
												<td className="px-6 py-4">
													<ScoreBar score={a.cro_score} max={a.max_score} />
												</td>
												<td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
													{formatAuditedAt(a.audited_at)}
													{needsReaudit(a.audited_at) && (
														<span className="ml-1 flex items-center gap-1 text-amber-600 dark:text-amber-400">
															<AlertTriangle className="size-3" />
														</span>
													)}
												</td>
												<td className="px-6 py-4 text-right">
													<div className="flex items-center justify-end gap-2">
														<Link to={`/cro-studio/audit/${a.id}`}>
															<Button
																size="sm"
																className="bg-brand-500 hover:bg-brand-600 text-white"
															>
																Open
															</Button>
														</Link>
														<Button
															size="sm"
															variant="ghost"
															onClick={() => setDeleteConfirmId(a.id)}
															className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
															title="Delete audit"
														>
															<Trash2 className="size-4" />
														</Button>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</div>
					</>
				)}
			</div>

			<CROAddPageModal
				open={addPageOpen}
				onClose={() => setAddPageOpen(false)}
				onSuccess={(auditId) => {
					fetchAudits();
					navigate(`/cro-studio/audit/${auditId}`);
				}}
				getAuthHeader={() => ({ Authorization: `Bearer ${session?.access_token}` })}
				initialSiteId={selectedSite?.id ?? undefined}
			/>

			{/* Delete confirmation dialog */}
			<Dialog
				open={deleteConfirmId !== null}
				onOpenChange={(open) => {
					if (!open) setDeleteConfirmId(null);
				}}
			>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Delete audit?</DialogTitle>
						<DialogDescription>
							This will permanently remove the audit and all its data. This cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end gap-3 pt-2">
						<Button variant="ghost" onClick={() => setDeleteConfirmId(null)} disabled={deleting}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={() => deleteConfirmId && handleDeleteAudit(deleteConfirmId)}
							disabled={deleting}
						>
							{deleting ? 'Deleting…' : 'Delete'}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={diffModalOpen} onOpenChange={setDiffModalOpen}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>SEO Pages vs Destination Pages</DialogTitle>
						<DialogDescription>Why we audit them differently</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
						<p>
							<strong>SEO Pages</strong> are your supporting articles and focus page — the pages
							built to rank on Google. They need strong content depth, keyword structure, and
							internal linking. Their CRO job is light: keep the reader engaged, match their intent,
							and point them toward the next step at the right moment. Pushing too hard to sell here
							actively hurts your ranking.
						</p>
						<p>
							<strong>Destination Pages</strong> are where the sale happens. They don&apos;t need to
							rank — your SEO pages do that work and send qualified visitors here. So instead of
							optimizing for Google, these pages are optimized purely for conversion: clear
							headline, strong trust signals, no friction between the visitor and the action you
							want them to take.
						</p>
						<p>
							That&apos;s why we audit them differently. Applying SEO rules to a destination page,
							or conversion pressure to an SEO page, makes both perform worse. Each page has one job
							— we check how well it&apos;s doing that job.
						</p>
					</div>
				</DialogContent>
			</Dialog>
		</CROStudioGate>
	);
}
