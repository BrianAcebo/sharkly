/**
 * Ecommerce SEO Hub (L6b)
 * List products and collections; add manually or import from Shopify.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { Plus, ShoppingBag, Package, Search } from 'lucide-react';
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import { useSiteContext } from '../contexts/SiteContext';
import { buildApiUrl } from '../utils/urls';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'sonner';

type EcommercePage = {
	id: string;
	site_id: string;
	type: 'product' | 'collection';
	name: string;
	keyword: string | null;
	url: string | null;
	status: string;
	word_count: number;
	seo_checks: unknown;
	published_at: string | null;
};

export default function Ecommerce() {
	const { selectedSite } = useSiteContext();
	const [tab, setTab] = useState<'product' | 'collection'>('product');
	const [pages, setPages] = useState<EcommercePage[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchPages = useCallback(async () => {
		if (!selectedSite?.id) {
			setPages([]);
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const { data: { session } } = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				setPages([]);
				setLoading(false);
				return;
			}
			const res = await fetch(
				buildApiUrl(`/api/ecommerce?siteId=${encodeURIComponent(selectedSite.id)}&type=${tab}`),
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			if (!res.ok) throw new Error('Failed to load');
			const data = (await res.json()) as { pages: EcommercePage[] };
			setPages(data.pages ?? []);
		} catch (e) {
			console.error(e);
			toast.error('Failed to load ecommerce pages');
			setPages([]);
		} finally {
			setLoading(false);
		}
	}, [selectedSite?.id, tab]);

	useEffect(() => {
		fetchPages();
	}, [fetchPages]);

	const hasShopify = false; // TODO: from integrations/shopify status when available

	return (
		<>
			<PageMeta title="Ecommerce" description="Product and collection SEO" />
			<PageHeader
				title="Ecommerce"
				subtitle="Product and collection page SEO — keyword assignment, descriptions, schema, publish to Shopify."
			/>

			<div className="mt-6 flex flex-wrap items-center gap-3">
				<Button variant="outline" size="sm">
					<Plus className="mr-2 size-4" />
					Add Product
				</Button>
				<Button variant="outline" size="sm">
					<Plus className="mr-2 size-4" />
					Add Collection
				</Button>
				{hasShopify && (
					<Button size="sm">
						<ShoppingBag className="mr-2 size-4" />
						Import from Shopify
					</Button>
				)}
			</div>

			{/* Tabs */}
			<div className="mt-6 border-b border-gray-200 dark:border-gray-700">
				<nav className="-mb-px flex gap-6">
					<button
						type="button"
						onClick={() => setTab('product')}
						className={`border-b-2 px-1 py-3 text-sm font-medium ${
							tab === 'product'
								? 'border-brand-500 text-brand-600 dark:text-brand-400'
								: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
						}`}
					>
						Products
					</button>
					<button
						type="button"
						onClick={() => setTab('collection')}
						className={`border-b-2 px-1 py-3 text-sm font-medium ${
							tab === 'collection'
								? 'border-brand-500 text-brand-600 dark:text-brand-400'
								: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
						}`}
					>
						Collections
					</button>
				</nav>
			</div>

			{!selectedSite && (
				<div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
					<Search className="mb-2 size-4" />
					Select a site in the top navigation to manage ecommerce SEO.
				</div>
			)}

			{selectedSite && !loading && pages.length === 0 && (
				<div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900/50">
					<Package className="mx-auto mb-3 size-10 text-gray-400" />
					<p className="text-sm text-gray-600 dark:text-gray-400">
						Add your product and collection pages to check their basic SEO and generate optimized
						descriptions. You can add them manually or connect Shopify to import your store automatically.
					</p>
					<div className="mt-4 flex justify-center gap-2">
						<Button variant="outline" size="sm">
							Add Product
						</Button>
						<Button variant="outline" size="sm">
							Add Collection
						</Button>
						{hasShopify && (
							<Button size="sm">Import from Shopify</Button>
						)}
					</div>
				</div>
			)}

			{selectedSite && pages.length > 0 && (
				<div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
					<table className="w-full text-left text-sm">
						<thead>
							<tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
								<th className="p-3 font-medium">Name</th>
								<th className="p-3 font-medium">Keyword</th>
								<th className="p-3 font-medium">Status</th>
								<th className="p-3 font-medium">Action</th>
							</tr>
						</thead>
						<tbody>
							{pages.map((p) => (
								<tr key={p.id} className="border-b border-gray-100 dark:border-gray-800">
									<td className="p-3">
										<Link
											to={`/ecommerce/${p.id}`}
											className="font-medium text-brand-600 hover:underline dark:text-brand-400"
										>
											{p.name}
										</Link>
									</td>
									<td className="p-3 text-gray-600 dark:text-gray-400">{p.keyword ?? '—'}</td>
									<td className="p-3">
										<span
											className={`rounded-full px-2 py-0.5 text-xs ${
												p.status === 'published'
													? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
													: p.status === 'draft'
														? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
														: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
											}`}
										>
											{p.status === 'published' ? 'Published' : p.status === 'draft' ? 'Draft' : 'No description'}
										</span>
									</td>
									<td className="p-3">
										<Link to={`/ecommerce/${p.id}`}>
											<Button variant="ghost" size="sm">
												Open
											</Button>
										</Link>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</>
	);
}
