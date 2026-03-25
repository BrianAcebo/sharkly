/**
 * Meta Title + Description Generator Modal
 * Generates 3 meta title options + 3 description options for a page.
 * Cost: 3 credits (GPT-4o-mini)
 * Science: US8595225B1 — titles optimized for accurate click compulsion.
 * Character limits: title ≤60, description 150–160.
 */

import { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Loader2, Copy, Check, Tag, Info } from 'lucide-react';
import { toast } from 'sonner';
import { CreditCost } from '../shared/CreditBadge';
import { CREDIT_COSTS } from '../../lib/credits';
import { api } from '../../utils/api';

interface Props {
	open: boolean;
	onClose: () => void;
	siteId: string;
	keyword: string;
	pageTitle: string;
	contentPreview?: string;
}

function CharBar({ value, max, minGood }: { value: number; max: number; minGood?: number }) {
	const pct = Math.min((value / max) * 100, 100);
	const tooLong = value > max;
	const tooShort = minGood !== undefined && value < minGood;
	const color = tooLong || tooShort ? 'bg-red-500' : 'bg-green-500';
	return (
		<div className="mt-1.5 flex items-center gap-2">
			<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
				<div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
			</div>
			<span
				className={`text-[11px] font-medium tabular-nums ${tooLong || tooShort ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}
			>
				{value}
			</span>
		</div>
	);
}

export function MetaGeneratorModal({ open, onClose, siteId, keyword, pageTitle, contentPreview }: Props) {
	const [loading, setLoading] = useState(false);
	const [titles, setTitles] = useState<string[]>([]);
	const [descriptions, setDescriptions] = useState<string[]>([]);
	const [generated, setGenerated] = useState(false);
	const [copied, setCopied] = useState<string | null>(null);

	// Auto-generate when first opened
	useEffect(() => {
		if (open && !generated && keyword) {
			generate();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const copyToClipboard = async (text: string, key: string) => {
		await navigator.clipboard.writeText(text);
		setCopied(key);
		setTimeout(() => setCopied(null), 2000);
		toast.success('Copied to clipboard');
	};

	const generate = async () => {
		if (!siteId || !keyword) return;
		setLoading(true);
		setTitles([]);
		setDescriptions([]);
		setGenerated(false);
		try {
			const resp = await api.post(`/api/rankings/${siteId}/meta-suggestions`, {
				keyword,
				pageTitle,
				content: contentPreview ?? ''
			});
			if (!resp.ok) {
				const err = await resp.json();
				toast.error(err.error || 'Failed to generate meta');
				return;
			}
			const data = await resp.json();
			setTitles(data.data?.suggestions?.titles ?? []);
			setDescriptions(data.data?.suggestions?.descriptions ?? []);
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
						<Tag className="size-4 text-brand-500" />
						Meta Generator
					</DialogTitle>
					<DialogDescription>
						3 meta title + description options optimized for CTR and Navboost.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Keyword context */}
					<div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800/50">
						<Tag className="size-3.5 flex-shrink-0 text-gray-400" />
						<p className="text-sm text-gray-700 dark:text-gray-300">
							<span className="font-medium">Keyword:</span>{' '}
							<span className="font-mono text-brand-600 dark:text-brand-400">{keyword}</span>
						</p>
					</div>

					{/* Patent note */}
					<div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-900/50 dark:bg-blue-900/20">
						<Info className="mt-0.5 size-3.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
						<p className="text-[12px] text-blue-800 dark:text-blue-300 leading-relaxed">
							Every suggestion below is optimized for <strong>click compulsion</strong> and <strong>accurate promise</strong> equally. Titles that get clicks but cause quick bounces actively hurt your Navboost score [US8595225B1].
						</p>
					</div>

					{loading && (
						<div className="flex items-center justify-center py-10">
							<div className="text-center">
								<Loader2 className="mx-auto size-7 animate-spin text-brand-500" />
								<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Generating meta options…</p>
							</div>
						</div>
					)}

					{generated && !loading && (
						<div className="space-y-5">
							{/* Titles */}
							<div>
								<div className="mb-2 flex items-center justify-between">
									<p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
										Title options <span className="normal-case text-gray-400">(≤60 chars)</span>
									</p>
								</div>
								<div className="space-y-2">
									{titles.map((title, i) => (
										<div
											key={i}
											className="group rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
										>
											<div className="flex items-start justify-between gap-2">
												<p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">
													{title}
												</p>
												<button
													onClick={() => copyToClipboard(title, `t-${i}`)}
													className="flex-shrink-0 rounded p-1 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
												>
													{copied === `t-${i}` ? (
														<Check className="size-3.5 text-green-500" />
													) : (
														<Copy className="size-3.5" />
													)}
												</button>
											</div>
											<CharBar value={title.length} max={60} />
										</div>
									))}
								</div>
							</div>

							{/* Descriptions */}
							<div>
								<div className="mb-2 flex items-center justify-between">
									<p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
										Description options <span className="normal-case text-gray-400">(150–160 chars)</span>
									</p>
								</div>
								<div className="space-y-2">
									{descriptions.map((desc, i) => (
										<div
											key={i}
											className="group rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
										>
											<div className="flex items-start justify-between gap-2">
												<p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{desc}</p>
												<button
													onClick={() => copyToClipboard(desc, `d-${i}`)}
													className="flex-shrink-0 rounded p-1 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
												>
													{copied === `d-${i}` ? (
														<Check className="size-3.5 text-green-500" />
													) : (
														<Copy className="size-3.5" />
													)}
												</button>
											</div>
											<CharBar value={desc.length} max={160} minGood={150} />
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
								{loading && <Loader2 className="size-4 animate-spin mr-2" />}
								Regenerate — <CreditCost amount={CREDIT_COSTS.META_GENERATION} />
							</Button>
						</div>
					)}

					{!generated && !loading && (
						<Button
							onClick={generate}
							disabled={!keyword}
							className="w-full bg-brand-500 hover:bg-brand-600 text-white"
						>
							Generate meta — <CreditCost amount={CREDIT_COSTS.META_GENERATION} />
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
