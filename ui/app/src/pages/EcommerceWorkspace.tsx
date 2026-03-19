/**
 * Ecommerce SEO Workspace (L6b)
 * Single product or collection: keyword, description editor, schema block, SEO checks, publish.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
	AlertTriangle,
	ArrowLeft,
	Bold,
	CheckCircle2,
	ChevronDown,
	Code2,
	Copy,
	List,
	Loader2,
	RefreshCw,
	Trash2,
	XCircle
} from 'lucide-react';
import PageMeta from '../components/common/PageMeta';
import { Button } from '../components/ui/button';
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '../components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import { Tooltip } from '../components/ui/tooltip';
import { supabase } from '../utils/supabaseClient';
import { buildApiUrl } from '../utils/urls';
import { CreditCost } from '../components/shared/CreditBadge';
import { CREDIT_COSTS } from '../lib/credits';
import { cleanPastedHTML, htmlToTiptap } from '../lib/editorUtils';
import {
	formatSchemaForPlatform,
	getShopifyProductLiquidSnippet,
	getShopifyCollectionLiquidSnippet,
	getWordPressProductPhpSnippet,
	getBigCommerceProductSnippet,
	type OutputFormat
} from '../lib/schemaMarkup';
import { toast } from 'sonner';
import InputField from '../components/form/input/InputField';
import { Label } from '../components/ui/label';

const marketingUrl = import.meta.env.VITE_MARKETING_URL ?? 'https://sharkly.co';

type DisplayMeta = {
	image_url?: string | null;
	image_alt?: string | null;
	price?: string | null;
	currency?: string | null;
	vendor?: string | null;
	product_type?: string | null;
	tags?: string[] | null;
};

type EcommercePage = {
	id: string;
	site_id: string;
	type: 'product' | 'collection';
	name: string;
	keyword: string | null;
	url: string | null;
	existing_content: string | null;
	content: unknown;
	schema_json: string | null;
	word_count: number;
	meta_title: string | null;
	meta_description: string | null;
	seo_checks: unknown;
	status: string;
	shopify_product_id: string | null;
	shopify_collection_id: string | null;
	published_at: string | null;
	display_meta?: DisplayMeta | null;
	platform?: string | null;
};

const SCHEMA_PLATFORMS: { value: OutputFormat; label: string }[] = [
	{ value: 'standard', label: 'Standard (HTML)' },
	{ value: 'shopify_liquid', label: 'Shopify (Liquid)' },
	{ value: 'wordpress_php', label: 'WordPress / WooCommerce (PHP)' },
	{ value: 'bigcommerce', label: 'BigCommerce (Handlebars)' },
	{ value: 'webflow', label: 'Webflow' },
	{ value: 'wix', label: 'Wix (Velo)' }
];

const CHECK_LABELS: Record<string, string> = {
	keyword_in_title: 'Keyword in title',
	keyword_in_h1: 'Keyword in H1',
	keyword_in_url: 'Keyword in URL',
	meta_description: 'Meta description',
	description_originality: 'Description originality',
	schema: 'Product/Collection schema',
	fetch_error: 'Page fetch',
	duplicate_variants: 'Duplicate variants',
	pagination_canonical: 'Pagination canonical',
	page_not_live: 'Page not live'
};

function SeoChecksDisplay({ seoChecks }: { seoChecks: unknown }) {
	const data = seoChecks as {
		checks?: Record<string, { status: string; message: string }>;
		fetch_error?: boolean;
	};
	const checks = data?.checks ?? {};
	const fetchError = data?.fetch_error ?? false;

	// If fetch failed, show only the error
	if (fetchError && checks.fetch_error) {
		return (
			<div className="mt-3 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-900/20">
				<XCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
				<span className="text-amber-800 dark:text-amber-200">{checks.fetch_error.message}</span>
			</div>
		);
	}

	const keys = [
		'keyword_in_title',
		'keyword_in_h1',
		'keyword_in_url',
		'meta_description',
		'description_originality',
		'schema',
		'duplicate_variants',
		'pagination_canonical',
		'page_not_live'
	];
	return (
		<div className="mt-3 space-y-2">
			{keys.map((key) => {
				const c = checks[key];
				if (!c) return null;
				const Icon =
					c.status === 'pass' ? CheckCircle2 : c.status === 'warning' ? AlertTriangle : XCircle;
				const iconColor =
					c.status === 'pass'
						? 'text-green-600 dark:text-green-500'
						: c.status === 'warning'
							? 'text-amber-600 dark:text-amber-500'
							: 'text-red-600 dark:text-red-500';
				return (
					<div
						key={key}
						className="flex items-start gap-2 rounded border border-gray-200 p-2 dark:border-gray-700"
					>
						<Icon className={`mt-0.5 size-4 shrink-0 ${iconColor}`} />
						<div className="min-w-0 flex-1">
							<p className="text-xs font-medium">{CHECK_LABELS[key] ?? key}</p>
							<p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{c.message}</p>
						</div>
					</div>
				);
			})}
		</div>
	);
}

export default function EcommerceWorkspace() {
	const navigate = useNavigate();
	const { id } = useParams<{ id: string }>();
	const [page, setPage] = useState<EcommercePage | null>(null);
	const [loading, setLoading] = useState(true);
	const [generating, setGenerating] = useState(false);
	const [saving, setSaving] = useState(false);
	const [publishing, setPublishing] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [checking, setChecking] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const [generatingMeta, setGeneratingMeta] = useState(false);
	const [schemaPlatform, setSchemaPlatform] = useState<OutputFormat>('standard');
	const [generateModalOpen, setGenerateModalOpen] = useState(false);
	const [generatePrompt, setGeneratePrompt] = useState('');
	const [metaModalOpen, setMetaModalOpen] = useState(false);
	const [metaPrompt, setMetaPrompt] = useState('');
	const [name, setName] = useState('');
	const [keyword, setKeyword] = useState('');
	const [url, setUrl] = useState('');
	const [metaTitle, setMetaTitle] = useState('');
	const [metaDescription, setMetaDescription] = useState('');
	const nameRef = useRef<string>('');
	const keywordRef = useRef<string>('');
	const urlRef = useRef<string>('');
	const metaTitleRef = useRef<string>('');
	const metaDescRef = useRef<string>('');

	const fetchPage = useCallback(async () => {
		if (!id) {
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				setLoading(false);
				return;
			}
			const res = await fetch(buildApiUrl(`/api/ecommerce/${id}`), {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!res.ok) throw new Error('Failed to load page');
			const data = (await res.json()) as { page: EcommercePage };
			setPage(data.page);
		} catch (e) {
			console.error(e);
			toast.error('Failed to load page');
			setPage(null);
		} finally {
			setLoading(false);
		}
	}, [id]);

	useEffect(() => {
		fetchPage();
	}, [fetchPage]);

	useEffect(() => {
		if (page) {
			setName(page.name ?? '');
			nameRef.current = page.name ?? '';
			setKeyword(page.keyword ?? '');
			keywordRef.current = page.keyword ?? '';
			setUrl(page.url ?? '');
			urlRef.current = page.url ?? '';
			setMetaTitle(page.meta_title ?? '');
			metaTitleRef.current = page.meta_title ?? '';
			setMetaDescription(page.meta_description ?? '');
			metaDescRef.current = page.meta_description ?? '';
		}
	}, [page?.id, page?.name, page?.keyword, page?.url, page?.meta_title, page?.meta_description]);

	const saveName = useCallback(async () => {
		if (!id || name === nameRef.current) return;
		setSaving(true);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) return;
			const res = await fetch(buildApiUrl(`/api/ecommerce/${id}`), {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({ name: name.trim() || page?.name })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				toast.error((data as { error?: string }).error ?? 'Failed to save');
				return;
			}
			nameRef.current = name;
			setPage((p) => (p ? { ...p, name: name.trim() || p.name } : null));
		} catch (e) {
			console.error(e);
			toast.error('Failed to save');
		} finally {
			setSaving(false);
		}
	}, [id, name, page?.name]);

	const saveKeyword = useCallback(async () => {
		if (!id || keyword === keywordRef.current) return;
		setSaving(true);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) return;
			const res = await fetch(buildApiUrl(`/api/ecommerce/${id}`), {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({ keyword: keyword || null })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				toast.error((data as { error?: string }).error ?? 'Failed to save');
				return;
			}
			keywordRef.current = keyword;
			setPage((p) => (p ? { ...p, keyword: keyword || null } : null));
		} catch (e) {
			console.error(e);
			toast.error('Failed to save');
		} finally {
			setSaving(false);
		}
	}, [id, keyword]);

	const saveUrl = useCallback(async () => {
		if (!id || url === urlRef.current) return;
		setSaving(true);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) return;
			const res = await fetch(buildApiUrl(`/api/ecommerce/${id}`), {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({ url: url || null })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				toast.error((data as { error?: string }).error ?? 'Failed to save');
				return;
			}
			urlRef.current = url;
			setPage((p) => (p ? { ...p, url: url || null } : null));
		} catch (e) {
			console.error(e);
			toast.error('Failed to save');
		} finally {
			setSaving(false);
		}
	}, [id, url]);

	const saveMeta = useCallback(async () => {
		if (!id || (metaTitle === metaTitleRef.current && metaDescription === metaDescRef.current))
			return;
		setSaving(true);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) return;
			const res = await fetch(buildApiUrl(`/api/ecommerce/${id}`), {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					meta_title: metaTitle.trim() || null,
					meta_description: metaDescription.trim() || null
				})
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				toast.error((data as { error?: string }).error ?? 'Failed to save');
				return;
			}
			metaTitleRef.current = metaTitle;
			metaDescRef.current = metaDescription;
			setPage((p) =>
				p
					? {
							...p,
							meta_title: metaTitle.trim() || null,
							meta_description: metaDescription.trim() || null
						}
					: null
			);
		} catch (e) {
			console.error(e);
			toast.error('Failed to save');
		} finally {
			setSaving(false);
		}
	}, [id, metaTitle, metaDescription]);

	const handlePublish = async () => {
		if (!id || !page) return;
		setPublishing(true);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				toast.error('Not signed in');
				return;
			}
			// Include current meta from form so we publish what user sees (avoids race with blur-save)
			const res = await fetch(buildApiUrl(`/api/ecommerce/${id}/publish-shopify`), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					overwriteDescription: true,
					updateMeta: true,
					meta_title: metaTitle.trim() || undefined,
					meta_description: metaDescription.trim() || undefined // empty string clears on Shopify
				})
			});
			const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
			if (!res.ok) {
				toast.error(data.error ?? 'Publish failed');
				return;
			}
			toast.success('Published to Shopify');
			fetchPage();
		} catch (e) {
			console.error(e);
			toast.error('Publish failed');
		} finally {
			setPublishing(false);
		}
	};

	const handleDelete = async () => {
		if (!id || !page) return;
		setDeleting(true);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				toast.error('Not signed in');
				return;
			}
			const res = await fetch(buildApiUrl(`/api/ecommerce/${id}`), {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				toast.error((data as { error?: string }).error ?? 'Delete failed');
				return;
			}
			toast.success('Deleted');
			setDeleteConfirmOpen(false);
			navigate('/ecommerce');
		} catch (e) {
			console.error(e);
			toast.error('Delete failed');
		} finally {
			setDeleting(false);
		}
	};

	const handleGenerate = async (additionalContext?: string) => {
		if (!id || !page) return;
		setGenerating(true);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				toast.error('Not signed in');
				setGenerating(false);
				return;
			}
			const endpoint =
				page.type === 'product'
					? `/api/ecommerce/${id}/generate-product`
					: `/api/ecommerce/${id}/generate-collection`;
			const res = await fetch(buildApiUrl(endpoint), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({ additional_context: additionalContext?.trim() || undefined })
			});
			const data = (await res.json()) as { success?: boolean; error?: string; required?: number };
			if (!res.ok) {
				if (res.status === 402) {
					toast.error(
						`Insufficient credits. Need ${data.required ?? (page.type === 'product' ? CREDIT_COSTS.PRODUCT_DESCRIPTION : CREDIT_COSTS.COLLECTION_INTRO)}.`
					);
				} else {
					toast.error(data.error ?? 'Generation failed');
				}
				setGenerating(false);
				return;
			}
			toast.success('Description generated');
			setGenerateModalOpen(false);
			setGeneratePrompt('');
			fetchPage();
		} catch (e) {
			console.error(e);
			toast.error('Generation failed');
		} finally {
			setGenerating(false);
		}
	};

	const openGenerateModal = () => {
		setGeneratePrompt('');
		setGenerateModalOpen(true);
	};

	const schemaDisplay = useMemo(() => {
		if (!page?.schema_json) return null;
		// Platform-specific dynamic snippets — use Liquid/PHP/Handlebars templates
		if (schemaPlatform === 'shopify_liquid') {
			return page.type === 'product'
				? getShopifyProductLiquidSnippet()
				: getShopifyCollectionLiquidSnippet();
		}
		if (schemaPlatform === 'wordpress_php' && page.type === 'product') {
			return getWordPressProductPhpSnippet();
		}
		if (schemaPlatform === 'bigcommerce' && page.type === 'product') {
			return getBigCommerceProductSnippet();
		}
		// Static schema — format the generated JSON for selected platform
		try {
			const obj =
				typeof page.schema_json === 'string' ? JSON.parse(page.schema_json) : page.schema_json;
			const schemaType =
				page.type === 'product' ? ('Product' as const) : ('CollectionPage' as const);
			return formatSchemaForPlatform(obj, schemaPlatform, schemaType);
		} catch {
			return page.schema_json;
		}
	}, [page?.schema_json, page?.type, schemaPlatform]);

	const copySchema = () => {
		if (schemaDisplay) {
			navigator.clipboard.writeText(schemaDisplay);
			toast.success('Schema copied to clipboard');
		}
	};

	const openMetaModal = () => {
		setMetaPrompt('');
		setMetaModalOpen(true);
	};

	const handleGenerateMeta = async (additionalContext?: string) => {
		if (!id || !page) return;
		if (!page.keyword) {
			toast.error('Set a target keyword first');
			return;
		}
		setGeneratingMeta(true);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				toast.error('Not signed in');
				setGeneratingMeta(false);
				return;
			}
			const res = await fetch(buildApiUrl(`/api/ecommerce/${id}/generate-meta`), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({ additional_context: additionalContext?.trim() || undefined })
			});
			const data = (await res.json()) as {
				success?: boolean;
				error?: string;
				data?: { meta_title?: string; meta_description?: string };
				required?: number;
			};
			if (!res.ok) {
				if (res.status === 402) {
					toast.error(
						`Insufficient credits. Need ${data.required ?? CREDIT_COSTS.META_GENERATION}.`
					);
				} else {
					toast.error(data.error ?? 'Generation failed');
				}
				setGeneratingMeta(false);
				return;
			}
			toast.success('Meta title and description generated');
			setMetaModalOpen(false);
			setMetaPrompt('');
			const meta = data.data;
			if (meta?.meta_title) setMetaTitle(meta.meta_title);
			if (meta?.meta_description) setMetaDescription(meta.meta_description);
			metaTitleRef.current = meta?.meta_title ?? '';
			metaDescRef.current = meta?.meta_description ?? '';
			setPage((p) =>
				p
					? {
							...p,
							meta_title: meta?.meta_title ?? null,
							meta_description: meta?.meta_description ?? null
						}
					: null
			);
		} catch (e) {
			console.error(e);
			toast.error('Generation failed');
		} finally {
			setGeneratingMeta(false);
		}
	};

	const handleRunSeoChecks = async () => {
		if (!id || !page?.url) return;
		setChecking(true);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				toast.error('Not signed in');
				return;
			}
			const res = await fetch(buildApiUrl('/api/seo-checks/run'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({ url: page.url, keyword: page.keyword || undefined })
			});
			const data = (await res.json()) as {
				success?: boolean;
				error?: string;
				seo_checks?: unknown;
			};
			if (!res.ok) {
				toast.error(data.error ?? 'Checks failed');
				return;
			}
			toast.success('SEO checks complete');
			setPage((p) => (p && data.seo_checks ? { ...p, seo_checks: data.seo_checks } : p));
		} catch (e) {
			console.error(e);
			toast.error('Checks failed');
		} finally {
			setChecking(false);
		}
	};

	const handleSync = async () => {
		if (!id || !page) return;
		setSyncing(true);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				toast.error('Not signed in');
				return;
			}
			const res = await fetch(buildApiUrl(`/api/ecommerce/${id}/sync`), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
			});
			const data = (await res.json().catch(() => ({}))) as { page?: EcommercePage; error?: string };
			if (!res.ok) {
				toast.error(data.error ?? 'Sync failed');
				return;
			}
			toast.success('Synced');
			fetchPage();
		} catch (e) {
			console.error(e);
			toast.error('Sync failed');
		} finally {
			setSyncing(false);
		}
	};

	// Prefer stored content; fallback to Shopify description when content empty (legacy imports)
	const hasStoredContent =
		page?.content &&
		(page as { content?: unknown }).content &&
		Array.isArray((page.content as { content?: unknown[] })?.content) &&
		(page.content as { content: unknown[] }).content.length > 0;
	const initialContent = hasStoredContent
		? typeof (page as { content?: unknown }).content === 'string'
			? (JSON.parse((page as { content: string }).content) as object)
			: (page as { content: object }).content
		: ((page?.existing_content?.trim() ? htmlToTiptap(page.existing_content) : null) as
				| object
				| null);

	const editor = useEditor(
		{
			extensions: [
				StarterKit.configure({ codeBlock: false, heading: false }),
				Placeholder.configure({
					placeholder: 'Generate a description or paste existing copy to edit...'
				})
			],
			content: initialContent ?? '',
			editorProps: {
				attributes: {
					class:
						'prose prose-sm dark:prose-invert max-w-none w-full min-h-[200px] p-4 focus:outline-none text-gray-800 dark:text-gray-300'
				},
				transformPastedHTML: cleanPastedHTML
			},
			onTransaction: () => setContentVersion((v) => v + 1)
		},
		[page?.id]
	);

	useEffect(() => {
		if (skipNextContentSyncRef.current) {
			skipNextContentSyncRef.current = false;
			return;
		}
		if (!editor) return;
		if (hasStoredContent) {
			const doc = typeof page!.content === 'string' ? JSON.parse(page!.content) : page!.content;
			if (doc && (doc as { type?: string }).type === 'doc') {
				editor.commands.setContent(doc, { emitUpdate: false });
			}
		} else if (page?.existing_content?.trim()) {
			editor.commands.setContent(
				htmlToTiptap(page.existing_content) as unknown as Parameters<
					typeof editor.commands.setContent
				>[0],
				{ emitUpdate: false }
			);
		}
	}, [editor, page?.id, page?.content, page?.existing_content, page?.status, hasStoredContent]);

	const [contentVersion, setContentVersion] = useState(0);
	const contentVersionRef = useRef(0);
	const skipNextContentSyncRef = useRef(false);
	const didPersistFromExistingRef = useRef(false);

	// When editor shows existing_content (legacy import), persist to DB once
	useEffect(() => {
		if (
			!id ||
			!editor ||
			didPersistFromExistingRef.current ||
			hasStoredContent ||
			!page?.existing_content?.trim()
		)
			return;
		const doc = htmlToTiptap(page.existing_content);
		if (!doc?.content?.length) return;
		didPersistFromExistingRef.current = true;
		(async () => {
			try {
				const {
					data: { session }
				} = await supabase.auth.getSession();
				const token = session?.access_token;
				if (!token) return;
				const res = await fetch(buildApiUrl(`/api/ecommerce/${id}`), {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					},
					body: JSON.stringify({ content: doc })
				});
				if (res.ok) {
					setPage((p) =>
						p
							? {
									...p,
									content: doc,
									word_count: editor.getText().split(/\s+/).filter(Boolean).length,
									status: 'draft'
								}
							: null
					);
				}
			} catch (e) {
				console.error(e);
				didPersistFromExistingRef.current = false;
			}
		})();
	}, [id, editor, hasStoredContent, page?.existing_content]);

	const saveContent = useCallback(async () => {
		if (!id || !editor) return;
		const json = editor.getJSON();
		if (!json?.content) return;
		const wordCount = editor.getText().split(/\s+/).filter(Boolean).length;
		setSaving(true);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) return;
			const res = await fetch(buildApiUrl(`/api/ecommerce/${id}`), {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({ content: json })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				toast.error((data as { error?: string }).error ?? 'Failed to save');
				return;
			}
			contentVersionRef.current = contentVersion;
			skipNextContentSyncRef.current = true;
			setPage((p) => (p ? { ...p, content: json, word_count: wordCount } : null));
		} catch (e) {
			console.error(e);
			toast.error('Failed to save');
		} finally {
			setSaving(false);
		}
	}, [id, editor]);

	useEffect(() => {
		if (!editor || !id || contentVersion === 0) return;
		const timer = setTimeout(() => {
			saveContent();
		}, 2000);
		return () => clearTimeout(timer);
	}, [editor, id, contentVersion, saveContent]);

	if (loading) {
		return (
			<div className="flex min-h-[40vh] items-center justify-center">
				<Loader2 className="size-8 animate-spin text-gray-400" />
			</div>
		);
	}
	if (!page) {
		return (
			<div className="p-6">
				<p className="text-gray-600 dark:text-gray-400">Page not found.</p>
				<Link to="/ecommerce">
					<Button variant="link" className="mt-2">
						Back to Ecommerce
					</Button>
				</Link>
			</div>
		);
	}

	return (
		<>
			<PageMeta title={page.name} description="Ecommerce SEO workspace" />
			<div className="flex min-h-0 flex-1 flex-col">
				{/* Top bar — Back and type badge */}
				<div className="flex items-center gap-3 border-b border-gray-200 px-4 py-2 dark:border-gray-700">
					<Link to="/ecommerce">
						<Button variant="ghost" size="sm">
							<ArrowLeft className="mr-1 size-4" />
							Back
						</Button>
					</Link>
					<span
						className={`rounded px-2 py-0.5 text-xs ${
							page.type === 'product'
								? 'bg-blue-100 dark:bg-blue-900/30'
								: 'bg-purple-100 dark:bg-purple-900/30'
						}`}
					>
						{page.type === 'product' ? 'Product' : 'Collection'}
					</span>
					{page.platform === 'shopify' && (
						<Tooltip content="Sync from Shopify">
							<Button
								variant="ghost"
								size="sm"
								onClick={handleSync}
								disabled={syncing}
								className="size-8 p-0"
							>
								{syncing ? (
									<RefreshCw className="size-4 animate-spin" />
								) : (
									<RefreshCw className="size-4" />
								)}
							</Button>
						</Tooltip>
					)}
				</div>

				{/* Two columns: editor 65% | SEO 35% */}
				<div className="flex min-h-0 flex-1">
					{/* Left: product card, toolbar, editor */}
					<div className="flex w-[65%] flex-col border-r border-gray-200 dark:border-gray-700">
						<div className="flex items-start justify-between gap-3 px-4 py-3">
							{/* Product card — thumbnail, name, pills, price, tags */}
							<div className="flex w-2/3 gap-3 border-b border-gray-100 dark:border-gray-800">
								<div className="size-20 shrink-0 overflow-hidden rounded-lg bg-gray-200 object-cover dark:bg-gray-700">
									{page.display_meta?.image_url ? (
										<img
											src={page.display_meta.image_url}
											alt={page.display_meta.image_alt ?? page.name ?? ''}
											className="size-full object-cover"
										/>
									) : (
										<div className="flex size-full items-center justify-center text-gray-400 dark:text-gray-500" />
									)}
								</div>
								<div className="min-w-0 flex-1">
									<input
										type="text"
										value={name}
										onChange={(e) => setName(e.target.value)}
										onBlur={saveName}
										className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
										placeholder="Product or collection name"
									/>
									{(page.display_meta?.vendor || page.display_meta?.product_type) && (
										<div className="mt-1 flex flex-wrap gap-1">
											{page.display_meta.vendor && (
												<span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
													{page.display_meta.vendor}
												</span>
											)}
											{page.display_meta.product_type && (
												<span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
													{page.display_meta.product_type}
												</span>
											)}
										</div>
									)}
									{page.display_meta?.price && (
										<p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">
											${page.display_meta.price} {page.display_meta.currency ?? 'USD'}
										</p>
									)}
									{page.display_meta?.tags && page.display_meta.tags.length > 0 && (
										<div className="mt-1 flex flex-wrap gap-1">
											{page.display_meta.tags.slice(0, 5).map((t) => (
												<span
													key={t}
													className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400"
												>
													{t}
												</span>
											))}
											{page.display_meta.tags.length > 5 && (
												<span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
													+{page.display_meta.tags.length - 5} more
												</span>
											)}
										</div>
									)}
								</div>
							</div>
							<div className="flex w-1/4 items-center gap-3">
								{page.status !== 'no_content' &&
									(page.shopify_product_id || page.shopify_collection_id) && (
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button size="sm" variant="outline" disabled={publishing}>
													{publishing ? (
														<Loader2 className="size-4 animate-spin" />
													) : (
														<>
															Publish
															<ChevronDown className="ml-2 size-4" />
														</>
													)}
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="start">
												<DropdownMenuItem onClick={handlePublish} disabled={publishing}>
													To Shopify
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									)}
								<Button
									size="sm"
									variant="ghost"
									className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
									onClick={() => setDeleteConfirmOpen(true)}
									disabled={deleting}
								>
									{deleting ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<Trash2 className="size-4" />
									)}
								</Button>
							</div>
						</div>
						{/* Below card: keyword, URL, actions */}
						<div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-2 dark:border-gray-800">
							<div className="flex items-center gap-2">
								<Label htmlFor="url">URL</Label>
								<input
									type="text"
									id="url"
									placeholder="Page URL"
									value={url}
									onChange={(e) => setUrl(e.target.value)}
									onBlur={saveUrl}
									className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
								/>
							</div>
							<div className="flex items-center gap-2">
								<Label htmlFor="keyword">Keyword</Label>
								<input
									type="text"
									id="keyword"
									placeholder="Target keyword"
									value={keyword}
									onChange={(e) => setKeyword(e.target.value)}
									onBlur={saveKeyword}
									className="w-fit rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
								/>
							</div>
							{saving && <span className="text-xs text-gray-500">Saving…</span>}
						</div>
						<div className="flex flex-1 flex-col overflow-visible overflow-y-auto p-4">
							{editor ? (
								<>
									<div className="mb-2 flex items-center justify-between gap-3 border-b border-gray-200 pb-2 dark:border-gray-700">
										<div className="flex gap-1">
											<Button
												type="button"
												size="sm"
												variant="ghost"
												className="size-8 p-0"
												onClick={() => editor.chain().focus().toggleBold().run()}
											>
												<Bold className="size-4" />
											</Button>
											<Button
												type="button"
												size="sm"
												variant="ghost"
												className="size-8 p-0"
												onClick={() => editor.chain().focus().toggleBulletList().run()}
											>
												<List className="size-4" />
											</Button>
										</div>
										{!page?.keyword && !keyword ? (
											<Tooltip content="Set target keyword first" usePortal>
												<Button
													size="sm"
													onClick={openGenerateModal}
													disabled={generating || !page?.keyword}
												>
													<>Generate Description — <CreditCost amount={page.type === 'product' ? CREDIT_COSTS.PRODUCT_DESCRIPTION : CREDIT_COSTS.COLLECTION_INTRO} /></>
												</Button>
											</Tooltip>
										) : (
											<Button
												size="sm"
												onClick={openGenerateModal}
												disabled={generating || !page?.keyword}
											>
												<>Generate Description — <CreditCost amount={page.type === 'product' ? CREDIT_COSTS.PRODUCT_DESCRIPTION : CREDIT_COSTS.COLLECTION_INTRO} /></>
											</Button>
										)}
									</div>
									<div className="min-h-[200px] rounded-lg border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800/50">
										<EditorContent editor={editor} />
									</div>
									<p className="mt-2 text-sm text-gray-500">
										{editor.getText().split(/\s+/).filter(Boolean).length} words
										{saving && ' · Saving…'}
									</p>
								</>
							) : page?.content && page.status !== 'no_content' ? (
								<div className="flex min-h-[200px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/50">
									<Loader2 className="size-6 animate-spin text-gray-400" />
								</div>
							) : (
								<div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
									<p className="text-sm text-gray-500">No generated description yet.</p>
									<Button className="mt-3" onClick={openGenerateModal} disabled={generating}>
										{generating ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
										Generate — <CreditCost amount={page.type === 'product' ? CREDIT_COSTS.PRODUCT_DESCRIPTION : CREDIT_COSTS.COLLECTION_INTRO} />
									</Button>
								</div>
							)}
						</div>
						{/* Schema block — Schema Generator style with platform choice */}
						{schemaDisplay && (
							<div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
								<div className="mb-2 flex items-center justify-between gap-2">
									<span className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
										<Code2 className="size-4" />
										Schema (JSON-LD) — {page.type === 'product' ? 'Product' : 'Collection'}
									</span>
									<Button variant="outline" size="sm" onClick={copySchema}>
										<Copy className="size-3" />
										Copy
									</Button>
								</div>
								<div className="mb-2">
									<label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
										Platform
									</label>
									<select
										value={schemaPlatform}
										onChange={(e) => setSchemaPlatform(e.target.value as OutputFormat)}
										className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
									>
										{SCHEMA_PLATFORMS.map((p) => (
											<option key={p.value} value={p.value}>
												{p.label}
											</option>
										))}
									</select>
								</div>
								<div className="max-h-80 overflow-auto rounded-lg border border-gray-200 bg-gray-900 p-4 dark:border-gray-700">
									<pre className="text-xs wrap-break-word whitespace-pre-wrap text-gray-200 dark:text-gray-100">
										<code>{schemaDisplay}</code>
									</pre>
								</div>
								<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
									{schemaPlatform === 'shopify_liquid' && (
										<>
											{
												'Save as .liquid in snippets/, then {% render "schema-product" %} or {% render "schema-collectionpage" %}'
											}
											. Learn more about{' '}
											<a
												href={`${marketingUrl}/blog/shopify-seo/shopify-schema-markup-product-collection`}
												target="_blank"
												rel="noopener noreferrer"
												className="text-brand-500 hover:text-brand-600"
											>
												Shopify schema markup
											</a>
											.
										</>
									)}
									{schemaPlatform === 'wordpress_php' && 'Add to functions.php or a custom plugin.'}
									{schemaPlatform === 'bigcommerce' &&
										'Add to your Stencil theme template or partial.'}
									{schemaPlatform === 'webflow' &&
										'Paste in Site Settings > Custom Code > Head Code.'}
									{schemaPlatform === 'wix' &&
										'Add to page code; wixSeo.setStructuredData runs on page load.'}
									{schemaPlatform === 'standard' &&
										'Paste into your page <head> or before </body>.'}
								</p>
							</div>
						)}
					</div>

					{/* Right: SEO meta fields and checks */}
					<div className="w-[35%] overflow-y-auto p-4">
						<div className="space-y-4">
							<div>
								<label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
									Meta title
								</label>
								<input
									type="text"
									value={metaTitle}
									onChange={(e) => setMetaTitle(e.target.value)}
									onBlur={saveMeta}
									placeholder="Page title for search results"
									className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
								/>
							</div>
							<div>
								<label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
									Meta description
								</label>
								<textarea
									value={metaDescription}
									onChange={(e) => setMetaDescription(e.target.value)}
									onBlur={saveMeta}
									placeholder="150–160 chars for search results"
									rows={3}
									className="mt-1 w-full resize-none rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
								/>
							</div>
							<Button
								size="sm"
								variant="outline"
								onClick={openMetaModal}
								disabled={generatingMeta || !page.keyword}
								title={
									!page.keyword
										? 'Set target keyword first'
										: undefined
								}
							>
								{generatingMeta ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
								Generate Meta — <CreditCost amount={CREDIT_COSTS.META_GENERATION} />
							</Button>
						</div>
						<div className="mt-4 flex items-center justify-between gap-2">
							<h3 className="text-sm font-semibold">SEO checks</h3>
							<Button
								size="sm"
								variant="outline"
								onClick={handleRunSeoChecks}
								disabled={checking || !page.keyword || !page.url}
								title={
									!page.url
										? 'Set page URL first'
										: !page.keyword
											? 'Set target keyword first'
											: 'Re-run checks against live page'
								}
							>
								{checking ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<RefreshCw className="size-4" />
								)}
								Check SEO
							</Button>
						</div>
						<p className="mt-3 text-xs text-gray-500">
							Set URL and keyword, then run checks against the live page.
						</p>
						{page.seo_checks && typeof page.seo_checks === 'object' ? (
							<SeoChecksDisplay seoChecks={page.seo_checks} />
						) : (
							<p className="mt-3 text-xs text-gray-500">
								No checks run yet. Set URL and keyword, then click Re-check.
							</p>
						)}
					</div>
				</div>
			</div>

			<AlertDialog open={deleteConfirmOpen} onOpenChange={(o) => !o && setDeleteConfirmOpen(false)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete {page?.type ?? 'item'}?</AlertDialogTitle>
						<AlertDialogDescription>
							{page && <>This will remove &quot;{page.name}&quot;. This action cannot be undone.</>}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								handleDelete();
							}}
							disabled={deleting}
							variant="destructive"
						>
							{deleting ? 'Deleting…' : 'Delete'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Generate Description modal — additional context */}
			<Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>
							Generate {page?.type === 'product' ? 'Product' : 'Collection'} Description
						</DialogTitle>
						<DialogDescription>
							Add details about features, benefits, materials, specs, or what&apos;s included. Leave
							blank to use only the keyword and existing data.
						</DialogDescription>
					</DialogHeader>
					<textarea
						value={generatePrompt}
						onChange={(e) => setGeneratePrompt(e.target.value)}
						placeholder="e.g. Lightweight bamboo construction, waterproof, includes carry bag and wax. Best for beginner to intermediate riders. Eco-friendly materials."
						rows={5}
						className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:placeholder-gray-500"
					/>
					<DialogFooter>
						<Button variant="outline" onClick={() => setGenerateModalOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={() => handleGenerate(generatePrompt)}
							disabled={generating || !page?.keyword}
							title={!page?.keyword ? 'Set target keyword first' : undefined}
						>
							{generating ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
							Generate — <CreditCost amount={page?.type === 'product' ? CREDIT_COSTS.PRODUCT_DESCRIPTION : CREDIT_COSTS.COLLECTION_INTRO} />
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Generate Meta modal — additional context */}
			<Dialog open={metaModalOpen} onOpenChange={setMetaModalOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Generate Meta Title &amp; Description</DialogTitle>
						<DialogDescription>
							Add details to guide the meta generation — key benefits, audience, or tone. Leave
							blank to use only the keyword and existing data.
						</DialogDescription>
					</DialogHeader>
					<textarea
						value={metaPrompt}
						onChange={(e) => setMetaPrompt(e.target.value)}
						placeholder="e.g. Target: outdoor enthusiasts. Emphasize durability and eco-friendly materials. Professional but approachable tone."
						rows={4}
						className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:placeholder-gray-500"
					/>
					<DialogFooter>
						<Button variant="outline" onClick={() => setMetaModalOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={() => handleGenerateMeta(metaPrompt)}
							disabled={generatingMeta || !page?.keyword}
							title={!page?.keyword ? 'Set target keyword first' : undefined}
						>
							{generatingMeta ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
							Generate — <CreditCost amount={CREDIT_COSTS.META_GENERATION} />
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
