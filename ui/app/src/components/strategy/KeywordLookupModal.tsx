/**
 * Keyword Lookup Modal
 * 5 credits per lookup. Returns volume, difficulty, buyer intent, authority fit,
 * and 6-8 related keyword suggestions.
 * Used in: Strategy (keywords view) and ClusterDetail (content list).
 */

import { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription
} from '../ui/dialog';
import { Button } from '../ui/button';
import InputField from '../form/input/InputField';
import { Loader2, Search, TrendingUp, Target, ShoppingCart, Info, CheckCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { CreditCost } from '../shared/CreditBadge';
import { CREDIT_COSTS } from '../../lib/credits';
import { useOrganization } from '../../hooks/useOrganization';
import { api } from '../../utils/api';

interface KeywordMetrics {
	keyword: string;
	monthly_searches: number;
	search_volume_label: 'Niche' | 'Steady' | 'Popular' | 'High Traffic';
	keyword_difficulty: number;
	difficulty_label: 'Easy to rank' | 'Takes time' | 'Very competitive';
	buyer_intent: 'Informational' | 'Commercial' | 'High buyer intent';
	cpc_estimate: number;
	authority_fit: 'Ready Now' | 'Build Toward' | 'Not Yet';
	authority_fit_reason: string;
	related_keywords: string[];
	related_difficulty: number[];
	paa_questions: string[];
}

interface Props {
	open: boolean;
	onClose: () => void;
	siteId?: string;
	initialKeyword?: string;
	onAddToStrategy?: (keyword: string) => void;
	onAddToCluster?: (keyword: string) => void;
	/** Label for the cluster action (e.g. "Add to Cluster") */
	clusterLabel?: string;
}

function DifficultyColor(kd: number) {
	if (kd < 30) return 'text-green-500';
	if (kd < 60) return 'text-amber-500';
	return 'text-red-500';
}

function VolumeBar({ label }: { label: string }) {
	const widths: Record<string, string> = {
		Niche: 'w-1/4',
		Steady: 'w-2/4',
		Popular: 'w-3/4',
		'High Traffic': 'w-full'
	};
	const colors: Record<string, string> = {
		Niche: 'bg-gray-400',
		Steady: 'bg-blue-400',
		Popular: 'bg-brand-500',
		'High Traffic': 'bg-green-500'
	};
	return (
		<div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
			<div className={`h-1.5 rounded-full ${widths[label] || 'w-1/4'} ${colors[label] || 'bg-gray-400'}`} />
		</div>
	);
}

function AuthorityBadge({ fit }: { fit: string }) {
	if (fit === 'Ready Now')
		return (
			<span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
				<CheckCircle className="size-3" /> Ready Now
			</span>
		);
	if (fit === 'Build Toward')
		return (
			<span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
				<Target className="size-3" /> Build Toward
			</span>
		);
	return (
		<span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
			<ArrowRight className="size-3" /> Not Yet
		</span>
	);
}

export function KeywordLookupModal({
	open,
	onClose,
	siteId,
	initialKeyword = '',
	onAddToStrategy,
	onAddToCluster,
	clusterLabel = 'Add to Cluster'
}: Props) {
	const { organization } = useOrganization();
	const [keyword, setKeyword] = useState(initialKeyword);
	const [loading, setLoading] = useState(false);
	const [metrics, setMetrics] = useState<KeywordMetrics | null>(null);

	const lookup = async (kw = keyword) => {
		const q = kw.trim();
		if (!q || !organization) return;
		setLoading(true);
		setMetrics(null);
		try {
			const resp = await api.post('/api/keywords/lookup', {
				keyword: q,
				siteId,
				organizationId: organization.id
			});
			if (!resp.ok) {
				const err = await resp.json();
				if (err.needs_topup) {
					toast.error(`Not enough credits. Need ${err.required}, have ${err.available}.`);
				} else {
					toast.error(err.error || 'Failed to look up keyword');
				}
				return;
			}
			const data = await resp.json();
			setMetrics(data.data);
			setKeyword(q);
		} catch {
			toast.error('Network error — please try again');
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		setMetrics(null);
		setKeyword(initialKeyword);
		onClose();
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Search className="size-4 text-brand-500" />
						Keyword Research
					</DialogTitle>
					<DialogDescription>
						Get volume, difficulty, buyer intent, and authority fit for any keyword.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Search input */}
					<div className="flex gap-2">
						<div className="flex-1">
							<InputField
								value={keyword}
								onChange={(e) => setKeyword(e.target.value)}
								placeholder="e.g. best seo tools for small business"
								onKeyDown={(e) => e.key === 'Enter' && lookup()}
							/>
						</div>
						<Button
							onClick={() => lookup()}
							disabled={loading || !keyword.trim()}
							className="bg-brand-500 hover:bg-brand-600 text-white flex-shrink-0"
						>
							{loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
						</Button>
					</div>
					<p className="text-xs text-gray-400 dark:text-gray-500">
						<span className="inline-flex items-center gap-1"><CreditCost amount={CREDIT_COSTS.KEYWORD_LOOKUP} /> per lookup · Press Enter to search</span>
					</p>

					{/* Results */}
					{loading && (
						<div className="flex items-center justify-center py-8">
							<div className="text-center">
								<Loader2 className="mx-auto size-7 animate-spin text-brand-500" />
								<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Analyzing keyword…</p>
							</div>
						</div>
					)}

					{metrics && !loading && (
						<div className="space-y-4">
							{/* Metrics card */}
							<div className="grid grid-cols-2 gap-3">
								{/* Volume */}
								<div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
									<p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
										Monthly Searches
									</p>
									<p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
										{metrics.monthly_searches >= 1000
											? `${(metrics.monthly_searches / 1000).toFixed(0)}K`
											: metrics.monthly_searches.toLocaleString()}
									</p>
									<div className="mt-1.5 flex items-center gap-2">
										<VolumeBar label={metrics.search_volume_label} />
										<span className="text-[11px] text-gray-500 dark:text-gray-400">
											{metrics.search_volume_label}
										</span>
									</div>
								</div>

								{/* Difficulty */}
								<div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
									<p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
										Difficulty
									</p>
									<p className={`mt-1 text-xl font-bold ${DifficultyColor(metrics.keyword_difficulty)}`}>
										{metrics.keyword_difficulty}
									</p>
									<p className={`mt-0.5 text-[11px] font-medium ${DifficultyColor(metrics.keyword_difficulty)}`}>
										{metrics.difficulty_label}
									</p>
								</div>

								{/* Buyer Intent */}
								<div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
									<p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
										Buyer Intent
									</p>
									<div className="mt-1.5">
										{metrics.buyer_intent === 'High buyer intent' && (
											<span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
												<ShoppingCart className="size-3" /> High buyer intent
											</span>
										)}
										{metrics.buyer_intent === 'Commercial' && (
											<span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
												<TrendingUp className="size-3" /> Commercial
											</span>
										)}
										{metrics.buyer_intent === 'Informational' && (
											<span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-300">
												<Info className="size-3" /> Informational
											</span>
										)}
									</div>
									{metrics.cpc_estimate > 0 && (
										<p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
											CPC ~${metrics.cpc_estimate.toFixed(2)}
										</p>
									)}
								</div>

								{/* Authority Fit */}
								<div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
									<p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
										Authority Fit
									</p>
									<div className="mt-1.5">
										<AuthorityBadge fit={metrics.authority_fit} />
									</div>
									{metrics.authority_fit_reason && (
										<p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
											{metrics.authority_fit_reason}
										</p>
									)}
								</div>
							</div>

							{/* Related keywords */}
							{metrics.related_keywords.length > 0 && (
								<div>
									<p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
										Related keywords
									</p>
									<div className="flex flex-wrap gap-1.5">
										{metrics.related_keywords.map((kw, i) => {
											const kd = metrics.related_difficulty[i] ?? 50;
											return (
												<button
													key={i}
													onClick={() => { setKeyword(kw); lookup(kw); }}
													className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 hover:border-brand-500 hover:text-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
												>
													<span className={`size-1.5 rounded-full flex-shrink-0 ${kd < 30 ? 'bg-green-500' : kd < 60 ? 'bg-amber-500' : 'bg-red-500'}`} />
													{kw}
												</button>
											);
										})}
									</div>
								</div>
							)}

							{/* Actions */}
							<div className="flex gap-2 pt-1">
								{onAddToStrategy && (
									<Button
										onClick={() => { onAddToStrategy(metrics.keyword); handleClose(); }}
										className="flex-1 bg-brand-500 hover:bg-brand-600 text-white text-sm"
									>
										Add to Strategy
									</Button>
								)}
								{onAddToCluster && (
									<Button
										variant="outline"
										onClick={() => { onAddToCluster(metrics.keyword); handleClose(); }}
										className="flex-1 text-sm"
									>
										{clusterLabel}
									</Button>
								)}
							</div>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
