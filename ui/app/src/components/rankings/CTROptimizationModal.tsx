/**
 * CTR Optimization Modal
 * Generates 3 meta title + description options for low-CTR keywords.
 * Science: US8595225B1 — Navboost uses a 13-month rolling CTR window.
 * Improving CTR today builds ranking power for the next 13 months.
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Loader2, Copy, Check, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { CREDIT_COSTS } from '../../lib/credits';

interface RankingRow {
	keyword: string;
	pageUrl: string;
	clicks: number;
	impressions: number;
	ctr: number;
	position: number;
}

interface Props {
	open: boolean;
	onClose: () => void;
	siteId: string;
	ranking: RankingRow | null;
}

function CharBar({ value, max, warn }: { value: number; max: number; warn: boolean }) {
	const pct = Math.min((value / max) * 100, 100);
	return (
		<div className="mt-1 flex items-center gap-2">
			<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
				<div
					className={`h-1.5 rounded-full transition-all ${warn ? 'bg-red-500' : 'bg-green-500'}`}
					style={{ width: `${pct}%` }}
				/>
			</div>
			<span
				className={`text-[11px] font-medium ${warn ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}
			>
				{value}/{max}
			</span>
		</div>
	);
}

export function CTROptimizationModal({ open, onClose, siteId, ranking }: Props) {
	const [loading, setLoading] = useState(false);
	const [titles, setTitles] = useState<string[]>([]);
	const [descriptions, setDescriptions] = useState<string[]>([]);
	const [copied, setCopied] = useState<string | null>(null);
	const [generated, setGenerated] = useState(false);

	const copyToClipboard = async (text: string, key: string) => {
		await navigator.clipboard.writeText(text);
		setCopied(key);
		setTimeout(() => setCopied(null), 2000);
	};

	const generate = async () => {
		if (!ranking || !siteId) return;
		setLoading(true);
		setTitles([]);
		setDescriptions([]);
		setGenerated(false);
		try {
			const resp = await fetch(`/api/rankings/${siteId}/optimize-ctr`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					keyword: ranking.keyword,
					pageUrl: ranking.pageUrl,
					currentTitle: '',
					currentDescription: ''
				})
			});
			if (!resp.ok) {
				const err = await resp.json();
				toast.error(err.error || 'Failed to generate suggestions');
				return;
			}
			const data = await resp.json();
			setTitles(data.data?.suggestions?.titles || []);
			setDescriptions(data.data?.suggestions?.descriptions || []);
			setGenerated(true);
		} catch {
			toast.error('Network error — please try again');
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		setTitles([]);
		setDescriptions([]);
		setGenerated(false);
		onClose();
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<TrendingUp className="text-brand-500 size-4" />
						Optimize CTR
					</DialogTitle>
					<DialogDescription>
						Generate 3 meta title + description options optimized for click-through rate.
					</DialogDescription>
				</DialogHeader>

				{ranking && (
					<div className="space-y-4">
						{/* Keyword + CTR context */}
						<div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
							<p className="mb-1 text-xs font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
								Target keyword
							</p>
							<p className="font-medium text-gray-900 dark:text-white">{ranking.keyword}</p>
							<div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
								<span>
									Position:{' '}
									<strong className="text-gray-900 dark:text-white">
										{ranking.position.toFixed(0)}
									</strong>
								</span>
								<span>
									CTR: <strong className="text-red-500">{(ranking.ctr * 100).toFixed(2)}%</strong>
								</span>
								<span>
									Impressions:{' '}
									<strong className="text-gray-900 dark:text-white">
										{ranking.impressions.toLocaleString()}
									</strong>
								</span>
							</div>
						</div>

						{/* Navboost science note */}
						<div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900/50 dark:bg-amber-900/20">
							<AlertTriangle className="mt-0.5 size-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
							<p className="text-[12px] leading-relaxed text-amber-800 dark:text-amber-300">
								<strong>Click science [US8595225B1]:</strong> Google tracks CTR over a rolling
								13-month window. Improving your CTR today builds ranking power through{' '}
								{new Date(Date.now() + 13 * 30 * 86400000).toLocaleDateString('en-US', {
									month: 'long',
									year: 'numeric'
								})}
								. Titles that get clicks but cause quick bounces hurt rankings — every suggestion
								below is optimized for <em>accurate</em> click compulsion.
							</p>
						</div>

						{/* Generate button */}
						{!generated && (
							<Button
								onClick={generate}
								disabled={loading}
								className="bg-brand-500 hover:bg-brand-600 w-full text-white"
								startIcon={
									loading ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<TrendingUp className="size-4" />
									)
								}
							>
								{loading
									? 'Generating suggestions…'
									: `Generate suggestions · ${CREDIT_COSTS.CTR_OPTIMIZE} credits`}
							</Button>
						)}

						{/* Results */}
						{generated && (
							<div className="space-y-5">
								{/* Titles */}
								<div>
									<p className="mb-2 text-xs font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
										Title options
									</p>
									<div className="space-y-2">
										{titles.map((title, i) => (
											<div
												key={i}
												className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
											>
												<div className="flex items-start justify-between gap-2">
													<p className="text-sm leading-snug text-gray-900 dark:text-white">
														{title}
													</p>
													<button
														onClick={() => copyToClipboard(title, `title-${i}`)}
														className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
													>
														{copied === `title-${i}` ? (
															<Check className="size-3.5 text-green-500" />
														) : (
															<Copy className="size-3.5" />
														)}
													</button>
												</div>
												<CharBar value={title.length} max={60} warn={title.length > 60} />
											</div>
										))}
									</div>
								</div>

								{/* Descriptions */}
								<div>
									<p className="mb-2 text-xs font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
										Description options
									</p>
									<div className="space-y-2">
										{descriptions.map((desc, i) => (
											<div
												key={i}
												className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
											>
												<div className="flex items-start justify-between gap-2">
													<p className="text-sm leading-snug text-gray-700 dark:text-gray-300">
														{desc}
													</p>
													<button
														onClick={() => copyToClipboard(desc, `desc-${i}`)}
														className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
													>
														{copied === `desc-${i}` ? (
															<Check className="size-3.5 text-green-500" />
														) : (
															<Copy className="size-3.5" />
														)}
													</button>
												</div>
												<CharBar
													value={desc.length}
													max={155}
													warn={desc.length > 155 || desc.length < 150}
												/>
											</div>
										))}
									</div>
								</div>

								<Button
									variant="outline"
									onClick={generate}
									disabled={loading}
									className="w-full text-sm"
								>
									{loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
									Regenerate · {CREDIT_COSTS.CTR_OPTIMIZE} credits
								</Button>
							</div>
						)}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
