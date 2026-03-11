import React from 'react';
import { Link } from 'react-router';
import { Lock, FileText, Plus, ChevronRight, Lightbulb, Search, Zap, AlertTriangle } from 'lucide-react';
import { AIInsightBlock } from '../shared/AIInsightBlock';
import { CustomerJourneyMap } from './CustomerJourneyMap';
import { Button } from '../ui/button';
import { cn } from '../../utils/common';
import type { PageData } from '../../hooks/useClusterPages';

// ---------------------------------------------------------------------------
// Three-stage funnel (funnel-visualizer.md spec): Awareness | Consideration | Destination
// ---------------------------------------------------------------------------
export type FunnelStage = 'awareness' | 'consideration' | 'destination';

function getFunnelColumn(page: PageData): FunnelStage {
	if (page.type === 'focus_page') return 'consideration';
	if (page.funnel === 'tofu') return 'awareness';
	return 'consideration';
}

/** Warning 7: Focus page is BoFu/transactional */
function detectBoFuFocusPage(pages: PageData[]): PageData | null {
	const focus = pages.find((p) => p.type === 'focus_page');
	if (!focus) return null;
	const isBoFu =
		focus.funnel === 'bofu' || focus.pageType === 'money_page' || focus.pageType === 'service_page';
	const kwTransactional =
		/\b(near me|in [a-z]+|hire|book|buy|get a quote|cost|price|pricing)\b/i.test(
			focus.keyword || ''
		);
	return isBoFu || kwTransactional ? focus : null;
}

// ---------------------------------------------------------------------------
// Stage config — funnel-visualizer.md spec
// ---------------------------------------------------------------------------
const STAGE_CONFIG: Record<
	FunnelStage,
	{
		number: string;
		label: string;
		icon: React.ElementType;
		topicExample: string;
		objectionHint: string;
		ctaHint: string;
		badge: string;
		color: string;
	}
> = {
	awareness: {
		number: '01',
		label: 'Awareness',
		icon: Lightbulb,
		topicExample: 'Informational searches — "how to know if..." "what is..."',
		objectionHint: 'Readers finding out they have a problem',
		ctaHint: 'Low commitment: lead magnet, download, email capture',
		badge: 'Not ready to purchase',
		color: 'blue'
	},
	consideration: {
		number: '02',
		label: 'Consideration ★',
		icon: Search,
		topicExample: 'Solution research — "how does X work" "best options for..."',
		objectionHint: 'Readers researching options — this is where you rank',
		ctaHint: 'Medium commitment: case evaluation, free review',
		badge: 'SEO anchor lives here',
		color: 'amber'
	},
	destination: {
		number: '03',
		label: 'Destination',
		icon: Zap,
		topicExample: 'Purchase / signup / booking',
		objectionHint: 'Readers ready to act — this is where you convert',
		ctaHint: 'High commitment: buy, book, sign up',
		badge: 'Convert here',
		color: 'brand'
	}
};

// ---------------------------------------------------------------------------
// Page card (compact for funnel slots)
// ---------------------------------------------------------------------------
function PageCard({
	page,
	isAnchor,
	hasWarning
}: {
	page: PageData;
	isAnchor: boolean;
	hasWarning: boolean;
}) {
	const seoPct = Math.min(100, Math.round((page.seoScore / 115) * 100));
	const croPct = page.croScore ?? 0;

	return (
		<Link
			to={`/workspace/${page.id}`}
			className={cn(
				'group flex items-center gap-3 rounded-lg border bg-white px-3 py-2.5 shadow-sm transition-all',
				'hover:border-brand-300 dark:hover:border-brand-600 border-gray-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-900',
				isAnchor && 'ring-brand-500/30 ring-2'
			)}
		>
			<FileText className="size-4 shrink-0 text-gray-400" />
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span
						className={cn(
							'truncate font-medium text-gray-900 dark:text-white',
							hasWarning && 'text-amber-600 dark:text-amber-400'
						)}
					>
						{page.title}
					</span>
					{isAnchor && (
						<span className="bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold">
							★
						</span>
					)}
				</div>
				<div className="mt-0.5 flex items-center gap-2">
					<span className="text-[10px] text-gray-500 dark:text-gray-400">SEO {page.seoScore}</span>
					<span className="text-gray-300 dark:text-gray-600">·</span>
					<span className="text-[10px] text-gray-500 dark:text-gray-400">CRO {croPct}</span>
				</div>
			</div>
			<ChevronRight className="group-hover:text-brand-500 size-4 shrink-0 text-gray-300" />
		</Link>
	);
}

// ---------------------------------------------------------------------------
// Stage column with educational content
// ---------------------------------------------------------------------------
function StageColumn({
	stage,
	pages,
	isAction,
	hasDestination,
	destinationLabel,
	destinationUrl,
	visitorCount,
	onAddArticle,
	onAddDestination
}: {
	stage: FunnelStage;
	pages: PageData[];
	isAction: boolean;
	hasDestination: boolean;
	destinationLabel?: string;
	destinationUrl?: string;
	visitorCount?: number;
	onAddArticle?: () => void;
	onAddDestination?: () => void;
}) {
	const config = STAGE_CONFIG[stage];
	const Icon = config.icon;
	const focusPage = pages.find((p) => p.type === 'focus_page');

	const colorClasses = {
		blue: 'border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20',
		amber: 'border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20',
		green: 'border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-950/20',
		brand: 'border-brand-200 bg-brand-50/50 dark:border-brand-900/50 dark:bg-brand-950/20'
	}[config.color];

	return (
		<div className="flex flex-col">
			{/* Stage header — numbered like the CRO guide */}
			<div className={cn('rounded-t-xl border-2 border-b-0 p-4', colorClasses)}>
				<div className="flex items-center gap-2">
					<span className="font-mono text-2xl font-bold text-gray-400 dark:text-gray-500">
						{config.number}
					</span>
					<Icon className="size-5 text-gray-600 dark:text-gray-400" />
					<p className="font-semibold text-gray-900 dark:text-white">{config.label}</p>
				</div>
				<p className="mt-2 text-xs text-gray-600 dark:text-gray-400">{config.topicExample}</p>
				<p className="mt-1 text-[11px] text-gray-500 dark:text-gray-500">
					<span className="font-medium">Objection:</span> {config.objectionHint}
				</p>
				<p className="mt-1 text-[11px] text-gray-500 dark:text-gray-500">
					<span className="font-medium">CTA:</span> {config.ctaHint}
				</p>
				<span className="mt-2 inline-block rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800/80 dark:text-gray-400">
					{config.badge}
				</span>
			</div>

			{/* Content area */}
			<div className={cn('min-h-[120px] rounded-b-xl border-2 border-t-0 p-3', colorClasses)}>
				{isAction ? (
					/* Action = destination page */
					hasDestination ? (
						<div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 dark:border-gray-600 dark:bg-gray-900">
							<div className="flex items-center gap-2">
								<Lock className="size-4 text-gray-400" />
								<span className="font-medium text-gray-700 dark:text-gray-300">
									{destinationLabel || destinationUrl?.split('/').pop() || 'Destination'}
								</span>
							</div>
							<p className="mt-1 text-[11px] text-gray-500">CRO: ??/?? Locked</p>
							{visitorCount != null && visitorCount > 0 && (
								<p className="mt-1 text-[11px] text-gray-500">~{visitorCount} visitors →</p>
							)}
							<Button variant="outline" size="sm" className="mt-2 w-full" disabled>
								Unlock CRO Studio
							</Button>
						</div>
					) : (
						<button
							type="button"
							onClick={onAddDestination}
							className="hover:border-brand-400 dark:hover:border-brand-600 flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-8 transition-colors hover:bg-white/50 dark:border-gray-600"
						>
							<Plus className="size-8 text-gray-300 dark:text-gray-500" />
							<p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
								Connect destination page
							</p>
							<p className="mt-1 text-xs text-gray-500">Product, signup, or booking page</p>
						</button>
					)
				) : pages.length > 0 ? (
					<div className="space-y-2">
						{pages.map((p) => (
							<PageCard
								key={p.id}
								page={p}
								isAnchor={p.type === 'focus_page'}
								hasWarning={p.seoScore < 70}
							/>
						))}
						<Button
							variant="ghost"
							size="sm"
							className="w-full text-gray-500"
							onClick={onAddArticle}
						>
							<Plus className="mr-1.5 size-3.5" />
							Add article
						</Button>
					</div>
				) : (
					<div className="flex flex-col items-center justify-center py-6">
						<p className="text-center text-xs text-gray-500 dark:text-gray-400">
							{stage === 'consideration' && focusPage
								? 'Your SEO anchor lives here'
								: 'No content yet'}
						</p>
						<Button variant="outline" size="sm" className="mt-3" onClick={onAddArticle}>
							<Plus className="mr-1.5 size-3.5" />
							Add article
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export type ClusterWarningBanner = {
	type: string;
	severity: 'high' | 'medium' | 'low';
	message: string;
	action: string;
	affectedPages: string[];
};

export type FunnelVisualizerProps = {
	pages: PageData[];
	destinationUrl?: string | null;
	destinationLabel?: string | null;
	anchorClickCount?: number;
	/** L12: Top 2 cluster architecture warnings to show in banner */
	warnings?: ClusterWarningBanner[];
	onAddDestination?: () => void;
	onAddArticle?: () => void;
};

export function FunnelVisualizer({
	pages,
	destinationUrl,
	destinationLabel,
	anchorClickCount,
	warnings = [],
	onAddDestination,
	onAddArticle
}: FunnelVisualizerProps) {
	const boFuFocus = detectBoFuFocusPage(pages);

	const awareness = pages.filter((p) => getFunnelColumn(p) === 'awareness');
	const consideration = pages.filter((p) => getFunnelColumn(p) === 'consideration');

	const hasDestination = !!destinationUrl;

	return (
		<div className="flex flex-col gap-8 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
			<div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-700">
				<div>
					<p className="text-[13px] font-semibold text-gray-900 dark:text-white">
						Customer Journey Map
					</p>
					<p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
						Awareness → Consideration ★ → Destination. Articles build trust; your anchor ranks and
						sends visitors.
					</p>
				</div>
			</div>
			{/* Insight block — like Internal Links tab */}
			<AIInsightBlock
				variant="info"
				label="CUSTOMER JOURNEY"
				message={
					<span>
						<strong>Awareness</strong> → <strong>Consideration ★</strong> →{' '}
						<strong>Destination</strong>. Articles build trust; your SEO anchor ranks and sends
						visitors to your conversion page.
					</span>
				}
			/>

			{/* S1-11: W7 — BoFu focus page full-width red banner (from cluster intelligence or client-side fallback) */}
			{(warnings.some((w) => w.type === 'bofu_focus_page') || boFuFocus) && (
				<div className="-mx-4 rounded-none border-0 border-y-2 border-red-300 bg-red-50 p-5 dark:border-red-800 dark:bg-red-950/50 sm:rounded-xl sm:border-2 sm:border-red-200 sm:dark:border-red-800">
					<p className="font-semibold text-red-800 dark:text-red-200">
						Your SEO anchor is targeting a buying-intent keyword
					</p>
					<p className="mt-2 text-sm text-red-700 dark:text-red-300">
						Consider making this your destination page and creating a new anchor for a
						research-stage keyword like &quot;how to choose...&quot;
					</p>
					{boFuFocus && (
						<Link to={`/workspace/${boFuFocus.id}`}>
							<Button
								variant="outline"
								size="sm"
								className="mt-4 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300"
							>
								Open in Workspace
							</Button>
						</Link>
					)}
				</div>
			)}

			{/* L12: Top 2 cluster architecture warnings (exclude W7 — it has its own banner above) */}
			{warnings.filter((w) => w.type !== 'bofu_focus_page').length > 0 && (
				<div className="rounded-xl border-2 border-amber-200 bg-amber-50/80 p-4 dark:border-amber-800 dark:bg-amber-900/30">
					<div className="flex items-start gap-2">
						<AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
						<div className="min-w-0 flex-1 space-y-1.5">
							{warnings
								.filter((w) => w.type !== 'bofu_focus_page')
								.slice(0, 2)
								.map((w, i) => (
									<p key={w.type + String(i)} className="text-[13px] text-amber-800 dark:text-amber-200">
										{w.message}
									</p>
								))}
						</div>
					</div>
				</div>
			)}

			{/* Pages by stage — like Suggested Links table in Internal Links tab */}
			<p className="mb-3 text-[12px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
				Pages by stage
			</p>
			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
				<StageColumn
					stage="awareness"
					pages={awareness}
					isAction={false}
					hasDestination={false}
					onAddArticle={onAddArticle}
				/>
				<StageColumn
					stage="consideration"
					pages={consideration}
					isAction={false}
					hasDestination={false}
					onAddArticle={onAddArticle}
				/>
				<StageColumn
					stage="destination"
					pages={[]}
					isAction
					hasDestination={hasDestination}
					destinationLabel={destinationLabel ?? undefined}
					destinationUrl={destinationUrl ?? undefined}
					visitorCount={anchorClickCount}
					onAddDestination={onAddDestination}
				/>
			</div>
		</div>
	);
}
