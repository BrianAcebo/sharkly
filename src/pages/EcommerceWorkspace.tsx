/**
 * Ecommerce SEO Workspace (L6b)
 * Single product or collection: keyword, description editor, schema block, SEO checks, publish.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, Copy, Loader2 } from 'lucide-react';
import PageMeta from '../components/common/PageMeta';
import { Button } from '../components/ui/button';
import { supabase } from '../utils/supabaseClient';
import { buildApiUrl } from '../utils/urls';
import { toast } from 'sonner';

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
};

export default function EcommerceWorkspace() {
	const { id } = useParams<{ id: string }>();
	const [page, setPage] = useState<EcommercePage | null>(null);
	const [loading, setLoading] = useState(true);
	const [generating, setGenerating] = useState(false);

	const fetchPage = useCallback(async () => {
		if (!id) {
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const { data: { session } } = await supabase.auth.getSession();
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

	const handleGenerate = async () => {
		if (!id || !page) return;
		setGenerating(true);
		try {
			const { data: { session } } = await supabase.auth.getSession();
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
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
			});
			const data = (await res.json()) as { success?: boolean; error?: string };
			if (!res.ok) {
				toast.error(data.error ?? 'Generation failed');
				setGenerating(false);
				return;
			}
			toast.success('Description generated');
			fetchPage();
		} catch (e) {
			console.error(e);
			toast.error('Generation failed');
		} finally {
			setGenerating(false);
		}
	};

	const copySchema = () => {
		if (page?.schema_json) {
			navigator.clipboard.writeText(page.schema_json);
			toast.success('Schema copied to clipboard');
		}
	};

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
				{/* Top bar */}
				<div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
					<Link to="/ecommerce">
						<Button variant="ghost" size="sm">
							<ArrowLeft className="mr-1 size-4" />
							Back
						</Button>
					</Link>
					<h1 className="truncate font-semibold">{page.name}</h1>
					<span
						className={`rounded px-2 py-0.5 text-xs ${
							page.type === 'product' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30'
						}`}
					>
						{page.type === 'product' ? 'Product' : 'Collection'}
					</span>
					<div className="ml-auto flex items-center gap-2">
						<input
							type="text"
							placeholder="Set target keyword"
							defaultValue={page.keyword ?? ''}
							className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
						/>
						<Button size="sm" onClick={handleGenerate} disabled={generating}>
							{generating ? <Loader2 className="size-4 animate-spin" /> : 'Generate'}
						</Button>
						{page.status !== 'no_content' && (
							<Button size="sm" variant="outline">
								Publish to Shopify
							</Button>
						)}
					</div>
				</div>

				{/* Two columns: editor 65% | SEO 35% */}
				<div className="flex flex-1 min-h-0">
					{/* Left: editor */}
					<div className="w-[65%] flex flex-col border-r border-gray-200 dark:border-gray-700">
						{page.existing_content && (
							<details className="border-b border-gray-100 px-4 py-2 dark:border-gray-800">
								<summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400">
									Current description — will be rewritten
								</summary>
								<div
									className="mt-2 max-h-32 overflow-y-auto text-sm text-gray-700 dark:text-gray-300"
									dangerouslySetInnerHTML={{ __html: page.existing_content.slice(0, 500) + (page.existing_content.length > 500 ? '…' : '') }}
								/>
							</details>
						)}
						<div className="flex-1 overflow-y-auto p-4">
							{page.content && page.status !== 'no_content' ? (
								<div className="prose dark:prose-invert max-w-none">
									{/* Tiptap content would render here; for now show word count */}
									<p className="text-sm text-gray-500">
										{page.word_count} words · Edit in Tiptap (TODO)
									</p>
								</div>
							) : (
								<div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
									<p className="text-sm text-gray-500">No generated description yet.</p>
									<Button className="mt-3" onClick={handleGenerate} disabled={generating}>
										{generating ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
										Generate (10 credits)
									</Button>
								</div>
							)}
						</div>
						{/* Schema block */}
						{page.schema_json && (
							<details className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
								<summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
									Schema (JSON-LD)
									<Button variant="ghost" size="sm" onClick={copySchema}>
										<Copy className="size-3" />
										Copy
									</Button>
								</summary>
								<pre className="mt-2 max-h-48 overflow-auto rounded bg-gray-100 p-2 text-xs dark:bg-gray-800">
									{page.schema_json}
								</pre>
							</details>
						)}
					</div>

					{/* Right: SEO checks */}
					<div className="w-[35%] overflow-y-auto p-4">
						<h3 className="text-sm font-semibold">SEO checks</h3>
						<p className="mt-1 text-xs text-gray-500">
							Set a URL and keyword, then run checks (TODO: re-check button).
						</p>
						{page.seo_checks && typeof page.seo_checks === 'object' ? (
							<pre className="mt-2 text-xs text-gray-600 dark:text-gray-400">
								{JSON.stringify(page.seo_checks, null, 2)}
							</pre>
						) : (
							<p className="mt-2 text-xs text-gray-500">No checks run yet.</p>
						)}
					</div>
				</div>
			</div>
		</>
	);
}
