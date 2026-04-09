import * as Sentry from '@sentry/react';
import { useParams, Link, useNavigate } from 'react-router';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { createLowlight, all } from 'lowlight';
import 'highlight.js/styles/github.css';
import {
	createSharklyArticleExtensions,
	buildSharklyArticleEditorProps,
	SHARKLY_ARTICLE_EDITOR_CONTENT_CLASS
} from '../components/editor/sharklyArticleEditor';
import {
	ArticleEditorToolbar,
	ArticleEditorBubbleMenu
} from '../components/editor/ArticleEditorChrome';
import { ArticleEditorWordCount } from '../components/editor/ArticleEditorWordCount';
import { toast } from 'sonner';
import PageMeta from '../components/common/PageMeta';
import { CreditBadge, CreditCost } from '../components/shared/CreditBadge';
import { AIInsightBlock } from '../components/shared/AIInsightBlock';
import { TaskProgressWidget } from '../components/shared/TaskProgressWidget';
import type { TaskStep, TaskStatus } from '../components/shared/TaskProgressWidget';
import { ScoreUnavailableNotice } from '../components/shared/ScoreUnavailableNotice';
import { usePage } from '../hooks/usePage';
import { useCluster } from '../hooks/useCluster';
import { useOrganization } from '../hooks/useOrganization';
import { usePageGscData } from '../hooks/usePageGscData';
import { useGSCStatus } from '../hooks/useGSCStatus';
import { api } from '../utils/api';
import { supabase } from '../utils/supabaseClient';
import { CREDIT_COSTS } from '../lib/credits'; // FOCUS_PAGE_FULL=40, FOCUS_PAGE_BRIEF_REGEN=25, ARTICLE_GENERATION=15
import { computeSeoScore, isPassageReadyH2, type SeoScoreBreakdown } from '../lib/seoScore';
import {
	PAGE_TYPES,
	CLUSTER_CONTENT_PAGE_TYPES,
	PAGE_TYPE_CONFIGS,
	canonicalPageType,
	canonicalClusterContentPageType,
	formatPageTypeDisplay,
	pageTypeColor
} from '../lib/seoUtils';
import { cleanPastedHTML } from '../lib/editorUtils';
import { Button } from '../components/ui/button';
import TextArea from '../components/form/input/TextArea';
import { MetaSidebar } from '../components/workspace/MetaSidebar';
import { DiagnoseModal } from '../components/workspace/DiagnoseModal';
import { GenerateVideoModal } from '../components/workspace/GenerateVideoModal';
import type { VideoDraftPersistPartial } from '../components/workspace/VideoProjectModal';
import { PublishToShopifyModal } from '../components/workspace/PublishToShopifyModal';
import { LawTooltip } from '../components/shared/LawTooltip';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter
} from '../components/ui/dialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '../components/ui/alert-dialog';
import { Tooltip } from '../components/ui/tooltip';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import {
	Link as LinkIcon,
	Sparkles,
	AlertTriangle,
	Check,
	X,
	Type,
	ScrollText,
	Info,
	ArrowLeft,
	Star,
	Tag,
	Loader2,
	FileText,
	Globe,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	BarChart3,
	Stethoscope,
	ShoppingBag,
	Target,
	MoreVertical,
	Video,
	ExternalLink
} from 'lucide-react';
import { useSiteContext } from '../contexts/SiteContext';
import { useAuth } from '../hooks/useAuth';
import { useCROStudioUpgrade } from '../contexts/CROStudioUpgradeContext';
import { canAccessCROStudio, hasPlanAtLeast } from '../utils/featureGating';
import { CROAddPageModal } from '../components/cro/CROAddPageModal';
import {
	createVideoJob,
	generateVideoScript,
	waitForVideo,
	type VideoJobOptions
} from '../api/video';
import {
	initialScriptGenTaskSteps,
	initialVideoGenTaskSteps,
	videoJobToTaskSteps
} from '../lib/videoGenerationProgress';
import type { VideoScript } from '../types/videoScript';
import type { VideoBranding, VideoDraftRenderOptions } from '../types/videoBranding';
import { FEATURE_VIDEOS_UI } from '../config/featureFlags';

/** Task steps for brief generation — summarized, no internal detail */
// Focus page: unified Research & Write flow (Step 1 = brief, Step 2 = article)
// Explanatory subtitles tell the user what their 40 credits are buying as it happens.
const RESEARCH_AND_WRITE_STEPS: TaskStep[] = [
	{
		id: '1',
		label: 'Step 1 — Research & Plan',
		subtitle:
			'Focus pages target competitive keywords and need to outrank established sites. Crawling top competitors to map H2 structure, entity coverage, word count targets, and information gaps — then building your structured brief.',
		status: 'pending'
	},
	{
		id: '2',
		label: 'Step 2 — Write Article',
		subtitle:
			'Writing your article from the plan — competitor word count × 1.1, passage-ready H2s, internal link architecture, and your IGS angle baked in.',
		status: 'pending'
	}
];

// Standalone brief regeneration — ids match NDJSON step events from generateBrief (8 steps)
const BRIEF_TASK_STEPS: TaskStep[] = [
	{ id: '1', label: 'Gathering search results', status: 'pending' },
	{ id: '2', label: 'Crawling competitor pages', status: 'pending' },
	{ id: '3', label: 'Aggregating competitor signals', status: 'pending' },
	{ id: '4', label: 'Preparing brief instructions', status: 'pending' },
	{ id: '5', label: 'Drafting brief with AI', status: 'pending' },
	{ id: '6', label: 'Shaping sections & outline', status: 'pending' },
	{ id: '7', label: 'Weaving entities & questions', status: 'pending' },
	{ id: '8', label: 'Finalizing brief structure', status: 'pending' }
];

// Standalone article regeneration (brief exists, user wants a rewrite) — ids match NDJSON step events from generateArticle
const ARTICLE_TASK_STEPS: TaskStep[] = [
	{ id: '1', label: 'Loading context & competitors', status: 'pending' },
	{ id: '2', label: 'Preparing draft', status: 'pending' },
	{ id: '3', label: 'Generating article', status: 'pending' },
	{ id: '4', label: 'Drafting deeper', status: 'pending' },
	{ id: '5', label: 'Continuing draft', status: 'pending' },
	{ id: '6', label: 'Formatting & internal links', status: 'pending' },
	{ id: '7', label: 'Extracting SEO metadata', status: 'pending' },
	{ id: '8', label: 'Saving article', status: 'pending' }
];

// Supporting article — same step ids as focus article stream
const SUPPORTING_ARTICLE_STEPS: TaskStep[] = [
	{
		id: '1',
		label: 'Researching competitors',
		subtitle:
			'Supporting articles target long-tail keywords. Crawling competitors for word count and H2 structure, then writing directly — same patent-grounded signals as a focus page, calibrated to the actual competition.',
		status: 'pending'
	},
	{ id: '2', label: 'Preparing draft', status: 'pending' },
	{ id: '3', label: 'Generating article', status: 'pending' },
	{ id: '4', label: 'Drafting sections', status: 'pending' },
	{ id: '5', label: 'Refining content', status: 'pending' },
	{ id: '6', label: 'Formatting & internal links', status: 'pending' },
	{ id: '7', label: 'Extracting SEO metadata', status: 'pending' },
	{ id: '8', label: 'Saving article', status: 'pending' }
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Score colour per Section 12.2 SEOScoreBadge spec */
function scoreColor(score: number): string {
	if (score >= 90) return 'text-teal-500 dark:text-teal-400';
	if (score >= 75) return 'text-success-600 dark:text-success-400';
	if (score >= 50) return 'text-warning-600 dark:text-warning-400';
	return 'text-error-600 dark:text-error-400';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Word Count Range Visualizer — Section 7.7 */
function WordCountVisualizer({ current, target }: { current: number; target: number }) {
	if (target <= 0) return null;
	const min = Math.round(target * 0.7);
	const max = Math.round(target * 1.3);
	const pct = Math.min(100, Math.round((current / max) * 100));

	let dotColor = 'bg-gray-400';
	let label = 'text-gray-500 dark:text-gray-400';
	if (current >= min && current <= max) {
		dotColor = 'bg-success-500';
		label = 'text-success-600 dark:text-success-400';
	} else if (current > max) {
		dotColor = 'bg-warning-500';
		label = 'text-warning-600 dark:text-warning-400';
	}

	const minPct = Math.round((min / max) * 100);
	const targetPct = Math.round((target / max) * 100);

	return (
		<div className="mb-6">
			<div className={`mb-1 text-[13px] font-medium ${label}`}>
				Your target is ~{target.toLocaleString()} words. You&apos;re at {current.toLocaleString()}{' '}
				words.
			</div>
			<div className="relative h-3 w-full overflow-visible rounded-full bg-gray-200 dark:bg-gray-700">
				{/* filled bar */}
				<div
					className={`absolute top-0 left-0 h-full rounded-full transition-all ${
						current < min ? 'bg-gray-400' : current > max ? 'bg-warning-400' : 'bg-success-400'
					}`}
					style={{ width: `${pct}%` }}
				/>
				{/* MIN marker */}
				<div
					className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-gray-500 dark:bg-gray-400"
					style={{ left: `${minPct}%` }}
				>
					<span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap text-gray-500 dark:text-gray-400">
						Min
					</span>
				</div>
				{/* TARGET marker */}
				<div
					className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-gray-700 dark:bg-gray-300"
					style={{ left: `${targetPct}%` }}
				>
					<span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300">
						Target
					</span>
				</div>
				{/* Current dot */}
				<div
					className={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white dark:border-gray-900 ${dotColor}`}
					style={{ left: `${pct}%` }}
				/>
			</div>
			<div className="mt-1 flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
				<span>0</span>
				<span>{max.toLocaleString()} max</span>
			</div>
		</div>
	);
}

/** PassageReadyIndicator — Section 7.7 / 12.2
 * Question H2s have a passage scoring advantage but are not required.
 * Non-question H2s rank well — this is an opportunity signal, not a pass/fail.
 */
function PassageReadyIndicator({ heading }: { heading: string }) {
	const ready = isPassageReadyH2(heading);

	if (ready) {
		return (
			<Tooltip
				content="Question-format H2s make it easier for Google to extract this section as a featured snippet or passage result. This heading is already optimised."
				tooltipPosition="top"
				usePortal
			>
				<span className="bg-success-50 text-success-600 dark:bg-success-900/30 dark:text-success-400 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold">
					<Check className="size-3" />
					Passage-optimized
				</span>
			</Tooltip>
		);
	}

	// Non-question — soft opportunity hint only, not an error
	const asQuestion = heading.endsWith('?') ? heading : `${heading}?`;
	return (
		<Tooltip
			content={`Rephrasing as a question (e.g. "${asQuestion}") makes it easier for Google to extract this section as a direct answer — improving passage scoring. Not required, but a meaningful advantage.`}
			tooltipPosition="top"
			usePortal
		>
			<span className="inline-flex items-center gap-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:bg-gray-800 dark:text-gray-500">
				<Info className="size-3" />
				Consider as question
			</span>
		</Tooltip>
	);
}

// ---------------------------------------------------------------------------
// Brief quality scoring — shared by Badge (header) and Panel (right sidebar)
// Scores the brief on 7 quality signals, each worth points toward 100
// ---------------------------------------------------------------------------

/** Normalizes brief_data.igs_opportunity (string or legacy object shape) for display / validation */
function igsTextFromBriefData(briefData: Record<string, unknown> | null | undefined): string {
	if (!briefData) return '';
	const raw = briefData.igs_opportunity;
	if (typeof raw === 'string') return raw.trim();
	if (raw && typeof raw === 'object' && raw !== null && 'description' in raw) {
		const d = (raw as { description?: string; type?: string }).description;
		return (d ?? '').trim();
	}
	return '';
}

/** Site-level IGS satisfies all pages; focus pages may also use brief_data.igs_opportunity */
function hasOriginalInsightForGeneration(
	isFocusPage: boolean,
	pageBrief: Record<string, unknown> | null | undefined,
	siteOriginalInsight: string | null | undefined
): boolean {
	if ((siteOriginalInsight ?? '').trim().length > 0) return true;
	if (isFocusPage && igsTextFromBriefData(pageBrief ?? null).length > 0) return true;
	return false;
}

function computeBriefQualityScore(
	page: { briefData?: Record<string, unknown> | null },
	briefSections: Array<{ heading?: string; type?: string; guidance?: string }>
): { score: number; signals: { label: string; pass: boolean; pts: number }[] } {
	const bd = page.briefData as Record<string, unknown> | null;
	const signals: { label: string; pass: boolean; pts: number }[] = [
		{ label: 'Sections planned', pass: briefSections.length >= 4, pts: 20 },
		{
			label: 'Question-format H2s',
			pass:
				briefSections.filter(
					(s) =>
						(s.type === 'H2' || s.type === 'h2') &&
						s.heading &&
						/^(what|how|why|when|where|which|who|can|does|is|are|should|will)/i.test(s.heading)
				).length >= 2,
			pts: 15
		},
		{
			label: 'IGS opportunity identified',
			pass: igsTextFromBriefData(bd).length > 0,
			pts: 20
		},
		{
			label: 'Entities mapped',
			pass: Array.isArray(bd?.entities) && (bd?.entities as unknown[]).length >= 3,
			pts: 15
		},
		{
			label: 'PAA questions',
			pass: Array.isArray(bd?.paa_questions) && (bd?.paa_questions as unknown[]).length >= 2,
			pts: 15
		},
		{
			label: 'Competitor data',
			pass: Array.isArray(bd?.competitors_raw) && (bd?.competitors_raw as unknown[]).length >= 2,
			pts: 10
		},
		{
			label: 'Internal link plan',
			pass:
				Array.isArray(bd?.internal_link_instructions) &&
				(bd?.internal_link_instructions as unknown[]).length >= 1,
			pts: 5
		}
	];
	const score = signals.filter((s) => s.pass).reduce((sum, s) => sum + s.pts, 0);
	return { score, signals };
}

function BriefQualityBadge({
	page,
	briefSections
}: {
	page: { briefData?: Record<string, unknown> | null };
	briefSections: Array<{ heading?: string; type?: string; guidance?: string }>;
}) {
	const { score } = computeBriefQualityScore(page, briefSections);
	const color =
		score >= 80
			? 'text-teal-500 dark:text-teal-400'
			: score >= 60
				? 'text-success-600 dark:text-success-400'
				: score >= 40
					? 'text-warning-600 dark:text-warning-400'
					: 'text-error-600 dark:text-error-400';

	return (
		<div className="shrink-0 text-right">
			<span className={`font-montserrat text-2xl font-extrabold ${color}`}>{score}</span>
			<span className="ml-1 text-sm text-gray-500 dark:text-gray-400">/100</span>
			<div className="text-[10px] tracking-wide text-gray-400 uppercase dark:text-gray-500">
				Brief quality
			</div>
		</div>
	);
}

/** Full brief quality panel for right sidebar — matches SEO score layout */
function BriefQualityPanel({
	page,
	briefSections
}: {
	page: { briefData?: Record<string, unknown> | null };
	briefSections: Array<{ heading?: string; type?: string; guidance?: string }>;
}) {
	const { score, signals } = computeBriefQualityScore(page, briefSections);
	const color =
		score >= 80
			? 'text-teal-500 dark:text-teal-400'
			: score >= 60
				? 'text-success-600 dark:text-success-400'
				: score >= 40
					? 'text-warning-600 dark:text-warning-400'
					: 'text-error-600 dark:text-error-400';

	return (
		<>
			<div className="mb-4 text-center">
				<span className={`font-montserrat text-5xl font-extrabold ${color}`}>{score}</span>
				<span className="ml-1 text-base text-gray-500 dark:text-gray-400">/100</span>
				<div className="text-xs tracking-wide text-gray-500 uppercase dark:text-gray-400">
					Brief Quality
				</div>
			</div>
			<Tooltip
				content="Aim for 75+ before generating your article. The IGS opportunity and entity fields carry the most weight — missing either produces a weaker article regardless of structure."
				tooltipPosition="top"
				usePortal
			>
				<div className="mb-4 flex items-center justify-center gap-1 text-center text-gray-500 dark:text-gray-400">
					<Info className="size-3" />
					<div className="text-[10px] tracking-wide uppercase">Aim for a score of 75+</div>
				</div>
			</Tooltip>
			<div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
				<div className="mb-2 text-[12px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
					Quality signals
				</div>
				<div className="space-y-1.5 text-[12px]">
					{signals.map(({ label, pass, pts }) => (
						<div key={label} className="flex items-center justify-between">
							<span className="text-gray-600 dark:text-gray-400">{label}</span>
							<span
								className={
									pass
										? 'text-success-600 dark:text-success-400 font-semibold'
										: 'text-gray-400 dark:text-gray-500'
								}
							>
								{pass ? `+${pts}` : `0/${pts}`}
							</span>
						</div>
					))}
				</div>
			</div>
		</>
	);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Workspace() {
	const { id } = useParams();
	const navigate = useNavigate();
	const { page, loading, error, refetch } = usePage(id ?? null);
	const { cluster } = useCluster(page?.clusterId ?? null);
	const { organization, refetch: refetchOrg } = useOrganization();
	const { session } = useAuth();
	const { openCROStudioUpgradeModal } = useCROStudioUpgrade();
	const isFocusPage = page?.type === 'focus_page';

	const { sites, selectedSite, refetchSites } = useSiteContext();

	const siteUrlForSeo = useMemo(() => {
		const sid = cluster?.siteId;
		const row = sid ? sites.find((s) => s.id === sid) : null;
		const url = (row ?? selectedSite)?.url?.trim();
		return url && url.length > 0 ? url.replace(/\/$/, '') : undefined;
	}, [cluster?.siteId, sites, selectedSite]);

	const videoSiteVoiceId = useMemo(() => {
		const sid = cluster?.siteId;
		if (!sid) return undefined;
		const v = sites.find((s) => s.id === sid)?.cartesiaVoiceId;
		return v && v.length > 0 ? v : undefined;
	}, [cluster?.siteId, sites]);

	// Mode tabs: each page type defaults to its natural mode but can switch
	const [activeTab, setActiveTab] = useState<'brief' | 'article'>(
		isFocusPage ? 'brief' : 'article'
	);
	const [activeIntelTab, setActiveIntelTab] = useState<'seo' | 'competitors' | 'entities'>('seo');
	const [showEditorFromScratch, setShowEditorFromScratch] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [taskWidgetOpen, setTaskWidgetOpen] = useState(false);
	const [taskWidgetStatus, setTaskWidgetStatus] = useState<TaskStatus>('running');
	const [taskWidgetTitle, setTaskWidgetTitle] = useState('');
	const [taskWidgetSteps, setTaskWidgetSteps] = useState<TaskStep[]>([]);
	const [taskWidgetError, setTaskWidgetError] = useState<string | undefined>();
	const [taskWidgetErrorDetail, setTaskWidgetErrorDetail] = useState<string | undefined>();
	const [taskWidgetDisableAutoAdvance, setTaskWidgetDisableAutoAdvance] = useState(false);
	const [liveSeoBreakdown, setLiveSeoBreakdown] = useState<SeoScoreBreakdown | null>(null);
	// L9: AI detection education — persisted dismiss (localStorage)
	const [aiDetectionDismissed, setAiDetectionDismissed] = useState(
		() =>
			typeof window !== 'undefined' &&
			localStorage.getItem('sharkly_ai_detection_dismissed') === '1'
	);
	const [contentVersion, setContentVersion] = useState(0);
	const [, forceUpdate] = useState(0);
	const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
	const [markPublishedLoading, setMarkPublishedLoading] = useState(false);
	const [diagnoseOpen, setDiagnoseOpen] = useState(false);
	const [shopifyPublishOpen, setShopifyPublishOpen] = useState(false);
	const [addToCROModalOpen, setAddToCROModalOpen] = useState(false);
	const [openCROStudioLoading, setOpenCROStudioLoading] = useState(false);
	const [confirmRegenOpen, setConfirmRegenOpen] = useState(false);
	const [confirmArticleRegenOpen, setConfirmArticleRegenOpen] = useState(false);
	const [metaSidebarOpen, setMetaSidebarOpen] = useState(false);
	const [generateVideoOpen, setGenerateVideoOpen] = useState(false);
	const [videoJobSubmitting, setVideoJobSubmitting] = useState(false);
	const [scriptGenSubmitting, setScriptGenSubmitting] = useState(false);
	const [videoGenWidgetOpen, setVideoGenWidgetOpen] = useState(false);
	const [videoGenWidgetStatus, setVideoGenWidgetStatus] = useState<TaskStatus>('running');
	const [videoGenWidgetSteps, setVideoGenWidgetSteps] = useState<TaskStep[]>([]);
	const [videoGenWidgetError, setVideoGenWidgetError] = useState<string | undefined>();
	const [videoGenWidgetErrorDetail, setVideoGenWidgetErrorDetail] = useState<string | undefined>();

	const [scriptGenWidgetOpen, setScriptGenWidgetOpen] = useState(false);
	const [scriptGenWidgetStatus, setScriptGenWidgetStatus] = useState<TaskStatus>('running');
	const [scriptGenWidgetSteps, setScriptGenWidgetSteps] = useState<TaskStep[]>([]);
	const [scriptGenWidgetError, setScriptGenWidgetError] = useState<string | undefined>();
	const [scriptGenWidgetErrorDetail, setScriptGenWidgetErrorDetail] = useState<string | undefined>();
	/** Final video URL — shown in the progress widget if a new-tab open was blocked. */
	const [videoGenDoneUrl, setVideoGenDoneUrl] = useState<string | null>(null);
	const [rewritingSectionIdx, setRewritingSectionIdx] = useState<number | null>(null);
	const [briefSectionEdits, setBriefSectionEdits] = useState<Record<number, string>>({});
	const [savingBriefSectionIdx, setSavingBriefSectionIdx] = useState<number | null>(null);
	const [faqGenerating, setFaqGenerating] = useState(false);
	const [faqData, setFaqData] = useState<{
		faqs: Array<{ question: string; answer: string }>;
		schema: string;
	} | null>(null);
	const [faqOpen, setFaqOpen] = useState(false);
	/** Modal collects site-level original insight when missing; saved on the site for all articles */
	const [igsModalOpen, setIgsModalOpen] = useState(false);
	const [igsModalDraft, setIgsModalDraft] = useState('');
	const [igsModalError, setIgsModalError] = useState<string | null>(null);
	const [savingIgs, setSavingIgs] = useState(false);
	const [pendingAfterIgs, setPendingAfterIgs] = useState<'article' | 'research_article' | null>(
		null
	);
	// Pricing state derived from brief_data
	const briefPaid = !!(page?.briefData as { brief_paid?: boolean } | null)?.brief_paid;
	const articleGenerated = !!(page?.briefData as { article_generated?: boolean } | null)
		?.article_generated;
	const hasContent = (page?.wordCount ?? 0) > 0;
	// Free only when brief was paid AND article has never been generated from it.
	// Using article_generated (backend flag) not hasContent — content can be deleted,
	// article_generated cannot be reset by the user.
	const firstArticleIsFree = briefPaid && !articleGenerated;

	// L7: Author / EEAT — pre-fills from page override or site default; editable before brief generation
	const siteForAuthor = cluster?.siteId ? sites.find((s) => s.id === cluster.siteId) : null;
	const defaultAuthor = (page?.authorBioOverride ?? siteForAuthor?.authorBio ?? '').trim() || '';

	// L10: Page-level GSC attribution — impressions, clicks, CTR, position for this page
	const { isConnected: gscConnected } = useGSCStatus(cluster?.siteId);
	const { metrics: pageGscMetrics, loading: pageGscLoading } = usePageGscData({
		siteId: cluster?.siteId,
		pageUrl: page?.publishedUrl,
		siteUrl: siteForAuthor?.url,
		slug: page?.slug,
		days: 28,
		enabled: !!cluster?.siteId && (!!page?.publishedUrl || !!page?.slug) && gscConnected
	});
	const [authorForBrief, setAuthorForBrief] = useState(defaultAuthor);
	useEffect(() => {
		setAuthorForBrief(defaultAuthor);
	}, [defaultAuthor]);

	const creditsRemaining =
		organization?.included_credits_remaining ?? organization?.included_credits ?? 0;
	const briefCost = CREDIT_COSTS.MONEY_PAGE_BRIEF;
	const articleCost = CREDIT_COSTS.ARTICLE_GENERATION;
	const hasCreditsForBrief = creditsRemaining >= briefCost;
	const hasCreditsForArticle = creditsRemaining >= articleCost;

	// Brief sections — defined early so handleSaveBriefSection can reference it
	const briefSections = useMemo(
		() =>
			(page?.briefData?.sections as Array<{
				type?: string;
				heading?: string;
				guidance?: string;
				entities?: string[];
				entitiesCovered?: string[];
				entitiesMissing?: string[];
				cro_note?: string | null;
				content?: string;
				croFlag?: string;
			}>) ?? [],
		[page?.briefData]
	);
	const hasBrief = briefSections.length > 0;

	// Page type — editable in workspace, persists to DB
	const [localPageType, setLocalPageType] = useState<string>('');
	const [pageTypeSaving, setPageTypeSaving] = useState(false);
	const handlePageTypeChange = useCallback(
		async (newType: string) => {
			if (!page?.id) return;
			setLocalPageType(newType);
			setPageTypeSaving(true);
			const { error: ptErr } = await supabase
				.from('pages')
				.update({ page_type: newType })
				.eq('id', page.id);
			setPageTypeSaving(false);
			if (ptErr) {
				toast.error('Failed to save page type');
			}
		},
		[page?.id]
	);

	// Cluster pages: DB stores inferred content types (Blog Post, How-To, …); map legacy CRO codes for the dropdown.
	useEffect(() => {
		if (!page?.pageType) {
			setLocalPageType('Blog Post');
			return;
		}
		setLocalPageType(
			page.clusterId
				? canonicalClusterContentPageType(page.pageType)
				: canonicalPageType(page.pageType)
		);
	}, [page?.pageType, page?.clusterId]);

	const workspacePageTypeOptions = useMemo(
		() => (page?.clusterId ? CLUSTER_CONTENT_PAGE_TYPES : PAGE_TYPES),
		[page?.clusterId]
	);

	// Fetch minimal site settings (language/region) for display
	const [siteLanguage, setSiteLanguage] = useState<{ language: string; region: string } | null>(
		null
	);
	useEffect(() => {
		if (!cluster?.siteId) return;
		supabase
			.from('sites')
			.select('target_language, target_region')
			.eq('id', cluster.siteId)
			.single()
			.then(({ data }) => {
				if (data)
					setSiteLanguage({
						language: (data.target_language as string) || 'English',
						region: (data.target_region as string) || 'United States'
					});
			});
	}, [cluster?.siteId]);

	// Sync tab when page type changes (e.g. navigating between pages)
	useEffect(() => {
		setActiveTab(isFocusPage ? 'brief' : 'article');
		setShowEditorFromScratch(false);
	}, [id, isFocusPage]);

	const handleOpenInCROStudio = useCallback(async () => {
		const token = session?.access_token;
		if (!token) {
			toast.error('Please sign in to continue');
			return;
		}
		const pubUrl = page?.publishedUrl?.trim();
		const siteUrl = siteForAuthor?.url?.replace(/\/$/, '');
		const fullPageUrl = !pubUrl
			? ''
			: pubUrl.startsWith('http://') || pubUrl.startsWith('https://')
				? pubUrl
				: siteUrl
					? `${siteUrl}${pubUrl.startsWith('/') ? pubUrl : `/${pubUrl}`}`
					: '';
		if (!fullPageUrl) {
			toast.error('Add a page URL in Meta to audit this page in CRO Studio');
			return;
		}
		const normalizeUrl = (u: string) => u.trim().toLowerCase().replace(/\/+$/, '') || '';
		setOpenCROStudioLoading(true);
		try {
			const res = await api.get('/api/cro-studio/audits?page_type=seo_page');
			const data = await res.json().catch(() => ({}));
			const audits = Array.isArray(data?.audits) ? data.audits : [];
			const targetNorm = normalizeUrl(fullPageUrl);
			const match = audits.find(
				(a: { page_url?: string }) => normalizeUrl(a.page_url ?? '') === targetNorm
			);
			if (match?.id) {
				navigate(`/cro-studio/audit/${match.id}`);
				return;
			}
			setAddToCROModalOpen(true);
		} catch {
			toast.error('Failed to check CRO Studio audits');
		} finally {
			setOpenCROStudioLoading(false);
		}
	}, [session?.access_token, page?.publishedUrl, siteForAuthor?.url, navigate]);

	const handleGenerateBrief = useCallback(async () => {
		if (!id) return;
		if (!isFocusPage) {
			toast.error(
				'Brief generation is only available for focus pages. Switch the page type or use Article generation instead.'
			);
			return;
		}
		setGenerating(true);
		setTaskWidgetTitle('Generating brief');
		setTaskWidgetSteps(
			BRIEF_TASK_STEPS.map((s, i) => ({
				...s,
				status: (i === 0 ? 'active' : 'pending') as 'active' | 'pending'
			}))
		);
		setTaskWidgetStatus('running');
		setTaskWidgetError(undefined);
		setTaskWidgetErrorDetail(undefined);
		setTaskWidgetDisableAutoAdvance(true); // Real progress from NDJSON stream
		setTaskWidgetOpen(true);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				toast.error('Please sign in to continue');
				setTaskWidgetStatus('error');
				setTaskWidgetError('Please sign in to continue');
				setTaskWidgetErrorDetail(undefined);
				return;
			}
			const res = await api.post(`/api/pages/${id}/brief`, {
				authorOverride: authorForBrief.trim() || null
			});

			// Non-2xx: read JSON error (auth, credits, etc.)
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				if (res.status === 402) {
					const msg = `Insufficient credits. Need ${data.required ?? briefCost}, have ${data.available ?? creditsRemaining ?? 0}.`;
					toast.error(msg);
					setTaskWidgetStatus('error');
					setTaskWidgetError(msg);
					setTaskWidgetErrorDetail(undefined);
					return;
				}
				throw new Error(data?.error || 'Failed to generate brief');
			}

			// Consume NDJSON stream
			const reader = res.body?.getReader();
			const decoder = new TextDecoder();
			let buffer = '';
			let briefData: Record<string, unknown> | null = null;
			let streamError: { message: string; detail?: string } | undefined;

			if (reader) {
				let streamDone = false;
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() ?? '';
					for (const line of lines) {
						if (!line.trim()) continue;
						try {
							const ev = JSON.parse(line) as {
								type: string;
								id?: string;
								message?: string;
								briefData?: Record<string, unknown>;
							};
							if (ev.type === 'ping') continue;
							if (ev.type === 'step' && ev.id) {
								const stepIdx = BRIEF_TASK_STEPS.findIndex((st) => st.id === ev.id);
								if (stepIdx >= 0) {
									setTaskWidgetSteps((prev) =>
										prev.map((s, i) => {
											if (i <= stepIdx) return { ...s, status: 'complete' as const };
											if (i === stepIdx + 1) return { ...s, status: 'active' as const };
											return s;
										})
									);
								}
							} else if (ev.type === 'done') {
								briefData = ev.briefData ?? null;
								streamDone = true;
								break;
							} else if (ev.type === 'error') {
								const evd = ev as { message?: string; detail?: string };
								streamError = {
									message: evd.message ?? 'Failed to generate brief',
									detail: evd.detail
								};
								streamDone = true;
								break;
							}
						} catch (parseErr) {
							if (parseErr instanceof SyntaxError) {
								continue; // skip malformed JSON line
							}
							throw parseErr;
						}
					}
					if (streamDone) break;
				}
			}

			if (streamError) {
				toast.error(streamError.message);
				setTaskWidgetStatus('error');
				setTaskWidgetError(streamError.message);
				setTaskWidgetErrorDetail(streamError.detail);
				return;
			}

			if (!briefData) {
				throw new Error('No brief data received');
			}
			setTaskWidgetStatus('done');
			toast.success('Brief generated');
			refetch();
			refetchOrg();
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to generate brief';
			toast.error(msg);
			setTaskWidgetStatus('error');
			setTaskWidgetError(msg);
			setTaskWidgetErrorDetail(undefined);
		} finally {
			setGenerating(false);
			setTaskWidgetDisableAutoAdvance(false);
		}
	}, [id, isFocusPage, authorForBrief, refetch, refetchOrg, briefCost, creditsRemaining]);

	const openIgsModalForPending = useCallback(
		(pending: 'article' | 'research_article') => {
			setPendingAfterIgs(pending);
			setIgsModalDraft((siteForAuthor?.originalInsight ?? '').trim());
			setIgsModalError(null);
			setIgsModalOpen(true);
		},
		[siteForAuthor?.originalInsight]
	);

	/** Step 2 of Research & Write — article NDJSON stream (switches widget to detailed article steps) */
	const runResearchWriteArticleOnly = useCallback(async () => {
		if (!id) return;
		const articleRes = await api.post(`/api/pages/${id}/article`);

		if (!articleRes.ok) {
			const articleData = await articleRes.json().catch(() => ({}));
			const msg =
				articleRes.status === 402
					? `Not enough credits for article — need ${articleData.required ?? 0}, have ${articleData.available ?? creditsRemaining}.`
					: articleData?.error || 'Failed to generate article';
			toast.error(msg);
			setTaskWidgetStatus('error');
			setTaskWidgetError(msg);
			setTaskWidgetErrorDetail(undefined);
			setGenerating(false);
			return;
		}

		const steps = ARTICLE_TASK_STEPS;
		setTaskWidgetTitle('Writing article from brief');
		setTaskWidgetSteps(
			steps.map((s, i) => ({
				...s,
				status: (i === 0 ? 'active' : 'pending') as 'active' | 'pending'
			}))
		);
		setTaskWidgetStatus('running');
		setTaskWidgetOpen(true);

		const articleReader = articleRes.body?.getReader();
		const articleDecoder = new TextDecoder();
		let articleBuffer = '';
		let articleStreamError: { message: string; detail?: string } | undefined;
		let articleDone = false;
		if (articleReader) {
			while (true) {
				const { done, value } = await articleReader.read();
				if (done) break;
				articleBuffer += articleDecoder.decode(value, { stream: true });
				const lines = articleBuffer.split('\n');
				articleBuffer = lines.pop() ?? '';
				for (const line of lines) {
					if (!line.trim()) continue;
					try {
						const ev = JSON.parse(line) as {
							type: string;
							id?: string;
							message?: string;
							detail?: string;
						};
						if (ev.type === 'ping') continue;
						if (ev.type === 'step' && ev.id) {
							setTaskWidgetSteps((prev) => {
								const stepIdx = steps.findIndex((st) => st.id === ev.id);
								if (stepIdx === -1) return prev;
								return prev.map((s, i) => {
									if (i <= stepIdx) return { ...s, status: 'complete' as const };
									if (i === stepIdx + 1) return { ...s, status: 'active' as const };
									return s;
								});
							});
						} else if (ev.type === 'done') {
							articleDone = true;
							break;
						} else if (ev.type === 'error') {
							articleStreamError = {
								message: ev.message ?? 'Failed to generate article',
								detail: ev.detail
							};
							articleDone = true;
							break;
						}
					} catch (parseErr) {
						if (!(parseErr instanceof SyntaxError)) throw parseErr;
					}
				}
				if (articleDone) break;
			}
		}

		if (articleStreamError) {
			toast.error(articleStreamError.message);
			setTaskWidgetStatus('error');
			setTaskWidgetError(articleStreamError.message);
			setTaskWidgetErrorDetail(articleStreamError.detail);
			setGenerating(false);
			return;
		}

		setTaskWidgetStatus('done');
		toast.success('Focus page complete — research, brief, and article ready');
		setGenerating(false);
		setActiveTab('article');
		await refetch();
		await refetchOrg();
	}, [id, refetch, refetchOrg, creditsRemaining]);

	const handleGenerateArticle = useCallback(
		async (skipIgsGate = false) => {
			if (!id) return;
			if (
				!skipIgsGate &&
				!hasOriginalInsightForGeneration(
					isFocusPage,
					page?.briefData as Record<string, unknown> | null | undefined,
					siteForAuthor?.originalInsight
				)
			) {
				openIgsModalForPending('article');
				return;
			}

			setGenerating(true);
			setTaskWidgetTitle(isFocusPage ? 'Writing article from brief' : 'Generating article');
			setTaskWidgetSteps(
				(isFocusPage ? ARTICLE_TASK_STEPS : SUPPORTING_ARTICLE_STEPS).map((s, i) => ({
					...s,
					status: (i === 0 ? 'active' : 'pending') as 'active' | 'pending'
				}))
			);
			setTaskWidgetStatus('running');
			setTaskWidgetError(undefined);
			setTaskWidgetErrorDetail(undefined);
			setTaskWidgetOpen(true);
			setTaskWidgetDisableAutoAdvance(true);
			try {
				const {
					data: { session }
				} = await supabase.auth.getSession();
				const token = session?.access_token;
				if (!token) {
					toast.error('Please sign in to continue');
					setGenerating(false);
					setTaskWidgetStatus('error');
					setTaskWidgetError('Please sign in to continue');
					setTaskWidgetErrorDetail(undefined);
					return;
				}
				const res = await api.post(`/api/pages/${id}/article`);

				if (!res.ok) {
					const data = await res.json().catch(() => ({}));
					if (res.status === 402) {
						toast.error(
							`Insufficient credits. Need ${data.required ?? articleCost}, have ${data.available ?? creditsRemaining ?? 0}.`
						);
						setTaskWidgetStatus('error');
						setTaskWidgetError(
							`Insufficient credits. Need ${data.required ?? articleCost}, have ${data.available ?? creditsRemaining ?? 0}.`
						);
						setTaskWidgetErrorDetail(undefined);
						return;
					}
					throw new Error(data?.error || 'Failed to generate article');
				}

				// Consume NDJSON stream
				const steps = isFocusPage ? ARTICLE_TASK_STEPS : SUPPORTING_ARTICLE_STEPS;
				const reader = res.body?.getReader();
				const decoder = new TextDecoder();
				let buffer = '';
				let streamError: { message: string; detail?: string } | undefined;

				if (reader) {
					let streamDone = false;
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						buffer += decoder.decode(value, { stream: true });
						const lines = buffer.split('\n');
						buffer = lines.pop() ?? '';
						for (const line of lines) {
							if (!line.trim()) continue;
							try {
								const ev = JSON.parse(line) as {
									type: string;
									id?: string;
									message?: string;
									detail?: string;
								};
								if (ev.type === 'ping') continue;
								if (ev.type === 'step' && ev.id) {
									setTaskWidgetSteps((prev) => {
										const stepIdx = steps.findIndex((st) => st.id === ev.id);
										if (stepIdx === -1) return prev;
										return prev.map((s, i) => {
											if (i <= stepIdx) return { ...s, status: 'complete' as const };
											if (i === stepIdx + 1) return { ...s, status: 'active' as const };
											return s;
										});
									});
								} else if (ev.type === 'done') {
									streamDone = true;
									break;
								} else if (ev.type === 'error') {
									streamError = {
										message: ev.message ?? 'Failed to generate article',
										detail: ev.detail
									};
									streamDone = true;
									break;
								}
							} catch (parseErr) {
								if (!(parseErr instanceof SyntaxError)) throw parseErr;
							}
						}
						if (streamDone) break;
					}
				}

				if (streamError) {
					toast.error(streamError.message);
					setTaskWidgetStatus('error');
					setTaskWidgetError(streamError.message);
					setTaskWidgetErrorDetail(streamError.detail);
					return;
				}

				setTaskWidgetStatus('done');
				toast.success('Article generated — SEO score ready');
				refetch();
				refetchOrg();
			} catch (err) {
				const msg = err instanceof Error ? err.message : 'Failed to generate article';
				toast.error(msg);
				setTaskWidgetStatus('error');
				setTaskWidgetError(msg);
				setTaskWidgetErrorDetail(undefined);
			} finally {
				setGenerating(false);
				setTaskWidgetDisableAutoAdvance(false);
			}
		},
		[
			id,
			isFocusPage,
			page?.briefData,
			siteForAuthor?.originalInsight,
			refetch,
			refetchOrg,
			articleCost,
			creditsRemaining,
			openIgsModalForPending
		]
	);

	const handleIgsModalSubmit = useCallback(async () => {
		const text = igsModalDraft.trim();
		if (!text) {
			setIgsModalError('Describe your original insight to continue.');
			return;
		}
		const siteId = cluster?.siteId;
		if (!siteId) {
			toast.error('No site linked to this page');
			return;
		}
		setSavingIgs(true);
		try {
			const { error: siteErr } = await supabase
				.from('sites')
				.update({ original_insight: text, updated_at: new Date().toISOString() })
				.eq('id', siteId);
			if (siteErr) throw new Error(siteErr.message);
			await refetchSites();
			const pending = pendingAfterIgs;
			setPendingAfterIgs(null);
			setIgsModalOpen(false);
			setIgsModalError(null);
			if (pending === 'article') {
				await handleGenerateArticle(true);
			} else if (pending === 'research_article') {
				setGenerating(true);
				setTaskWidgetDisableAutoAdvance(true);
				setTaskWidgetTitle('Research & Write');
				setTaskWidgetSteps(
					RESEARCH_AND_WRITE_STEPS.map((s, i) => ({
						...s,
						status: (i === 0 ? 'complete' : i === 1 ? 'active' : 'pending') as 'active' | 'pending'
					}))
				);
				setTaskWidgetStatus('running');
				setTaskWidgetError(undefined);
				setTaskWidgetErrorDetail(undefined);
				setTaskWidgetOpen(true);
				await runResearchWriteArticleOnly();
			}
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Failed to save');
		} finally {
			setSavingIgs(false);
		}
	}, [
		igsModalDraft,
		pendingAfterIgs,
		cluster?.siteId,
		refetchSites,
		handleGenerateArticle,
		runResearchWriteArticleOnly
	]);

	// ── Research & Write — chains brief → article for focus pages (first time) ──
	// Step 1 charges FOCUS_PAGE_FULL (40 credits), Step 2 is free (brief_paid flag).
	// Shows a unified progress modal with explanatory subtitles for each step.
	const handleResearchAndWrite = useCallback(async () => {
		if (!id || !isFocusPage) return;

		// Get auth token once for both calls
		const {
			data: { session }
		} = await supabase.auth.getSession();
		const token = session?.access_token;
		if (!token) {
			toast.error('Please sign in to continue');
			return;
		}

		setGenerating(true);
		setTaskWidgetTitle('Research & Write');
		setTaskWidgetSteps(
			BRIEF_TASK_STEPS.map((s, i) => ({
				...s,
				status: (i === 0 ? 'active' : 'pending') as 'active' | 'pending'
			}))
		);
		setTaskWidgetStatus('running');
		setTaskWidgetError(undefined);
		setTaskWidgetErrorDetail(undefined);
		setTaskWidgetOpen(true);

		try {
			// ── Step 1: Generate brief (NDJSON stream — same step ids as standalone brief) ──
			setTaskWidgetDisableAutoAdvance(true);
			const briefRes = await api.post(`/api/pages/${id}/brief`, {
				authorOverride: authorForBrief.trim() || null
			});

			if (!briefRes.ok) {
				const data = await briefRes.json().catch(() => ({}));
				const msg =
					briefRes.status === 402
						? `Not enough credits — need ${data.required ?? 40}, have ${data.available ?? creditsRemaining}.`
						: data?.error || 'Failed to generate brief';
				toast.error(msg);
				setTaskWidgetStatus('error');
				setTaskWidgetError(msg);
				setTaskWidgetErrorDetail(undefined);
				return;
			}

			// Consume NDJSON stream
			const reader = briefRes.body?.getReader();
			const decoder = new TextDecoder();
			let buffer = '';
			let briefData: Record<string, unknown> | null = null;
			let briefStreamError: { message: string; detail?: string } | undefined;

			if (reader) {
				let streamDone = false;
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() ?? '';
					for (const line of lines) {
						if (!line.trim()) continue;
						try {
							const ev = JSON.parse(line) as {
								type: string;
								id?: string;
								briefData?: Record<string, unknown>;
								message?: string;
								detail?: string;
							};
							if (ev.type === 'ping') continue;
							if (ev.type === 'step' && ev.id) {
								const stepIdx = BRIEF_TASK_STEPS.findIndex((st) => st.id === ev.id);
								if (stepIdx >= 0) {
									setTaskWidgetSteps((prev) =>
										prev.map((s, i) => {
											if (i <= stepIdx) return { ...s, status: 'complete' as const };
											if (i === stepIdx + 1) return { ...s, status: 'active' as const };
											return s;
										})
									);
								}
							} else if (ev.type === 'done') {
								briefData = ev.briefData ?? null;
								streamDone = true;
								break;
							} else if (ev.type === 'error') {
								briefStreamError = {
									message: ev.message ?? 'Failed to generate brief',
									detail: ev.detail
								};
								streamDone = true;
								break;
							}
						} catch (parseErr) {
							if (!(parseErr instanceof SyntaxError)) throw parseErr;
						}
					}
					if (streamDone) break;
				}
			}

			if (briefStreamError) {
				toast.error(briefStreamError.message);
				setTaskWidgetStatus('error');
				setTaskWidgetError(briefStreamError.message);
				setTaskWidgetErrorDetail(briefStreamError.detail);
				return;
			}

			// Validate the brief actually has sections before advancing
			const briefSectionCount =
				briefData && Array.isArray(briefData.sections) ? briefData.sections.length : 0;
			if (briefSectionCount === 0) {
				const msg = 'Brief generated no sections — please try again.';
				toast.error(msg);
				setTaskWidgetStatus('error');
				setTaskWidgetError(msg);
				setTaskWidgetErrorDetail(undefined);
				return;
			}

			await refetch(); // brief now in page data
			await refetchOrg();

			const igsFromBrief = igsTextFromBriefData(briefData);
			const siteHasIgs = (siteForAuthor?.originalInsight ?? '').trim().length > 0;
			if (!igsFromBrief && !siteHasIgs) {
				setTaskWidgetStatus('done');
				setTaskWidgetOpen(false);
				setGenerating(false);
				setTaskWidgetDisableAutoAdvance(false);
				setPendingAfterIgs('research_article');
				setIgsModalDraft((siteForAuthor?.originalInsight ?? '').trim());
				setIgsModalError(null);
				setIgsModalOpen(true);
				toast.success('Brief ready. Add your site original insight to finish your article.');
				return;
			}

			// ── Step 2: Generate article (NDJSON stream, free — bundled) ─────────────
			await runResearchWriteArticleOnly();
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to generate';
			toast.error(msg);
			setTaskWidgetStatus('error');
			setTaskWidgetError(msg);
			setTaskWidgetErrorDetail(undefined);
		} finally {
			setGenerating(false);
			setTaskWidgetDisableAutoAdvance(false);
		}
	}, [
		id,
		isFocusPage,
		authorForBrief,
		refetch,
		refetchOrg,
		creditsRemaining,
		runResearchWriteArticleOnly,
		siteForAuthor?.originalInsight
	]);

	const handleRewriteSection = useCallback(
		async (sectionIdx: number, section: Record<string, unknown>) => {
			if (!id) return;
			setRewritingSectionIdx(sectionIdx);
			try {
				const {
					data: { session }
				} = await supabase.auth.getSession();
				const token = session?.access_token;
				if (!token) {
					toast.error('Please sign in');
					return;
				}
				const res = await api.post(`/api/pages/${id}/rewrite-section`, {
					sectionIndex: sectionIdx,
					heading: section.heading,
					guidance: section.guidance,
					entities: section.entities ?? section.entitiesCovered,
					keyword: page?.keyword
				});
				const data = await res.json().catch(() => ({}));
				if (!res.ok) {
					if (res.status === 402)
						toast.error(`Need ${data.required} credits, have ${data.available}`);
					else toast.error(data.error || 'Failed to rewrite section');
					return;
				}
				toast.success('Section rewritten');
				await refetch();
				await refetchOrg();
			} catch {
				toast.error('Failed to rewrite section');
			} finally {
				setRewritingSectionIdx(null);
			}
		},
		[id, page?.keyword, refetch, refetchOrg]
	);

	const handleSaveBriefSection = useCallback(
		async (sectionIndex: number, guidance: string) => {
			if (!id || !page?.briefData) return;
			const sections =
				(page.briefData?.sections as Array<{ guidance?: string; content?: string }>) ?? [];
			const section = sections[sectionIndex];
			const original = section?.guidance ?? section?.content ?? '';
			if (guidance.trim() === original.trim()) return;
			setSavingBriefSectionIdx(sectionIndex);
			try {
				const {
					data: { session }
				} = await supabase.auth.getSession();
				const token = session?.access_token;
				if (!token) {
					toast.error('Please sign in');
					return;
				}
				const res = await api.patch(`/api/pages/${id}/brief-section`, { sectionIndex, guidance });
				const data = await res.json().catch(() => ({}));
				if (!res.ok) {
					throw new Error(data.error || 'Failed to save');
				}
				setBriefSectionEdits((prev) => {
					const next = { ...prev };
					delete next[sectionIndex];
					return next;
				});
				await refetch();
				toast.success('Section saved');
			} catch {
				toast.error('Failed to save section');
			} finally {
				setSavingBriefSectionIdx(null);
			}
		},
		[id, page?.briefData, refetch]
	);

	const handleGenerateFAQ = useCallback(async () => {
		if (!id) return;
		setFaqGenerating(true);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				toast.error('Please sign in');
				return;
			}
			const res = await api.post(`/api/pages/${id}/generate-faq`);
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				if (res.status === 402)
					toast.error(`Need ${data.required} credits, have ${data.available}`);
				else toast.error(data.error || 'Failed to generate FAQ');
				return;
			}
			setFaqData(data.data);
			setFaqOpen(true);
			await refetchOrg();
		} catch {
			toast.error('Failed to generate FAQ');
		} finally {
			setFaqGenerating(false);
		}
	}, [id, refetchOrg]);

	/** Sets DB status to published — cluster map / analytics; not the same as pushing to Shopify. */
	const handleMarkPublished = useCallback(async () => {
		if (!id || !page) return;
		if ((page.wordCount ?? 0) < 1) {
			toast.error('Add article content before marking as published');
			return;
		}
		setMarkPublishedLoading(true);
		try {
			const { error: updErr } = await supabase
				.from('pages')
				.update({ status: 'published', updated_at: new Date().toISOString() })
				.eq('id', id);
			if (updErr) {
				toast.error(updErr.message);
				return;
			}
			toast.success('Marked as published — your cluster map will show this as live.');
			await refetch();
		} finally {
			setMarkPublishedLoading(false);
		}
	}, [id, page, refetch]);

	const lowlight = useMemo(() => createLowlight(all), []);
	const sharklyExtensions = useMemo(() => createSharklyArticleExtensions(lowlight), [lowlight]);

	const initialContent = useMemo(() => {
		if (!page?.content) return null;
		try {
			const parsed = typeof page.content === 'string' ? JSON.parse(page.content) : page.content;
			return parsed?.content ? parsed : null;
		} catch {
			return null;
		}
	}, [page?.content]);

	const editor = useEditor({
		extensions: sharklyExtensions,
		content: (page?.wordCount ?? 0) > 0 && initialContent ? initialContent : '',
		editorProps: buildSharklyArticleEditorProps(cleanPastedHTML),
		onTransaction: () => {
			setContentVersion((v) => v + 1);
			forceUpdate((n) => n + 1);
		}
	});

	useEffect(() => {
		if (editor && (page?.wordCount ?? 0) > 0 && initialContent) {
			editor.commands.setContent(initialContent, { emitUpdate: false });
		}
	}, [editor, page?.wordCount, initialContent]);

	// Live UPSA score: debounced 500ms, only in article mode
	useEffect(() => {
		if (!editor || !page || activeTab !== 'article') {
			setLiveSeoBreakdown(null);
			return;
		}
		const timer = setTimeout(() => {
			const json = editor.getJSON();
			const breakdown = computeSeoScore({
				content: json as { type: string; content?: unknown[] },
				keyword: page.keyword || page.title,
				targetWordCount: page.targetWordCount || 1000,
				baseUrl: siteUrlForSeo,
				metaTitle: page.metaTitle,
				metaDescription: page.metaDescription,
				urlSlug:
					page.slug ??
					(page.keyword || page.title
						? (page.keyword || page.title)
								.toLowerCase()
								.replace(/[^a-z0-9\s-]/g, '')
								.trim()
								.replace(/\s+/g, '-')
								.replace(/-+/g, '-')
						: null),
				searchIntent: (
					page.briefData as {
						dominant_intent?: 'informational' | 'commercial' | 'transactional';
					} | null
				)?.dominant_intent,
				schemaGenerated: (page.briefData as { schema_generated?: boolean } | null)
					?.schema_generated,
				entities: (
					page.briefData as {
						entities?: { term: string; competitor_count?: number; must_cover?: boolean }[];
					} | null
				)?.entities,
				lsiTerms: (
					page.briefData as { lsi_terms?: { term: string; competitor_count?: number }[] } | null
				)?.lsi_terms,
				paaQuestions: (page.briefData as { paa_questions?: { question: string }[] } | null)
					?.paa_questions
			});
			setLiveSeoBreakdown(breakdown);
		}, 500);
		return () => clearTimeout(timer);
	}, [editor, page, activeTab, contentVersion, siteUrlForSeo]);

	const displaySeoScore = liveSeoBreakdown?.total ?? page?.seoScore ?? 0;
	const internalLinksDetected = liveSeoBreakdown?.module5.internalLinksCount ?? 0;

	const lastSeoTotalRef = useRef<number | null>(null);
	useEffect(() => {
		if (liveSeoBreakdown != null) {
			lastSeoTotalRef.current = Math.round(liveSeoBreakdown.total);
		}
	}, [liveSeoBreakdown]);

	// Auto-save: 2s debounce after every editor change, only when content exists
	// CRO evaluation is done in CRO Studio
	useEffect(() => {
		if (!editor || !id || contentVersion === 0) return;
		setSaveStatus('idle');
		const timer = setTimeout(async () => {
			if (!editor) return;
			setSaveStatus('saving');
			try {
				const json = editor.getJSON();
				const text = editor.getText();
				const wc = text.split(/\s+/).filter(Boolean).length;

				await supabase
					.from('pages')
					.update({
						content: JSON.stringify(json),
						word_count: wc,
						seo_score: lastSeoTotalRef.current ?? page?.seoScore ?? 0,
						updated_at: new Date().toISOString()
					})
					.eq('id', id);
				setSaveStatus('saved');
			} catch {
				setSaveStatus('idle');
			}
		}, 2000);
		return () => clearTimeout(timer);
	}, [editor, id, contentVersion, page?.seoScore]);

	const isArticleEditorVisible =
		activeTab === 'article' && ((page?.wordCount ?? 0) > 0 || showEditorFromScratch);
	const hasEditorContent = editor && editor.getText().trim().length > 0;
	const showRegenerate = isArticleEditorVisible && hasEditorContent;

	const handleModalGenerateScript = useCallback(
		async (opts: { maxDurationSeconds: number; quality: 'low' | 'medium' | 'high' }) => {
			if (!editor || !page?.id) {
				throw new Error('Missing article');
			}
			if (!editor.getText().trim()) {
				throw new Error('Add article content first.');
			}
			if (creditsRemaining < CREDIT_COSTS.VIDEO_SCRIPT_GENERATION) {
				toast.error(
					`You need at least ${CREDIT_COSTS.VIDEO_SCRIPT_GENERATION} credits to generate a script.`
				);
				throw new Error('Insufficient credits');
			}
			setScriptGenWidgetSteps(initialScriptGenTaskSteps());
			setScriptGenWidgetStatus('running');
			setScriptGenWidgetError(undefined);
			setScriptGenWidgetErrorDetail(undefined);
			setScriptGenWidgetOpen(true);
			setScriptGenSubmitting(true);
			try {
				const script = await generateVideoScript(
					JSON.stringify(editor.getJSON()),
					'tiptap_json',
					opts,
					page.clusterId ?? undefined,
					page.id
				);
				await refetchOrg();
				setScriptGenWidgetOpen(false);
				return script;
			} catch (e) {
				const err = e as Error;
				setScriptGenWidgetStatus('error');
				setScriptGenWidgetError(err.message || 'Script generation failed');
				setScriptGenWidgetErrorDetail(
					err.stack && import.meta.env.DEV ? err.stack : undefined
				);
				throw e;
			} finally {
				setScriptGenSubmitting(false);
			}
		},
		[editor, page?.id, page?.clusterId, creditsRemaining, refetchOrg]
	);

	const handleModalRenderVideo = useCallback(
		async (scriptJsonText: string, opts: VideoJobOptions) => {
			if (!page?.id) return;
			if (creditsRemaining < CREDIT_COSTS.VIDEO_RENDER) {
				toast.error(`You need at least ${CREDIT_COSTS.VIDEO_RENDER} credits to render the video.`);
				return;
			}
			setGenerateVideoOpen(false);
			setVideoGenWidgetSteps(initialVideoGenTaskSteps());
			setVideoGenWidgetStatus('running');
			setVideoGenWidgetError(undefined);
			setVideoGenWidgetErrorDetail(undefined);
			setVideoGenDoneUrl(null);
			setVideoGenWidgetOpen(true);
			setVideoJobSubmitting(true);
			try {
				const draftOpts = page.videoRenderOptionsDraft as VideoDraftRenderOptions | null | undefined;
				const draftVoice =
					typeof draftOpts?.cartesia_voice_id === 'string' && draftOpts.cartesia_voice_id.trim()
						? draftOpts.cartesia_voice_id.trim()
						: null;
				const voiceForJob = draftVoice ?? videoSiteVoiceId ?? undefined;
				const { job_id } = await createVideoJob(
					scriptJsonText,
					'script_json',
					opts,
					page.clusterId ?? undefined,
					page.id,
					voiceForJob || undefined
				);
				await refetchOrg();
				const url = await waitForVideo(job_id, (job) => {
					setVideoGenWidgetSteps(
						videoJobToTaskSteps(job.status, job.current_step, job.progress)
					);
					if (job.status === 'failed' && job.error) {
						setVideoGenWidgetErrorDetail(job.error);
					}
				});
				setVideoGenDoneUrl(url);
				setVideoGenWidgetStatus('done');
				setVideoGenWidgetSteps(videoJobToTaskSteps('complete', null, 100));
				const finishedAt = new Date().toISOString();
				if (page.videoDraftId) {
					const { error: vidErr } = await supabase
						.from('videos')
						.update({
							output_url: url,
							status: 'complete',
							updated_at: finishedAt
						})
						.eq('id', page.videoDraftId);
					if (vidErr) {
						console.error('[Workspace] could not persist video URL', vidErr);
					}
				} else {
					const { error: insErr } = await supabase.from('videos').insert({
						page_id: page.id,
						site_id: page.siteId,
						status: 'complete',
						output_url: url,
						title: page.title,
						updated_at: finishedAt
					});
					if (insErr) {
						console.error('[Workspace] could not insert completed video row', insErr);
					}
				}
				toast.success('Video ready — opening in a new tab.');
				window.open(url, '_blank', 'noopener,noreferrer');
				void refetch();
			} catch (e) {
				const err = e as Error & { code?: string };
				setVideoGenWidgetStatus('error');
				if (err.code === 'insufficient_credits') {
					setVideoGenWidgetError('Insufficient credits');
				} else {
					setVideoGenWidgetError(err.message || 'Video generation failed');
					Sentry.captureException(err instanceof Error ? err : new Error(String(e)), {
						tags: { feature: 'video-generation' },
						contexts: {
							video_generation: {
								pageId: page.id,
								clusterId: page.clusterId ?? null
							}
						}
					});
				}
				toast.error(err.message || 'Video generation failed');
			} finally {
				setVideoJobSubmitting(false);
			}
		},
		[
			page?.id,
			page?.clusterId,
			page?.siteId,
			page?.title,
			page?.videoDraftId,
			page?.videoRenderOptionsDraft,
			videoSiteVoiceId,
			creditsRemaining,
			refetchOrg,
			refetch
		]
	);

	const persistVideoDraft = useCallback(
		async (partial: {
			script?: VideoScript;
			branding?: VideoBranding;
			cartesiaVoiceId?: string;
		}) => {
			if (!page?.id || !page.siteId) return;
			const prevOpts: VideoDraftRenderOptions =
				page.videoRenderOptionsDraft && typeof page.videoRenderOptionsDraft === 'object'
					? (page.videoRenderOptionsDraft as VideoDraftRenderOptions)
					: {};
			const render_options: VideoDraftRenderOptions = {
				...prevOpts,
				...(partial.branding ? { branding: partial.branding } : {})
			};
			if (partial.cartesiaVoiceId !== undefined) {
				const t = partial.cartesiaVoiceId.trim();
				render_options.cartesia_voice_id = t.length > 0 ? t : null;
			}
			const scriptTitle =
				partial.script &&
				typeof partial.script.title === 'string' &&
				partial.script.title.trim()
					? partial.script.title.trim()
					: page.title;
			const row: Record<string, unknown> = {
				render_options,
				updated_at: new Date().toISOString()
			};
			if (partial.script) {
				row.script_json = partial.script as unknown as Record<string, unknown>;
				row.title = scriptTitle;
			}
			if (page.videoDraftId) {
				const { error: updErr } = await supabase.from('videos').update(row).eq('id', page.videoDraftId);
				if (updErr) {
					console.error(updErr);
					toast.error('Could not save video draft');
					throw updErr;
				}
			} else {
				if (!partial.script) {
					return;
				}
				const { error: insErr } = await supabase.from('videos').insert({
					page_id: page.id,
					site_id: page.siteId,
					status: 'draft',
					script_json: partial.script as unknown as Record<string, unknown>,
					title: scriptTitle,
					render_options,
					updated_at: new Date().toISOString()
				});
				if (insErr) {
					console.error(insErr);
					toast.error('Could not save video draft');
					throw insErr;
				}
			}
			await refetch({ silent: true });
		},
		[page?.id, page?.siteId, page?.videoDraftId, page?.title, page?.videoRenderOptionsDraft, refetch]
	);

	/** Article workspace never persists manual Step 1 source — strip extra fields the shared modal may send. */
	const persistVideoDraftFromModal = useCallback(
		async (partial: VideoDraftPersistPartial) => {
			await persistVideoDraft({
				script: partial.script,
				branding: partial.branding,
				cartesiaVoiceId: partial.cartesiaVoiceId
			});
		},
		[persistVideoDraft]
	);

	const persistSiteVideoBranding = useCallback(
		async (branding: VideoBranding) => {
			const sid = cluster?.siteId;
			if (!sid) return;
			const { error } = await supabase
				.from('sites')
				.update({ video_branding: branding, updated_at: new Date().toISOString() })
				.eq('id', sid);
			if (error) {
				console.error(error);
				toast.error('Could not save video branding to site');
				throw error;
			}
			await refetchSites({ silent: true });
		},
		[cluster?.siteId, refetchSites]
	);

	// Top-level brief data — used by Entities tab three-section panel
	type BriefEntityData = { term: string; competitor_count?: number; must_cover?: boolean };
	type BriefLsiData = { term: string; competitor_count?: number };
	type BriefPaaData = { question: string; answered_in_content?: boolean };

	const briefEntities = useMemo(
		() => (page?.briefData as { entities?: BriefEntityData[] } | null)?.entities ?? [],
		[page?.briefData]
	);
	const briefLsiTerms = useMemo(
		() => (page?.briefData as { lsi_terms?: BriefLsiData[] } | null)?.lsi_terms ?? [],
		[page?.briefData]
	);
	const briefPaaQuestions = useMemo(
		() => (page?.briefData as { paa_questions?: BriefPaaData[] } | null)?.paa_questions ?? [],
		[page?.briefData]
	);

	// Without entity/LSI/PAA from a brief we cannot score accurately for focus pages.
	// For article pages, the score is still meaningful (keyword, word count, headings, meta, links)
	// even without brief data — so we always show it when content exists.
	const hasSemanticDataFromBrief =
		briefEntities.length > 0 || briefLsiTerms.length > 0 || briefPaaQuestions.length > 0;
	const canShowAccurateScore = hasSemanticDataFromBrief || (!isFocusPage && hasContent);

	// Determine which LSI / entity terms are "covered" by checking editor content
	const editorPlainText = useMemo(
		() => editor?.getText()?.toLowerCase() ?? '',
		[editor, contentVersion]
	); // eslint-disable-line react-hooks/exhaustive-deps

	const coveredLsi = useMemo(
		() =>
			briefLsiTerms.filter((t) => {
				if (!t.term) return false;
				return editorPlainText.includes(t.term.toLowerCase());
			}),
		[briefLsiTerms, editorPlainText]
	);
	const missingLsi = useMemo(
		() =>
			briefLsiTerms.filter((t) => {
				if (!t.term) return false;
				return !editorPlainText.includes(t.term.toLowerCase());
			}),
		[briefLsiTerms, editorPlainText]
	);
	const coveredEntities = useMemo(
		() =>
			briefEntities.filter((e) => {
				if (!e.term) return false;
				return editorPlainText.includes(e.term.toLowerCase());
			}),
		[briefEntities, editorPlainText]
	);
	const missingEntities = useMemo(
		() =>
			briefEntities.filter((e) => {
				if (!e.term) return false;
				return !editorPlainText.includes(e.term.toLowerCase());
			}),
		[briefEntities, editorPlainText]
	);

	// Competitors from brief_data.competitors_raw
	const briefCompetitors = useMemo(
		() =>
			(page?.briefData?.competitors as Array<{
				url?: string;
				title?: string;
				word_count?: number;
				h2s?: string[];
			}>) ??
			(
				page?.briefData as {
					competitors_raw?: Array<{
						url?: string;
						title?: string;
						word_count?: number;
						h2s?: string[];
					}>;
				} | null
			)?.competitors_raw ??
			[],
		[page?.briefData]
	);

	// Internal link instructions (Reasonable Surfer US8117209B1) — baked into brief
	const briefInternalLinks = useMemo(
		() =>
			(
				page?.briefData as {
					internal_link_instructions?: Array<{
						target: string;
						anchor_text: string;
						placement: string;
						priority: string;
						note?: string;
					}>;
				} | null
			)?.internal_link_instructions ?? [],
		[page?.briefData]
	);

	// Article word count (live from editor)
	const liveWordCount = useMemo(
		() => (editor ? editor.storage.characterCount.words() : (page?.wordCount ?? 0)),
		[editor, page?.wordCount, contentVersion] // eslint-disable-line react-hooks/exhaustive-deps
	);

	const renderMainGenerateButton = useCallback(() => {
		if (isFocusPage) {
			if (!hasBrief) {
				// First time — one button, one charge, both steps
				return (
					<Button
						size="sm"
						className="bg-brand-500 hover:bg-brand-600 text-white"
						disabled={generating || creditsRemaining < CREDIT_COSTS.FOCUS_PAGE_FULL}
						onClick={handleResearchAndWrite}
					>
						<CreditBadge
							cost={CREDIT_COSTS.FOCUS_PAGE_FULL}
							action="Research & Write"
							sufficient={creditsRemaining >= CREDIT_COSTS.FOCUS_PAGE_FULL}
						/>
						<Sparkles className="ml-2 size-4" />
						<span className="ml-2">{generating ? 'Working...' : 'Research & Write'}</span>
					</Button>
				);
			} else {
				// Brief exists — show separate regen buttons
				return (
					<div className="flex items-center gap-2">
						{/* Redo research & plan — 25 credits */}
						<Button
							size="sm"
							variant="outline"
							className="border-gray-200 dark:border-gray-700"
							disabled={generating || creditsRemaining < CREDIT_COSTS.FOCUS_PAGE_BRIEF_REGEN}
							onClick={() => setConfirmRegenOpen(true)}
						>
							<CreditBadge
								cost={CREDIT_COSTS.FOCUS_PAGE_BRIEF_REGEN}
								action="Redo Research"
								sufficient={creditsRemaining >= CREDIT_COSTS.FOCUS_PAGE_BRIEF_REGEN}
							/>
							<span className="ml-1.5 text-sm">
								{generating ? 'Working...' : 'Redo Research & Plan'}
							</span>
						</Button>
						{/* Rewrite article — 15 credits (or free if first time) */}
						<Button
							size="sm"
							className="bg-brand-500 hover:bg-brand-600 text-white"
							disabled={
								generating ||
								(!firstArticleIsFree && creditsRemaining < CREDIT_COSTS.ARTICLE_GENERATION)
							}
							onClick={() =>
								hasContent ? setConfirmArticleRegenOpen(true) : handleGenerateArticle()
							}
						>
							{firstArticleIsFree ? (
								<span className="bg-success-500 mr-1.5 rounded px-1.5 py-0.5 text-[11px] font-bold text-white">
									FREE
								</span>
							) : (
								<CreditBadge
									cost={CREDIT_COSTS.ARTICLE_GENERATION}
									action="Rewrite Article"
									sufficient={creditsRemaining >= CREDIT_COSTS.ARTICLE_GENERATION}
								/>
							)}
							<Sparkles className="ml-2 size-4" />
							<span className="ml-1.5 text-sm">
								{generating ? 'Working...' : hasContent ? 'Rewrite Article' : 'Write Article'}
							</span>
						</Button>
					</div>
				);
			}
		} else {
			// Supporting article — single generate button
			return (
				<Button
					size="sm"
					className="bg-brand-500 hover:bg-brand-600 text-white"
					disabled={generating || creditsRemaining < CREDIT_COSTS.ARTICLE_GENERATION}
					onClick={() => (hasContent ? setConfirmArticleRegenOpen(true) : handleGenerateArticle())}
				>
					<CreditBadge
						cost={CREDIT_COSTS.ARTICLE_GENERATION}
						action={hasContent ? 'Regenerate' : 'Article'}
						sufficient={creditsRemaining >= CREDIT_COSTS.ARTICLE_GENERATION}
					/>
					<Sparkles className="ml-2 size-4" />
					<span className="ml-2">
						{generating ? 'Generating...' : hasContent ? 'Regenerate' : 'Generate Article'}
					</span>
				</Button>
			);
		}
	}, [
		isFocusPage,
		hasBrief,
		generating,
		creditsRemaining,
		handleResearchAndWrite,
		handleGenerateArticle,
		hasContent,
		firstArticleIsFree
	]);

	if (loading) {
		return (
			<div className="flex h-[calc(100vh-80px)] items-center justify-center">
				<div className="text-gray-500 dark:text-gray-400">Loading...</div>
			</div>
		);
	}
	if (error || !page) {
		return (
			<div className="flex flex-col items-center justify-center gap-4">
				<div className="text-gray-500 dark:text-gray-400">{error || 'Page not found'}</div>
				<Button variant="outline" onClick={() => navigate(-1)}>
					Go back
				</Button>
			</div>
		);
	}

	return (
		<>
			<PageMeta title={page.title} description="Content workspace" />
			<TaskProgressWidget
				open={taskWidgetOpen}
				title={taskWidgetTitle}
				status={taskWidgetStatus}
				steps={taskWidgetSteps}
				errorMessage={taskWidgetError}
				errorDetail={taskWidgetErrorDetail}
				disableAutoAdvance={taskWidgetDisableAutoAdvance}
				onClose={() => {
					setTaskWidgetOpen(false);
					setTaskWidgetError(undefined);
					setTaskWidgetErrorDetail(undefined);
				}}
			/>

			{FEATURE_VIDEOS_UI && (
				<>
					<TaskProgressWidget
						open={videoGenWidgetOpen}
						title="Generating video"
						status={videoGenWidgetStatus}
						steps={videoGenWidgetSteps}
						errorMessage={videoGenWidgetError}
						errorDetail={videoGenWidgetErrorDetail}
						disableAutoAdvance
						doneMessage="Your video is ready. We open it in a new tab — if nothing appeared, your browser may have blocked the pop-up. Use Open video below."
						doneLinkHref={videoGenDoneUrl ?? undefined}
						doneLinkLabel="Open video"
						onClose={() => {
							setVideoGenWidgetOpen(false);
							setVideoGenWidgetError(undefined);
							setVideoGenWidgetErrorDetail(undefined);
							setVideoGenDoneUrl(null);
						}}
					/>

					<TaskProgressWidget
						open={scriptGenWidgetOpen}
						title="Generating video script"
						status={scriptGenWidgetStatus}
						steps={scriptGenWidgetSteps}
						errorMessage={scriptGenWidgetError}
						errorDetail={scriptGenWidgetErrorDetail}
						stepInterval={14000}
						doneMessage="Your script is ready in the video editor. You can edit scenes, then continue to branding and render."
						className={
							videoGenWidgetOpen || taskWidgetOpen ? 'bottom-88' : undefined
						}
						onClose={() => {
							setScriptGenWidgetOpen(false);
							setScriptGenWidgetError(undefined);
							setScriptGenWidgetErrorDetail(undefined);
						}}
					/>
				</>
			)}

			<Dialog
				open={igsModalOpen}
				onOpenChange={(open) => {
					setIgsModalOpen(open);
					if (!open) {
						setPendingAfterIgs(null);
						setIgsModalError(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Original insight required</DialogTitle>
						<DialogDescription className="text-left text-sm leading-relaxed">
							To protect your site&apos;s quality score, add at least one element competitors
							don&apos;t have — unique data, first-hand experience, or a perspective from your
							business. This is saved for your{' '}
							<strong className="text-gray-800 dark:text-gray-200">site</strong> and reused for
							future article generation. You can edit it anytime under{' '}
							{cluster?.siteId ? (
								<Link
									to={`/sites/${cluster.siteId}`}
									className="text-brand-600 dark:text-brand-400 font-medium hover:underline"
								>
									Site settings
								</Link>
							) : (
								<span className="font-medium">Site settings</span>
							)}
							, Content tab.
						</DialogDescription>
					</DialogHeader>
					<TextArea
						rows={5}
						value={igsModalDraft}
						onChange={(e) => {
							setIgsModalDraft(e.target.value);
							if (igsModalError) setIgsModalError(null);
						}}
						placeholder="e.g. Internal benchmark, a process you tested, stats from your operations, or a takeaway from serving this market."
						className="min-h-[120px] text-sm"
					/>
					{igsModalError && (
						<p className="text-xs font-medium text-amber-700 dark:text-amber-300">
							{igsModalError}
						</p>
					)}
					<DialogFooter className="gap-2 sm:gap-0">
						<Button variant="outline" onClick={() => setIgsModalOpen(false)} disabled={savingIgs}>
							Cancel
						</Button>
						<Button
							className="bg-brand-500 hover:bg-brand-600 text-white"
							onClick={() => void handleIgsModalSubmit()}
							disabled={savingIgs}
						>
							{savingIgs ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
							Save &amp; generate
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<div className="flex h-[calc(100vh-80px)] flex-col gap-6">
				{/* ------------------------------------------------------------------ */}
				{/* Page Header */}
				{/* ------------------------------------------------------------------ */}
				<div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
					{/* Row 1: Breadcrumb + Title + Warnings */}
					<div className="flex min-w-0 flex-col gap-1">
						<Link
							to={`/clusters/${page.clusterId}`}
							className="text-brand-600 dark:text-brand-400 text-xs hover:underline"
						>
							← {cluster?.title ?? 'Cluster'}
						</Link>
						<div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
							<h1 className="font-montserrat min-w-0 truncate text-xl font-bold text-gray-900 dark:text-white">
								{page.title}
							</h1>
						</div>
					</div>

					{/* Row 2: Score | Tools | Page Type | Generate */}
					<div className="flex items-center justify-between gap-3">
						<div className="flex flex-wrap items-center gap-3">
							{/* Score or Score unavailable — no duplicate Generate when brief tab */}
							{activeTab === 'brief' && isFocusPage ? (
								// Brief tab: show brief quality score instead of article UPSA score
								hasBrief ? (
									<BriefQualityBadge page={page} briefSections={briefSections} />
								) : null
							) : !canShowAccurateScore ? (
								<div className="min-w-[180px] shrink-0">
									<ScoreUnavailableNotice
										variant="compact"
										canGenerateBrief={isFocusPage}
										hasCreditsForBrief={hasCreditsForBrief}
										briefCost={briefCost}
										onGenerateBrief={isFocusPage ? handleGenerateBrief : undefined}
										generating={generating}
										hideGenerateButton={activeTab === 'brief' && isFocusPage}
									/>
								</div>
							) : (
								<div className="shrink-0 text-right">
									<span
										className={`font-montserrat text-2xl font-extrabold ${scoreColor(displaySeoScore)}`}
									>
										{displaySeoScore}
									</span>
									<span className="ml-1 text-sm text-gray-500 dark:text-gray-400">/115</span>
								</div>
							)}
							<div className="h-6 w-px shrink-0 bg-gray-200 dark:bg-gray-600" />
							{/* Tools: Meta, Diagnose, Publish — grouped in dropdown to reduce clutter */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										className="border-gray-200 dark:border-gray-700"
									>
										<BarChart3 className="mr-1 size-3.5" />
										Tools
										<ChevronDown className="ml-1 size-3" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									<DropdownMenuItem
										onClick={() => setMetaSidebarOpen(true)}
										disabled={!cluster?.siteId || !page?.keyword}
									>
										<Tag className="mr-2 size-3.5" />
										{page?.metaTitle ? 'Meta ✓' : 'Meta'}
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => setDiagnoseOpen(true)}>
										<Stethoscope className="mr-2 size-3.5" />
										Diagnose
									</DropdownMenuItem>
									{/* <DropdownMenuItem onClick={() => setShopifyPublishOpen(true)}>
										<ShoppingBag className="mr-2 size-3.5" />
										Publish to Shopify
									</DropdownMenuItem> */}
								</DropdownMenuContent>
							</DropdownMenu>
							<div className="h-6 w-px shrink-0 bg-gray-200 dark:bg-gray-600" />

							{/* Page type selector */}
							<div className="relative flex shrink-0 items-center gap-1">
								<Tooltip
									content={
										(localPageType || 'Blog Post') &&
										PAGE_TYPE_CONFIGS[canonicalPageType(localPageType || 'Blog Post')]
											? PAGE_TYPE_CONFIGS[canonicalPageType(localPageType || 'Blog Post')]
													.description
											: 'Select the type of page you are building — this changes the on-page SEO rules, heading format, schema type, and generation strategy.'
									}
									tooltipPosition="bottom"
								>
									<div className="relative">
										<select
											value={localPageType || 'Blog Post'}
											onChange={(e) => handlePageTypeChange(e.target.value)}
											disabled={pageTypeSaving}
											className={`focus:ring-brand-500 cursor-pointer appearance-none rounded-md border py-1.5 pr-6 pl-7 text-xs font-medium focus:ring-2 focus:outline-none dark:bg-gray-900 dark:text-gray-200 ${
												localPageType || 'Blog Post'
													? pageTypeColor(localPageType || 'Blog Post')
													: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700'
											}`}
										>
											{workspacePageTypeOptions.map((pt) => (
												<option key={pt} value={pt}>
													{pt}
												</option>
											))}
										</select>
										<FileText className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-gray-400" />
										<ChevronDown className="pointer-events-none absolute top-1/2 right-1.5 size-3 -translate-y-1/2 text-gray-400" />
										{pageTypeSaving && (
											<Loader2 className="text-brand-500 pointer-events-none absolute top-1/2 right-1.5 size-3 -translate-y-1/2 animate-spin" />
										)}
									</div>
								</Tooltip>
								<LawTooltip lawId="intent_before_keywords" />
							</div>

							{siteLanguage &&
								(siteLanguage.language !== 'English' ||
									siteLanguage.region !== 'United States') && (
									<Tooltip
										content={`Generating in ${siteLanguage.language} for ${siteLanguage.region}. Change in Site Settings.`}
										tooltipPosition="bottom"
									>
										<span className="border-blue-light-200 bg-blue-light-50 text-blue-light-700 dark:border-blue-light-700/40 dark:bg-blue-light-900/20 dark:text-blue-light-400 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium">
											{siteLanguage.language} · {siteLanguage.region}
										</span>
									</Tooltip>
								)}
						</div>
						<div className="flex flex-wrap items-center gap-3">
							{/* Auto-save status */}
							{saveStatus !== 'idle' && activeTab === 'article' && (
								<span className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
									{saveStatus === 'saving' ? (
										<>
											<Loader2 className="size-3 animate-spin" /> Saving…
										</>
									) : (
										<>
											<Check className="text-success-500 size-3" /> Saved
										</>
									)}
								</span>
							)}
							{page?.status === 'published' ? (
								<span className="border-success-200 bg-success-50 text-success-800 dark:border-success-800/60 dark:bg-success-950/40 dark:text-success-300 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold">
									<CheckCircle2 className="size-3.5 shrink-0" />
									Published
								</span>
							) : (
								hasContent && (
									<Tooltip
										content="Updates this page to published in Sharkly (cluster map, status). To push HTML to Shopify, use Tools when that integration is available."
										tooltipPosition="bottom"
									>
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="border-success-200 text-success-800 hover:bg-success-50 dark:border-success-800 dark:text-success-300 dark:hover:bg-success-950/40"
											disabled={markPublishedLoading}
											onClick={() => void handleMarkPublished()}
										>
											{markPublishedLoading ? (
												<Loader2 className="mr-1.5 size-3.5 animate-spin" />
											) : (
												<Globe className="mr-1.5 size-3.5" />
											)}
											Mark as published
										</Button>
									</Tooltip>
								)
							)}
							{renderMainGenerateButton()}
						</div>

						{/* Redo Research & Plan confirmation */}
						<AlertDialog open={confirmRegenOpen} onOpenChange={setConfirmRegenOpen}>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Redo research &amp; plan?</AlertDialogTitle>
									<AlertDialogDescription>
										This crawls competitors again and rebuilds the content brief from scratch. Your
										current brief will be overwritten.{' '}
										<strong>
											Your article is not affected, but it will need to be updated to reflect the
											new brief.
										</strong>
										<br />
										<br />
										<CreditBadge
											cost={CREDIT_COSTS.FOCUS_PAGE_BRIEF_REGEN}
											action="Redo Research & Plan"
											sufficient={creditsRemaining >= CREDIT_COSTS.FOCUS_PAGE_BRIEF_REGEN}
										/>{' '}
										will be charged.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										className="bg-brand-500 hover:bg-brand-600 text-white"
										onClick={() => {
											setConfirmRegenOpen(false);
											handleGenerateBrief();
										}}
									>
										Yes, redo research
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>

						{/* Rewrite Article confirmation */}
						<AlertDialog open={confirmArticleRegenOpen} onOpenChange={setConfirmArticleRegenOpen}>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Rewrite this article?</AlertDialogTitle>
									<AlertDialogDescription>
										This will overwrite your current article with a freshly generated version from
										the existing brief. <strong>Any manual edits will be lost.</strong>
										<br />
										<br />
										<CreditBadge
											cost={CREDIT_COSTS.ARTICLE_GENERATION}
											action="Rewrite Article"
											sufficient={creditsRemaining >= CREDIT_COSTS.ARTICLE_GENERATION}
										/>{' '}
										will be charged.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										className="bg-red-500 text-white hover:bg-red-600"
										onClick={() => {
											setConfirmArticleRegenOpen(false);
											handleGenerateArticle();
										}}
									>
										Yes, rewrite article
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</div>

				{/* ------------------------------------------------------------------ */}
				{/* AI Insight Block */}
				{/* ------------------------------------------------------------------ */}
				<div className="rounded-lg border border-gray-200 dark:border-gray-700">
					<AIInsightBlock
						variant={
							activeTab === 'article' && !canShowAccurateScore
								? 'info'
								: displaySeoScore >= 80
									? 'success'
									: displaySeoScore >= 60
										? 'analyst'
										: 'info'
						}
						label="CONTENT ASSISTANT"
						message={
							activeTab === 'brief'
								? hasBrief
									? `Your brief has ${briefSections.length} sections. Hit your target of ${(page?.targetWordCount ?? 0).toLocaleString()} words on the focus page to strengthen topical authority for "${page?.keyword || page?.title}".`
									: `Generate a content brief from Google search results: sections, preview suggestions, and entity coverage for "${page?.keyword || page?.title}".`
								: activeTab === 'article' && isFocusPage && !canShowAccurateScore
									? "We can't show an SEO score for manually written focus page content without a brief — it would be incomplete and misleading. Generate a brief first to get key concepts and question coverage from search, then write or edit your article. You can change everything after it's generated."
									: (page?.wordCount ?? 0) > 0
										? displaySeoScore >= 80
											? isFocusPage
												? internalLinksDetected >= 1
													? `SEO score looks good at ${displaySeoScore}/115. Internal links to cluster articles are detected — you’re in good shape for UX signals.`
													: `SEO score looks good at ${displaySeoScore}/115. Add 1–2 internal links to your topic cluster articles to pass the UX signals check.`
												: internalLinksDetected >= 1
													? `SEO score looks good at ${displaySeoScore}/115. Internal links are detected — you’re in good shape for UX signals.`
													: `SEO score looks good at ${displaySeoScore}/115. Add 1–2 internal links to your focus page to pass the UX signals check.`
											: displaySeoScore >= 60
												? isFocusPage
													? `You're at ${displaySeoScore}/115. Check the panel: add the keyword to H1, hit word count, or link to topic cluster articles to improve.`
													: `You're at ${displaySeoScore}/115. Check the panel: add the keyword to H1, hit word count, or add internal links to improve.`
												: isFocusPage
													? `Improve your score: add target keyword to the H1, aim for ${(page?.targetWordCount ?? 0).toLocaleString()} words, and add at least one link to a topic cluster article.`
													: `Improve your score: add target keyword to the H1, aim for ${(page?.targetWordCount ?? 0).toLocaleString()} words, and add at least one internal link.`
										: `Generate an article from your brief, or start from scratch. We'll optimize for "${page?.keyword || page?.title}".`
						}
					/>
				</div>

				{/* ------------------------------------------------------------------ */}
				{/* Page type rules panel — shown when a page type is selected */}
				{/* ------------------------------------------------------------------ */}
				{localPageType &&
					PAGE_TYPE_CONFIGS[canonicalPageType(localPageType)] &&
					(() => {
						const cfg = PAGE_TYPE_CONFIGS[canonicalPageType(localPageType)];
						return (
							<div className="flex gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs dark:border-gray-700 dark:bg-gray-800/50">
								<FileText className="mt-0.5 size-3.5 shrink-0 text-gray-400" />
								<div className="flex min-w-0 flex-1 flex-wrap gap-x-6 gap-y-2">
									<div>
										<span className="font-semibold text-gray-600 dark:text-gray-300">Schema: </span>
										<span className="text-gray-500 dark:text-gray-400">{cfg.schemaType}</span>
									</div>
									<div>
										<span className="font-semibold text-gray-600 dark:text-gray-300">
											Target length:{' '}
										</span>
										<span className="text-gray-500 dark:text-gray-400">
											{cfg.wordCount[0].toLocaleString()}–{cfg.wordCount[1].toLocaleString()} words
										</span>
									</div>
									<div>
										<span className="font-semibold text-gray-600 dark:text-gray-300">
											H2 strategy:{' '}
										</span>
										<span className="text-gray-500 dark:text-gray-400">{cfg.h2Strategy}</span>
									</div>
									<div>
										<span className="font-semibold text-gray-600 dark:text-gray-300">CTA: </span>
										<span className="text-gray-500 dark:text-gray-400">{cfg.ctaStrategy}</span>
									</div>
								</div>
							</div>
						);
					})()}

				{/* ------------------------------------------------------------------ */}
				{/* Content area */}
				{/* ------------------------------------------------------------------ */}
				<div className="min-h-screen-height-visible flex min-w-0 flex-1 gap-6 overflow-hidden pb-10">
					{/* Editor / Brief area */}
					<div className="scrollbar-branded min-h-0 w-4/5 min-w-0 flex-1 overflow-y-auto">
						{/* Focus page: tab switcher between brief and article */}
						{isFocusPage && (
							<Tabs
								value={activeTab}
								onValueChange={(v) => setActiveTab(v as 'brief' | 'article')}
								className="mb-4 shrink-0"
							>
								<TabsList className="h-9 border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800/50">
									<TabsTrigger value="brief" className="gap-1.5 px-3">
										<ScrollText className="size-3.5" />
										Content Brief
									</TabsTrigger>
									<TabsTrigger value="article" className="gap-1.5 px-3">
										<FileText className="size-3.5" />
										Article
									</TabsTrigger>
								</TabsList>
							</Tabs>
						)}

						{/* ========================================================== */}
						{/* BRIEF MODE */}
						{/* ========================================================== */}
						{activeTab === 'brief' ? (
							<>
								{/* L7: Author / EEAT — editable before generation, saves to page override */}
								<Collapsible defaultOpen={!!authorForBrief} className="mb-4">
									<CollapsibleTrigger className="group flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
										<Type className="size-3.5" />
										Author / EEAT
										<ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
									</CollapsibleTrigger>
									<CollapsibleContent className="mt-2">
										<TextArea
											placeholder="e.g. Sarah Chen, 10+ years in digital marketing. Falls back to site default if empty."
											rows={2}
											value={authorForBrief}
											onChange={(e) => setAuthorForBrief(e.target.value)}
											className="text-sm"
										/>
										<p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
											Injected into briefs and articles. Override here to save a different author
											for this page only.
										</p>
									</CollapsibleContent>
								</Collapsible>
								{!hasBrief ? (
									<div className="mt-16 flex flex-col items-center text-center">
										<Sparkles className="text-brand-500 dark:text-brand-400 size-14" />
										<h2 className="font-montserrat mt-4 text-xl font-bold text-gray-900 dark:text-white">
											Ready to generate your focus page content?
										</h2>
										<p className="mt-2 max-w-sm text-sm text-gray-600 dark:text-gray-400">
											We&apos;ll analyze Google search results, competitors, and related questions
											to create a structured brief for this focus page.
										</p>
										<Button
											className="bg-brand-500 hover:bg-brand-600 mt-6 text-white"
											disabled={generating || !hasCreditsForBrief}
											onClick={handleGenerateBrief}
										>
											<CreditBadge
												cost={briefCost}
												action="Brief"
												sufficient={hasCreditsForBrief}
											/>
											<Sparkles className="ml-2 size-4" />
											<span className="ml-2">
												{generating ? 'Generating...' : 'Research & Write'}
											</span>
										</Button>
									</div>
								) : (
									<>
										{/* Word Count Range Visualizer — Section 7.7 */}
										<div className="mx-auto mb-2">
											<WordCountVisualizer
												current={page?.wordCount ?? 0}
												target={page?.targetWordCount ?? 0}
											/>
										</div>

										{/* Brief sections */}
										<div className="mx-auto flex flex-col gap-4">
											{briefSections.map((section, i) => (
												<div
													key={i}
													className="group rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
												>
													<div className="mb-3 flex items-start justify-between">
														<div className="flex w-2/3 flex-wrap items-center gap-2">
															<span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-600 dark:bg-gray-700 dark:text-gray-400">
																{section.type ?? 'Section'}
															</span>
															<span className="text-sm font-semibold text-gray-900 dark:text-white">
																{section.heading ?? ''}
															</span>
															{/* PassageReadyIndicator — shown for H2 headings */}
															{section.heading &&
																(section.type === 'H2' || section.type === 'h2') && (
																	<PassageReadyIndicator heading={section.heading} />
																)}
															{(section.cro_note ?? (section as { croFlag?: string }).croFlag) && (
																<span className="bg-warning-50 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400 flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold">
																	<AlertTriangle className="size-3" />
																	{section.cro_note ?? (section as { croFlag?: string }).croFlag}
																</span>
															)}
														</div>
														<div className="w-1/4">
															<button
																disabled={rewritingSectionIdx === i}
																onClick={() =>
																	handleRewriteSection(i, section as Record<string, unknown>)
																}
																className="flex min-w-30 items-center justify-center gap-2 rounded-md border border-gray-200 p-2 opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-60 dark:border-gray-700"
															>
																{rewritingSectionIdx === i ? (
																	<span className="flex items-center gap-1 text-xs text-gray-400">
																		<Loader2 className="size-3 animate-spin" />
																		Rewriting…
																	</span>
																) : (
																	<>
																		<span className="text-brand-600 dark:text-brand-400 flex items-center gap-1 text-xs">
																			<Sparkles className="size-3" />
																			Rewrite section
																		</span>
																		<CreditBadge
																			cost={CREDIT_COSTS.SECTION_REWRITE}
																			action="Section"
																			sufficient={creditsRemaining >= CREDIT_COSTS.SECTION_REWRITE}
																		/>
																	</>
																)}
															</button>
														</div>
													</div>
													<div className="relative">
														<TextArea
															rows={6}
															className="min-h-[120px] resize-y rounded-lg bg-gray-100 px-4 py-3 text-sm leading-relaxed text-gray-900 dark:bg-gray-800 dark:text-white"
															value={
																briefSectionEdits[i] ??
																section.guidance ??
																(section as { content?: string }).content ??
																''
															}
															onChange={(e) =>
																setBriefSectionEdits((prev) => ({ ...prev, [i]: e.target.value }))
															}
															onBlur={async () => {
																const current =
																	briefSectionEdits[i] ??
																	section.guidance ??
																	(section as { content?: string }).content ??
																	'';
																const original =
																	section.guidance ??
																	(section as { content?: string }).content ??
																	'';
																if (current !== original) {
																	try {
																		await handleSaveBriefSection(i, current);
																		setBriefSectionEdits((prev) => {
																			const next = { ...prev };
																			delete next[i];
																			return next;
																		});
																	} catch {
																		// Error already toasts; keep edit state so user can retry
																	}
																}
															}}
															placeholder="Section guidance — edit and blur to save"
														/>
														{savingBriefSectionIdx === i && (
															<span className="absolute top-2 right-2 flex items-center gap-1 text-[11px] text-gray-500">
																<Loader2 className="size-3 animate-spin" />
																Saving…
															</span>
														)}
													</div>
													{((section.entitiesCovered as string[] | undefined)?.length ??
													section.entities?.length ??
													(section.entitiesMissing as string[] | undefined)?.length) ? (
														<div className="mt-3 flex flex-wrap gap-2">
															{(section.entitiesCovered ?? section.entities ?? []).map((e) => (
																<span
																	key={e}
																	className="bg-success-50 text-success-600 dark:bg-success-900/30 dark:text-success-400 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
																>
																	{e}
																</span>
															))}
															{(section.entitiesMissing as string[] | undefined)?.map((e) => (
																<span
																	key={e}
																	className="bg-error-50 text-error-600 dark:bg-error-900/30 dark:text-error-400 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
																>
																	{e}
																</span>
															))}
														</div>
													) : null}
												</div>
											))}

											{/* Internal link instructions (Reasonable Surfer — first 400 words) */}
											{briefInternalLinks.length > 0 && (
												<div className="border-brand-200 bg-brand-50/50 dark:border-brand-800 dark:bg-brand-950/30 rounded-xl border p-5">
													<div className="mb-2 flex items-center gap-2">
														<LinkIcon className="text-brand-600 dark:text-brand-400 size-4" />
														<span className="text-sm font-semibold text-gray-900 dark:text-white">
															Internal Links (Reasonable Surfer)
														</span>
													</div>
													<p className="mb-3 text-xs text-gray-600 dark:text-gray-400">
														Body text links in the first 400 words pass the most equity. Place these
														when writing the article. Max 3–4 links total.
													</p>
													<ul className="space-y-2">
														{briefInternalLinks.map((link, i) => (
															<li key={i} className="flex flex-col gap-0.5 text-sm">
																<span className="font-medium text-gray-900 dark:text-white">
																	{i + 1}. {link.target}
																</span>
																<span className="text-xs text-gray-600 dark:text-gray-400">
																	Anchor: &quot;{link.anchor_text}&quot; ·{' '}
																	{link.placement === 'first_400_words'
																		? 'First 400 words'
																		: 'Body text'}
																	{link.note ? ` · ${link.note}` : ''}
																</span>
															</li>
														))}
													</ul>
												</div>
											)}

											{/* FAQ generation CTA — below all sections */}
											<button
												onClick={handleGenerateFAQ}
												disabled={faqGenerating || creditsRemaining < CREDIT_COSTS.FAQ_GENERATION}
												className="hover:border-brand-500 hover:text-brand-500 dark:hover:border-brand-400 dark:hover:text-brand-400 mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white py-3 text-sm text-gray-500 transition-colors disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
											>
												{faqGenerating ? (
													<>
														<Loader2 className="size-4 animate-spin" /> Generating FAQ…
													</>
												) : (
													<>
														<Sparkles className="size-4" /> Generate FAQ section ·{' '}
														<CreditCost amount={CREDIT_COSTS.FAQ_GENERATION} />
													</>
												)}
											</button>
										</div>
									</>
								)}
							</>
						) : (
							/* ========================================================== */
							/* ARTICLE EDITOR MODE */
							/* ========================================================== */
							<>
								{(page?.wordCount ?? 0) === 0 && !showEditorFromScratch ? (
									<div className="mx-auto mt-16 flex w-full max-w-lg flex-col items-center self-center px-2 text-center">
										<Sparkles className="text-brand-500 dark:text-brand-400 size-14" />
										<h2 className="font-montserrat mt-4 text-xl font-bold text-gray-900 dark:text-white">
											Ready to generate this article?
										</h2>
										<p className="mt-2 max-w-sm text-sm text-gray-600 dark:text-gray-400">
											We&apos;ll analyze the top search results and write an SEO-optimized draft
											based on what&apos;s working for your competitors.
										</p>
										<div className="mt-4">{renderMainGenerateButton()}</div>
										<hr className="my-6 w-sm border-t border-gray-200 dark:border-gray-600" />
										<div className="text-center text-sm text-gray-500 dark:text-gray-400">
											Or you can start from scratch and write your own article.
										</div>
										<Button
											variant="flat"
											size="sm"
											className="mt-4"
											onClick={() => setShowEditorFromScratch(true)}
										>
											Start from scratch
										</Button>
									</div>
								) : (
									<>
										<ArticleEditorToolbar
											editor={editor}
											trailingSlot={
												FEATURE_VIDEOS_UI ? (
													<span className="inline-flex items-center gap-1">
														{page?.videoOutputUrl ? (
															<button
																type="button"
																onClick={() =>
																	window.open(
																		page.videoOutputUrl!,
																		'_blank',
																		'noopener,noreferrer'
																	)
																}
																className="text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/30 flex items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50/80 px-2 py-1.5 text-xs font-medium dark:border-brand-800 dark:bg-brand-950/40"
															>
																<ExternalLink className="size-3.5" />
																View video
															</button>
														) : null}
														<Tooltip
															content={
																!hasPlanAtLeast(organization, 'builder')
																	? 'Video generation requires Builder plan or higher.'
																	: creditsRemaining < CREDIT_COSTS.VIDEO_SCRIPT_GENERATION
																		? `You need at least ${CREDIT_COSTS.VIDEO_SCRIPT_GENERATION} credits to generate a script (${CREDIT_COSTS.VIDEO_GENERATION} credits total for script + render).`
																		: !hasEditorContent
																			? 'Add article content before generating a video.'
																			: page?.videoOutputUrl
																				? 'Create a new script and render another MP4. Narration voice from Site → Video.'
																				: 'Two steps: generate an editable script, then render the MP4. Narration voice from Site → Video.'
															}
															tooltipPosition="bottom"
														>
															<span className="inline-flex">
																<button
																	type="button"
																	onClick={() => setGenerateVideoOpen(true)}
																	disabled={
																		videoJobSubmitting ||
																		scriptGenSubmitting ||
																		!hasEditorContent ||
																		!hasPlanAtLeast(organization, 'builder') ||
																		creditsRemaining < CREDIT_COSTS.VIDEO_SCRIPT_GENERATION
																	}
																	className="text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/30 flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
																>
																	{videoJobSubmitting || scriptGenSubmitting ? (
																		<Loader2 className="size-3.5 animate-spin" />
																	) : (
																		<Video className="size-3.5" />
																	)}
																	{page?.videoOutputUrl ? 'New video' : 'Generate video'}
																	<span className="ml-1 inline-flex items-center gap-1 opacity-90">
																		<CreditCost amount={CREDIT_COSTS.VIDEO_GENERATION} />
																	</span>
																</button>
															</span>
														</Tooltip>
													</span>
												) : undefined
											}
										/>

										{/* L9: AI detection education — dismissable, persistent on first view */}
										{editor && !aiDetectionDismissed && (
											<div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-800 dark:bg-blue-900/30">
												<Info className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
												<div className="flex-1 text-[13px] text-blue-800 dark:text-blue-200">
													Worried about AI detection? Google doesn't use those tools — they measure
													writing patterns, not search quality. What Google actually evaluates is
													whether your content covers the topic thoroughly and adds something
													original. That's exactly what your SEO score measures.
												</div>
												<button
													type="button"
													onClick={() => {
														setAiDetectionDismissed(true);
														localStorage.setItem('sharkly_ai_detection_dismissed', '1');
													}}
													className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
													aria-label="Dismiss"
												>
													<X className="size-4" />
												</button>
											</div>
										)}

										{editor && (
											<span className="mb-4 block flex-1 text-center text-xs text-gray-500 dark:text-gray-400">
												As with any AI, Sharkly can make mistakes. Please review all content before
												publishing.
											</span>
										)}

										<div className="min-h-screen-height-visible relative flex min-w-0 flex-1 flex-col rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
											<ArticleEditorBubbleMenu editor={editor} />
											<EditorContent
												editor={editor}
												className={SHARKLY_ARTICLE_EDITOR_CONTENT_CLASS}
											/>
										</div>

										<ArticleEditorWordCount
											wordCount={liveWordCount}
											targetWordCount={
												page && page.targetWordCount > 0 ? page.targetWordCount : undefined
											}
										/>
									</>
								)}
							</>
						)}
					</div>

					{/* ---------------------------------------------------------------- */}
					{/* Intelligence panel */}
					{/* ---------------------------------------------------------------- */}
					<div className="w-1/3 max-w-75 shrink-0 rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
						<div className="flex justify-center gap-2 border-b border-gray-200 dark:border-gray-700">
							{/* CRO tab removed — CRO evaluation now in CRO Studio (cro-studio.md) */}
							{(['seo', 'competitors', 'entities'] as const).map((tab) => (
								<button
									key={tab}
									onClick={() => setActiveIntelTab(tab)}
									className={`px-3 py-3 text-[13px] font-medium capitalize ${
										activeIntelTab === tab
											? 'border-brand-500 text-brand-600 dark:text-brand-400 border-b-2'
											: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
									}`}
								>
									{/* {tab === 'seo' ? 'SEO' : tab === 'cro' ? 'CRO' : tab} */}
									{tab === 'seo' ? 'SEO' : tab}
								</button>
							))}
						</div>

						<div className="scrollbar-branded h-[calc(100%-48px)] overflow-y-auto p-4 text-gray-900 dark:text-white">
							{/* CRO — Open in CRO Studio (CRO evaluation done there) */}
							{/* {(isFocusPage || page?.type === 'article') && (
								<div className="mb-4">
									<div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
										<div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
											<Target className="size-3.5" />
											CRO Studio
										</div>
										{!canAccessCROStudio(organization) ? (
											<Button
												size="sm"
												variant="outline"
												className="w-full justify-center gap-2"
												onClick={openCROStudioUpgradeModal}
											>
												<Target className="size-4" />
												Add CRO Studio
											</Button>
										) : (
											<Button
												size="sm"
												variant="outline"
												className="w-full justify-center gap-2"
												onClick={handleOpenInCROStudio}
												disabled={openCROStudioLoading}
											>
												{openCROStudioLoading ? (
													<Loader2 className="size-4 animate-spin" />
												) : (
													<Target className="size-4" />
												)}
												{openCROStudioLoading ? 'Checking…' : 'Open in CRO Studio'}
											</Button>
										)}
									</div>
								</div>
							)} */}

							{/* ====================================================== */}
							{/* SEO TAB — UPSA 4-module breakdown */}
							{/* ====================================================== */}
							{activeIntelTab === 'seo' && (
								<>
									{/* L10: Page-level GSC attribution — impressions, clicks, CTR, position */}
									{gscConnected && (
										<div className="mb-4 rounded-lg border border-gray-200 bg-gray-50/50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
											<div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
												<BarChart3 className="size-3.5" />
												Search Console · Last 28 days
											</div>
											{pageGscLoading ? (
												<div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
													<Loader2 className="size-4 animate-spin" />
													Loading…
												</div>
											) : pageGscMetrics ? (
												<div className="grid grid-cols-4 gap-2 text-center">
													<div>
														<div className="text-lg font-bold text-gray-900 dark:text-white">
															{pageGscMetrics.impressions.toLocaleString()}
														</div>
														<div className="text-[10px] text-gray-500 dark:text-gray-400">Impr</div>
													</div>
													<div>
														<div className="text-lg font-bold text-gray-900 dark:text-white">
															{pageGscMetrics.clicks.toLocaleString()}
														</div>
														<div className="text-[10px] text-gray-500 dark:text-gray-400">
															Clicks
														</div>
													</div>
													<div>
														<div className="text-lg font-bold text-gray-900 dark:text-white">
															{pageGscMetrics.ctr.toFixed(2)}%
														</div>
														<div className="text-[10px] text-gray-500 dark:text-gray-400">CTR</div>
													</div>
													<div>
														<div className="text-lg font-bold text-gray-900 dark:text-white">
															{pageGscMetrics.position.toFixed(1)}
														</div>
														<div className="text-[10px] text-gray-500 dark:text-gray-400">Pos</div>
													</div>
												</div>
											) : (
												<p className="text-[13px] text-gray-500 dark:text-gray-400">
													No data for this page yet
												</p>
											)}
										</div>
									)}

									{/* Focus page + brief tab: show Brief Quality in right panel */}
									{isFocusPage && activeTab === 'brief' && hasBrief ? (
										<BriefQualityPanel page={page} briefSections={briefSections} />
									) : !canShowAccurateScore ? (
										<ScoreUnavailableNotice
											variant="full"
											canGenerateBrief={isFocusPage}
											hasCreditsForBrief={hasCreditsForBrief}
											briefCost={briefCost}
											onGenerateBrief={isFocusPage ? handleGenerateBrief : undefined}
											generating={generating}
										/>
									) : (
										<>
											{/* Score display */}
											<div className="mb-4 text-center">
												<span
													className={`font-montserrat text-5xl font-extrabold ${scoreColor(displaySeoScore)}`}
												>
													{displaySeoScore}
												</span>
												<span className="ml-1 text-base text-gray-500 dark:text-gray-400">
													/115
												</span>
												<div className="text-xs tracking-wide text-gray-500 uppercase dark:text-gray-400">
													{liveSeoBreakdown ? 'Live SEO Score' : 'SEO Score'}
												</div>
											</div>

											{isFocusPage ? (
												<Tooltip
													content="Target 85+. Focus pages go up against established authorities. Below 85 usually means missing IGS bonus points or incomplete entity coverage — the signals that separate page 1 from page 2."
													tooltipPosition="top"
													usePortal
												>
													<div className="mb-4 flex items-center justify-center gap-1 text-center text-gray-500 dark:text-gray-400">
														<Info className="size-3" />
														<div className="text-[10px] tracking-wide uppercase">
															Aim for a score of 85+
														</div>
													</div>
												</Tooltip>
											) : (
												<Tooltip
													content="Target 70+. Supporting articles compete on long-tail keywords — a 70 is enough to rank well and pass Google's domain quality threshold."
													tooltipPosition="top"
													usePortal
												>
													<div className="mb-4 flex items-center justify-center gap-1 text-center text-gray-500 dark:text-gray-400">
														<Info className="size-3" />
														<div className="text-[10px] tracking-wide uppercase">
															Aim for a score of 70+
														</div>
													</div>
												</Tooltip>
											)}

											{/* Skyscraper Warning */}
											{liveSeoBreakdown?.skyscraperWarning && (
												<div className="bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-700 mb-4 rounded-lg border p-3">
													<div className="text-warning-700 dark:text-warning-400 flex flex-col justify-between gap-2 text-[13px] font-semibold">
														<div className="flex items-start gap-2">
															<AlertTriangle className="mt-0.5 size-4 shrink-0" />
															<span className="flex items-center gap-1">Skyscraper Alert:</span>
														</div>
														<div className="flex items-start gap-1">
															<LawTooltip lawId="quality_before_volume" />
															<span>
																Your content covers the same ground as every competitor. Add
																original data, an expert quote, or first-hand experience to earn the
																information gain bonus.
															</span>
														</div>
													</div>
												</div>
											)}

											{liveSeoBreakdown ? (
												<div className="space-y-3">
													{/* Module 1 — Structural (25pts) */}
													<div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
														<div className="mb-2 flex items-center justify-between">
															<span className="text-[12px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
																Structural
															</span>
															<span
																className={`text-[13px] font-bold ${liveSeoBreakdown.module1.score >= 18 ? 'text-success-600 dark:text-success-400' : liveSeoBreakdown.module1.score >= 10 ? 'text-warning-600 dark:text-warning-400' : 'text-error-600 dark:text-error-400'}`}
															>
																{liveSeoBreakdown.module1.score}/25
															</span>
														</div>
														<div className="space-y-1.5 text-[12px]">
															{[
																{
																	label: 'Keyword in title',
																	pass: liveSeoBreakdown.module1.keywordInTitle,
																	pts: 7
																},
																{
																	label: 'Keyword first in title',
																	pass: liveSeoBreakdown.module1.keywordFirstInTitle,
																	pts: 2
																},
																{
																	label: 'Title ≤60 characters',
																	pass: liveSeoBreakdown.module1.titleLe60Chars,
																	pts: 2
																},
																{
																	label: 'Keyword in H1',
																	pass: liveSeoBreakdown.module1.keywordInH1,
																	pts: 7
																},
																{
																	label: 'Exactly one H1',
																	pass: liveSeoBreakdown.module1.exactlyOneH1,
																	pts: 2
																},
																{
																	label: 'Keyword in first 100 words',
																	pass: liveSeoBreakdown.module1.keywordInFirst100,
																	pts: 3
																},
																{
																	label: 'Keyword in URL',
																	pass: liveSeoBreakdown.module1.keywordInUrlSlug,
																	pts: 2
																}
															].map(({ label, pass, pts }) => (
																<div key={label} className="flex items-center justify-between">
																	<span className="text-gray-600 dark:text-gray-400">{label}</span>
																	<span
																		className={`inline-flex items-center gap-0.5 ${pass ? 'text-success-600 dark:text-success-400' : 'text-error-500 dark:text-error-400'}`}
																	>
																		{pass ? (
																			<>
																				<Check className="size-3" /> +{pts}
																			</>
																		) : (
																			<>
																				<X className="size-3" /> 0
																			</>
																		)}
																	</span>
																</div>
															))}
														</div>
													</div>

													{/* Module 2 — Semantic (25pts) */}
													<div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
														<div className="mb-2 flex items-center justify-between">
															<span className="text-[12px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
																Semantic
															</span>
															<span
																className={`text-[13px] font-bold ${liveSeoBreakdown.module2.score >= 18 ? 'text-success-600 dark:text-success-400' : liveSeoBreakdown.module2.score >= 10 ? 'text-warning-600 dark:text-warning-400' : 'text-error-600 dark:text-error-400'}`}
															>
																{liveSeoBreakdown.module2.score}/25
															</span>
														</div>
														<div className="space-y-1.5 text-[12px]">
															<div className="flex items-center justify-between">
																<span className="text-gray-600 dark:text-gray-400">
																	Related topics covered
																</span>
																<span className="text-gray-700 dark:text-gray-300">
																	{Math.round(liveSeoBreakdown.module2.lsiPct * 100)}% (+
																	{liveSeoBreakdown.module2.lsiCoverage}/15)
																</span>
															</div>
															<div className="flex items-center justify-between">
																<span className="text-gray-600 dark:text-gray-400">
																	Key concepts covered
																</span>
																<span className="text-gray-700 dark:text-gray-300">
																	{Math.round(liveSeoBreakdown.module2.entityPct * 100)}% (+
																	{liveSeoBreakdown.module2.entityCoverage}/10)
																</span>
															</div>
														</div>
													</div>

													{/* Module 3 — Content Quality (25pts) */}
													<div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
														<div className="mb-2 flex items-center justify-between">
															<span className="text-[12px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
																Content Quality
															</span>
															<span
																className={`text-[13px] font-bold ${liveSeoBreakdown.module3.score >= 18 ? 'text-success-600 dark:text-success-400' : liveSeoBreakdown.module3.score >= 10 ? 'text-warning-600 dark:text-warning-400' : 'text-error-600 dark:text-error-400'}`}
															>
																{liveSeoBreakdown.module3.score}/25
															</span>
														</div>
														<div className="space-y-1.5 text-[12px]">
															<div className="flex items-center justify-between">
																<span className="text-gray-600 dark:text-gray-400">
																	Search intent match
																</span>
																<span
																	className={`inline-flex items-center gap-0.5 ${liveSeoBreakdown.module3.intentAligned ? 'text-success-600 dark:text-success-400' : 'text-error-500 dark:text-error-400'}`}
																>
																	{liveSeoBreakdown.module3.intentAligned ? (
																		<>
																			<Check className="size-3" /> +9
																		</>
																	) : (
																		<>
																			<X className="size-3" /> 0
																		</>
																	)}
																</span>
															</div>
															<div className="flex items-center justify-between">
																<span className="text-gray-600 dark:text-gray-400">
																	Word count (
																	{liveSeoBreakdown.module3.wordCountCurrent.toLocaleString()}/
																	{page.targetWordCount.toLocaleString()})
																</span>
																<span
																	className={
																		liveSeoBreakdown.module3.wordCountScore >= 8
																			? 'text-success-600 dark:text-success-400'
																			: liveSeoBreakdown.module3.wordCountScore >= 5
																				? 'text-warning-600 dark:text-warning-400'
																				: 'text-error-500 dark:text-error-400'
																	}
																>
																	+{liveSeoBreakdown.module3.wordCountScore}
																</span>
															</div>
															<div className="flex items-center justify-between">
																<span className="text-gray-600 dark:text-gray-400">
																	Questions answered
																</span>
																<span className="text-gray-700 dark:text-gray-300">
																	+{liveSeoBreakdown.module3.paaCoverageScore}
																</span>
															</div>
															<div className="flex items-center justify-between">
																<span className="text-gray-600 dark:text-gray-400">
																	Rich elements
																</span>
																<span className="text-gray-700 dark:text-gray-300">
																	+{liveSeoBreakdown.module3.richElementsScore}
																</span>
															</div>
														</div>
													</div>

													{/* Module 4 — Passage Readiness (15pts) — S2-1 bidirectional H2 scoring */}
													<div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
														<div className="mb-2 flex items-center justify-between">
															<span className="flex items-center gap-1 text-[12px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
																Passage Readiness
																<LawTooltip lawId="structure_enables_passage" />
															</span>
															<span
																className={`text-[13px] font-bold ${liveSeoBreakdown.module4.score >= 10 ? 'text-success-600 dark:text-success-400' : liveSeoBreakdown.module4.score >= 5 ? 'text-warning-600 dark:text-warning-400' : 'text-error-600 dark:text-error-400'}`}
															>
																{liveSeoBreakdown.module4.score}/15
															</span>
														</div>
														{liveSeoBreakdown.module4.h2ContaminationPenalty && (
															<div className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-900/30 dark:text-error-300 mb-2 rounded border p-2 text-[12px]">
																{liveSeoBreakdown.module4.vagueH2Count} of your{' '}
																{liveSeoBreakdown.module4.h2Count} H2s are vague labels (&quot;Our
																Services&quot;, &quot;Why Choose Us&quot;). These weaken your
																page&apos;s passage scoring. Rewrite all H2s as specific answerable
																questions.
															</div>
														)}
														<div className="space-y-1.5 text-[12px]">
															<div className="flex items-center justify-between">
																<span className="text-gray-600 dark:text-gray-400">
																	Question H2s ({liveSeoBreakdown.module4.passageReadyH2Count}/
																	{liveSeoBreakdown.module4.h2Count})
																</span>
																<span
																	className={
																		liveSeoBreakdown.module4.h2ContaminationPenalty
																			? 'text-error-600 dark:text-error-400 font-semibold'
																			: 'text-gray-700 dark:text-gray-300'
																	}
																>
																	{liveSeoBreakdown.module4.passageReadyH2Score >= 0
																		? `+${liveSeoBreakdown.module4.passageReadyH2Score}`
																		: liveSeoBreakdown.module4.passageReadyH2Score}
																</span>
															</div>
															<div className="flex items-center justify-between">
																<span className="text-gray-600 dark:text-gray-400">
																	First sentence answers heading (
																	{liveSeoBreakdown.module4.firstSentenceAnswerCount}/
																	{liveSeoBreakdown.module4.sectionCount})
																</span>
																<span className="text-gray-700 dark:text-gray-300">
																	+{liveSeoBreakdown.module4.firstSentenceAnswersScore}
																</span>
															</div>
															<div className="flex items-center justify-between">
																<span className="text-gray-600 dark:text-gray-400">
																	FAQ section
																</span>
																<span
																	className={`inline-flex items-center gap-0.5 ${liveSeoBreakdown.module4.hasFaqSection ? 'text-success-600 dark:text-success-400' : 'text-gray-400 dark:text-gray-500'}`}
																>
																	{liveSeoBreakdown.module4.hasFaqSection ? (
																		<>
																			<Check className="size-3" /> +4
																		</>
																	) : (
																		'— 0'
																	)}
																</span>
															</div>
														</div>
													</div>

													{/* Module 5 — Technical (10pts) */}
													<div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
														<div className="mb-2 flex items-center justify-between">
															<span className="text-[12px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
																Technical
															</span>
															<span
																className={`text-[13px] font-bold ${liveSeoBreakdown.module5.score >= 7 ? 'text-success-600 dark:text-success-400' : liveSeoBreakdown.module5.score >= 4 ? 'text-warning-600 dark:text-warning-400' : 'text-error-600 dark:text-error-400'}`}
															>
																{liveSeoBreakdown.module5.score}/10
															</span>
														</div>
														<div className="space-y-1.5 text-[12px]">
															<div className="flex items-center justify-between">
																<span className="text-gray-600 dark:text-gray-400">
																	Meta description ({liveSeoBreakdown.module5.metaDescriptionLength}{' '}
																	chars)
																</span>
																<span
																	className={`inline-flex items-center gap-0.5 ${liveSeoBreakdown.module5.hasValidMetaDescription ? 'text-success-600 dark:text-success-400' : 'text-error-500 dark:text-error-400'}`}
																>
																	{liveSeoBreakdown.module5.hasValidMetaDescription ? (
																		<>
																			<Check className="size-3" /> +4
																		</>
																	) : (
																		<>
																			<X className="size-3" /> 0
																		</>
																	)}
																</span>
															</div>
															<div className="flex items-center justify-between">
																<span className="text-gray-600 dark:text-gray-400">
																	Schema markup
																</span>
																<span
																	className={`inline-flex items-center gap-0.5 ${liveSeoBreakdown.module5.hasSchema ? 'text-success-600 dark:text-success-400' : 'text-gray-400 dark:text-gray-500'}`}
																>
																	{liveSeoBreakdown.module5.hasSchema ? (
																		<>
																			<Check className="size-3" /> +3
																		</>
																	) : (
																		'— 0'
																	)}
																</span>
															</div>
															<div className="flex items-center justify-between">
																<span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
																	Internal links ({liveSeoBreakdown.module5.internalLinksCount})
																	<LawTooltip lawId="placement_determines_link_value" />
																</span>
																<span
																	className={
																		liveSeoBreakdown.module5.internalLinksScore >= 3
																			? 'text-success-600 dark:text-success-400'
																			: liveSeoBreakdown.module5.internalLinksScore >= 1
																				? 'text-warning-600 dark:text-warning-400'
																				: 'text-error-500 dark:text-error-400'
																	}
																>
																	+{liveSeoBreakdown.module5.internalLinksScore}
																</span>
															</div>
														</div>
													</div>

													{/* S2-2: Keyword Density (-5 to +10) — bidirectional */}
													{liveSeoBreakdown.keywordDensity && (
														<div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
															<div className="mb-2 flex items-center justify-between">
																<span className="text-[12px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
																	Keyword Density
																</span>
																<span
																	className={`text-[13px] font-bold ${
																		liveSeoBreakdown.keywordDensity.score >= 10
																			? 'text-success-600 dark:text-success-400'
																			: liveSeoBreakdown.keywordDensity.score >= 5
																				? 'text-warning-600 dark:text-warning-400'
																				: liveSeoBreakdown.keywordDensity.score < 0
																					? 'text-error-600 dark:text-error-400'
																					: 'text-gray-600 dark:text-gray-400'
																	}`}
																>
																	{liveSeoBreakdown.keywordDensity.score >= 0
																		? `+${liveSeoBreakdown.keywordDensity.score}`
																		: liveSeoBreakdown.keywordDensity.score}
																</span>
															</div>
															<div className="space-y-1.5 text-[12px]">
																<div className="flex items-center justify-between">
																	<span className="text-gray-600 dark:text-gray-400">
																		{liveSeoBreakdown.keywordDensity.keywordCount} in{' '}
																		{liveSeoBreakdown.keywordDensity.wordCount} words (
																		{liveSeoBreakdown.keywordDensity.densityPct.toFixed(1)}%)
																	</span>
																</div>
																<p className="text-[11px] text-gray-500 dark:text-gray-400">
																	{liveSeoBreakdown.keywordDensity.message}
																</p>
															</div>
														</div>
													)}

													{/* IGS Bonus (+15pts) */}
													<div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
														<div className="mb-2 flex items-center justify-between">
															<span className="flex items-center gap-1 text-[12px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
																Information Gain Bonus
																<LawTooltip lawId="quality_before_volume" />
															</span>
															<span
																className={`text-[13px] font-bold ${liveSeoBreakdown.igs.score >= 8 ? 'text-success-600 dark:text-success-400' : liveSeoBreakdown.igs.score >= 3 ? 'text-warning-600 dark:text-warning-400' : 'text-gray-400 dark:text-gray-500'}`}
															>
																+{liveSeoBreakdown.igs.score}/15
															</span>
														</div>
														<div className="space-y-1.5 text-[12px]">
															{[
																{
																	label: 'Original data / research',
																	pass: liveSeoBreakdown.igs.originalResearch,
																	pts: 5
																},
																{
																	label: 'Expert quotes',
																	pass: liveSeoBreakdown.igs.expertQuotes,
																	pts: 4
																},
																{
																	label: 'First-hand experience',
																	pass: liveSeoBreakdown.igs.firstHand,
																	pts: 3
																},
																{
																	label: 'Unique visualisation / table',
																	pass: liveSeoBreakdown.igs.uniqueViz,
																	pts: 2
																},
																{
																	label: 'Contrarian perspective',
																	pass: liveSeoBreakdown.igs.contrarian,
																	pts: 1
																}
															].map(({ label, pass, pts }) => (
																<div key={label} className="flex items-center justify-between">
																	<span className="text-gray-600 dark:text-gray-400">{label}</span>
																	<span
																		className={`inline-flex items-center gap-0.5 ${pass ? 'text-success-600 dark:text-success-400' : 'text-gray-400 dark:text-gray-500'}`}
																	>
																		{pass ? (
																			<>
																				<Check className="size-3" /> +{pts}
																			</>
																		) : (
																			'— 0'
																		)}
																	</span>
																</div>
															))}
														</div>
													</div>
												</div>
											) : (
												/* Placeholder when no live score yet */
												<div className="space-y-3 text-[13px] text-gray-500 dark:text-gray-400">
													<p>Start writing or generate an article to see your live score.</p>
													<div className="space-y-2">
														{[
															'Structural (0–25)',
															'Semantic (0–25)',
															'Content Quality (0–25)',
															'Passage Readiness (0–15)',
															'Technical (0–10)',
															'Information Gain Bonus (0–15)'
														].map((label) => (
															<div
																key={label}
																className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 dark:border-gray-700"
															>
																<span>{label}</span>
																<span className="text-gray-400">—</span>
															</div>
														))}
													</div>
												</div>
											)}
										</>
									)}
								</>
							)}

							{/* ====================================================== */}
							{/* COMPETITORS TAB — Phase 4: deep signal panel */}
							{/* ====================================================== */}
							{activeIntelTab === 'competitors' &&
								(() => {
									type SS = { min: number; avg: number; max: number } | null;
									type LT = {
										term: string;
										competitor_count: number;
										avg_freq: number;
										target_freq: number;
									};
									const bd = page?.briefData as Record<string, unknown> | null;
									const ss = (bd?.competitor_signal_stats ?? null) as {
										h2_count?: SS;
										h3_count?: SS;
										paragraph_count?: SS;
										internal_links?: SS;
										external_links?: SS;
										image_count?: SS;
										bold_count?: SS;
									} | null;
									const lt: LT[] = (bd?.competitor_lsi_terms as LT[] | undefined) ?? [];
									const st: string[] = (bd?.competitor_schema_types as string[] | undefined) ?? [];
									const SR = ({ label, s }: { label: string; s: SS }) =>
										!s ? null : (
											<div className="flex items-center justify-between text-[12px]">
												<span className="text-gray-600 dark:text-gray-400">{label}</span>
												<span className="text-gray-700 tabular-nums dark:text-gray-300">
													{s.min}–{s.max} <span className="text-gray-400">(avg {s.avg})</span>
												</span>
											</div>
										);
									return (
										<div className="space-y-3">
											{/* Target + H2 benchmark */}
											<div className="bg-brand-50 dark:bg-brand-900/30 rounded-lg p-3">
												<div className="text-brand-600 dark:text-brand-400 text-[13px] font-semibold">
													Your target: {(page?.targetWordCount ?? 1400).toLocaleString()} words
												</div>
												{ss?.h2_count && (
													<div className="mt-1 text-[12px] text-gray-500 dark:text-gray-400">
														Competitor H2s: avg {ss.h2_count.avg} (range {ss.h2_count.min}–
														{ss.h2_count.max})
													</div>
												)}
											</div>

											{/* Page structure benchmarks */}
											{ss && Object.values(ss).some(Boolean) && (
												<div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
													<div className="mb-2 text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
														Page Structure Benchmarks
													</div>
													<div className="space-y-1.5">
														<SR label="H2 headings" s={ss.h2_count ?? null} />
														<SR label="H3 headings" s={ss.h3_count ?? null} />
														<SR label="Paragraphs" s={ss.paragraph_count ?? null} />
														<SR label="Internal links" s={ss.internal_links ?? null} />
														<SR label="Images" s={ss.image_count ?? null} />
														<SR label="Bold tags" s={ss.bold_count ?? null} />
													</div>
												</div>
											)}

											{/* Schema types used by competitors */}
											{st.length > 0 && (
												<div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
													<div className="mb-2 text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
														Schema Used by ≥2 Competitors
													</div>
													<div className="flex flex-wrap gap-1.5">
														{st.map((t) => (
															<span
																key={t}
																className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
															>
																{t}
															</span>
														))}
													</div>
												</div>
											)}

											{/* Top LSI terms with target frequencies */}
											{lt.length > 0 && (
												<div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
													<div className="mb-2 text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
														Top Terms &amp; Targets
													</div>
													<div className="space-y-1">
														{lt.slice(0, 12).map((t) => (
															<div
																key={t.term}
																className="flex items-center justify-between text-[12px]"
															>
																<span className="text-gray-700 dark:text-gray-300">{t.term}</span>
																<div className="flex items-center gap-2">
																	<span className="text-[11px] text-gray-400">
																		{t.competitor_count} comps
																	</span>
																	<span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">
																		~{t.target_freq}×
																	</span>
																</div>
															</div>
														))}
													</div>
												</div>
											)}

											{/* Individual competitor cards */}
											{briefCompetitors.length > 0 ? (
												briefCompetitors.map((c, i) => {
													const cx = c as typeof c & {
														h3_count?: number;
														internal_link_count?: number;
														image_count?: number;
														bold_count?: number;
														schema_types?: string[];
													};
													return (
														<div
															key={cx.url ?? i}
															className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
														>
															<a
																href={cx.url}
																target="_blank"
																rel="noopener noreferrer"
																className="text-brand-600 dark:text-brand-400 block truncate text-[13px] font-semibold hover:underline"
															>
																{cx.title ?? cx.url ?? 'Competitor'}
															</a>
															<div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
																{cx.word_count != null && (
																	<span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
																		{cx.word_count.toLocaleString()} words
																	</span>
																)}
																{cx.h2s != null && (
																	<span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
																		{cx.h2s.length} H2s
																	</span>
																)}
																{(cx.h3_count ?? 0) > 0 && (
																	<span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
																		{cx.h3_count} H3s
																	</span>
																)}
																{(cx.image_count ?? 0) > 0 && (
																	<span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
																		{cx.image_count} imgs
																	</span>
																)}
																{cx.internal_link_count != null && (
																	<span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
																		{cx.internal_link_count} int. links
																	</span>
																)}
																{(cx.bold_count ?? 0) > 0 && (
																	<span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
																		{cx.bold_count} bold
																	</span>
																)}
															</div>
															{cx.schema_types && cx.schema_types.length > 0 && (
																<div className="mt-1.5 flex flex-wrap gap-1">
																	{cx.schema_types.map((t) => (
																		<span
																			key={t}
																			className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
																		>
																			{t}
																		</span>
																	))}
																</div>
															)}
															{cx.h2s != null && cx.h2s.length > 0 && (
																<div className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-600">
																	<div className="mb-1 text-[10px] font-semibold tracking-wide text-gray-400 uppercase">
																		H2s — click to copy
																	</div>
																	<ul className="space-y-0.5">
																		{cx.h2s.map((h, j) => (
																			<li
																				key={j}
																				onClick={() => {
																					navigator.clipboard.writeText(h);
																					toast.success('Heading copied');
																				}}
																				className="cursor-pointer truncate rounded px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
																				title={h}
																			>
																				• {h}
																			</li>
																		))}
																	</ul>
																</div>
															)}
														</div>
													);
												})
											) : (
												<p className="text-[13px] text-gray-500 dark:text-gray-400">
													No competitor data yet. Generate a brief to analyze search result
													competitors.
												</p>
											)}
										</div>
									);
								})()}

							{/* ====================================================== */}
							{/* ENTITIES TAB — Three-section panel (Section 7.7 + 17.7) */}
							{/* ====================================================== */}
							{activeIntelTab === 'entities' && (
								<div className="space-y-5">
									{briefLsiTerms.length === 0 &&
									briefEntities.length === 0 &&
									briefPaaQuestions.length === 0 ? (
										<p className="text-[13px] text-gray-500 dark:text-gray-400">
											{hasBrief
												? 'No entity data in this brief.'
												: 'Generate a brief to see related topics, key concepts, and questions to answer.'}
										</p>
									) : (
										<>
											{/* Section 1 — Related Topics (LSI Terms) */}
											{briefLsiTerms.length > 0 && (
												<div>
													<div className="mb-2 text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
														Related Topics Google Expects to See
													</div>
													{coveredLsi.length > 0 && (
														<>
															<div className="text-success-600 dark:text-success-400 mb-1 flex items-center gap-1 text-[11px] font-semibold">
																<Check className="size-3" /> Covered
															</div>
															<div className="mb-2 flex flex-wrap gap-1">
																{coveredLsi.map((t) => (
																	<span
																		key={t.term}
																		className="bg-success-50 text-success-600 dark:bg-success-900/30 dark:text-success-400 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
																	>
																		{t.term}
																	</span>
																))}
															</div>
														</>
													)}
													{missingLsi.length > 0 && (
														<>
															<div className="text-error-600 dark:text-error-400 mb-1 flex items-center gap-1 text-[11px] font-semibold">
																<X className="size-3" /> Missing
															</div>
															<div className="flex flex-wrap gap-1">
																{missingLsi.map((t) => (
																	<Tooltip
																		key={t.term}
																		content={
																			t.competitor_count != null
																				? `Found in ${t.competitor_count} competitor pages`
																				: 'Not yet in your content'
																		}
																		tooltipPosition="top"
																	>
																		<span className="bg-error-50 text-error-600 dark:bg-error-900/30 dark:text-error-400 cursor-default rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
																			{t.term}
																		</span>
																	</Tooltip>
																))}
															</div>
														</>
													)}
												</div>
											)}

											{/* Section 2 — Key Concepts (Entities) */}
											{briefEntities.length > 0 && (
												<div>
													<div className="mb-2 text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
														Key Concepts to Establish Expertise
													</div>
													{coveredEntities.length > 0 && (
														<>
															<div className="text-success-600 dark:text-success-400 mb-1 flex items-center gap-1 text-[11px] font-semibold">
																<Check className="size-3" /> Covered
															</div>
															<div className="mb-2 flex flex-wrap gap-1">
																{coveredEntities.map((e) => (
																	<span
																		key={e.term}
																		className="bg-success-50 text-success-600 dark:bg-success-900/30 dark:text-success-400 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
																	>
																		{e.must_cover && <Star className="size-2.5" />}
																		{e.term}
																	</span>
																))}
															</div>
														</>
													)}
													{missingEntities.length > 0 && (
														<>
															<div className="text-error-600 dark:text-error-400 mb-1 flex items-center gap-1 text-[11px] font-semibold">
																<X className="size-3" /> Missing
															</div>
															<div className="flex flex-wrap gap-1">
																{missingEntities.map((e) => (
																	<span
																		key={e.term}
																		className="bg-error-50 text-error-600 dark:bg-error-900/30 dark:text-error-400 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
																	>
																		{e.must_cover && <Star className="size-2.5" />}
																		{e.term}
																	</span>
																))}
															</div>
														</>
													)}
												</div>
											)}

											{/* Section 3 — Questions to Answer (PAA) */}
											{briefPaaQuestions.length > 0 && (
												<div>
													<div className="mb-2 text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
														Questions Your Audience Is Asking
													</div>
													<div className="space-y-1.5">
														{briefPaaQuestions.map((q, i) => {
															const answered = q.answered_in_content ?? false;
															return (
																<div
																	key={i}
																	className="flex items-start gap-2 rounded-lg border border-gray-200 p-2 text-[12px] dark:border-gray-700"
																>
																	<span
																		className={`mt-0.5 shrink-0 ${answered ? 'text-success-500 dark:text-success-400' : 'text-gray-400 dark:text-gray-500'}`}
																	>
																		{answered ? (
																			<Check className="size-3.5" />
																		) : (
																			<X className="size-3.5" />
																		)}
																	</span>
																	<span className="text-gray-700 dark:text-gray-300">
																		{q.question}
																	</span>
																</div>
															);
														})}
													</div>
												</div>
											)}
										</>
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* FAQ Results Modal */}
			<Dialog open={faqOpen} onOpenChange={setFaqOpen}>
				<DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Sparkles className="text-brand-500 size-4" />
							Generated FAQ Section
						</DialogTitle>
						<DialogDescription>
							Copy the Q&amp;A content and/or the schema markup into your page.
						</DialogDescription>
					</DialogHeader>
					{faqData && (
						<div className="space-y-5">
							{/* Q&A list */}
							<div className="space-y-3">
								{faqData.faqs.map((faq, i) => (
									<div
										key={i}
										className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
									>
										<p className="text-sm font-semibold text-gray-900 dark:text-white">
											{faq.question}
										</p>
										<p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
											{faq.answer}
										</p>
									</div>
								))}
							</div>
							{/* Schema block */}
							{faqData.schema && (
								<div>
									<div className="mb-2 flex items-center justify-between">
										<p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
											FAQPage JSON-LD schema
										</p>
										<button
											onClick={() => {
												navigator.clipboard.writeText(faqData!.schema);
												toast.success('Schema copied');
											}}
											className="text-brand-500 hover:text-brand-600 text-xs"
										>
											Copy schema
										</button>
									</div>
									<pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-[11px] text-green-400 dark:bg-black">
										{faqData.schema}
									</pre>
								</div>
							)}
						</div>
					)}
				</DialogContent>
			</Dialog>

			{/* Meta Sidebar */}
			<MetaSidebar
				open={metaSidebarOpen}
				onClose={() => setMetaSidebarOpen(false)}
				page={page}
				siteId={cluster?.siteId ?? selectedSite?.id ?? ''}
				site={selectedSite}
				onSaved={refetch}
			/>

			{FEATURE_VIDEOS_UI && (
				<GenerateVideoModal
					open={generateVideoOpen}
					onOpenChange={setGenerateVideoOpen}
					articleContentJson={editor ? JSON.stringify(editor.getJSON()) : ''}
					pageId={page?.id ?? null}
					videoDraftId={page?.videoDraftId ?? null}
					siteCartesiaVoiceId={videoSiteVoiceId ?? null}
					savedVideoScriptDraft={page?.videoScriptDraft ?? null}
					savedVideoRenderOptions={page?.videoRenderOptionsDraft ?? null}
					siteVideoBranding={
						cluster?.siteId ? (sites.find((s) => s.id === cluster.siteId)?.videoBranding ?? null) : null
					}
					onPersistVideoDraft={persistVideoDraftFromModal}
					onPersistSiteVideoBranding={persistSiteVideoBranding}
					onGenerateScript={handleModalGenerateScript}
					onRenderVideo={handleModalRenderVideo}
					scriptGenerating={scriptGenSubmitting}
					videoSubmitting={videoJobSubmitting}
				/>
			)}

			{/* S2-15: Diagnose This Page — 7-step SEO decision tree */}
			<DiagnoseModal open={diagnoseOpen} onClose={() => setDiagnoseOpen(false)} pageId={id ?? ''} />

			{/* L6: One-click publish to Shopify blog */}
			{cluster?.siteId && (
				<PublishToShopifyModal
					open={shopifyPublishOpen}
					onClose={() => setShopifyPublishOpen(false)}
					siteId={cluster.siteId}
					pageTitle={page?.title ?? ''}
					getBodyHtml={() => editor?.getHTML() ?? ''}
					metaTitle={page?.metaTitle ?? null}
					metaDescription={page?.metaDescription ?? null}
				/>
			)}

			{/* CRO Studio — Add page modal when no existing audit for this SEO page */}
			<CROAddPageModal
				open={addToCROModalOpen}
				onClose={() => setAddToCROModalOpen(false)}
				onSuccess={(auditId) => {
					setAddToCROModalOpen(false);
					navigate(`/cro-studio/audit/${auditId}`);
				}}
				initialPageUrl={
					page?.publishedUrl?.startsWith('http')
						? page.publishedUrl
						: siteForAuthor?.url && page?.publishedUrl
							? `${siteForAuthor.url.replace(/\/$/, '')}${page.publishedUrl.startsWith('/') ? page.publishedUrl : `/${page.publishedUrl}`}`
							: (page?.publishedUrl ?? undefined)
				}
				initialDestinationUrl={cluster?.destinationPageUrl ?? undefined}
				initialPageLabel={page?.title ?? undefined}
				initialClusterId={cluster?.id}
				initialSiteId={cluster?.siteId ?? undefined}
			/>
		</>
	);
}
