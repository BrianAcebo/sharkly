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
import { buildApiUrl } from '../utils/urls';
import { supabase } from '../utils/supabaseClient';
import { CREDIT_COSTS } from '../lib/credits';
import { computeSeoScore, isPassageReadyH2, type SeoScoreBreakdown } from '../lib/seoScore';
import { Button } from '../components/ui/button';
import { Tooltip } from '../components/ui/tooltip';
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
	Info,
	ArrowLeft,
	Star
} from 'lucide-react';

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
function WordCountVisualizer({
	current,
	target,
}: {
	current: number;
	target: number;
}) {
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
				Your target is ~{target.toLocaleString()} words. You&apos;re at {current.toLocaleString()} words.
			</div>
			<div className="relative h-3 w-full overflow-visible rounded-full bg-gray-200 dark:bg-gray-700">
				{/* filled bar */}
				<div
					className={`absolute left-0 top-0 h-full rounded-full transition-all ${
						current < min ? 'bg-gray-400' : current > max ? 'bg-warning-400' : 'bg-success-400'
					}`}
					style={{ width: `${pct}%` }}
				/>
				{/* MIN marker */}
				<div
					className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-gray-500 dark:bg-gray-400"
					style={{ left: `${minPct}%` }}
				>
					<span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-gray-500 dark:text-gray-400">
						Min
					</span>
				</div>
				{/* TARGET marker */}
				<div
					className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-gray-700 dark:bg-gray-300"
					style={{ left: `${targetPct}%` }}
				>
					<span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-gray-700 dark:text-gray-300">
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

	// Mode tabs: each page type defaults to its natural mode but can switch
	const [activeTab, setActiveTab] = useState<'brief' | 'article'>(isFocusPage ? 'brief' : 'article');
	const [activeIntelTab, setActiveIntelTab] = useState<'seo' | 'competitors' | 'cro' | 'entities'>('seo');
	const [showEditorFromScratch, setShowEditorFromScratch] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [generationSteps, setGenerationSteps] = useState<Step[] | null>(null);
	const [generationTitle, setGenerationTitle] = useState<string>('Working on it...');
	const [liveSeoBreakdown, setLiveSeoBreakdown] = useState<SeoScoreBreakdown | null>(null);
	const [contentVersion, setContentVersion] = useState(0);
	const [, forceUpdate] = useState(0);

	const creditsRemaining = organization?.included_credits_remaining ?? organization?.included_credits ?? 0;
	const briefCost = CREDIT_COSTS.MONEY_PAGE_BRIEF;
	const articleCost = CREDIT_COSTS.ARTICLE_GENERATION;
	const hasCreditsForBrief = creditsRemaining >= briefCost;
	const hasCreditsForArticle = creditsRemaining >= articleCost;

	// Sync tab when page type changes (e.g. navigating between pages)
	useEffect(() => {
		setActiveTab(isFocusPage ? 'brief' : 'article');
		setShowEditorFromScratch(false);
	}, [id, isFocusPage]);

	const handleGenerateBrief = useCallback(async () => {
		if (!id || !isFocusPage) return;
		setGenerating(true);
		setGenerationTitle('Generating brief');
		setGenerationSteps([
			{ id: '1', label: 'Analyzing page and context', status: 'active' },
			{ id: '2', label: 'Generating brief', status: 'pending' }
		]);
		const advanceToStep2 = setTimeout(() => {
			setGenerationSteps((s) =>
				s ? [{ ...s[0], status: 'complete' }, { ...s[1], status: 'active' }] : s
			);
		}, 600);
		try {
			const { data: { session } } = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				toast.error('Please sign in to continue');
				setGenerating(false);
				setGenerationSteps(null);
				return;
			}
			const res = await fetch(buildApiUrl(`/api/pages/${id}/brief`), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				if (res.status === 402) {
					toast.error(`Insufficient credits. Need ${data.required ?? briefCost}, have ${data.available ?? creditsRemaining ?? 0}.`);
					return;
				}
				throw new Error(data?.error || 'Failed to generate brief');
			}
			setGenerationSteps((s) =>
				s ? [s[0], { ...s[1], status: 'complete' }] : s
			);
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
	}, [id, isFocusPage, refetch, refetchOrg, briefCost, creditsRemaining]);

	const handleGenerateArticle = useCallback(async () => {
		if (!id) return;
		setGenerating(true);
		setGenerationTitle('Generating article');
		setGenerationSteps([
			{ id: '1', label: 'Analyzing page and context', status: 'active' },
			{ id: '2', label: 'Generating article', status: 'pending' }
		]);
		const advanceToStep2 = setTimeout(() => {
			setGenerationSteps((s) =>
				s ? [{ ...s[0], status: 'complete' }, { ...s[1], status: 'active' }] : s
			);
		}, 600);
		try {
			const { data: { session } } = await supabase.auth.getSession();
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
					toast.error(`Insufficient credits. Need ${data.required ?? articleCost}, have ${data.available ?? creditsRemaining ?? 0}.`);
					return;
				}
				throw new Error(data?.error || 'Failed to generate article');
			}
			setGenerationSteps((s) =>
				s ? [s[0], { ...s[1], status: 'complete' }] : s
			);
			toast.success('Article generated');
			refetch();
			refetchOrg();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to generate article');
		} finally {
			clearTimeout(advanceToStep2);
			setGenerating(false);
			setGenerationSteps(null);
		}
	}, [id, refetch, refetchOrg, articleCost, creditsRemaining]);

	const lowlight = useMemo(() => createLowlight(all), []);

	const initialContent = useMemo(() => {
		if (!page?.content) return null;
		try {
			const parsed = typeof page.content === 'string' ? JSON.parse(page.content) : page.content;
			return parsed?.content ? parsed : null;
		} catch { return null; }
	}, [page?.content]);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({ codeBlock: false, link: false }),
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
				class: 'w-full mx-auto focus:outline-none text-gray-800 dark:text-gray-300 p-10 min-h-[200px]'
			}
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
				schemaGenerated: (page.briefData as { schema_generated?: boolean } | null)?.schema_generated,
				entities: (page.briefData as { entities?: { term: string; competitor_count?: number; must_cover?: boolean }[] } | null)?.entities,
				lsiTerms: (page.briefData as { lsi_terms?: { term: string; competitor_count?: number }[] } | null)?.lsi_terms,
				paaQuestions: (page.briefData as { paa_questions?: { question: string }[] } | null)?.paa_questions,
			});
			setLiveSeoBreakdown(breakdown);
		}, 500);
		return () => clearTimeout(timer);
	}, [editor, page, activeTab, contentVersion]);

	const displaySeoScore = liveSeoBreakdown?.total ?? page?.seoScore ?? 0;

	const setLinkHandler = useCallback(() => {
		if (!editor) return;
		if (editor.isActive('link')) { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
		const previousUrl = editor.getAttributes('link').href;
		const url = window.prompt('URL', previousUrl);
		if (url === null) return;
		if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
		if (!/^https?:\/\//.test(url)) { window.alert('Invalid Link'); return; }
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
			editor.commands.setYoutubeVideo({ src: url, width: 640, height: height ? Math.max(180, parseInt(height, 10)) : 480 });
		}
	}, [editor]);

	const isArticleEditorVisible = activeTab === 'article' && ((page?.wordCount ?? 0) > 0 || showEditorFromScratch);
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
		() => ((page?.briefData as { entities?: BriefEntityData[] } | null)?.entities ?? []),
		[page?.briefData]
	);
	const briefLsiTerms = useMemo(
		() => ((page?.briefData as { lsi_terms?: BriefLsiData[] } | null)?.lsi_terms ?? []),
		[page?.briefData]
	);
	const briefPaaQuestions = useMemo(
		() => ((page?.briefData as { paa_questions?: BriefPaaData[] } | null)?.paa_questions ?? []),
		[page?.briefData]
	);

	// Without entity/LSI/PAA from a brief we cannot score accurately — don't show a misleading score
	const hasSemanticDataFromBrief =
		briefEntities.length > 0 || briefLsiTerms.length > 0 || briefPaaQuestions.length > 0;
	const canShowAccurateScore = hasSemanticDataFromBrief;

	// Determine which LSI / entity terms are "covered" by checking editor content
	const editorPlainText = useMemo(() => editor?.getText()?.toLowerCase() ?? '', [editor, contentVersion]); // eslint-disable-line react-hooks/exhaustive-deps

	const coveredLsi = useMemo(
		() => briefLsiTerms.filter((t) => editorPlainText.includes(t.term.toLowerCase())),
		[briefLsiTerms, editorPlainText]
	);
	const missingLsi = useMemo(
		() => briefLsiTerms.filter((t) => !editorPlainText.includes(t.term.toLowerCase())),
		[briefLsiTerms, editorPlainText]
	);
	const coveredEntities = useMemo(
		() => briefEntities.filter((e) => editorPlainText.includes(e.term.toLowerCase())),
		[briefEntities, editorPlainText]
	);
	const missingEntities = useMemo(
		() => briefEntities.filter((e) => !editorPlainText.includes(e.term.toLowerCase())),
		[briefEntities, editorPlainText]
	);

	// Competitors from brief_data.competitors_raw
	const briefCompetitors = useMemo(
		() => (page?.briefData?.competitors as Array<{ url?: string; title?: string; word_count?: number; h2s?: string[] }>) ??
			  (page?.briefData as { competitors_raw?: Array<{ url?: string; title?: string; word_count?: number; h2s?: string[] }> } | null)?.competitors_raw ?? [],
		[page?.briefData]
	);

	// Article word count (live from editor)
	const liveWordCount = useMemo(
		() => (editor ? editor.storage.characterCount.words() : page?.wordCount ?? 0),
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
				<Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
			</div>
		);
	}

	return (
		<>
			<PageMeta title={page.title} description="Content workspace" />
			{generationSteps && (
				<LoadingStepsModal steps={generationSteps} title={generationTitle} />
			)}

			<div className="flex h-[calc(100vh-80px)] flex-col gap-6">
				{/* ------------------------------------------------------------------ */}
				{/* Page Header */}
				{/* ------------------------------------------------------------------ */}
				<div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<Button
								onClick={() => navigate(`/clusters/${page.clusterId}`)}
								variant="outline"
								size="sm"
								className="border-gray-200 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
							>
								<ArrowLeft className="size-4" />
								Back to Cluster
							</Button>
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
								<h1 className="font-montserrat text-xl font-bold text-gray-900 dark:text-white">
									{page.title}
								</h1>
							</div>
						</div>

						{/* Mode tabs — Focus Page Brief | Article Editor */}
						<div className="flex gap-0 border-b border-gray-200 dark:border-gray-700">
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
						</div>
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
								<span className={`font-montserrat text-2xl font-extrabold ${scoreColor(displaySeoScore)}`}>
									{displaySeoScore}
								</span>
								<span className="ml-1 text-sm text-gray-500 dark:text-gray-400">/115</span>
							</div>
						)}
						<Button variant="outline" size="sm" className="border-gray-200 dark:border-gray-700">
							Export
						</Button>
						<Button
							size="sm"
							className="bg-brand-500 hover:bg-brand-600 text-white"
							disabled={generating || (activeTab === 'brief' ? !hasCreditsForBrief : !hasCreditsForArticle)}
							onClick={activeTab === 'brief' ? handleGenerateBrief : handleGenerateArticle}
						>
							<CreditBadge
								cost={activeTab === 'brief' ? briefCost : articleCost}
								action={showRegenerate ? 'Regenerate' : activeTab === 'brief' ? 'Brief' : 'Article'}
								sufficient={activeTab === 'brief' ? hasCreditsForBrief : hasCreditsForArticle}
							/>
							<Sparkles className="ml-2 size-4" />
							<span className="ml-2">{generating ? 'Generating...' : showRegenerate ? 'Regenerate' : 'Generate'}</span>
						</Button>
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
								: activeTab === 'article' && !canShowAccurateScore
									? "We can't show an SEO score for manually written content without a brief — it would be incomplete and misleading. Generate a brief first to get key concepts and question coverage from search, then write or edit your article. You can change everything after it's generated."
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
				{/* Content area */}
				{/* ------------------------------------------------------------------ */}
				<div className="flex min-w-0 flex-1 gap-6 overflow-hidden">
					{/* Editor / Brief area */}
					<div
						className={`scrollbar-branded w-4/5 min-w-0 flex-1 ${
							activeTab === 'article' && (page.wordCount > 0 || showEditorFromScratch)
								? 'flex flex-col overflow-hidden'
								: 'overflow-y-auto'
						}`}
					>
						{/* ========================================================== */}
						{/* BRIEF MODE */}
						{/* ========================================================== */}
						{activeTab === 'brief' ? (
							<>
								{!hasBrief ? (
									<div className="mt-16 flex flex-col items-center text-center">
										<Sparkles className="text-brand-500 dark:text-brand-400 size-14" />
										<h2 className="font-montserrat mt-4 text-xl font-bold text-gray-900 dark:text-white">
											Ready to generate your content brief?
										</h2>
										<p className="mt-2 max-w-sm text-sm text-gray-600 dark:text-gray-400">
											We&apos;ll analyze Google search results, competitors, and related questions to create a structured brief for this focus page.
										</p>
										<Button
											className="bg-brand-500 hover:bg-brand-600 mt-6 text-white"
											disabled={generating || !hasCreditsForBrief}
											onClick={handleGenerateBrief}
										>
											<CreditBadge cost={briefCost} action="Brief" sufficient={hasCreditsForBrief} />
											<Sparkles className="ml-2 size-4" />
											<span className="ml-2">{generating ? 'Generating...' : 'Generate Brief'}</span>
										</Button>
									</div>
								) : (
									<>
										{/* Word Count Range Visualizer — Section 7.7 */}
										<div className="mx-auto mb-2 max-w-3xl">
											<WordCountVisualizer current={page?.wordCount ?? 0} target={page?.targetWordCount ?? 0} />
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
															{section.heading && (section.type === 'H2' || section.type === 'h2') && (
																<PassageReadyIndicator heading={section.heading} />
															)}
															{(section.cro_note ?? (section as { croFlag?: string }).croFlag) && (
																<span className="bg-warning-50 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400 flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold">
																	<AlertTriangle className="size-3" />
																	{section.cro_note ?? (section as { croFlag?: string }).croFlag}
																</span>
															)}
														</div>
														<button className="opacity-0 transition-opacity group-hover:opacity-100">
															<span className="text-brand-600 dark:text-brand-400 flex items-center gap-1 text-xs">
																<Sparkles className="size-3" />
																Rewrite section
															</span>
															<CreditBadge cost={5} action="Section" sufficient />
														</button>
													</div>
													<div className="rounded-lg bg-gray-100 p-4 text-sm leading-relaxed text-gray-900 dark:bg-gray-800 dark:text-white">
														{section.guidance ?? (section as { content?: string }).content ?? ''}
													</div>
													{((section.entitiesCovered as string[] | undefined)?.length ?? section.entities?.length ?? (section.entitiesMissing as string[] | undefined)?.length) ? (
														<div className="mt-3 flex flex-wrap gap-2">
															{(section.entitiesCovered ?? section.entities ?? []).map((e) => (
																<span key={e} className="bg-success-50 text-success-600 dark:bg-success-900/30 dark:text-success-400 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">{e}</span>
															))}
															{(section.entitiesMissing as string[] | undefined)?.map((e) => (
																<span key={e} className="bg-error-50 text-error-600 dark:bg-error-900/30 dark:text-error-400 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">{e}</span>
															))}
														</div>
													) : null}
												</div>
											))}
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
											We&apos;ll analyze the top search results and write an SEO-optimized draft based on what&apos;s working for your competitors.
										</p>
										<Button
											className="bg-brand-500 hover:bg-brand-600 mt-6 text-white"
											disabled={generating || !hasCreditsForArticle}
											onClick={handleGenerateArticle}
										>
											<CreditBadge cost={articleCost} action="Article" sufficient={hasCreditsForArticle} />
											<Sparkles className="ml-2 size-4" />
											<span className="ml-2">{generating ? 'Generating...' : 'Generate Article'}</span>
										</Button>
										<hr className="my-6 w-sm border-t border-gray-200 dark:border-gray-600" />
										<div className="text-center text-sm text-gray-500 dark:text-gray-400">
											Or you can start from scratch and write your own article.
										</div>
										<Button variant="flat" size="sm" className="mt-4" onClick={() => setShowEditorFromScratch(true)}>
											Start from scratch
										</Button>
									</div>
								) : (
									<>
										{/* Tiptap Toolbar */}
										{editor && (
											<div className="z-10 mb-4 flex shrink-0 flex-wrap items-center justify-between gap-1 rounded-lg border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
												<Tooltip content="Align left" tooltipPosition="bottom">
													<button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`rounded p-2 transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'border border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white' : 'border border-transparent hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400'}`} aria-label="Align left"><AlignLeft className="size-4" /></button>
												</Tooltip>
												<Tooltip content="Align center" tooltipPosition="bottom">
													<button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`rounded p-2 transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'border border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white' : 'border border-transparent hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400'}`} aria-label="Align center"><AlignCenter className="size-4" /></button>
												</Tooltip>
												<Tooltip content="Align right" tooltipPosition="bottom">
													<button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`rounded p-2 transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'border border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white' : 'border border-transparent hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400'}`} aria-label="Align right"><AlignRight className="size-4" /></button>
												</Tooltip>
												<Tooltip content="Align justify" tooltipPosition="bottom">
													<button onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={`rounded p-2 transition-colors ${editor.isActive({ textAlign: 'justify' }) ? 'border border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white' : 'border border-transparent hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400'}`} aria-label="Align justify"><AlignJustify className="size-4" /></button>
												</Tooltip>
												<Tooltip content="Unset text align" tooltipPosition="bottom">
													<button onClick={() => editor.chain().focus().unsetTextAlign().run()} className="rounded border border-transparent p-2 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400" aria-label="Unset text align"><Columns className="size-4" /></button>
												</Tooltip>
												<div className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700" />
												<Tooltip content="Image" tooltipPosition="bottom">
													<button onClick={addImageHandler} className="rounded border border-transparent p-2 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400" aria-label="Image"><ImageIcon className="size-4" /></button>
												</Tooltip>
												<div className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700" />
												<Tooltip content="Bullet list" tooltipPosition="bottom">
													<button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`rounded p-2 transition-colors ${editor.isActive('bulletList') ? 'border border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white' : 'border border-transparent hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400'}`} aria-label="Bullet list"><List className="size-4" /></button>
												</Tooltip>
												<Tooltip content="Ordered list" tooltipPosition="bottom">
													<button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`rounded p-2 transition-colors ${editor.isActive('orderedList') ? 'border border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white' : 'border border-transparent hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400'}`} aria-label="Ordered list"><ListOrdered className="size-4" /></button>
												</Tooltip>
												<Tooltip content="Code block" tooltipPosition="bottom">
													<button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`rounded p-2 transition-colors ${editor.isActive('codeBlock') ? 'border border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white' : 'border border-transparent hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400'}`} aria-label="Code block"><Code className="size-4" /></button>
												</Tooltip>
												<Tooltip content="Blockquote" tooltipPosition="bottom">
													<button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`rounded p-2 transition-colors ${editor.isActive('blockquote') ? 'border border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white' : 'border border-transparent hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400'}`} aria-label="Blockquote"><Quote className="size-4" /></button>
												</Tooltip>
												<Tooltip content="Horizontal rule" tooltipPosition="bottom">
													<button onClick={() => editor.chain().focus().setHorizontalRule().run()} className="rounded border border-transparent p-2 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400" aria-label="Horizontal rule"><Minus className="size-4" /></button>
												</Tooltip>
												<Tooltip content="Hard break" tooltipPosition="bottom">
													<button onClick={() => editor.chain().focus().setHardBreak().run()} className="rounded border border-transparent p-2 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400" aria-label="Hard break"><WrapText className="size-4" /></button>
												</Tooltip>
												<div className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700" />
												<Tooltip content="Undo" tooltipPosition="bottom">
													<button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="rounded border border-transparent p-2 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400" aria-label="Undo"><RotateCcw className="size-4" /></button>
												</Tooltip>
												<Tooltip content="Redo" tooltipPosition="bottom">
													<button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="rounded border border-transparent p-2 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400" aria-label="Redo"><RotateCw className="size-4" /></button>
												</Tooltip>
												<Tooltip content="Unset all marks" tooltipPosition="bottom">
													<button onClick={() => editor.chain().focus().unsetAllMarks().run()} className="rounded border border-transparent p-2 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400" aria-label="Unset all marks"><Eraser className="size-4" /></button>
												</Tooltip>
												<Tooltip content="Clear nodes" tooltipPosition="bottom">
													<button onClick={() => editor.chain().focus().clearNodes().run()} className="rounded border border-transparent p-2 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400" aria-label="Clear nodes"><ScrollText className="size-4" /></button>
												</Tooltip>
												<Tooltip content="YouTube" tooltipPosition="bottom">
													<button onClick={addYoutubeHandler} className="rounded border border-transparent p-2 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400" aria-label="YouTube"><YoutubeIcon className="size-4" /></button>
												</Tooltip>
												<Tooltip content="Styles you see here may not look the same on your website, as they depend on your website's styling." tooltipPosition="bottom" usePortal className="max-w-xs text-center whitespace-normal">
													<button type="button" className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300" aria-label="Editor styling note"><Info className="size-4" /></button>
												</Tooltip>
											</div>
										)}

										<div className="scrollbar-branded relative flex min-h-0 min-w-0 flex-1 flex-col overflow-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
											{editor && (
												<BubbleMenu editor={editor} className="flex flex-wrap items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
													<Tooltip content="Bold" tooltipPosition="bottom"><button onClick={() => editor.chain().focus().toggleBold().run()} className={`rounded p-1.5 transition-colors ${editor.isActive('bold') ? 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`} aria-label="Bold"><Bold className="size-4" /></button></Tooltip>
													<Tooltip content="Italic" tooltipPosition="bottom"><button onClick={() => editor.chain().focus().toggleItalic().run()} className={`rounded p-1.5 transition-colors ${editor.isActive('italic') ? 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`} aria-label="Italic"><Italic className="size-4" /></button></Tooltip>
													<Tooltip content="Strikethrough" tooltipPosition="bottom"><button onClick={() => editor.chain().focus().toggleStrike().run()} className={`rounded p-1.5 transition-colors ${editor.isActive('strike') ? 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`} aria-label="Strikethrough"><Strikethrough className="size-4" /></button></Tooltip>
													<Tooltip content="Underline" tooltipPosition="bottom"><button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`rounded p-1.5 transition-colors ${editor.isActive('underline') ? 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`} aria-label="Underline"><UnderlineIcon className="size-4" /></button></Tooltip>
													<Tooltip content="Code" tooltipPosition="bottom"><button onClick={() => editor.chain().focus().toggleCode().run()} className={`rounded p-1.5 transition-colors ${editor.isActive('code') ? 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`} aria-label="Code"><Code className="size-4" /></button></Tooltip>
													<div className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-600" />
													<Tooltip content="Paragraph" tooltipPosition="bottom"><button onClick={() => editor.chain().focus().setParagraph().run()} className={`rounded p-2 transition-colors ${editor.isActive('paragraph') ? 'border border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white' : 'border border-transparent hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400'}`} aria-label="Paragraph"><Type className="size-4" /></button></Tooltip>
													{[1, 2, 3, 4, 5, 6].map((level) => (
														<Tooltip key={level} content={`Heading ${level}`} tooltipPosition="bottom">
															<button onClick={() => editor.chain().focus().toggleHeading({ level: level as 1|2|3|4|5|6 }).run()} className={`rounded p-2 transition-colors ${editor.isActive('heading', { level }) ? 'border border-gray-300 bg-gray-100 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white' : 'border border-transparent hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-400'}`} aria-label={`Heading ${level}`}>
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
													<Tooltip content="Link" tooltipPosition="bottom"><button onClick={setLinkHandler} className={`rounded p-1.5 transition-colors ${editor.isActive('link') ? 'bg-gray-200 text-gray-900 dark:bg-gray-600 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`} aria-label="Link"><LinkIcon className="size-4" /></button></Tooltip>
												</BubbleMenu>
											)}
											<EditorContent
												editor={editor}
												className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden [&_.tiptap]:min-h-0 [&_.tiptap]:min-w-0 [&_.tiptap]:flex-1"
											/>
											{page.targetWordCount > 0 && (
												<div className="absolute right-3 bottom-3">
													<span className={`text-xs ${
														liveWordCount >= Math.round(page.targetWordCount * 0.7) && liveWordCount <= Math.round(page.targetWordCount * 1.3)
															? 'text-success-500 dark:text-success-400'
															: liveWordCount > Math.round(page.targetWordCount * 1.3)
																? 'text-warning-500 dark:text-warning-400'
																: 'text-gray-500 dark:text-gray-400'
													}`}>
														{liveWordCount.toLocaleString()} / {page.targetWordCount.toLocaleString()} target
													</span>
												</div>
											)}
										</div>
									</>
								)}
							</>
						)}
					</div>

					{/* ---------------------------------------------------------------- */}
					{/* Intelligence panel */}
					{/* ---------------------------------------------------------------- */}
					<div className="w-1/3 max-w-75 shrink-0 rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
						<div className="flex justify-between border-b border-gray-200 dark:border-gray-700">
							{(['seo', 'competitors', 'cro', 'entities'] as const).map((tab) => (
								<button
									key={tab}
									onClick={() => setActiveIntelTab(tab)}
									className={`px-3 py-3 text-[13px] font-medium capitalize ${
										activeIntelTab === tab
											? 'border-brand-500 text-brand-600 dark:text-brand-400 border-b-2'
											: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
									}`}
								>
									{tab === 'seo' ? 'SEO' : tab === 'cro' ? 'CRO' : tab}
								</button>
							))}
						</div>

						<div className="scrollbar-branded h-[calc(100%-48px)] overflow-y-auto p-4 text-gray-900 dark:text-white">
							{/* ====================================================== */}
							{/* SEO TAB — UPSA 4-module breakdown */}
							{/* ====================================================== */}
							{activeIntelTab === 'seo' && (
								<>
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
												<span className={`font-montserrat text-5xl font-extrabold ${scoreColor(displaySeoScore)}`}>
													{displaySeoScore}
												</span>
												<span className="ml-1 text-base text-gray-500 dark:text-gray-400">/115</span>
												<div className="text-xs tracking-wide text-gray-500 uppercase dark:text-gray-400">
													{liveSeoBreakdown ? 'Live SEO Score' : 'SEO Score'}
												</div>
											</div>

											{/* Skyscraper Warning */}
											{liveSeoBreakdown?.skyscraperWarning && (
												<div className="bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-700 mb-4 rounded-lg border p-3">
													<div className="text-warning-700 dark:text-warning-400 flex items-start gap-2 text-[13px] font-semibold">
														<AlertTriangle className="mt-0.5 size-4 shrink-0" />
														<span>Skyscraper Alert: Your content covers the same ground as every competitor. Add original data, an expert quote, or first-hand experience to earn the information gain bonus.</span>
													</div>
												</div>
											)}

											{liveSeoBreakdown ? (
										<div className="space-y-3">
											{/* Module 1 — Structural */}
											<div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
												<div className="mb-2 flex items-center justify-between">
													<span className="text-[12px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Structural</span>
													<span className={`text-[13px] font-bold ${liveSeoBreakdown.module1.score >= 30 ? 'text-success-600 dark:text-success-400' : liveSeoBreakdown.module1.score >= 15 ? 'text-warning-600 dark:text-warning-400' : 'text-error-600 dark:text-error-400'}`}>
														{liveSeoBreakdown.module1.score}/40
													</span>
												</div>
												<div className="space-y-1.5 text-[12px]">
													<div className="flex items-center justify-between">
														<span className="text-gray-600 dark:text-gray-400">Keyword in title</span>
														<span className={liveSeoBreakdown.module1.keywordInTitle ? 'text-success-600 dark:text-success-400' : 'text-error-500 dark:text-error-400'}>{liveSeoBreakdown.module1.keywordInTitle ? '✓ +15' : '✗ 0'}</span>
													</div>
													<div className="flex items-center justify-between">
														<span className="text-gray-600 dark:text-gray-400">Keyword in H1</span>
														<span className={liveSeoBreakdown.module1.keywordInH1 ? 'text-success-600 dark:text-success-400' : 'text-error-500 dark:text-error-400'}>{liveSeoBreakdown.module1.keywordInH1 ? '✓ +15' : '✗ 0'}</span>
													</div>
													<div className="flex items-center justify-between">
														<span className="text-gray-600 dark:text-gray-400">In first 100 words</span>
														<span className={liveSeoBreakdown.module1.keywordInFirst100 ? 'text-success-600 dark:text-success-400' : 'text-error-500 dark:text-error-400'}>{liveSeoBreakdown.module1.keywordInFirst100 ? '✓ +10' : '✗ 0'}</span>
													</div>
												</div>
											</div>

											{/* Module 2 — Semantic */}
											<div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
												<div className="mb-2 flex items-center justify-between">
													<span className="text-[12px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Semantic</span>
													<span className={`text-[13px] font-bold ${liveSeoBreakdown.module2.score >= 15 ? 'text-success-600 dark:text-success-400' : liveSeoBreakdown.module2.score >= 8 ? 'text-warning-600 dark:text-warning-400' : 'text-error-600 dark:text-error-400'}`}>
														{liveSeoBreakdown.module2.score}/20
													</span>
												</div>
												<div className="space-y-1.5 text-[12px]">
													<div className="flex items-center justify-between">
														<span className="text-gray-600 dark:text-gray-400">Key concepts covered</span>
														<span className="text-gray-700 dark:text-gray-300">{Math.round(liveSeoBreakdown.module2.entityPct * 100)}% (+{liveSeoBreakdown.module2.entityCoverage})</span>
													</div>
													<div className="flex items-center justify-between">
														<span className="text-gray-600 dark:text-gray-400">Related topics covered</span>
														<span className="text-gray-700 dark:text-gray-300">{Math.round(liveSeoBreakdown.module2.lsiPct * 100)}% (+{liveSeoBreakdown.module2.lsiCoverage})</span>
													</div>
												</div>
											</div>

											{/* Module 3 — Content Quality */}
											<div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
												<div className="mb-2 flex items-center justify-between">
													<span className="text-[12px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Content Quality</span>
													<span className={`text-[13px] font-bold ${liveSeoBreakdown.module3.score >= 18 ? 'text-success-600 dark:text-success-400' : liveSeoBreakdown.module3.score >= 10 ? 'text-warning-600 dark:text-warning-400' : 'text-error-600 dark:text-error-400'}`}>
														{liveSeoBreakdown.module3.score}/25
													</span>
												</div>
												<div className="space-y-1.5 text-[12px]">
													<div className="flex items-center justify-between">
														<span className="text-gray-600 dark:text-gray-400">Passage-ready H2s ({liveSeoBreakdown.module3.passageReadyH2Count}/{liveSeoBreakdown.module3.h2Count})</span>
														<span className="text-gray-700 dark:text-gray-300">+{liveSeoBreakdown.module3.passageReadyH2Score}</span>
													</div>
													<div className="flex items-center justify-between">
														<span className="text-gray-600 dark:text-gray-400">Word count ({liveSeoBreakdown.module3.wordCountCurrent.toLocaleString()}/{page.targetWordCount.toLocaleString()})</span>
														<span className={liveSeoBreakdown.module3.wordCountScore >= 8 ? 'text-success-600 dark:text-success-400' : liveSeoBreakdown.module3.wordCountScore >= 5 ? 'text-warning-600 dark:text-warning-400' : 'text-error-500 dark:text-error-400'}>+{liveSeoBreakdown.module3.wordCountScore}</span>
													</div>
													<div className="flex items-center justify-between">
														<span className="text-gray-600 dark:text-gray-400">Questions answered</span>
														<span className="text-gray-700 dark:text-gray-300">+{liveSeoBreakdown.module3.paaCoverageScore}</span>
													</div>
													<div className="flex items-center justify-between">
														<span className="text-gray-600 dark:text-gray-400">Rich elements</span>
														<span className="text-gray-700 dark:text-gray-300">+{liveSeoBreakdown.module3.richElementsScore}</span>
													</div>
												</div>
											</div>

											{/* Module 4 — UX Signals */}
											<div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
												<div className="mb-2 flex items-center justify-between">
													<span className="text-[12px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">UX Signals</span>
													<span className={`text-[13px] font-bold ${liveSeoBreakdown.module4.score >= 10 ? 'text-success-600 dark:text-success-400' : liveSeoBreakdown.module4.score >= 5 ? 'text-warning-600 dark:text-warning-400' : 'text-error-600 dark:text-error-400'}`}>
														{liveSeoBreakdown.module4.score}/15
													</span>
												</div>
												<div className="space-y-1.5 text-[12px]">
													<div className="flex items-center justify-between">
														<span className="text-gray-600 dark:text-gray-400">Internal links ({liveSeoBreakdown.module4.internalLinksCount})</span>
														<span className={liveSeoBreakdown.module4.internalLinksScore >= 8 ? 'text-success-600 dark:text-success-400' : liveSeoBreakdown.module4.internalLinksScore >= 4 ? 'text-warning-600 dark:text-warning-400' : 'text-error-500 dark:text-error-400'}>+{liveSeoBreakdown.module4.internalLinksScore}</span>
													</div>
													<div className="flex items-center justify-between">
														<span className="text-gray-600 dark:text-gray-400">Google search preview</span>
														<span className={liveSeoBreakdown.module4.hasMetaDescription ? 'text-success-600 dark:text-success-400' : 'text-error-500 dark:text-error-400'}>{liveSeoBreakdown.module4.hasMetaDescription ? '✓ +4' : '✗ 0'}</span>
													</div>
													<div className="flex items-center justify-between">
														<span className="text-gray-600 dark:text-gray-400">Schema markup</span>
														<span className={liveSeoBreakdown.module4.hasSchema ? 'text-success-600 dark:text-success-400' : 'text-gray-400 dark:text-gray-500'}>{liveSeoBreakdown.module4.hasSchema ? '✓ +3' : '— 0'}</span>
													</div>
												</div>
											</div>

											{/* IGS Bonus */}
											<div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
												<div className="mb-2 flex items-center justify-between">
													<span className="text-[12px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Information Gain Bonus</span>
													<span className={`text-[13px] font-bold ${liveSeoBreakdown.igs.score >= 8 ? 'text-success-600 dark:text-success-400' : liveSeoBreakdown.igs.score >= 3 ? 'text-warning-600 dark:text-warning-400' : 'text-gray-400 dark:text-gray-500'}`}>
														+{liveSeoBreakdown.igs.score}/15
													</span>
												</div>
												<div className="space-y-1.5 text-[12px]">
													{[
														{ label: 'Original data / research', pass: liveSeoBreakdown.igs.originalResearch, pts: 5 },
														{ label: 'Expert quotes', pass: liveSeoBreakdown.igs.expertQuotes, pts: 4 },
														{ label: 'First-hand experience', pass: liveSeoBreakdown.igs.firstHand, pts: 3 },
														{ label: 'Unique visualisation / table', pass: liveSeoBreakdown.igs.uniqueViz, pts: 2 },
														{ label: 'Contrarian perspective', pass: liveSeoBreakdown.igs.contrarian, pts: 1 },
													].map(({ label, pass, pts }) => (
														<div key={label} className="flex items-center justify-between">
															<span className="text-gray-600 dark:text-gray-400">{label}</span>
															<span className={pass ? 'text-success-600 dark:text-success-400' : 'text-gray-400 dark:text-gray-500'}>{pass ? `✓ +${pts}` : `— 0`}</span>
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
														{['Structural (0–40)', 'Semantic (0–20)', 'Content Quality (0–25)', 'UX Signals (0–15)', 'Information Gain Bonus (0–15)'].map((label) => (
															<div key={label} className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 dark:border-gray-700">
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
											<div key={c.url ?? i} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
												<div className="text-[13px] font-semibold text-gray-900 dark:text-white">
													{c.title ?? c.url ?? 'Competitor'}
												</div>
												<div className="mt-1 flex gap-3 text-xs text-gray-500 dark:text-gray-400">
													{c.word_count != null && <span>{c.word_count.toLocaleString()} words</span>}
													{c.h2s != null && <span>{c.h2s.length} headings</span>}
												</div>
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
							{/* CRO TAB */}
							{/* ====================================================== */}
							{activeIntelTab === 'cro' && (
								<div>
									{briefSections.some((s) => s.cro_note) ? (
										<div className="space-y-2 text-[13px]">
											{briefSections
												.filter((s) => s.cro_note)
												.map((s) => (
													<div key={s.heading ?? s.type ?? ''} className="rounded-lg border border-gray-200 p-2 dark:border-gray-700">
														<div className="font-semibold text-gray-900 dark:text-white">
															{s.heading ?? s.type ?? 'Section'}
														</div>
														<div className="mt-1 text-gray-600 dark:text-gray-400">{s.cro_note}</div>
													</div>
												))}
										</div>
									) : (
										<p className="text-[13px] text-gray-500 dark:text-gray-400">
											No CRO notes yet. Generate a brief to get conversion tips per section.
										</p>
									)}
								</div>
							)}

							{/* ====================================================== */}
							{/* ENTITIES TAB — Three-section panel (Section 7.7 + 17.7) */}
							{/* ====================================================== */}
							{activeIntelTab === 'entities' && (
								<div className="space-y-5">
									{briefLsiTerms.length === 0 && briefEntities.length === 0 && briefPaaQuestions.length === 0 ? (
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
													<div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
														Related Topics Google Expects to See
													</div>
													{coveredLsi.length > 0 && (
														<>
															<div className="text-success-600 dark:text-success-400 mb-1 flex items-center gap-1 text-[11px] font-semibold">
																<Check className="size-3" /> Covered
															</div>
															<div className="mb-2 flex flex-wrap gap-1">
																{coveredLsi.map((t) => (
																	<span key={t.term} className="bg-success-50 text-success-600 dark:bg-success-900/30 dark:text-success-400 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
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
																		content={t.competitor_count != null ? `Found in ${t.competitor_count} competitor pages` : 'Not yet in your content'}
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
													<div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
														Key Concepts to Establish Expertise
													</div>
													{coveredEntities.length > 0 && (
														<>
															<div className="text-success-600 dark:text-success-400 mb-1 flex items-center gap-1 text-[11px] font-semibold">
																<Check className="size-3" /> Covered
															</div>
															<div className="mb-2 flex flex-wrap gap-1">
																{coveredEntities.map((e) => (
																	<span key={e.term} className="bg-success-50 text-success-600 dark:bg-success-900/30 dark:text-success-400 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
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
																	<span key={e.term} className="bg-error-50 text-error-600 dark:bg-error-900/30 dark:text-error-400 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
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
													<div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
														Questions Your Audience Is Asking
													</div>
													<div className="space-y-1.5">
														{briefPaaQuestions.map((q, i) => {
															const answered = q.answered_in_content ?? false;
															return (
																<div key={i} className="flex items-start gap-2 rounded-lg border border-gray-200 p-2 text-[12px] dark:border-gray-700">
																	<span className={`mt-0.5 shrink-0 ${answered ? 'text-success-500 dark:text-success-400' : 'text-gray-400 dark:text-gray-500'}`}>
																		{answered ? <Check className="size-3.5" /> : <X className="size-3.5" />}
																	</span>
																	<span className="text-gray-700 dark:text-gray-300">{q.question}</span>
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
		</>
	);
}
