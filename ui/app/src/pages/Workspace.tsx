import { useParams, Link, useNavigate } from 'react-router';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import CharacterCount from '@tiptap/extension-character-count';
import Youtube from '@tiptap/extension-youtube';
import { TableKit } from '@tiptap/extension-table';
import { createLowlight, all } from 'lowlight';
import 'highlight.js/styles/github.css';
import { toast } from 'sonner';
import PageMeta from '../components/common/PageMeta';
import { CreditBadge } from '../components/shared/CreditBadge';
import { AIInsightBlock } from '../components/shared/AIInsightBlock';
import { LoadingStepsModal, type Step } from '../components/shared/LoadingStepsModal';
import { ScoreUnavailableNotice } from '../components/shared/ScoreUnavailableNotice';
import { usePage } from '../hooks/usePage';
import { useCluster } from '../hooks/useCluster';
import { useOrganization } from '../hooks/useOrganization';
import { usePageGscData } from '../hooks/usePageGscData';
import { useGSCStatus } from '../hooks/useGSCStatus';
import { buildApiUrl } from '../utils/urls';
import { supabase } from '../utils/supabaseClient';
import { CREDIT_COSTS } from '../lib/credits';
import { computeSeoScore, isPassageReadyH2, type SeoScoreBreakdown } from '../lib/seoScore';
import {
	evaluateCROChecklist,
	calculateCROScore,
	hasRequiredFailingItems,
	FUNNEL_MISMATCH_WARNINGS,
	CRO_ITEM_LABELS,
	getCroItemRequirement,
	getFocusPageLinkWarnings,
	type CroChecklistResult
} from '../lib/croChecklist';
import {
	PAGE_TYPES,
	PAGE_TYPE_CONFIGS,
	canonicalPageType,
	formatPageTypeDisplay,
	pageTypeColor
} from '../lib/seoUtils';
import { cleanPastedHTML } from '../lib/editorUtils';
import { Button } from '../components/ui/button';
import TextArea from '../components/form/input/TextArea';
import { MetaSidebar } from '../components/workspace/MetaSidebar';
import { DiagnoseModal } from '../components/workspace/DiagnoseModal';
import { PublishToShopifyModal } from '../components/workspace/PublishToShopifyModal';
import { LawTooltip } from '../components/shared/LawTooltip';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import {
	Bold,
	Italic,
	Strikethrough,
	Code,
	Underline as UnderlineIcon,
	Heading1,
	Heading2,
	Heading3,
	Heading4,
	Heading5,
	Heading6,
	List,
	ListOrdered,
	Quote,
	Link as LinkIcon,
	Sparkles,
	AlertTriangle,
	Check,
	X,
	AlignLeft,
	AlignCenter,
	AlignRight,
	AlignJustify,
	Image as ImageIcon,
	Minus,
	Type,
	WrapText,
	RotateCcw,
	RotateCw,
	Eraser,
	ScrollText,
	Youtube as YoutubeIcon,
	Columns,
	Table2,
	Info,
	ArrowLeft,
	Star,
	Tag,
	Loader2,
	FileText,
	ChevronDown,
	ChevronUp,
	BarChart3,
	Stethoscope,
	ShoppingBag
} from 'lucide-react';
import { useSiteContext } from '../contexts/SiteContext';

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

/** PassageReadyIndicator — Section 7.7 / 12.2 */
function PassageReadyIndicator({ heading }: { heading: string }) {
	const ready = isPassageReadyH2(heading);
	return (
		<Tooltip
			content="Question-format headings help Google find the answer to show in search results."
			tooltipPosition="top"
		>
			<span
				className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
					ready
						? 'bg-success-50 text-success-600 dark:bg-success-900/30 dark:text-success-400'
						: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
				}`}
			>
				{ready ? <Check className="size-3" /> : <X className="size-3" />}
				{ready ? 'Passage ready' : 'Not a question'}
			</span>
		</Tooltip>
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
	const isFocusPage = page?.type === 'focus_page';

	const { sites, selectedSite } = useSiteContext();

	// Mode tabs: each page type defaults to its natural mode but can switch
	const [activeTab, setActiveTab] = useState<'brief' | 'article'>(
		isFocusPage ? 'brief' : 'article'
	);
	// CRO tab disabled for now — add 'cro' to tabs array below to re-enable (system-1-cro-layer)
	const [activeIntelTab, setActiveIntelTab] = useState<'seo' | 'competitors' | 'cro' | 'entities'>(
		'seo'
	);
	const [showEditorFromScratch, setShowEditorFromScratch] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [generationSteps, setGenerationSteps] = useState<Step[] | null>(null);
	const [generationTitle, setGenerationTitle] = useState<string>('Working on it...');
	const [liveSeoBreakdown, setLiveSeoBreakdown] = useState<SeoScoreBreakdown | null>(null);
	const [liveCroChecklist, setLiveCroChecklist] = useState<CroChecklistResult | null>(null);
	const [croMismatchDismissed, setCroMismatchDismissed] = useState(false);
	// L9: AI detection education — persisted dismiss (localStorage)
	const [aiDetectionDismissed, setAiDetectionDismissed] = useState(
		() => (typeof window !== 'undefined' && localStorage.getItem('sharkly_ai_detection_dismissed') === '1')
	);
	const [croFixesLoading, setCroFixesLoading] = useState(false);
	const [croSuggestions, setCroSuggestions] = useState<string | null>(null);
	const [contentVersion, setContentVersion] = useState(0);
	const [, forceUpdate] = useState(0);
	const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
	const [diagnoseOpen, setDiagnoseOpen] = useState(false);
	const [shopifyPublishOpen, setShopifyPublishOpen] = useState(false);
	const [confirmRegenOpen, setConfirmRegenOpen] = useState(false);
	const [metaSidebarOpen, setMetaSidebarOpen] = useState(false);
	const [rewritingSectionIdx, setRewritingSectionIdx] = useState<number | null>(null);
	const [faqGenerating, setFaqGenerating] = useState(false);
	const [faqData, setFaqData] = useState<{
		faqs: Array<{ question: string; answer: string }>;
		schema: string;
	} | null>(null);
	const [faqOpen, setFaqOpen] = useState(false);

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

	// Sync page type from DB when page loads
	useEffect(() => {
		if (page?.pageType) setLocalPageType(page.pageType);
	}, [page?.pageType]);

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

	useEffect(() => {
		setCroSuggestions(null);
	}, [id]);

	const handleGenerateBrief = useCallback(async () => {
		if (!id) return;
		if (!isFocusPage) {
			toast.error(
				'Brief generation is only available for focus pages. Switch the page type or use Article generation instead.'
			);
			return;
		}
		setGenerating(true);
		setGenerationTitle('Generating brief');
		setGenerationSteps([
			{ id: '1', label: 'Analyzing page and context', status: 'active' },
			{ id: '2', label: 'Generating brief', status: 'pending' }
		]);
		const advanceToStep2 = setTimeout(() => {
			setGenerationSteps((s) =>
				s
					? [
							{ ...s[0], status: 'complete' },
							{ ...s[1], status: 'active' }
						]
					: s
			);
		}, 600);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				toast.error('Please sign in to continue');
				setGenerating(false);
				setGenerationSteps(null);
				return;
			}
			const res = await fetch(buildApiUrl(`/api/pages/${id}/brief`), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({
					authorOverride: authorForBrief.trim() || null
				})
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				if (res.status === 402) {
					toast.error(
						`Insufficient credits. Need ${data.required ?? briefCost}, have ${data.available ?? creditsRemaining ?? 0}.`
					);
					return;
				}
				throw new Error(data?.error || 'Failed to generate brief');
			}
			setGenerationSteps((s) => (s ? [s[0], { ...s[1], status: 'complete' }] : s));
			toast.success('Brief generated');
			refetch();
			refetchOrg();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to generate brief');
		} finally {
			clearTimeout(advanceToStep2);
			setGenerating(false);
			setGenerationSteps(null);
		}
	}, [id, isFocusPage, authorForBrief, refetch, refetchOrg, briefCost, creditsRemaining]);

	const handleGenerateArticle = useCallback(async () => {
		if (!id) return;

		// S2-4: Pre-generation IGS warning when igs_opportunity is empty (product-gaps V1.2c)
		const igsOpportunity = (page?.briefData as { igs_opportunity?: string } | null)?.igs_opportunity?.trim();
		if (!igsOpportunity) {
			const proceed = window.confirm(
				`To protect your site's overall quality score, this article needs at least one original element that competitors don't have. Without it, this article may gradually lower Google's quality rating for your entire site — not just this page.\n\nWhat original insight, data, or experience can you add? (You can add this in a brief section or proceed anyway.)`
			);
			if (!proceed) return;
		}

		setGenerating(true);
		setGenerationTitle('Generating article');
		setGenerationSteps([
			{ id: '1', label: 'Analyzing page and context', status: 'active' },
			{ id: '2', label: 'Generating article', status: 'pending' },
			{ id: '3', label: 'Extracting SEO metadata & entities', status: 'pending' }
		]);
		const advanceToStep2 = setTimeout(() => {
			setGenerationSteps((s) =>
				s ? [{ ...s[0], status: 'complete' }, { ...s[1], status: 'active' }, s[2]] : s
			);
		}, 600);
		const advanceToStep3 = setTimeout(() => {
			setGenerationSteps((s) =>
				s ? [s[0], { ...s[1], status: 'complete' }, { ...s[2], status: 'active' }] : s
			);
		}, 8000);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				toast.error('Please sign in to continue');
				setGenerating(false);
				setGenerationSteps(null);
				return;
			}
			const res = await fetch(buildApiUrl(`/api/pages/${id}/article`), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				if (res.status === 402) {
					toast.error(
						`Insufficient credits. Need ${data.required ?? articleCost}, have ${data.available ?? creditsRemaining ?? 0}.`
					);
					return;
				}
				throw new Error(data?.error || 'Failed to generate article');
			}
			setGenerationSteps((s) => (s ? [s[0], s[1], { ...s[2], status: 'complete' }] : s));
			toast.success('Article generated — SEO score ready');
			refetch();
			refetchOrg();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to generate article');
		} finally {
			clearTimeout(advanceToStep2);
			clearTimeout(advanceToStep3);
			setGenerating(false);
			setGenerationSteps(null);
		}
	}, [id, page?.briefData, refetch, refetchOrg, articleCost, creditsRemaining]);

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
				const res = await fetch(buildApiUrl(`/api/pages/${id}/rewrite-section`), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
					body: JSON.stringify({
						sectionIndex: sectionIdx,
						heading: section.heading,
						guidance: section.guidance,
						entities: section.entities ?? section.entitiesCovered,
						keyword: page?.keyword
					})
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
			const res = await fetch(buildApiUrl(`/api/pages/${id}/generate-faq`), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
			});
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

	const handleGetCroFixes = useCallback(async () => {
		if (!id) return;
		setCroFixesLoading(true);
		setCroSuggestions(null);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				toast.error('Please sign in');
				return;
			}
			const res = await fetch(buildApiUrl(`/api/pages/${id}/cro-fixes`), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				if (res.status === 402)
					toast.error(`Need ${data.required} credits, have ${data.available}`);
				else if (res.status === 400) toast.info(data.error || 'No failing items');
				else toast.error(data.error || 'Failed to get CRO fixes');
				return;
			}
			setCroSuggestions(data.data?.suggestions ?? null);
			await refetchOrg();
		} catch {
			toast.error('Failed to get CRO fixes');
		} finally {
			setCroFixesLoading(false);
		}
	}, [id, refetchOrg]);

	const lowlight = useMemo(() => createLowlight(all), []);

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
		extensions: [
			StarterKit.configure({ codeBlock: false, link: false, underline: false }),
			TableKit,
			CharacterCount,
			CodeBlockLowlight.configure({ lowlight }),
			LinkExtension.configure({
				validate: (href) => /^https?:\/\//.test(href),
				HTMLAttributes: { rel: null, target: null }
			}),
			Underline,
			Placeholder.configure({ placeholder: 'Write something awesome...' }),
			Image,
			TextAlign.configure({ types: ['heading', 'paragraph'] }),
			Youtube.configure({ controls: false, nocookie: true })
		],
		content: (page?.wordCount ?? 0) > 0 && initialContent ? initialContent : '',
		editorProps: {
			attributes: {
				class:
					'w-full mx-auto focus:outline-none text-gray-800 dark:text-gray-300 p-10 min-h-[200px]'
			},
			transformPastedHTML: cleanPastedHTML
		},
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
	}, [editor, page, activeTab, contentVersion]);

	useEffect(() => {
		setCroMismatchDismissed(false);
	}, [contentVersion]);

	// Live CRO checklist — runs in background (CRO tab hidden for now)
	useEffect(() => {
		if (!editor || !page || activeTab !== 'article') {
			setLiveCroChecklist(null);
			return;
		}
		const timer = setTimeout(() => {
			const json = editor.getJSON();
			const text = editor.getText();
			const wc = text.split(/\s+/).filter(Boolean).length;
			if (wc === 0) {
				setLiveCroChecklist(null);
				return;
			}
			const checklist = evaluateCROChecklist(
				{
					keyword: page.keyword ?? '',
					pageType: page.pageType,
					briefData: page.briefData
				},
				json
			);
			setLiveCroChecklist(checklist);
		}, 500);
		return () => clearTimeout(timer);
	}, [editor, page, activeTab, contentVersion]);

	const displaySeoScore = liveSeoBreakdown?.total ?? page?.seoScore ?? 0;

	const croData = liveCroChecklist ?? (page?.croChecklist as CroChecklistResult | null);

	// Focus page CRO tags (destination link + link limit) — separate from SEO score
	const focusPageWarnings = useMemo(() => {
		if (!isFocusPage || !page) return null;
		let content: unknown = null;
		if (editor?.getJSON) {
			content = editor.getJSON();
		} else if (page?.content) {
			try {
				content = typeof page.content === 'string' ? JSON.parse(page.content) : page.content;
			} catch {
				content = null;
			}
		}
		if (!content) return null;
		const w = getFocusPageLinkWarnings(content, cluster?.destinationPageUrl ?? null, 3);
		if (!w.missingDestination && !w.overLinkLimit) return null;
		return w;
	}, [isFocusPage, page, cluster?.destinationPageUrl, editor, contentVersion]);

	// Auto-save: 2s debounce after every editor change, only when content exists
	// Per system-1-cro-layer: run CRO checklist evaluation on content save (same trigger as UPSA)
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

				let croChecklist: Record<string, unknown> | null = null;
				let croScore = 0;
				if (page && wc > 0) {
					const checklist = evaluateCROChecklist(
						{
							keyword: page.keyword ?? '',
							pageType: page.pageType,
							briefData: page.briefData
						},
						json
					);
					const { percentage } = calculateCROScore(checklist, checklist.page_type);
					croChecklist = checklist;
					croScore = percentage;
				}

				await supabase
					.from('pages')
					.update({
						content: JSON.stringify(json),
						word_count: wc,
						cro_checklist: croChecklist,
						cro_score: croScore,
						updated_at: new Date().toISOString()
					})
					.eq('id', id);
				setSaveStatus('saved');
			} catch {
				setSaveStatus('idle');
			}
		}, 2000);
		return () => clearTimeout(timer);
	}, [editor, id, contentVersion, page]);

	const setLinkHandler = useCallback(() => {
		if (!editor) return;
		if (editor.isActive('link')) {
			editor.chain().focus().extendMarkRange('link').unsetLink().run();
			return;
		}
		const previousUrl = editor.getAttributes('link').href;
		const url = window.prompt('URL', previousUrl);
		if (url === null) return;
		if (url === '') {
			editor.chain().focus().extendMarkRange('link').unsetLink().run();
			return;
		}
		if (!/^https?:\/\//.test(url)) {
			window.alert('Invalid Link');
			return;
		}
		editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
	}, [editor]);

	const addImageHandler = useCallback(() => {
		if (!editor) return;
		const url = window.prompt('Enter Image URL');
		if (url) editor.chain().focus().setImage({ src: url }).run();
	}, [editor]);

	const addYoutubeHandler = useCallback(() => {
		if (!editor) return;
		const url = window.prompt('Enter YouTube URL');
		if (url) {
			const height = window.prompt('Enter height in px', '480');
			editor.commands.setYoutubeVideo({
				src: url,
				width: 640,
				height: height ? Math.max(180, parseInt(height, 10)) : 480
			});
		}
	}, [editor]);

	const isArticleEditorVisible =
		activeTab === 'article' && ((page?.wordCount ?? 0) > 0 || showEditorFromScratch);
	const hasEditorContent = editor && editor.getText().trim().length > 0;
	const showRegenerate = isArticleEditorVisible && hasEditorContent;

	// Brief data
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
	const hasContent = (page?.wordCount ?? 0) > 0;
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

	// Article word count (live from editor)
	const liveWordCount = useMemo(
		() => (editor ? editor.storage.characterCount.words() : (page?.wordCount ?? 0)),
		[editor, page?.wordCount, contentVersion] // eslint-disable-line react-hooks/exhaustive-deps
	);

	if (loading) {
		return (
			<div className="flex h-[calc(100vh-80px)] items-center justify-center">
				<div className="text-gray-500 dark:text-gray-400">Loading...</div>
			</div>
		);
	}
	if (error || !page) {
		return (
			<div className="flex h-[calc(100vh-80px)] flex-col items-center justify-center gap-4">
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
			{generationSteps && <LoadingStepsModal steps={generationSteps} title={generationTitle} />}

			<div className="flex h-[calc(100vh-80px)] flex-col gap-6">
				{/* ------------------------------------------------------------------ */}
				{/* Page Header */}
				{/* ------------------------------------------------------------------ */}
				<div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<div>
								<div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
									<Link
										to={`/clusters/${page.clusterId}`}
										className="text-brand-600 dark:text-brand-400 hover:underline"
									>
										{cluster?.title ?? 'Cluster'}
									</Link>
									<span className="mx-1">›</span>
									<span>{page.title}</span>
								</div>
								<h1 className="font-montser text-xl font-bold text-gray-900 dark:text-white">
									{page.title}
								</h1>
								{/* Focus page CRO tags — destination link + link limit (not SEO score) */}
								{focusPageWarnings && (
									<div className="mt-2 flex flex-wrap gap-1.5">
										{focusPageWarnings.missingDestination && (
											<span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
												Missing destination link
											</span>
										)}
										{focusPageWarnings.overLinkLimit && (
											<span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
												Too many links (max 3)
											</span>
										)}
									</div>
								)}
							</div>
						</div>

						{/* Mode tabs — Focus Page Brief | Article Editor */}
						{/* <div className="flex gap-0 border-b border-gray-200 dark:border-gray-700">
							<button
								onClick={() => setActiveTab('brief')}
								className={`px-4 py-2 text-sm font-medium transition-colors ${
									activeTab === 'brief'
										? 'border-brand-500 border-b-2 font-semibold text-gray-900 dark:text-white'
										: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
								}`}
							>
								Focus Page Brief
							</button>
							<button
								onClick={() => setActiveTab('article')}
								className={`px-4 py-2 text-sm font-medium transition-colors ${
									activeTab === 'article'
										? 'border-brand-500 border-b-2 font-semibold text-gray-900 dark:text-white'
										: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
								}`}
							>
								Article Editor
							</button>
						</div> */}
					</div>

					<div className="flex items-center gap-4">
						{/* Live UPSA score — hide when we can't score accurately (no brief/semantic data) */}
						{!canShowAccurateScore ? (
							<div className="min-w-[200px]">
								<ScoreUnavailableNotice
									variant="compact"
									canGenerateBrief={isFocusPage}
									hasCreditsForBrief={hasCreditsForBrief}
									briefCost={briefCost}
									onGenerateBrief={isFocusPage ? handleGenerateBrief : undefined}
									generating={generating}
								/>
							</div>
						) : (
							<div className="text-right">
								<span
									className={`font-montserrat text-2xl font-extrabold ${scoreColor(displaySeoScore)}`}
								>
									{displaySeoScore}
								</span>
								<span className="ml-1 text-sm text-gray-500 dark:text-gray-400">/115</span>
							</div>
						)}
						<Button
							variant="outline"
							size="sm"
							className="border-gray-200 dark:border-gray-700"
							onClick={() => setMetaSidebarOpen(true)}
							disabled={!cluster?.siteId || !page?.keyword}
						>
							<Tag className="mr-1.5 size-3.5" />
							{page?.metaTitle ? 'Meta ✓' : 'Meta'}
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="border-gray-200 dark:border-gray-700"
							onClick={() => setDiagnoseOpen(true)}
						>
							<Stethoscope className="mr-1.5 size-3.5" />
							Diagnose
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="border-gray-200 dark:border-gray-700"
							onClick={() => setShopifyPublishOpen(true)}
						>
							<ShoppingBag className="mr-1.5 size-3.5" />
							Publish to Shopify
						</Button>

						{/* Page type selector */}
						<div className="relative flex items-center gap-1">
							<Tooltip
								content={
									localPageType && PAGE_TYPE_CONFIGS[canonicalPageType(localPageType)]
										? PAGE_TYPE_CONFIGS[canonicalPageType(localPageType)].description
										: 'Select the type of page you are building — this changes the on-page SEO rules, heading format, schema type, and generation strategy.'
								}
								tooltipPosition="bottom"
							>
								<div className="relative">
									<select
										value={localPageType}
										onChange={(e) => handlePageTypeChange(e.target.value)}
										disabled={pageTypeSaving}
										className={`focus:ring-brand-500 cursor-pointer appearance-none rounded-md border py-1.5 pr-6 pl-7 text-xs font-medium focus:ring-2 focus:outline-none dark:bg-gray-900 dark:text-gray-200 ${
											localPageType
												? pageTypeColor(localPageType)
												: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700'
										}`}
									>
										<option value="">Page Type</option>
										{PAGE_TYPES.map((pt) => (
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
							(siteLanguage.language !== 'English' || siteLanguage.region !== 'United States') && (
								<Tooltip
									content={`Generating in ${siteLanguage.language} for ${siteLanguage.region}. Change in Site Settings.`}
									tooltipPosition="bottom"
								>
									<span className="border-blue-light-200 bg-blue-light-50 text-blue-light-700 dark:border-blue-light-700/40 dark:bg-blue-light-900/20 dark:text-blue-light-400 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium">
										{siteLanguage.language} · {siteLanguage.region}
									</span>
								</Tooltip>
							)}
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
						<Button
							size="sm"
							className="bg-brand-500 hover:bg-brand-600 text-white"
							disabled={
								generating || (activeTab === 'brief' ? !hasCreditsForBrief : !hasCreditsForArticle)
							}
							onClick={() => {
								if (showRegenerate) {
									setConfirmRegenOpen(true);
								} else if (activeTab === 'brief') {
									handleGenerateBrief();
								} else {
									handleGenerateArticle();
								}
							}}
						>
							<CreditBadge
								cost={activeTab === 'brief' ? briefCost : articleCost}
								action={showRegenerate ? 'Regenerate' : activeTab === 'brief' ? 'Brief' : 'Article'}
								sufficient={activeTab === 'brief' ? hasCreditsForBrief : hasCreditsForArticle}
							/>
							<Sparkles className="ml-2 size-4" />
							<span className="ml-2">
								{generating ? 'Generating...' : showRegenerate ? 'Regenerate' : 'Generate'}
							</span>
						</Button>

						{/* Regenerate confirmation dialog */}
						<AlertDialog open={confirmRegenOpen} onOpenChange={setConfirmRegenOpen}>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Regenerate this content?</AlertDialogTitle>
									<AlertDialogDescription>
										This will overwrite your current{' '}
										<strong>{activeTab === 'brief' ? 'brief' : 'article'}</strong> with a freshly
										generated version. <strong>Any edits you've made will be lost</strong> and{' '}
										<strong>
											<CreditBadge
												cost={activeTab === 'brief' ? briefCost : articleCost}
												action="Regenerate"
												sufficient={
													activeTab === 'brief' ? hasCreditsForBrief : hasCreditsForArticle
												}
											/>
										</strong>{' '}
										credits will be charged.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										className="bg-red-500 text-white hover:bg-red-600"
										onClick={() => {
											setConfirmRegenOpen(false);
											if (activeTab === 'brief') {
												handleGenerateBrief();
											} else {
												handleGenerateArticle();
											}
										}}
									>
										Yes, regenerate
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
											? `SEO score looks good at ${displaySeoScore}/115. Add 1–2 internal links to your focus page to pass the UX signals check.`
											: displaySeoScore >= 60
												? `You're at ${displaySeoScore}/115. Check the panel: add the keyword to H1, hit word count, or add internal links to improve.`
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
				<div className="flex min-h-0 min-w-0 flex-1 gap-6 overflow-hidden">
					{/* Editor / Brief area */}
					<div
						className={`scrollbar-branded w-4/5 min-w-0 flex-1 ${
							activeTab === 'article' && (page.wordCount > 0 || showEditorFromScratch)
								? 'flex min-h-0 flex-col overflow-hidden'
								: 'min-h-0 overflow-y-auto'
						}`}
					>
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
											Ready to generate your content brief?
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
												{generating ? 'Generating...' : 'Generate Brief'}
											</span>
										</Button>
									</div>
								) : (
									<>
										{/* Word Count Range Visualizer — Section 7.7 */}
										<div className="mx-auto mb-2 max-w-3xl">
											<WordCountVisualizer
												current={page?.wordCount ?? 0}
												target={page?.targetWordCount ?? 0}
											/>
										</div>

										{/* Brief sections */}
										<div className="mx-auto flex max-w-3xl flex-col gap-4">
											{briefSections.map((section, i) => (
												<div
													key={i}
													className="group rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
												>
													<div className="mb-3 flex items-start justify-between">
														<div className="flex flex-wrap items-center gap-2">
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
														<button
															disabled={rewritingSectionIdx === i}
															onClick={() =>
																handleRewriteSection(i, section as Record<string, unknown>)
															}
															className="opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-60"
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
													<div className="rounded-lg bg-gray-100 p-4 text-sm leading-relaxed text-gray-900 dark:bg-gray-800 dark:text-white">
														{section.guidance ?? (section as { content?: string }).content ?? ''}
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
														{CREDIT_COSTS.FAQ_GENERATION} credits
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
									<div className="mt-16 flex flex-col items-center text-center">
										<Sparkles className="text-brand-500 dark:text-brand-400 size-14" />
										<h2 className="font-montserrat mt-4 text-xl font-bold text-gray-900 dark:text-white">
											Ready to generate this article?
										</h2>
										<p className="mt-2 max-w-sm text-sm text-gray-600 dark:text-gray-400">
											We&apos;ll analyze the top search results and write an SEO-optimized draft
											based on what&apos;s working for your competitors.
										</p>
										<Button
											className="bg-brand-500 hover:bg-brand-600 mt-6 text-white"
											disabled={generating || !hasCreditsForArticle}
											onClick={handleGenerateArticle}
										>
											<CreditBadge
												cost={articleCost}
												action="Article"
												sufficient={hasCreditsForArticle}
											/>
											<Sparkles className="ml-2 size-4" />
											<span className="ml-2">
												{generating ? 'Generating...' : 'Generate Article'}
											</span>
										</Button>
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
										{/* Tiptap Toolbar */}
										{editor && (
											<div className="z-10 mb-4 flex shrink-0 flex-wrap items-center justify-between gap-1 rounded-lg border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
												<Tooltip content="Align left" tooltipPosition="bottom">
													<button
														onClick={() => editor.chain().focus().setTextAlign('left').run()}
														className={`rounded p-2 transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'border border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white' : 'border border-transparent hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400'}`}
														aria-label="Align left"
													>
														<AlignLeft className="size-4" />
													</button>
												</Tooltip>
												<Tooltip content="Align center" tooltipPosition="bottom">
													<button
														onClick={() => editor.chain().focus().setTextAlign('center').run()}
														className={`rounded p-2 transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'border border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white' : 'border border-transparent hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400'}`}
														aria-label="Align center"
													>
														<AlignCenter className="size-4" />
													</button>
												</Tooltip>
												<Tooltip content="Align right" tooltipPosition="bottom">
													<button
														onClick={() => editor.chain().focus().setTextAlign('right').run()}
														className={`rounded p-2 transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'border border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white' : 'border border-transparent hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400'}`}
														aria-label="Align right"
													>
														<AlignRight className="size-4" />
													</button>
												</Tooltip>
												<Tooltip content="Align justify" tooltipPosition="bottom">
													<button
														onClick={() => editor.chain().focus().setTextAlign('justify').run()}
														className={`rounded p-2 transition-colors ${editor.isActive({ textAlign: 'justify' }) ? 'border border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white' : 'border border-transparent hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400'}`}
														aria-label="Align justify"
													>
														<AlignJustify className="size-4" />
													</button>
												</Tooltip>
												<Tooltip content="Unset text align" tooltipPosition="bottom">
													<button
														onClick={() => editor.chain().focus().unsetTextAlign().run()}
														className="rounded border border-transparent p-2 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400"
														aria-label="Unset text align"
													>
														<Columns className="size-4" />
													</button>
												</Tooltip>
												<div className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700" />
												<Tooltip content="Image" tooltipPosition="bottom">
													<button
														onClick={addImageHandler}
														className="rounded border border-transparent p-2 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400"
														aria-label="Image"
													>
														<ImageIcon className="size-4" />
													</button>
												</Tooltip>
												<div className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700" />
												<Tooltip content="Bullet list" tooltipPosition="bottom">
													<button
														onClick={() => editor.chain().focus().toggleBulletList().run()}
														className={`rounded p-2 transition-colors ${editor.isActive('bulletList') ? 'border border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white' : 'border border-transparent hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400'}`}
														aria-label="Bullet list"
													>
														<List className="size-4" />
													</button>
												</Tooltip>
												<Tooltip content="Ordered list" tooltipPosition="bottom">
													<button
														onClick={() => editor.chain().focus().toggleOrderedList().run()}
														className={`rounded p-2 transition-colors ${editor.isActive('orderedList') ? 'border border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white' : 'border border-transparent hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400'}`}
														aria-label="Ordered list"
													>
														<ListOrdered className="size-4" />
													</button>
												</Tooltip>
												<Tooltip content="Code block" tooltipPosition="bottom">
													<button
														onClick={() => editor.chain().focus().toggleCodeBlock().run()}
														className={`rounded p-2 transition-colors ${editor.isActive('codeBlock') ? 'border border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white' : 'border border-transparent hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400'}`}
														aria-label="Code block"
													>
														<Code className="size-4" />
													</button>
												</Tooltip>
												<Tooltip content="Blockquote" tooltipPosition="bottom">
													<button
														onClick={() => editor.chain().focus().toggleBlockquote().run()}
														className={`rounded p-2 transition-colors ${editor.isActive('blockquote') ? 'border border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white' : 'border border-transparent hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400'}`}
														aria-label="Blockquote"
													>
														<Quote className="size-4" />
													</button>
												</Tooltip>
												<Tooltip content="Horizontal rule" tooltipPosition="bottom">
													<button
														onClick={() => editor.chain().focus().setHorizontalRule().run()}
														className="rounded border border-transparent p-2 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400"
														aria-label="Horizontal rule"
													>
														<Minus className="size-4" />
													</button>
												</Tooltip>
												<Tooltip content="Insert table" tooltipPosition="bottom">
													<button
														onClick={() =>
															editor
																.chain()
																.focus()
																.insertTable({ rows: 3, cols: 2, withHeaderRow: true })
																.run()
														}
														className="rounded border border-transparent p-2 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400"
														aria-label="Table"
													>
														<Table2 className="size-4" />
													</button>
												</Tooltip>
												<Tooltip content="Hard break" tooltipPosition="bottom">
													<button
														onClick={() => editor.chain().focus().setHardBreak().run()}
														className="rounded border border-transparent p-2 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400"
														aria-label="Hard break"
													>
														<WrapText className="size-4" />
													</button>
												</Tooltip>
												<div className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700" />
												<Tooltip content="Undo" tooltipPosition="bottom">
													<button
														onClick={() => editor.chain().focus().undo().run()}
														disabled={!editor.can().undo()}
														className="rounded border border-transparent p-2 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400"
														aria-label="Undo"
													>
														<RotateCcw className="size-4" />
													</button>
												</Tooltip>
												<Tooltip content="Redo" tooltipPosition="bottom">
													<button
														onClick={() => editor.chain().focus().redo().run()}
														disabled={!editor.can().redo()}
														className="rounded border border-transparent p-2 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400"
														aria-label="Redo"
													>
														<RotateCw className="size-4" />
													</button>
												</Tooltip>
												<Tooltip content="Unset all marks" tooltipPosition="bottom">
													<button
														onClick={() => editor.chain().focus().unsetAllMarks().run()}
														className="rounded border border-transparent p-2 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400"
														aria-label="Unset all marks"
													>
														<Eraser className="size-4" />
													</button>
												</Tooltip>
												<Tooltip content="Clear nodes" tooltipPosition="bottom">
													<button
														onClick={() => editor.chain().focus().clearNodes().run()}
														className="rounded border border-transparent p-2 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400"
														aria-label="Clear nodes"
													>
														<ScrollText className="size-4" />
													</button>
												</Tooltip>
												<Tooltip content="YouTube" tooltipPosition="bottom">
													<button
														onClick={addYoutubeHandler}
														className="rounded border border-transparent p-2 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400"
														aria-label="YouTube"
													>
														<YoutubeIcon className="size-4" />
													</button>
												</Tooltip>
												<Tooltip
													content="Styles you see here may not look the same on your website, as they depend on your website's styling."
													tooltipPosition="bottom"
													usePortal
													className="max-w-xs text-center whitespace-normal"
												>
													<button
														type="button"
														className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
														aria-label="Editor styling note"
													>
														<Info className="size-4" />
													</button>
												</Tooltip>
											</div>
										)}

										{/* L9: AI detection education — dismissable, persistent on first view */}
										{editor && !aiDetectionDismissed && (
											<div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-800 dark:bg-blue-900/30">
												<Info className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
												<div className="flex-1 text-[13px] text-blue-800 dark:text-blue-200">
													Your content may be flagged by AI detection tools (Grammarly, ZeroGPT, etc.).
													This has no effect on Google rankings. What Google measures is semantic depth
													and expertise signals — which your content score already tracks.
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

										<div className="scrollbar-branded relative flex min-h-[400px] min-w-0 flex-1 flex-col overflow-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
											{editor && (
												<BubbleMenu
													editor={editor}
													className="flex flex-wrap items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
												>
													<Tooltip content="Bold" tooltipPosition="bottom">
														<button
															onClick={() => editor.chain().focus().toggleBold().run()}
															className={`rounded p-1.5 transition-colors ${editor.isActive('bold') ? 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
															aria-label="Bold"
														>
															<Bold className="size-4" />
														</button>
													</Tooltip>
													<Tooltip content="Italic" tooltipPosition="bottom">
														<button
															onClick={() => editor.chain().focus().toggleItalic().run()}
															className={`rounded p-1.5 transition-colors ${editor.isActive('italic') ? 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
															aria-label="Italic"
														>
															<Italic className="size-4" />
														</button>
													</Tooltip>
													<Tooltip content="Strikethrough" tooltipPosition="bottom">
														<button
															onClick={() => editor.chain().focus().toggleStrike().run()}
															className={`rounded p-1.5 transition-colors ${editor.isActive('strike') ? 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
															aria-label="Strikethrough"
														>
															<Strikethrough className="size-4" />
														</button>
													</Tooltip>
													<Tooltip content="Underline" tooltipPosition="bottom">
														<button
															onClick={() => editor.chain().focus().toggleUnderline().run()}
															className={`rounded p-1.5 transition-colors ${editor.isActive('underline') ? 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
															aria-label="Underline"
														>
															<UnderlineIcon className="size-4" />
														</button>
													</Tooltip>
													<Tooltip content="Code" tooltipPosition="bottom">
														<button
															onClick={() => editor.chain().focus().toggleCode().run()}
															className={`rounded p-1.5 transition-colors ${editor.isActive('code') ? 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
															aria-label="Code"
														>
															<Code className="size-4" />
														</button>
													</Tooltip>
													<div className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-600" />
													<Tooltip content="Paragraph" tooltipPosition="bottom">
														<button
															onClick={() => editor.chain().focus().setParagraph().run()}
															className={`rounded p-2 transition-colors ${editor.isActive('paragraph') ? 'border border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white' : 'border border-transparent hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400'}`}
															aria-label="Paragraph"
														>
															<Type className="size-4" />
														</button>
													</Tooltip>
													{[1, 2, 3, 4, 5, 6].map((level) => (
														<Tooltip
															key={level}
															content={`Heading ${level}`}
															tooltipPosition="bottom"
														>
															<button
																onClick={() =>
																	editor
																		.chain()
																		.focus()
																		.toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 })
																		.run()
																}
																className={`rounded p-2 transition-colors ${editor.isActive('heading', { level }) ? 'border border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white' : 'border border-transparent hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400'}`}
																aria-label={`Heading ${level}`}
															>
																{level === 1 && <Heading1 className="size-4" />}
																{level === 2 && <Heading2 className="size-4" />}
																{level === 3 && <Heading3 className="size-4" />}
																{level === 4 && <Heading4 className="size-4" />}
																{level === 5 && <Heading5 className="size-4" />}
																{level === 6 && <Heading6 className="size-4" />}
															</button>
														</Tooltip>
													))}
													<div className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-600" />
													<Tooltip content="Link" tooltipPosition="bottom">
														<button
															onClick={setLinkHandler}
															className={`rounded p-1.5 transition-colors ${editor.isActive('link') ? 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
															aria-label="Link"
														>
															<LinkIcon className="size-4" />
														</button>
													</Tooltip>
												</BubbleMenu>
											)}
											<EditorContent
												editor={editor}
												className="flex h-full min-h-0 min-w-0 flex-1 flex-col [&_.tiptap]:min-h-[360px] [&_.tiptap]:min-w-0 [&_.tiptap]:flex-1"
											/>
										</div>
										{page.targetWordCount > 0 && (
											<div className="flex justify-end p-3">
												<span
													className={`text-xs ${
														liveWordCount >= Math.round(page.targetWordCount * 0.7) &&
														liveWordCount <= Math.round(page.targetWordCount * 1.3)
															? 'text-success-500 dark:text-success-400'
															: liveWordCount > Math.round(page.targetWordCount * 1.3)
																? 'text-warning-500 dark:text-warning-400'
																: 'text-gray-500 dark:text-gray-400'
													}`}
												>
													{liveWordCount.toLocaleString()} / {page.targetWordCount.toLocaleString()}{' '}
													target
												</span>
											</div>
										)}
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
							{/* CRO tab hidden — add 'cro' to re-enable (system-1-cro-layer) */}
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
														<div className="text-[10px] text-gray-500 dark:text-gray-400">
															Impr
														</div>
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
														<div className="text-[10px] text-gray-500 dark:text-gray-400">
															CTR
														</div>
													</div>
													<div>
														<div className="text-lg font-bold text-gray-900 dark:text-white">
															{pageGscMetrics.position.toFixed(1)}
														</div>
														<div className="text-[10px] text-gray-500 dark:text-gray-400">
															Pos
														</div>
													</div>
												</div>
											) : (
												<p className="text-[13px] text-gray-500 dark:text-gray-400">
													No data for this page yet
												</p>
											)}
										</div>
									)}

									{/* When no brief/semantic data, don't show score — it would be misleading */}
									{!canShowAccurateScore ? (
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

											{/* Skyscraper Warning */}
											{liveSeoBreakdown?.skyscraperWarning && (
												<div className="bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-700 mb-4 rounded-lg border p-3">
													<div className="text-warning-700 dark:text-warning-400 flex items-start gap-2 text-[13px] font-semibold">
														<AlertTriangle className="mt-0.5 size-4 shrink-0" />
														<span className="flex items-center gap-1">
															Skyscraper Alert:
															<LawTooltip lawId="quality_before_volume" />
														</span>
														<span>
															Your content covers the same ground as every
															competitor. Add original data, an expert quote, or first-hand
															experience to earn the information gain bonus.
														</span>
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
															<div className="mb-2 rounded border border-error-200 bg-error-50 p-2 text-[12px] text-error-700 dark:border-error-800 dark:bg-error-900/30 dark:text-error-300">
																{liveSeoBreakdown.module4.vagueH2Count} of your{' '}
																{liveSeoBreakdown.module4.h2Count} H2s are vague labels
																(&quot;Our Services&quot;, &quot;Why Choose Us&quot;). These
																weaken your page&apos;s passage scoring. Rewrite all H2s as
																specific answerable questions.
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
							{/* COMPETITORS TAB */}
							{/* ====================================================== */}
							{activeIntelTab === 'competitors' && (
								<div className="space-y-2">
									{briefCompetitors.length > 0 ? (
										briefCompetitors.map((c, i) => (
											<div
												key={c.url ?? i}
												className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
											>
												<div className="text-[13px] font-semibold text-gray-900 dark:text-white">
													{c.title ?? c.url ?? 'Competitor'}
												</div>
												<div className="mt-1 flex gap-3 text-xs text-gray-500 dark:text-gray-400">
													{c.word_count != null && (
														<span>{c.word_count.toLocaleString()} words</span>
													)}
													{c.h2s != null && <span>{c.h2s.length} H2s</span>}
												</div>
												{c.h2s != null && c.h2s.length > 0 && (
													<ul className="mt-2 space-y-0.5 border-t border-gray-200 pt-2 text-[11px] text-gray-600 dark:border-gray-600 dark:text-gray-400">
														{c.h2s.map((h, j) => (
															<li key={j} className="truncate">
																• {h}
															</li>
														))}
													</ul>
												)}
											</div>
										))
									) : (
										<p className="text-[13px] text-gray-500 dark:text-gray-400">
											No competitor data yet. Generate a brief to analyze search result competitors.
										</p>
									)}
									<div className="bg-brand-50 dark:bg-brand-900/30 mt-3 rounded-lg p-3">
										<div className="text-brand-600 dark:text-brand-400 text-[13px] font-semibold">
											Your target: {(page?.targetWordCount ?? 1400).toLocaleString()} words
										</div>
									</div>
								</div>
							)}

							{/* ====================================================== */}
							{/* CRO TAB — hidden (add 'cro' to tabs array above to re-enable) */}
							{/* ====================================================== */}
							{activeIntelTab === 'cro' && (
								<div className="space-y-4">
									{!croData ? (
										<p className="text-[13px] text-gray-500 dark:text-gray-400">
											{hasBrief
												? 'Write or edit content in the Article tab to see your CRO checklist score.'
												: 'Generate a brief, then add content to see your CRO checklist score.'}
										</p>
									) : (
										<>
											{/* 1. Score Block */}
											<div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
												<div className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
													CRO Score
												</div>
												<div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
													{croData.score ?? 0} / {croData.max_score ?? 7}
												</div>
												<div className="mt-0.5 text-[13px] text-gray-600 dark:text-gray-400">
													{formatPageTypeDisplay(croData.page_type)}
												</div>
											</div>

											{/* 2. Funnel Mismatch Warning (conditional, dismissable) */}
											{croData.funnel_mismatch &&
												!croMismatchDismissed &&
												FUNNEL_MISMATCH_WARNINGS[croData.funnel_mismatch] && (
													<div
														className={`flex items-start gap-2 rounded-lg border p-3 ${
															croData.funnel_mismatch === 'hard_cta_on_tofu' ||
															croData.funnel_mismatch === 'no_cta_on_money'
																? 'border-error-200 bg-error-50 dark:border-error-800 dark:bg-error-900/30'
																: 'border-warning-200 bg-warning-50 dark:border-warning-800 dark:bg-warning-900/30'
														}`}
													>
														<AlertTriangle
															className={`mt-0.5 size-4 shrink-0 ${
																croData.funnel_mismatch === 'hard_cta_on_tofu' ||
																croData.funnel_mismatch === 'no_cta_on_money'
																	? 'text-error-600 dark:text-error-400'
																	: 'text-warning-600 dark:text-warning-400'
															}`}
														/>
														<div className="flex-1 text-[13px]">
															{FUNNEL_MISMATCH_WARNINGS[croData.funnel_mismatch]}
														</div>
														<button
															type="button"
															onClick={() => setCroMismatchDismissed(true)}
															className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
															aria-label="Dismiss"
														>
															<X className="size-4" />
														</button>
													</div>
												)}

											{/* 3. Checklist (8 items) */}
											<div className="space-y-2">
												{(['1', '2', '3', '4', '5', '6', '7', '8'] as const).map((key) => {
													const item = croData.items?.[key];
													if (!item) return null;
													const pt = (croData.page_type ?? 'tofu_article') as Parameters<
														typeof getCroItemRequirement
													>[0];
													const req = getCroItemRequirement(pt, key);
													const isOptionalFail = req === 'optional' && item.status === 'fail';
													const isOptionalPass =
														req === 'optional' &&
														(item.status === 'pass' || item.status === 'partial');
													const isNa = item.status === 'na' || req === 'na';
													return (
														<div
															key={key}
															className={`rounded-lg border p-2.5 text-[13px] ${
																isNa
																	? 'border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/30'
																	: isOptionalFail
																		? 'border-gray-200 dark:border-gray-700'
																		: item.status === 'pass'
																			? 'border-success-200 bg-success-50/50 dark:border-success-800/50 dark:bg-success-900/20'
																			: item.status === 'partial'
																				? 'border-warning-200 bg-warning-50/50 dark:border-warning-800/50 dark:bg-warning-900/20'
																				: 'border-error-200 bg-error-50/50 dark:border-error-800/50 dark:bg-error-900/20'
															}`}
														>
															<div className="flex items-start gap-2">
																{isNa ? (
																	<span className="text-gray-400 dark:text-gray-500">—</span>
																) : item.status === 'pass' ? (
																	<Check className="text-success-600 dark:text-success-400 size-4 shrink-0" />
																) : item.status === 'partial' ? (
																	<AlertTriangle className="text-warning-600 dark:text-warning-400 size-4 shrink-0" />
																) : (
																	<X className="text-error-600 dark:text-error-400 size-4 shrink-0" />
																)}
																<div className="min-w-0 flex-1">
																	<div className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-white">
																		{CRO_ITEM_LABELS[key] ?? `Item ${key}`}
																		{isOptionalPass && (
																			<span className="bg-success-100 text-success-700 dark:bg-success-900/50 dark:text-success-400 rounded px-1.5 py-0.5 text-[10px] font-semibold">
																				bonus
																			</span>
																		)}
																	</div>
																	<div
																		className={`mt-0.5 text-[12px] ${
																			isNa
																				? 'text-gray-500 dark:text-gray-400'
																				: 'text-gray-600 dark:text-gray-400'
																		}`}
																	>
																		{isNa ? 'Not required for this page type' : item.evidence}
																	</div>
																</div>
															</div>
														</div>
													);
												})}
											</div>

											{/* 4. Get Specific Fixes button */}
											{hasRequiredFailingItems(croData) && (
												<>
													<Button
														variant="outline"
														size="sm"
														className="w-full"
														disabled={croFixesLoading || creditsRemaining < CREDIT_COSTS.CRO_FIXES}
														onClick={handleGetCroFixes}
													>
														{croFixesLoading ? (
															<>
																<span className="mr-2 size-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-gray-400" />
																Getting fixes…
															</>
														) : (
															<>
																<Sparkles className="mr-2 size-4" />
																Get Specific Fixes ({CREDIT_COSTS.CRO_FIXES} credits)
															</>
														)}
													</Button>
													{croSuggestions && (
														<div className="border-primary-200 bg-primary-50/50 dark:border-primary-800 dark:bg-primary-950/30 mt-2 rounded-lg border p-3 text-[13px] text-gray-700 dark:text-gray-300">
															<div className="text-primary-700 dark:text-primary-400 mb-1 font-semibold">
																AI Suggestions
															</div>
															<div className="whitespace-pre-wrap">{croSuggestions}</div>
														</div>
													)}
												</>
											)}

											{/* 5. Brief Guidance (collapsed) */}
											{briefSections.some((s) => s.cro_note) && (
												<Collapsible defaultOpen={false}>
													<CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left text-[13px] font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/50">
														Brief Guidance
														<ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
													</CollapsibleTrigger>
													<CollapsibleContent>
														<div className="mt-2 space-y-2">
															{briefSections
																.filter((s) => s.cro_note)
																.map((s) => (
																	<div
																		key={s.heading ?? s.type ?? ''}
																		className="rounded-lg border border-gray-200 p-2 dark:border-gray-700"
																	>
																		<div className="font-semibold text-gray-900 dark:text-white">
																			{s.heading ?? s.type ?? 'Section'}
																		</div>
																		<div className="mt-1 text-gray-600 dark:text-gray-400">
																			{s.cro_note}
																		</div>
																	</div>
																))}
														</div>
													</CollapsibleContent>
												</Collapsible>
											)}
										</>
									)}
								</div>
							)}

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

			{/* S2-15: Diagnose This Page — 7-step SEO decision tree */}
			<DiagnoseModal
				open={diagnoseOpen}
				onClose={() => setDiagnoseOpen(false)}
				pageId={id ?? ''}
			/>

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
		</>
	);
}
