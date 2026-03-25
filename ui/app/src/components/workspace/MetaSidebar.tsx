/**
 * MetaSidebar — Page SEO Settings panel
 *
 * Shows and edits the SEO metadata for a workspace page:
 *   - Suggested URL slug (derived from keyword, informational)
 *   - Page title
 *   - Meta title  (≤60 chars — US8595225B1 click compulsion)
 *   - Meta description (150-160 chars — keyword + value prop + CTA)
 *
 * Metadata is auto-generated during article/focus-page generation.
 * Users can edit fields directly and save, or hit "Regenerate with AI"
 * (3 credits) to get fresh AI suggestions and click to apply them.
 *
 * Science refs:
 *   - US8595225B1 — title accuracy prevents bounce → protects Navboost
 *   - SEO_Dissertation §4.2 — meta title keyword placement
 *   - The_Complete_SEO_System §5.1 — meta description CTA + value prop
 */

import React, { useState, useEffect, useRef } from 'react';
import {
	X,
	Tag,
	Info,
	Loader2,
	Check,
	RefreshCw,
	Save,
	Link2,
	ChevronRight,
	Code2,
	Copy,
	ChevronDown
} from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabaseClient';
import { api } from '../../utils/api';
import { CreditCost } from '../shared/CreditBadge';
import { CREDIT_COSTS } from '../../lib/credits';
import type { PageDetail } from '../../hooks/usePage';
import type { Site } from '../../types/site';
import { generateSchemaMarkup } from '../../lib/schemaMarkup';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '../ui/dialog';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-');
}

function CharBar({
	value,
	max,
	minGood,
	label
}: {
	value: number;
	max: number;
	minGood?: number;
	label?: string;
}) {
	const pct = Math.min((value / max) * 100, 100);
	const tooLong = value > max;
	const tooShort = minGood !== undefined && value < minGood;
	const isGood = !tooLong && !tooShort;
	return (
		<div className="mt-1.5 flex items-center gap-2">
			<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
				<div
					className={`h-1.5 rounded-full transition-all ${tooLong ? 'bg-red-500' : tooShort ? 'bg-amber-400' : 'bg-green-500'}`}
					style={{ width: `${pct}%` }}
				/>
			</div>
			<span
				className={`text-[11px] font-medium tabular-nums ${tooLong ? 'text-red-500' : tooShort ? 'text-amber-500' : 'text-green-600 dark:text-green-400'}`}
			>
				{value}
				{label ? ` / ${label}` : ''}
			</span>
			{isGood && value > 0 && <Check className="size-3 text-green-500" />}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
	open: boolean;
	onClose: () => void;
	page: PageDetail;
	siteId: string;
	onSaved: () => void;
	site: Site | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MetaSidebar({ open, onClose, page, siteId, onSaved, site }: Props) {
	const [suggestedSlug, setSuggestedSlug] = useState('');
	const [localTitle, setLocalTitle] = useState('');
	const [localMetaTitle, setLocalMetaTitle] = useState('');
	const [localMetaDesc, setLocalMetaDesc] = useState('');
	const [saving, setSaving] = useState(false);
	const [regenerating, setRegenerating] = useState(false);
	const [suggestions, setSuggestions] = useState<{
		titles: string[];
		descriptions: string[];
	} | null>(null);
	const [urlChangeConfirmOpen, setUrlChangeConfirmOpen] = useState(false);
	const [urlChangeConfirmText, setUrlChangeConfirmText] = useState('');
	const titleRef = useRef<HTMLInputElement>(null);
	const slugRef = useRef<HTMLInputElement>(null);
	// Sync from page record whenever it changes or the sidebar opens
	useEffect(() => {
		if (open) {
			setSuggestedSlug(slugify(page.slug ?? page.keyword ?? page.title));
			setLocalTitle(page.title ?? '');
			setLocalMetaTitle(page.metaTitle ?? '');
			setLocalMetaDesc(page.metaDescription ?? '');
			setSuggestions(null);
		}
	}, [open, page.slug, page.keyword, page.title, page.metaTitle, page.metaDescription]);

	// Focus first field when sidebar opens
	useEffect(() => {
		if (open) {
			setTimeout(() => slugRef.current?.focus(), 80);
		}
	}, [open]);

	// Keyword presence in title front — loose word-level match (Google tolerates reordering)
	const kwInFirst30 = (() => {
		if (!localMetaTitle.length || !page.keyword) return false;
		const titleLower = localMetaTitle.toLowerCase();
		const frontLen = Math.min(50, titleLower.length); // first ~50 chars (SERP cutoff)
		const front = titleLower.slice(0, frontLen);
		const kwWords = page.keyword
			.toLowerCase()
			.split(/\s+/)
			.filter((w) => w.length >= 2);
		if (kwWords.length === 0) return false;
		const matches = kwWords.filter((w) => front.includes(w)).length;
		return matches >= Math.ceil(kwWords.length * 0.75); // 75%+ of keyword words in front
	})();

	// -----------------------------------------------------------------------
	// Save (L8: URL slug change warning for published pages)
	// -----------------------------------------------------------------------
	const performSave = async () => {
		setSaving(true);
		try {
			const baseUrl = site?.url?.replace(/\/$/, '') || '';
			const newSlug = suggestedSlug.trim() || null;
			const publishedUrl = newSlug
				? baseUrl
					? `${baseUrl}/${newSlug}`
					: `/${newSlug}`
				: null;

			const { error } = await supabase
				.from('pages')
				.update({
					title: localTitle.trim() || page.title,
					meta_title: localMetaTitle.trim() || null,
					meta_description: localMetaDesc.trim() || null,
					published_url: publishedUrl
				})
				.eq('id', page.id);
			if (error) throw error;
			toast.success('Page settings saved');
			onSaved();
		} catch {
			toast.error('Failed to save — please try again');
		} finally {
			setSaving(false);
		}
	};

	const handleSave = async () => {
		const newSlugNorm = suggestedSlug.trim() || null;
		const currentSlugNorm = (page.slug ?? '').trim() || null;
		// L8: Only warn when changing an existing published URL (not first-time set)
		const slugIsChanging = page.slug != null && newSlugNorm !== currentSlugNorm;
		const isPublished = page.status === 'published';
		const needsUrlChangeWarning = slugIsChanging && isPublished;

		if (needsUrlChangeWarning) {
			setUrlChangeConfirmText('');
			setUrlChangeConfirmOpen(true);
			return;
		}
		await performSave();
	};

	const handleUrlChangeConfirm = async () => {
		if (urlChangeConfirmText.trim() !== 'CHANGE URL') return;
		setUrlChangeConfirmOpen(false);
		setUrlChangeConfirmText('');
		await performSave();
	};

	// -----------------------------------------------------------------------
	// Regenerate with AI
	// -----------------------------------------------------------------------
	const handleRegenerate = async () => {
		if (!siteId || !page.keyword) return;
		setRegenerating(true);
		setSuggestions(null);
		try {
			const resp = await api.post(`/api/rankings/${siteId}/meta-suggestions`, {
				keyword: page.keyword,
				pageTitle: localTitle || page.title,
				content: typeof page.content === 'string' ? page.content.slice(0, 400) : ''
			});
			if (!resp.ok) {
				const err = await resp.json().catch(() => ({}));
				if (resp.status === 402) {
					toast.error(`Not enough credits — need ${err.required}, have ${err.available}`);
				} else {
					toast.error(err.error || 'Failed to generate suggestions');
				}
				return;
			}
			const data = await resp.json();
			setSuggestions({
				titles: data.data?.suggestions?.titles ?? [],
				descriptions: data.data?.suggestions?.descriptions ?? []
			});
		} catch {
			toast.error('Network error — please try again');
		} finally {
			setRegenerating(false);
		}
	};

	// -----------------------------------------------------------------------
	// Render
	// -----------------------------------------------------------------------
	return (
		<>
			{/* Backdrop */}
			{open && (
				<div className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40" onClick={onClose} />
			)}

			{/* Panel */}
			<div
				className={`fixed top-0 right-0 z-50 flex h-full w-[400px] flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:border-gray-700 dark:bg-gray-900 ${
					open ? 'translate-x-0' : 'translate-x-full'
				}`}
			>
				{/* Header */}
				<div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
					<div className="flex items-center gap-2">
						<Tag className="text-brand-500 size-4" />
						<h2 className="font-montserrat text-sm font-bold text-gray-900 dark:text-white">
							Page Settings
						</h2>
					</div>
					<button
						onClick={onClose}
						className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
					>
						<X className="size-4" />
					</button>
				</div>

				{/* Body — scrollable */}
				<div className="scrollbar-branded flex-1 space-y-6 overflow-y-auto px-5 py-5">
					{/* ── Keyword context pill ── */}
					<div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50">
						<Tag className="size-3 flex-shrink-0 text-gray-400" />
						<p className="text-[12px] text-gray-600 dark:text-gray-400">
							Target keyword:{' '}
							<span className="text-brand-600 dark:text-brand-400 font-mono font-semibold">
								{page.keyword || '—'}
							</span>
						</p>
					</div>

					{/* ── URL Structure ── */}
					<section>
						<SectionLabel icon={<Link2 className="size-3.5" />} title="URL Structure" />
						{/* <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800/50">
							<p className="font-mono text-[12px] text-gray-700 dark:text-gray-300">
								/<span className="text-brand-600 dark:text-brand-400">{suggestedSlug}</span>
							</p>
						</div> */}
						<input
							ref={slugRef}
							type="text"
							value={suggestedSlug}
							onChange={(e) => setSuggestedSlug(e.target.value)}
							placeholder="Enter page slug…"
							className="focus:border-brand-500 focus:ring-brand-500/20 mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 ring-0 transition outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
						/>
						<Tip>
							Keyword-only slug, hyphen-separated, no stop words. Set this in your CMS or site
							platform.
						</Tip>
					</section>

					{/* ── Page Title ── */}
					<section>
						<SectionLabel icon={<ChevronRight className="size-3.5" />} title="Page Title" />
						<input
							ref={titleRef}
							type="text"
							value={localTitle}
							onChange={(e) => setLocalTitle(e.target.value)}
							placeholder="Enter page title…"
							className="focus:border-brand-500 focus:ring-brand-500/20 mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 ring-0 transition outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
						/>
						<Tip>Used as the H1 / browser tab title. Not the same as your meta title.</Tip>
					</section>

					{/* ── Meta Title ── */}
					<section>
						<div className="flex items-center justify-between">
							<SectionLabel icon={<Tag className="size-3.5" />} title="Meta Title" />
							<span className="text-[10px] font-medium text-gray-400">≤ 60 chars</span>
						</div>
						<input
							type="text"
							value={localMetaTitle}
							onChange={(e) => setLocalMetaTitle(e.target.value)}
							placeholder="Primary Keyword — Brand Name"
							className="focus:border-brand-500 focus:ring-brand-500/20 mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 ring-0 transition outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
						/>
						<CharBar value={localMetaTitle.length} max={60} label="60" />

						{/* Keyword placement indicator */}
						{localMetaTitle.length > 0 && (
							<div
								className={`mt-1.5 flex items-center gap-1.5 text-[11px] ${kwInFirst30 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}
							>
								{kwInFirst30 ? <Check className="size-3" /> : <Info className="size-3" />}
								{kwInFirst30
									? 'Keyword in title front ✓'
									: 'Add more keyword words near start of title [§4.2]'}
							</div>
						)}

						<Tip>
							Titles that get clicks but cause bounces hurt Navboost [US8595225B1]. Promise only
							what the page delivers. Learn more about{' '}
							<a
								href="/blog/guides/meta-tags-seo-complete-guide"
								target="_blank"
								rel="noopener noreferrer"
								className="text-brand-500 hover:text-brand-600"
							>
								meta titles
							</a>
							.
						</Tip>

						{/* AI title suggestions */}
						{suggestions && suggestions.titles.length > 0 && (
							<div className="mt-3 space-y-1.5">
								<p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
									AI suggestions — click to use
								</p>
								{suggestions.titles.map((t, i) => (
									<button
										key={i}
										onClick={() => setLocalMetaTitle(t)}
										className={`hover:border-brand-400 hover:bg-brand-50 dark:hover:border-brand-600 dark:hover:bg-brand-900/20 w-full rounded-lg border px-3 py-2 text-left text-[12px] transition-colors ${
											localMetaTitle === t
												? 'border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-900/20'
												: 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
										}`}
									>
										<span className="text-gray-900 dark:text-gray-100">{t}</span>
										<CharBar value={t.length} max={60} />
									</button>
								))}
							</div>
						)}
					</section>

					{/* ── Meta Description ── */}
					<section>
						<div className="flex items-center justify-between">
							<SectionLabel icon={<Tag className="size-3.5" />} title="Meta Description" />
							<span className="text-[10px] font-medium text-gray-400">150–160 chars</span>
						</div>
						<textarea
							rows={4}
							value={localMetaDesc}
							onChange={(e) => setLocalMetaDesc(e.target.value)}
							placeholder="150-160 chars · include keyword + value prop + CTA"
							className="focus:border-brand-500 focus:ring-brand-500/20 mt-2 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 ring-0 transition outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
						/>
						<CharBar value={localMetaDesc.length} max={160} minGood={150} label="160" />
						<Tip>
							Include the primary keyword, a clear value proposition, and a call-to-action.
							Truncation after 160 chars loses the CTA. Learn more about{' '}
							<a
								href="/blog/guides/meta-tags-seo-complete-guide"
								target="_blank"
								rel="noopener noreferrer"
								className="text-brand-500 hover:text-brand-600"
							>
								meta descriptions
							</a>
							.
						</Tip>

						{/* AI description suggestions */}
						{suggestions && suggestions.descriptions.length > 0 && (
							<div className="mt-3 space-y-1.5">
								<p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
									AI suggestions — click to use
								</p>
								{suggestions.descriptions.map((d, i) => (
									<button
										key={i}
										onClick={() => setLocalMetaDesc(d)}
										className={`hover:border-brand-400 hover:bg-brand-50 dark:hover:border-brand-600 dark:hover:bg-brand-900/20 w-full rounded-lg border px-3 py-2 text-left text-[12px] leading-relaxed transition-colors ${
											localMetaDesc === d
												? 'border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-900/20'
												: 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
										}`}
									>
										<span className="text-gray-900 dark:text-gray-100">{d}</span>
										<CharBar value={d.length} max={160} minGood={150} />
									</button>
								))}
							</div>
						)}
					</section>

					{/* ── Schema Markup (L2) ── */}
					<Collapsible defaultOpen={true}>
						<CollapsibleTrigger className="group flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-left text-[13px] font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/50">
							<span className="flex items-center gap-2">
								<Code2 className="size-3.5 text-gray-400" />
								Schema Markup (JSON-LD)
							</span>
							<ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
						</CollapsibleTrigger>
						<CollapsibleContent>
							<SchemaMarkupBlock page={page} site={site} />
						</CollapsibleContent>
					</Collapsible>

					{/* ── Science callout ── */}
					<div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-900/50 dark:bg-blue-900/20">
						<Info className="mt-0.5 size-3.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
						<p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
							Metadata is auto-generated when you generate an article or focus page. Use
							&quot;Regenerate with AI&quot; to refresh suggestions at any time.
						</p>
					</div>
				</div>

				{/* Footer — sticky actions */}
				<div className="space-y-2 border-t border-gray-200 px-5 py-4 dark:border-gray-700">
					<Button
						variant="outline"
						className="w-full text-sm"
						onClick={handleRegenerate}
						disabled={regenerating || !page.keyword}
					>
						{regenerating ? (
							<Loader2 className="mr-2 size-4 animate-spin" />
						) : (
							<RefreshCw className="mr-2 size-4" />
						)}
						{regenerating
							? 'Generating suggestions…'
							: <>Regenerate Meta — <CreditCost amount={CREDIT_COSTS.META_GENERATION} /></>}
					</Button>

					<Button
						className="bg-brand-500 hover:bg-brand-600 w-full text-white"
						onClick={handleSave}
						disabled={saving}
					>
						{saving ? (
							<Loader2 className="mr-2 size-4 animate-spin" />
						) : (
							<Save className="mr-2 size-4" />
						)}
						{saving ? 'Saving…' : 'Save Changes'}
					</Button>
				</div>
			</div>

			{/* L8: URL slug change warning — requires typed confirmation for published pages */}
			<Dialog open={urlChangeConfirmOpen} onOpenChange={setUrlChangeConfirmOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Changing this URL will reset its ranking history</DialogTitle>
						<DialogDescription asChild>
							<div className="space-y-2 text-sm">
								<p>
									This page is live at{' '}
									<code className="rounded bg-gray-200 px-1 py-0.5 dark:bg-gray-700">
										{site?.url?.replace(/\/$/, '')}/{page.slug}
									</code>
									. Google has built up trust for this specific URL over time — including any links
									pointing to it.
								</p>
								<p>
									Changing the URL risks losing that authority permanently, even with a 301 redirect.
								</p>
								<p>
									If you must change it: set up a 301 redirect from the old URL immediately and
									update any internal links.
								</p>
								<p className="font-semibold text-amber-600 dark:text-amber-400">
									Type <strong>CHANGE URL</strong> below to confirm.
								</p>
								<input
									type="text"
									value={urlChangeConfirmText}
									onChange={(e) => setUrlChangeConfirmText(e.target.value)}
									placeholder="CHANGE URL"
									className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
									autoFocus
								/>
							</div>
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setUrlChangeConfirmOpen(false);
								setUrlChangeConfirmText('');
								setSuggestedSlug(page.slug ?? slugify(page.keyword ?? page.title));
							}}
						>
							Keep current URL
						</Button>
						<Button
							className="bg-amber-600 hover:bg-amber-700 text-white"
							onClick={handleUrlChangeConfirm}
							disabled={urlChangeConfirmText.trim() !== 'CHANGE URL'}
						>
							Change URL
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SchemaMarkupBlock({ page, site }: { page: PageDetail; site: Site | null }) {
	const siteUrl = site?.url?.replace(/\/$/, '') || 'https://example.com';
	const siteName = site?.name || 'My Site';
	const pageUrl = page.slug
		? `${siteUrl}/${page.slug}`
		: `${siteUrl}/${(page.title || page.keyword || 'page').toLowerCase().replace(/\s+/g, '-')}`;

	// S1-4: Person schema — resolve author_bio (page override or site default)
	const resolvedAuthorBio =
		(page.authorBioOverride && page.authorBioOverride.trim())
			? page.authorBioOverride.trim()
			: (site?.authorBio && site.authorBio.trim())
				? site.authorBio.trim()
				: undefined;

	// S1-5: AggregateRating + sameAs for LocalBusiness schema
	const profileUrls = [
		site?.gbpUrl,
		site?.facebookUrl,
		site?.linkedinUrl,
		site?.twitterUrl,
		site?.yelpUrl,
		site?.wikidataUrl
	].filter((u): u is string => Boolean(u && typeof u === 'string' && u.trim()));
	const sameAs = profileUrls.length > 0 ? profileUrls : undefined;
	const aggregateRating =
		site?.googleReviewCount != null &&
		site?.googleAverageRating != null &&
		site.googleReviewCount > 0
			? {
					ratingValue: site.googleAverageRating,
					reviewCount: site.googleReviewCount,
					bestRating: 5 as const
				}
			: undefined;

	const schemaScript = generateSchemaMarkup(page.pageType ?? null, {
		title: page.title || page.keyword || 'Page',
		description: page.metaDescription || undefined,
		url: pageUrl,
		siteName,
		siteUrl,
		authorBio: resolvedAuthorBio,
		sameAs,
		aggregateRating
	});

	const [copied, setCopied] = useState(false);
	const handleCopy = () => {
		navigator.clipboard.writeText(schemaScript);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	return (
		<div className="mt-2 space-y-2">
			<p className="text-[11px] text-gray-500 dark:text-gray-400">
				Copy this JSON-LD into your page {`<head>`} for rich results. Type based on page settings.
				Learn more about{' '}
				<a
					href="http://localhost:4321/blog/glossary/what-is-schema-markup-structured-data-seo"
					target="_blank"
					rel="noopener noreferrer"
					className="text-brand-500 hover:text-brand-600"
				>
					schema markup
				</a>
				.
			</p>
			<div className="relative rounded-lg border border-gray-200 bg-gray-900 p-3 dark:border-gray-700">
				<pre
					className="scrollbar-branded overflow-x-auto text-[11px] text-gray-100"
					style={{ maxHeight: 200 }}
				>
					<code>{schemaScript}</code>
				</pre>
				<button
					type="button"
					onClick={handleCopy}
					className="absolute top-2 right-2 flex items-center gap-1 rounded bg-gray-700 px-2 py-1 text-[10px] text-gray-200 hover:bg-gray-600"
				>
					{copied ? <Check className="size-3" /> : <Copy className="size-3" />}
					{copied ? 'Copied' : 'Copy'}
				</button>
			</div>
		</div>
	);
}

function SectionLabel({ icon, title }: { icon: React.ReactNode; title: string }) {
	return (
		<div className="flex items-center gap-1.5">
			<span className="text-gray-400">{icon}</span>
			<p className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase dark:text-gray-400">
				{title}
			</p>
		</div>
	);
}

function Tip({ children }: { children: React.ReactNode }) {
	return (
		<p className="mt-1.5 text-[11px] leading-relaxed text-gray-400 dark:text-gray-500">
			{children}
		</p>
	);
}
