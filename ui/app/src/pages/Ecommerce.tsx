/**
 * Ecommerce SEO Hub (L6b)
 * List products and collections; add manually or import from Shopify.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Plus,
	RefreshCw,
	ShoppingBag,
	Package,
	Search,
	Loader2,
	Trash2
} from 'lucide-react';
import PageMeta from '../components/common/PageMeta';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
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
import { Checkbox } from '../components/ui/checkbox';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import { useSiteContext } from '../contexts/SiteContext';
import { api } from '../utils/api';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'sonner';

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
	status: string;
	word_count: number;
	seo_checks: unknown;
	published_at: string | null;
	featured_image_url?: string | null;
	display_meta?: DisplayMeta | null;
	platform?: string | null;
	platform_id?: string | null;
};

type ShopifyProduct = {
	id: number;
	title: string;
	handle: string;
	status?: string;
	featured_image_url?: string | null;
};
type ShopifyCollection = {
	id: number;
	title: string;
	handle: string;
	products_count?: number;
	featured_image_url?: string | null;
};

export default function Ecommerce() {
	const navigate = useNavigate();
	const { selectedSite } = useSiteContext();
	const [tab, setTab] = useState<'product' | 'collection'>('product');
	const [pages, setPages] = useState<EcommercePage[]>([]);
	const [loading, setLoading] = useState(true);
	const [hasShopify, setHasShopify] = useState(false);
	const [importModalOpen, setImportModalOpen] = useState(false);
	const [addModalOpen, setAddModalOpen] = useState(false);
	const [addModalType, setAddModalType] = useState<'product' | 'collection'>('product');
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [pageSize] = useState(25);
	const [total, setTotal] = useState(0);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [deleteToConfirm, setDeleteToConfirm] = useState<EcommercePage | null>(null);
	const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
	const [syncingAll, setSyncingAll] = useState(false);

	const fetchPages = useCallback(async () => {
		if (!selectedSite?.id) {
			setPages([]);
			setTotal(0);
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
				setPages([]);
				setTotal(0);
				setLoading(false);
				return;
			}
			const offset = (page - 1) * pageSize;
			const res = await api.get(
				`/api/ecommerce?siteId=${encodeURIComponent(selectedSite.id)}&type=${tab}&limit=${pageSize}&offset=${offset}`
			);
			if (!res.ok) throw new Error('Failed to load');
			const data = (await res.json()) as { pages: EcommercePage[]; total: number };
			setPages(data.pages ?? []);
			setTotal(data.total ?? 0);
		} catch (e) {
			console.error(e);
			toast.error('Failed to load ecommerce pages');
			setPages([]);
			setTotal(0);
		} finally {
			setLoading(false);
		}
	}, [selectedSite?.id, tab, page, pageSize]);

	useEffect(() => {
		fetchPages();
	}, [fetchPages]);

	// Reset page and selection when tab changes
	useEffect(() => {
		setPage(1);
		setSelectedIds(new Set());
	}, [tab]);

	const handleAdd = (type: 'product' | 'collection') => {
		setAddModalType(type);
		setAddModalOpen(true);
	};

	const handleDeleteClick = (p: EcommercePage) => {
		setDeleteToConfirm(p);
	};

	const handleDeleteConfirm = async () => {
		const p = deleteToConfirm;
		if (!p) return;
		setDeletingId(p.id);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				toast.error('Please sign in again');
				return;
			}
			const res = await api.delete(`/api/ecommerce/${p.id}`);
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				toast.error((data as { error?: string }).error ?? 'Delete failed');
				return;
			}
			toast.success('Deleted');
			setDeleteToConfirm(null);
			fetchPages();
		} catch (e) {
			console.error(e);
			toast.error('Delete failed');
		} finally {
			setDeletingId(null);
		}
	};

	const handleBulkDeleteConfirm = async () => {
		if (selectedIds.size === 0) return;
		setDeletingId('bulk');
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				toast.error('Please sign in again');
				return;
			}
			const res = await api.post('/api/ecommerce/bulk-delete', { ids: Array.from(selectedIds) });
			const data = (await res.json().catch(() => ({}))) as { deleted?: number; error?: string };
			if (!res.ok) {
				toast.error(data.error ?? 'Delete failed');
				return;
			}
			toast.success(`Deleted ${data.deleted ?? 0} ${tab}(s)`);
			setBulkDeleteConfirm(false);
			setSelectedIds(new Set());
			fetchPages();
		} catch (e) {
			console.error(e);
			toast.error('Delete failed');
		} finally {
			setDeletingId(null);
		}
	};

	const toggleSelect = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const selectAllOnPage = () => {
		if (pages.every((p) => selectedIds.has(p.id))) {
			setSelectedIds((prev) => {
				const next = new Set(prev);
				pages.forEach((p) => next.delete(p.id));
				return next;
			});
		} else {
			setSelectedIds((prev) => {
				const next = new Set(prev);
				pages.forEach((p) => next.add(p.id));
				return next;
			});
		}
	};

	const hasShopifyRecords = pages.some((p) => p.platform === 'shopify' && p.platform_id);

	const handleSyncAll = async () => {
		setSyncingAll(true);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				toast.error('Please sign in again');
				return;
			}
			const res = await api.post('/api/ecommerce/sync-all');
			const data = (await res.json().catch(() => ({}))) as {
				synced?: number;
				skipped?: number;
				errors?: string[];
			};
			if (!res.ok) {
				toast.error((data as { error?: string }).error ?? 'Sync failed');
				return;
			}
			const synced = data.synced ?? 0;
			const errors = data.errors ?? [];
			if (errors.length > 0) {
				toast.error(errors[0] ?? 'Some records failed to sync');
			} else if (synced > 0) {
				toast.success(`Synced ${synced} ${tab}${synced === 1 ? '' : 's'}`);
				fetchPages();
			} else {
				toast.success('All up to date');
			}
		} catch (e) {
			console.error(e);
			toast.error('Sync failed');
		} finally {
			setSyncingAll(false);
		}
	};

	const pageCount = Math.max(1, Math.ceil(total / pageSize));

	// Fetch Shopify connection status when site changes
	useEffect(() => {
		let cancelled = false;
		if (!selectedSite?.id) {
			setHasShopify(false);
			return;
		}
		const fetchStatus = async () => {
			try {
				const {
					data: { session }
				} = await supabase.auth.getSession();
				const token = session?.access_token;
				if (!token) {
					if (!cancelled) setHasShopify(false);
					return;
				}
				const res = await api.get(`/api/shopify/status/${selectedSite.id}`);
				const data = (await res.json().catch(() => ({}))) as { connected?: boolean };
				if (!cancelled) setHasShopify(!!data.connected);
			} catch {
				if (!cancelled) setHasShopify(false);
			}
		};
		fetchStatus();
		return () => {
			cancelled = true;
		};
	}, [selectedSite?.id]);

	return (
		<>
			<PageMeta title="Ecommerce" description="Product and collection SEO" noIndex />
			<PageHeader
				title="Ecommerce"
				subtitle="Product and collection page SEO — keyword assignment, descriptions, schema, publish to Shopify."
			/>

			<div className="mt-6 flex flex-wrap items-center gap-3">
				<Button
					variant="outline"
					size="sm"
					onClick={() => handleAdd('product')}
					disabled={!selectedSite}
				>
					<Plus className="mr-2 size-4" />
					Add Product
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => handleAdd('collection')}
					disabled={!selectedSite}
				>
					<Plus className="mr-2 size-4" />
					Add Collection
				</Button>
				{hasShopify && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button size="sm">
								<ShoppingBag className="mr-2 size-4" />
								Import
								<ChevronDown className="ml-2 size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start">
							<DropdownMenuItem onClick={() => setImportModalOpen(true)}>
								From Shopify
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
				{hasShopifyRecords && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm" disabled={syncingAll}>
								{syncingAll ? (
									<Loader2 className="mr-2 size-4 animate-spin" />
								) : (
									<RefreshCw className="mr-2 size-4" />
								)}
								{syncingAll ? 'Syncing...' : 'Sync all'}
								<ChevronDown className="ml-2 size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start">
							<DropdownMenuItem onClick={handleSyncAll} disabled={syncingAll}>
								From Shopify
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
				{selectedIds.size > 0 && (
					<Button
						variant="outline"
						size="sm"
						className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
						onClick={() => setBulkDeleteConfirm(true)}
						disabled={deletingId === 'bulk'}
					>
						{deletingId === 'bulk' ? (
							<Loader2 className="mr-2 size-4 animate-spin" />
						) : (
							<Trash2 className="mr-2 size-4" />
						)}
						Delete {selectedIds.size} selected
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

			{selectedSite && !loading && total === 0 && (
				<div className="mx-auto mt-8 max-w-xl rounded-lg border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900/50">
					<Package className="mx-auto mb-3 size-10 text-gray-400" />
					<p className="text-sm text-gray-600 dark:text-gray-400">
						Add your product and collection pages to check their basic SEO and generate optimized
						descriptions. You can add them manually or connect Shopify to import your store
						automatically.
					</p>
					<div className="mt-4 flex justify-center gap-2">
						<Button variant="outline" size="sm" onClick={() => handleAdd('product')}>
							Add Product
						</Button>
						<Button variant="outline" size="sm" onClick={() => handleAdd('collection')}>
							Add Collection
						</Button>
						{hasShopify && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button size="sm">
										<ShoppingBag className="mr-2 size-4" />
										Import
										<ChevronDown className="ml-2 size-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="center">
									<DropdownMenuItem onClick={() => setImportModalOpen(true)}>
										From Shopify
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
				</div>
			)}

			{selectedSite && total > 0 && (
				<>
					<div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
						<table className="w-full text-left text-sm">
							<thead>
								<tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
									<th className="w-10 p-3">
										<Checkbox
											checked={pages.length > 0 && pages.every((p) => selectedIds.has(p.id))}
											onCheckedChange={selectAllOnPage}
											aria-label="Select all on page"
										/>
									</th>
									<th className="w-10 p-3" aria-label="Thumbnail" />
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
											<Checkbox
												checked={selectedIds.has(p.id)}
												onCheckedChange={() => toggleSelect(p.id)}
												aria-label={`Select ${p.name}`}
											/>
										</td>
									<td className="p-3">
										{(p.display_meta?.image_url ?? p.featured_image_url) ? (
											<img
												src={p.display_meta?.image_url ?? p.featured_image_url ?? ''}
												alt={p.display_meta?.image_alt ?? ''}
												className="size-8 rounded object-cover"
											/>
										) : (
											<div className="flex size-8 items-center justify-center rounded bg-gray-100 dark:bg-gray-800">
												<Package className="size-4 text-gray-400" />
											</div>
										)}
									</td>
										<td className="p-3">
											<Link
												to={`/ecommerce/${p.id}`}
												className="text-brand-600 dark:text-brand-400 font-medium hover:underline"
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
												{p.status === 'published'
													? 'Published'
													: p.status === 'draft'
														? 'Draft'
														: 'No description'}
											</span>
										</td>
										<td className="p-3">
											<div className="flex items-center gap-1">
												<Link to={`/ecommerce/${p.id}`}>
													<Button variant="ghost" size="sm">
														Open
													</Button>
												</Link>
												<Button
													variant="ghost"
													size="sm"
													className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
													onClick={() => handleDeleteClick(p)}
													disabled={deletingId === p.id}
												>
													{deletingId === p.id ? (
														<Loader2 className="size-4 animate-spin" />
													) : (
														<Trash2 className="size-4" />
													)}
												</Button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Pagination */}
					{pageCount > 1 && (
						<div className="mt-4 flex items-center justify-between text-sm">
							<p className="text-gray-600 dark:text-gray-400">
								Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
							</p>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={page <= 1}
								>
									<ChevronLeft className="size-4" />
									Previous
								</Button>
								<span className="px-2 text-gray-600 dark:text-gray-400">
									Page {page} of {pageCount}
								</span>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
									disabled={page >= pageCount}
								>
									Next
									<ChevronRight className="size-4" />
								</Button>
							</div>
						</div>
					)}
				</>
			)}

			{/* Single delete confirmation */}
			<AlertDialog open={!!deleteToConfirm} onOpenChange={(o) => !o && setDeleteToConfirm(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete {deleteToConfirm?.type ?? 'item'}?</AlertDialogTitle>
						<AlertDialogDescription>
							{deleteToConfirm && (
								<>
									This will remove &quot;{deleteToConfirm.name}&quot;. This action cannot be undone.
								</>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={!!deletingId && deletingId !== 'bulk'}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								handleDeleteConfirm();
							}}
							disabled={!!deletingId && deletingId !== 'bulk'}
							variant="destructive"
						>
							{deletingId === deleteToConfirm?.id ? 'Deleting…' : 'Delete'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Bulk delete confirmation */}
			<AlertDialog open={bulkDeleteConfirm} onOpenChange={(o) => !o && setBulkDeleteConfirm(false)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Delete {selectedIds.size} {tab}(s)?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently remove the selected {tab}s. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deletingId === 'bulk'}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								handleBulkDeleteConfirm();
							}}
							disabled={deletingId === 'bulk'}
							variant="destructive"
						>
							{deletingId === 'bulk' ? 'Deleting…' : `Delete ${selectedIds.size}`}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<ImportShopifyModal
				open={importModalOpen}
				onOpenChange={setImportModalOpen}
				siteId={selectedSite?.id ?? null}
				type={tab}
				onImported={fetchPages}
			/>

			<AddEcommerceModal
				open={addModalOpen}
				onOpenChange={setAddModalOpen}
				siteId={selectedSite?.id ?? null}
				type={addModalType}
				onCreated={(id) => {
					setAddModalOpen(false);
					fetchPages();
					navigate(`/ecommerce/${id}`);
				}}
			/>
		</>
	);
}

function AddEcommerceModal({
	open,
	onOpenChange,
	siteId,
	type,
	onCreated
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	siteId: string | null;
	type: 'product' | 'collection';
	onCreated: (id: string) => void;
}) {
	const [name, setName] = useState('');
	const [url, setUrl] = useState('');
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (!open) {
			setName('');
			setUrl('');
		}
	}, [open]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!siteId || !name.trim()) return;
		setSubmitting(true);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				toast.error('Please sign in again');
				return;
			}
			const res = await api.post('/api/ecommerce', {
				siteId,
				type,
				name: name.trim(),
				url: url.trim() || undefined
			});
			const data = (await res.json().catch(() => ({}))) as {
				page?: { id?: string };
				error?: string;
			};
			if (!res.ok) {
				toast.error(data.error ?? 'Failed to create');
				return;
			}
			const id = data.page?.id;
			if (id) onCreated(id);
		} catch (e) {
			console.error(e);
			toast.error('Failed to create');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add {type === 'product' ? 'Product' : 'Collection'}</DialogTitle>
					<DialogDescription>
						Add a manual {type} page. You can assign a keyword and generate a description after
						creating.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label
							htmlFor="add-name"
							className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							Name
						</label>
						<input
							id="add-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder={type === 'product' ? 'e.g. Blue Widget' : 'e.g. Summer Collection'}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
							required
							autoFocus
						/>
					</div>
					<div>
						<label
							htmlFor="add-url"
							className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							URL <span className="text-gray-500">(optional)</span>
						</label>
						<input
							id="add-url"
							type="url"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							placeholder={
								type === 'product'
									? 'https://store.com/products/blue-widget'
									: 'https://store.com/collections/summer'
							}
							className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
						/>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={!name.trim() || submitting}>
							{submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
							Add {type === 'product' ? 'Product' : 'Collection'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function ImportShopifyModal({
	open,
	onOpenChange,
	siteId,
	type,
	onImported
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	siteId: string | null;
	type: 'product' | 'collection';
	onImported: () => void;
}) {
	const [items, setItems] = useState<(ShopifyProduct | ShopifyCollection)[]>([]);
	const [loading, setLoading] = useState(false);
	const [importing, setImporting] = useState(false);
	const [selected, setSelected] = useState<Set<number>>(new Set());

	useEffect(() => {
		if (!open || !siteId) {
			setItems([]);
			setSelected(new Set());
			return;
		}
		let cancelled = false;
		setLoading(true);
		const fetchItems = async () => {
			try {
				const {
					data: { session }
				} = await supabase.auth.getSession();
				const token = session?.access_token;
				if (!token) return;
				const endpoint =
					type === 'product'
						? `/api/ecommerce/shopify-products?siteId=${encodeURIComponent(siteId)}`
						: `/api/ecommerce/shopify-collections?siteId=${encodeURIComponent(siteId)}`;
				const res = await api.get(endpoint);
				if (!res.ok) throw new Error('Failed to load');
				const data = await res.json();
				const list =
					type === 'product'
						? ((data.products ?? []) as ShopifyProduct[])
						: ((data.collections ?? []) as ShopifyCollection[]);
				if (!cancelled) setItems(list);
			} catch (e) {
				console.error(e);
				toast.error(`Failed to load ${type}s from Shopify`);
				if (!cancelled) setItems([]);
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		fetchItems();
		return () => {
			cancelled = true;
		};
	}, [open, siteId, type]);

	const toggle = (id: number) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const selectAll = () => {
		if (selected.size === items.length) setSelected(new Set());
		else setSelected(new Set(items.map((i) => i.id)));
	};

	const handleImport = async () => {
		if (!siteId || selected.size === 0) return;
		setImporting(true);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			const token = session?.access_token;
			if (!token) {
				toast.error('Please sign in again');
				return;
			}
			const res = await api.post('/api/ecommerce/import-shopify', {
				siteId,
				type,
				ids: Array.from(selected)
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				toast.error((data as { error?: string }).error ?? 'Import failed');
				return;
			}
			toast.success(
				`Imported ${(data as { imported?: number }).imported ?? selected.size} ${type}(s)`
			);
			onOpenChange(false);
			onImported();
		} catch (e) {
			console.error(e);
			toast.error('Import failed');
		} finally {
			setImporting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[80vh] max-w-xl flex-col overflow-hidden">
				<DialogHeader>
					<DialogTitle>Import from Shopify</DialogTitle>
					<DialogDescription>
						Select {type}s to add to your ecommerce SEO hub. You can assign keywords and generate
						descriptions after importing.
					</DialogDescription>
				</DialogHeader>
				<div className="min-h-0 flex-1 overflow-y-auto">
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="size-6 animate-spin text-gray-400" />
						</div>
					) : items.length === 0 ? (
						<p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
							No {type}s found in your Shopify store.
						</p>
					) : (
						<>
							<div className="mb-3 flex items-center gap-2">
								<Checkbox
									id="select-all"
									checked={selected.size === items.length && items.length > 0}
									onCheckedChange={selectAll}
								/>
								<label htmlFor="select-all" className="cursor-pointer text-sm font-medium">
									Select all ({items.length})
								</label>
							</div>
							<ul className="space-y-2">
								{items.map((item) => (
									<li
										key={item.id}
										className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
									>
										<Checkbox
											id={`item-${item.id}`}
											checked={selected.has(item.id)}
											onCheckedChange={() => toggle(item.id)}
										/>
										{item.featured_image_url ? (
											<img
												src={item.featured_image_url}
												alt=""
												className="size-12 shrink-0 rounded object-cover"
											/>
										) : (
											<div className="flex size-12 shrink-0 items-center justify-center rounded bg-gray-100 dark:bg-gray-800">
												<Package className="size-6 text-gray-400" />
											</div>
										)}
										<label htmlFor={`item-${item.id}`} className="flex-1 cursor-pointer text-sm">
											{item.title}
										</label>
									</li>
								))}
							</ul>
						</>
					)}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleImport} disabled={selected.size === 0 || importing}>
						{importing ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" />
								Importing…
							</>
						) : (
							`Import ${selected.size} ${type}${selected.size !== 1 ? 's' : ''}`
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
